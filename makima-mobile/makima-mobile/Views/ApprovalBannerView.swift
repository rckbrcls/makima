//
//  ApprovalBannerView.swift
//  makima-mobile
//
//  Compact banner at top of chat when approvals are pending.
//

import SwiftUI

struct ApprovalBannerView: View {
    @Environment(AppState.self) private var appState

    let approvals: [ApprovalRequest]
    let onApprove: (ApprovalRequest) -> Void
    let onReject: (ApprovalRequest) -> Void

    @State private var isExpanded = false

    var body: some View {
        let theme = appState.resolvedTheme

        if !approvals.isEmpty {
            VStack(spacing: 0) {
                // Compact banner
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.shield.fill")
                            .foregroundStyle(theme.chart3)

                        Text("\(approvals.count) pending approval\(approvals.count == 1 ? "" : "s")")
                            .font(MakimaTypography.title(size: 15, relativeTo: .subheadline))

                        Spacer()

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption)
                            .foregroundStyle(theme.mutedForeground)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(theme.chart3.opacity(0.14))
                }
                .buttonStyle(.plain)

                // Expanded approval cards
                if isExpanded {
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(approvals, id: \.id) { approval in
                                ApprovalCardView(
                                    approval: approval,
                                    onApprove: { onApprove(approval) },
                                    onReject: { onReject(approval) }
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                    }
                    .frame(maxHeight: 300)
                }
            }
        }
    }
}
