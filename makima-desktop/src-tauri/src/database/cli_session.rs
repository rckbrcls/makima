use crate::database::types::{CliSessionRow, CreateCliSessionInput, UpdateCliSessionInput};
use rusqlite::{params, Connection, Result};

pub fn list_cli_sessions(conn: &Connection) -> Result<Vec<CliSessionRow>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, repository_id, cli_name, cli_command, status, exit_code,
               resume_session_id, started_at, created_at, updated_at
        FROM cli_sessions
        ORDER BY updated_at DESC
        "#,
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(CliSessionRow {
            id: row.get(0)?,
            repository_id: row.get(1)?,
            cli_name: row.get(2)?,
            cli_command: row.get(3)?,
            status: row.get(4)?,
            exit_code: row.get(5)?,
            resume_session_id: row.get(6)?,
            started_at: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;

    rows.collect()
}

pub fn list_cli_sessions_by_repo(
    conn: &Connection,
    repository_id: &str,
) -> Result<Vec<CliSessionRow>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, repository_id, cli_name, cli_command, status, exit_code,
               resume_session_id, started_at, created_at, updated_at
        FROM cli_sessions
        WHERE repository_id = ?1
        ORDER BY updated_at DESC
        "#,
    )?;

    let rows = stmt.query_map([repository_id], |row| {
        Ok(CliSessionRow {
            id: row.get(0)?,
            repository_id: row.get(1)?,
            cli_name: row.get(2)?,
            cli_command: row.get(3)?,
            status: row.get(4)?,
            exit_code: row.get(5)?,
            resume_session_id: row.get(6)?,
            started_at: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;

    rows.collect()
}

pub fn create_cli_session(
    conn: &Connection,
    input: &CreateCliSessionInput,
) -> Result<CliSessionRow> {
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        r#"
        INSERT INTO cli_sessions (id, repository_id, cli_name, cli_command, status, started_at, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, 'idle', ?5, ?5, ?5)
        "#,
        params![input.id, input.repository_id, input.cli_name, input.cli_command, now],
    )?;

    Ok(CliSessionRow {
        id: input.id.clone(),
        repository_id: input.repository_id.clone(),
        cli_name: input.cli_name.clone(),
        cli_command: input.cli_command.clone(),
        status: "idle".to_string(),
        exit_code: None,
        resume_session_id: None,
        started_at: now,
        created_at: now,
        updated_at: now,
    })
}

pub fn update_cli_session(
    conn: &Connection,
    id: &str,
    input: &UpdateCliSessionInput,
) -> Result<bool> {
    let now = chrono::Utc::now().timestamp_millis();
    let mut updates = vec!["updated_at = ?1".to_string()];
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
    let mut param_index = 2;

    if let Some(status) = &input.status {
        updates.push(format!("status = ?{}", param_index));
        params_vec.push(Box::new(status.clone()));
        param_index += 1;
    }

    if let Some(exit_code) = &input.exit_code {
        updates.push(format!("exit_code = ?{}", param_index));
        params_vec.push(Box::new(*exit_code));
        param_index += 1;
    }

    if let Some(resume_session_id) = &input.resume_session_id {
        updates.push(format!("resume_session_id = ?{}", param_index));
        params_vec.push(Box::new(resume_session_id.clone()));
        param_index += 1;
    }

    if let Some(cli_name) = &input.cli_name {
        updates.push(format!("cli_name = ?{}", param_index));
        params_vec.push(Box::new(cli_name.clone()));
        param_index += 1;
    }

    if let Some(cli_command) = &input.cli_command {
        updates.push(format!("cli_command = ?{}", param_index));
        params_vec.push(Box::new(cli_command.clone()));
        param_index += 1;
    }

    params_vec.push(Box::new(id.to_string()));

    let sql = format!(
        "UPDATE cli_sessions SET {} WHERE id = ?{}",
        updates.join(", "),
        param_index
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let rows_affected = conn.execute(&sql, params_refs.as_slice())?;

    Ok(rows_affected > 0)
}

pub fn delete_cli_session(conn: &Connection, id: &str) -> Result<bool> {
    let rows_affected = conn.execute("DELETE FROM cli_sessions WHERE id = ?1", [id])?;
    Ok(rows_affected > 0)
}
