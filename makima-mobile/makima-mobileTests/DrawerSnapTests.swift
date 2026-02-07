import CoreGraphics
import Testing
@testable import makima_mobile

struct DrawerSnapTests {

    @Test
    func opensWhenPredictedDragPassesHalf() {
        let shouldOpen = DrawerPhysics.resolveOpenState(
            isCurrentlyOpen: false,
            drawerWidth: 300,
            predictedTranslation: 190
        )

        #expect(shouldOpen)
    }

    @Test
    func closesWhenProjectedOffsetFallsBelowHalf() {
        let shouldOpen = DrawerPhysics.resolveOpenState(
            isCurrentlyOpen: true,
            drawerWidth: 300,
            predictedTranslation: -230
        )

        #expect(!shouldOpen)
    }

    @Test
    func clampsProjectedOffsetInsideBounds() {
        let shouldOpen = DrawerPhysics.resolveOpenState(
            isCurrentlyOpen: false,
            drawerWidth: 300,
            predictedTranslation: 600
        )

        #expect(shouldOpen)
    }
}
