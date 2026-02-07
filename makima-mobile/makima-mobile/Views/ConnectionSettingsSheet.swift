//
//  ConnectionSettingsSheet.swift
//  makima-mobile
//
//  Full-page settings view pushed via NavigationLink.
//

import SwiftUI

struct ConnectionSettingsSheet: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var url = ""
    @State private var anonKey = ""
    @State private var isSaved = false

    var showCloseButton = false

    var body: some View {
        let theme = appState.resolvedTheme

        List {
            // Connection
            Section("Connection") {
                LabeledContent("Status") {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 8, height: 8)
                        Text(appState.relay.connectionStatus.rawValue.capitalized)
                            .foregroundStyle(theme.mutedForeground)
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
                            .foregroundStyle(theme.mutedForeground)
                    }
                }
            }

            Section("Appearance") {
                Picker(
                    "Theme",
                    selection: Binding(
                        get: { appState.themePreference },
                        set: { appState.themePreference = $0 }
                    )
                ) {
                    ForEach(AppThemePreference.allCases) { preference in
                        Text(preference.title).tag(preference)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityIdentifier("settings.theme.picker")
            }

            // Supabase Configuration
            Section("Supabase") {
                TextField("Project URL", text: $url)
                    .textContentType(.URL)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                SecureField("Anon Key", text: $anonKey)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                Button("Save Configuration") {
                    appState.saveSupabaseConfig(url: url, anonKey: anonKey)
                    isSaved = true
                    Task {
                        await appState.supabase.restoreSession()
                    }
                }
                .disabled(url.isEmpty || anonKey.isEmpty)

                if isSaved {
                    Label("Configuration saved", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(theme.chart2)
                        .font(.caption)
                }
            }

            // Account
            if appState.supabase.isConfigured {
                if appState.supabase.isAuthenticated {
                    Section("Account") {
                        if let email = appState.supabase.userEmail {
                            LabeledContent("Email", value: email)
                        }

                        Button("Sign Out", role: .destructive) {
                            Task {
                                try? await appState.supabase.signOut()
                            }
                        }
                    }
                } else {
                    AuthFormView()
                }
            }

            // Device
            Section("Device") {
                LabeledContent("Push Notifications") {
                    if appState.notifications.isRegistered {
                        Label("Registered", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(theme.connectionStatusColor(.active))
                    } else if appState.notifications.permissionGranted {
                        Label("Pending", systemImage: "clock")
                            .foregroundStyle(theme.connectionStatusColor(.pairing))
                    } else {
                        Label("Not Enabled", systemImage: "xmark.circle")
                            .foregroundStyle(theme.connectionStatusColor(.disconnected))
                    }
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

            // About
            Section("About") {
                LabeledContent("App", value: "Makima Mobile")
                LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if showCloseButton {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            url = appState.supabaseURL
            anonKey = appState.supabaseAnonKey
        }
    }

    private var statusColor: Color {
        appState.resolvedTheme.connectionStatusColor(appState.relay.connectionStatus)
    }
}
