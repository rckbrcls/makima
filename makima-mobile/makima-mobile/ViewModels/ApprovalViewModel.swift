//
//  ApprovalViewModel.swift
//  makima-mobile
//

import Foundation

@Observable
final class ApprovalViewModel {
    var pendingApprovals: [ApprovalRequest] = []

    private let relay: RelayService

    init(relay: RelayService) {
        self.relay = relay
        wireCallbacks()
    }

    func approve(_ approval: ApprovalRequest) async {
        do {
            try await relay.respondToApproval(
                approvalId: approval.id,
                approved: true
            )
            approval.status = "approved"
            approval.resolvedAt = Date()
            pendingApprovals.removeAll { $0.id == approval.id }
        } catch {
            print("Failed to approve: \(error)")
        }
    }

    func reject(_ approval: ApprovalRequest, reason: String? = nil) async {
        do {
            try await relay.respondToApproval(
                approvalId: approval.id,
                approved: false,
                reason: reason
            )
            approval.status = "rejected"
            approval.resolvedAt = Date()
            pendingApprovals.removeAll { $0.id == approval.id }
        } catch {
            print("Failed to reject: \(error)")
        }
    }

    // MARK: - Private

    private func wireCallbacks() {
        relay.onApprovalRequest = { [weak self] payload in
            guard let self else { return }

            let approvalId = payload["approvalId"] as? String ?? UUID().uuidString
            let toolName = payload["toolName"] as? String ?? "Unknown"
            let description = payload["description"] as? String ?? toolName
            let risk = payload["risk"] as? String ?? "medium"
            let arguments: String
            if let args = payload["arguments"] {
                if let data = try? JSONSerialization.data(withJSONObject: args),
                   let str = String(data: data, encoding: .utf8) {
                    arguments = str
                } else {
                    arguments = "{}"
                }
            } else {
                arguments = "{}"
            }

            let request = ApprovalRequest(
                id: approvalId,
                sessionId: relay.currentSessionId ?? "",
                toolName: toolName,
                toolDescription: description,
                toolArguments: arguments,
                risk: risk
            )
            pendingApprovals.append(request)

            HapticFeedback.approval()
        }
    }
}
