import { useEffect } from "react";
import {
  useAnimationActions,
  useMessageDisplayedChars,
} from "@/stores/animation-store";

/**
 * Hook for animating streaming message content.
 *
 * Instead of a global 90ms interval that updates ALL conversations,
 * this hook manages animation per-message. Only the component using
 * this hook will re-render during animation.
 *
 * @param messageId - Unique identifier for the message
 * @param totalLength - Total length of the message content
 * @param isStreaming - Whether the message is currently streaming
 * @returns The number of characters to display (for truncation)
 */
export function useStreamingAnimation(
  messageId: string,
  totalLength: number,
  isStreaming: boolean,
) {
  const displayedChars = useMessageDisplayedChars(messageId);
  const { startAnimation, advanceAnimation, clearAnimation } =
    useAnimationActions();

  useEffect(() => {
    // Don't animate if not streaming or no content
    if (!isStreaming || totalLength === 0) {
      return;
    }

    // Start animation if not already started
    if (displayedChars === 0) {
      startAnimation(messageId, 0);
    }

    // Set up animation interval
    const interval = setInterval(() => {
      const newCount = advanceAnimation(messageId);

      // Stop animation when we've displayed all chars
      if (newCount >= totalLength) {
        clearAnimation(messageId);
        clearInterval(interval);
      }
    }, 90);

    return () => {
      clearInterval(interval);
    };
  }, [
    messageId,
    totalLength,
    isStreaming,
    displayedChars,
    startAnimation,
    advanceAnimation,
    clearAnimation,
  ]);

  // Return the actual number of chars to display
  // Clamp to totalLength to ensure we don't overshoot
  return Math.min(displayedChars, totalLength);
}

/**
 * Hook that returns whether animation is complete.
 * Useful for determining when to show the full message.
 */
export function useIsAnimationComplete(
  messageId: string,
  totalLength: number,
  isStreaming: boolean,
) {
  const displayedChars = useMessageDisplayedChars(messageId);

  // Animation is complete when:
  // 1. Not streaming anymore, or
  // 2. Displayed chars >= total length
  return !isStreaming || displayedChars >= totalLength;
}

/**
 * Hook for getting the visible content of a streaming message.
 *
 * @param messageId - Unique identifier for the message
 * @param content - Full message content
 * @param isStreaming - Whether the message is currently streaming
 * @returns The truncated content to display
 */
export function useStreamingContent(
  messageId: string,
  content: string,
  isStreaming: boolean,
) {
  const displayedChars = useStreamingAnimation(
    messageId,
    content.length,
    isStreaming,
  );

  // If not streaming, show full content
  if (!isStreaming) {
    return content;
  }

  // Return truncated content based on animation
  return content.slice(0, displayedChars);
}
