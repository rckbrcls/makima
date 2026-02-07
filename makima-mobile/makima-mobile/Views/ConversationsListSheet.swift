//
//  ConversationsListSheet.swift
//  makima-mobile
//
//  Conversations list used inside the side drawer.
//

import SwiftUI

struct ConversationsListSheet: View {
    @Bindable var viewModel: ConversationsViewModel
    let onSelect: (Conversation) -> Void
    let onNew: () -> Void
    let close: () -> Void

    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.groupedConversations) { section in
                    Section(section.title) {
                        ForEach(section.conversations, id: \.id) { conversation in
                            Button {
                                onSelect(conversation)
                                close()
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
            .scrollContentBackground(.hidden)
            .background(.clear)
            .searchable(text: $viewModel.searchQuery, prompt: "Search conversations")
            .onChange(of: viewModel.searchQuery) { _, _ in
                viewModel.load()
            }
            .navigationTitle("Conversations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") {
                        close()
                    }
                    .accessibilityIdentifier("drawer.close.button")
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        onNew()
                        close()
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .accessibilityIdentifier("drawer.new-conversation.button")
                }
            }
        }
        .glassEffect(.regular)
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
