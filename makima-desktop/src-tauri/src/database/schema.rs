use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const SCHEMA_VERSION: i32 = 6;

pub fn get_database_path(app: &AppHandle) -> PathBuf {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");
    std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
    app_data_dir.join("makima.db")
}

pub fn initialize_database(conn: &Connection) -> Result<()> {
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    let version: i32 = conn
        .query_row("PRAGMA user_version;", [], |row| row.get(0))
        .unwrap_or(0);

    log::info!(
        "[initialize_database] Current schema version: {}, target: {}",
        version,
        SCHEMA_VERSION
    );

    if version < SCHEMA_VERSION {
        log::info!(
            "[initialize_database] Running migrations from v{} to v{}",
            version,
            SCHEMA_VERSION
        );
        run_migrations(conn, version)?;
        conn.execute_batch(&format!("PRAGMA user_version = {};", SCHEMA_VERSION))?;
        log::info!("[initialize_database] Migrations completed");
    } else {
        log::info!("[initialize_database] Database is up to date");
    }

    // Verify repositories table exists
    let table_exists: bool = conn
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='repositories'",
            [],
            |_| Ok(true),
        )
        .unwrap_or(false);
    log::info!(
        "[initialize_database] repositories table exists: {}",
        table_exists
    );

    Ok(())
}

fn run_migrations(conn: &Connection, from_version: i32) -> Result<()> {
    if from_version < 1 {
        migration_v1(conn)?;
    }
    if from_version < 2 {
        migration_v2(conn)?;
    }
    if from_version < 3 {
        migration_v3(conn)?;
    }
    if from_version < 4 {
        migration_v4(conn)?;
    }
    if from_version < 5 {
        migration_v5(conn)?;
    }
    if from_version < 6 {
        migration_v6(conn)?;
    }
    Ok(())
}

fn migration_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'idle',
            state TEXT NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'normal',
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            provider TEXT NOT NULL DEFAULT '',
            model TEXT NOT NULL DEFAULT '',
            tone TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conversation
            ON messages(conversation_id, sort_order);
        "#,
    )?;

    log::info!("Database migration v1 completed");
    Ok(())
}

fn migration_v2(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS repositories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            branch TEXT NOT NULL DEFAULT 'main',
            tech TEXT NOT NULL DEFAULT '[]',
            status TEXT NOT NULL DEFAULT 'idle',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        ALTER TABLE conversations ADD COLUMN repository_id TEXT
            REFERENCES repositories(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_conversations_repository
            ON conversations(repository_id);
        "#,
    )?;

    log::info!("Database migration v2 completed (repositories table added)");
    Ok(())
}

fn migration_v3(conn: &Connection) -> Result<()> {
    // Fix repositories table that may have been created with wrong schema
    // Check if the table has the correct columns
    let has_id_column: bool = conn
        .query_row(
            "SELECT 1 FROM pragma_table_info('repositories') WHERE name='id'",
            [],
            |_| Ok(true),
        )
        .unwrap_or(false);

    if !has_id_column {
        log::info!("migration_v3: Recreating repositories table with correct schema");

        conn.execute_batch(
            r#"
            DROP TABLE IF EXISTS repositories;

            CREATE TABLE repositories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                branch TEXT NOT NULL DEFAULT 'main',
                tech TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'idle',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            "#,
        )?;

        log::info!("Database migration v3 completed (repositories table recreated)");
    } else {
        log::info!("Database migration v3: repositories table already has correct schema");
    }

    Ok(())
}

fn migration_v4(conn: &Connection) -> Result<()> {
    // Work domain tables: agents, sessions, runs, approvals
    // Temporarily disable FK checks to drop stale tables from previous iterations
    // (e.g. agent_repos, old approvals/sessions with incompatible schemas)
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = OFF;

        DROP TABLE IF EXISTS agent_repos;
        DROP TABLE IF EXISTS approvals;
        DROP TABLE IF EXISTS runs;
        DROP TABLE IF EXISTS sessions;
        DROP TABLE IF EXISTS agents;

        PRAGMA foreign_keys = ON;

        -- Agents table: configured AI agents
        CREATE TABLE agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            config TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        -- Sessions table: execution sessions with agents
        CREATE TABLE sessions (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX idx_sessions_agent
            ON sessions(agent_id);

        -- Runs table: individual execution units
        CREATE TABLE runs (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            run_type TEXT NOT NULL DEFAULT 'command',
            status TEXT NOT NULL DEFAULT 'pending',
            input TEXT NOT NULL,
            output TEXT,
            error TEXT,
            started_at INTEGER NOT NULL,
            finished_at INTEGER
        );

        CREATE INDEX idx_runs_session
            ON runs(session_id);

        -- Approvals table: pending action approvals
        CREATE TABLE approvals (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at INTEGER NOT NULL,
            resolved_at INTEGER
        );

        CREATE INDEX idx_approvals_run
            ON approvals(run_id);

        CREATE INDEX idx_approvals_status
            ON approvals(status);
        "#,
    )?;

    log::info!("Database migration v4 completed (work domain tables added)");
    Ok(())
}

fn migration_v5(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "ALTER TABLE conversations ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT 0;",
    )?;

    log::info!("Database migration v5 completed (pinned column added)");
    Ok(())
}

fn migration_v6(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS cli_sessions (
            id TEXT PRIMARY KEY,
            repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
            cli_name TEXT NOT NULL,
            cli_command TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'idle',
            exit_code INTEGER,
            resume_session_id TEXT,
            started_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_cli_sessions_repository
            ON cli_sessions(repository_id);
        "#,
    )?;

    log::info!("Database migration v6 completed (cli_sessions table added)");
    Ok(())
}
