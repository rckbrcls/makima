//
//  TypewriterEmptyStateView.swift
//  makima-mobile
//
//  Empty chat state with typewriter text only.
//

import SwiftUI

struct TypewriterEmptyStateView: View {
    @Environment(AppState.self) private var appState
    @State private var displayedText = ""

    private let fullText = "Hello, I'm Makima..."
    private let typingInterval: TimeInterval = 0.06

    var body: some View {
        VStack {
            Spacer()

            Text(displayedText)
                .font(MakimaTypography.bodyTitle(size: 32, relativeTo: .largeTitle))
                .foregroundStyle(appState.resolvedTheme.mutedForeground)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            startTypewriter()
        }
    }

    private func startTypewriter() {
        displayedText = ""
        let characters = Array(fullText)

        for (index, char) in characters.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + typingInterval * Double(index)) {
                guard displayedText.count == index else { return }
                displayedText += String(char)
            }
        }
    }
}
