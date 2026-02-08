import SwiftUI
import UIKit

enum MakimaTypography {
    private static let titleCandidates = [
        "Baskerville-Bold",
        "Baskerville-SemiBold",
        "Baskerville"
    ]

    private static let bodyCandidates = [
        "Baskerville",
        "Baskerville-Regular"
    ]

    static func title(
        size: CGFloat,
        relativeTo textStyle: Font.TextStyle = .headline
    ) -> Font {
        if let fontName = resolvedFontName(candidates: titleCandidates, size: size) {
            return .custom(fontName, size: size, relativeTo: textStyle)
        }

        return .system(size: size, weight: .semibold, design: .serif)
    }

    static func bodyTitle(
        size: CGFloat,
        relativeTo textStyle: Font.TextStyle = .body
    ) -> Font {
        if let fontName = resolvedFontName(candidates: bodyCandidates, size: size) {
            return .custom(fontName, size: size, relativeTo: textStyle)
        }

        return .system(size: size, weight: .regular, design: .serif)
    }

    static func navigationTitleFont(size: CGFloat = 17) -> UIFont {
        resolvedUIFont(
            candidates: titleCandidates,
            size: size,
            fallback: .systemFont(ofSize: size, weight: .semibold)
        )
    }

    static func navigationLargeTitleFont(size: CGFloat = 34) -> UIFont {
        resolvedUIFont(
            candidates: titleCandidates,
            size: size,
            fallback: .systemFont(ofSize: size, weight: .bold)
        )
    }

    private static func resolvedFontName(candidates: [String], size: CGFloat) -> String? {
        for candidate in candidates where UIFont(name: candidate, size: size) != nil {
            return candidate
        }
        return nil
    }

    private static func resolvedUIFont(candidates: [String], size: CGFloat, fallback: UIFont) -> UIFont {
        for candidate in candidates {
            if let font = UIFont(name: candidate, size: size) {
                return font
            }
        }
        return fallback
    }
}
