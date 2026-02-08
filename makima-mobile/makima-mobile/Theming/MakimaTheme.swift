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

private enum MakimaThemeColorName: String {
    case background = "ThemeBackground"
    case foreground = "ThemeForeground"
    case card = "ThemeCard"
    case cardForeground = "ThemeCardForeground"
    case popover = "ThemePopover"
    case popoverForeground = "ThemePopoverForeground"
    case primary = "ThemePrimary"
    case primaryForeground = "ThemePrimaryForeground"
    case secondary = "ThemeSecondary"
    case secondaryForeground = "ThemeSecondaryForeground"
    case muted = "ThemeMuted"
    case mutedForeground = "ThemeMutedForeground"
    case accent = "ThemeAccent"
    case accentForeground = "ThemeAccentForeground"
    case destructive = "ThemeDestructive"
    case destructiveForeground = "ThemeDestructiveForeground"
    case border = "ThemeBorder"
    case input = "ThemeInput"
    case ring = "ThemeRing"
    case chart1 = "ThemeChart1"
    case chart2 = "ThemeChart2"
    case chart3 = "ThemeChart3"
    case chart4 = "ThemeChart4"
    case chart5 = "ThemeChart5"
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
        case .light, .dark:
            return .native
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
    static let native = MakimaThemePalette(
        background: .makima(.background),
        foreground: .makima(.foreground),
        card: .makima(.card),
        cardForeground: .makima(.cardForeground),
        popover: .makima(.popover),
        popoverForeground: .makima(.popoverForeground),
        primary: .makima(.primary),
        primaryForeground: .makima(.primaryForeground),
        secondary: .makima(.secondary),
        secondaryForeground: .makima(.secondaryForeground),
        muted: .makima(.muted),
        mutedForeground: .makima(.mutedForeground),
        accent: .makima(.accent),
        accentForeground: .makima(.accentForeground),
        destructive: .makima(.destructive),
        destructiveForeground: .makima(.destructiveForeground),
        border: .makima(.border),
        input: .makima(.input),
        ring: .makima(.ring),
        chart1: .makima(.chart1),
        chart2: .makima(.chart2),
        chart3: .makima(.chart3),
        chart4: .makima(.chart4),
        chart5: .makima(.chart5)
    )
}

private extension Color {
    static func makima(_ name: MakimaThemeColorName) -> Color {
        Color(name.rawValue)
    }
}
