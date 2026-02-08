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

/** Raw gateway event emitted from Tauri */
export interface GatewayEventEnvelope {
  event: string
  payload: Record<string, unknown>
  seq: number
}

/** Discovered capabilities for the connected gateway */
export interface OpenClawCapabilities {
  rpc: boolean
  wizard: boolean
  status: boolean
  health: boolean
  ping: boolean
  configSchema: boolean
  configApply: boolean
  configPatch: boolean
  approvalsList: boolean
  toolsList: boolean
  toolsInvoke: boolean
  sessionNew: boolean
  sessionResume: boolean
  send: boolean
  agentSend: boolean
}

export type OpenClawWizardInputType =
  | "text"
  | "password"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"

/** Normalized prompt shape for a wizard step */
export interface OpenClawWizardPrompt {
  id: string
  label: string
  type: OpenClawWizardInputType
  description?: string
  required?: boolean
  options?: Array<{ label: string; value: string }>
  defaultValue?: unknown
}

/** Normalized wizard state tracked by the app */
export interface OpenClawWizardState {
  sessionId?: string
  stepId?: string
  title?: string
  description?: string
  prompts: Array<OpenClawWizardPrompt>
  completed: boolean
  raw: Record<string, unknown>
}

/** Generic schema from config.schema */
export interface OpenClawConfigSchema {
  raw: Record<string, unknown>
}

/** Response metadata from config.apply/config.patch */
export interface OpenClawConfigApplyResult {
  ok: boolean
  warnings?: Array<string>
  restarted?: boolean
  raw?: Record<string, unknown>
}

/** Descriptor for a callable tool */
export interface OpenClawToolDescriptor {
  name: string
  description?: string
  risk?: "low" | "medium" | "high" | string
  inputSchema?: Record<string, unknown>
  raw?: Record<string, unknown>
}

/** Health response (normalized) */
export interface OpenClawHealthStatus {
  ok: boolean
  status?: string
  latencyMs?: number
  details?: Record<string, unknown>
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
