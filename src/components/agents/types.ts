// Agent-related types for the AI Agent Executor
// Aligned with Rust types in src-tauri/src/types.rs

// ============================================================================
// Enums
// ============================================================================

export type AgentStatus = "active" | "idle" | "running" | "error";
export type AgentProvider = "cli" | "local" | "api";
export type SessionState = "active" | "done" | "failed";
export type ActionStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "blocked"
  | "rejected";
export type ApprovalState = "pending" | "approved" | "rejected";
export type BridgeMode = "safe" | "auto";
export type EventLevel = "info" | "warning" | "error" | "debug";
export type EventSource = "tool" | "cli" | "system" | "user";
export type ArtifactKind = "file" | "log" | "screenshot" | "diff" | "other";
export type ActionType =
  | "run_command"
  | "start_dev_server"
  | "stop_dev_server"
  | "read_file"
  | "write_file"
  | "edit_file"
  | "list_files"
  | "delete_file"
  | "search_web"
  | "open_url"
  | "git_status"
  | "git_diff"
  | "git_checkout"
  | "git_commit"
  | "notify"
  | "sleep";

// ============================================================================
// Core Models (matching Rust structs)
// ============================================================================

export type AgentSkill =
  | "file_read"
  | "file_write"
  | "file_edit"
  | "bash"
  | "git"
  | "web_search"
  | "browser"
  | "code_analysis"
  | "testing"
  | "deployment";

export interface Agent {
  id: string;
  name: string;
  provider: AgentProvider;
  model?: string;
  status: AgentStatus;
  skills: Array<AgentSkill>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRepo {
  agentId: string;
  repo: string;
}

export interface Session {
  id: string;
  agentId: string;
  repoName: string;
  goal: string;
  state: SessionState;
  createdAt: string;
  updatedAt: string;
}

export interface Action {
  id: string;
  sessionId: string;
  actionType: ActionType;
  status: ActionStatus;
  payload: string; // JSON string
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  actionId: string;
  state: ApprovalState;
  reviewer?: string;
  reason?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AgentEvent {
  id: string;
  sessionId?: string;
  agentId?: string;
  level: EventLevel;
  message: string;
  source: EventSource;
  createdAt: string;
}

export interface Artifact {
  id: string;
  sessionId: string;
  kind: ArtifactKind;
  data: string; // JSON or base64 encoded
  createdAt: string;
}

// ============================================================================
// Dashboard State (matching Rust AgentDashboardState)
// ============================================================================

export interface AgentWithRepos extends Agent {
  repos: Array<string>;
  currentSession?: Session;
}

export interface ApprovalWithAction extends Approval {
  action?: Action;
}

export interface AgentDashboardState {
  agents: Array<AgentWithRepos>;
  sessions: Array<Session>;
  pendingApprovals: Array<ApprovalWithAction>;
  recentEvents: Array<AgentEvent>;
  globalMode: BridgeMode;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateAgentRequest {
  name: string;
  provider: AgentProvider;
  model?: string;
  skills: Array<AgentSkill>;
  repos: Array<string>;
}

export interface StartSessionRequest {
  agentId: string;
  repoName: string;
  goal: string;
}

export interface ApprovalDecision {
  approvalId: string;
  approved: boolean;
  reviewer: string;
  reason?: string;
}

export interface SetModeRequest {
  mode: BridgeMode;
}

// ============================================================================
// UI Types
// ============================================================================

export interface ApprovalCardData {
  approval: Approval;
  action: Action;
  session: Session;
  agent: Agent;
}

export interface SessionWithDetails extends Session {
  agent: Agent;
  actions: Array<Action>;
  events: Array<AgentEvent>;
}

export interface SessionWithAgents extends Session {
  agents: Array<Agent>;
  actionCount: number;
  pendingCount: number;
}

export interface AgentWithStats extends Agent {
  totalSessions: number;
  totalActions: number;
  successRate: string;
  lastSessionAt?: string;
}

// ============================================================================
// Action Payloads (parsed from JSON)
// ============================================================================

export interface RunCommandPayload {
  command: string;
  args?: Array<string>;
  cwd?: string;
  timeout?: number;
  safeToAutoRun?: boolean;
}

export interface DevServerPayload {
  command: string;
  port?: number;
  cwd?: string;
}

export interface ReadFilePayload {
  path: string;
  startLine?: number;
  endLine?: number;
}

export interface WriteFilePayload {
  path: string;
  content: string;
}

export interface EditFilePayload {
  path: string;
  diff: string;
}

export interface ListFilesPayload {
  path: string;
  pattern?: string;
  maxDepth?: number;
}

export interface GitPayload {
  operation: "status" | "diff" | "checkout" | "commit";
  branch?: string;
  message?: string;
  files?: Array<string>;
}

export interface NotifyPayload {
  message: string;
  level?: EventLevel;
}

// Agent question with options (like Claude's AskUserQuestion)
export interface AgentQuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface AgentQuestion {
  id: string;
  sessionId: string;
  question: string;
  options?: Array<AgentQuestionOption>;
  multiSelect?: boolean;
  answered: boolean;
  answer?: string | Array<string>;
  createdAt: string;
}

export interface SleepPayload {
  durationMs: number;
}

// ============================================================================
// Event Payloads
// ============================================================================

export interface ApprovalRequestedEvent {
  approvalId: string;
  actionId: string;
  sessionId: string;
  actionType: ActionType;
  summary?: string;
  payload: unknown;
  createdAt: string;
}

export interface ApprovalResolvedEvent {
  approvalId: string;
  actionId: string;
  state: "approved" | "rejected";
  reviewer: string;
  reason?: string;
}

export interface ActionFinishedEvent {
  actionId: string;
  sessionId: string;
  status: ActionStatus;
  output?: string;
  error?: string;
}

export interface ModeChangedEvent {
  mode: BridgeMode;
}

// ============================================================================
// Utility Types
// ============================================================================

export type ActionRisk = "low" | "medium" | "high";

export const getActionRisk = (actionType: ActionType): ActionRisk => {
  const lowRisk: Array<ActionType> = [
    "read_file",
    "list_files",
    "git_status",
    "git_diff",
    "notify",
    "sleep",
  ];
  const mediumRisk: Array<ActionType> = ["search_web", "open_url"];

  if (lowRisk.includes(actionType)) return "low";
  if (mediumRisk.includes(actionType)) return "medium";
  return "high";
};

export const getActionTypeLabel = (actionType: ActionType): string => {
  const labels: Record<ActionType, string> = {
    run_command: "Run Command",
    start_dev_server: "Start Dev Server",
    stop_dev_server: "Stop Dev Server",
    read_file: "Read File",
    write_file: "Write File",
    edit_file: "Edit File",
    list_files: "List Files",
    delete_file: "Delete File",
    search_web: "Search Web",
    open_url: "Open URL",
    git_status: "Git Status",
    git_diff: "Git Diff",
    git_checkout: "Git Checkout",
    git_commit: "Git Commit",
    notify: "Notify",
    sleep: "Sleep",
  };
  return labels[actionType] ?? actionType;
};

export const getStatusColor = (
  status: ActionStatus | SessionState | ApprovalState,
): string => {
  const colors: Record<string, string> = {
    pending: "text-yellow-500",
    running: "text-blue-500",
    active: "text-blue-500",
    done: "text-green-500",
    approved: "text-green-500",
    failed: "text-red-500",
    rejected: "text-red-500",
    blocked: "text-orange-500",
    idle: "text-gray-500",
  };
  return colors[status] ?? "text-gray-500";
};
