//
//  AuthFormView.swift
//  makima-mobile
//

import SwiftUI

struct AuthFormView: View {
    @Environment(AppState.self) private var appState
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
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
                    .foregroundStyle(.red)
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
            .disabled(email.isEmpty || password.isEmpty || isLoading)

            Button(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up") {
                isSignUp.toggle()
                errorMessage = nil
            }
            .font(.caption)
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
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
