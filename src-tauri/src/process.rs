use crate::database::{persist_command, persist_history, persist_repository};
use crate::events::{ExecutionFinishedEvent, ExecutionLogEvent};
use crate::runtime::AppRuntime;
use crate::types::{CommandStatus, ExecutionHistoryItem, RepositoryStatus, LOG_CAPACITY};
use crate::utils::{current_timestamp, format_duration, recompute_history_stats};
use std::{
    io::{BufRead, BufReader},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::Emitter;

pub fn spawn_log_reader(
    state: Arc<AppRuntime>,
    app: tauri::AppHandle,
    stream: impl std::io::Read + Send + 'static,
    repo: String,
    command: String,
    stream_name: String,
) {
    thread::spawn(move || {
        let reader = BufReader::new(stream);
        for line in reader.lines().flatten() {
            {
                let mut data = match state.data.lock() {
                    Ok(data) => data,
                    Err(_) => return,
                };
                if let Some(execution) = data
                    .live_executions
                    .iter_mut()
                    .find(|item| item.repo == repo && item.command == command)
                {
                    execution.logs.push(line.clone());
                    if execution.logs.len() > LOG_CAPACITY {
                        let overflow = execution.logs.len() - LOG_CAPACITY;
                        execution.logs.drain(0..overflow);
                    }
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
    });
}

pub fn spawn_waiter(
    state: Arc<AppRuntime>,
    app: tauri::AppHandle,
    execution_id: u32,
    repo: String,
    command: String,
    child: Arc<Mutex<std::process::Child>>,
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

        let history_item = ExecutionHistoryItem {
            id: state.next_history_id(),
            name: command.clone(),
            repo: repo.clone(),
            status: status.clone(),
            duration: duration_label.clone(),
            timestamp: current_timestamp(),
        };

        let mut command_snapshot = None;
        let mut repo_snapshot = None;

        {
            let mut data = match state.data.lock() {
                Ok(data) => data,
                Err(_) => return,
            };

            let timestamp = current_timestamp();
            
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

            data.live_executions
                .retain(|item| !(item.repo == repo && item.command == command));

            data.execution_history.insert(0, history_item.clone());
            data.history_stats = recompute_history_stats(&data.execution_history);
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
        if let Err(error) = persist_history(&state.db_path, &history_item) {
            log::error!("failed to persist history: {error}");
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
