//
//  ApprovalCardView.swift
//  makima-mobile
//

import SwiftUI

struct ApprovalCardView: View {
    @Environment(AppState.self) private var appState

    let approval: ApprovalRequest
    let onApprove: () -> Void
    let onReject: () -> Void

    var body: some View {
        let theme = appState.resolvedTheme

        VStack(alignment: .leading, spacing: 12) {
            // Header: tool name + risk badge
            HStack {
                Text(approval.toolName)
                    .font(.headline)

                Spacer()

                riskBadge
            }

            // Description
            Text(approval.toolDescription)
                .font(.subheadline)
                .foregroundStyle(theme.mutedForeground)

            // Arguments preview
            if approval.toolArguments != "{}" {
                Text(approval.toolArguments)
                    .font(.caption.monospaced())
                    .foregroundStyle(theme.mutedForeground)
                    .lineLimit(3)
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(theme.muted)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            // Actions
            HStack(spacing: 12) {
                Button(role: .destructive, action: onReject) {
                    Text("Reject")
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                Button(action: onApprove) {
                    Text("Approve")
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .background(theme.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: theme.foreground.opacity(0.08), radius: 4, y: 2)
    }

    private var riskBadge: some View {
        Text(approval.risk.capitalized)
            .font(.caption.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(riskColor.opacity(0.15))
            .foregroundStyle(riskColor)
            .clipShape(Capsule())
    }

    private var riskColor: Color {
        appState.resolvedTheme.riskColor(approval.risk)
    }
}
