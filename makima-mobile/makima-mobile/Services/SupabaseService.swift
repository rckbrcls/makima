//
//  SupabaseService.swift
//  makima-mobile
//

import Foundation
import Supabase

@Observable
final class SupabaseService {
    static let shared = SupabaseService()

    private(set) var client: SupabaseClient?
    private(set) var isConfigured = false
    private(set) var isAuthenticated = false
    private(set) var userId: String?
    private(set) var userEmail: String?

    private init() {}

    func configure(url: String, anonKey: String) {
        guard let supabaseURL = URL(string: url) else { return }

        client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: anonKey
        )
        isConfigured = true
    }

    func restoreSession() async {
        guard let client else { return }

        do {
            let session = try await client.auth.session
            isAuthenticated = true
            userId = session.user.id.uuidString
            userEmail = session.user.email
        } catch {
            isAuthenticated = false
            userId = nil
            userEmail = nil
        }
    }

    func signIn(email: String, password: String) async throws {
        guard let client else {
            throw SupabaseServiceError.notConfigured
        }

        let session = try await client.auth.signIn(
            email: email,
            password: password
        )
        isAuthenticated = true
        userId = session.user.id.uuidString
        userEmail = session.user.email
    }

    func signUp(email: String, password: String) async throws {
        guard let client else {
            throw SupabaseServiceError.notConfigured
        }

        let response = try await client.auth.signUp(
            email: email,
            password: password
        )
        if let session = response.session {
            isAuthenticated = true
            userId = session.user.id.uuidString
            userEmail = session.user.email
        }
    }

    func signOut() async throws {
        guard let client else { return }

        try await client.auth.signOut()
        isAuthenticated = false
        userId = nil
        userEmail = nil
    }

    func reset() {
        client = nil
        isConfigured = false
        isAuthenticated = false
        userId = nil
        userEmail = nil
    }
}

enum SupabaseServiceError: LocalizedError {
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Supabase is not configured. Please set URL and anon key in Settings."
        }
    }
}
