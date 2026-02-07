//
//  StatusView.swift
//  makima-mobile
//

import SwiftUI

struct StatusView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        NavigationStack {
            List {
                // Connection
                Section("Connection") {
                    LabeledContent("Status") {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(statusColor)
                                .frame(width: 8, height: 8)
                            Text(appState.relay.connectionStatus.rawValue.capitalized)
                                .foregroundStyle(.secondary)
                        }
                    }

                    if let name = appState.relay.desktopName {
                        LabeledContent("Desktop", value: name)
                    }

                    if let agent = appState.relay.activeAgentName {
                        LabeledContent("Active Agent", value: agent)
                    }

                    if let sessionId = appState.relay.currentSessionId {
                        LabeledContent("Session") {
                            Text(String(sessionId.prefix(8)) + "...")
                                .font(.caption.monospaced())
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Device
                Section("Device") {
                    LabeledContent("Push Notifications") {
                        if appState.notifications.isRegistered {
                            Label("Registered", systemImage: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        } else if appState.notifications.permissionGranted {
                            Label("Pending", systemImage: "clock")
                                .foregroundStyle(.orange)
                        } else {
                            Label("Not Enabled", systemImage: "xmark.circle")
                                .foregroundStyle(.secondary)
                        }
                    }

                    if let email = appState.supabase.userEmail {
                        LabeledContent("Account", value: email)
                    }
                }

                // Actions
                if appState.isPaired {
                    Section {
                        Button("Disconnect", role: .destructive) {
                            Task {
                                await appState.relay.disconnect()
                            }
                        }
                    }
                }
            }
            .navigationTitle("Status")
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
