import XCTest

final class DrawerNavigationUITests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testDrawerOpensFromTopButton() throws {
        let app = XCUIApplication()
        app.launch()

        let toggleButton = app.buttons["drawer.toggle.button"]
        XCTAssertTrue(toggleButton.waitForExistence(timeout: 5))

        toggleButton.tap()

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 2))
        XCTAssertTrue(searchField.isHittable)
    }

    @MainActor
    func testDrawerOpensFromEdgeSwipe() throws {
        let app = XCUIApplication()
        app.launch()

        let window = app.windows.element(boundBy: 0)
        XCTAssertTrue(window.waitForExistence(timeout: 5))

        let start = window.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.55))
        let end = window.coordinate(withNormalizedOffset: CGVector(dx: 0.62, dy: 0.55))
        start.press(forDuration: 0.03, thenDragTo: end)

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 2))
        XCTAssertTrue(searchField.isHittable)
    }

    @MainActor
    func testCreateConversationFromDrawer() throws {
        let app = XCUIApplication()
        app.launch()

        let toggleButton = app.buttons["drawer.toggle.button"]
        XCTAssertTrue(toggleButton.waitForExistence(timeout: 5))
        toggleButton.tap()

        let newConversationButton = app.buttons["drawer.new-conversation.button"]
        XCTAssertTrue(newConversationButton.waitForExistence(timeout: 2))
        newConversationButton.tap()

        toggleButton.tap()

        let searchField = app.searchFields.firstMatch
        XCTAssertTrue(searchField.waitForExistence(timeout: 2))

        searchField.tap()
        searchField.typeText("New")
    }
}
