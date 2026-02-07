//
//  GlassComposerView.swift
//  makima-mobile
//
//  Composer bar using native iOS liquid glass.
//

import SwiftUI

struct GlassComposerView: View {
    @Binding var text: String
    let isStreaming: Bool
    let onSend: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Message...", text: $text, axis: .vertical)
                .lineLimit(1...6)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)

            Button(action: onSend) {
                Image(systemName: isStreaming ? "stop.circle.fill" : "arrow.up.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(canSend || isStreaming ? .blue : Color(.systemGray4))
            }
            .disabled(!canSend && !isStreaming)
            .accessibilityIdentifier("composer.send.button")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.bar)
        .glassEffect(.regular.interactive())
    }

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
