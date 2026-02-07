//
//  ConversationsListSheet.swift
//  makima-mobile
//

import SwiftUI

struct ConversationsTabView: View {
    @Environment(AppState.self) private var appState

    @Bindable var viewModel: ConversationsViewModel
    let onSelect: (Conversation) -> Void
    let onNew: () -> Void
    var onOpenSettings: (() -> Void)?
    var onOpenAuth: (() -> Void)?

    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.groupedConversations) { section in
                    Section(section.title) {
                        ForEach(section.conversations, id: \.id) { conversation in
                            Button {
                                onSelect(conversation)
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(conversation.title)
                                            .font(.body)
                                            .foregroundStyle(.primary)

                                        Text(conversation.updatedAt, style: .relative)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()

                                    if conversation.id == viewModel.activeConversation?.id {
                                        Circle()
                                            .fill(.blue)
                                            .frame(width: 8, height: 8)
                                    }

                                    statusDot(for: conversation.status)
                                }
                            }
                            .accessibilityIdentifier("conversation.row.\(conversation.id)")
                            .contextMenu {
                                Button(role: .destructive) {
                                    viewModel.delete(conversation)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .searchable(text: $viewModel.searchQuery, prompt: "Search conversations")
            .onChange(of: viewModel.searchQuery) { _, _ in
                viewModel.load()
            }
            .navigationTitle("Conversations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if let onOpenSettings {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            onOpenSettings()
                        } label: {
                            Image(systemName: "gearshape")
                        }
                        .accessibilityIdentifier("conversations.settings.button")
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        onNew()
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .accessibilityIdentifier("conversations.new.button")
                }
            }
            .safeAreaInset(edge: .bottom) {
                if !appState.supabase.isConfigured || !appState.supabase.isAuthenticated {
                    HStack {
                        Spacer()
                        Button {
                            onOpenAuth?()
                        } label: {
                            Label("Sign In", systemImage: "person.crop.circle")
                                .font(.subheadline)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                        .accessibilityIdentifier("conversations.signin.button")
                        Spacer()
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 6)
                    .padding(.bottom, 10)
                    .background(Color(.systemBackground))
                }
            }
        }
    }

    private func statusDot(for status: String) -> some View {
        Circle()
            .fill(statusColor(for: status))
            .frame(width: 6, height: 6)
    }

    private func statusColor(for status: String) -> Color {
        switch status {
        case "running", "streaming": return .orange
        case "error": return .red
        default: return .clear
        }
    }
}
