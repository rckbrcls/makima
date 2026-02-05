// ============================================================================
// Work Domain Types - Agents, Sessions, Runs, Approvals
// ============================================================================

/**
 * Agent - A configured AI agent that can execute tasks
 */
export interface Agent {
  id: string
  name: string
  description?: string
  config: AgentConfig
  createdAt: number
  updatedAt: number
}

/**
 * AgentConfig - Configuration for an agent
 */
export interface AgentConfig {
  /** Model to use for this agent */
  model?: string
  /** Provider (ollama, openai, anthropic) */
  provider?: string
  /** System prompt */
  systemPrompt?: string
  /** Temperature for responses */
  temperature?: number
  /** Maximum tokens per response */
  maxTokens?: number
  /** Tools/skills this agent can use */
  tools?: Array<string>
  /** Policies for auto-approval */
  policies?: Array<AgentPolicy>
}

/**
 * AgentPolicy - Defines what actions can be auto-approved
 */
export interface AgentPolicy {
  id: string
  name: string
  /** Pattern to match against actions */
  pattern: string
  /** Whether to auto-approve matching actions */
  autoApprove: boolean
}

/**
 * Session - A conversation/execution session with an agent
 */
export interface Session {
  id: string
  agentId: string
  title: string
  status: SessionStatus
  createdAt: number
  updatedAt: number
}

export type SessionStatus = "active" | "finished" | "error"

/**
 * Run - A single execution unit (command, skill, pipeline)
 */
export interface Run {
  id: string
  sessionId: string
  type: RunType
  status: RunStatus
  input: string
  output?: string
  error?: string
  startedAt: number
  finishedAt?: number
  /** Duration in milliseconds */
  duration?: number
  /** Steps for multi-step runs */
  steps?: Array<RunStep>
  /** Logs from execution */
  logs?: Array<string>
}

export type RunType = "command" | "skill" | "pipeline" | "agent"

export type RunStatus =
  | "pending"
  | "waiting_approval"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"

/**
 * RunStep - A single step within a run
 */
export interface RunStep {
  id: string
  label: string
  status: "pending" | "running" | "completed" | "failed"
  output?: string
  startedAt?: number
  finishedAt?: number
}

/**
 * Approval - A pending approval request for an action
 */
export interface Approval {
  id: string
  runId: string
  sessionId: string
  action: ApprovalAction
  status: ApprovalStatus
  createdAt: number
  resolvedAt?: number
  resolvedBy?: "user" | "policy"
}

export type ApprovalStatus = "pending" | "approved" | "rejected"

/**
 * ApprovalAction - Details of the action requiring approval
 */
export interface ApprovalAction {
  type: "command" | "file_write" | "file_delete" | "api_call" | "other"
  /** Human-readable description */
  description: string
  /** The actual command/action to execute */
  payload: string
  /** Risk level assessment */
  risk: "low" | "medium" | "high"
  /** Affected files/resources */
  affectedResources?: Array<string>
}

/**
 * ExecutionMode - Safe vs Auto mode
 */
export type ExecutionMode = "safe" | "auto"

// ============================================================================
// Database conversion types (for Tauri IPC)
// ============================================================================

export interface DbAgent {
  id: string
  name: string
  description: string | null
  config: string // JSON stringified AgentConfig
  created_at: number
  updated_at: number
}

export interface DbSession {
  id: string
  agent_id: string
  title: string
  status: string
  created_at: number
  updated_at: number
}

export interface DbRun {
  id: string
  session_id: string
  run_type: string
  status: string
  input: string
  output: string | null
  error: string | null
  started_at: number
  finished_at: number | null
}

export interface DbApproval {
  id: string
  run_id: string
  action: string // JSON stringified ApprovalAction
  status: string
  created_at: number
  resolved_at: number | null
}

// ============================================================================
// Conversion functions
// ============================================================================

export function dbAgentToAgent(db: DbAgent): Agent {
  return {
    id: db.id,
    name: db.name,
    description: db.description ?? undefined,
    config: db.config ? JSON.parse(db.config) : {},
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export function dbSessionToSession(db: DbSession): Session {
  return {
    id: db.id,
    agentId: db.agent_id,
    title: db.title,
    status: db.status as SessionStatus,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export function dbRunToRun(db: DbRun): Run {
  return {
    id: db.id,
    sessionId: db.session_id,
    type: db.run_type as RunType,
    status: db.status as RunStatus,
    input: db.input,
    output: db.output ?? undefined,
    error: db.error ?? undefined,
    startedAt: db.started_at,
    finishedAt: db.finished_at ?? undefined,
    duration: db.finished_at ? db.finished_at - db.started_at : undefined,
  }
}

export function dbApprovalToApproval(
  db: DbApproval,
  sessionId: string,
): Approval {
  return {
    id: db.id,
    runId: db.run_id,
    sessionId,
    action: db.action ? JSON.parse(db.action) : {},
    status: db.status as ApprovalStatus,
    createdAt: db.created_at,
    resolvedAt: db.resolved_at ?? undefined,
  }
}
