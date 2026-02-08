//
//  ChatTabView.swift
//  makima-mobile
//

import SwiftUI
import SwiftData
import UIKit
import PhotosUI
import UniformTypeIdentifiers

struct ChatTabView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.modelContext) private var modelContext

    @State private var didComposerFocusOnce = false
    @State private var didComposerBlurAfterInitialFocus = false
    @State private var composerAttachments: [ComposerAttachment] = []
    @State private var pendingPhotoSelections: [PhotosPickerItem] = []
    @State private var isPhotoPickerPresented = false
    @State private var isFileImporterPresented = false
    @State private var speechTranscriber = SpeechTranscriber()
    @State private var voiceAlertMessage: String?
    @State private var didApplyUITestSeed = false

    let chatVM: ChatViewModel?
    let approvalVM: ApprovalViewModel?
    let conversationsVM: ConversationsViewModel

    let isActive: Bool
    @Binding var showAuth: Bool
    @Binding var showPair: Bool
    let onOpenConversations: () -> Void
    let onOpenCodes: () -> Void

    var body: some View {
        let theme = appState.resolvedTheme
        let messages = chatVM?.messages ?? []

        NavigationStack {
            ZStack(alignment: .top) {
                theme.background
                    .ignoresSafeArea()

                ChatThreadView(messages: messages)

                if let approvalVM, !approvalVM.pendingApprovals.isEmpty {
                    ApprovalBannerView(
                        approvals: approvalVM.pendingApprovals,
                        onApprove: { approval in
                            Task { await approvalVM.approve(approval) }
                        },
                        onReject: { approval in
                            Task { await approvalVM.reject(approval) }
                        }
                    )
                }
            }
            .safeAreaInset(edge: .bottom) {
                bottomBar
            }
            .navigationTitle(chatVM?.currentConversation?.title ?? "Makima")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        dismissKeyboard()
                        onOpenConversations()
                    } label: {
                        Image(systemName: "text.bubble")
                    }
                    .accessibilityIdentifier("chat.open.conversations.button")
                }

                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 8, height: 8)

                        if let agent = appState.relay.activeAgentName {
                            Text(agent)
                                .font(.caption.bold())
                        }
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismissKeyboard()
                        onOpenCodes()
                    } label: {
                        Image(systemName: "desktopcomputer")
                    }
                    .accessibilityIdentifier("chat.open.codes.button")
                }
            }
        }
        .photosPicker(
            isPresented: $isPhotoPickerPresented,
            selection: $pendingPhotoSelections,
            maxSelectionCount: 6,
            matching: .images
        )
        .fileImporter(
            isPresented: $isFileImporterPresented,
            allowedContentTypes: [.item],
            allowsMultipleSelection: true,
            onCompletion: handleFileImporterResult
        )
        .onChange(of: pendingPhotoSelections) { _, selections in
            appendPhotos(from: selections)
        }
        .onAppear {
            applyUITestSeedIfNeeded()
        }
        .alert("Voice Input", isPresented: voiceAlertBinding) {
            Button("OK", role: .cancel) {
                voiceAlertMessage = nil
            }
        } message: {
            Text(voiceAlertMessage ?? "Voice input is unavailable.")
        }
        .background(theme.background.ignoresSafeArea())
        .toolbarBackground(theme.background, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }

    @ViewBuilder
    private var bottomBar: some View {
        VStack(spacing: 10) {
            if appState.supabase.isConfigured && appState.supabase.isAuthenticated && !appState.isPaired {
                Button {
                    showPair = true
                } label: {
                    Label("Connect to Desktop", systemImage: "link.circle")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }

            if let chatVM {
                ChatComposerView(
                    text: Binding(
                        get: { chatVM.composerText },
                        set: { chatVM.composerText = $0 }
                    ),
                    attachments: $composerAttachments,
                    voiceState: speechTranscriber.state,
                    shouldFocus: isActive && !didComposerFocusOnce,
                    allowProgrammaticFocus: !didComposerBlurAfterInitialFocus,
                    isStreaming: chatVM.isAgentStreaming,
                    onFocusChanged: { isFocused in
                        if isFocused {
                            didComposerFocusOnce = true
                        } else if didComposerFocusOnce {
                            didComposerBlurAfterInitialFocus = true
                        }
                    },
                    onAddPhotoAttachment: {
                        isPhotoPickerPresented = true
                    },
                    onAddFileAttachment: {
                        isFileImporterPresented = true
                    },
                    onToggleMic: {
                        Task { @MainActor in
                            await toggleVoiceInput(for: chatVM)
                        }
                    },
                    onPrimaryAction: {
                        handlePrimaryAction(for: chatVM)
                    },
                    onRemoveAttachment: { attachment in
                        composerAttachments.removeAll(where: { $0.id == attachment.id })
                    }
                )
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 12)
        .background(Color.clear)
        .simultaneousGesture(dismissKeyboardDragGesture)
        .onChange(of: isActive) { _, isCurrentTab in
            if !isCurrentTab {
                dismissKeyboard()
                speechTranscriber.stop()
            }
        }
    }

    private var statusColor: Color {
        appState.resolvedTheme.connectionStatusColor(appState.relay.connectionStatus)
    }

    private var voiceAlertBinding: Binding<Bool> {
        Binding(
            get: { voiceAlertMessage != nil },
            set: { isPresented in
                if !isPresented {
                    voiceAlertMessage = nil
                }
            }
        )
    }

    @MainActor
    private func handlePrimaryAction(for chatVM: ChatViewModel) {
        if chatVM.isAgentStreaming {
            handleSend(for: chatVM)
            return
        }

        if ComposerPayloadBuilder.canSend(text: chatVM.composerText, attachments: composerAttachments) {
            handleSend(for: chatVM)
            return
        }

        Task { @MainActor in
            await toggleVoiceInput(for: chatVM)
        }
    }

    @MainActor
    private func handleSend(for chatVM: ChatViewModel) {
        guard appState.supabase.isConfigured, appState.supabase.isAuthenticated else {
            showAuth = true
            return
        }

        guard appState.isPaired else {
            showPair = true
            return
        }

        if !chatVM.isAgentStreaming {
            let payload = ComposerPayloadBuilder.build(text: chatVM.composerText, attachments: composerAttachments)
            guard ComposerPayloadBuilder.canSend(text: payload, attachments: []) else {
                return
            }
            chatVM.composerText = payload
            composerAttachments.removeAll()
            speechTranscriber.stop()
        }

        if chatVM.currentConversation == nil {
            let conversation = conversationsVM.createConversation(
                sessionId: appState.relay.currentSessionId
            )
            chatVM.currentConversation = conversation
            chatVM.loadConversation(conversation, context: modelContext)
        }

        Task {
            await chatVM.sendMessage()
        }
    }

    @MainActor
    private func toggleVoiceInput(for chatVM: ChatViewModel) async {
        await speechTranscriber.toggle(seedText: chatVM.composerText) { updatedText in
            chatVM.composerText = updatedText
        }

        if let errorMessage = speechTranscriber.lastErrorMessage {
            voiceAlertMessage = errorMessage
        }
    }

    private func appendPhotos(from selections: [PhotosPickerItem]) {
        guard !selections.isEmpty else { return }

        let baseCount = composerAttachments.count
        for index in selections.indices {
            let number = baseCount + index + 1
            composerAttachments.append(
                ComposerAttachment(
                    kind: .image,
                    displayName: "Photo \(number)"
                )
            )
        }

        pendingPhotoSelections.removeAll()
    }

    private func handleFileImporterResult(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            for url in urls {
                let name = url.lastPathComponent.trimmingCharacters(in: .whitespacesAndNewlines)
                composerAttachments.append(
                    ComposerAttachment(
                        kind: .file,
                        displayName: name.isEmpty ? "File" : name
                    )
                )
            }
        case .failure(let error):
            voiceAlertMessage = "Could not attach file: \(error.localizedDescription)"
        }
    }

    private func applyUITestSeedIfNeeded() {
        guard !didApplyUITestSeed else { return }
        didApplyUITestSeed = true

        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        if arguments.contains("-uiTestComposerSeedAttachment") {
            composerAttachments = [
                ComposerAttachment(kind: .file, displayName: "mock-attachment.txt")
            ]
        }
        #endif
    }

    private var dismissKeyboardDragGesture: some Gesture {
        DragGesture(minimumDistance: 16, coordinateSpace: .local)
            .onEnded { value in
                let verticalDelta = value.translation.height
                let horizontalDelta = abs(value.translation.width)

                guard verticalDelta > 36, verticalDelta > horizontalDelta else {
                    return
                }

                dismissKeyboard()
            }
    }

    private func dismissKeyboard() {
        UIApplication.shared.sendAction(
            #selector(UIResponder.resignFirstResponder),
            to: nil,
            from: nil,
            for: nil
        )
    }
}
