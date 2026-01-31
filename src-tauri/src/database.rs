use crate::types::{
    parse_action_status, parse_action_type, parse_agent_provider, parse_agent_status,
    parse_approval_state, parse_artifact_kind, parse_bridge_mode, parse_command_status,
    parse_command_type, parse_event_level, parse_event_source, parse_session_state, Action, Agent,
    AgentDashboardState, AgentWithRepos, Approval, ApprovalWithAction, Artifact, BridgeMode,
    Command, DashboardState, Event, ExecutionHistoryItem, ExecutionLogLine, PipelineStep,
    PipelineTemplate, Repository, RepositoryStatus, RunQueueItem, Session,
};
use crate::utils::{current_timestamp, recompute_history_stats, recompute_pipelines};
use rusqlite::{params, Connection};
use std::{fs, path::Path, path::PathBuf, time::Duration};
use tauri::{AppHandle, Manager};

pub fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    Ok(app_data_dir.join("company.db"))
}

pub fn init_db(db_path: &Path) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|error| error.to_string())?;
    conn.execute_batch(
        "
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      -- Existing tables
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

      -- Agent system tables
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agent_repos (
        agent_id TEXT NOT NULL,
        repo TEXT NOT NULL,
        PRIMARY KEY (agent_id, repo),
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (repo) REFERENCES repositories(name) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        goal TEXT NOT NULL,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
      CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        summary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_actions_session_id ON actions(session_id);
      CREATE TABLE IF NOT EXISTS approvals (
        id TEXT PRIMARY KEY,
        action_id TEXT NOT NULL,
        state TEXT NOT NULL,
        reviewer TEXT,
        reason TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_approvals_action_id ON approvals(action_id);
      CREATE INDEX IF NOT EXISTS idx_approvals_state ON approvals(state);
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        agent_id TEXT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_agent_id ON events(agent_id);
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_artifacts_session_id ON artifacts(session_id);

      -- Global settings table for app-wide preferences
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT OR IGNORE INTO settings (key, value) VALUES ('global_mode', 'safe');
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

pub fn enqueue_run_queue_item(db_path: &Path, item: &RunQueueItem) -> Result<u32, String> {
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
                params![execution_id, entry.line, entry.stream, line_order as i64],
            )?;
        }
        tx.commit()?;
        log::info!(
            "[db] persist_execution_logs committed {0} lines for execution_id={execution_id}",
            logs.len()
        );
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
        Ok(logs) => log::info!(
            "[db] load_execution_logs returned {} lines for execution_id={execution_id}",
            logs.len()
        ),
        Err(err) => {
            log::error!("[db] load_execution_logs failed for execution_id={execution_id}: {err}")
        }
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
            let steps: Vec<PipelineStep> = serde_json::from_str(&steps_json).unwrap_or_default();
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
        let steps_json = serde_json::to_string(&template.steps)
            .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
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
        conn.execute("DELETE FROM execution_queue WHERE repo = ?1", params![repo])?;
        conn.execute(
            "DELETE FROM pipeline_templates WHERE repo = ?1",
            params![repo],
        )?;
        conn.execute("DELETE FROM repositories WHERE name = ?1", params![repo])?;
        Ok(())
    })
}

// =============================================================================
// Agent System CRUD Functions
// =============================================================================

// --- Agents ---

pub fn create_agent(db_path: &Path, agent: &Agent) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT INTO agents (id, name, provider, model, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                agent.id,
                agent.name,
                agent.provider.as_str(),
                agent.model,
                agent.status.as_str(),
                agent.created_at,
                agent.updated_at
            ],
        )?;
        Ok(())
    })
}

pub fn get_agent(db_path: &Path, agent_id: &str) -> Result<Option<Agent>, String> {
    with_db(db_path, |conn| {
        let mut stmt = conn.prepare(
            "SELECT id, name, provider, model, status, created_at, updated_at
             FROM agents WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![agent_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                provider: parse_agent_provider(&row.get::<_, String>(2)?),
                model: row.get(3)?,
                status: parse_agent_status(&row.get::<_, String>(4)?),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            }))
        } else {
            Ok(None)
        }
    })
}

pub fn list_agents(db_path: &Path) -> Result<Vec<Agent>, String> {
    with_db(db_path, |conn| {
        let mut agents = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, name, provider, model, status, created_at, updated_at
             FROM agents ORDER BY created_at DESC",
        )?;
        let iter = stmt.query_map([], |row| {
            Ok(Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                provider: parse_agent_provider(&row.get::<_, String>(2)?),
                model: row.get(3)?,
                status: parse_agent_status(&row.get::<_, String>(4)?),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;
        for agent in iter {
            agents.push(agent?);
        }
        Ok(agents)
    })
}

pub fn update_agent_status(
    db_path: &Path,
    agent_id: &str,
    status: &crate::types::AgentStatus,
) -> Result<(), String> {
    let now = current_timestamp();
    with_db(db_path, |conn| {
        conn.execute(
            "UPDATE agents SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status.as_str(), now, agent_id],
        )?;
        Ok(())
    })
}

pub fn delete_agent(db_path: &Path, agent_id: &str) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute("DELETE FROM agents WHERE id = ?1", params![agent_id])?;
        Ok(())
    })
}

// --- Agent Repos ---

pub fn add_agent_repo(db_path: &Path, agent_id: &str, repo: &str) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT OR IGNORE INTO agent_repos (agent_id, repo) VALUES (?1, ?2)",
            params![agent_id, repo],
        )?;
        Ok(())
    })
}

pub fn remove_agent_repo(db_path: &Path, agent_id: &str, repo: &str) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "DELETE FROM agent_repos WHERE agent_id = ?1 AND repo = ?2",
            params![agent_id, repo],
        )?;
        Ok(())
    })
}

pub fn list_agent_repos(db_path: &Path, agent_id: &str) -> Result<Vec<String>, String> {
    with_db(db_path, |conn| {
        let mut repos = Vec::new();
        let mut stmt = conn.prepare("SELECT repo FROM agent_repos WHERE agent_id = ?1")?;
        let iter = stmt.query_map(params![agent_id], |row| row.get(0))?;
        for repo in iter {
            repos.push(repo?);
        }
        Ok(repos)
    })
}

// --- Sessions ---

pub fn create_session(db_path: &Path, session: &Session) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT INTO sessions (id, agent_id, goal, state, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                session.id,
                session.agent_id,
                session.goal,
                session.state.as_str(),
                session.created_at,
                session.updated_at
            ],
        )?;
        Ok(())
    })
}

pub fn get_session(db_path: &Path, session_id: &str) -> Result<Option<Session>, String> {
    with_db(db_path, |conn| {
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, goal, state, created_at, updated_at
             FROM sessions WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![session_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Session {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                goal: row.get(2)?,
                state: parse_session_state(&row.get::<_, String>(3)?),
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            }))
        } else {
            Ok(None)
        }
    })
}

pub fn list_sessions_by_agent(db_path: &Path, agent_id: &str) -> Result<Vec<Session>, String> {
    with_db(db_path, |conn| {
        let mut sessions = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, goal, state, created_at, updated_at
             FROM sessions WHERE agent_id = ?1 ORDER BY created_at DESC",
        )?;
        let iter = stmt.query_map(params![agent_id], |row| {
            Ok(Session {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                goal: row.get(2)?,
                state: parse_session_state(&row.get::<_, String>(3)?),
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        for session in iter {
            sessions.push(session?);
        }
        Ok(sessions)
    })
}

pub fn get_active_session_for_agent(
    db_path: &Path,
    agent_id: &str,
) -> Result<Option<Session>, String> {
    with_db(db_path, |conn| {
        let mut stmt = conn.prepare(
            "SELECT id, agent_id, goal, state, created_at, updated_at
             FROM sessions WHERE agent_id = ?1 AND state = 'active'
             ORDER BY created_at DESC LIMIT 1",
        )?;
        let mut rows = stmt.query(params![agent_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Session {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                goal: row.get(2)?,
                state: parse_session_state(&row.get::<_, String>(3)?),
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            }))
        } else {
            Ok(None)
        }
    })
}

pub fn update_session_state(
    db_path: &Path,
    session_id: &str,
    state: &crate::types::SessionState,
) -> Result<(), String> {
    let now = current_timestamp();
    with_db(db_path, |conn| {
        conn.execute(
            "UPDATE sessions SET state = ?1, updated_at = ?2 WHERE id = ?3",
            params![state.as_str(), now, session_id],
        )?;
        Ok(())
    })
}

// --- Actions ---

pub fn create_action(db_path: &Path, action: &Action) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT INTO actions (id, session_id, action_type, status, payload, summary, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                action.id,
                action.session_id,
                action.action_type.as_str(),
                action.status.as_str(),
                action.payload,
                action.summary,
                action.created_at,
                action.updated_at
            ],
        )?;
        Ok(())
    })
}

pub fn get_action(db_path: &Path, action_id: &str) -> Result<Option<Action>, String> {
    with_db(db_path, |conn| {
        let mut stmt = conn.prepare(
            "SELECT id, session_id, action_type, status, payload, summary, created_at, updated_at
             FROM actions WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![action_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Action {
                id: row.get(0)?,
                session_id: row.get(1)?,
                action_type: parse_action_type(&row.get::<_, String>(2)?),
                status: parse_action_status(&row.get::<_, String>(3)?),
                payload: row.get(4)?,
                summary: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            }))
        } else {
            Ok(None)
        }
    })
}

pub fn list_actions_by_session(db_path: &Path, session_id: &str) -> Result<Vec<Action>, String> {
    with_db(db_path, |conn| {
        let mut actions = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, action_type, status, payload, summary, created_at, updated_at
             FROM actions WHERE session_id = ?1 ORDER BY created_at ASC",
        )?;
        let iter = stmt.query_map(params![session_id], |row| {
            Ok(Action {
                id: row.get(0)?,
                session_id: row.get(1)?,
                action_type: parse_action_type(&row.get::<_, String>(2)?),
                status: parse_action_status(&row.get::<_, String>(3)?),
                payload: row.get(4)?,
                summary: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?;
        for action in iter {
            actions.push(action?);
        }
        Ok(actions)
    })
}

pub fn update_action_status(
    db_path: &Path,
    action_id: &str,
    status: &crate::types::ActionStatus,
) -> Result<(), String> {
    let now = current_timestamp();
    with_db(db_path, |conn| {
        conn.execute(
            "UPDATE actions SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status.as_str(), now, action_id],
        )?;
        Ok(())
    })
}

// --- Approvals ---

pub fn create_approval(db_path: &Path, approval: &Approval) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT INTO approvals (id, action_id, state, reviewer, reason, created_at, resolved_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                approval.id,
                approval.action_id,
                approval.state.as_str(),
                approval.reviewer,
                approval.reason,
                approval.created_at,
                approval.resolved_at
            ],
        )?;
        Ok(())
    })
}

pub fn get_approval(db_path: &Path, approval_id: &str) -> Result<Option<Approval>, String> {
    with_db(db_path, |conn| {
        let mut stmt = conn.prepare(
            "SELECT id, action_id, state, reviewer, reason, created_at, resolved_at
             FROM approvals WHERE id = ?1",
        )?;
        let mut rows = stmt.query(params![approval_id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Approval {
                id: row.get(0)?,
                action_id: row.get(1)?,
                state: parse_approval_state(&row.get::<_, String>(2)?),
                reviewer: row.get(3)?,
                reason: row.get(4)?,
                created_at: row.get(5)?,
                resolved_at: row.get(6)?,
            }))
        } else {
            Ok(None)
        }
    })
}

pub fn list_pending_approvals(db_path: &Path) -> Result<Vec<Approval>, String> {
    with_db(db_path, |conn| {
        let mut approvals = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, action_id, state, reviewer, reason, created_at, resolved_at
             FROM approvals WHERE state = 'pending' ORDER BY created_at ASC",
        )?;
        let iter = stmt.query_map([], |row| {
            Ok(Approval {
                id: row.get(0)?,
                action_id: row.get(1)?,
                state: parse_approval_state(&row.get::<_, String>(2)?),
                reviewer: row.get(3)?,
                reason: row.get(4)?,
                created_at: row.get(5)?,
                resolved_at: row.get(6)?,
            })
        })?;
        for approval in iter {
            approvals.push(approval?);
        }
        Ok(approvals)
    })
}

pub fn resolve_approval(
    db_path: &Path,
    approval_id: &str,
    state: &crate::types::ApprovalState,
    reviewer: Option<&str>,
    reason: Option<&str>,
) -> Result<(), String> {
    let now = current_timestamp();
    with_db(db_path, |conn| {
        conn.execute(
            "UPDATE approvals SET state = ?1, reviewer = ?2, reason = ?3, resolved_at = ?4 WHERE id = ?5",
            params![state.as_str(), reviewer, reason, now, approval_id],
        )?;
        Ok(())
    })
}

// --- Events ---

pub fn create_event(db_path: &Path, event: &Event) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT INTO events (id, session_id, agent_id, level, message, source, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                event.id,
                event.session_id,
                event.agent_id,
                event.level.as_str(),
                event.message,
                event.source.as_str(),
                event.created_at
            ],
        )?;
        Ok(())
    })
}

pub fn list_events_by_session(
    db_path: &Path,
    session_id: &str,
    limit: u32,
) -> Result<Vec<Event>, String> {
    with_db(db_path, |conn| {
        let mut events = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, agent_id, level, message, source, created_at
             FROM events WHERE session_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        )?;
        let iter = stmt.query_map(params![session_id, limit], |row| {
            Ok(Event {
                id: row.get(0)?,
                session_id: row.get(1)?,
                agent_id: row.get(2)?,
                level: parse_event_level(&row.get::<_, String>(3)?),
                message: row.get(4)?,
                source: parse_event_source(&row.get::<_, String>(5)?),
                created_at: row.get(6)?,
            })
        })?;
        for event in iter {
            events.push(event?);
        }
        Ok(events)
    })
}

pub fn list_recent_events(db_path: &Path, limit: u32) -> Result<Vec<Event>, String> {
    with_db(db_path, |conn| {
        let mut events = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, agent_id, level, message, source, created_at
             FROM events ORDER BY created_at DESC LIMIT ?1",
        )?;
        let iter = stmt.query_map(params![limit], |row| {
            Ok(Event {
                id: row.get(0)?,
                session_id: row.get(1)?,
                agent_id: row.get(2)?,
                level: parse_event_level(&row.get::<_, String>(3)?),
                message: row.get(4)?,
                source: parse_event_source(&row.get::<_, String>(5)?),
                created_at: row.get(6)?,
            })
        })?;
        for event in iter {
            events.push(event?);
        }
        Ok(events)
    })
}

// --- Artifacts ---

pub fn create_artifact(db_path: &Path, artifact: &Artifact) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT INTO artifacts (id, session_id, kind, data, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                artifact.id,
                artifact.session_id,
                artifact.kind.as_str(),
                artifact.data,
                artifact.created_at
            ],
        )?;
        Ok(())
    })
}

pub fn list_artifacts_by_session(
    db_path: &Path,
    session_id: &str,
) -> Result<Vec<Artifact>, String> {
    with_db(db_path, |conn| {
        let mut artifacts = Vec::new();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, kind, data, created_at
             FROM artifacts WHERE session_id = ?1 ORDER BY created_at ASC",
        )?;
        let iter = stmt.query_map(params![session_id], |row| {
            Ok(Artifact {
                id: row.get(0)?,
                session_id: row.get(1)?,
                kind: parse_artifact_kind(&row.get::<_, String>(2)?),
                data: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        for artifact in iter {
            artifacts.push(artifact?);
        }
        Ok(artifacts)
    })
}

// --- Settings ---

pub fn get_global_mode(db_path: &Path) -> Result<BridgeMode, String> {
    with_db(db_path, |conn| {
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = 'global_mode'")?;
        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            let value: String = row.get(0)?;
            Ok(parse_bridge_mode(&value))
        } else {
            Ok(BridgeMode::Safe)
        }
    })
}

pub fn set_global_mode(db_path: &Path, mode: &BridgeMode) -> Result<(), String> {
    with_db(db_path, |conn| {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('global_mode', ?1)",
            params![mode.as_str()],
        )?;
        Ok(())
    })
}

// --- Agent Dashboard State ---

pub fn load_agent_dashboard_state(db_path: &Path) -> Result<AgentDashboardState, String> {
    let agents = list_agents(db_path)?;
    let mut agents_with_repos = Vec::new();

    for agent in agents {
        let repos = list_agent_repos(db_path, &agent.id)?;
        let current_session = get_active_session_for_agent(db_path, &agent.id)?;
        agents_with_repos.push(AgentWithRepos {
            agent,
            repos,
            current_session,
        });
    }

    let pending_approvals = list_pending_approvals(db_path)?;
    let mut approvals_with_actions = Vec::new();
    for approval in pending_approvals {
        let action = get_action(db_path, &approval.action_id)?;
        approvals_with_actions.push(ApprovalWithAction { approval, action });
    }

    let recent_events = list_recent_events(db_path, 100)?;
    let global_mode = get_global_mode(db_path)?;

    // Get recent sessions (active ones first, then recent)
    let mut sessions = Vec::new();
    for agent in &agents_with_repos {
        let agent_sessions = list_sessions_by_agent(db_path, &agent.agent.id)?;
        sessions.extend(agent_sessions.into_iter().take(10));
    }

    Ok(AgentDashboardState {
        agents: agents_with_repos,
        sessions,
        pending_approvals: approvals_with_actions,
        recent_events,
        global_mode,
    })
}
