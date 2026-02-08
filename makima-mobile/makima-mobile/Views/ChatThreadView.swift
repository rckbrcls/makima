//
//  ChatThreadView.swift
//  makima-mobile
//
//  Scrollable message thread with automatic focus on latest message.
//

import SwiftUI

struct ChatThreadView: View {
    let messages: [ChatMessage]

    var body: some View {
        if messages.isEmpty {
            TypewriterEmptyStateView()
                .accessibilityIdentifier("chat.empty.state")
        } else {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(messages, id: \.id) { message in
                            ChatBubbleView(message: message)
                                .id(message.id)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .padding(.bottom, 28)
                }
                .scrollIndicators(.hidden)
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: messages.count) { _, _ in
                    guard let lastId = messages.last?.id else { return }
                    withAnimation(.easeOut(duration: 0.24)) {
                        proxy.scrollTo(lastId, anchor: .bottom)
                    }
                }
            }
        }
    }
}
