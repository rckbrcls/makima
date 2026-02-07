//
//  NotificationService.swift
//  makima-mobile
//

import Foundation
import UserNotifications
import UIKit
import Supabase

@Observable
final class NotificationService: NSObject {
    static let shared = NotificationService()

    private(set) var deviceToken: String?
    private(set) var isRegistered = false
    private(set) var permissionGranted = false

    var onApprovalNotificationTapped: ((String, String) -> Void)? // (sessionId, approvalId)

    private override init() {
        super.init()
    }

    func requestPermission() async {
        let center = UNUserNotificationCenter.current()
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            await MainActor.run {
                permissionGranted = granted
            }
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        } catch {
            print("Failed to request notification permission: \(error)")
        }
    }

    func handleDeviceToken(_ tokenData: Data) {
        let token = tokenData.map { String(format: "%02x", $0) }.joined()
        deviceToken = token
        isRegistered = true

        // Register token with Supabase
        Task {
            await registerDeviceWithSupabase(token: token)
        }
    }

    func handleRegistrationError(_ error: Error) {
        print("Failed to register for remote notifications: \(error)")
        isRegistered = false
    }

    private func registerDeviceWithSupabase(token: String) async {
        guard let client = SupabaseService.shared.client,
              SupabaseService.shared.isAuthenticated else {
            return
        }

        do {
            let device = DeviceRegistration(
                user_id: SupabaseService.shared.userId ?? "",
                apns_token: token,
                device_name: UIDevice.current.name,
                platform: "ios"
            )
            try await client.from("relay_devices")
                .upsert(device, onConflict: "user_id, apns_token")
                .execute()
        } catch {
            print("Failed to register device token: \(error)")
        }
    }
}

private struct DeviceRegistration: Encodable {
    let user_id: String
    let apns_token: String
    let device_name: String
    let platform: String
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationService: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        return [.banner, .sound, .badge]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo

        guard let type = userInfo["type"] as? String,
              type == "approval_request",
              let sessionId = userInfo["sessionId"] as? String,
              let approvalId = userInfo["approvalId"] as? String else {
            return
        }

        await MainActor.run {
            onApprovalNotificationTapped?(sessionId, approvalId)
        }
    }
}
