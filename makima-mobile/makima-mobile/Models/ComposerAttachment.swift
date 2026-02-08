//
//  ComposerAttachment.swift
//  makima-mobile
//

import Foundation

struct ComposerAttachment: Identifiable, Equatable {
    enum Kind: String, Equatable {
        case image
        case file

        var systemImage: String {
            switch self {
            case .image:
                return "photo"
            case .file:
                return "doc"
            }
        }

        var fallbackName: String {
            switch self {
            case .image:
                return "Image"
            case .file:
                return "File"
            }
        }
    }

    let id: UUID
    let kind: Kind
    let displayName: String

    init(id: UUID = UUID(), kind: Kind, displayName: String) {
        self.id = id
        self.kind = kind

        let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        self.displayName = trimmed.isEmpty ? kind.fallbackName : trimmed
    }
}
