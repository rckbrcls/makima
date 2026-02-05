import { useCallback } from "react"
import { invoke } from "@tauri-apps/api/core"
import type {
  OllamaInstallation,
  OllamaProcessStatus,
} from "@/lib/ollama-process-types"
import { useProviderActions } from "@/stores/provider-store"

/**
 * Hook for managing the Ollama process lifecycle.
 *
 * Provides functions to:
 * - Detect Ollama installation type (CLI, App, or both)
 * - Start/stop the Ollama process
 * - Refresh process status
 */
export function useOllamaProcess() {
  const actions = useProviderActions()

  /**
   * Detects how Ollama is installed on the system
   */
  const detectInstallation = useCallback(async () => {
    console.log("Detecting Ollama installation...")
    try {
      const installation = await invoke<OllamaInstallation>(
        "ollama_detect_installation",
      )
      console.log("Ollama installation detected:", installation)
      actions.setOllamaInstallation(installation)
      return installation
    } catch (error) {
      console.error("Failed to detect Ollama installation:", error)
      return null
    }
  }, [actions])

  /**
   * Starts the Ollama process
   * @returns The PID of the started process
   */
  const startProcess = useCallback(async () => {
    console.log("Starting Ollama process...")
    actions.setOllamaProcessStatus("starting")

    try {
      const pid = await invoke<number>("ollama_start_process")
      console.log("Ollama started with PID:", pid)
      actions.setOllamaProcessStatus("running")
      actions.setOllamaManagedByApp(true)
      actions.setOllamaPid(pid)
      // Connection state will be updated by the health check
      actions.setOllamaConnectionState({ isConnected: true, isChecking: false })
      return pid
    } catch (error) {
      console.error("Failed to start Ollama process:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      // If already running, update state to reflect that
      if (errorMessage.includes("already running")) {
        actions.setOllamaProcessStatus("running")
        actions.setOllamaConnectionState({ isConnected: true, isChecking: false })
      } else {
        actions.setOllamaProcessStatus("stopped")
      }
      throw error
    }
  }, [actions])

  /**
   * Stops the Ollama process
   */
  const stopProcess = useCallback(async () => {
    actions.setOllamaProcessStatus("stopping")

    try {
      await invoke("ollama_stop_process")
      actions.setOllamaProcessStatus("stopped")
      actions.setOllamaManagedByApp(false)
      actions.setOllamaPid(null)
      actions.setOllamaConnectionState({ isConnected: false, isChecking: false })
    } catch (error) {
      console.error("Failed to stop Ollama process:", error)
      // Refresh status to get actual state
      await refreshStatus()
      throw error
    }
  }, [actions])

  /**
   * Refreshes the current process status from the backend
   */
  const refreshStatus = useCallback(async () => {
    try {
      const status = await invoke<OllamaProcessStatus>(
        "ollama_get_process_status",
      )
      actions.setOllamaProcessStatus(status.isRunning ? "running" : "stopped")
      actions.setOllamaManagedByApp(status.managedByApp)
      actions.setOllamaPid(status.pid)
      return status
    } catch (error) {
      console.error("Failed to get Ollama process status:", error)
      return null
    }
  }, [actions])

  return {
    detectInstallation,
    startProcess,
    stopProcess,
    refreshStatus,
  }
}
