import Foundation

enum ConversationTimeBucket: String, CaseIterable, Identifiable {
    case today
    case yesterday
    case last7Days
    case older

    var id: String { rawValue }

    var title: String {
        switch self {
        case .today: return "Today"
        case .yesterday: return "Yesterday"
        case .last7Days: return "Last 7 Days"
        case .older: return "Older"
        }
    }
}

struct ConversationSection: Identifiable {
    let bucket: ConversationTimeBucket
    var conversations: [Conversation]

    var id: String { bucket.id }
    var title: String { bucket.title }
}

enum ConversationGrouping {
    static func bucket(
        for date: Date,
        now: Date = Date(),
        calendar: Calendar = .current
    ) -> ConversationTimeBucket {
        let startOfToday = calendar.startOfDay(for: now)
        let startOfYesterday = calendar.date(byAdding: .day, value: -1, to: startOfToday) ?? startOfToday
        let startOfLast7Days = calendar.date(byAdding: .day, value: -7, to: startOfToday) ?? startOfYesterday

        if date >= startOfToday {
            return .today
        }

        if date >= startOfYesterday {
            return .yesterday
        }

        if date >= startOfLast7Days {
            return .last7Days
        }

        return .older
    }

    static func sectioned(
        conversations: [Conversation],
        now: Date = Date(),
        calendar: Calendar = .current
    ) -> [ConversationSection] {
        var grouped: [ConversationTimeBucket: [Conversation]] = [:]

        for conversation in conversations {
            let key = bucket(for: conversation.updatedAt, now: now, calendar: calendar)
            grouped[key, default: []].append(conversation)
        }

        return ConversationTimeBucket.allCases.compactMap { bucket in
            guard let values = grouped[bucket], !values.isEmpty else {
                return nil
            }
            return ConversationSection(bucket: bucket, conversations: values)
        }
    }
}
