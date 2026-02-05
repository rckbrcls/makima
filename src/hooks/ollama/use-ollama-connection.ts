import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect } from "react";
import {
  useOllamaConnectionState,
  useProviderActions,
} from "@/stores/provider-store";

/**
 * Hook for managing Ollama connection health checks.
 * Uses the provider store for state management.
 */
export function useOllamaConnection() {
  const connectionState = useOllamaConnectionState();
  const { setOllamaConnectionState } = useProviderActions();

  const checkHealth = useCallback(async () => {
    // Set checking state - don't need previous state since we're setting all fields
    setOllamaConnectionState({
      isConnected: false,
      isChecking: true,
      lastError: undefined,
    });
    try {
      const isHealthy = await invoke<boolean>("ollama_health_check");
      setOllamaConnectionState({
        isConnected: isHealthy,
        isChecking: false,
        lastError: isHealthy ? undefined : "Ollama is not responding",
      });
      return isHealthy;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setOllamaConnectionState({
        isConnected: false,
        isChecking: false,
        lastError: errorMessage,
      });
      return false;
    }
  }, [setOllamaConnectionState]);

  return {
    connectionState,
    isConnected: connectionState.isConnected,
    isChecking: connectionState.isChecking,
    lastError: connectionState.lastError,
    checkHealth,
  };
}

/**
 * Hook that automatically checks Ollama health on mount.
 */
export function useOllamaHealthCheck(autoFetchModels?: () => Promise<void>) {
  const { checkHealth, isConnected } = useOllamaConnection();

  useEffect(() => {
    checkHealth().then((isHealthy) => {
      if (isHealthy && autoFetchModels) {
        autoFetchModels();
      }
    });
  }, [checkHealth, autoFetchModels]);

  return { checkHealth, isConnected };
}
