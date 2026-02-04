import { useMemo, useState, useRef } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
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
  const [direction, setDirection] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [ref, bounds] = useMeasure();
  const lastScrollTime = useRef(0);

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

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Only handle horizontal scrolls (or shift+scroll which browser converts to deltaX usually,
    // but some browsers might treat shift+scroll as horizontal delta)
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;

    // Threshold to prevent accidental jitter
    if (Math.abs(delta) < 30) return;

    const now = Date.now();
    // Throttle checks
    if (now - lastScrollTime.current < 100) return;

    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    if (currentIndex === -1) return;

    if (delta > 0) {
      // Scrolling right -> Go to next tab
      if (currentIndex < tabs.length - 1) {
        handleTabClick(tabs[currentIndex + 1].id);
        lastScrollTime.current = now;
      }
    } else {
      // Scrolling left -> Go to prev tab
      if (currentIndex > 0) {
        handleTabClick(tabs[currentIndex - 1].id);
        lastScrollTime.current = now;
      }
    }
  };

  return (
    <div className="flex w-full h-full flex-col items-center" onWheel={handleWheel}>
      <div
        className={cn(
          "glass shadow-inner-shadow flex cursor-pointer space-x-1 rounded-lg  px-[3px] py-[3.2px]",
          className,
          rounded,
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "relative flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-medium text-neutral-200 transition focus-visible:ring-1 focus-visible:outline-1 focus-visible:outline-none sm:text-sm",
              activeTab === tab.id
                ? "text-white"
                : "text-neutral-200/80 hover:text-neutral-300/60",
              rounded,
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {activeTab === tab.id && (
              <motion.span
                layoutId="bubble"
                className="bg-primary shadow-inner-shadow border-border absolute inset-0 z-10 border mix-blend-difference"
                style={rounded ? { borderRadius: 9 } : { borderRadius: 10 }}
                transition={{ type: "spring", bounce: 0.19, duration: 0.4 }}
              />
            )}

            {tab.label}
          </button>
        ))}
      </div>
      <MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}>
        <motion.div
          className="relative mx-auto mt-2 h-full w-full overflow-hidden"
          initial={false}
          animate={{ height: bounds.height }}
        >
          <div className="px-2" ref={ref}>
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
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div >
  );
}
export { DirectionAwareTabs };
