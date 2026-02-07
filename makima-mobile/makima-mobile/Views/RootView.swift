//
//  RootView.swift
//  makima-mobile
//

import SwiftUI

struct RootView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        MainChatView()
            .task {
                await appState.setup()
            }
    }
}
