//
//  ChatMessage.swift
//  makima-mobile
//

import Foundation
import SwiftData

@Model
final class ChatMessage {
    @Attribute(.unique) var id: String
    var sessionId: String
    var role: String // user, assistant, tool, system
    var content: String
    var timestamp: Date
    var toolName: String?
    var isStreaming: Bool
    var conversation: Conversation?

    init(
        id: String = UUID().uuidString,
        sessionId: String,
        role: String,
        content: String,
        timestamp: Date = Date(),
        toolName: String? = nil,
        isStreaming: Bool = false
    ) {
        self.id = id
        self.sessionId = sessionId
        self.role = role
        self.content = content
        self.timestamp = timestamp
        self.toolName = toolName
        self.isStreaming = isStreaming
    }
}
