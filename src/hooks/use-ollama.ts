import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type {
  ChatStreamOptions,
  OllamaConnectionState,
  OllamaModelInfo,
  PullProgressEvent,
  StreamChunkEvent,
  StreamErrorEvent,
} from "@/lib/ollama-types";

interface SessionHandlers {
  onChunk: ChatStreamOptions["onChunk"];
  onError: ChatStreamOptions["onError"];
  onComplete?: ChatStreamOptions["onComplete"];
}

export function useOllama() {
  const [connectionState, setConnectionState] = useState<OllamaConnectionState>(
    {
      isConnected: false,
      isChecking: true,
    },
  );
  const [models, setModels] = useState<Array<OllamaModelInfo>>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Set<string>>(new Set());
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<number | null>(null);

  const sessionsRef = useRef<Map<string, SessionHandlers>>(new Map());
  const unlistenChunkRef = useRef<UnlistenFn | null>(null);
  const unlistenErrorRef = useRef<UnlistenFn | null>(null);
  const unlistenPullRef = useRef<UnlistenFn | null>(null);

  const isStreaming = activeSessions.size > 0;

  const checkHealth = useCallback(async () => {
    setConnectionState((prev) => ({ ...prev, isChecking: true }));
    try {
      const isHealthy = await invoke<boolean>("ollama_health_check");
      setConnectionState({
        isConnected: isHealthy,
        isChecking: false,
        lastError: isHealthy ? undefined : "Ollama is not responding",
      });
      return isHealthy;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setConnectionState({
        isConnected: false,
        isChecking: false,
        lastError: errorMessage,
      });
      return false;
    }
  }, []);

  const fetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const modelList =
        await invoke<Array<OllamaModelInfo>>("ollama_list_models");
      setModels(modelList);
      return modelList;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        lastError: errorMessage,
      }));
      return [];
    } finally {
      setIsLoadingModels(false);
    }
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

  const pullModel = useCallback(
    async (modelName: string) => {
      setPullingModel(modelName);
      setPullProgress(0);

      try {
        await invoke("ollama_pull_model", { model: modelName });
        await fetchModels();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Failed to pull model:", errorMessage);
      } finally {
        setPullingModel(null);
        setPullProgress(null);
      }
    },
    [fetchModels],
  );

  const deleteModel = useCallback(
    async (modelName: string) => {
      try {
        await invoke("ollama_delete_model", { model: modelName });
        await fetchModels();
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Failed to delete model:", errorMessage);
        return false;
      }
    },
    [fetchModels],
  );

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

      unlistenPullRef.current = await listen<PullProgressEvent>(
        "ollama:pull-progress",
        (event) => {
          const { progress, done } = event.payload;
          if (progress !== undefined && progress !== null) {
            setPullProgress(progress);
          }
          if (done) {
            setPullingModel(null);
            setPullProgress(null);
          }
        },
      );
    };

    setupListeners();

    return () => {
      unlistenChunkRef.current?.();
      unlistenErrorRef.current?.();
      unlistenPullRef.current?.();
    };
  }, []);

  useEffect(() => {
    checkHealth().then((isHealthy) => {
      if (isHealthy) {
        fetchModels();
      }
    });
  }, [checkHealth, fetchModels]);

  return {
    connectionState,
    models,
    isLoadingModels,
    isStreaming,
    activeSessions,
    pullingModel,
    pullProgress,
    checkHealth,
    fetchModels,
    startChatStream,
    cancelStream,
    pullModel,
    deleteModel,
  };
}
