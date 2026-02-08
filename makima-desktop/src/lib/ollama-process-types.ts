/**
 * Types for Ollama process management
 */

/**
 * Type of Ollama installation found on the system
 */
export type InstallationType = "none" | "cli" | "app" | "both";

/**
 * Information about the Ollama installation on the system
 */
export interface OllamaInstallation {
  installationType: InstallationType;
  cliPath: string | null;
  appInstalled: boolean;
}

/**
 * Status of the Ollama process as managed by this app
 */
export type ProcessStatus =
  | "unknown"
  | "stopped"
  | "starting"
  | "running"
  | "stopping";

/**
 * Current status of the Ollama process from the backend
 */
export interface OllamaProcessStatus {
  isRunning: boolean;
  managedByApp: boolean;
  pid: number | null;
}
