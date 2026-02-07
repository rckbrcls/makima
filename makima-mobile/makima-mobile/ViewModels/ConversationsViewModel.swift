//
//  ConversationsViewModel.swift
//  makima-mobile
//

import Foundation
import SwiftData

@Observable
final class ConversationsViewModel {
    var conversations: [Conversation] = []
    var activeConversation: Conversation?
    var searchQuery = ""

    private var modelContext: ModelContext?

    var groupedConversations: [ConversationSection] {
        ConversationGrouping.sectioned(conversations: conversations)
    }

    func bind(context: ModelContext) {
        modelContext = context
        load()
    }

    func load() {
        guard let modelContext else { return }

        var descriptor = FetchDescriptor<Conversation>(
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )

        if !searchQuery.isEmpty {
            let query = searchQuery
            descriptor.predicate = #Predicate { $0.title.localizedStandardContains(query) }
        }

        do {
            conversations = try modelContext.fetch(descriptor)
        } catch {
            print("Failed to load conversations: \(error)")
        }
    }

    func createConversation(title: String = "New Conversation", sessionId: String? = nil) -> Conversation {
        let conversation = Conversation(title: title, sessionId: sessionId)

        modelContext?.insert(conversation)
        try? modelContext?.save()

        conversations.insert(conversation, at: 0)
        activeConversation = conversation

        return conversation
    }

    func delete(_ conversation: Conversation) {
        modelContext?.delete(conversation)
        try? modelContext?.save()

        conversations.removeAll { $0.id == conversation.id }

        if activeConversation?.id == conversation.id {
            activeConversation = conversations.first
        }
    }

    func updateTitle(_ conversation: Conversation, title: String) {
        conversation.title = title
        conversation.updatedAt = Date()
        try? modelContext?.save()
    }

    func setActive(_ conversation: Conversation?) {
        activeConversation = conversation
    }
}
