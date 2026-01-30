//! Action Executor - Executes actions requested by AI agents
//!
//! This module handles the actual execution of actions like running commands,
//! reading/writing files, starting dev servers, etc.

use crate::database;
use crate::types::{Action, ActionStatus, ActionType};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

/// Result of executing an action
#[derive(Debug, Clone)]
pub struct ActionResult {
    pub action_id: String,
    pub status: ActionResultStatus,
    pub output: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ActionResultStatus {
    Ok,
    Failed,
    Blocked,
    Rejected,
}

impl ActionResultStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Ok => "ok",
            Self::Failed => "failed",
            Self::Blocked => "blocked",
            Self::Rejected => "rejected",
        }
    }
}

/// Action Executor handles execution of agent actions
pub struct ActionExecutor {
    /// Active dev servers indexed by session_id
    dev_servers: Arc<Mutex<HashMap<String, DevServer>>>,
}

/// Represents a running dev server
pub struct DevServer {
    pub session_id: String,
    pub command: String,
    pub process: Child,
    pub port: Option<u16>,
    pub is_running: Arc<Mutex<bool>>,
}

impl Default for ActionExecutor {
    fn default() -> Self {
        Self::new()
    }
}

impl ActionExecutor {
    pub fn new() -> Self {
        Self {
            dev_servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Execute an action and return the result
    pub fn execute(
        &self,
        action: &Action,
        working_dir: &Path,
        app: Option<&AppHandle>,
        db_path: Option<&Path>,
    ) -> ActionResult {
        let result = match &action.action_type {
            ActionType::RunCommand => self.execute_run_command(action, working_dir, app),
            ActionType::StartDevServer => self.execute_start_dev_server(action, working_dir, app),
            ActionType::StopDevServer => self.execute_stop_dev_server(action),
            ActionType::ReadFile => self.execute_read_file(action, working_dir),
            ActionType::WriteFile => self.execute_write_file(action, working_dir),
            ActionType::EditFile => self.execute_edit_file(action, working_dir),
            ActionType::ListFiles => self.execute_list_files(action, working_dir),
            ActionType::DeleteFile => self.execute_delete_file(action, working_dir),
            ActionType::SearchWeb => self.execute_search_web(action),
            ActionType::OpenUrl => self.execute_open_url(action),
            ActionType::GitStatus => self.execute_git_command(action, working_dir, &["status"]),
            ActionType::GitDiff => self.execute_git_diff(action, working_dir),
            ActionType::GitCheckout => self.execute_git_checkout(action, working_dir),
            ActionType::GitCommit => self.execute_git_commit(action, working_dir),
            ActionType::Notify => self.execute_notify(action, app),
            ActionType::Sleep => self.execute_sleep(action),
        };

        // Update action status in database
        if let Some(db) = db_path {
            let new_status = match result.status {
                ActionResultStatus::Ok => ActionStatus::Done,
                ActionResultStatus::Failed => ActionStatus::Failed,
                ActionResultStatus::Blocked => ActionStatus::Blocked,
                ActionResultStatus::Rejected => ActionStatus::Rejected,
            };
            let _ = database::update_action_status(db, &action.id, &new_status);
        }

        result
    }

    /// Execute a command
    fn execute_run_command(
        &self,
        action: &Action,
        working_dir: &Path,
        app: Option<&AppHandle>,
    ) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let command = payload
            .get("command")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let cwd = payload
            .get("cwd")
            .and_then(|v| v.as_str())
            .map(PathBuf::from)
            .unwrap_or_else(|| working_dir.to_path_buf());

        // Parse environment variables
        let mut env: HashMap<String, String> = HashMap::new();
        if let Some(env_obj) = payload.get("env").and_then(|v| v.as_object()) {
            for (k, v) in env_obj {
                if let Some(val) = v.as_str() {
                    env.insert(k.clone(), val.to_string());
                }
            }
        }

        // Execute command
        let output = Command::new("sh")
            .arg("-c")
            .arg(command)
            .current_dir(&cwd)
            .envs(&env)
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();

                // Emit output to frontend
                if let Some(app) = app {
                    let _ = app.emit(
                        "agent://command-output",
                        serde_json::json!({
                            "action_id": action.id,
                            "stdout": stdout,
                            "stderr": stderr,
                            "exit_code": out.status.code()
                        }),
                    );
                }

                if out.status.success() {
                    ActionResult {
                        action_id: action.id.clone(),
                        status: ActionResultStatus::Ok,
                        output: Some(stdout),
                        error: if stderr.is_empty() {
                            None
                        } else {
                            Some(stderr)
                        },
                    }
                } else {
                    ActionResult {
                        action_id: action.id.clone(),
                        status: ActionResultStatus::Failed,
                        output: Some(stdout),
                        error: Some(format!("Exit code: {:?}\n{}", out.status.code(), stderr)),
                    }
                }
            }
            Err(e) => ActionResult {
                action_id: action.id.clone(),
                status: ActionResultStatus::Failed,
                output: None,
                error: Some(format!("Failed to execute command: {}", e)),
            },
        }
    }

    /// Start a dev server
    fn execute_start_dev_server(
        &self,
        action: &Action,
        working_dir: &Path,
        app: Option<&AppHandle>,
    ) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let command = payload
            .get("command")
            .and_then(|v| v.as_str())
            .unwrap_or("npm run dev");

        let cwd = payload
            .get("cwd")
            .and_then(|v| v.as_str())
            .map(PathBuf::from)
            .unwrap_or_else(|| working_dir.to_path_buf());

        let port_hint = payload
            .get("portHint")
            .and_then(|v| v.as_u64())
            .map(|p| p as u16);

        // Start the dev server as a background process
        let mut cmd = Command::new("sh");
        cmd.arg("-c")
            .arg(command)
            .current_dir(&cwd)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        match cmd.spawn() {
            Ok(process) => {
                let session_id = action.session_id.clone();
                let is_running = Arc::new(Mutex::new(true));

                let dev_server = DevServer {
                    session_id: session_id.clone(),
                    command: command.to_string(),
                    process,
                    port: port_hint,
                    is_running,
                };

                // Store dev server
                if let Ok(mut servers) = self.dev_servers.lock() {
                    servers.insert(session_id.clone(), dev_server);
                }

                // Emit to frontend
                if let Some(app) = app {
                    let _ = app.emit(
                        "agent://dev-server-started",
                        serde_json::json!({
                            "action_id": action.id,
                            "session_id": session_id,
                            "command": command,
                            "port": port_hint
                        }),
                    );
                }

                ActionResult {
                    action_id: action.id.clone(),
                    status: ActionResultStatus::Ok,
                    output: Some(format!("Dev server started: {}", command)),
                    error: None,
                }
            }
            Err(e) => ActionResult {
                action_id: action.id.clone(),
                status: ActionResultStatus::Failed,
                output: None,
                error: Some(format!("Failed to start dev server: {}", e)),
            },
        }
    }

    /// Stop a dev server
    fn execute_stop_dev_server(&self, action: &Action) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let target = payload
            .get("target")
            .and_then(|v| v.as_str())
            .unwrap_or("last");

        if let Ok(mut servers) = self.dev_servers.lock() {
            if target == "last" {
                // Stop the last dev server for this session
                if let Some(mut server) = servers.remove(&action.session_id) {
                    if let Ok(mut running) = server.is_running.lock() {
                        *running = false;
                    }
                    let _ = server.process.kill();

                    return ActionResult {
                        action_id: action.id.clone(),
                        status: ActionResultStatus::Ok,
                        output: Some("Dev server stopped".to_string()),
                        error: None,
                    };
                }
            }
        }

        ActionResult {
            action_id: action.id.clone(),
            status: ActionResultStatus::Failed,
            output: None,
            error: Some("No dev server found to stop".to_string()),
        }
    }

    /// Read a file
    fn execute_read_file(&self, action: &Action, working_dir: &Path) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let path = payload.get("path").and_then(|v| v.as_str()).unwrap_or("");
        let full_path = working_dir.join(path);

        let start_line = payload
            .get("startLine")
            .and_then(|v| v.as_u64())
            .map(|l| l as usize);
        let end_line = payload
            .get("endLine")
            .and_then(|v| v.as_u64())
            .map(|l| l as usize);

        match fs::read_to_string(&full_path) {
            Ok(content) => {
                let output = if let (Some(start), Some(end)) = (start_line, end_line) {
                    content
                        .lines()
                        .skip(start.saturating_sub(1))
                        .take(end - start.saturating_sub(1) + 1)
                        .collect::<Vec<_>>()
                        .join("\n")
                } else {
                    content
                };

                ActionResult {
                    action_id: action.id.clone(),
                    status: ActionResultStatus::Ok,
                    output: Some(output),
                    error: None,
                }
            }
            Err(e) => ActionResult {
                action_id: action.id.clone(),
                status: ActionResultStatus::Failed,
                output: None,
                error: Some(format!("Failed to read file: {}", e)),
            },
        }
    }

    /// Write a file
    fn execute_write_file(&self, action: &Action, working_dir: &Path) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let path = payload.get("path").and_then(|v| v.as_str()).unwrap_or("");
        let content = payload
            .get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let mode = payload
            .get("mode")
            .and_then(|v| v.as_str())
            .unwrap_or("overwrite");

        let full_path = working_dir.join(path);

        // Create parent directories if needed
        if let Some(parent) = full_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let result = if mode == "append" {
            use std::fs::OpenOptions;
            use std::io::Write;

            OpenOptions::new()
                .append(true)
                .create(true)
                .open(&full_path)
                .and_then(|mut file| file.write_all(content.as_bytes()))
        } else {
            fs::write(&full_path, content)
        };

        match result {
            Ok(_) => ActionResult {
                action_id: action.id.clone(),
                status: ActionResultStatus::Ok,
                output: Some(format!("File written: {}", path)),
                error: None,
            },
            Err(e) => ActionResult {
                action_id: action.id.clone(),
                status: ActionResultStatus::Failed,
                output: None,
                error: Some(format!("Failed to write file: {}", e)),
            },
        }
    }

    /// Edit a file using a diff
    fn execute_edit_file(&self, action: &Action, working_dir: &Path) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let path = payload.get("path").and_then(|v| v.as_str()).unwrap_or("");
        let diff = payload.get("diff").and_then(|v| v.as_str()).unwrap_or("");

        let full_path = working_dir.join(path);

        // For now, we'll use patch command to apply the diff
        // In production, you'd want a proper diff application library
        let output = Command::new("patch")
            .args(["-p0", "--backup"])
            .current_dir(working_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();

        match output {
            Ok(mut child) => {
                if let Some(mut stdin) = child.stdin.take() {
                    use std::io::Write;
                    let _ = stdin.write_all(diff.as_bytes());
                }

                match child.wait_with_output() {
                    Ok(out) => {
                        if out.status.success() {
                            ActionResult {
                                action_id: action.id.clone(),
                                status: ActionResultStatus::Ok,
                                output: Some(format!("File edited: {}", path)),
                                error: None,
                            }
                        } else {
                            ActionResult {
                                action_id: action.id.clone(),
                                status: ActionResultStatus::Failed,
                                output: None,
                                error: Some(String::from_utf8_lossy(&out.stderr).to_string()),
                            }
                        }
                    }
                    Err(e) => ActionResult {
                        action_id: action.id.clone(),
                        status: ActionResultStatus::Failed,
                        output: None,
                        error: Some(format!("Failed to apply patch: {}", e)),
                    },
                }
            }
            Err(e) => ActionResult {
                action_id: action.id.clone(),
                status: ActionResultStatus::Failed,
                output: None,
                error: Some(format!("Failed to start patch: {}", e)),
            },
        }
    }

    /// List files in a directory
    fn execute_list_files(&self, action: &Action, working_dir: &Path) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let path = payload.get("path").and_then(|v| v.as_str()).unwrap_or(".");
        let recursive = payload
            .get("recursive")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let full_path = working_dir.join(path);

        let files: Vec<String> = if recursive {
            walkdir(&full_path, 10)
        } else {
            fs::read_dir(&full_path)
                .map(|entries| {
                    entries
                        .filter_map(|e| e.ok())
                        .map(|e| e.path().display().to_string())
                        .collect()
                })
                .unwrap_or_default()
        };

        ActionResult {
            action_id: action.id.clone(),
            status: ActionResultStatus::Ok,
            output: Some(files.join("\n")),
            error: None,
        }
    }

    /// Delete a file
    fn execute_delete_file(&self, action: &Action, working_dir: &Path) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let path = payload.get("path").and_then(|v| v.as_str()).unwrap_or("");
        let full_path = working_dir.join(path);

        match fs::remove_file(&full_path) {
            Ok(_) => ActionResult {
                action_id: action.id.clone(),
                status: ActionResultStatus::Ok,
                output: Some(format!("File deleted: {}", path)),
                error: None,
            },
            Err(e) => ActionResult {
                action_id: action.id.clone(),
                status: ActionResultStatus::Failed,
                output: None,
                error: Some(format!("Failed to delete file: {}", e)),
            },
        }
    }

    /// Search the web (placeholder)
    fn execute_search_web(&self, action: &Action) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();
        let query = payload.get("query").and_then(|v| v.as_str()).unwrap_or("");

        // TODO: Implement actual web search via an API
        ActionResult {
            action_id: action.id.clone(),
            status: ActionResultStatus::Ok,
            output: Some(format!("Web search for: {} (not yet implemented)", query)),
            error: None,
        }
    }

    /// Open a URL (placeholder)
    fn execute_open_url(&self, action: &Action) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();
        let url = payload.get("url").and_then(|v| v.as_str()).unwrap_or("");

        // Open URL in default browser
        #[cfg(target_os = "macos")]
        let _ = Command::new("open").arg(url).spawn();

        #[cfg(target_os = "linux")]
        let _ = Command::new("xdg-open").arg(url).spawn();

        #[cfg(target_os = "windows")]
        let _ = Command::new("cmd").args(["/c", "start", url]).spawn();

        ActionResult {
            action_id: action.id.clone(),
            status: ActionResultStatus::Ok,
            output: Some(format!("Opened URL: {}", url)),
            error: None,
        }
    }

    /// Execute a git command
    fn execute_git_command(
        &self,
        action: &Action,
        working_dir: &Path,
        args: &[&str],
    ) -> ActionResult {
        let output = Command::new("git")
            .args(args)
            .current_dir(working_dir)
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();

                if out.status.success() {
                    ActionResult {
                        action_id: action.id.clone(),
                        status: ActionResultStatus::Ok,
                        output: Some(stdout),
                        error: None,
                    }
                } else {
                    ActionResult {
                        action_id: action.id.clone(),
                        status: ActionResultStatus::Failed,
                        output: Some(stdout),
                        error: Some(stderr),
                    }
                }
            }
            Err(e) => ActionResult {
                action_id: action.id.clone(),
                status: ActionResultStatus::Failed,
                output: None,
                error: Some(format!("Failed to execute git: {}", e)),
            },
        }
    }

    /// Execute git diff
    fn execute_git_diff(&self, action: &Action, working_dir: &Path) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let path = payload.get("path").and_then(|v| v.as_str());
        let staged = payload
            .get("staged")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let mut args = vec!["diff"];
        if staged {
            args.push("--cached");
        }
        if let Some(p) = path {
            args.push("--");
            args.push(p);
        }

        self.execute_git_command(action, working_dir, &args)
    }

    /// Execute git checkout
    fn execute_git_checkout(&self, action: &Action, working_dir: &Path) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let branch = payload
            .get("branch")
            .and_then(|v| v.as_str())
            .unwrap_or("main");

        self.execute_git_command(action, working_dir, &["checkout", branch])
    }

    /// Execute git commit
    fn execute_git_commit(&self, action: &Action, working_dir: &Path) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let message = payload
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("Update");

        self.execute_git_command(action, working_dir, &["commit", "-m", message])
    }

    /// Send a notification
    fn execute_notify(&self, action: &Action, app: Option<&AppHandle>) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let level = payload
            .get("level")
            .and_then(|v| v.as_str())
            .unwrap_or("info");
        let message = payload
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if let Some(app) = app {
            let _ = app.emit(
                "agent://notification",
                serde_json::json!({
                    "level": level,
                    "message": message,
                    "action_id": action.id
                }),
            );
        }

        ActionResult {
            action_id: action.id.clone(),
            status: ActionResultStatus::Ok,
            output: Some(format!("[{}] {}", level, message)),
            error: None,
        }
    }

    /// Sleep for a duration
    fn execute_sleep(&self, action: &Action) -> ActionResult {
        let payload: serde_json::Value = serde_json::from_str(&action.payload).unwrap_or_default();

        let ms = payload.get("ms").and_then(|v| v.as_u64()).unwrap_or(1000);

        thread::sleep(std::time::Duration::from_millis(ms));

        ActionResult {
            action_id: action.id.clone(),
            status: ActionResultStatus::Ok,
            output: Some(format!("Slept for {}ms", ms)),
            error: None,
        }
    }
}

/// Walk directory recursively up to max_depth
fn walkdir(path: &Path, max_depth: usize) -> Vec<String> {
    let mut files = Vec::new();
    walkdir_inner(path, 0, max_depth, &mut files);
    files
}

fn walkdir_inner(path: &Path, depth: usize, max_depth: usize, files: &mut Vec<String>) {
    if depth > max_depth {
        return;
    }

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();

            // Skip common ignored directories
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with('.')
                    || name == "node_modules"
                    || name == "target"
                    || name == "dist"
                {
                    continue;
                }
            }

            files.push(path.display().to_string());

            if path.is_dir() {
                walkdir_inner(&path, depth + 1, max_depth, files);
            }
        }
    }
}
