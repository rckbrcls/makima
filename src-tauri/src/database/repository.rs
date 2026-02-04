use crate::database::types::{
    AddMessageInput, Conversation, ConversationSummary, Message, MessageMeta,
    UpdateConversationInput, UpdateMessageInput,
};
use rusqlite::{params, Connection, OptionalExtension, Result};

pub fn list_conversations(conn: &Connection) -> Result<Vec<ConversationSummary>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, title, summary, status, state, created_at, updated_at
        FROM conversations
        ORDER BY updated_at DESC
        "#,
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(ConversationSummary {
            id: row.get(0)?,
            title: row.get(1)?,
            summary: row.get(2)?,
            status: row.get(3)?,
            state: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    rows.collect()
}

pub fn get_conversation(conn: &Connection, id: &str) -> Result<Option<Conversation>> {
    let mut stmt = conn.prepare(
        r#"
        SELECT id, title, summary, status, state, created_at, updated_at
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
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
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

pub fn create_conversation(conn: &Connection, title: &str) -> Result<Conversation> {
    let id = format!("conv-{}", chrono::Utc::now().timestamp_millis());
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        r#"
        INSERT INTO conversations (id, title, summary, status, state, created_at, updated_at)
        VALUES (?1, ?2, '', 'idle', 'active', ?3, ?3)
        "#,
        params![id, title, now],
    )?;

    Ok(Conversation {
        id,
        title: title.to_string(),
        summary: String::new(),
        status: "idle".to_string(),
        state: "active".to_string(),
        created_at: now,
        updated_at: now,
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
