//
//  MainChatView.swift
//  makima-mobile
//

import SwiftUI
import SwiftData

struct MainChatView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.modelContext) private var modelContext

    @State private var shell = MobileShellViewModel()

    var body: some View {
        let theme = appState.resolvedTheme

        NavigationStack {
            TabView(selection: $shell.currentPage) {
                ConversationsTabView(
                    viewModel: shell.conversationsVM,
                    onSelect: { conversation in
                        shell.conversationsVM.setActive(conversation)
                        shell.chatVM?.loadConversation(conversation, context: modelContext)
                        withAnimation(.easeInOut(duration: 0.22)) {
                            shell.currentPage = .chat
                        }
                    },
                    onNew: {
                        let conversation = shell.conversationsVM.createConversation(
                            sessionId: appState.relay.currentSessionId
                        )
                        shell.chatVM?.loadConversation(conversation, context: modelContext)
                        withAnimation(.easeInOut(duration: 0.22)) {
                            shell.currentPage = .chat
                        }
                    },
                    onOpenSettings: {
                        shell.showSettings = true
                    },
                    onOpenAuth: {
                        shell.showAuth = true
                    }
                )
                .tag(MobilePage.conversations)

                ChatTabView(
                    chatVM: shell.chatVM,
                    approvalVM: shell.approvalVM,
                    conversationsVM: shell.conversationsVM,
                    isActive: shell.currentPage == .chat,
                    showAuth: $shell.showAuth,
                    showPair: $shell.showPair,
                    onOpenConversations: {
                        withAnimation(.easeInOut(duration: 0.22)) {
                            shell.currentPage = .conversations
                        }
                    },
                    onOpenCodes: {
                        withAnimation(.easeInOut(duration: 0.22)) {
                            shell.currentPage = .codes
                        }
                    }
                )
                .tag(MobilePage.chat)

                CodesTabView(
                    onBackToChat: {
                        withAnimation(.easeInOut(duration: 0.22)) {
                            shell.currentPage = .chat
                        }
                    }
                )
                .tag(MobilePage.codes)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .indexViewStyle(.page(backgroundDisplayMode: .never))
        }
        .background(theme.background.ignoresSafeArea())
        .onAppear {
            bootstrapIfNeeded()
        }
        .sheet(isPresented: $shell.showAuth) {
            AuthSheetView()
        }
        .sheet(isPresented: $shell.showPair) {
            PairView()
        }
        .sheet(isPresented: $shell.showSettings) {
            NavigationStack {
                ConnectionSettingsSheet(showCloseButton: true)
            }
        }
    }

    private func bootstrapIfNeeded() {
        guard !shell.didInitialize else { return }

        shell.conversationsVM.bind(context: modelContext)

        if shell.chatVM == nil {
            shell.chatVM = ChatViewModel(relay: appState.relay)
        }
        if shell.approvalVM == nil {
            shell.approvalVM = ApprovalViewModel(relay: appState.relay)
        }

        if let active = shell.conversationsVM.activeConversation {
            shell.chatVM?.loadConversation(active, context: modelContext)
        }

        shell.didInitialize = true
    }
}
