use crate::anthropic::client::AnthropicClient;
use crate::anthropic::types::{
    AnthropicMessage, AnthropicUsageStats, StreamChunkEvent, StreamErrorEvent,
};
use dashmap::DashSet;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

pub struct AnthropicState {
    pub client: AnthropicClient,
    pub active_streams: Arc<DashSet<String>>,
}

impl AnthropicState {
    pub fn new(base_url: Option<String>) -> Self {
        Self {
            client: AnthropicClient::new(base_url),
            active_streams: Arc::new(DashSet::new()),
        }
    }
}

impl Default for AnthropicState {
    fn default() -> Self {
        Self::new(None)
    }
}

#[tauri::command]
pub async fn anthropic_validate_key(
    state: State<'_, AnthropicState>,
    api_key: String,
) -> Result<bool, String> {
    state.client.validate_api_key(&api_key).await
}

#[tauri::command]
pub async fn anthropic_chat_stream(
    app: AppHandle,
    state: State<'_, AnthropicState>,
    session_id: String,
    model: String,
    messages: Vec<AnthropicMessage>,
    api_key: String,
    system: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<i32>,
) -> Result<(), String> {
    state.active_streams.insert(session_id.clone());

    let active_streams = state.active_streams.clone();
    let session_id_clone = session_id.clone();
    let app_clone = app.clone();

    let max_tokens = max_tokens.unwrap_or(4096);

    let result = state
        .client
        .chat_stream(
            &api_key,
            model,
            messages,
            system,
            temperature,
            max_tokens,
            move |content, done, stop_reason, usage| {
                if !active_streams.contains(&session_id_clone) {
                    return false;
                }

                let usage_stats = usage.map(|u| AnthropicUsageStats {
                    input_tokens: u.input_tokens,
                    output_tokens: u.output_tokens,
                });

                let event = StreamChunkEvent {
                    session_id: session_id_clone.clone(),
                    content,
                    done,
                    stop_reason,
                    usage: usage_stats,
                };

                if let Err(e) = app_clone.emit("anthropic:stream-chunk", &event) {
                    log::error!("Failed to emit Anthropic stream chunk: {}", e);
                    return false;
                }

                !done
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
            let _ = app.emit("anthropic:stream-error", &error_event);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn anthropic_cancel_stream(
    state: State<'_, AnthropicState>,
    session_id: String,
) -> Result<bool, String> {
    let was_active = state.active_streams.remove(&session_id).is_some();
    Ok(was_active)
}
