//
//  SideDrawerView.swift
//  makima-mobile
//
//  Interactive side drawer with edge swipe and native iOS glass.
//

import SwiftUI

struct SideDrawerView<Sidebar: View, Content: View>: View {
    @Binding var isOpen: Bool
    let maxWidth: CGFloat
    @ViewBuilder let sidebar: () -> Sidebar
    @ViewBuilder let content: () -> Content

    @State private var dragTranslation: CGFloat = 0

    init(
        isOpen: Binding<Bool>,
        maxWidth: CGFloat = 340,
        @ViewBuilder sidebar: @escaping () -> Sidebar,
        @ViewBuilder content: @escaping () -> Content
    ) {
        _isOpen = isOpen
        self.maxWidth = maxWidth
        self.sidebar = sidebar
        self.content = content
    }

    var body: some View {
        GeometryReader { geo in
            let drawerWidth = min(maxWidth, geo.size.width * 0.86)
            let currentOffset = drawerOffset(drawerWidth: drawerWidth)
            let progress = drawerWidth > 0 ? currentOffset / drawerWidth : 0

            ZStack(alignment: .leading) {
                content()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .offset(x: progress * drawerWidth * 0.14)
                    .scaleEffect(1 - progress * 0.03, anchor: .leading)
                    .clipShape(RoundedRectangle(cornerRadius: 18 * progress, style: .continuous))
                    .zIndex(0)
                    .gesture(mainDragGesture(drawerWidth: drawerWidth), including: progress > 0.01 ? .all : .subviews)

                if progress > 0.001 {
                    Color.black
                        .opacity(0.24 * progress)
                        .ignoresSafeArea()
                        .contentShape(Rectangle())
                        .onTapGesture { closeDrawer() }
                        .accessibilityIdentifier("drawer.scrim")
                        .zIndex(1)
                }

                sidebar()
                    .frame(width: drawerWidth)
                    .frame(maxHeight: .infinity)
                    .background(.ultraThinMaterial)
                    .glassEffect(.regular.interactive())
                    .offset(x: currentOffset - drawerWidth)
                    .accessibilityIdentifier("drawer.panel")
                    .accessibilityHidden(progress < 0.01)
                    .zIndex(2)

                if progress < 0.01 {
                    edgeActivationZone(drawerWidth: drawerWidth)
                        .zIndex(3)
                }
            }
            .animation(.spring(response: 0.28, dampingFraction: 0.84), value: isOpen)
            .animation(.spring(response: 0.24, dampingFraction: 0.9), value: dragTranslation)
        }
    }

    private func edgeActivationZone(drawerWidth: CGFloat) -> some View {
        Color.clear
            .frame(width: 24)
            .contentShape(Rectangle())
            .gesture(edgeDragGesture(drawerWidth: drawerWidth))
            .accessibilityIdentifier("drawer.edge-zone")
    }

    private func edgeDragGesture(drawerWidth: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 4)
            .onChanged { value in
                guard value.translation.width > 0 else { return }
                dragTranslation = value.translation.width
            }
            .onEnded { value in
                completeDrag(drawerWidth: drawerWidth, value: value)
            }
    }

    private func mainDragGesture(drawerWidth: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 6)
            .onChanged { value in
                guard abs(value.translation.width) > abs(value.translation.height) else { return }
                dragTranslation = value.translation.width
            }
            .onEnded { value in
                completeDrag(drawerWidth: drawerWidth, value: value)
            }
    }

    private func completeDrag(drawerWidth: CGFloat, value: DragGesture.Value) {
        let previousState = isOpen
        let nextState = DrawerPhysics.resolveOpenState(
            isCurrentlyOpen: previousState,
            drawerWidth: drawerWidth,
            predictedTranslation: value.predictedEndTranslation.width
        )

        withAnimation(.spring(response: 0.28, dampingFraction: 0.84)) {
            isOpen = nextState
            dragTranslation = 0
        }

        if previousState != nextState {
            HapticFeedback.tap()
        }
    }

    private func closeDrawer() {
        withAnimation(.spring(response: 0.28, dampingFraction: 0.84)) {
            isOpen = false
            dragTranslation = 0
        }
        HapticFeedback.tap()
    }

    private func drawerOffset(drawerWidth: CGFloat) -> CGFloat {
        let base = isOpen ? drawerWidth : 0
        return max(0, min(drawerWidth, base + dragTranslation))
    }
}
