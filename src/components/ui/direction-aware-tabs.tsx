import { useState, useRef } from "react";
import { motion } from "motion/react";
import useMeasure from "react-use-measure";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tab = {
  id: number;
  label: string;
  content: ReactNode;
};

interface OgImageSectionProps {
  tabs: Array<Tab>;
  className?: string;
  rounded?: string;
  onChange?: () => void;
}

function DirectionAwareTabs({
  tabs,
  className,
  rounded,
  onChange,
}: OgImageSectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const dragOffsetRef = useRef(0);
  const activeIndexRef = useRef(0);
  const snapTimeout = useRef<NodeJS.Timeout | null>(null);
  const wheelEndTimeout = useRef<NodeJS.Timeout | null>(null);
  const wheelGestureActive = useRef(false);
  const wheelMovedTab = useRef(false);
  const [contentRef, contentBounds] = useMeasure();
  const [tabBarRef, tabBarBounds] = useMeasure();

  // Sync ref with state for event handlers
  const updateDragOffset = (val: number) => {
    dragOffsetRef.current = val;
    setDragOffset(val);
  };

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const resolvedActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  activeIndexRef.current = resolvedActiveIndex;

  const contentWidth = contentBounds.width || 1000;
  const progress = contentWidth ? -dragOffset / contentWidth : 0;
  const indicatorIndex = Math.max(
    0,
    Math.min(tabs.length - 1, resolvedActiveIndex + progress),
  );

  const tabCount = Math.max(1, tabs.length);
  const tabBarWidth = tabBarBounds.width || 0;
  const tabBarHeight = tabBarBounds.height || 0;
  const tabBarGap = 4;
  const tabBarPaddingX = 3;
  const tabBarPaddingY = 3.2;
  const trackWidth = Math.max(
    0,
    tabBarWidth - tabBarPaddingX * 2 - tabBarGap * (tabCount - 1),
  );
  const tabWidth = trackWidth / tabCount;
  const indicatorX = tabBarPaddingX + indicatorIndex * (tabWidth + tabBarGap);
  const indicatorHeight = Math.max(0, tabBarHeight - tabBarPaddingY * 2);
  const isDragging = Math.abs(dragOffset) > 0.5;
  const edgeElasticity = 0.18;
  const snapSpring = { type: "spring", stiffness: 520, damping: 38, mass: 0.9 };

  const handleTabClick = (newTabId: number) => {
    setActiveTab(newTabId);
    updateDragOffset(0);
    onChange ? onChange() : null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const rawDeltaX = e.deltaX;
    const rawDeltaY = e.deltaY;
    const shiftScroll = e.shiftKey && Math.abs(rawDeltaY) > 0;

    let delta = 0;
    if (shiftScroll) {
      delta = rawDeltaY;
    } else if (Math.abs(rawDeltaX) > Math.abs(rawDeltaY)) {
      delta = rawDeltaX;
    } else {
      return;
    }

    if (e.deltaMode === 1) delta *= 16;
    if (e.deltaMode === 2) delta *= contentWidth;

    // Ignore small movements
    if (Math.abs(delta) < 2) return;
    e.preventDefault();

    if (!wheelGestureActive.current) {
      wheelGestureActive.current = true;
      wheelMovedTab.current = false;
    }
    if (wheelMovedTab.current) {
      if (wheelEndTimeout.current) clearTimeout(wheelEndTimeout.current);
      wheelEndTimeout.current = setTimeout(() => {
        wheelGestureActive.current = false;
        wheelMovedTab.current = false;
      }, 200);
      return;
    }

    // Safety width check
    const width = contentWidth || 1000;

    // Apply friction to delta for better control
    const dampening = 0.55;
    const dampedDelta = delta * dampening;

    // Calculate potentially new offset
    let newOffset = dragOffsetRef.current - dampedDelta;

    // CONSTRAINT 1: Max Drag limits
    // Prevent dragging more than one screen width away
    // This prevents "flying away"
    newOffset = Math.max(-width, Math.min(width, newOffset));

    // CONSTRAINT 2: Boundaries
    // If at first tab, prevent positive drag (pulling right to see left void)
    if (resolvedActiveIndex === 0) {
      // Allow small elasticity at edges
      newOffset = Math.min(width * edgeElasticity, newOffset);
    }
    // If at last tab, prevent negative drag (pulling left to see right void)
    if (resolvedActiveIndex === tabs.length - 1) {
      newOffset = Math.max(-width * edgeElasticity, newOffset);
    }

    updateDragOffset(newOffset);

    // Debounce snap logic
    if (snapTimeout.current) clearTimeout(snapTimeout.current);
    snapTimeout.current = setTimeout(() => {
      const currentOffset = dragOffsetRef.current;
      // Threshold to trigger switch
      const snapThreshold = width * 0.12;

      const currentIdx = activeIndexRef.current;

      if (currentOffset < -snapThreshold && currentIdx < tabs.length - 1) {
        // Dragged enough left -> Next Tab
        wheelMovedTab.current = true;
        handleTabClick(tabs[currentIdx + 1].id);
      } else if (currentOffset > snapThreshold && currentIdx > 0) {
        // Dragged enough right -> Prev Tab
        wheelMovedTab.current = true;
        handleTabClick(tabs[currentIdx - 1].id);
      } else {
        // Snap back
        updateDragOffset(0);
      }
      if (wheelEndTimeout.current) clearTimeout(wheelEndTimeout.current);
      wheelEndTimeout.current = setTimeout(() => {
        wheelGestureActive.current = false;
        wheelMovedTab.current = false;
      }, 200);
    }, 110);
  };

  return (
    <div className="flex px-2 w-full h-full flex-col items-center" onWheel={onWheel}>
      <div
        ref={tabBarRef}
        className={cn(
          "bg-card border border-border w-full justify-between shadow-inner-shadow flex cursor-pointer space-x-1 rounded-lg px-[3px] py-[3.2px] relative",
          className,
          rounded,
        )}
      >
        {tabs.length > 0 ? (
          <motion.span
            aria-hidden="true"
            className="bg-primary shadow-inner-shadow border-border absolute left-0 top-0 z-0 border mix-blend-difference pointer-events-none"
            style={{
              width: tabWidth,
              height: indicatorHeight,
              top: tabBarPaddingY,
              borderRadius: rounded ? 9 : 10,
            }}
            animate={{ x: indicatorX }}
            transition={isDragging ? { type: "tween", duration: 0 } : snapSpring}
          />
        ) : null}
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "relative z-10 flex w-full items-center justify-center gap-2 rounded px-3.5 py-1.5 text-xs font-medium text-neutral-200 transition sm:text-sm",
              activeTab === tab.id
                ? "text-white"
                : "text-neutral-200/80 hover:text-neutral-300/60",
              rounded,
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Carousel Track Container */}
      <div
        ref={contentRef}
        className="relative mx-auto mt-2 h-full w-full overflow-hidden"
      >
        <motion.div
          className="flex w-full h-full"
          animate={{
            x: `calc(-${resolvedActiveIndex * 100}% + ${dragOffset}px)`,
          }}
          transition={isDragging ? { type: "tween", duration: 0 } : snapSpring}
        >
          {tabs.map((tab) => (
            <div key={tab.id} className="min-w-full h-full px-2">
              {tab.content}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
export { DirectionAwareTabs };
