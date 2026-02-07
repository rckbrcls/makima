//
//  ChatComposerView.swift
//  makima-mobile
//

import SwiftUI

struct ChatComposerView: View {
    @Binding var text: String
    var shouldFocus = true
    let isStreaming: Bool
    let onSend: () -> Void

    @FocusState private var isTextFieldFocused: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Message...", text: $text, axis: .vertical)
                .lineLimit(1...6)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .focused($isTextFieldFocused)
                .submitLabel(.send)
                .onSubmit {
                    if canSend || isStreaming {
                        onSend()
                    }
                    isTextFieldFocused = true
                }

            Button {
                onSend()
                isTextFieldFocused = true
            } label: {
                Image(systemName: isStreaming ? "stop.circle.fill" : "arrow.up.circle.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(canSend || isStreaming ? .blue : Color(.systemGray3))
            }
            .disabled(!canSend && !isStreaming)
            .accessibilityIdentifier("composer.send.button")
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
        .onAppear {
            if shouldFocus {
                DispatchQueue.main.async {
                    isTextFieldFocused = true
                }
            }
        }
        .onTapGesture {
            isTextFieldFocused = true
        }
        .onChange(of: shouldFocus) { _, isFocused in
            if isFocused {
                DispatchQueue.main.async {
                    isTextFieldFocused = true
                }
            } else {
                isTextFieldFocused = false
            }
        }
    }

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
