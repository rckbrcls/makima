use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const SCHEMA_VERSION: i32 = 3;

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
