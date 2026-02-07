//
//  ApprovalRequest.swift
//  makima-mobile
//

import Foundation
import SwiftData

@Model
final class ApprovalRequest {
    @Attribute(.unique) var id: String // approvalId
    var sessionId: String
    var toolName: String
    var toolDescription: String
    var toolArguments: String // JSON string
    var risk: String // low, medium, high
    var status: String // pending, approved, rejected
    var createdAt: Date
    var resolvedAt: Date?

    init(
        id: String,
        sessionId: String,
        toolName: String,
        toolDescription: String,
        toolArguments: String = "{}",
        risk: String = "medium",
        status: String = "pending",
        createdAt: Date = Date(),
        resolvedAt: Date? = nil
    ) {
        self.id = id
        self.sessionId = sessionId
        self.toolName = toolName
        self.toolDescription = toolDescription
        self.toolArguments = toolArguments
        self.risk = risk
        self.status = status
        self.createdAt = createdAt
        self.resolvedAt = resolvedAt
    }
}
