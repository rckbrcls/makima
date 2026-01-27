use crate::types::CommandStatus;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionLogEvent {
    pub repo: String,
    pub command: String,
    pub line: String,
    pub stream: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionStartedEvent {
    pub repo: String,
    pub command: String,
    pub pid: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionFinishedEvent {
    pub repo: String,
    pub command: String,
    pub status: CommandStatus,
    pub duration: String,
    pub exit_code: Option<i32>,
}
