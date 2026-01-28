use crate::types::{
    parse_command_status, parse_command_type, Command, DashboardState, ExecutionHistoryItem,
    ExecutionLogLine, PipelineStep, PipelineTemplate, Repository, RepositoryStatus, RunQueueItem,
};
use crate::utils::{recompute_history_stats, recompute_pipelines};
use rusqlite::{params, Connection};
use std::{fs, path::Path, path::PathBuf, time::Duration};
use tauri::{AppHandle, Manager};

pub fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    Ok(app_data_dir.join("commander.db"))
}

pub fn init_db(db_path: &Path) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|error| error.to_string())?;
    conn.execute_batch(
        "
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS repositories (
        name TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        branch TEXT NOT NULL,
        tech TEXT NOT NULL,
        last_run TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS commands (
        repo TEXT NOT NULL,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        command_type TEXT NOT NULL,
        status TEXT NOT NULL,
        duration TEXT NOT NULL,
        last_run TEXT NOT NULL,
        PRIMARY KEY (repo, name),
        FOREIGN KEY (repo) REFERENCES repositories(name) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS execution_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        repo TEXT NOT NULL,
        status TEXT NOT NULL,
        duration TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS execution_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo TEXT NOT NULL,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        command_type TEXT NOT NULL,
        queued_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_execution_queue_repo ON execution_queue(repo);
      CREATE TABLE IF NOT EXISTS execution_logs (
        execution_id INTEGER NOT NULL,
        line TEXT NOT NULL,
        stream TEXT NOT NULL,
        line_order INTEGER NOT NULL,
        FOREIGN KEY (execution_id) REFERENCES execution_history(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON execution_logs(execution_id);
      CREATE TABLE IF NOT EXISTS pipeline_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        repo TEXT,
        steps TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      ",
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn with_db<T>(
    db_path: &Path,
    action: impl FnOnce(&mut Connection) -> rusqlite::Result<T>,
) -> Result<T, String> {
    let mut conn = Connection::open(db_path).map_err(|error| error.to_string())?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| error.to_string())?;
    conn.busy_timeout(Duration::from_secs(5))
        .map_err(|error| error.to_string())?;
    action(&mut conn).map_err(|error| error.to_string())
}

pub fn load_state(db_path: &Path) -> Result<DashboardState, String> {
    with_db(db_path, |conn| {
        let mut repositories = Vec::new();
        let mut commands = Vec::new();
        let mut execution_history = Vec::new();
        let mut run_queue = Vec::new();

        {
            let mut stmt = conn.prepare(
                "SELECT name, path, branch, tech, last_run
         FROM repositories
         ORDER BY name",
            )?;
            let repo_iter = stmt.query_map([], |row| {
                let tech_json: String = row.get(3)?;
                let tech: Vec<String> = serde_json::from_str(&tech_json).unwrap_or_default();
                Ok(Repository {
                    name: row.get(0)?,
                    path: row.get(1)?,
                    branch: row.get(2)?,
                    status: RepositoryStatus::Idle,
                    tech,
                    last_run: row.get(4)?,
                    running: "-".to_string(),
                })
            })?;
            for repo in repo_iter {
                repositories.push(repo?);
            }
        }

        {
            let mut stmt = conn.prepare(
                "SELECT name, command, command_type, repo, status, duration, last_run
         FROM commands
         ORDER BY repo, name",
            )?;
            let command_iter = stmt.query_map([], |row| {
                Ok(Command {
                    name: row.get(0)?,
                    command: row.get(1)?,
                    command_type: parse_command_type(&row.get::<_, String>(2)?),
                    repo: row.get(3)?,
                    status: parse_command_status(&row.get::<_, String>(4)?),
                    duration: row.get(5)?,
                    last_run: row.get(6)?,
                })
            })?;
            for command in command_iter {
                commands.push(command?);
            }
        }

        {
            let mut stmt = conn.prepare(
                "SELECT id, name, repo, status, duration, timestamp
         FROM execution_history
         ORDER BY id DESC",
            )?;
            let history_iter = stmt.query_map([], |row| {
                let id: i64 = row.get(0)?;
                Ok(ExecutionHistoryItem {
                    id: id as u32,
                    name: row.get(1)?,
                    repo: row.get(2)?,
                    status: parse_command_status(&row.get::<_, String>(3)?),
                    duration: row.get(4)?,
                    timestamp: row.get(5)?,
                })
            })?;
            for entry in history_iter {
                execution_history.push(entry?);
            }
        }

        {
            let mut stmt = conn.prepare(
                "SELECT id, name, repo, command, command_type, queued_at
         FROM execution_queue
         ORDER BY id ASC",
            )?;
            let queue_iter = stmt.query_map([], |row| {
                let id: i64 = row.get(0)?;
                Ok(RunQueueItem {
                    id: id as u32,
                    name: row.get(1)?,
                    repo: row.get(2)?,
                    command: row.get(3)?,
                    command_type: parse_command_type(&row.get::<_, String>(4)?),
                    queued_at: row.get(5)?,
                })
            })?;
            for entry in queue_iter {
                run_queue.push(entry?);
            }
        }

        let history_stats = recompute_history_stats(&execution_history);
        let pipelines = recompute_pipelines(&[], &run_queue);

        Ok(DashboardState {
            repositories,
            commands,
            live_executions: Vec::new(),
            run_queue,
            pipelines,
            execution_history,
            history_stats,
        })
    })
}

pub fn persist_full_state(db_path: &Path, state: &DashboardState) -> Result<(), String> {
    with_db(db_path, |conn| {
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM commands", [])?;
        tx.execute("DELETE FROM repositories", [])?;
        tx.execute("DELETE FROM execution_history", [])?;
        tx.execute("DELETE FROM execution_queue", [])?;

        for repo in &state.repositories {
            let tech_json = serde_json::to_string(&repo.tech).unwrap_or_else(|_| "[]".to_string());
            tx.execute(
                "INSERT INTO repositories (name, path, branch, tech, last_run)
         VALUES (?1, ?2, ?3, ?4, ?5)",
                params![repo.name, repo.path, repo.branch, tech_json, repo.last_run],
            )?;
        }

        for command in &state.commands {
            tx.execute(
                "INSERT INTO commands (repo, name, command, command_type, status, duration, last_run)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    command.repo,
                    command.name,
                    command.command,
                    command.command_type.as_str(),
                    command.status.as_str(),
                    command.duration,
                    command.last_run
                ],
            )?;
        }

        for history in &state.execution_history {
            tx.execute(
                "INSERT INTO execution_history (id, name, repo, status, duration, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    history.id,
                    history.name,
                    history.repo,
                    history.status.as_str(),
                    history.duration,
                    history.timestamp
                ],
            )?;
        }

        for item in &state.run_queue {
            tx.execute(
                "INSERT INTO execution_queue (id, repo, name, command, command_type, queued_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    item.id,
                    item.repo,
                    item.name,
                    item.command,
                    item.command_type.as_str(),
                    item.queued_at
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    })
}

pub fn persist_repository(db_path: &Path, repo: &Repository) -> Result<(), String> {
    with_db(db_path, |conn| {
        let tech_json = serde_json::to_string(&repo.tech).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT INTO repositories (name, path, branch, tech, last_run)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(name) DO UPDATE SET
         path = excluded.path,
         branch = excluded.branch,
         tech = excluded.tech,
         last_run = excluded.last_run",
            params![repo.name, repo.path, repo.branch, tech_json, repo.last_run],
        )?;
        Ok(())
    })
}

pub fn persist_command(db_path: &Path, command: &Command) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT INTO commands (repo, name, command, command_type, status, duration, last_run)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(repo, name) DO UPDATE SET
         command = excluded.command,
         command_type = excluded.command_type,
         status = excluded.status,
         duration = excluded.duration,
         last_run = excluded.last_run",
            params![
                command.repo,
                command.name,
                command.command,
                command.command_type.as_str(),
                command.status.as_str(),
                command.duration,
                command.last_run
            ],
        )?;
        Ok(())
    })
}

pub fn persist_history(db_path: &Path, history: &ExecutionHistoryItem) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT INTO execution_history (id, name, repo, status, duration, timestamp)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                history.id,
                history.name,
                history.repo,
                history.status.as_str(),
                history.duration,
                history.timestamp
            ],
        )?;
        Ok(())
    })
}

pub fn enqueue_run_queue_item(
    db_path: &Path,
    item: &RunQueueItem,
) -> Result<u32, String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT INTO execution_queue (repo, name, command, command_type, queued_at)
       VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                item.repo,
                item.name,
                item.command,
                item.command_type.as_str(),
                item.queued_at
            ],
        )?;
        Ok(conn.last_insert_rowid() as u32)
    })
}

pub fn delete_run_queue_item(db_path: &Path, id: u32) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute("DELETE FROM execution_queue WHERE id = ?1", params![id])?;
        Ok(())
    })
}

pub fn persist_execution_logs(
    db_path: &Path,
    execution_id: u32,
    logs: &[ExecutionLogLine],
) -> Result<(), String> {
    log::info!(
        "[db] persist_execution_logs called: execution_id={execution_id}, logs.len()={}",
        logs.len()
    );
    with_db(db_path, |conn| {
        let tx = conn.transaction()?;
        tx.execute(
            "DELETE FROM execution_logs WHERE execution_id = ?1",
            params![execution_id],
        )?;
        for (line_order, entry) in logs.iter().enumerate() {
            tx.execute(
                "INSERT INTO execution_logs (execution_id, line, stream, line_order)
         VALUES (?1, ?2, ?3, ?4)",
                params![
                    execution_id,
                    entry.line,
                    entry.stream,
                    line_order as i64
                ],
            )?;
        }
        tx.commit()?;
        log::info!("[db] persist_execution_logs committed {0} lines for execution_id={execution_id}", logs.len());
        Ok(())
    })
}

pub fn load_execution_logs(
    db_path: &Path,
    execution_id: u32,
) -> Result<Vec<ExecutionLogLine>, String> {
    log::info!("[db] load_execution_logs called: execution_id={execution_id}");
    let result = with_db(db_path, |conn| {
        let mut logs = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT line, stream
       FROM execution_logs
       WHERE execution_id = ?1
       ORDER BY line_order ASC",
        )?;
        let rows = stmt.query_map(params![execution_id], |row| {
            Ok(ExecutionLogLine {
                line: row.get(0)?,
                stream: row.get(1)?,
            })
        })?;
        for entry in rows {
            logs.push(entry?);
        }
        Ok(logs)
    });
    match &result {
        Ok(logs) => log::info!("[db] load_execution_logs returned {} lines for execution_id={execution_id}", logs.len()),
        Err(err) => log::error!("[db] load_execution_logs failed for execution_id={execution_id}: {err}"),
    }
    result
}

pub fn load_pipeline_templates(db_path: &Path) -> Result<Vec<PipelineTemplate>, String> {
    with_db(db_path, |conn| {
        let mut templates = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, name, repo, steps, created_at, updated_at
         FROM pipeline_templates
         ORDER BY created_at DESC",
        )?;
        let template_iter = stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let steps_json: String = row.get(3)?;
            let steps: Vec<PipelineStep> =
                serde_json::from_str(&steps_json).unwrap_or_default();
            Ok(PipelineTemplate {
                id: Some(id as u32),
                name: row.get(1)?,
                repo: row.get(2)?,
                steps,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        for template in template_iter {
            templates.push(template?);
        }
        Ok(templates)
    })
}

pub fn persist_pipeline_template(
    db_path: &Path,
    template: &PipelineTemplate,
) -> Result<(), String> {
    with_db(db_path, |conn| {
        let steps_json = serde_json::to_string(&template.steps).map_err(|error| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(error))
        })?;
        if let Some(id) = template.id {
            conn.execute(
                "UPDATE pipeline_templates
         SET name = ?1, repo = ?2, steps = ?3, updated_at = ?4
         WHERE id = ?5",
                params![
                    template.name,
                    template.repo,
                    steps_json,
                    template.updated_at,
                    id
                ],
            )?;
        } else {
            conn.execute(
                "INSERT INTO pipeline_templates (name, repo, steps, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    template.name,
                    template.repo,
                    steps_json,
                    template.created_at,
                    template.updated_at
                ],
            )?;
        }
        Ok(())
    })
}

pub fn delete_pipeline_template(db_path: &Path, id: u32) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute("DELETE FROM pipeline_templates WHERE id = ?1", params![id])?;
        Ok(())
    })
}

pub fn delete_command(db_path: &Path, repo: &str, name: &str) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "DELETE FROM execution_queue WHERE repo = ?1 AND name = ?2",
            params![repo, name],
        )?;
        conn.execute(
            "DELETE FROM commands WHERE repo = ?1 AND name = ?2",
            params![repo, name],
        )?;
        Ok(())
    })
}

pub fn delete_repository(db_path: &Path, repo: &str) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "DELETE FROM execution_history WHERE repo = ?1",
            params![repo],
        )?;
        conn.execute(
            "DELETE FROM execution_queue WHERE repo = ?1",
            params![repo],
        )?;
        conn.execute(
            "DELETE FROM pipeline_templates WHERE repo = ?1",
            params![repo],
        )?;
        conn.execute("DELETE FROM repositories WHERE name = ?1", params![repo])?;
        Ok(())
    })
}
