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
    Idle,
}

impl CommandStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            CommandStatus::Running => "running",
            CommandStatus::Queued => "queued",
            CommandStatus::Success => "success",
            CommandStatus::Failed => "failed",
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
    pub logs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunQueueItem {
    pub name: String,
    pub repo: String,
    pub eta: String,
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
