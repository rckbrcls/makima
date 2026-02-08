// ============================================================================
// OpenClaw Types - Frontend types matching Rust IPC payloads
// ============================================================================

/** Connection status from the gateway */
export interface OpenClawConnectionStatus {
  connected: boolean
  gatewayVersion?: string
  error?: string
}

/** OpenClaw installation detection result */
export interface OpenClawInstallation {
  installed: boolean
  path?: string
  version?: string
  nodeAvailable: boolean
}

/** Gateway process status */
export interface GatewayProcessStatus {
  isRunning: boolean
  managedByApp: boolean
  pid?: number
  port: number
}

/** Agent event from the gateway (Tauri event payload) */
export interface OpenClawAgentEvent {
  eventType: string
  sessionKey: string
  data: Record<string, unknown>
}

/** Approval request from the gateway (Tauri event payload) */
export interface OpenClawApprovalRequest {
  approvalId: string
  sessionKey: string
  toolName: string
  arguments: Record<string, unknown>
  risk: "low" | "medium" | "high"
  description: string
}

/** Agent config from the gateway */
export interface OpenClawAgentConfig {
  id: string
  name: string
  description?: string
  model?: string
  provider?: string
  tools: Array<string>
}

/** Agent entry in the config file */
export interface OpenClawAgentEntry {
  id: string
  name?: string
  default?: boolean
  model?: string
}

/** OpenClaw file config (~/.openclaw/openclaw.json) */
export interface OpenClawFileConfig {
  gateway: {
    mode: string
    port: number
    auth: { token: string }
    workspace?: string
    password?: string
  }
  agents?: {
    list: Array<OpenClawAgentEntry>
  }
}

/** A chat message in the work domain */
export interface WorkChatMessage {
  id: string
  role: "user" | "assistant" | "tool" | "system"
  content: string
  timestamp: number
  toolName?: string
  isStreaming?: boolean
}
