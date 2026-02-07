//
//  MainChatView.swift
//  makima-mobile
//
//  Single-screen chat-centric view. Auth, pairing, and settings
//  are accessible from toolbar and bottom bar.
//

import SwiftUI
import SwiftData

struct MainChatView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.modelContext) private var modelContext

    @State private var chatVM: ChatViewModel?
    @State private var approvalVM: ApprovalViewModel?
    @State private var conversationsVM = ConversationsViewModel()

    @State private var showConversations = false
    @State private var showAuth = false
    @State private var showPair = false

    var body: some View {
        NavigationStack {
            SideDrawerView(isOpen: $showConversations, maxWidth: 360) {
                ConversationsListSheet(
                    viewModel: conversationsVM,
                    onSelect: { conversation in
                        conversationsVM.setActive(conversation)
                        chatVM?.loadConversation(conversation, context: modelContext)
                    },
                    onNew: {
                        let conv = conversationsVM.createConversation(
                            sessionId: appState.relay.currentSessionId
                        )
                        chatVM?.loadConversation(conv, context: modelContext)
                    },
                    close: { showConversations = false }
                )
            } content: {
                ZStack(alignment: .top) {
                    Color(.systemBackground)
                        .ignoresSafeArea()

                    VStack {
                        if let chatVM, !chatVM.messages.isEmpty {
                            ChatThreadView(messages: chatVM.messages)
                        } else {
                            BlobEmptyStateView()
                        }
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
            }
            .navigationTitle(chatVM?.currentConversation?.title ?? "Makima")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.84)) {
                            showConversations.toggle()
                        }
                        HapticFeedback.tap()
                    } label: {
                        Image(systemName: "sidebar.left")
                    }
                    .glassEffect(.regular.interactive())
                    .accessibilityIdentifier("drawer.toggle.button")
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
                    NavigationLink {
                        ConnectionSettingsSheet()
                    } label: {
                        Image(systemName: "gear")
                    }
                    .glassEffect(.regular.interactive())
                }
            }
            .sheet(isPresented: $showAuth) {
                AuthSheetView()
            }
            .sheet(isPresented: $showPair) {
                PairView()
            }
        }
        .onAppear {
            conversationsVM.bind(context: modelContext)

            if chatVM == nil {
                chatVM = ChatViewModel(relay: appState.relay)
            }
            if approvalVM == nil {
                approvalVM = ApprovalViewModel(relay: appState.relay)
            }

            if let active = conversationsVM.activeConversation {
                chatVM?.loadConversation(active, context: modelContext)
            }
        }
    }

    @ViewBuilder
    private var bottomBar: some View {
        if !appState.supabase.isConfigured || !appState.supabase.isAuthenticated {
            VStack(spacing: 8) {
                Button {
                    showAuth = true
                } label: {
                    Label("Sign In to Get Started", systemImage: "person.crop.circle")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .glassEffect(.regular.interactive())
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.bar)
        } else if !appState.isPaired {
            VStack(spacing: 8) {
                Button {
                    showPair = true
                } label: {
                    Label("Connect to Desktop", systemImage: "link.circle")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .glassEffect(.regular.interactive())
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.bar)
        } else if let chatVM {
            GlassComposerView(
                text: Binding(
                    get: { chatVM.composerText },
                    set: { chatVM.composerText = $0 }
                ),
                isStreaming: chatVM.isAgentStreaming,
                onSend: {
                    if chatVM.currentConversation == nil {
                        let conv = conversationsVM.createConversation(
                            sessionId: appState.relay.currentSessionId
                        )
                        chatVM.currentConversation = conv
                    }
                    Task { await chatVM.sendMessage() }
                }
            )
        }
    }

    private var statusColor: Color {
        switch appState.relay.connectionStatus {
        case .active, .paired: return .green
        case .pairing: return .orange
        case .disconnected: return .gray
        case .error: return .red
        }
    }
}
