//
//  PairView.swift
//  makima-mobile
//

import SwiftUI

struct PairView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss
    @State private var code = ""
    @State private var isConnecting = false
    @State private var errorMessage: String?

    var body: some View {
        let theme = appState.resolvedTheme

        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                VStack(spacing: 12) {
                    Image(systemName: "link.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(theme.ring)

                    Text("Connect to Desktop")
                        .font(MakimaTypography.title(size: 22, relativeTo: .title2))

                    Text("Enter the 6-character pairing code shown on your desktop app.")
                        .font(.subheadline)
                        .foregroundStyle(theme.mutedForeground)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }

                TextField("Pairing Code", text: $code)
                    .font(.system(size: 32, weight: .bold, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .padding()
                    .background(theme.muted)
                    .overlay {
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(theme.border, lineWidth: 1)
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal, 48)
                    .onChange(of: code) { _, newValue in
                        code = String(newValue.prefix(6)).uppercased()
                    }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.callout)
                        .foregroundStyle(theme.destructiveForeground)
                        .padding(.horizontal)
                }

                Button {
                    connect()
                } label: {
                    if isConnecting {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Connect")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(code.count != 6 || isConnecting)
                .padding(.horizontal, 48)

                Spacer()
                Spacer()
            }
            .navigationTitle("Pair Device")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func connect() {
        isConnecting = true
        errorMessage = nil

        Task {
            do {
                try await appState.relay.pair(withCode: code)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isConnecting = false
        }
    }
}
