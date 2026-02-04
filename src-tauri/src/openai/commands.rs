use crate::openai::client::OpenAIClient;
use crate::openai::types::{OpenAIMessage, StreamChunkEvent, StreamErrorEvent};
use dashmap::DashSet;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

pub struct OpenAIState {
    pub client: OpenAIClient,
    pub active_streams: Arc<DashSet<String>>,
}

impl OpenAIState {
    pub fn new(base_url: Option<String>) -> Self {
        Self {
            client: OpenAIClient::new(base_url),
            active_streams: Arc::new(DashSet::new()),
        }
    }
}

impl Default for OpenAIState {
    fn default() -> Self {
        Self::new(None)
    }
}

#[tauri::command]
pub async fn openai_validate_key(
    state: State<'_, OpenAIState>,
    api_key: String,
) -> Result<bool, String> {
    state.client.validate_api_key(&api_key).await
}

#[tauri::command]
pub async fn openai_chat_stream(
    app: AppHandle,
    state: State<'_, OpenAIState>,
    session_id: String,
    model: String,
    messages: Vec<OpenAIMessage>,
    api_key: String,
    temperature: Option<f32>,
    max_tokens: Option<i32>,
) -> Result<(), String> {
    state.active_streams.insert(session_id.clone());

    let active_streams = state.active_streams.clone();
    let session_id_clone = session_id.clone();
    let app_clone = app.clone();

    let result = state
        .client
        .chat_stream(
            &api_key,
            model,
            messages,
            temperature,
            max_tokens,
            move |chunk| {
                if !active_streams.contains(&session_id_clone) {
                    return false;
                }

                let content = chunk
                    .choices
                    .first()
                    .and_then(|c| c.delta.as_ref())
                    .and_then(|d| d.content.clone())
                    .unwrap_or_default();

                let finish_reason = chunk
                    .choices
                    .first()
                    .and_then(|c| c.finish_reason.clone());

                let is_done = finish_reason.is_some();

                let event = StreamChunkEvent {
                    session_id: session_id_clone.clone(),
                    content,
                    done: is_done,
                    finish_reason,
                    usage: chunk.usage,
                };

                if let Err(e) = app_clone.emit("openai:stream-chunk", &event) {
                    log::error!("Failed to emit OpenAI stream chunk: {}", e);
                    return false;
                }

                !is_done
            },
        )
        .await;

    state.active_streams.remove(&session_id);

    match result {
        Ok(_) => Ok(()),
        Err(e) => {
            let error_event = StreamErrorEvent {
                session_id: session_id.clone(),
                error: e.clone(),
            };
            let _ = app.emit("openai:stream-error", &error_event);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn openai_cancel_stream(
    state: State<'_, OpenAIState>,
    session_id: String,
) -> Result<bool, String> {
    let was_active = state.active_streams.remove(&session_id).is_some();
    Ok(was_active)
}
