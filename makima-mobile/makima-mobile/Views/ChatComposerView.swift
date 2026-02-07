//
//  ChatComposerView.swift
//  makima-mobile
//

import SwiftUI

struct ChatComposerView: View {
    @Environment(AppState.self) private var appState

    @Binding var text: String
    var shouldFocus = true
    var allowProgrammaticFocus = true
    let isStreaming: Bool
    var onFocusChanged: ((Bool) -> Void)? = nil
    let onSend: () -> Void

    @FocusState private var isTextFieldFocused: Bool

    var body: some View {
        let theme = appState.resolvedTheme

        HStack(alignment: .bottom, spacing: 8) {
            TextField("Message...", text: $text, axis: .vertical)
                .lineLimit(1...6)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(theme.card)
                .overlay {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(theme.border, lineWidth: 1)
                }
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .focused($isTextFieldFocused)
                .submitLabel(.send)
                .onSubmit {
                    if canSend || isStreaming {
                        onSend()
                    }
                    requestProgrammaticFocus()
                }

            Button {
                onSend()
                requestProgrammaticFocus()
            } label: {
                Image(systemName: isStreaming ? "stop.circle.fill" : "arrow.up.circle.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(canSend || isStreaming ? theme.ring : theme.mutedForeground)
            }
            .disabled(!canSend && !isStreaming)
            .accessibilityIdentifier("composer.send.button")
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
        .onAppear {
            if shouldFocus {
                requestProgrammaticFocus()
            }
        }
        .onTapGesture {
            isTextFieldFocused = true
        }
        .onChange(of: isTextFieldFocused) { _, isFocused in
            onFocusChanged?(isFocused)
        }
        .onChange(of: shouldFocus) { _, isFocused in
            if isFocused {
                requestProgrammaticFocus()
            }
        }
    }

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func requestProgrammaticFocus() {
        guard allowProgrammaticFocus else { return }
        DispatchQueue.main.async {
            isTextFieldFocused = true
        }
    }
}
