//
//  AppState.swift
//  makima-mobile
//

import Foundation
import SwiftUI

@Observable
final class AppState {
    private static let supabaseURLKey = "supabase_url"
    private static let supabaseAnonKeyKey = "supabase_anon_key"
    private static let appThemePreferenceKey = "app_theme_preference"

    private let defaults: UserDefaults

    let supabase = SupabaseService.shared
    let relay = RelayService()
    let notifications = NotificationService.shared

    var showApprovalOverlay = false
    var isPaired: Bool { relay.connectionStatus == .paired || relay.connectionStatus == .active }
    var themePreference: AppThemePreference = .light {
        didSet {
            defaults.set(themePreference.rawValue, forKey: Self.appThemePreferenceKey)
        }
    }

    var resolvedTheme: MakimaThemePalette {
        MakimaThemePalette.palette(for: themePreference)
    }

    var preferredColorScheme: ColorScheme {
        themePreference.colorScheme
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults

        if let rawTheme = defaults.string(forKey: Self.appThemePreferenceKey),
           let parsed = AppThemePreference(rawValue: rawTheme) {
            themePreference = parsed
        } else {
            themePreference = .light
        }
    }

    // Supabase config stored in UserDefaults
    var supabaseURL: String {
        get { defaults.string(forKey: Self.supabaseURLKey) ?? "" }
        set { defaults.set(newValue, forKey: Self.supabaseURLKey) }
    }

    var supabaseAnonKey: String {
        get { defaults.string(forKey: Self.supabaseAnonKeyKey) ?? "" }
        set { defaults.set(newValue, forKey: Self.supabaseAnonKeyKey) }
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

    func ensureThemePreferenceIfNeeded(systemScheme: ColorScheme) {
        guard defaults.string(forKey: Self.appThemePreferenceKey) == nil else { return }
        themePreference = AppThemePreference.from(systemScheme: systemScheme)
    }

    func saveSupabaseConfig(url: String, anonKey: String) {
        supabaseURL = url
        supabaseAnonKey = anonKey
        supabase.configure(url: url, anonKey: anonKey)
    }
}
