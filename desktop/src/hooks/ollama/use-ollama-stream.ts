import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type {
  ChatStreamOptions,
  StreamChunkEvent,
  StreamErrorEvent,
} from "@/lib/ollama-types";

interface SessionHandlers {
  onChunk: ChatStreamOptions["onChunk"];
  onError: ChatStreamOptions["onError"];
  onComplete?: ChatStreamOptions["onComplete"];
}

/**
 * Hook for managing Ollama chat streaming.
 * Handles session management and event listeners.
 */
export function useOllamaStream() {
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());

  const sessionsRef = useRef<Map<string, SessionHandlers>>(new Map());
  const unlistenChunkRef = useRef<UnlistenFn | null>(null);
  const unlistenErrorRef = useRef<UnlistenFn | null>(null);

  const isStreaming = activeSessions.size > 0;

  // Set up stream event listeners
  useEffect(() => {
    const setupListeners = async () => {
      unlistenChunkRef.current = await listen<StreamChunkEvent>(
        "ollama:stream-chunk",
        (event) => {
          const { session_id, content, done, total_duration, eval_count } =
            event.payload;

          const handlers = sessionsRef.current.get(session_id);
          if (!handlers) return;

          handlers.onChunk(content, done);

          if (done) {
            sessionsRef.current.delete(session_id);
            setActiveSessions((prev) => {
              const next = new Set(prev);
              next.delete(session_id);
              return next;
            });
            if (handlers.onComplete) {
              handlers.onComplete({
                totalDuration: total_duration,
                evalCount: eval_count,
              });
            }
          }
        },
      );

      unlistenErrorRef.current = await listen<StreamErrorEvent>(
        "ollama:stream-error",
        (event) => {
          const { session_id, error } = event.payload;

          const handlers = sessionsRef.current.get(session_id);
          if (!handlers) return;

          handlers.onError(error);

          sessionsRef.current.delete(session_id);
          setActiveSessions((prev) => {
            const next = new Set(prev);
            next.delete(session_id);
            return next;
          });
        },
      );
    };

    setupListeners();

    return () => {
      unlistenChunkRef.current?.();
      unlistenErrorRef.current?.();
    };
  }, []);

  const startChatStream = useCallback(async (options: ChatStreamOptions) => {
    const {
      sessionId,
      model,
      messages,
      temperature,
      maxTokens,
      onChunk,
      onError,
      onComplete,
    } = options;

    // Register handlers for this session
    sessionsRef.current.set(sessionId, { onChunk, onError, onComplete });
    setActiveSessions((prev) => new Set(prev).add(sessionId));

    try {
      await invoke("ollama_chat_stream", {
        sessionId,
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature,
        maxTokens,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      onError(errorMessage);
      sessionsRef.current.delete(sessionId);
      setActiveSessions((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  }, []);

  const cancelStream = useCallback(async (sessionId: string) => {
    if (!sessionsRef.current.has(sessionId)) return false;

    try {
      const wasCancelled = await invoke<boolean>("ollama_cancel_stream", {
        sessionId,
      });
      if (wasCancelled) {
        sessionsRef.current.delete(sessionId);
        setActiveSessions((prev) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
      }
      return wasCancelled;
    } catch {
      return false;
    }
  }, []);

  return {
    isStreaming,
    activeSessions,
    startChatStream,
    cancelStream,
  };
}
