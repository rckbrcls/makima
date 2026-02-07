//
//  ChatTabView.swift
//  makima-mobile
//

import SwiftUI
import SwiftData
import UIKit

struct ChatTabView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.modelContext) private var modelContext

    let chatVM: ChatViewModel?
    let approvalVM: ApprovalViewModel?
    let conversationsVM: ConversationsViewModel

    let isActive: Bool
    @Binding var showAuth: Bool
    @Binding var showPair: Bool
    let onOpenConversations: () -> Void
    let onOpenCodes: () -> Void

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                Color(.systemBackground)
                    .ignoresSafeArea()

                if let chatVM {
                    ChatThreadView(messages: chatVM.messages)
                } else {
                    ChatThreadView(messages: [])
                }

                if let approvalVM, !approvalVM.pendingApprovals.isEmpty {
                    ApprovalBannerView(
                        approvals: approvalVM.pendingApprovals,
                        onApprove: { approval in
                            Task { await approvalVM.approve(approval) }
                        },
                        onReject: { approval in
                            Task { await approvalVM.reject(approval) }
                        }
                    )
                }
            }
            .safeAreaInset(edge: .bottom) {
                bottomBar
            }
            .simultaneousGesture(
                DragGesture(minimumDistance: 10)
                    .onEnded { value in
                        if value.translation.height > 24 &&
                            abs(value.translation.height) > abs(value.translation.width) {
                            dismissKeyboard()
                        }
                    }
            )
            .navigationTitle(chatVM?.currentConversation?.title ?? "Makima")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        dismissKeyboard()
                        onOpenConversations()
                    } label: {
                        Image(systemName: "text.bubble")
                    }
                    .accessibilityIdentifier("chat.open.conversations.button")
                }

                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 8, height: 8)

                        if let agent = appState.relay.activeAgentName {
                            Text(agent)
                                .font(.caption.bold())
                        }
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismissKeyboard()
                        onOpenCodes()
                    } label: {
                        Image(systemName: "desktopcomputer")
                    }
                    .accessibilityIdentifier("chat.open.codes.button")
                }
            }
        }
    }

    @ViewBuilder
    private var bottomBar: some View {
        VStack(spacing: 10) {
            if appState.supabase.isConfigured && appState.supabase.isAuthenticated && !appState.isPaired {
                Button {
                    showPair = true
                } label: {
                    Label("Connect to Desktop", systemImage: "link.circle")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }

            if let chatVM {
                ChatComposerView(
                    text: Binding(
                        get: { chatVM.composerText },
                        set: { chatVM.composerText = $0 }
                    ),
                    shouldFocus: isActive,
                    isStreaming: chatVM.isAgentStreaming,
                    onSend: {
                        guard appState.supabase.isConfigured, appState.supabase.isAuthenticated else {
                            showAuth = true
                            return
                        }

                        guard appState.isPaired else {
                            showPair = true
                            return
                        }

                        if chatVM.currentConversation == nil {
                            let conversation = conversationsVM.createConversation(
                                sessionId: appState.relay.currentSessionId
                            )
                            chatVM.currentConversation = conversation
                            chatVM.loadConversation(conversation, context: modelContext)
                        }
                        Task { await chatVM.sendMessage() }
                    }
                )
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 12)
        .background(Color(.systemBackground))
    }

    private var statusColor: Color {
        switch appState.relay.connectionStatus {
        case .active, .paired: return .green
        case .pairing: return .orange
        case .disconnected: return .gray
        case .error: return .red
        }
    }

    private func dismissKeyboard() {
        UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder),
            to: nil,
            from: nil,
            for: nil
        )
    }
}
