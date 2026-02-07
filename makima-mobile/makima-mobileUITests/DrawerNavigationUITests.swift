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
}
