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
        let theme = appState.resolvedTheme

        NavigationStack {
            List {
                Section {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(theme.mutedForeground)
                        TextField("Search conversations", text: $viewModel.searchQuery)
                            .foregroundStyle(theme.foreground)
                        if !viewModel.searchQuery.isEmpty {
                            Button {
                                viewModel.searchQuery = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(theme.mutedForeground)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(12)
                    .glassEffect(.regular)
                    .listRowBackground(Color.clear)
                } header: {
                    Text("Conversations")
                        .font(.custom("Baskerville", size: 32))
                        .foregroundStyle(theme.foreground)
                        .textCase(nil)
                }

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
                                            .foregroundStyle(theme.foreground)

                                        Text(updatedAtLabel(for: conversation.updatedAt))
                                            .font(.caption)
                                            .foregroundStyle(theme.mutedForeground)
                                    }

                                    Spacer()

                                    if conversation.id == viewModel.activeConversation?.id {
                                        Circle()
                                            .fill(theme.ring)
                                            .frame(width: 8, height: 8)
                                    }

                                    statusDot(for: conversation.status)
                                }
                            }
                            .buttonStyle(.plain)
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
            .background(theme.background)
            .onChange(of: viewModel.searchQuery) { _, _ in
                viewModel.load()
            }
            .toolbar {
                if let onOpenSettings {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            onOpenSettings()
                        } label: {
                            Image(systemName: "gearshape")
                        }
                        .foregroundStyle(theme.foreground)
                        .accessibilityIdentifier("conversations.settings.button")
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        onNew()
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .foregroundStyle(theme.foreground)
                    .accessibilityIdentifier("conversations.new.button")
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if !appState.supabase.isConfigured || !appState.supabase.isAuthenticated {
                    HStack {
                        Button {
                            onOpenAuth?()
                        } label: {
                            Label("Sign In", systemImage: "person.crop.circle")
                                .font(.headline)
                                .padding(12)
                                .glassEffect(.regular)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("conversations.signin.button")
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.top, 6)
                    .padding(.bottom, 10)
                    .background(theme.background)
                }
            }
        }
        .background(theme.background.ignoresSafeArea())
        .toolbarBackground(theme.background, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }

    private func statusDot(for status: String) -> some View {
        Circle()
            .fill(statusColor(for: status))
            .frame(width: 6, height: 6)
    }

    private func statusColor(for status: String) -> Color {
        appState.resolvedTheme.sessionStatusColor(status)
    }

    private func updatedAtLabel(for date: Date) -> String {
        let now = Date()
        let seconds = Int(now.timeIntervalSince(date))

        if seconds < 60 {
            return "just now"
        }

        return Self.relativeDateFormatter.localizedString(for: date, relativeTo: now)
    }

    private static let relativeDateFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter
    }()
}
