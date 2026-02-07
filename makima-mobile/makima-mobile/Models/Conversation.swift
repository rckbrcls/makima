//
//  Conversation.swift
//  makima-mobile
//

import Foundation
import SwiftData

@Model
final class Conversation {
    @Attribute(.unique) var id: String
    var title: String
    var sessionId: String?
    var createdAt: Date
    var updatedAt: Date
    var status: String // "idle", "running", "streaming", "error"

    @Relationship(deleteRule: .cascade, inverse: \ChatMessage.conversation)
    var messages: [ChatMessage]?

    init(
        id: String = UUID().uuidString,
        title: String = "New Conversation",
        sessionId: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        status: String = "idle"
    ) {
        self.id = id
        self.title = title
        self.sessionId = sessionId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.status = status
    }
}
