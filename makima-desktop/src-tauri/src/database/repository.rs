use crate::database::types::{
    AddMessageInput, Conversation, ConversationSummary, CreateRepositoryInput, Message,
    MessageMeta, Repository, UpdateConversationInput, UpdateMessageInput, UpdateRepositoryInput,
};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn list_conversations(conn: &Connection) -> Result<Vec<ConversationSummary>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, title, summary, status, state, pinned, created_at, updated_at, repository_id
        FROM conversations
        ORDER BY pinned DESC, updated_at DESC
        "#,
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(ConversationSummary {
            id: row.get(0)?,
            title: row.get(1)?,
            summary: row.get(2)?,
            status: row.get(3)?,
            state: row.get(4)?,
            pinned: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            repository_id: row.get(8)?,
        })
    })?;

    rows.collect()
}

pub fn get_conversation(conn: &Connection, id: &str) -> Result<Option<Conversation>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, title, summary, status, state, pinned, created_at, updated_at, repository_id
        FROM conversations
        WHERE id = ?1
        "#,
    )?;

    let conversation = stmt
        .query_row([id], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                summary: row.get(2)?,
                status: row.get(3)?,
                state: row.get(4)?,
                pinned: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                repository_id: row.get(8)?,
                messages: Vec::new(),
            })
        })
        .optional()?;

    match conversation {
        Some(mut conv) => {
            conv.messages = get_messages(conn, &conv.id)?;
            Ok(Some(conv))
        }
        None => Ok(None),
    }
}

pub fn create_conversation(
    conn: &Connection,
    title: &str,
    repository_id: Option<&str>,
) -> Result<Conversation> {
    let id = format!("conv-{}", chrono::Utc::now().timestamp_millis());
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        r#"
        INSERT INTO conversations (id, title, summary, status, state, created_at, updated_at, repository_id)
        VALUES (?1, ?2, '', 'idle', 'active', ?3, ?3, ?4)
        "#,
        params![id, title, now, repository_id],
    )?;

    Ok(Conversation {
        id,
        title: title.to_string(),
        summary: String::new(),
        status: "idle".to_string(),
        state: "active".to_string(),
        pinned: false,
        created_at: now,
        updated_at: now,
        repository_id: repository_id.map(|s| s.to_string()),
        messages: Vec::new(),
    })
}

pub fn update_conversation(
    conn: &Connection,
    id: &str,
    input: &UpdateConversationInput,
) -> Result<bool> {
    let now = chrono::Utc::now().timestamp_millis();
    let mut updates = vec!["updated_at = ?1".to_string()];
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
    let mut param_index = 2;

    if let Some(title) = &input.title {
        updates.push(format!("title = ?{}", param_index));
        params_vec.push(Box::new(title.clone()));
        param_index += 1;
    }

    if let Some(summary) = &input.summary {
        updates.push(format!("summary = ?{}", param_index));
        params_vec.push(Box::new(summary.clone()));
        param_index += 1;
    }

    if let Some(status) = &input.status {
        updates.push(format!("status = ?{}", param_index));
        params_vec.push(Box::new(status.clone()));
        param_index += 1;
    }

    if let Some(state) = &input.state {
        updates.push(format!("state = ?{}", param_index));
        params_vec.push(Box::new(state.clone()));
        param_index += 1;
    }

    if let Some(pinned) = &input.pinned {
        updates.push(format!("pinned = ?{}", param_index));
        params_vec.push(Box::new(*pinned));
        param_index += 1;
    }

    if let Some(repository_id) = &input.repository_id {
        updates.push(format!("repository_id = ?{}", param_index));
        params_vec.push(Box::new(repository_id.clone()));
        param_index += 1;
    }

    params_vec.push(Box::new(id.to_string()));

    let sql = format!(
        "UPDATE conversations SET {} WHERE id = ?{}",
        updates.join(", "),
        param_index
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let rows_affected = conn.execute(&sql, params_refs.as_slice())?;

    Ok(rows_affected > 0)
}

pub fn delete_conversation(conn: &Connection, id: &str) -> Result<bool> {
    let rows_affected = conn.execute("DELETE FROM conversations WHERE id = ?1", [id])?;
    Ok(rows_affected > 0)
}

pub fn get_messages(conn: &Connection, conversation_id: &str) -> Result<Vec<Message>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, conversation_id, role, state, content, created_at, provider, model, tone, sort_order
        FROM messages
        WHERE conversation_id = ?1
        ORDER BY sort_order ASC
        "#,
    )?;

    let rows = stmt.query_map([conversation_id], |row| {
        Ok(Message {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            role: row.get(2)?,
            state: row.get(3)?,
            content: row.get(4)?,
            created_at: row.get(5)?,
            meta: MessageMeta {
                provider: row.get(6)?,
                model: row.get(7)?,
                tone: row.get(8)?,
            },
            sort_order: row.get(9)?,
        })
    })?;

    rows.collect()
}

pub fn add_message(
    conn: &Connection,
    conversation_id: &str,
    input: &AddMessageInput,
) -> Result<Message> {
    let sort_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM messages WHERE conversation_id = ?1",
            [conversation_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        r#"
        INSERT INTO messages (id, conversation_id, role, state, content, created_at, provider, model, tone, sort_order)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        "#,
        params![
            input.id,
            conversation_id,
            input.role,
            input.state,
            input.content,
            input.created_at,
            input.provider,
            input.model,
            input.tone,
            sort_order,
        ],
    )?;

    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
        params![now, conversation_id],
    )?;

    Ok(Message {
        id: input.id.clone(),
        conversation_id: conversation_id.to_string(),
        role: input.role.clone(),
        state: input.state.clone(),
        content: input.content.clone(),
        created_at: input.created_at,
        meta: MessageMeta {
            provider: input.provider.clone(),
            model: input.model.clone(),
            tone: input.tone.clone(),
        },
        sort_order,
    })
}

pub fn update_message(conn: &Connection, id: &str, input: &UpdateMessageInput) -> Result<bool> {
    let mut updates = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut param_index = 1;

    if let Some(content) = &input.content {
        updates.push(format!("content = ?{}", param_index));
        params_vec.push(Box::new(content.clone()));
        param_index += 1;
    }

    if let Some(state) = &input.state {
        updates.push(format!("state = ?{}", param_index));
        params_vec.push(Box::new(state.clone()));
        param_index += 1;
    }

    if updates.is_empty() {
        return Ok(false);
    }

    params_vec.push(Box::new(id.to_string()));

    let sql = format!(
        "UPDATE messages SET {} WHERE id = ?{}",
        updates.join(", "),
        param_index
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let rows_affected = conn.execute(&sql, params_refs.as_slice())?;

    if rows_affected > 0 {
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            r#"
            UPDATE conversations SET updated_at = ?1
            WHERE id = (SELECT conversation_id FROM messages WHERE id = ?2)
            "#,
            params![now, id],
        )?;
    }

    Ok(rows_affected > 0)
}

// Repository CRUD operations

pub fn list_repositories(conn: &Connection) -> Result<Vec<Repository>> {
    log::info!("[list_repositories] Called");

    let mut stmt = conn.prepare(
        r#"
        SELECT id, name, path, branch, tech, status, created_at, updated_at
        FROM repositories
        ORDER BY updated_at DESC
        "#,
    )?;

    let rows = stmt.query_map([], |row| {
        let tech_json: String = row.get(4)?;
        let tech: Vec<String> = serde_json::from_str(&tech_json).unwrap_or_default();
        Ok(Repository {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            branch: row.get(3)?,
            tech,
            status: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;

    let result: Result<Vec<Repository>> = rows.collect();

    match &result {
        Ok(repos) => log::info!("[list_repositories] Found {} repositories", repos.len()),
        Err(e) => log::error!("[list_repositories] Error: {}", e),
    }

    result
}

pub fn get_repository(conn: &Connection, id: &str) -> Result<Option<Repository>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, name, path, branch, tech, status, created_at, updated_at
        FROM repositories
        WHERE id = ?1
        "#,
    )?;

    stmt.query_row([id], |row| {
        let tech_json: String = row.get(4)?;
        let tech: Vec<String> = serde_json::from_str(&tech_json).unwrap_or_default();
        Ok(Repository {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            branch: row.get(3)?,
            tech,
            status: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })
    .optional()
}

pub fn create_repository(conn: &Connection, input: &CreateRepositoryInput) -> Result<Repository> {
    log::info!(
        "[create_repository] Called with name='{}', path='{}', branch={:?}",
        input.name,
        input.path,
        input.branch
    );

    let id = format!("repo-{}", chrono::Utc::now().timestamp_millis());
    let now = chrono::Utc::now().timestamp_millis();
    let branch = input.branch.clone().unwrap_or_else(|| "main".to_string());
    let tech = input.tech.clone().unwrap_or_default();
    let tech_json = serde_json::to_string(&tech).unwrap_or_else(|_| "[]".to_string());

    log::info!(
        "[create_repository] Inserting repository id='{}', branch='{}', tech_json='{}'",
        id,
        branch,
        tech_json
    );

    let rows_affected = conn.execute(
        r#"
        INSERT INTO repositories (id, name, path, branch, tech, status, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, 'idle', ?6, ?6)
        "#,
        params![id, input.name, input.path, branch, tech_json, now],
    )?;

    log::info!(
        "[create_repository] INSERT completed, rows_affected={}",
        rows_affected
    );

    let repo = Repository {
        id: id.clone(),
        name: input.name.clone(),
        path: input.path.clone(),
        branch,
        tech,
        status: "idle".to_string(),
        created_at: now,
        updated_at: now,
    };

    log::info!("[create_repository] Returning repository: {:?}", repo);

    Ok(repo)
}

pub fn update_repository(
    conn: &Connection,
    id: &str,
    input: &UpdateRepositoryInput,
) -> Result<bool> {
    let now = chrono::Utc::now().timestamp_millis();
    let mut updates = vec!["updated_at = ?1".to_string()];
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];
    let mut param_index = 2;

    if let Some(name) = &input.name {
        updates.push(format!("name = ?{}", param_index));
        params_vec.push(Box::new(name.clone()));
        param_index += 1;
    }

    if let Some(branch) = &input.branch {
        updates.push(format!("branch = ?{}", param_index));
        params_vec.push(Box::new(branch.clone()));
        param_index += 1;
    }

    if let Some(tech) = &input.tech {
        let tech_json = serde_json::to_string(tech).unwrap_or_else(|_| "[]".to_string());
        updates.push(format!("tech = ?{}", param_index));
        params_vec.push(Box::new(tech_json));
        param_index += 1;
    }

    if let Some(status) = &input.status {
        updates.push(format!("status = ?{}", param_index));
        params_vec.push(Box::new(status.clone()));
        param_index += 1;
    }

    params_vec.push(Box::new(id.to_string()));

    let sql = format!(
        "UPDATE repositories SET {} WHERE id = ?{}",
        updates.join(", "),
        param_index
    );

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let rows_affected = conn.execute(&sql, params_refs.as_slice())?;

    Ok(rows_affected > 0)
}

pub fn delete_repository(conn: &Connection, id: &str) -> Result<bool> {
    let rows_affected = conn.execute("DELETE FROM repositories WHERE id = ?1", [id])?;
    Ok(rows_affected > 0)
}

pub fn list_conversations_by_repo(
    conn: &Connection,
    repository_id: &str,
) -> Result<Vec<ConversationSummary>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, title, summary, status, state, pinned, created_at, updated_at, repository_id
        FROM conversations
        WHERE repository_id = ?1
        ORDER BY pinned DESC, updated_at DESC
        "#,
    )?;

    let rows = stmt.query_map([repository_id], |row| {
        Ok(ConversationSummary {
            id: row.get(0)?,
            title: row.get(1)?,
            summary: row.get(2)?,
            status: row.get(3)?,
            state: row.get(4)?,
            pinned: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            repository_id: row.get(8)?,
        })
    })?;

    rows.collect()
}
