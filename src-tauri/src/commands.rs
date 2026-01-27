use crate::database;
use crate::events::ExecutionStartedEvent;
use crate::process::{spawn_log_reader, spawn_waiter};
use crate::runtime::AppRuntime;
use crate::types::{
    Command, CommandStatus, CommandType, DashboardState, LiveExecution, ProcessEntry, Repository,
    RepositoryStatus, RunCommandRequest, StopCommandRequest,
};
use std::process::{Command as ProcessCommand, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub fn commander_state(state: State<'_, Arc<AppRuntime>>) -> DashboardState {
    state.data.lock().expect("state poisoned").clone()
}

#[tauri::command]
pub fn commander_add_repository(
    state: State<'_, Arc<AppRuntime>>,
    repo: Repository,
) -> Result<(), String> {
    {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        if data.repositories.iter().any(|item| item.name == repo.name) {
            return Err("repository already exists".to_string());
        }
    }

    database::persist_repository(&state.db_path, &repo)?;

    let mut data = state.data.lock().map_err(|_| "state poisoned")?;
    if data.repositories.iter().any(|item| item.name == repo.name) {
        return Err("repository already exists".to_string());
    }
    data.repositories.push(repo);
    Ok(())
}

#[tauri::command]
pub fn commander_add_command(
    state: State<'_, Arc<AppRuntime>>,
    command: Command,
) -> Result<(), String> {
    {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        if data
            .commands
            .iter()
            .any(|item| item.name == command.name && item.repo == command.repo)
        {
            return Err("command already exists".to_string());
        }
    }

    database::persist_command(&state.db_path, &command)?;

    let mut data = state.data.lock().map_err(|_| "state poisoned")?;
    if data
        .commands
        .iter()
        .any(|item| item.name == command.name && item.repo == command.repo)
    {
        return Err("command already exists".to_string());
    }
    data.commands.push(command);
    Ok(())
}

#[tauri::command]
pub fn commander_run_command(
    app: AppHandle,
    state: State<'_, Arc<AppRuntime>>,
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
    let execution_id = state.next_execution_id();

    let mut cmd = if cfg!(target_os = "windows") {
        let mut cmd = ProcessCommand::new("cmd");
        cmd.arg("/C").arg(&request.command);
        cmd
    } else {
        let mut cmd = ProcessCommand::new("sh");
        cmd.arg("-lc").arg(&request.command);
        cmd
    };

    if let Some(path) = &repo_path {
        cmd.current_dir(path);
    }

    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| error.to_string())?;

    let pid = child.id();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let child = Arc::new(Mutex::new(child));

    {
        let mut data = state.data.lock().map_err(|_| "state poisoned")?;
        let command_type = request.command_type.unwrap_or(CommandType::Run);
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
                command_type,
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
    }

    {
        let mut processes = state.processes.lock().map_err(|_| "state poisoned")?;
        processes.insert(
            execution_id,
            ProcessEntry {
                child: Arc::clone(&child),
                repo: request.repo.clone(),
                command_name: display_name.clone(),
                started_at: Instant::now(),
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

    if let Some(stdout) = stdout {
        spawn_log_reader(
            state.inner().clone(),
            app.clone(),
            stdout,
            request.repo.clone(),
            display_name.clone(),
            "stdout".to_string(),
        );
    }

    if let Some(stderr) = stderr {
        spawn_log_reader(
            state.inner().clone(),
            app.clone(),
            stderr,
            request.repo.clone(),
            display_name.clone(),
            "stderr".to_string(),
        );
    }

    spawn_waiter(
        state.inner().clone(),
        app,
        execution_id,
        request.repo,
        display_name,
        child,
    );

    Ok(())
}

#[tauri::command]
pub fn commander_stop_command(
    state: State<'_, Arc<AppRuntime>>,
    request: StopCommandRequest,
) -> Result<(), String> {
    let processes = state.processes.lock().map_err(|_| "state poisoned")?;
    let entry = processes
        .iter()
        .find(|(_, entry)| entry.repo == request.repo && entry.command_name == request.command)
        .map(|(_, entry)| Arc::clone(&entry.child));

    if let Some(child) = entry {
        child
            .lock()
            .map_err(|_| "process lock poisoned")?
            .kill()
            .map_err(|error| error.to_string())?;
        Ok(())
    } else {
        Err("execution not found".to_string())
    }
}
