//
//  ChatBubbleView.swift
//  makima-mobile
//

import SwiftUI

struct ChatBubbleView: View {
    let message: ChatMessage

    var body: some View {
        HStack {
            switch message.role {
            case "user":
                Spacer(minLength: 60)
                userBubble
            case "assistant":
                assistantBubble
                Spacer(minLength: 60)
            case "tool":
                toolBubble
                Spacer(minLength: 40)
            case "system":
                systemBubble
            default:
                Text(message.content)
            }
        }
    }

    private var userBubble: some View {
        Text(message.content)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(.blue)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var assistantBubble: some View {
        HStack(alignment: .bottom, spacing: 6) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 0) {
                    Text(message.content)

                    if message.isStreaming {
                        StreamingCursorView()
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(.systemGray5))
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
    }

    private var toolBubble: some View {
        HStack(spacing: 8) {
            Image(systemName: "wrench.fill")
                .font(.caption)
                .foregroundStyle(.orange)

            VStack(alignment: .leading, spacing: 2) {
                if let toolName = message.toolName {
                    Text(toolName)
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                }
                Text(message.content)
                    .font(.callout)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var systemBubble: some View {
        HStack {
            Spacer()
            Text(message.content)
                .font(.callout)
                .foregroundStyle(.red)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Color.red.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            Spacer()
        }
    }
}

private struct StreamingCursorView: View {
    @State private var isVisible = true

    var body: some View {
        Rectangle()
            .fill(Color(.label))
            .frame(width: 2, height: 16)
            .opacity(isVisible ? 1 : 0)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
                    isVisible = false
                }
            }
    }
}
