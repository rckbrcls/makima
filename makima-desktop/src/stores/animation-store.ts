import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

// ============================================================================
// Animation Store - Per-message streaming animation state
// ============================================================================
// This store manages the "typewriter" animation for streaming messages.
// Instead of a global 90ms interval that updates ALL conversations,
// each message manages its own animation state here.

interface AnimationState {
  // Map of messageId -> number of displayed characters
  streamingAnimations: Map<string, number>;
}

interface AnimationActions {
  // Get displayed chars for a message
  getDisplayedChars: (messageId: string) => number;

  // Initialize animation for a message
  startAnimation: (messageId: string, initialChars?: number) => void;

  // Advance animation by a random step (2-5 chars)
  advanceAnimation: (messageId: string, step?: number) => number;

  // Set displayed chars directly
  setDisplayedChars: (messageId: string, chars: number) => void;

  // Clear animation when done
  clearAnimation: (messageId: string) => void;

  // Clear all animations
  clearAllAnimations: () => void;
}

export type AnimationStore = AnimationState & AnimationActions;

const initialState: AnimationState = {
  streamingAnimations: new Map(),
};

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  ...initialState,

  getDisplayedChars: (messageId) => {
    return get().streamingAnimations.get(messageId) ?? 0;
  },

  startAnimation: (messageId, initialChars = 0) =>
    set((state) => {
      const newMap = new Map(state.streamingAnimations);
      newMap.set(messageId, initialChars);
      return { streamingAnimations: newMap };
    }),

  advanceAnimation: (messageId, step) => {
    const currentChars = get().streamingAnimations.get(messageId) ?? 0;
    const randomStep = step ?? Math.floor(Math.random() * 4) + 2;
    const newChars = currentChars + randomStep;

    set((state) => {
      const newMap = new Map(state.streamingAnimations);
      newMap.set(messageId, newChars);
      return { streamingAnimations: newMap };
    });

    return newChars;
  },

  setDisplayedChars: (messageId, chars) =>
    set((state) => {
      const newMap = new Map(state.streamingAnimations);
      newMap.set(messageId, chars);
      return { streamingAnimations: newMap };
    }),

  clearAnimation: (messageId) =>
    set((state) => {
      const newMap = new Map(state.streamingAnimations);
      newMap.delete(messageId);
      return { streamingAnimations: newMap };
    }),

  clearAllAnimations: () => set({ streamingAnimations: new Map() }),
}));

// ============================================================================
// Atomic Selectors - Fine-grained subscriptions for optimal re-renders
// ============================================================================

// Get displayed chars for a specific message
// Use this in message components to only re-render that message
export const useMessageDisplayedChars = (messageId: string) =>
  useAnimationStore((s) => s.streamingAnimations.get(messageId) ?? 0);

// Check if a message is currently animating
export const useIsMessageAnimating = (messageId: string) =>
  useAnimationStore((s) => s.streamingAnimations.has(messageId));

// Get all animating message IDs
export const useAnimatingMessageIds = () =>
  useAnimationStore(useShallow((s) => [...s.streamingAnimations.keys()]));

// Actions selector (stable reference)
export const useAnimationActions = () =>
  useAnimationStore(
    useShallow((s) => ({
      getDisplayedChars: s.getDisplayedChars,
      startAnimation: s.startAnimation,
      advanceAnimation: s.advanceAnimation,
      setDisplayedChars: s.setDisplayedChars,
      clearAnimation: s.clearAnimation,
      clearAllAnimations: s.clearAllAnimations,
    })),
  );
