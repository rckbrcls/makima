//
//  AppState.swift
//  makima-mobile
//

import Foundation

@Observable
final class AppState {
    let supabase = SupabaseService.shared
    let relay = RelayService()
    let notifications = NotificationService.shared

    var showApprovalOverlay = false
    var isPaired: Bool { relay.connectionStatus == .paired || relay.connectionStatus == .active }

    // Supabase config stored in UserDefaults
    var supabaseURL: String {
        get { UserDefaults.standard.string(forKey: "supabase_url") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "supabase_url") }
    }

    var supabaseAnonKey: String {
        get { UserDefaults.standard.string(forKey: "supabase_anon_key") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "supabase_anon_key") }
    }

    func setup() async {
        // Configure Supabase if we have saved credentials
        if !supabaseURL.isEmpty && !supabaseAnonKey.isEmpty {
            supabase.configure(url: supabaseURL, anonKey: supabaseAnonKey)
            await supabase.restoreSession()
        }

        // Request notification permission
        await notifications.requestPermission()

        // Handle notification taps — show approval overlay instead of switching tabs
        notifications.onApprovalNotificationTapped = { [weak self] _, _ in
            self?.showApprovalOverlay = true
        }
    }

    func saveSupabaseConfig(url: String, anonKey: String) {
        supabaseURL = url
        supabaseAnonKey = anonKey
        supabase.configure(url: url, anonKey: anonKey)
    }
}
