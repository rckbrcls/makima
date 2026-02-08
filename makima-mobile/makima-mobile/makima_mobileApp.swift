//
//  makima_mobileApp.swift
//  makima-mobile
//

import SwiftUI
import SwiftData
import UIKit

@main
struct makima_mobileApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var appState = AppState()

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            ChatMessage.self,
            RelaySession.self,
            ApprovalRequest.self,
            Conversation.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
        }
        .modelContainer(sharedModelContainer)
    }
}

// MARK: - AppDelegate for Push Notifications

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = NotificationService.shared
        configureNavigationTitleTypography()
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        NotificationService.shared.handleDeviceToken(deviceToken)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        NotificationService.shared.handleRegistrationError(error)
    }

    private func configureNavigationTitleTypography() {
        let titleFont = MakimaTypography.navigationTitleFont()
        let largeTitleFont = MakimaTypography.navigationLargeTitleFont()
        let navigationBar = UINavigationBar.appearance()

        func styledAppearance(from base: UINavigationBarAppearance?) -> UINavigationBarAppearance {
            let appearance = (base?.copy() as? UINavigationBarAppearance) ?? UINavigationBarAppearance()

            var titleAttributes = appearance.titleTextAttributes
            titleAttributes[.font] = titleFont
            appearance.titleTextAttributes = titleAttributes

            var largeTitleAttributes = appearance.largeTitleTextAttributes
            largeTitleAttributes[.font] = largeTitleFont
            appearance.largeTitleTextAttributes = largeTitleAttributes

            return appearance
        }

        let standardAppearance = styledAppearance(from: navigationBar.standardAppearance)
        navigationBar.standardAppearance = standardAppearance
        navigationBar.scrollEdgeAppearance = styledAppearance(
            from: navigationBar.scrollEdgeAppearance ?? standardAppearance
        )
        navigationBar.compactAppearance = styledAppearance(
            from: navigationBar.compactAppearance ?? standardAppearance
        )
    }
}
