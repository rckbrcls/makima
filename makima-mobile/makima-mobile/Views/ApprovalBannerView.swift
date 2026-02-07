//
//  ApprovalBannerView.swift
//  makima-mobile
//
//  Compact banner at top of chat when approvals are pending.
//

import SwiftUI

struct ApprovalBannerView: View {
    let approvals: [ApprovalRequest]
    let onApprove: (ApprovalRequest) -> Void
    let onReject: (ApprovalRequest) -> Void

    @State private var isExpanded = false

    var body: some View {
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
                            .foregroundStyle(.orange)

                        Text("\(approvals.count) pending approval\(approvals.count == 1 ? "" : "s")")
                            .font(.subheadline.bold())

                        Spacer()

                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color(.systemOrange).opacity(0.12))
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
