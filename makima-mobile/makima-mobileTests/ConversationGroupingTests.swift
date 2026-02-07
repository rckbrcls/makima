import Foundation
import Testing
@testable import makima_mobile

struct ConversationGroupingTests {

    @Test
    func bucketsConversationsByExpectedTimeRanges() {
        let calendar = Calendar(identifier: .gregorian)
        let now = calendar.date(from: DateComponents(year: 2026, month: 2, day: 7, hour: 15))!

        let today = Conversation(title: "today", updatedAt: now)
        let yesterday = Conversation(
            title: "yesterday",
            updatedAt: calendar.date(byAdding: .day, value: -1, to: now)!
        )
        let lastWeek = Conversation(
            title: "last week",
            updatedAt: calendar.date(byAdding: .day, value: -5, to: now)!
        )
        let older = Conversation(
            title: "older",
            updatedAt: calendar.date(byAdding: .day, value: -12, to: now)!
        )

        let sections = ConversationGrouping.sectioned(
            conversations: [today, yesterday, lastWeek, older],
            now: now,
            calendar: calendar
        )

        #expect(sections.map(\.bucket) == [.today, .yesterday, .last7Days, .older])
        #expect(sections[0].conversations.count == 1)
        #expect(sections[1].conversations.count == 1)
        #expect(sections[2].conversations.count == 1)
        #expect(sections[3].conversations.count == 1)
    }

    @Test
    func skipsEmptySectionsAndPreservesOrder() {
        let calendar = Calendar(identifier: .gregorian)
        let now = calendar.date(from: DateComponents(year: 2026, month: 2, day: 7, hour: 15))!

        let first = Conversation(title: "first", updatedAt: now)
        let second = Conversation(
            title: "second",
            updatedAt: calendar.date(byAdding: .hour, value: -3, to: now)!
        )

        let sections = ConversationGrouping.sectioned(
            conversations: [first, second],
            now: now,
            calendar: calendar
        )

        #expect(sections.map(\.bucket) == [.today])
        #expect(sections.first?.conversations.map(\.title) == ["first", "second"])
    }
}
