import { useEffect } from "react";
import { useOllamaConnection } from "@/hooks/ollama/use-ollama-connection";
import { useOllamaModelsHook } from "@/hooks/ollama/use-ollama-models";
import { useOllamaProcess } from "@/hooks/ollama/use-ollama-process";

/**
 * Component that initializes app-level services on mount.
 * This runs once when the app starts to:
 * - Detect Ollama installation
 * - Check Ollama health/connection
 * - Fetch available models if connected
 */
export function AppInitializer({ children }: { children: React.ReactNode }) {
  const { checkHealth } = useOllamaConnection();
  const { fetchModels } = useOllamaModelsHook();
  const { detectInstallation, refreshStatus } = useOllamaProcess();

  useEffect(() => {
    const initialize = async () => {
      console.log("Initializing app...");

      // Detect Ollama installation
      await detectInstallation();

      // Check if Ollama is healthy/connected
      const isHealthy = await checkHealth();
      console.log("Ollama health check:", isHealthy);

      if (isHealthy) {
        // Fetch available models
        await fetchModels();
        // Refresh process status
        await refreshStatus();
      }
    };

    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
