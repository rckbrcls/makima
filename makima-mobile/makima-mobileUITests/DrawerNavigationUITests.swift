import XCTest

final class DrawerNavigationUITests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testAppOpensOnMainChatWithToolbarButtons() throws {
        let app = XCUIApplication()
        app.launch()

        let conversationsButton = app.buttons["chat.open.conversations.button"]
        let codesButton = app.buttons["chat.open.codes.button"]
        XCTAssertTrue(conversationsButton.waitForExistence(timeout: 5))
        XCTAssertTrue(codesButton.waitForExistence(timeout: 5))
        XCTAssertEqual(app.tabBars.count, 0)
    }

    @MainActor
    func testSelectingConversationReturnsToChatPage() throws {
        let app = XCUIApplication()
        app.launch()

        let conversationsButton = app.buttons["chat.open.conversations.button"]
        XCTAssertTrue(conversationsButton.waitForExistence(timeout: 5))
        conversationsButton.tap()

        let conversationsNavBar = app.navigationBars["Conversations"]
        XCTAssertTrue(conversationsNavBar.waitForExistence(timeout: 2))

        let newConversationButton = app.buttons["conversations.new.button"]
        XCTAssertTrue(newConversationButton.waitForExistence(timeout: 2))
        newConversationButton.tap()

        XCTAssertTrue(conversationsButton.waitForExistence(timeout: 2))
        XCTAssertFalse(conversationsNavBar.exists)
    }

    @MainActor
    func testSettingsButtonOpensSettingsSheet() throws {
        let app = XCUIApplication()
        app.launch()

        let conversationsButton = app.buttons["chat.open.conversations.button"]
        XCTAssertTrue(conversationsButton.waitForExistence(timeout: 5))
        conversationsButton.tap()

        let settingsButton = app.buttons["conversations.settings.button"]
        XCTAssertTrue(settingsButton.waitForExistence(timeout: 2))
        settingsButton.tap()

        let settingsTitle = app.navigationBars["Settings"].firstMatch
        XCTAssertTrue(settingsTitle.waitForExistence(timeout: 2))
    }

    @MainActor
    func testSignInButtonIsInConversationsBottom() throws {
        let app = XCUIApplication()
        app.launch()

        let conversationsButton = app.buttons["chat.open.conversations.button"]
        XCTAssertTrue(conversationsButton.waitForExistence(timeout: 5))
        conversationsButton.tap()

        let signInButton = app.buttons["conversations.signin.button"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 2))
    }

    @MainActor
    func testCodesNavigationFromToolbar() throws {
        let app = XCUIApplication()
        app.launch()

        let codesButton = app.buttons["chat.open.codes.button"]
        XCTAssertTrue(codesButton.waitForExistence(timeout: 5))
        codesButton.tap()

        let codesNavBar = app.navigationBars["Codes"]
        XCTAssertTrue(codesNavBar.waitForExistence(timeout: 2))

        let emptyState = app.otherElements["codes.empty.state"]
        XCTAssertTrue(emptyState.firstMatch.waitForExistence(timeout: 2))
        XCTAssertEqual(app.tabBars.count, 0)
    }

    @MainActor
    func testSwipeRightFromChatOpensConversations() throws {
        let app = XCUIApplication()
        app.launch()

        let conversationsButton = app.buttons["chat.open.conversations.button"]
        XCTAssertTrue(conversationsButton.waitForExistence(timeout: 5))

        let emptyState = app.otherElements["chat.empty.state"]
        if emptyState.firstMatch.waitForExistence(timeout: 1) {
            emptyState.firstMatch.swipeRight()
        } else {
            app.swipeRight()
        }

        let conversationsNavBar = app.navigationBars["Conversations"]
        XCTAssertTrue(conversationsNavBar.waitForExistence(timeout: 2))
    }

    @MainActor
    func testSwipeLeftFromChatOpensCodes() throws {
        let app = XCUIApplication()
        app.launch()

        let codesButton = app.buttons["chat.open.codes.button"]
        XCTAssertTrue(codesButton.waitForExistence(timeout: 5))

        let emptyState = app.otherElements["chat.empty.state"]
        if emptyState.firstMatch.waitForExistence(timeout: 1) {
            emptyState.firstMatch.swipeLeft()
        } else {
            app.swipeLeft()
        }

        let codesNavBar = app.navigationBars["Codes"]
        XCTAssertTrue(codesNavBar.waitForExistence(timeout: 2))
    }

    @MainActor
    func testVerticalSwipeInChatDoesNotChangeTab() throws {
        let app = XCUIApplication()
        app.launch()

        let conversationsButton = app.buttons["chat.open.conversations.button"]
        let codesButton = app.buttons["chat.open.codes.button"]
        XCTAssertTrue(conversationsButton.waitForExistence(timeout: 5))
        XCTAssertTrue(codesButton.waitForExistence(timeout: 5))

        let emptyState = app.otherElements["chat.empty.state"]
        let swipeTarget = emptyState.firstMatch.waitForExistence(timeout: 1) ? emptyState.firstMatch : app

        swipeTarget.swipeUp()
        swipeTarget.swipeDown()

        XCTAssertTrue(conversationsButton.exists)
        XCTAssertTrue(codesButton.exists)
        XCTAssertFalse(app.navigationBars["Conversations"].exists)
        XCTAssertFalse(app.navigationBars["Codes"].exists)
    }

    @MainActor
    func testThemeSelectionPersistsAcrossRelaunch() throws {
        let firstLaunch = XCUIApplication()
        firstLaunch.launch()

        let conversationsButton = firstLaunch.buttons["chat.open.conversations.button"]
        XCTAssertTrue(conversationsButton.waitForExistence(timeout: 5))
        conversationsButton.tap()

        let settingsButton = firstLaunch.buttons["conversations.settings.button"]
        XCTAssertTrue(settingsButton.waitForExistence(timeout: 2))
        settingsButton.tap()

        let themePicker = firstLaunch.segmentedControls["settings.theme.picker"]
        XCTAssertTrue(themePicker.waitForExistence(timeout: 2))

        let lightButton = themePicker.buttons["Light"]
        let darkButton = themePicker.buttons["Dark"]
        XCTAssertTrue(lightButton.exists)
        XCTAssertTrue(darkButton.exists)

        if darkButton.isSelected {
            lightButton.tap()
        }
        darkButton.tap()

        let doneButton = firstLaunch.buttons["Done"]
        if doneButton.exists {
            doneButton.tap()
        }

        firstLaunch.terminate()

        let secondLaunch = XCUIApplication()
        secondLaunch.launch()

        let secondConversationsButton = secondLaunch.buttons["chat.open.conversations.button"]
        XCTAssertTrue(secondConversationsButton.waitForExistence(timeout: 5))
        secondConversationsButton.tap()

        let secondSettingsButton = secondLaunch.buttons["conversations.settings.button"]
        XCTAssertTrue(secondSettingsButton.waitForExistence(timeout: 2))
        secondSettingsButton.tap()

        let secondThemePicker = secondLaunch.segmentedControls["settings.theme.picker"]
        XCTAssertTrue(secondThemePicker.waitForExistence(timeout: 2))
        XCTAssertTrue(secondThemePicker.buttons["Dark"].isSelected)
    }
}
