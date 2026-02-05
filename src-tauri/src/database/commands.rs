use crate::database::repository;
use crate::database::types::{
    AddMessageInput, Conversation, ConversationSummary, CreateRepositoryInput, Message,
    Repository, UpdateConversationInput, UpdateMessageInput, UpdateRepositoryInput,
};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;

pub struct DatabaseState {
    pub conn: Mutex<Connection>,
}

impl DatabaseState {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn: Mutex::new(conn),
        }
    }
}

#[tauri::command]
pub fn db_list_conversations(
    state: State<'_, DatabaseState>,
) -> Result<Vec<ConversationSummary>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    repository::list_conversations(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_get_conversation(
    state: State<'_, DatabaseState>,
    id: String,
) -> Result<Option<Conversation>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    repository::get_conversation(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_create_conversation(
    state: State<'_, DatabaseState>,
    title: String,
    repository_id: Option<String>,
) -> Result<Conversation, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    repository::create_conversation(&conn, &title, repository_id.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_update_conversation(
    state: State<'_, DatabaseState>,
    id: String,
    title: Option<String>,
    summary: Option<String>,
    status: Option<String>,
    conversation_state: Option<String>,
    repository_id: Option<String>,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let input = UpdateConversationInput {
        title,
        summary,
        status,
        state: conversation_state,
        repository_id,
    };
    repository::update_conversation(&conn, &id, &input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_delete_conversation(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    repository::delete_conversation(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_add_message(
    state: State<'_, DatabaseState>,
    conversation_id: String,
    id: String,
    role: String,
    message_state: String,
    content: String,
    created_at: i64,
    provider: String,
    model: String,
    tone: String,
) -> Result<Message, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let input = AddMessageInput {
        id,
        role,
        state: message_state,
        content,
        created_at,
        provider,
        model,
        tone,
    };
    repository::add_message(&conn, &conversation_id, &input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_update_message(
    state: State<'_, DatabaseState>,
    id: String,
    content: Option<String>,
    message_state: Option<String>,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let input = UpdateMessageInput {
        content,
        state: message_state,
    };
    repository::update_message(&conn, &id, &input).map_err(|e| e.to_string())
}

// Repository commands

#[tauri::command]
pub fn db_list_repositories(state: State<'_, DatabaseState>) -> Result<Vec<Repository>, String> {
    log::info!("[db_list_repositories] Command called");

    let conn = state.conn.lock().map_err(|e| {
        log::error!("[db_list_repositories] Failed to lock connection: {}", e);
        e.to_string()
    })?;

    let result = repository::list_repositories(&conn).map_err(|e| {
        log::error!("[db_list_repositories] list_repositories failed: {}", e);
        e.to_string()
    });

    match &result {
        Ok(repos) => log::info!("[db_list_repositories] Returning {} repositories", repos.len()),
        Err(e) => log::error!("[db_list_repositories] Error: {}", e),
    }

    result
}

#[tauri::command]
pub fn db_get_repository(
    state: State<'_, DatabaseState>,
    id: String,
) -> Result<Option<Repository>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    repository::get_repository(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_create_repository(
    state: State<'_, DatabaseState>,
    name: String,
    path: String,
    branch: Option<String>,
    tech: Option<Vec<String>>,
) -> Result<Repository, String> {
    log::info!(
        "[db_create_repository] Command called: name='{}', path='{}', branch={:?}, tech={:?}",
        name,
        path,
        branch,
        tech
    );

    let conn = state.conn.lock().map_err(|e| {
        log::error!("[db_create_repository] Failed to lock connection: {}", e);
        e.to_string()
    })?;

    log::info!("[db_create_repository] Connection locked, creating input...");

    let input = CreateRepositoryInput {
        name,
        path,
        branch,
        tech,
    };

    log::info!("[db_create_repository] Calling repository::create_repository...");

    let result = repository::create_repository(&conn, &input).map_err(|e| {
        log::error!("[db_create_repository] create_repository failed: {}", e);
        e.to_string()
    });

    match &result {
        Ok(repo) => log::info!("[db_create_repository] Success: {:?}", repo),
        Err(e) => log::error!("[db_create_repository] Error: {}", e),
    }

    result
}

#[tauri::command]
pub fn db_update_repository(
    state: State<'_, DatabaseState>,
    id: String,
    name: Option<String>,
    branch: Option<String>,
    tech: Option<Vec<String>>,
    status: Option<String>,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let input = UpdateRepositoryInput {
        name,
        branch,
        tech,
        status,
    };
    repository::update_repository(&conn, &id, &input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_delete_repository(state: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    repository::delete_repository(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_list_conversations_by_repo(
    state: State<'_, DatabaseState>,
    repository_id: String,
) -> Result<Vec<ConversationSummary>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    repository::list_conversations_by_repo(&conn, &repository_id).map_err(|e| e.to_string())
}
