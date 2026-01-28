use crate::database;
use crate::process::{kill_process_tree, start_execution};
use crate::runtime::AppRuntime;
use crate::types::{
  Command, CommandStatus, CommandType, DashboardState, ExecutionLogLine, RepoBranches,
  Repository, RunCommandRequest, RunQueueItem, StopCommandRequest,
};
use crate::utils::{current_timestamp, recompute_history_stats, recompute_pipelines};
use std::process::Command as ProcessCommand;
use std::sync::Arc;
use std::{collections::HashSet, fs, path::Path};
use tauri::{AppHandle, State};

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
pub fn commander_repo_branches(path: String) -> Result<RepoBranches, String> {
    let repo_path = Path::new(&path);
    if !repo_path.exists() {
        return Err("path not found".to_string());
    }

    let output = ProcessCommand::new("git")
        .arg("-C")
        .arg(&path)
        .args(["branch", "-a"])
        .output()
        .map_err(|error| error.to_string())?;

    if !output.status.success() {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if message.is_empty() {
            "failed to list branches".to_string()
        } else {
            message
        });
    }

    let mut branches: Vec<String> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(|line| {
            let mut branch = line.trim().to_string();
            // Remove o indicador * da branch atual
            if branch.starts_with('*') {
                branch = branch[1..].trim().to_string();
            }
            // Remove o prefixo remotes/ das branches remotas
            if branch.starts_with("remotes/") {
                branch = branch[8..].to_string();
                // Remove o nome do remote (ex: origin/) para manter apenas o nome da branch
                if let Some(slash_pos) = branch.find('/') {
                    branch = branch[slash_pos + 1..].to_string();
                }
            }
            branch
        })
        .filter(|line| !line.is_empty())
        .collect();
    branches.sort();
    branches.dedup();

    let current_output = ProcessCommand::new("git")
        .arg("-C")
        .arg(&path)
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map_err(|error| error.to_string())?;

    let current = if current_output.status.success() {
        let value = String::from_utf8_lossy(&current_output.stdout).trim().to_string();
        if value.is_empty() {
            None
        } else {
            Some(value)
        }
    } else {
        None
    };

    if let Some(value) = &current {
        if !branches.iter().any(|branch| branch == value) {
            branches.push(value.clone());
            branches.sort();
        }
    }

    Ok(RepoBranches { current, branches })
}

fn detect_package_manager(repo_path: &Path) -> &'static str {
    if repo_path.join("pnpm-lock.yaml").exists() {
        return "pnpm";
    }
    if repo_path.join("yarn.lock").exists() {
        return "yarn";
    }
    if repo_path.join("package-lock.json").exists() {
        return "npm";
    }
    "npm"
}

fn infer_command_type(name: &str, command: &str) -> CommandType {
    let value = format!("{} {}", name, command).to_lowercase();
    if value.contains("test") {
        return CommandType::Test;
    }
    if value.contains("lint") {
        return CommandType::Lint;
    }
    if value.contains("build") {
        return CommandType::Build;
    }
    if value.contains("check") || value.contains("typecheck") || value.contains("tsc") {
        return CommandType::Check;
    }
    if value.contains("bundle") {
        return CommandType::Bundle;
    }
    CommandType::Run
}

fn script_command(manager: &str, script: &str) -> String {
    match manager {
        "pnpm" => format!("pnpm {}", script),
        "yarn" => format!("yarn {}", script),
        _ => format!("npm run {}", script),
    }
}

fn collect_package_json_scripts(repo_path: &Path) -> Result<Vec<(String, String)>, String> {
    let package_path = repo_path.join("package.json");
    if !package_path.exists() {
        return Ok(Vec::new());
    }

    let contents = fs::read_to_string(package_path).map_err(|error| error.to_string())?;
    let json: serde_json::Value =
        serde_json::from_str(&contents).map_err(|error| error.to_string())?;
    let scripts = json
        .get("scripts")
        .and_then(|value| value.as_object())
        .cloned()
        .unwrap_or_default();

    let mut items: Vec<(String, String)> = scripts
        .into_iter()
        .filter_map(|(key, value)| value.as_str().map(|script| (key, script.to_string())))
        .collect();
    items.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(items)
}

fn discover_commands(repo_name: &str, repo_path: &Path) -> Result<Vec<Command>, String> {
    let manager = detect_package_manager(repo_path);
    let scripts = collect_package_json_scripts(repo_path)?;
    let mut seen = HashSet::new();
    let mut commands = Vec::new();

    for (script, raw_command) in scripts {
        if !seen.insert(script.clone()) {
            continue;
        }
        let command_type = infer_command_type(&script, &raw_command);
        commands.push(Command {
            name: script.clone(),
            command: script_command(manager, &script),
            command_type,
            status: CommandStatus::Idle,
            duration: "-".to_string(),
            last_run: "never".to_string(),
            repo: repo_name.to_string(),
        });
    }

    Ok(commands)
}

fn add_command_if_missing(
    state: &State<'_, Arc<AppRuntime>>,
    command: Command,
) -> Result<bool, String> {
    {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        if data
            .commands
            .iter()
            .any(|item| item.name == command.name && item.repo == command.repo)
        {
            return Ok(false);
        }
    }

    database::persist_command(&state.db_path, &command)?;

    let mut data = state.data.lock().map_err(|_| "state poisoned")?;
    if data
        .commands
        .iter()
        .any(|item| item.name == command.name && item.repo == command.repo)
    {
        return Ok(false);
    }
    data.commands.push(command);
    Ok(true)
}

#[tauri::command]
pub fn commander_import_commands(
    state: State<'_, Arc<AppRuntime>>,
    repo: String,
) -> Result<usize, String> {
    let repo_path = {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        data.repositories
            .iter()
            .find(|item| item.name == repo)
            .map(|item| item.path.clone())
    };

    let repo_path = repo_path.ok_or_else(|| "repository not found".to_string())?;
    let commands = discover_commands(&repo, Path::new(&repo_path))?;

    let mut added = 0;
    for command in commands {
        if add_command_if_missing(&state, command)? {
            added += 1;
        }
    }

    Ok(added)
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
    {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        if !data.repositories.iter().any(|repo| repo.name == request.repo) {
            return Err("repository not found".to_string());
        }
    }

    let display_name = request
        .name
        .clone()
        .unwrap_or_else(|| request.command.clone());
    let command_type = request.command_type.clone().unwrap_or(CommandType::Run);

    let (same_command_pid, has_other_running) = {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        let same_pid = data
            .live_executions
            .iter()
            .find(|item| item.repo == request.repo && item.command == display_name)
            .map(|item| item.pid);
        let other = data
            .live_executions
            .iter()
            .any(|item| item.repo == request.repo && item.command != display_name);
        (same_pid, other)
    };

    // If the same command is already running, kill it so the waiter
    // will pick up the queued restart automatically.
    if let Some(pid) = same_command_pid {
        log::info!(
            "[run] restarting: killing process group {pid} for repo={} command={display_name}",
            request.repo
        );
        kill_process_tree(pid);
    }

    let should_queue = same_command_pid.is_some() || has_other_running;

    if should_queue {
        let queued_at = current_timestamp();
        let mut data = state.data.lock().map_err(|_| "state poisoned")?;
        let command_entry = data
            .commands
            .iter_mut()
            .find(|item| item.name == display_name && item.repo == request.repo);
        if let Some(entry) = command_entry {
            entry.status = CommandStatus::Queued;
            entry.last_run = "queued".to_string();
            entry.duration = "-".to_string();
            entry.command_type = command_type.clone();
            entry.command = request.command.clone();
        } else {
            let new_command = Command {
                name: display_name.clone(),
                command: request.command.clone(),
                command_type: command_type.clone(),
                status: CommandStatus::Queued,
                duration: "-".to_string(),
                last_run: "queued".to_string(),
                repo: request.repo.clone(),
            };
            data.commands.push(new_command);
        }

        let queue_item = RunQueueItem {
            id: 0,
            name: display_name.clone(),
            repo: request.repo.clone(),
            command: request.command.clone(),
            command_type: command_type.clone(),
            queued_at,
        };
        let queue_id = database::enqueue_run_queue_item(&state.db_path, &queue_item)?;
        data.run_queue.push(RunQueueItem { id: queue_id, ..queue_item });
        data.pipelines = recompute_pipelines(&data.live_executions, &data.run_queue);
        return Ok(());
    }

    start_execution(state.inner().clone(), app, request)
}

#[tauri::command]
pub fn commander_stop_command(
    state: State<'_, Arc<AppRuntime>>,
    request: StopCommandRequest,
) -> Result<(), String> {
    let pid = {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        data.live_executions
            .iter()
            .find(|item| item.repo == request.repo && item.command == request.command)
            .map(|item| item.pid)
    };

    if let Some(pid) = pid {
        kill_process_tree(pid);
        Ok(())
    } else {
        Err("execution not found".to_string())
    }
}

#[tauri::command]
pub fn commander_delete_command(
    state: State<'_, Arc<AppRuntime>>,
    repo: String,
    name: String,
) -> Result<(), String> {
    {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        if data
            .live_executions
            .iter()
            .any(|item| item.repo == repo && item.command == name)
        {
            return Err("command is running".to_string());
        }
        if !data
            .commands
            .iter()
            .any(|item| item.repo == repo && item.name == name)
        {
            return Err("command not found".to_string());
        }
    }

    database::delete_command(&state.db_path, &repo, &name)?;

    let mut data = state.data.lock().map_err(|_| "state poisoned")?;
    data.commands
        .retain(|item| !(item.repo == repo && item.name == name));
    data.run_queue
        .retain(|item| !(item.repo == repo && item.name == name));
    data.live_executions
        .retain(|item| !(item.repo == repo && item.command == name));
    data.pipelines = recompute_pipelines(&data.live_executions, &data.run_queue);
    Ok(())
}

#[tauri::command]
pub fn commander_delete_repository(
    state: State<'_, Arc<AppRuntime>>,
    repo: String,
) -> Result<(), String> {
    {
        let data = state.data.lock().map_err(|_| "state poisoned")?;
        if data.live_executions.iter().any(|item| item.repo == repo) {
            return Err("repository has running commands".to_string());
        }
        if !data.repositories.iter().any(|item| item.name == repo) {
            return Err("repository not found".to_string());
        }
    }

    database::delete_repository(&state.db_path, &repo)?;

    let mut data = state.data.lock().map_err(|_| "state poisoned")?;
    data.repositories.retain(|item| item.name != repo);
    data.commands.retain(|item| item.repo != repo);
    data.live_executions.retain(|item| item.repo != repo);
    data.run_queue.retain(|item| item.repo != repo);
    data.pipelines = recompute_pipelines(&data.live_executions, &data.run_queue);
    data.execution_history.retain(|item| item.repo != repo);
    data.history_stats = recompute_history_stats(&data.execution_history);
    Ok(())
}

#[tauri::command]
pub fn commander_get_execution_logs(
    state: State<'_, Arc<AppRuntime>>,
    execution_id: u32,
) -> Result<Vec<ExecutionLogLine>, String> {
    database::load_execution_logs(&state.db_path, execution_id)
}
