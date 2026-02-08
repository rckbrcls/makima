//
//  ComposerPayloadBuilder.swift
//  makima-mobile
//

import Foundation

enum ComposerPayloadBuilder {
    static func canSend(text: String, attachments: [ComposerAttachment]) -> Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !attachments.isEmpty
    }

    static func build(text: String, attachments: [ComposerAttachment]) -> String {
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !attachments.isEmpty else {
            return trimmedText
        }

        let attachmentLines = attachments.map { attachment in
            "- [\(attachment.kind.rawValue)] \(attachment.displayName)"
        }

        let attachmentBlock = """
        Attachments:
        \(attachmentLines.joined(separator: "\n"))
        """

        guard !trimmedText.isEmpty else {
            return attachmentBlock
        }

        return """
        \(attachmentBlock)

        \(trimmedText)
        """
    }
}
