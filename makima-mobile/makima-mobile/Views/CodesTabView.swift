//
//  CodesTabView.swift
//  makima-mobile
//

import SwiftUI

struct CodesTabView: View {
    @Environment(AppState.self) private var appState

    @State private var sessions: [CodeSessionItem] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    var onBackToChat: (() -> Void)?

    var body: some View {
        let theme = appState.resolvedTheme

        NavigationStack {
            Group {
                if !appState.supabase.isConfigured || !appState.supabase.isAuthenticated {
                    ContentUnavailableView(
                        "Sign In Required",
                        systemImage: "person.crop.circle.badge.exclamationmark",
                        description: Text("Sign in to view agents from your paired desktop sessions.")
                    )
                    .accessibilityIdentifier("codes.empty.state")
                } else if isLoading {
                    ProgressView("Loading sessions...")
                } else if let errorMessage {
                    ContentUnavailableView(
                        "Unable to Load Codes",
                        systemImage: "exclamationmark.triangle",
                        description: Text(errorMessage)
                    )
                } else if sessions.isEmpty {
                    ContentUnavailableView(
                        "No Agent Sessions Yet",
                        systemImage: "desktopcomputer.and.arrow.down",
                        description: Text("Agents that run on your desktop will appear here.")
                    )
                    .accessibilityIdentifier("codes.empty.state")
                } else {
                    List {
                        ForEach(sessions) { session in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(session.agentName)
                                        .font(MakimaTypography.title(size: 17))

                                    Spacer()

                                    statusBadge(session.status)
                                }

                                if let desktopName = session.desktopName, !desktopName.isEmpty {
                                    Label(desktopName, systemImage: "desktopcomputer")
                                        .font(.subheadline)
                                        .foregroundStyle(theme.mutedForeground)
                                }

                                HStack(spacing: 8) {
                                    Label {
                                        Text(session.sortDate, style: .relative)
                                    } icon: {
                                        Image(systemName: "clock")
                                    }
                                    .font(.caption)
                                    .foregroundStyle(theme.mutedForeground)

                                    Text(String(session.sessionId.prefix(8)) + "...")
                                        .font(.caption.monospaced())
                                        .foregroundStyle(theme.mutedForeground)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                    .background(theme.background)
                    .refreshable {
                        await loadSessions()
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(theme.background)
            .navigationTitle("Codes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if let onBackToChat {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            onBackToChat()
                        } label: {
                            Label("Chat", systemImage: "chevron.left")
                        }
                        .accessibilityIdentifier("codes.chat.button")
                    }
                }
            }
            .task {
                if sessions.isEmpty {
                    await loadSessions()
                }
            }
        }
        .background(theme.background.ignoresSafeArea())
        .toolbarBackground(theme.background, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }

    private func loadSessions() async {
        guard appState.supabase.isConfigured, appState.supabase.isAuthenticated else {
            sessions = []
            errorMessage = nil
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            sessions = try await appState.relay.fetchRelaySessionsForCodes()
            errorMessage = nil
        } catch {
            sessions = []
            errorMessage = error.localizedDescription
        }
    }

    @ViewBuilder
    private func statusBadge(_ status: String) -> some View {
        Text(status.capitalized)
            .font(.caption.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor(status).opacity(0.14))
            .foregroundStyle(statusColor(status))
            .clipShape(Capsule())
    }

    private func statusColor(_ status: String) -> Color {
        appState.resolvedTheme.sessionStatusColor(status)
    }
}
