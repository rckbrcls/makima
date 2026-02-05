import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type { PullProgressEvent } from "@/lib/ollama-types";
import {
  useProviderActions,
  usePullProgress,
  usePullingModel,
} from "@/stores/provider-store";

/**
 * Hook for pulling and deleting Ollama models.
 * Uses the provider store for state management.
 */
export function useOllamaPull(fetchModels: () => Promise<unknown>) {
  const pullingModel = usePullingModel();
  const pullProgress = usePullProgress();
  const { setPullingModel, setPullProgress } = useProviderActions();

  const unlistenPullRef = useRef<UnlistenFn | null>(null);

  // Set up pull progress listener
  useEffect(() => {
    const setupListener = async () => {
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

    setupListener();

    return () => {
      unlistenPullRef.current?.();
    };
  }, [setPullingModel, setPullProgress]);

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
    [fetchModels, setPullingModel, setPullProgress],
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

  return {
    pullingModel,
    pullProgress,
    pullModel,
    deleteModel,
  };
}
