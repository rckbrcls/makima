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
use crate::utils::{current_timestamp, format_duration, recompute_history_stats, recompute_pipelines};
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
                "commander://execution-log",
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

    let mut cmd = if cfg!(target_os = "windows") {
        let mut cmd = std::process::Command::new("cmd");
        cmd.arg("/C").arg(&request.command);
        cmd
    } else {
        let mut cmd = std::process::Command::new("sh");
        cmd.arg("-lc").arg(&request.command);
        cmd
    };

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
        "commander://execution-started",
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
        let success = exit_status.success();
        let status = if success {
            CommandStatus::Success
        } else {
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
                    log::warn!("[waiter]   live_executions[{i}]: repo={} command={}", le.repo, le.command);
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
            if let Err(error) =
                persist_execution_logs(&state.db_path, history_id, &log_snapshot)
            {
                log::error!("[waiter] failed to persist execution logs (history_id={history_id}): {error}");
            } else {
                log::info!("[waiter] execution logs persisted ok for history_id={history_id}, {} lines", log_snapshot.len());
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
            "commander://execution-finished",
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
