//
//  ApprovalListView.swift
//  makima-mobile
//

import SwiftUI

struct ApprovalListView: View {
    @Environment(AppState.self) private var appState
    @State private var approvalVM: ApprovalViewModel?

    var body: some View {
        NavigationStack {
            Group {
                if let approvalVM, !approvalVM.pendingApprovals.isEmpty {
                    List {
                        ForEach(approvalVM.pendingApprovals, id: \.id) { approval in
                            ApprovalCardView(
                                approval: approval,
                                onApprove: {
                                    Task { await approvalVM.approve(approval) }
                                },
                                onReject: {
                                    Task { await approvalVM.reject(approval) }
                                }
                            )
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                        }
                    }
                    .listStyle(.plain)
                } else {
                    ContentUnavailableView(
                        "No Pending Approvals",
                        systemImage: "checkmark.shield",
                        description: Text("Tool call approvals from agents will appear here.")
                    )
                }
            }
            .navigationTitle("Approvals")
        }
        .onAppear {
            if approvalVM == nil {
                approvalVM = ApprovalViewModel(relay: appState.relay)
            }
        }
    }
}
