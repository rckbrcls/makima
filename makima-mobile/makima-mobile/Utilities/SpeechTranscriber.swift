//
//  SpeechTranscriber.swift
//  makima-mobile
//

import AVFoundation
import Foundation
import Observation
import Speech

enum VoiceInputState: Equatable {
    case idle
    case listening
    case unavailable
    case denied

    var isListening: Bool {
        self == .listening
    }
}

@Observable
final class SpeechTranscriber {
    var state: VoiceInputState = .idle
    var lastErrorMessage: String?

    private let speechRecognizer: SFSpeechRecognizer?
    private let audioEngine: AVAudioEngine

    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var isInputTapInstalled = false

    init(locale: Locale = .autoupdatingCurrent, audioEngine: AVAudioEngine = AVAudioEngine()) {
        self.speechRecognizer = SFSpeechRecognizer(locale: locale)
        self.audioEngine = audioEngine
    }

    func toggle(seedText: String, onUpdate: @escaping (String) -> Void) async {
        if state.isListening {
            stop()
            return
        }

        await start(seedText: seedText, onUpdate: onUpdate)
    }

    func stop() {
        recognitionTask?.cancel()
        recognitionTask = nil

        recognitionRequest?.endAudio()
        recognitionRequest = nil

        if audioEngine.isRunning {
            audioEngine.stop()
        }

        if isInputTapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            isInputTapInstalled = false
        }

        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        state = .idle
    }

    private func start(seedText: String, onUpdate: @escaping (String) -> Void) async {
        lastErrorMessage = nil

        guard await requestSpeechPermission() else {
            setFailureState(.denied, message: "Speech recognition permission is required.")
            return
        }

        guard await requestMicrophonePermission() else {
            setFailureState(.denied, message: "Microphone permission is required.")
            return
        }

        guard let speechRecognizer, speechRecognizer.isAvailable else {
            setFailureState(.unavailable, message: "Speech recognition is currently unavailable.")
            return
        }

        stop()

        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            request.taskHint = .dictation
            recognitionRequest = request

            let inputNode = audioEngine.inputNode
            let format = inputNode.outputFormat(forBus: 0)
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                self?.recognitionRequest?.append(buffer)
            }
            isInputTapInstalled = true

            audioEngine.prepare()
            try audioEngine.start()

            state = .listening

            recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
                guard let self else { return }

                if let result {
                    let transcript = result.bestTranscription.formattedString
                    let merged = Self.merge(seedText: seedText, transcript: transcript)

                    DispatchQueue.main.async {
                        onUpdate(merged)
                        if result.isFinal {
                            self.stop()
                        }
                    }
                }

                if let error {
                    DispatchQueue.main.async {
                        self.setFailureState(.idle, message: error.localizedDescription)
                        self.stop()
                    }
                }
            }
        } catch {
            setFailureState(.idle, message: error.localizedDescription)
            stop()
        }
    }

    private func setFailureState(_ state: VoiceInputState, message: String) {
        self.state = state
        self.lastErrorMessage = message
    }

    private static func merge(seedText: String, transcript: String) -> String {
        let base = seedText.trimmingCharacters(in: .whitespacesAndNewlines)
        let spoken = transcript.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !base.isEmpty else { return spoken }
        guard !spoken.isEmpty else { return base }
        return "\(base)\n\(spoken)"
    }

    private func requestSpeechPermission() async -> Bool {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            return true
        case .denied, .restricted:
            return false
        case .notDetermined:
            return await withCheckedContinuation { continuation in
                SFSpeechRecognizer.requestAuthorization { status in
                    continuation.resume(returning: status == .authorized)
                }
            }
        @unknown default:
            return false
        }
    }

    private func requestMicrophonePermission() async -> Bool {
        let session = AVAudioSession.sharedInstance()

        switch session.recordPermission {
        case .granted:
            return true
        case .denied:
            return false
        case .undetermined:
            return await withCheckedContinuation { continuation in
                session.requestRecordPermission { allowed in
                    continuation.resume(returning: allowed)
                }
            }
        @unknown default:
            return false
        }
    }
}
