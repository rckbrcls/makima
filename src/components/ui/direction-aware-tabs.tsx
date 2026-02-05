"use client";

import { ReactNode, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import useMeasure from "react-use-measure";

import { cn } from "@/lib/utils";

type Tab = {
  id: number;
  label: string;
  content: ReactNode;
};

interface OgImageSectionProps {
  tabs: Tab[];
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
  const [direction, setDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [ref, bounds] = useMeasure();
  const lastTabChange = useRef(0);
  const wheelGesture = useRef({
    startTime: 0,
    lastTime: 0,
    accumulated: 0,
    direction: 0,
  });

  const content = useMemo(() => {
    const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;
    return activeTabContent || null;
  }, [activeTab, tabs]);

  const handleTabClick = (newTabId: number) => {
    if (newTabId !== activeTab && !isAnimating) {
      const newDirection = newTabId > activeTab ? 1 : -1;
      setDirection(newDirection);
      setActiveTab(newTabId);
      onChange ? onChange() : null;
    }
  };

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isAnimating) return;

    const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const isShiftScroll = e.shiftKey && Math.abs(e.deltaY) > 0;

    if (!isHorizontal && !isShiftScroll) return;

    const delta = isShiftScroll ? e.deltaY : e.deltaX;
    if (Math.abs(delta) === 0) return;

    e.preventDefault();

    // Cooldown: only allow tab change every 500ms
    const now = Date.now();
    if (now - lastTabChange.current < 500) return;
    const gesture = wheelGesture.current;

    const resetGesture = () => {
      gesture.startTime = 0;
      gesture.lastTime = 0;
      gesture.accumulated = 0;
      gesture.direction = 0;
    };

    // Start a new gesture after a short pause
    if (gesture.lastTime && now - gesture.lastTime > 160) {
      resetGesture();
    }

    const deltaDirection = delta > 0 ? 1 : -1;
    if (!gesture.startTime) {
      gesture.startTime = now;
      gesture.direction = deltaDirection;
    }

    // If direction flips mid-gesture, restart tracking
    if (gesture.direction !== deltaDirection) {
      resetGesture();
      gesture.startTime = now;
      gesture.direction = deltaDirection;
    }

    gesture.lastTime = now;
    gesture.accumulated += delta;

    const duration = now - gesture.startTime;
    const accumulated = Math.abs(gesture.accumulated);
    const velocity = accumulated / Math.max(duration, 1); // delta per ms
    const quickGestureMs = 120;
    const quickDelta = 14;
    const quickVelocity = 0.35;
    const longDelta = 90;

    if (duration <= quickGestureMs) {
      if (accumulated < quickDelta || velocity < quickVelocity) return;
    } else if (accumulated < longDelta) {
      return;
    }

    lastTabChange.current = now;

    if (delta > 0 && activeIndex < tabs.length - 1) {
      handleTabClick(tabs[activeIndex + 1].id);
    } else if (delta < 0 && activeIndex > 0) {
      handleTabClick(tabs[activeIndex - 1].id);
    }

    resetGesture();
  };

  const variants = {
    initial: (direction: number) => ({
      x: 300 * direction,
      opacity: 0,
      filter: "blur(4px)",
    }),
    active: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      x: -300 * direction,
      opacity: 0,
      filter: "blur(4px)",
    }),
  };

  return (
    <div className="flex h-full w-full flex-col items-center" onWheel={onWheel}>
      <div
        className={cn(
          "bg-card border-border shadow-inner-shadow flex cursor-pointer space-x-1 rounded-full border px-[3px] py-[3.2px]",
          className,
          rounded,
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground transition sm:text-sm",
              activeTab === tab.id
                ? "text-foreground"
                : "text-foreground/80 hover:text-foreground/60",
              rounded,
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {activeTab === tab.id && (
              <motion.span
                layoutId="bubble"
                className="bg-primary shadow-inner-shadow dark:border-border absolute inset-0 z-10 dark:border mix-blend-difference"
                style={rounded ? { borderRadius: 9 } : { borderRadius: 10 }}
                transition={{ type: "spring", bounce: 0.19, duration: 0.4 }}
              />
            )}

            {tab.label}
          </button>
        ))}
      </div>
      <MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}>
        <div
          ref={ref}
          className="relative mx-auto h-full w-full flex-1 overflow-hidden p-2"
        >
          <AnimatePresence
            custom={direction}
            mode="popLayout"
            onExitComplete={() => setIsAnimating(false)}
          >
            <motion.div
              key={activeTab}
              variants={variants}
              initial="initial"
              animate="active"
              exit="exit"
              custom={direction}
              onAnimationStart={() => setIsAnimating(true)}
              onAnimationComplete={() => setIsAnimating(false)}
              className="h-full"
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </div>
      </MotionConfig>
    </div>
  );
}
export { DirectionAwareTabs };
