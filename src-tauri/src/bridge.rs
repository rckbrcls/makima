//! Overseer Agent Bridge (CAB) Protocol
//!
//! This module implements the bridge between CLI agents (like Claude CLI, Codex, etc.)
//! and Overseer. It handles NDJSON communication for agent actions and their results.

use crate::database;
use crate::types::{
    Action, ActionStatus, ActionType, AgentStatus, Approval, ApprovalState, BridgeMessage,
    BridgeMessageType, BridgeMode, Event, EventLevel, EventSource, SessionState,
};
use crate::utils::current_timestamp;
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// Result type for bridge operations
pub type BridgeResult<T> = Result<T, String>;

/// Bridge connection state with a CLI agent process
pub struct BridgeConnection {
    pub agent_id: String,
    pub session_id: String,
    pub process: Child,
    pub stdin: Arc<Mutex<ChildStdin>>,
    pub mode: BridgeMode,
    pub is_running: Arc<Mutex<bool>>,
}

impl BridgeConnection {
    /// Create a new bridge connection for a CLI agent command
    pub fn new(
        agent_id: &str,
        session_id: &str,
        command: &str,
        args: &[String],
        working_dir: &str,
        mode: BridgeMode,
    ) -> BridgeResult<Self> {
        let mut process = Command::new(command)
            .args(args)
            .current_dir(working_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn CLI agent process: {}", e))?;

        let stdin = process
            .stdin
            .take()
            .ok_or_else(|| "Failed to capture stdin".to_string())?;

        Ok(Self {
            agent_id: agent_id.to_string(),
            session_id: session_id.to_string(),
            process,
            stdin: Arc::new(Mutex::new(stdin)),
            mode,
            is_running: Arc::new(Mutex::new(true)),
        })
    }

    /// Send a message to the CLI agent via stdin (NDJSON format)
    pub fn send_message(&self, message: &BridgeMessage) -> BridgeResult<()> {
        let json = serde_json::to_string(message)
            .map_err(|e| format!("Failed to serialize message: {}", e))?;

        let mut stdin = self.stdin.lock().map_err(|e| e.to_string())?;
        writeln!(stdin, "{}", json).map_err(|e| format!("Failed to write to stdin: {}", e))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush stdin: {}", e))?;

        Ok(())
    }

    /// Send approval result back to the CLI agent
    pub fn send_approval_result(
        &self,
        action_id: &str,
        approved: bool,
        reason: Option<&str>,
    ) -> BridgeResult<()> {
        let payload = serde_json::json!({
            "action_id": action_id,
            "approved": approved,
            "reason": reason
        });

        let message = BridgeMessage {
            id: Uuid::new_v4().to_string(),
            message_type: BridgeMessageType::ApprovalResult,
            session_id: self.session_id.clone(),
            agent_id: self.agent_id.clone(),
            payload,
            timestamp: current_timestamp(),
        };

        self.send_message(&message)
    }

    /// Terminate the CLI agent process
    pub fn terminate(&mut self) -> BridgeResult<()> {
        *self.is_running.lock().map_err(|e| e.to_string())? = false;
        self.process
            .kill()
            .map_err(|e| format!("Failed to kill process: {}", e))
    }
}

/// Parse an incoming NDJSON message from the CLI agent
pub fn parse_bridge_message(line: &str) -> BridgeResult<BridgeMessage> {
    serde_json::from_str(line).map_err(|e| format!("Failed to parse bridge message: {}", e))
}

/// Determine if an action requires approval based on mode and action type
pub fn requires_approval(action_type: &ActionType, mode: &BridgeMode) -> bool {
    match mode {
        BridgeMode::Auto => {
            // In auto mode, only sensitive actions require approval
            matches!(
                action_type,
                ActionType::WriteFile
                    | ActionType::EditFile
                    | ActionType::DeleteFile
                    | ActionType::GitCommit
                    | ActionType::GitCheckout
                    | ActionType::StartDevServer
            )
        }
        BridgeMode::Safe => {
            // In safe mode, all actions require approval except read-only ones
            !matches!(
                action_type,
                ActionType::ReadFile
                    | ActionType::ListFiles
                    | ActionType::GitStatus
                    | ActionType::GitDiff
            )
        }
    }
}

/// Handle an incoming action request from the CLI agent
///
/// This function:
/// 1. Creates an Action record in the database
/// 2. Checks if approval is required based on mode
/// 3. If approval required, creates an Approval record and emits event
/// 4. If no approval needed, returns immediately for execution
pub fn handle_action_request(
    db_path: &Path,
    app: &AppHandle,
    session_id: &str,
    agent_id: &str,
    message: &BridgeMessage,
    mode: &BridgeMode,
) -> BridgeResult<(Action, Option<Approval>)> {
    // Extract action type from message
    let action_type = match message.message_type {
        BridgeMessageType::ActionRequest => {
            let type_str = message
                .payload
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("run_command");
            parse_action_type_str(type_str)
        }
        _ => return Err("Not an action request".to_string()),
    };

    let now = current_timestamp();
    let action_id = Uuid::new_v4().to_string();

    // Create action record
    let action = Action {
        id: action_id.clone(),
        session_id: session_id.to_string(),
        action_type: action_type.clone(),
        status: ActionStatus::Pending,
        payload: serde_json::to_string(&message.payload).unwrap_or_default(),
        summary: message
            .payload
            .get("summary")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    database::create_action(db_path, &action)?;

    // Check if approval is required
    if requires_approval(&action_type, mode) {
        let approval_id = Uuid::new_v4().to_string();
        let approval = Approval {
            id: approval_id.clone(),
            action_id: action_id.clone(),
            state: ApprovalState::Pending,
            reviewer: None,
            reason: None,
            created_at: now.clone(),
            resolved_at: None,
        };

        database::create_approval(db_path, &approval)?;

        // Update action status
        database::update_action_status(db_path, &action_id, &ActionStatus::Blocked)?;

        // Emit approval request event to frontend
        let _ = app.emit(
            "agent://approval-request",
            serde_json::json!({
                "approval_id": approval_id,
                "action_id": action_id,
                "action_type": action_type.as_str(),
                "agent_id": agent_id,
                "session_id": session_id,
                "payload": message.payload
            }),
        );

        // Update agent status
        database::update_agent_status(db_path, agent_id, &AgentStatus::WaitingApproval)?;

        // Get updated action
        let updated_action = database::get_action(db_path, &action_id)?
            .ok_or_else(|| "Action not found after creation".to_string())?;

        Ok((updated_action, Some(approval)))
    } else {
        // No approval needed, mark as executing
        database::update_action_status(db_path, &action_id, &ActionStatus::Running)?;

        let updated_action = database::get_action(db_path, &action_id)?
            .ok_or_else(|| "Action not found after creation".to_string())?;

        Ok((updated_action, None))
    }
}

/// Process approval decision from the user
pub fn process_approval(
    db_path: &Path,
    connection: &BridgeConnection,
    approval_id: &str,
    approved: bool,
    reason: Option<&str>,
) -> BridgeResult<()> {
    let approval = database::get_approval(db_path, approval_id)?
        .ok_or_else(|| "Approval not found".to_string())?;

    let new_state = if approved {
        ApprovalState::Approved
    } else {
        ApprovalState::Rejected
    };

    database::resolve_approval(db_path, approval_id, &new_state, Some("user"), reason)?;

    // Update action status based on approval
    let new_action_status = if approved {
        ActionStatus::Running
    } else {
        ActionStatus::Failed
    };

    database::update_action_status(db_path, &approval.action_id, &new_action_status)?;

    // Update agent status
    database::update_agent_status(
        db_path,
        &connection.agent_id,
        if approved {
            &AgentStatus::Running
        } else {
            &AgentStatus::Idle
        },
    )?;

    // Send result back to CLI agent
    connection.send_approval_result(&approval.action_id, approved, reason)?;

    Ok(())
}

/// Start listening to stdout from the CLI agent and process messages
pub fn start_stdout_listener(
    db_path: std::path::PathBuf,
    app: AppHandle,
    connection: Arc<Mutex<BridgeConnection>>,
    stdout: ChildStdout,
) {
    thread::spawn(move || {
        let reader = BufReader::new(stdout);

        for line_result in reader.lines() {
            // Check if still running
            if let Ok(conn) = connection.lock() {
                if let Ok(running) = conn.is_running.lock() {
                    if !*running {
                        break;
                    }
                }
            }

            match line_result {
                Ok(line) => {
                    if line.is_empty() {
                        continue;
                    }

                    match parse_bridge_message(&line) {
                        Ok(message) => {
                            let conn = match connection.lock() {
                                Ok(c) => c,
                                Err(_) => continue,
                            };

                            match message.message_type {
                                BridgeMessageType::ActionRequest => {
                                    if let Err(e) = handle_action_request(
                                        &db_path,
                                        &app,
                                        &conn.session_id,
                                        &conn.agent_id,
                                        &message,
                                        &conn.mode,
                                    ) {
                                        log::error!("Failed to handle action request: {}", e);
                                    }
                                }
                                BridgeMessageType::ActionResult => {
                                    // Handle action result from CLI
                                    if let Some(action_id) =
                                        message.payload.get("action_id").and_then(|v| v.as_str())
                                    {
                                        let success = message
                                            .payload
                                            .get("success")
                                            .and_then(|v| v.as_bool())
                                            .unwrap_or(false);

                                        let status = if success {
                                            ActionStatus::Done
                                        } else {
                                            ActionStatus::Failed
                                        };

                                        let _ = database::update_action_status(
                                            &db_path, action_id, &status,
                                        );

                                        // Emit to frontend
                                        let _ = app.emit("agent://action-result", &message.payload);
                                    }
                                }
                                BridgeMessageType::Log => {
                                    // Log event
                                    if let Ok(event) = create_event_from_message(
                                        &conn.session_id,
                                        &conn.agent_id,
                                        &message,
                                    ) {
                                        let _ = database::create_event(&db_path, &event);
                                        let _ = app.emit(
                                            "agent://event",
                                            serde_json::to_value(&event).ok(),
                                        );
                                    }
                                }
                                BridgeMessageType::SessionEnd => {
                                    // Session ended by CLI
                                    let _ = database::update_session_state(
                                        &db_path,
                                        &conn.session_id,
                                        &SessionState::Done,
                                    );
                                    let _ = database::update_agent_status(
                                        &db_path,
                                        &conn.agent_id,
                                        &AgentStatus::Idle,
                                    );
                                    let _ = app.emit(
                                        "agent://session-end",
                                        serde_json::json!({
                                            "session_id": conn.session_id,
                                            "agent_id": conn.agent_id
                                        }),
                                    );
                                    break;
                                }
                                _ => {
                                    log::debug!(
                                        "Unhandled message type: {:?}",
                                        message.message_type
                                    );
                                }
                            }
                        }
                        Err(e) => {
                            log::warn!("Failed to parse bridge message: {} - line: {}", e, line);
                            // Emit raw output as event
                            let _ = app.emit(
                                "agent://output",
                                serde_json::json!({
                                    "type": "stdout",
                                    "line": line
                                }),
                            );
                        }
                    }
                }
                Err(e) => {
                    log::error!("Error reading stdout: {}", e);
                    break;
                }
            }
        }

        log::info!("Stdout listener ended");
    });
}

/// Parse action type from string
fn parse_action_type_str(s: &str) -> ActionType {
    match s {
        "run_command" => ActionType::RunCommand,
        "start_dev_server" | "dev_server" => ActionType::StartDevServer,
        "stop_dev_server" => ActionType::StopDevServer,
        "read_file" => ActionType::ReadFile,
        "write_file" => ActionType::WriteFile,
        "edit_file" => ActionType::EditFile,
        "list_files" => ActionType::ListFiles,
        "delete_file" => ActionType::DeleteFile,
        "search_web" => ActionType::SearchWeb,
        "open_url" => ActionType::OpenUrl,
        "git_status" | "git" => ActionType::GitStatus,
        "git_diff" => ActionType::GitDiff,
        "git_checkout" => ActionType::GitCheckout,
        "git_commit" => ActionType::GitCommit,
        "notify" => ActionType::Notify,
        "sleep" => ActionType::Sleep,
        _ => ActionType::RunCommand,
    }
}

/// Create an Event from a bridge message
fn create_event_from_message(
    session_id: &str,
    agent_id: &str,
    message: &BridgeMessage,
) -> BridgeResult<Event> {
    let level_str = message
        .payload
        .get("level")
        .and_then(|v| v.as_str())
        .unwrap_or("info");

    let level = match level_str {
        "debug" => EventLevel::Debug,
        "info" => EventLevel::Info,
        "warn" | "warning" => EventLevel::Warn,
        "error" => EventLevel::Error,
        _ => EventLevel::Info,
    };

    let msg = message
        .payload
        .get("message")
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown event")
        .to_string();

    Ok(Event {
        id: Uuid::new_v4().to_string(),
        session_id: Some(session_id.to_string()),
        agent_id: Some(agent_id.to_string()),
        level,
        message: msg,
        source: EventSource::Cli,
        created_at: current_timestamp(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_requires_approval_safe_mode() {
        // In safe mode, read operations don't need approval
        assert!(!requires_approval(&ActionType::ReadFile, &BridgeMode::Safe));
        assert!(!requires_approval(
            &ActionType::ListFiles,
            &BridgeMode::Safe
        ));

        // In safe mode, write operations need approval
        assert!(requires_approval(&ActionType::WriteFile, &BridgeMode::Safe));
        assert!(requires_approval(
            &ActionType::RunCommand,
            &BridgeMode::Safe
        ));
    }

    #[test]
    fn test_requires_approval_auto_mode() {
        // In auto mode, most operations don't need approval
        assert!(!requires_approval(&ActionType::ReadFile, &BridgeMode::Auto));
        assert!(!requires_approval(
            &ActionType::RunCommand,
            &BridgeMode::Auto
        ));

        // Sensitive operations still need approval in auto mode
        assert!(requires_approval(&ActionType::WriteFile, &BridgeMode::Auto));
        assert!(requires_approval(&ActionType::GitCommit, &BridgeMode::Auto));
    }
}
