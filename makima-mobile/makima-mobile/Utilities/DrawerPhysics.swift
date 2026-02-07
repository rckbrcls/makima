import CoreGraphics

enum DrawerPhysics {
    static func resolveOpenState(
        isCurrentlyOpen: Bool,
        drawerWidth: CGFloat,
        predictedTranslation: CGFloat
    ) -> Bool {
        let base = isCurrentlyOpen ? drawerWidth : 0
        let projected = base + predictedTranslation
        let snapped = max(0, min(drawerWidth, projected))
        return snapped > drawerWidth * 0.5
    }
}
