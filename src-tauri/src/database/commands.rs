use crate::database::repository;
use crate::database::types::{
    AddMessageInput, Conversation, ConversationSummary, Message, UpdateConversationInput,
    UpdateMessageInput,
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
) -> Result<Conversation, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    repository::create_conversation(&conn, &title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn db_update_conversation(
    state: State<'_, DatabaseState>,
    id: String,
    title: Option<String>,
    summary: Option<String>,
    status: Option<String>,
    conversation_state: Option<String>,
) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let input = UpdateConversationInput {
        title,
        summary,
        status,
        state: conversation_state,
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
