import { useEffect } from "react"
import { useOllamaConnection } from "./use-ollama-connection"
import { useOllamaModelsHook } from "./use-ollama-models"
import { useOllamaPull } from "./use-ollama-pull"
import { useOllamaProcess } from "./use-ollama-process"
import { useOllamaStream } from "./use-ollama-stream"

// Re-export individual hooks for focused usage
export { useOllamaConnection } from "./use-ollama-connection"
export { useOllamaModelsHook } from "./use-ollama-models"
export { useOllamaPull } from "./use-ollama-pull"
export { useOllamaProcess } from "./use-ollama-process"
export { useOllamaStream } from "./use-ollama-stream"

/**
 * Facade hook that composes all Ollama functionality.
 * Use this for backwards compatibility or when you need all Ollama features.
 * For better performance, prefer using the individual hooks directly.
 */
export function useOllama() {
  const connection = useOllamaConnection()
  const modelsHook = useOllamaModelsHook()
  const pull = useOllamaPull(modelsHook.fetchModels)
  const process = useOllamaProcess()
  const stream = useOllamaStream()

  // Auto-check health, detect installation, and fetch models on mount
  useEffect(() => {
    // Detect installation first
    process.detectInstallation()

    connection.checkHealth().then((isHealthy) => {
      if (isHealthy) {
        modelsHook.fetchModels()
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Connection
    connectionState: connection.connectionState,
    checkHealth: connection.checkHealth,

    // Models
    models: modelsHook.models,
    isLoadingModels: modelsHook.isLoadingModels,
    fetchModels: modelsHook.fetchModels,

    // Pull/Delete
    pullingModel: pull.pullingModel,
    pullProgress: pull.pullProgress,
    pullModel: pull.pullModel,
    deleteModel: pull.deleteModel,

    // Process management
    detectInstallation: process.detectInstallation,
    startProcess: process.startProcess,
    stopProcess: process.stopProcess,
    refreshStatus: process.refreshStatus,

    // Streaming
    isStreaming: stream.isStreaming,
    activeSessions: stream.activeSessions,
    startChatStream: stream.startChatStream,
    cancelStream: stream.cancelStream,
  }
}
