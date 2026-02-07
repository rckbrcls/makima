//
//  RootView.swift
//  makima-mobile
//

import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var systemColorScheme

    var body: some View {
        MainChatView()
            .preferredColorScheme(appState.preferredColorScheme)
            .tint(appState.resolvedTheme.ring)
            .task {
                appState.ensureThemePreferenceIfNeeded(systemScheme: systemColorScheme)
                await appState.setup()
            }
    }
}
