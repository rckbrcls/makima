//
//  ChatBubbleView.swift
//  makima-mobile
//

import SwiftUI

struct ChatBubbleView: View {
    @Environment(AppState.self) private var appState

    let message: ChatMessage

    var body: some View {
        let theme = appState.resolvedTheme

        HStack {
            switch message.role {
            case "user":
                Spacer(minLength: 60)
                userBubble(theme: theme)
            case "assistant":
                assistantBubble(theme: theme)
                Spacer(minLength: 60)
            case "tool":
                toolBubble(theme: theme)
                Spacer(minLength: 40)
            case "system":
                systemBubble(theme: theme)
            default:
                Text(message.content)
            }
        }
    }

    private func userBubble(theme: MakimaThemePalette) -> some View {
        Text(message.content)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(theme.primary)
            .foregroundStyle(theme.primaryForeground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func assistantBubble(theme: MakimaThemePalette) -> some View {
        HStack(alignment: .bottom, spacing: 6) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 0) {
                    Text(message.content)

                    if message.isStreaming {
                        StreamingCursorView(color: theme.foreground)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(theme.muted)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    private func toolBubble(theme: MakimaThemePalette) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "wrench.fill")
                .font(.caption)
                .foregroundStyle(theme.chart3)

            VStack(alignment: .leading, spacing: 2) {
                if let toolName = message.toolName {
                    Text(toolName)
                        .font(.caption.bold())
                        .foregroundStyle(theme.mutedForeground)
                }
                Text(message.content)
                    .font(.callout)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(theme.secondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func systemBubble(theme: MakimaThemePalette) -> some View {
        HStack {
            Spacer()
            Text(message.content)
                .font(.callout)
                .foregroundStyle(theme.destructiveForeground)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(theme.destructive.opacity(0.14))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            Spacer()
        }
    }
}

private struct StreamingCursorView: View {
    let color: Color

    @State private var isVisible = true

    var body: some View {
        Rectangle()
            .fill(color)
            .frame(width: 2, height: 16)
            .opacity(isVisible ? 1 : 0)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
                    isVisible = false
                }
            }
    }
}
