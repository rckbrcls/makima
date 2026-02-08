//
//  ChatComposerView.swift
//  makima-mobile
//

import SwiftUI

struct ChatComposerView: View {
    @Environment(AppState.self) private var appState

    @Binding var text: String
    @Binding var attachments: [ComposerAttachment]
    let voiceState: VoiceInputState
    var shouldFocus = true
    var allowProgrammaticFocus = true
    let isStreaming: Bool
    var onFocusChanged: ((Bool) -> Void)? = nil
    let onAddPhotoAttachment: () -> Void
    let onAddFileAttachment: () -> Void
    let onToggleMic: () -> Void
    let onPrimaryAction: () -> Void
    let onRemoveAttachment: (ComposerAttachment) -> Void

    @FocusState private var isTextFieldFocused: Bool

    var body: some View {
        let theme = appState.resolvedTheme

        VStack(alignment: .leading, spacing: 12) {
            TextField("Chat with Makima", text: $text, axis: .vertical)
                .lineLimit(1...6)
                .padding(.horizontal, 2)
                .focused($isTextFieldFocused)
                .submitLabel(.send)
                .accessibilityIdentifier("composer.text.field")
                .onSubmit {
                    if canSend || isStreaming {
                        onPrimaryAction()
                    }
                    requestProgrammaticFocus()
                }

            if !attachments.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(attachments) { attachment in
                            attachmentChip(for: attachment, theme: theme)
                        }
                    }
                    .padding(.horizontal, 2)
                }
            }

            HStack(spacing: 12) {
                Menu {
                    Button {
                        HapticFeedback.tap()
                        onAddPhotoAttachment()
                    } label: {
                        Label("Photo Library", systemImage: "photo.on.rectangle")
                    }

                    Button {
                        HapticFeedback.tap()
                        onAddFileAttachment()
                    } label: {
                        Label("Browse Files", systemImage: "doc")
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .regular))
                        .foregroundStyle(theme.foreground.opacity(0.9))
                        .frame(width: 30, height: 30)
                }
                .menuStyle(.button)
                .accessibilityIdentifier("composer.add.button")

                Spacer(minLength: 0)

                Button {
                    HapticFeedback.tap()
                    onToggleMic()
                } label: {
                    Image(systemName: voiceState.isListening ? "mic.fill" : "mic")
                        .font(.system(size: 20, weight: .regular))
                        .foregroundStyle(voiceState.isListening ? theme.ring : theme.foreground.opacity(0.9))
                        .frame(width: 30, height: 30)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("composer.mic.button")

                Button {
                    HapticFeedback.tap()
                    onPrimaryAction()
                    requestProgrammaticFocus()
                } label: {
                    ZStack {
                        Circle()
                            .fill(primaryOrbBackground(theme: theme))
                            .frame(width: 44, height: 44)

                        Image(systemName: primaryOrbIconName)
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(primaryOrbForeground(theme: theme))
                    }
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("composer.primary.button")
                .accessibilityLabel(primaryOrbAccessibilityLabel)
                .accessibilityValue(primaryOrbAccessibilityValue)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 30, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .stroke(theme.foreground.opacity(0.12), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.14), radius: 18, x: 0, y: 8)
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
        ComposerPayloadBuilder.canSend(text: text, attachments: attachments)
    }

    private var primaryOrbIconName: String {
        if isStreaming {
            return "stop.fill"
        }

        if canSend {
            return "arrow.up"
        }

        return "waveform"
    }

    private var primaryOrbAccessibilityLabel: String {
        if isStreaming {
            return "Stop stream"
        }

        if canSend {
            return "Send message"
        }

        return "Start dictation"
    }

    private var primaryOrbAccessibilityValue: String {
        if isStreaming {
            return "stop"
        }

        if canSend {
            return "send"
        }

        return "dictation"
    }

    private func primaryOrbBackground(theme: MakimaThemePalette) -> Color {
        if canSend || isStreaming {
            return theme.primary
        }
        return theme.primary.opacity(0.35)
    }

    private func primaryOrbForeground(theme: MakimaThemePalette) -> Color {
        if canSend || isStreaming {
            return theme.primaryForeground
        }
        return theme.primaryForeground.opacity(0.86)
    }

    private func attachmentChip(for attachment: ComposerAttachment, theme: MakimaThemePalette) -> some View {
        HStack(spacing: 6) {
            Image(systemName: attachment.kind.systemImage)
                .font(.caption)
                .foregroundStyle(theme.foreground.opacity(0.75))

            Text(attachment.displayName)
                .lineLimit(1)
                .font(.caption)
                .foregroundStyle(theme.foreground)

            Button {
                onRemoveAttachment(attachment)
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .frame(width: 16, height: 16)
                    .foregroundStyle(theme.foreground.opacity(0.72))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("composer.attachment.remove.\(attachment.id.uuidString)")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(theme.foreground.opacity(0.1), in: Capsule())
        .accessibilityIdentifier("composer.attachment.\(attachment.id.uuidString)")
    }

    private func requestProgrammaticFocus() {
        guard allowProgrammaticFocus else { return }
        DispatchQueue.main.async {
            isTextFieldFocused = true
        }
    }
}
