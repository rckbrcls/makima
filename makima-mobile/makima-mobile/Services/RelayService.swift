//
//  RelayService.swift
//  makima-mobile
//

import Foundation
import Supabase
import Realtime

enum RelayConnectionStatus: String {
    case disconnected
    case pairing
    case paired
    case active
    case error
}

struct CodeSessionItem: Identifiable {
    let id: String
    let sessionId: String
    let agentName: String
    let desktopName: String?
    let status: String
    let connectedAt: Date?
    let createdAt: Date

    var sortDate: Date {
        connectedAt ?? createdAt
    }
}

// MARK: - Codable DTOs for Supabase operations

private struct RelayMessageInsert: Encodable {
    let session_id: String
    let direction: String
    let message_type: String
    let payload: RelayMessagePayload
}

private struct RelayMessagePayload: Codable {
    let content: String?
    let agentId: String?
    let sessionKey: String?
    let approvalId: String?
    let approved: Bool?
    let reason: String?

    init(
        content: String? = nil,
        agentId: String? = nil,
        sessionKey: String? = nil,
        approvalId: String? = nil,
        approved: Bool? = nil,
        reason: String? = nil
    ) {
        self.content = content
        self.agentId = agentId
        self.sessionKey = sessionKey
        self.approvalId = approvalId
        self.approved = approved
        self.reason = reason
    }
}

private struct RelayApproveBody: Encodable {
    let sessionId: String
    let approvalId: String
    let approved: Bool
    let reason: String?
}

private struct PairBody: Encodable {
    let pairingCode: String
}

private struct SessionStatusUpdate: Encodable {
    let status: String
}

private struct PairResponse: Decodable {
    let sessionId: String
    let desktopName: String?
    let activeAgentId: String?
    let activeAgentName: String?
    let activeSessionKey: String?
}

// MARK: - DB record for postgres_changes

private struct RelayMessageRecord: Decodable {
    let id: String?
    let session_id: String?
    let direction: String?
    let message_type: String?
    let payload: [String: AnyJSON]?
    let consumed: Bool?
    let created_at: String?
}

private struct RelaySessionCodeRecord: Decodable {
    let id: String
    let desktop_name: String?
    let active_agent_name: String?
    let status: String
    let mobile_connected_at: String?
    let created_at: String
}

private struct RelaySessionDetailRecord: Decodable {
    let id: String
    let desktop_name: String?
    let active_agent_id: String?
    let active_agent_name: String?
    let active_session_key: String?
    let status: String
}

// MARK: - RelayService

@Observable
final class RelayService {
    private(set) var connectionStatus: RelayConnectionStatus = .disconnected
    private(set) var currentSessionId: String?
    private(set) var desktopName: String?
    private(set) var activeAgentId: String?
    private(set) var activeAgentName: String?
    private(set) var activeSessionKey: String?
    private(set) var error: String?

    // Callbacks
    var onAgentChunk: ((String) -> Void)?
    var onAgentMessage: (([String: Any]) -> Void)?
    var onAgentToolCall: (([String: Any]) -> Void)?
    var onAgentDone: (() -> Void)?
    var onAgentError: ((String) -> Void)?
    var onApprovalRequest: (([String: Any]) -> Void)?

    private var channel: RealtimeChannelV2?
    private var dbListenTask: Task<Void, Never>?
    private var broadcastListenTask: Task<Void, Never>?

    func pair(withCode code: String) async throws {
        guard let client = SupabaseService.shared.client else {
            throw RelayServiceError.notConfigured
        }

        connectionStatus = .pairing
        error = nil

        do {
            let response: PairResponse = try await client.functions.invoke(
                "relay-pair",
                options: .init(body: PairBody(
                    pairingCode: code.uppercased().trimmingCharacters(in: .whitespaces)
                ))
            )

            currentSessionId = response.sessionId
            desktopName = response.desktopName
            activeAgentId = response.activeAgentId
            activeAgentName = response.activeAgentName
            activeSessionKey = response.activeSessionKey
            connectionStatus = .paired

            // Subscribe to Realtime
            await stopRealtimeSubscription()
            await subscribeToSession(sessionId: response.sessionId, client: client)

            connectionStatus = .active
        } catch {
            connectionStatus = .error
            self.error = error.localizedDescription
            throw error
        }
    }

    func attachToSession(sessionId: String) async throws {
        guard let client = SupabaseService.shared.client else {
            throw RelayServiceError.notConfigured
        }

        let sanitizedSessionId = sessionId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !sanitizedSessionId.isEmpty else {
            throw RelayServiceError.noActiveSession
        }

        do {
            let rows: [RelaySessionDetailRecord] = try await client
                .from("relay_sessions")
                .select("id, desktop_name, active_agent_id, active_agent_name, active_session_key, status")
                .eq("id", value: sanitizedSessionId)
                .limit(1)
                .execute()
                .value

            guard let row = rows.first else {
                throw RelayServiceError.sessionNotFound
            }

            if row.status == "disconnected" {
                throw RelayServiceError.sessionDisconnected
            }

            await stopRealtimeSubscription()

            currentSessionId = row.id
            desktopName = row.desktop_name
            activeAgentId = row.active_agent_id
            activeAgentName = row.active_agent_name
            activeSessionKey = row.active_session_key
            connectionStatus = Self.connectionStatus(forRelaySessionStatus: row.status)
            error = nil

            await subscribeToSession(sessionId: row.id, client: client)

            if row.status == "paired" || row.status == "active" {
                connectionStatus = .active
            }
        } catch {
            connectionStatus = .error
            self.error = error.localizedDescription
            throw error
        }
    }

    func sendMessage(content: String) async throws {
        guard let client = SupabaseService.shared.client,
              let sessionId = currentSessionId else {
            throw RelayServiceError.noActiveSession
        }

        try await client.from("relay_messages")
            .insert(RelayMessageInsert(
                session_id: sessionId,
                direction: "mobile_to_desktop",
                message_type: "user_message",
                payload: RelayMessagePayload(
                    content: content,
                    agentId: activeAgentId ?? "",
                    sessionKey: activeSessionKey ?? ""
                )
            ))
            .execute()
    }

    func respondToApproval(approvalId: String, approved: Bool, reason: String? = nil) async throws {
        guard let client = SupabaseService.shared.client,
              let sessionId = currentSessionId else {
            throw RelayServiceError.noActiveSession
        }

        try await client.functions.invoke(
            "relay-approve",
            options: .init(body: RelayApproveBody(
                sessionId: sessionId,
                approvalId: approvalId,
                approved: approved,
                reason: reason
            ))
        )
    }

    func disconnect() async {
        // Update session status if possible
        if let client = SupabaseService.shared.client,
           let sessionId = currentSessionId {
            _ = try? await client.from("relay_sessions")
                .update(SessionStatusUpdate(status: "disconnected"))
                .eq("id", value: sessionId)
                .execute()
        }

        await stopRealtimeSubscription()

        connectionStatus = .disconnected
        currentSessionId = nil
        desktopName = nil
        activeAgentId = nil
        activeAgentName = nil
        activeSessionKey = nil
        error = nil
    }

    func fetchRelaySessionsForCodes() async throws -> [CodeSessionItem] {
        guard let client = SupabaseService.shared.client else {
            throw RelayServiceError.notConfigured
        }

        let rows: [RelaySessionCodeRecord] = try await client
            .from("relay_sessions")
            .select("id, desktop_name, active_agent_name, status, mobile_connected_at, created_at")
            .execute()
            .value

        let items = rows.compactMap { row -> CodeSessionItem? in
            guard let agentName = row.active_agent_name?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !agentName.isEmpty else {
                return nil
            }

            return CodeSessionItem(
                id: row.id,
                sessionId: row.id,
                agentName: agentName,
                desktopName: row.desktop_name,
                status: row.status,
                connectedAt: Self.parseISODate(row.mobile_connected_at),
                createdAt: Self.parseISODate(row.created_at) ?? Date.distantPast
            )
        }

        return items.sorted { lhs, rhs in
            lhs.sortDate > rhs.sortDate
        }
    }

    // MARK: - Private

    private static let iso8601WithFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let iso8601: ISO8601DateFormatter = {
        ISO8601DateFormatter()
    }()

    private static func parseISODate(_ value: String?) -> Date? {
        guard let value else { return nil }
        if let date = iso8601WithFractionalSeconds.date(from: value) {
            return date
        }
        return iso8601.date(from: value)
    }

    private static func connectionStatus(forRelaySessionStatus status: String) -> RelayConnectionStatus {
        switch status {
        case "waiting_pair":
            return .pairing
        case "paired":
            return .paired
        case "active":
            return .active
        case "disconnected":
            return .disconnected
        default:
            return .error
        }
    }

    private func stopRealtimeSubscription() async {
        dbListenTask?.cancel()
        dbListenTask = nil
        broadcastListenTask?.cancel()
        broadcastListenTask = nil

        if let channel, let client = SupabaseService.shared.client {
            await client.realtimeV2.removeChannel(channel)
        }
        channel = nil
    }

    private func subscribeToSession(sessionId: String, client: SupabaseClient) async {
        let ch = client.realtimeV2.channel("relay:\(sessionId)")

        // Listen for DB changes (durable messages)
        let dbChanges = ch.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "relay_messages",
            filter: .eq("session_id", value: sessionId)
        )

        // Listen for broadcast (streaming chunks)
        let broadcasts = ch.broadcastStream(event: "agent_chunk")

        await ch.subscribeSafe()
        channel = ch

        // Process DB changes
        dbListenTask = Task { [weak self] in
            for await change in dbChanges {
                guard let self else { return }
                let record = change.record

                guard let direction = record["direction"]?.stringValue,
                      direction == "desktop_to_mobile",
                      let messageType = record["message_type"]?.stringValue else {
                    continue
                }

                let payload = record["payload"]?.objectValue ?? [:]
                let payloadDict = payload.reduce(into: [String: Any]()) { result, pair in
                    result[pair.key] = pair.value.anyValue
                }

                await MainActor.run {
                    switch messageType {
                    case "agent_message":
                        self.onAgentMessage?(payloadDict)
                    case "agent_tool_call":
                        self.onAgentToolCall?(payloadDict)
                    case "agent_done":
                        self.onAgentDone?()
                    case "agent_error":
                        let errorMsg = payloadDict["error"] as? String
                            ?? payloadDict["message"] as? String
                            ?? "Unknown error"
                        self.onAgentError?(errorMsg)
                    case "approval_request":
                        self.onApprovalRequest?(payloadDict)
                    case "session_update":
                        if let agentId = payloadDict["activeAgentId"] as? String {
                            self.activeAgentId = agentId
                        }
                        if let agentName = payloadDict["activeAgentName"] as? String {
                            self.activeAgentName = agentName
                        }
                        if let sessionKey = payloadDict["activeSessionKey"] as? String {
                            self.activeSessionKey = sessionKey
                        }
                    default:
                        break
                    }
                }
            }
        }

        // Process broadcast chunks
        broadcastListenTask = Task { [weak self] in
            for await message in broadcasts {
                guard let self else { return }
                if let content = message["content"]?.stringValue {
                    await MainActor.run {
                        self.onAgentChunk?(content)
                    }
                }
            }
        }
    }
}

// MARK: - Errors

enum RelayServiceError: LocalizedError {
    case notConfigured
    case noActiveSession
    case sessionNotFound
    case sessionDisconnected

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Supabase is not configured"
        case .noActiveSession:
            return "No active relay session"
        case .sessionNotFound:
            return "Relay session not found"
        case .sessionDisconnected:
            return "This desktop session is disconnected"
        }
    }
}

// MARK: - AnyJSON Helpers

private extension AnyJSON {
    var stringValue: String? {
        switch self {
        case .string(let s): return s
        default: return nil
        }
    }

    var objectValue: [String: AnyJSON]? {
        switch self {
        case .object(let dict): return dict
        default: return nil
        }
    }

    var anyValue: Any {
        switch self {
        case .string(let s): return s
        case .integer(let i): return i
        case .double(let d): return d
        case .bool(let b): return b
        case .null: return NSNull()
        case .object(let dict):
            return dict.reduce(into: [String: Any]()) { result, pair in
                result[pair.key] = pair.value.anyValue
            }
        case .array(let arr):
            return arr.map { $0.anyValue }
        }
    }
}

// MARK: - Safe subscribe helper

private extension RealtimeChannelV2 {
    /// Subscribe without the deprecation warning — wraps subscribeWithError if available,
    /// falls back to subscribe() otherwise.
    func subscribeSafe() async {
        do {
            try await subscribeWithError()
        } catch {
            print("Realtime subscribe error: \(error)")
        }
    }
}
