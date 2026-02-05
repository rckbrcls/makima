import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import type { OllamaModelInfo } from "@/lib/ollama-types";
import {
  useIsLoadingModels,
  useOllamaModels,
  useProviderActions,
} from "@/stores/provider-store";

/**
 * Hook for fetching and managing Ollama models.
 * Uses the provider store for state management.
 */
export function useOllamaModelsHook() {
  const models = useOllamaModels();
  const isLoadingModels = useIsLoadingModels();
  const { setOllamaModels, setIsLoadingModels, setOllamaConnectionState } =
    useProviderActions();

  const fetchModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const modelList =
        await invoke<Array<OllamaModelInfo>>("ollama_list_models");
      setOllamaModels(modelList);
      return modelList;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setOllamaConnectionState({
        isConnected: false,
        isChecking: false,
        lastError: errorMessage,
      });
      return [];
    } finally {
      setIsLoadingModels(false);
    }
  }, [setOllamaModels, setIsLoadingModels, setOllamaConnectionState]);

  return {
    models,
    isLoadingModels,
    fetchModels,
  };
}
