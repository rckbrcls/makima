import SwiftUI

enum AppThemePreference: String, CaseIterable, Identifiable {
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    var colorScheme: ColorScheme {
        switch self {
        case .light: return .light
        case .dark: return .dark
        }
    }

    static func from(systemScheme: ColorScheme) -> AppThemePreference {
        switch systemScheme {
        case .dark: return .dark
        default: return .light
        }
    }
}

enum MakimaThemeSemanticTone: Equatable {
    case success
    case warning
    case destructive
    case muted
}

struct MakimaThemePalette {
    let background: Color
    let foreground: Color
    let card: Color
    let cardForeground: Color
    let popover: Color
    let popoverForeground: Color
    let primary: Color
    let primaryForeground: Color
    let secondary: Color
    let secondaryForeground: Color
    let muted: Color
    let mutedForeground: Color
    let accent: Color
    let accentForeground: Color
    let destructive: Color
    let destructiveForeground: Color
    let border: Color
    let input: Color
    let ring: Color
    let chart1: Color
    let chart2: Color
    let chart3: Color
    let chart4: Color
    let chart5: Color

    static func palette(for preference: AppThemePreference) -> MakimaThemePalette {
        switch preference {
        case .light: return .light
        case .dark: return .dark
        }
    }

    func connectionStatusTone(_ status: RelayConnectionStatus) -> MakimaThemeSemanticTone {
        switch status {
        case .active, .paired:
            return .success
        case .pairing:
            return .warning
        case .error:
            return .destructive
        case .disconnected:
            return .muted
        }
    }

    func sessionStatusTone(_ status: String) -> MakimaThemeSemanticTone {
        switch status.lowercased() {
        case "active":
            return .success
        case "paired", "pairing", "running", "streaming", "medium":
            return .warning
        case "error", "high":
            return .destructive
        default:
            return .muted
        }
    }

    func riskTone(_ risk: String) -> MakimaThemeSemanticTone {
        switch risk.lowercased() {
        case "high":
            return .destructive
        case "medium":
            return .warning
        default:
            return .success
        }
    }

    func connectionStatusColor(_ status: RelayConnectionStatus) -> Color {
        color(for: connectionStatusTone(status))
    }

    func sessionStatusColor(_ status: String) -> Color {
        color(for: sessionStatusTone(status))
    }

    func riskColor(_ risk: String) -> Color {
        color(for: riskTone(risk))
    }

    private func color(for tone: MakimaThemeSemanticTone) -> Color {
        switch tone {
        case .success: return chart2
        case .warning: return chart3
        case .destructive: return destructive
        case .muted: return mutedForeground
        }
    }
}

private extension MakimaThemePalette {
    static let light = MakimaThemePalette(
        background: Color(hex: "#F5F5F5"),
        foreground: Color(hex: "#0A0A0A"),
        card: Color(hex: "#FFFFFF"),
        cardForeground: Color(hex: "#0A0A0A"),
        popover: Color(hex: "#FFFFFF"),
        popoverForeground: Color(hex: "#0A0A0A"),
        primary: Color(hex: "#1A1A1A"),
        primaryForeground: Color(hex: "#E2E2E2"),
        secondary: Color(hex: "#F5F5F5"),
        secondaryForeground: Color(hex: "#171717"),
        muted: Color(hex: "#F5F5F5"),
        mutedForeground: Color(hex: "#737373"),
        accent: Color(hex: "#F5F5F5"),
        accentForeground: Color(hex: "#171717"),
        destructive: Color(hex: "#E7000B"),
        destructiveForeground: Color(hex: "#E7000B"),
        border: Color(hex: "#E5E5E5"),
        input: Color(hex: "#E5E5E5"),
        ring: Color(hex: "#75CAF2"),
        chart1: Color(hex: "#75CAF2"),
        chart2: Color(hex: "#ABDEA0"),
        chart3: Color(hex: "#EDE091"),
        chart4: Color(hex: "#FFB2CB"),
        chart5: Color(hex: "#C7AFF5")
    )

    static let dark = MakimaThemePalette(
        background: Color(hex: "#0C0C0C"),
        foreground: Color(hex: "#FAFAFA"),
        card: Color(hex: "#121212"),
        cardForeground: Color(hex: "#FAFAFA"),
        popover: Color(hex: "#121212"),
        popoverForeground: Color(hex: "#FAFAFA"),
        primary: Color(hex: "#FFFFFF"),
        primaryForeground: Color(hex: "#0A0A0A"),
        secondary: Color(hex: "#262626"),
        secondaryForeground: Color(hex: "#FAFAFA"),
        muted: Color(hex: "#262626"),
        mutedForeground: Color(hex: "#A1A1A1"),
        accent: Color(hex: "#404040"),
        accentForeground: Color(hex: "#FAFAFA"),
        destructive: Color(hex: "#82181A"),
        destructiveForeground: Color(hex: "#FB2C36"),
        border: Color(hex: "#262626"),
        input: Color(hex: "#262626"),
        ring: Color(hex: "#75CAF2"),
        chart1: Color(hex: "#75CAF2"),
        chart2: Color(hex: "#ABDEA0"),
        chart3: Color(hex: "#EDE091"),
        chart4: Color(hex: "#FFB2CB"),
        chart5: Color(hex: "#C7AFF5")
    )
}

private extension Color {
    init(hex: String, opacity: Double = 1) {
        let cleaned = hex
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")
        let validHex = cleaned.count == 6 ? cleaned : "000000"
        let value = UInt64(validHex, radix: 16) ?? 0

        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255

        self.init(.sRGB, red: red, green: green, blue: blue, opacity: opacity)
    }
}
