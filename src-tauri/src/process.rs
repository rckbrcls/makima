use crate::database::{
    delete_run_queue_item, persist_command, persist_execution_logs, persist_history,
    persist_repository,
};
use crate::events::{ExecutionFinishedEvent, ExecutionLogEvent, ExecutionStartedEvent};
use crate::runtime::AppRuntime;
use crate::types::{
    Command, CommandStatus, CommandType, ExecutionHistoryItem, ExecutionLogLine, LiveExecution,
    ProcessEntry, RepositoryStatus, RunCommandRequest, LOG_CAPACITY,
};
use crate::utils::{
    current_timestamp, format_duration, recompute_history_stats, recompute_pipelines,
};
use std::{
    io::{BufRead, BufReader},
    path::Path,
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter};

/// Kills the entire process tree by targeting the process group.
/// Sends SIGTERM first for graceful shutdown, then SIGKILL after a brief delay.
#[cfg(unix)]
pub fn kill_process_tree(pid: u32) {
    if pid == 0 {
        log::error!("[kill_tree] refusing to kill PID 0");
        return;
    }
    use std::process::Command as Cmd;
    let pgid = format!("-{}", pid);
    log::info!("[kill_tree] sending SIGTERM to process group {pid}");
    Cmd::new("kill").args(["-TERM", &pgid]).output().ok();
    thread::sleep(Duration::from_millis(300));
    log::info!("[kill_tree] sending SIGKILL to process group {pid}");
    Cmd::new("kill").args(["-9", &pgid]).output().ok();
}

#[cfg(not(unix))]
pub fn kill_process_tree(pid: u32) {
    if pid == 0 {
        log::error!("[kill_tree] refusing to kill PID 0");
        return;
    }
    use std::process::Command as Cmd;
    log::info!("[kill_tree] taskkill /F /T /PID {pid}");
    Cmd::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .output()
        .ok();
}

/// Removes stale lock files that dev servers leave behind.
fn cleanup_dev_locks(repo_path: &str) {
    let base = Path::new(repo_path);
    let locks = [".next/dev/lock"];
    for lock in &locks {
        let lock_path = base.join(lock);
        if lock_path.exists() {
            log::info!("[cleanup] removing stale lock: {}", lock_path.display());
            if lock_path.is_dir() {
                std::fs::remove_dir_all(&lock_path).ok();
            } else {
                std::fs::remove_file(&lock_path).ok();
            }
        }
    }
}

/// Extracts an explicit port flag from a command string.
/// Handles `-p PORT`, `--port PORT`, and `--port=PORT` formats.
fn parse_port_flag(value: &str) -> Option<u16> {
    let parts: Vec<&str> = value.split_whitespace().collect();
    for (i, part) in parts.iter().enumerate() {
        if matches!(*part, "-p" | "--port" | "-P") {
            if let Some(next) = parts.get(i + 1) {
                if let Ok(port) = next.parse::<u16>() {
                    return Some(port);
                }
            }
        }
        if let Some(val) = part
            .strip_prefix("--port=")
            .or_else(|| part.strip_prefix("-p="))
        {
            if let Ok(port) = val.parse::<u16>() {
                return Some(port);
            }
        }
    }
    None
}

/// Returns the well-known default port for common frameworks.
fn detect_default_port(script: &str) -> Option<u16> {
    let lower = script.to_lowercase();
    if lower.contains("next") {
        return Some(3000);
    }
    if lower.contains("vite") {
        return Some(5173);
    }
    if lower.contains("react-scripts") {
        return Some(3000);
    }
    if lower.contains("ng serve") {
        return Some(4200);
    }
    if lower.contains("nuxt") {
        return Some(3000);
    }
    if lower.contains("remix") {
        return Some(3000);
    }
    None
}

/// Resolves the underlying script content from package.json for
/// commands like `pnpm dev`, `npm run start`, `yarn build`, etc.
fn resolve_script_content(command: &str, repo_path: &str) -> Option<String> {
    let parts: Vec<&str> = command.split_whitespace().collect();
    let script_name = match parts.as_slice() {
        ["pnpm", name, ..] => Some(*name),
        ["npm", "run", name, ..] => Some(*name),
        ["yarn", name, ..] => Some(*name),
        _ => None,
    }?;
    let package_path = Path::new(repo_path).join("package.json");
    let contents = std::fs::read_to_string(package_path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&contents).ok()?;
    json.get("scripts")?
        .get(script_name)?
        .as_str()
        .map(|s| s.to_string())
}

/// Detects the port a command will bind to by checking explicit flags,
/// resolving the underlying package.json script, and falling back to
/// well-known framework defaults.
fn detect_command_port(command: &str, repo_path: Option<&str>) -> Option<u16> {
    if let Some(port) = parse_port_flag(command) {
        return Some(port);
    }

    let script_content = repo_path.and_then(|rp| resolve_script_content(command, rp));

    if let Some(ref content) = script_content {
        if let Some(port) = parse_port_flag(content) {
            return Some(port);
        }
    }

    let check = script_content.as_deref().unwrap_or(command);
    detect_default_port(check)
}

/// Checks whether the given port is free on both IPv4 and IPv6.
/// Node.js (and Next.js) binds to `::` (IPv6 all interfaces) by default.
/// On macOS `IPV6_V6ONLY` is enabled, so an IPv4-only check would miss
/// a port that is already occupied on IPv6.
fn is_port_available(port: u16) -> bool {
    use std::net::{Ipv4Addr, Ipv6Addr};
    let ipv4_free = std::net::TcpListener::bind((Ipv4Addr::UNSPECIFIED, port)).is_ok();
    let ipv6_free = std::net::TcpListener::bind((Ipv6Addr::UNSPECIFIED, port)).is_ok();
    ipv4_free && ipv6_free
}

/// Returns the first available port starting from `preferred`.
/// Tries `preferred`, `preferred+1`, … up to 100 attempts, then
/// falls back to an OS-assigned ephemeral port.
fn find_available_port(preferred: u16) -> u16 {
    for offset in 0..100u16 {
        let candidate = preferred.saturating_add(offset);
        if is_port_available(candidate) {
            return candidate;
        }
    }
    std::net::TcpListener::bind(("127.0.0.1", 0))
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(preferred)
}

pub fn spawn_log_reader(
    state: Arc<AppRuntime>,
    app: tauri::AppHandle,
    stream: impl std::io::Read + Send + 'static,
    repo: String,
    command: String,
    stream_name: String,
) -> thread::JoinHandle<()> {
    log::info!("[log_reader] starting {stream_name} reader for repo={repo} command={command}");
    thread::spawn(move || {
        let reader = BufReader::new(stream);
        let mut line_count: usize = 0;
        for line in reader.lines().flatten() {
            line_count += 1;
            {
                let mut data = match state.data.lock() {
                    Ok(data) => data,
                    Err(err) => {
                        log::error!("[log_reader] {stream_name} mutex poisoned: {err}");
                        return;
                    }
                };
                let found = data
                    .live_executions
                    .iter_mut()
                    .find(|item| item.repo == repo && item.command == command);
                if let Some(execution) = found {
                    execution.logs.push(ExecutionLogLine {
                        line: line.clone(),
                        stream: stream_name.clone(),
                    });
                    if execution.logs.len() > LOG_CAPACITY {
                        let overflow = execution.logs.len() - LOG_CAPACITY;
                        execution.logs.drain(0..overflow);
                    }
                } else {
                    log::warn!(
                        "[log_reader] {stream_name} line {line_count}: live_execution not found for repo={repo} command={command} (already removed?)"
                    );
                }
            }

            app.emit(
                "makima://execution-log",
                ExecutionLogEvent {
                    repo: repo.clone(),
                    command: command.clone(),
                    line,
                    stream: stream_name.clone(),
                },
            )
            .ok();
        }
        log::info!("[log_reader] {stream_name} finished for repo={repo} command={command}, total lines read: {line_count}");
    })
}

pub fn start_execution(
    state: Arc<AppRuntime>,
    app: AppHandle,
    request: RunCommandRequest,
) -> Result<(), String> {
    let repo_path = {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        data.repositories
            .iter()
            .find(|repo| repo.name == request.repo)
            .map(|repo| repo.path.clone())
    };
    if repo_path.is_none() {
        return Err("repository not found".to_string());
    }

    let display_name = request
        .name
        .clone()
        .unwrap_or_else(|| request.command.clone());
    let command_type = request.command_type.clone().unwrap_or(CommandType::Run);
    let execution_id = state.next_execution_id();

    if let Some(path) = &repo_path {
        cleanup_dev_locks(path);
    }

    // Detect the default port for this command and, if it is already
    // occupied, pick the next available one.  The chosen port is
    // injected via the PORT environment variable so frameworks like
    // Next.js, Nuxt, Remix, etc. pick it up automatically.
    let allocated_port =
        detect_command_port(&request.command, repo_path.as_deref()).map(|default| {
            let port = find_available_port(default);
            if port != default {
                log::info!(
                    "[start] port {default} busy, using {port} for command={}",
                    request.command
                );
            }
            port
        });

    let mut cmd = if cfg!(target_os = "windows") {
        let mut cmd = std::process::Command::new("cmd");
        cmd.arg("/C").arg(&request.command);
        cmd
    } else {
        let mut cmd = std::process::Command::new("sh");
        cmd.arg("-lc").arg(&request.command);
        cmd
    };

    if let Some(port) = allocated_port {
        cmd.env("PORT", port.to_string());
    }

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }

    if let Some(path) = &repo_path {
        cmd.current_dir(path);
    }

    let mut child = cmd
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|error| error.to_string())?;

    let pid = child.id();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let child = Arc::new(Mutex::new(child));

    {
        let mut data = state.data.lock().map_err(|_| "state poisoned")?;
        let command_entry = data
            .commands
            .iter_mut()
            .find(|item| item.name == display_name && item.repo == request.repo);
        if let Some(entry) = command_entry {
            entry.status = CommandStatus::Running;
            entry.last_run = "now".to_string();
            entry.duration = "-".to_string();
            entry.command_type = command_type.clone();
            entry.command = request.command.clone();
        } else {
            let new_command = Command {
                name: display_name.clone(),
                command: request.command.clone(),
                command_type: command_type.clone(),
                status: CommandStatus::Running,
                duration: "-".to_string(),
                last_run: "now".to_string(),
                repo: request.repo.clone(),
            };
            data.commands.push(new_command);
        }

        data.live_executions.push(LiveExecution {
            repo: request.repo.clone(),
            command: display_name.clone(),
            pid,
            cpu: "-".to_string(),
            ram: "-".to_string(),
            logs: Vec::new(),
        });

        if let Some(repo_entry) = data
            .repositories
            .iter_mut()
            .find(|item| item.name == request.repo)
        {
            repo_entry.status = RepositoryStatus::Active;
            repo_entry.running = display_name.clone();
            repo_entry.last_run = "now".to_string();
        }

        data.pipelines = recompute_pipelines(&data.live_executions, &data.run_queue);
    }

    {
        let mut processes = state.processes.lock().map_err(|_| "state poisoned")?;
        processes.insert(
            execution_id,
            ProcessEntry {
                child: Arc::clone(&child),
                repo: request.repo.clone(),
                command_name: display_name.clone(),
                started_at: std::time::Instant::now(),
            },
        );
    }

    app.emit(
        "makima://execution-started",
        ExecutionStartedEvent {
            repo: request.repo.clone(),
            command: display_name.clone(),
            pid,
        },
    )
    .ok();

    let mut log_handles = Vec::new();

    if let Some(stdout) = stdout {
        log_handles.push(spawn_log_reader(
            state.clone(),
            app.clone(),
            stdout,
            request.repo.clone(),
            display_name.clone(),
            "stdout".to_string(),
        ));
    }

    if let Some(stderr) = stderr {
        log_handles.push(spawn_log_reader(
            state.clone(),
            app.clone(),
            stderr,
            request.repo.clone(),
            display_name.clone(),
            "stderr".to_string(),
        ));
    }

    spawn_waiter(
        state,
        app,
        execution_id,
        request.repo,
        display_name,
        child,
        log_handles,
    );

    Ok(())
}

pub fn spawn_waiter(
    state: Arc<AppRuntime>,
    app: tauri::AppHandle,
    execution_id: u32,
    repo: String,
    command: String,
    child: Arc<Mutex<std::process::Child>>,
    log_handles: Vec<thread::JoinHandle<()>>,
) {
    thread::spawn(move || {
        let exit_status = loop {
            let status = {
                let mut guard = match child.lock() {
                    Ok(guard) => guard,
                    Err(_) => return,
                };
                match guard.try_wait() {
                    Ok(Some(status)) => Some(status),
                    Ok(None) => None,
                    Err(_) => return,
                }
            };

            if let Some(status) = status {
                break status;
            }

            thread::sleep(Duration::from_millis(250));
        };

        log::info!("[waiter] process exited for repo={repo} command={command}, joining {} log reader handles", log_handles.len());
        for (i, handle) in log_handles.into_iter().enumerate() {
            match handle.join() {
                Ok(()) => log::info!("[waiter] log reader handle {i} joined successfully"),
                Err(_) => log::error!("[waiter] log reader handle {i} panicked"),
            }
        }
        log::info!("[waiter] all log readers joined for repo={repo} command={command}");

        let duration = {
            let processes = match state.processes.lock() {
                Ok(processes) => processes,
                Err(_) => return,
            };
            processes
                .get(&execution_id)
                .map(|entry| entry.started_at.elapsed())
                .unwrap_or_else(|| Duration::from_secs(0))
        };

        let duration_label = format_duration(duration);
        let status = if exit_status.success() {
            CommandStatus::Success
        } else if exit_status.code().is_none() {
            // Process was killed by signal (e.g., SIGTERM, SIGKILL)
            CommandStatus::Stopped
        } else {
            // Process exited with non-zero exit code
            CommandStatus::Failed
        };
        let timestamp = current_timestamp();
        let history_id = state.next_history_id();
        let history_item = ExecutionHistoryItem {
            id: history_id,
            name: command.clone(),
            repo: repo.clone(),
            status: status.clone(),
            duration: duration_label.clone(),
            timestamp: timestamp.clone(),
        };

        let mut command_snapshot = None;
        let mut repo_snapshot = None;
        let mut log_snapshot: Vec<ExecutionLogLine> = Vec::new();
        let mut queued_next: Option<(u32, RunCommandRequest)> = None;

        {
            let mut data = match state.data.lock() {
                Ok(data) => data,
                Err(_) => return,
            };

            if let Some(cmd) = data
                .commands
                .iter_mut()
                .find(|item| item.repo == repo && item.name == command)
            {
                cmd.status = status.clone();
                cmd.duration = duration_label.clone();
                cmd.last_run = timestamp.clone();
                command_snapshot = Some(cmd.clone());
            }

            if let Some(repo_entry) = data.repositories.iter_mut().find(|item| item.name == repo) {
                repo_entry.last_run = timestamp;
                repo_entry.running = "-".to_string();
                repo_entry.status = RepositoryStatus::Idle;
                repo_snapshot = Some(repo_entry.clone());
            }

            let live_count = data.live_executions.len();
            let found_execution = data
                .live_executions
                .iter()
                .find(|item| item.repo == repo && item.command == command);
            if let Some(execution) = found_execution {
                log::info!(
                    "[waiter] found live_execution for repo={repo} command={command}, logs count: {}",
                    execution.logs.len()
                );
                log_snapshot = execution.logs.clone();
            } else {
                log::warn!(
                    "[waiter] live_execution NOT FOUND for repo={repo} command={command}, live_executions count: {live_count}"
                );
                for (i, le) in data.live_executions.iter().enumerate() {
                    log::warn!(
                        "[waiter]   live_executions[{i}]: repo={} command={}",
                        le.repo,
                        le.command
                    );
                }
            }

            data.live_executions
                .retain(|item| !(item.repo == repo && item.command == command));

            data.execution_history.insert(0, history_item.clone());
            data.history_stats = recompute_history_stats(&data.execution_history);

            if let Some((index, item)) = data
                .run_queue
                .iter()
                .enumerate()
                .find(|(_, item)| item.repo == repo)
            {
                let queued = item.clone();
                data.run_queue.remove(index);
                queued_next = Some((
                    queued.id,
                    RunCommandRequest {
                        repo: queued.repo,
                        name: Some(queued.name),
                        command: queued.command,
                        command_type: Some(queued.command_type),
                    },
                ));
            }

            data.pipelines = recompute_pipelines(&data.live_executions, &data.run_queue);
        }

        if let Some(command) = command_snapshot {
            if let Err(error) = persist_command(&state.db_path, &command) {
                log::error!("failed to persist command: {error}");
            }
        }
        if let Some(repo) = repo_snapshot {
            if let Err(error) = persist_repository(&state.db_path, &repo) {
                log::error!("failed to persist repository: {error}");
            }
        }
        log::info!(
            "[waiter] persisting history_id={history_id} for repo={repo} command={command}, log_snapshot has {} lines",
            log_snapshot.len()
        );
        if let Err(error) = persist_history(&state.db_path, &history_item) {
            log::error!("[waiter] failed to persist history (id={history_id}): {error}");
        } else {
            log::info!("[waiter] history persisted ok, now persisting {} log lines for history_id={history_id}", log_snapshot.len());
            if let Err(error) = persist_execution_logs(&state.db_path, history_id, &log_snapshot) {
                log::error!(
                    "[waiter] failed to persist execution logs (history_id={history_id}): {error}"
                );
            } else {
                log::info!(
                    "[waiter] execution logs persisted ok for history_id={history_id}, {} lines",
                    log_snapshot.len()
                );
            }
        }

        if let Some((queue_id, request)) = queued_next {
            if let Err(error) = delete_run_queue_item(&state.db_path, queue_id) {
                log::error!("failed to delete queue item: {error}");
            }
            if let Err(error) = start_execution(state.clone(), app.clone(), request) {
                log::error!("failed to start queued command: {error}");
            }
        }

        {
            let mut processes = match state.processes.lock() {
                Ok(processes) => processes,
                Err(_) => return,
            };
            processes.remove(&execution_id);
        }

        app.emit(
            "makima://execution-finished",
            ExecutionFinishedEvent {
                repo,
                command,
                status,
                duration: duration_label,
                exit_code: exit_status.code(),
            },
        )
        .ok();
    });
}
