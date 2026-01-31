use serde::{Deserialize, Serialize};
use std::{
    sync::{Arc, Mutex},
    time::Instant,
};

pub const LOG_CAPACITY: usize = 500;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RepositoryStatus {
    Active,
    Idle,
    Warn,
}

impl RepositoryStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            RepositoryStatus::Active => "active",
            RepositoryStatus::Idle => "idle",
            RepositoryStatus::Warn => "warn",
        }
    }
}

pub fn parse_repository_status(value: &str) -> RepositoryStatus {
    match value {
        "active" => RepositoryStatus::Active,
        "warn" => RepositoryStatus::Warn,
        _ => RepositoryStatus::Idle,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CommandStatus {
    Running,
    Queued,
    Success,
    Failed,
    Stopped,
    Idle,
}

impl CommandStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            CommandStatus::Running => "running",
            CommandStatus::Queued => "queued",
            CommandStatus::Success => "success",
            CommandStatus::Failed => "failed",
            CommandStatus::Stopped => "stopped",
            CommandStatus::Idle => "idle",
        }
    }
}

pub fn parse_command_status(value: &str) -> CommandStatus {
    match value {
        "running" => CommandStatus::Running,
        "queued" => CommandStatus::Queued,
        "success" => CommandStatus::Success,
        "failed" => CommandStatus::Failed,
        "stopped" => CommandStatus::Stopped,
        _ => CommandStatus::Idle,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CommandType {
    Run,
    Build,
    Test,
    Lint,
    Check,
    Bundle,
}

impl CommandType {
    pub fn as_str(&self) -> &'static str {
        match self {
            CommandType::Run => "run",
            CommandType::Build => "build",
            CommandType::Test => "test",
            CommandType::Lint => "lint",
            CommandType::Check => "check",
            CommandType::Bundle => "bundle",
        }
    }
}

pub fn parse_command_type(value: &str) -> CommandType {
    match value {
        "build" => CommandType::Build,
        "test" => CommandType::Test,
        "lint" => CommandType::Lint,
        "check" => CommandType::Check,
        "bundle" => CommandType::Bundle,
        _ => CommandType::Run,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum StepState {
    Done,
    Running,
    Pending,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    pub name: String,
    pub path: String,
    pub branch: String,
    pub status: RepositoryStatus,
    pub tech: Vec<String>,
    pub last_run: String,
    pub running: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoBranches {
    pub current: Option<String>,
    pub branches: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Command {
    pub name: String,
    pub command: String,
    #[serde(rename = "type")]
    pub command_type: CommandType,
    pub status: CommandStatus,
    pub duration: String,
    pub last_run: String,
    pub repo: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveExecution {
    pub repo: String,
    pub command: String,
    pub pid: u32,
    pub cpu: String,
    pub ram: String,
    pub logs: Vec<ExecutionLogLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionLogLine {
    pub line: String,
    pub stream: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunQueueItem {
    pub id: u32,
    pub name: String,
    pub repo: String,
    pub command: String,
    pub command_type: CommandType,
    pub queued_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineStep {
    pub label: String,
    pub state: StepState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pipeline {
    pub repo: String,
    pub steps: Vec<PipelineStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PipelineTemplate {
    pub id: Option<u32>,
    pub name: String,
    pub repo: Option<String>,
    pub steps: Vec<PipelineStep>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionHistoryItem {
    pub id: u32,
    pub name: String,
    pub repo: String,
    pub status: CommandStatus,
    pub duration: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryStats {
    pub total_runs: u32,
    pub success_rate: String,
    pub avg_duration: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardState {
    pub repositories: Vec<Repository>,
    pub commands: Vec<Command>,
    pub live_executions: Vec<LiveExecution>,
    pub run_queue: Vec<RunQueueItem>,
    pub pipelines: Vec<Pipeline>,
    pub execution_history: Vec<ExecutionHistoryItem>,
    pub history_stats: HistoryStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunCommandRequest {
    pub repo: String,
    pub name: Option<String>,
    pub command: String,
    pub command_type: Option<CommandType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StopCommandRequest {
    pub repo: String,
    pub command: String,
}

#[derive(Debug)]
pub struct ProcessEntry {
    pub child: Arc<Mutex<std::process::Child>>,
    pub repo: String,
    pub command_name: String,
    pub started_at: Instant,
}

// =============================================================================
// Agent System Types
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    Idle,
    Planning,
    Running,
    WaitingApproval,
    Error,
}

impl AgentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            AgentStatus::Idle => "idle",
            AgentStatus::Planning => "planning",
            AgentStatus::Running => "running",
            AgentStatus::WaitingApproval => "waiting_approval",
            AgentStatus::Error => "error",
        }
    }
}

pub fn parse_agent_status(value: &str) -> AgentStatus {
    match value {
        "planning" => AgentStatus::Planning,
        "running" => AgentStatus::Running,
        "waiting_approval" => AgentStatus::WaitingApproval,
        "error" => AgentStatus::Error,
        _ => AgentStatus::Idle,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AgentProvider {
    Cli,
    Local,
    Api,
}

impl AgentProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            AgentProvider::Cli => "cli",
            AgentProvider::Local => "local",
            AgentProvider::Api => "api",
        }
    }
}

pub fn parse_agent_provider(value: &str) -> AgentProvider {
    match value {
        "local" => AgentProvider::Local,
        "api" => AgentProvider::Api,
        _ => AgentProvider::Cli,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SessionState {
    Active,
    Done,
    Failed,
}

impl SessionState {
    pub fn as_str(&self) -> &'static str {
        match self {
            SessionState::Active => "active",
            SessionState::Done => "done",
            SessionState::Failed => "failed",
        }
    }
}

pub fn parse_session_state(value: &str) -> SessionState {
    match value {
        "done" => SessionState::Done,
        "failed" => SessionState::Failed,
        _ => SessionState::Active,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ActionType {
    RunCommand,
    StartDevServer,
    StopDevServer,
    ReadFile,
    WriteFile,
    EditFile,
    ListFiles,
    DeleteFile,
    SearchWeb,
    OpenUrl,
    GitStatus,
    GitDiff,
    GitCheckout,
    GitCommit,
    Notify,
    Sleep,
}

impl ActionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ActionType::RunCommand => "run_command",
            ActionType::StartDevServer => "start_dev_server",
            ActionType::StopDevServer => "stop_dev_server",
            ActionType::ReadFile => "read_file",
            ActionType::WriteFile => "write_file",
            ActionType::EditFile => "edit_file",
            ActionType::ListFiles => "list_files",
            ActionType::DeleteFile => "delete_file",
            ActionType::SearchWeb => "search_web",
            ActionType::OpenUrl => "open_url",
            ActionType::GitStatus => "git_status",
            ActionType::GitDiff => "git_diff",
            ActionType::GitCheckout => "git_checkout",
            ActionType::GitCommit => "git_commit",
            ActionType::Notify => "notify",
            ActionType::Sleep => "sleep",
        }
    }
}

pub fn parse_action_type(value: &str) -> ActionType {
    match value {
        "run_command" => ActionType::RunCommand,
        "start_dev_server" => ActionType::StartDevServer,
        "stop_dev_server" => ActionType::StopDevServer,
        "read_file" => ActionType::ReadFile,
        "write_file" => ActionType::WriteFile,
        "edit_file" => ActionType::EditFile,
        "list_files" => ActionType::ListFiles,
        "delete_file" => ActionType::DeleteFile,
        "search_web" => ActionType::SearchWeb,
        "open_url" => ActionType::OpenUrl,
        "git_status" => ActionType::GitStatus,
        "git_diff" => ActionType::GitDiff,
        "git_checkout" => ActionType::GitCheckout,
        "git_commit" => ActionType::GitCommit,
        "notify" => ActionType::Notify,
        "sleep" => ActionType::Sleep,
        _ => ActionType::RunCommand,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ActionStatus {
    Pending,
    Running,
    Done,
    Failed,
    Blocked,
    Rejected,
}

impl ActionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ActionStatus::Pending => "pending",
            ActionStatus::Running => "running",
            ActionStatus::Done => "done",
            ActionStatus::Failed => "failed",
            ActionStatus::Blocked => "blocked",
            ActionStatus::Rejected => "rejected",
        }
    }
}

pub fn parse_action_status(value: &str) -> ActionStatus {
    match value {
        "running" => ActionStatus::Running,
        "done" => ActionStatus::Done,
        "failed" => ActionStatus::Failed,
        "blocked" => ActionStatus::Blocked,
        "rejected" => ActionStatus::Rejected,
        _ => ActionStatus::Pending,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ApprovalState {
    Pending,
    Approved,
    Rejected,
    Expired,
    Canceled,
}

impl ApprovalState {
    pub fn as_str(&self) -> &'static str {
        match self {
            ApprovalState::Pending => "pending",
            ApprovalState::Approved => "approved",
            ApprovalState::Rejected => "rejected",
            ApprovalState::Expired => "expired",
            ApprovalState::Canceled => "canceled",
        }
    }
}

pub fn parse_approval_state(value: &str) -> ApprovalState {
    match value {
        "approved" => ApprovalState::Approved,
        "rejected" => ApprovalState::Rejected,
        "expired" => ApprovalState::Expired,
        "canceled" => ApprovalState::Canceled,
        _ => ApprovalState::Pending,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EventLevel {
    Debug,
    Info,
    Warn,
    Error,
}

impl EventLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            EventLevel::Debug => "debug",
            EventLevel::Info => "info",
            EventLevel::Warn => "warn",
            EventLevel::Error => "error",
        }
    }
}

pub fn parse_event_level(value: &str) -> EventLevel {
    match value {
        "debug" => EventLevel::Debug,
        "warn" => EventLevel::Warn,
        "error" => EventLevel::Error,
        _ => EventLevel::Info,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EventSource {
    Tool,
    Cli,
    System,
}

impl EventSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            EventSource::Tool => "tool",
            EventSource::Cli => "cli",
            EventSource::System => "system",
        }
    }
}

pub fn parse_event_source(value: &str) -> EventSource {
    match value {
        "tool" => EventSource::Tool,
        "cli" => EventSource::Cli,
        _ => EventSource::System,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ArtifactKind {
    Log,
    Diff,
    File,
    Output,
}

impl ArtifactKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            ArtifactKind::Log => "log",
            ArtifactKind::Diff => "diff",
            ArtifactKind::File => "file",
            ArtifactKind::Output => "output",
        }
    }
}

pub fn parse_artifact_kind(value: &str) -> ArtifactKind {
    match value {
        "diff" => ArtifactKind::Diff,
        "file" => ArtifactKind::File,
        "output" => ArtifactKind::Output,
        _ => ArtifactKind::Log,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BridgeMode {
    Safe,
    Auto,
}

impl BridgeMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            BridgeMode::Safe => "safe",
            BridgeMode::Auto => "auto",
        }
    }
}

pub fn parse_bridge_mode(value: &str) -> BridgeMode {
    match value {
        "auto" => BridgeMode::Auto,
        _ => BridgeMode::Safe,
    }
}

// =============================================================================
// Agent System Structs
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub provider: AgentProvider,
    pub model: Option<String>,
    pub status: AgentStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRepo {
    pub agent_id: String,
    pub repo: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub agent_id: String,
    pub goal: String,
    pub state: SessionState,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Action {
    pub id: String,
    pub session_id: String,
    pub action_type: ActionType,
    pub status: ActionStatus,
    pub payload: String, // JSON string
    pub summary: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Approval {
    pub id: String,
    pub action_id: String,
    pub state: ApprovalState,
    pub reviewer: Option<String>,
    pub reason: Option<String>,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: String,
    pub session_id: Option<String>,
    pub agent_id: Option<String>,
    pub level: EventLevel,
    pub message: String,
    pub source: EventSource,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Artifact {
    pub id: String,
    pub session_id: String,
    pub kind: ArtifactKind,
    pub data: String, // JSON or base64 encoded
    pub created_at: String,
}

// =============================================================================
// Agent Dashboard State
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentWithRepos {
    #[serde(flatten)]
    pub agent: Agent,
    pub repos: Vec<String>,
    pub current_session: Option<Session>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalWithAction {
    #[serde(flatten)]
    pub approval: Approval,
    pub action: Option<Action>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentDashboardState {
    pub agents: Vec<AgentWithRepos>,
    pub sessions: Vec<Session>,
    pub pending_approvals: Vec<ApprovalWithAction>,
    pub recent_events: Vec<Event>,
    pub global_mode: BridgeMode,
}

// =============================================================================
// Request/Response Types for Agent Commands
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAgentRequest {
    pub name: String,
    pub provider: AgentProvider,
    pub model: Option<String>,
    pub repos: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionRequest {
    pub agent_id: String,
    pub goal: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalRequest {
    pub approval_id: String,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetModeRequest {
    pub agent_id: Option<String>,
    pub mode: BridgeMode,
}

// =============================================================================
// Bridge Protocol Messages (NDJSON)
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BridgeMessageType {
    // CLI -> Company
    Hello,
    Log,
    Plan,
    ActionRequest,
    ActionCancel,
    SessionEnd,
    Ping,
    // Company -> CLI
    HelloAck,
    ActionResult,
    ApprovalRequested,
    ApprovalResult,
    SessionSetMode,
    Pong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeMessage {
    #[serde(rename = "type")]
    pub message_type: BridgeMessageType,
    pub id: String,
    pub session_id: String,
    pub agent_id: String,
    pub timestamp: String,
    #[serde(flatten)]
    pub payload: serde_json::Value,
}

// Action payloads for Bridge Protocol
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunCommandPayload {
    pub repo: String,
    pub command: String,
    pub cwd: Option<String>,
    pub env: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DevServerPayload {
    pub repo: String,
    pub command: String,
    pub cwd: Option<String>,
    pub env: Option<std::collections::HashMap<String, String>>,
    pub port_hint: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadFilePayload {
    pub path: String,
    pub start_line: Option<u32>,
    pub end_line: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteFilePayload {
    pub path: String,
    pub content: String,
    pub mode: Option<String>, // "overwrite" | "append"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditFilePayload {
    pub path: String,
    pub diff: String,
    pub format: Option<String>, // "unified"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFilesPayload {
    pub path: String,
    pub recursive: Option<bool>,
    pub include: Option<Vec<String>>,
    pub exclude: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchWebPayload {
    pub query: String,
    pub recency_days: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenUrlPayload {
    pub url: String,
    pub mode: Option<String>, // "headless" | "preview"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitPayload {
    pub repo: String,
    pub path: Option<String>,
    pub branch: Option<String>,
    pub message: Option<String>,
    pub staged: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotifyPayload {
    pub level: EventLevel,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SleepPayload {
    pub ms: u64,
}

// Bridge action result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActionResultStatus {
    Ok,
    Failed,
    Blocked,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionResult {
    pub action_id: String,
    pub status: ActionResultStatus,
    pub output: Option<String>,
    pub error: Option<String>,
}
