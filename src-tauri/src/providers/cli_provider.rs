//! CLI Provider - Controls CLI agents via process/PTY
//!
//! This provider manages AI CLI tools (Claude Code, Codex, Gemini Code) as child processes,
//! communicating via the Commander Agent Bridge (CAB) protocol using NDJSON.

use super::Provider;
use crate::database;
use crate::types::{
    Agent, AgentStatus, BridgeMessage, BridgeMessageType, BridgeMode, Session, SessionState,
};
use crate::utils::current_timestamp;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::{Arc, Mutex, RwLock};
use std::thread;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// Active CLI session with process handles
pub struct CliSession {
    pub session_id: String,
    pub agent_id: String,
    pub process: Child,
    pub stdin: Arc<Mutex<ChildStdin>>,
    pub is_running: Arc<Mutex<bool>>,
    pub mode: BridgeMode,
    pub working_dir: PathBuf,
}

impl CliSession {
    /// Send a message to the CLI via stdin (NDJSON format)
    pub fn send_message(&self, message: &BridgeMessage) -> Result<(), String> {
        let json = serde_json::to_string(message)
            .map_err(|e| format!("Failed to serialize message: {}", e))?;

        let mut stdin = self.stdin.lock().map_err(|e| e.to_string())?;
        writeln!(stdin, "{}", json).map_err(|e| format!("Failed to write to stdin: {}", e))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush stdin: {}", e))?;

        Ok(())
    }

    /// Send hello.ack message to CLI
    pub fn send_hello_ack(&self) -> Result<(), String> {
        let message = BridgeMessage {
            id: Uuid::new_v4().to_string(),
            message_type: BridgeMessageType::HelloAck,
            session_id: self.session_id.clone(),
            agent_id: self.agent_id.clone(),
            timestamp: current_timestamp(),
            payload: serde_json::json!({
                "protocol": "cab/1.0",
                "mode": match self.mode {
                    BridgeMode::Safe => "safe",
                    BridgeMode::Auto => "auto",
                },
                "workspace": self.working_dir.to_string_lossy()
            }),
        };
        self.send_message(&message)
    }

    /// Send action result to CLI
    pub fn send_action_result(
        &self,
        action_id: &str,
        status: &str,
        output: Option<&str>,
        error: Option<&str>,
    ) -> Result<(), String> {
        let mut payload = serde_json::json!({
            "actionId": action_id,
            "status": status
        });

        if let Some(out) = output {
            payload["output"] = serde_json::Value::String(out.to_string());
        }
        if let Some(err) = error {
            payload["error"] = serde_json::Value::String(err.to_string());
        }

        let message = BridgeMessage {
            id: Uuid::new_v4().to_string(),
            message_type: BridgeMessageType::ActionResult,
            session_id: self.session_id.clone(),
            agent_id: self.agent_id.clone(),
            timestamp: current_timestamp(),
            payload,
        };
        self.send_message(&message)
    }

    /// Send approval result to CLI
    pub fn send_approval_result(
        &self,
        approval_id: &str,
        state: &str,
        reason: Option<&str>,
    ) -> Result<(), String> {
        let mut payload = serde_json::json!({
            "approvalId": approval_id,
            "state": state
        });

        if let Some(r) = reason {
            payload["reason"] = serde_json::Value::String(r.to_string());
        }

        let message = BridgeMessage {
            id: Uuid::new_v4().to_string(),
            message_type: BridgeMessageType::ApprovalResult,
            session_id: self.session_id.clone(),
            agent_id: self.agent_id.clone(),
            timestamp: current_timestamp(),
            payload,
        };
        self.send_message(&message)
    }

    /// Send session mode change to CLI
    pub fn send_set_mode(&self, mode: &BridgeMode) -> Result<(), String> {
        let message = BridgeMessage {
            id: Uuid::new_v4().to_string(),
            message_type: BridgeMessageType::SessionSetMode,
            session_id: self.session_id.clone(),
            agent_id: self.agent_id.clone(),
            timestamp: current_timestamp(),
            payload: serde_json::json!({
                "mode": match mode {
                    BridgeMode::Safe => "safe",
                    BridgeMode::Auto => "auto",
                }
            }),
        };
        self.send_message(&message)
    }

    /// Terminate the CLI process
    pub fn terminate(&mut self) -> Result<(), String> {
        *self.is_running.lock().map_err(|e| e.to_string())? = false;
        self.process
            .kill()
            .map_err(|e| format!("Failed to kill process: {}", e))
    }
}

/// CLI Provider manages CLI agent processes
pub struct CliProvider {
    /// Active sessions indexed by session_id
    sessions: RwLock<HashMap<String, Arc<Mutex<CliSession>>>>,
    /// CLI command configurations by name
    cli_configs: RwLock<HashMap<String, CliConfig>>,
}

/// Configuration for a CLI tool
#[derive(Clone)]
pub struct CliConfig {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
}

impl Default for CliProvider {
    fn default() -> Self {
        Self::new()
    }
}

impl CliProvider {
    /// Create a new CLI provider
    pub fn new() -> Self {
        let mut configs = HashMap::new();

        // Default CLI configurations
        configs.insert(
            "claude".to_string(),
            CliConfig {
                name: "claude".to_string(),
                command: "claude".to_string(),
                args: vec!["--cab".to_string()], // CAB protocol flag
                env: HashMap::new(),
            },
        );

        configs.insert(
            "codex".to_string(),
            CliConfig {
                name: "codex".to_string(),
                command: "codex".to_string(),
                args: vec!["--bridge".to_string()],
                env: HashMap::new(),
            },
        );

        configs.insert(
            "gemini".to_string(),
            CliConfig {
                name: "gemini".to_string(),
                command: "gemini-code".to_string(),
                args: vec!["--protocol".to_string(), "cab".to_string()],
                env: HashMap::new(),
            },
        );

        Self {
            sessions: RwLock::new(HashMap::new()),
            cli_configs: RwLock::new(configs),
        }
    }

    /// Register a custom CLI configuration
    pub fn register_cli(&self, config: CliConfig) -> Result<(), String> {
        let mut configs = self.cli_configs.write().map_err(|e| e.to_string())?;
        configs.insert(config.name.clone(), config);
        Ok(())
    }

    /// Get session by ID
    pub fn get_session(&self, session_id: &str) -> Option<Arc<Mutex<CliSession>>> {
        self.sessions
            .read()
            .ok()
            .and_then(|s| s.get(session_id).cloned())
    }

    /// Start a CLI process for the given agent and session
    pub fn spawn_cli(
        &self,
        agent: &Agent,
        session: &Session,
        working_dir: &Path,
        mode: BridgeMode,
        app: Option<AppHandle>,
        db_path: Option<PathBuf>,
    ) -> Result<Arc<Mutex<CliSession>>, String> {
        // Determine CLI command from agent name or default
        let cli_name = agent.name.to_lowercase();
        let configs = self.cli_configs.read().map_err(|e| e.to_string())?;

        let config = configs
            .get(&cli_name)
            .or_else(|| configs.get("claude"))
            .ok_or_else(|| "No CLI configuration found".to_string())?
            .clone();

        // Build command with goal as argument
        let mut cmd = Command::new(&config.command);
        cmd.args(&config.args)
            .current_dir(working_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Add environment variables
        for (key, value) in &config.env {
            cmd.env(key, value);
        }

        // Add the goal as the prompt/task
        cmd.arg(&session.goal);

        let mut process = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn CLI process '{}': {}", config.command, e))?;

        let stdin = process
            .stdin
            .take()
            .ok_or_else(|| "Failed to capture stdin".to_string())?;

        let stdout = process
            .stdout
            .take()
            .ok_or_else(|| "Failed to capture stdout".to_string())?;

        let cli_session = CliSession {
            session_id: session.id.clone(),
            agent_id: agent.id.clone(),
            process,
            stdin: Arc::new(Mutex::new(stdin)),
            is_running: Arc::new(Mutex::new(true)),
            mode,
            working_dir: working_dir.to_path_buf(),
        };

        let session_arc = Arc::new(Mutex::new(cli_session));

        // Store session
        {
            let mut sessions = self.sessions.write().map_err(|e| e.to_string())?;
            sessions.insert(session.id.clone(), Arc::clone(&session_arc));
        }

        // Start stdout listener in background thread
        if let (Some(app), Some(db)) = (app, db_path) {
            self.start_stdout_listener(Arc::clone(&session_arc), stdout, app, db);
        }

        Ok(session_arc)
    }

    /// Start listening to stdout from the CLI process
    fn start_stdout_listener(
        &self,
        session: Arc<Mutex<CliSession>>,
        stdout: ChildStdout,
        app: AppHandle,
        db_path: PathBuf,
    ) {
        thread::spawn(move || {
            let reader = BufReader::new(stdout);

            for line_result in reader.lines() {
                // Check if still running
                if let Ok(sess) = session.lock() {
                    if let Ok(running) = sess.is_running.lock() {
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

                        // Try to parse as NDJSON
                        match serde_json::from_str::<BridgeMessage>(&line) {
                            Ok(message) => {
                                if let Err(e) =
                                    handle_cli_message(&session, &message, &app, &db_path)
                                {
                                    log::error!("Failed to handle CLI message: {}", e);
                                }
                            }
                            Err(_) => {
                                // Not NDJSON - emit as raw output
                                let _ = app.emit(
                                    "agent://output",
                                    serde_json::json!({
                                        "type": "stdout",
                                        "line": line,
                                        "session_id": session.lock().map(|s| s.session_id.clone()).unwrap_or_default()
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

            log::info!("CLI stdout listener ended");
        });
    }

    /// Stop a session by ID
    pub fn stop_cli_session(&self, session_id: &str) -> Result<(), String> {
        let session = {
            let sessions = self.sessions.read().map_err(|e| e.to_string())?;
            sessions.get(session_id).cloned()
        };

        if let Some(sess) = session {
            let mut s = sess.lock().map_err(|e| e.to_string())?;
            s.terminate()?;
        }

        // Remove from active sessions
        {
            let mut sessions = self.sessions.write().map_err(|e| e.to_string())?;
            sessions.remove(session_id);
        }

        Ok(())
    }
}

impl Provider for CliProvider {
    fn start_session(
        &self,
        agent: &Agent,
        session: &Session,
        working_dir: &Path,
    ) -> Result<(), String> {
        // Get mode from database or default to safe
        let mode = BridgeMode::Safe;

        // Spawn CLI without app handle (will be set up separately)
        let session_arc = self.spawn_cli(agent, session, working_dir, mode, None, None)?;

        // Send hello.ack
        let sess = session_arc.lock().map_err(|e| e.to_string())?;
        sess.send_hello_ack()?;

        Ok(())
    }

    fn stop_session(&self, session_id: &str) -> Result<(), String> {
        self.stop_cli_session(session_id)
    }

    fn pause_session(&self, session_id: &str) -> Result<(), String> {
        // CLI sessions can't really be paused - just log
        log::info!(
            "Pause requested for session {} (CLI doesn't support pause)",
            session_id
        );
        Ok(())
    }

    fn resume_session(&self, session_id: &str) -> Result<(), String> {
        log::info!(
            "Resume requested for session {} (CLI doesn't support pause)",
            session_id
        );
        Ok(())
    }

    fn get_status(&self, agent_id: &str) -> Result<AgentStatus, String> {
        // Check if there's any active session for this agent
        let sessions = self.sessions.read().map_err(|e| e.to_string())?;

        for (_, session) in sessions.iter() {
            if let Ok(s) = session.lock() {
                if s.agent_id == agent_id {
                    if let Ok(running) = s.is_running.lock() {
                        if *running {
                            return Ok(AgentStatus::Running);
                        }
                    }
                }
            }
        }

        Ok(AgentStatus::Idle)
    }

    fn is_available(&self) -> bool {
        // Check if any CLI is available
        // For now, just return true - could check if commands exist
        true
    }

    fn name(&self) -> &str {
        "cli"
    }
}

/// Handle incoming message from CLI
fn handle_cli_message(
    session: &Arc<Mutex<CliSession>>,
    message: &BridgeMessage,
    app: &AppHandle,
    db_path: &Path,
) -> Result<(), String> {
    let sess = session.lock().map_err(|e| e.to_string())?;

    match message.message_type {
        BridgeMessageType::Hello => {
            // CLI is ready, send hello.ack
            sess.send_hello_ack()?;
        }
        BridgeMessageType::Log => {
            // Forward log to frontend
            let _ = app.emit("agent://log", &message.payload);
        }
        BridgeMessageType::Plan => {
            // Forward plan to frontend
            let _ = app.emit("agent://plan", &message.payload);

            // Update agent status to planning
            let _ = database::update_agent_status(db_path, &sess.agent_id, &AgentStatus::Planning);
        }
        BridgeMessageType::ActionRequest => {
            // Handle action request - create action and possibly approval
            let action_payload = &message.payload;

            // Create action in database
            let action_id = Uuid::new_v4().to_string();
            let action_type = action_payload
                .get("action")
                .and_then(|a| a.get("type"))
                .and_then(|t| t.as_str())
                .unwrap_or("run_command");

            let summary = action_payload
                .get("action")
                .and_then(|a| a.get("summary"))
                .and_then(|s| s.as_str());

            // Emit to frontend for approval UI
            let _ = app.emit(
                "agent://action-request",
                serde_json::json!({
                    "action_id": action_id,
                    "session_id": sess.session_id,
                    "agent_id": sess.agent_id,
                    "type": action_type,
                    "summary": summary,
                    "payload": action_payload,
                    "mode": match sess.mode {
                        BridgeMode::Safe => "safe",
                        BridgeMode::Auto => "auto",
                    }
                }),
            );
        }
        BridgeMessageType::ActionCancel => {
            // Handle action cancellation
            let action_id = message.payload.get("actionId").and_then(|v| v.as_str());
            if let Some(id) = action_id {
                let _ = app.emit(
                    "agent://action-cancel",
                    serde_json::json!({
                        "action_id": id,
                        "session_id": sess.session_id
                    }),
                );
            }
        }
        BridgeMessageType::SessionEnd => {
            // Session ended by CLI
            let state = message
                .payload
                .get("state")
                .and_then(|v| v.as_str())
                .unwrap_or("done");

            let new_state = match state {
                "failed" | "aborted" => SessionState::Failed,
                _ => SessionState::Done,
            };

            let _ = database::update_session_state(db_path, &sess.session_id, &new_state);
            let _ = database::update_agent_status(db_path, &sess.agent_id, &AgentStatus::Idle);

            let _ = app.emit(
                "agent://session-end",
                serde_json::json!({
                    "session_id": sess.session_id,
                    "agent_id": sess.agent_id,
                    "state": state
                }),
            );
        }
        BridgeMessageType::Ping => {
            // Respond with pong
            let pong = BridgeMessage {
                id: Uuid::new_v4().to_string(),
                message_type: BridgeMessageType::Pong,
                session_id: sess.session_id.clone(),
                agent_id: sess.agent_id.clone(),
                timestamp: current_timestamp(),
                payload: serde_json::json!({}),
            };
            sess.send_message(&pong)?;
        }
        _ => {
            log::debug!("Unhandled message type: {:?}", message.message_type);
        }
    }

    Ok(())
}
