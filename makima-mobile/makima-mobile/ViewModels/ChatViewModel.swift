//
//  ChatViewModel.swift
//  makima-mobile
//

import Foundation
import SwiftData

@Observable
final class ChatViewModel {
    var messages: [ChatMessage] = []
    var composerText = ""
    var isAgentStreaming = false
    var currentConversation: Conversation?

    private let relay: RelayService
    private var streamingMessageId: String?
    private var streamingContent = ""

    init(relay: RelayService) {
        self.relay = relay
        wireCallbacks()
    }

    func loadConversation(_ conversation: Conversation?, context: ModelContext) {
        currentConversation = conversation

        guard let conversation else {
            messages = []
            return
        }

        let conversationId = conversation.id
        let descriptor = FetchDescriptor<ChatMessage>(
            predicate: #Predicate { $0.conversation?.id == conversationId },
            sortBy: [SortDescriptor(\.timestamp)]
        )
        do {
            messages = try context.fetch(descriptor)
        } catch {
            print("Failed to load conversation messages: \(error)")
            messages = []
        }
    }

    func sendMessage() async {
        let text = composerText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let sessionId = relay.currentSessionId ?? ""

        // Add user message locally
        let userMsg = ChatMessage(
            sessionId: sessionId,
            role: "user",
            content: text
        )
        userMsg.conversation = currentConversation
        messages.append(userMsg)
        composerText = ""

        // Update conversation timestamp
        currentConversation?.updatedAt = Date()

        // Auto-title from first message
        if let conv = currentConversation,
           conv.title == "New Conversation",
           messages.filter({ $0.role == "user" }).count == 1 {
            conv.title = String(text.prefix(50))
        }

        do {
            try await relay.sendMessage(content: text)
        } catch {
            let errorMsg = ChatMessage(
                sessionId: sessionId,
                role: "system",
                content: "Failed to send: \(error.localizedDescription)"
            )
            errorMsg.conversation = currentConversation
            messages.append(errorMsg)
        }
    }

    func loadHistory(sessionId: String, context: ModelContext) {
        let descriptor = FetchDescriptor<ChatMessage>(
            predicate: #Predicate { $0.sessionId == sessionId },
            sortBy: [SortDescriptor(\.timestamp)]
        )
        do {
            messages = try context.fetch(descriptor)
        } catch {
            print("Failed to load chat history: \(error)")
        }
    }

    func saveMessages(context: ModelContext) {
        for message in messages {
            context.insert(message)
        }
        try? context.save()
    }

    // MARK: - Private

    private func wireCallbacks() {
        relay.onAgentChunk = { [weak self] content in
            guard let self else { return }
            if let id = streamingMessageId,
               let index = messages.firstIndex(where: { $0.id == id }) {
                streamingContent += content
                messages[index].content = streamingContent
            } else {
                let msgId = UUID().uuidString
                streamingMessageId = msgId
                streamingContent = content
                isAgentStreaming = true
                let msg = ChatMessage(
                    id: msgId,
                    sessionId: relay.currentSessionId ?? "",
                    role: "assistant",
                    content: content,
                    isStreaming: true
                )
                msg.conversation = currentConversation
                messages.append(msg)
            }
        }

        relay.onAgentMessage = { [weak self] payload in
            guard let self else { return }
            let content = payload["content"] as? String ?? ""
            let msg = ChatMessage(
                sessionId: relay.currentSessionId ?? "",
                role: "assistant",
                content: content
            )
            msg.conversation = currentConversation
            messages.append(msg)
        }

        relay.onAgentToolCall = { [weak self] payload in
            guard let self else { return }
            let toolName = payload["toolName"] as? String ?? "unknown"
            let description = payload["description"] as? String ?? "Calling \(toolName)"
            let msg = ChatMessage(
                sessionId: relay.currentSessionId ?? "",
                role: "tool",
                content: description,
                toolName: toolName
            )
            msg.conversation = currentConversation
            messages.append(msg)
        }

        relay.onAgentDone = { [weak self] in
            guard let self else { return }
            if let id = streamingMessageId,
               let index = messages.firstIndex(where: { $0.id == id }) {
                messages[index].isStreaming = false
            }
            streamingMessageId = nil
            streamingContent = ""
            isAgentStreaming = false
            currentConversation?.status = "idle"
        }

        relay.onAgentError = { [weak self] errorMsg in
            guard let self else { return }
            if let id = streamingMessageId,
               let index = messages.firstIndex(where: { $0.id == id }) {
                messages[index].isStreaming = false
            }
            streamingMessageId = nil
            streamingContent = ""
            isAgentStreaming = false
            currentConversation?.status = "error"

            let msg = ChatMessage(
                sessionId: relay.currentSessionId ?? "",
                role: "system",
                content: "Error: \(errorMsg)"
            )
            msg.conversation = currentConversation
            messages.append(msg)
        }
    }
}
