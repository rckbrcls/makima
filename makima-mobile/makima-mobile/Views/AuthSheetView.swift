//
//  AuthSheetView.swift
//  makima-mobile
//
//  Standalone auth sheet with Supabase config + login/signup.
//

import SwiftUI

struct AuthSheetView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var isLoading = false
    @State private var errorMessage: String?

    // Supabase config (hidden by default, expandable)
    @State private var showConfig = false
    @State private var url = ""
    @State private var anonKey = ""
    @State private var configSaved = false

    var body: some View {
        let theme = appState.resolvedTheme

        NavigationStack {
            Form {
                // Auth form
                Section(isSignUp ? "Create Account" : "Sign In") {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)

                    SecureField("Password", text: $password)
                        .textContentType(isSignUp ? .newPassword : .password)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(theme.destructiveForeground)
                    }

                    Button {
                        authenticate()
                    } label: {
                        if isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text(isSignUp ? "Create Account" : "Sign In")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(email.isEmpty || password.isEmpty || isLoading || !appState.supabase.isConfigured)

                    Button(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up") {
                        isSignUp.toggle()
                        errorMessage = nil
                    }
                    .font(.caption)
                }

                // Supabase config (expandable)
                Section {
                    DisclosureGroup("Server Configuration", isExpanded: $showConfig) {
                        TextField("Project URL", text: $url)
                            .textContentType(.URL)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)

                        SecureField("Anon Key", text: $anonKey)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)

                        Button("Save") {
                            appState.saveSupabaseConfig(url: url, anonKey: anonKey)
                            configSaved = true
                        }
                        .disabled(url.isEmpty || anonKey.isEmpty)

                        if configSaved {
                            Label("Saved", systemImage: "checkmark.circle.fill")
                                .foregroundStyle(theme.chart2)
                                .font(.caption)
                        }
                    }
                }
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            url = appState.supabaseURL
            anonKey = appState.supabaseAnonKey

            // Auto-expand config if not configured yet
            if !appState.supabase.isConfigured {
                showConfig = true
            }
        }
    }

    private func authenticate() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                if isSignUp {
                    try await appState.supabase.signUp(email: email, password: password)
                } else {
                    try await appState.supabase.signIn(email: email, password: password)
                }
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
