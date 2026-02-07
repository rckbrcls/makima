//
//  BlobEmptyStateView.swift
//  makima-mobile
//
//  Empty chat state showing the Metal blob with a typewriter text overlay.
//

import SwiftUI

struct BlobEmptyStateView: View {
    @Environment(AppState.self) private var appState

    @State private var displayedText = ""
    @State private var isTouching = false

    private let fullText = "Hello, I'm Makima..."
    private let typingInterval: TimeInterval = 0.06

    var body: some View {
        let theme = appState.resolvedTheme

        VStack(spacing: 24) {
            Spacer()

            BlobMetalView(isTouching: isTouching)
                .frame(height: 320)
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { _ in isTouching = true }
                        .onEnded { _ in isTouching = false }
                )

            Text(displayedText)
                .font(.title3.weight(.medium))
                .foregroundStyle(theme.mutedForeground)
                .frame(height: 28)

            Spacer()
            Spacer()
        }
        .onAppear {
            startTypewriter()
        }
    }

    private func startTypewriter() {
        displayedText = ""
        let characters = Array(fullText)

        for (index, char) in characters.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + typingInterval * Double(index)) {
                displayedText += String(char)
            }
        }
    }
}
