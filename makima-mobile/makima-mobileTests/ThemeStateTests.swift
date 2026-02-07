import SwiftUI
import Testing
@testable import makima_mobile

struct ThemeStateTests {
    private let themePreferenceKey = "app_theme_preference"

    @Test
    func persistsThemePreferenceAcrossAppStateInstances() {
        let fixture = makeDefaults()
        defer { reset(fixture.suiteName) }
        let defaults = fixture.defaults

        let firstState = AppState(defaults: defaults)
        firstState.themePreference = .dark

        #expect(defaults.string(forKey: themePreferenceKey) == "dark")

        let secondState = AppState(defaults: defaults)
        #expect(secondState.themePreference == .dark)
    }

    @Test
    func setsThemeFromSystemSchemeWhenPreferenceIsMissing() {
        let fixture = makeDefaults()
        defer { reset(fixture.suiteName) }
        let defaults = fixture.defaults

        let appState = AppState(defaults: defaults)
        defaults.removeObject(forKey: themePreferenceKey)

        appState.ensureThemePreferenceIfNeeded(systemScheme: .dark)

        #expect(appState.themePreference == .dark)
        #expect(defaults.string(forKey: themePreferenceKey) == "dark")
    }

    @Test
    func keepsSavedThemeWhenPreferenceAlreadyExists() {
        let fixture = makeDefaults()
        defer { reset(fixture.suiteName) }
        let defaults = fixture.defaults

        defaults.set("light", forKey: themePreferenceKey)
        let appState = AppState(defaults: defaults)

        appState.ensureThemePreferenceIfNeeded(systemScheme: .dark)

        #expect(appState.themePreference == .light)
    }

    @Test
    func mapsStatusAndRiskToExpectedSemanticTones() {
        let palette = MakimaThemePalette.palette(for: .light)

        #expect(palette.connectionStatusTone(.active) == .success)
        #expect(palette.connectionStatusTone(.paired) == .success)
        #expect(palette.connectionStatusTone(.pairing) == .warning)
        #expect(palette.connectionStatusTone(.error) == .destructive)
        #expect(palette.connectionStatusTone(.disconnected) == .muted)

        #expect(palette.sessionStatusTone("active") == .success)
        #expect(palette.sessionStatusTone("running") == .warning)
        #expect(palette.sessionStatusTone("streaming") == .warning)
        #expect(palette.sessionStatusTone("pairing") == .warning)
        #expect(palette.sessionStatusTone("high") == .destructive)
        #expect(palette.sessionStatusTone("error") == .destructive)
        #expect(palette.sessionStatusTone("unknown") == .muted)

        #expect(palette.riskTone("low") == .success)
        #expect(palette.riskTone("medium") == .warning)
        #expect(palette.riskTone("high") == .destructive)
    }

    private func makeDefaults() -> (suiteName: String, defaults: UserDefaults) {
        let suiteName = "ThemeStateTests.\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            fatalError("Could not create UserDefaults suite for tests")
        }
        defaults.removePersistentDomain(forName: suiteName)
        return (suiteName, defaults)
    }

    private func reset(_ suiteName: String) {
        UserDefaults.standard.removePersistentDomain(forName: suiteName)
    }
}
