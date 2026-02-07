//
//  RelaySession.swift
//  makima-mobile
//

import Foundation
import SwiftData

@Model
final class RelaySession {
    @Attribute(.unique) var id: String
    var desktopName: String?
    var activeAgentId: String?
    var activeAgentName: String?
    var status: String // waiting_pair, paired, active, disconnected
    var pairedAt: Date?

    init(
        id: String,
        desktopName: String? = nil,
        activeAgentId: String? = nil,
        activeAgentName: String? = nil,
        status: String = "paired",
        pairedAt: Date? = Date()
    ) {
        self.id = id
        self.desktopName = desktopName
        self.activeAgentId = activeAgentId
        self.activeAgentName = activeAgentName
        self.status = status
        self.pairedAt = pairedAt
    }
}
