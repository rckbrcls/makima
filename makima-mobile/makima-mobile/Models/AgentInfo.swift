//
//  AgentInfo.swift
//  makima-mobile
//

import Foundation

struct AgentInfo: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let model: String?
    let tools: [String]
}
