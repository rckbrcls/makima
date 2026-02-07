//
//  SettingsView.swift
//  makima-mobile
//

import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @State private var url = ""
    @State private var anonKey = ""
    @State private var isSaved = false

    var body: some View {
        let theme = appState.resolvedTheme

        NavigationStack {
            Form {
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

                // Auth
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

                // About
                Section("About") {
                    LabeledContent("App", value: "Makima Mobile")
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                }
            }
            .navigationTitle("Settings")
        }
        .onAppear {
            url = appState.supabaseURL
            anonKey = appState.supabaseAnonKey
        }
    }
}
