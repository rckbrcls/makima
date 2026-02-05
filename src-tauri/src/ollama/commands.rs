use crate::ollama::client::OllamaClient;
use crate::ollama::process::{
    self, OllamaInstallation, OllamaProcessManager, OllamaProcessStatus,
};
use crate::ollama::types::{
    OllamaChatRequest, OllamaMessage, OllamaModelInfo, OllamaOptions, PullProgressEvent,
    StreamChunkEvent, StreamErrorEvent,
};
use dashmap::DashSet;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

pub struct OllamaState {
    pub client: OllamaClient,
    pub active_streams: Arc<DashSet<String>>,
    pub process_manager: Arc<Mutex<OllamaProcessManager>>,
}

impl OllamaState {
    pub fn new(base_url: Option<String>) -> Self {
        Self {
            client: OllamaClient::new(base_url),
            active_streams: Arc::new(DashSet::new()),
            process_manager: Arc::new(Mutex::new(OllamaProcessManager::default())),
        }
    }
}

impl Default for OllamaState {
    fn default() -> Self {
        Self::new(None)
    }
}

#[tauri::command]
pub async fn ollama_health_check(state: State<'_, OllamaState>) -> Result<bool, String> {
    Ok(state.client.check_health().await)
}

#[tauri::command]
pub async fn ollama_list_models(
    state: State<'_, OllamaState>,
) -> Result<Vec<OllamaModelInfo>, String> {
    state.client.list_models().await
}

#[tauri::command]
pub async fn ollama_chat_stream(
    app: AppHandle,
    state: State<'_, OllamaState>,
    session_id: String,
    model: String,
    messages: Vec<OllamaMessage>,
    temperature: Option<f32>,
    max_tokens: Option<i32>,
) -> Result<(), String> {
    // Register this stream as active
    state.active_streams.insert(session_id.clone());

    let request = OllamaChatRequest {
        model,
        messages,
        stream: true,
        options: Some(OllamaOptions {
            temperature,
            num_predict: max_tokens,
            ..Default::default()
        }),
    };

    let active_streams = state.active_streams.clone();
    let session_id_clone = session_id.clone();
    let app_clone = app.clone();

    let result = state
        .client
        .chat_stream(request, move |chunk| {
            // Check if stream was cancelled
            if !active_streams.contains(&session_id_clone) {
                return false;
            }

            let content = chunk
                .message
                .as_ref()
                .map(|m| m.content.clone())
                .unwrap_or_default();

            let event = StreamChunkEvent {
                session_id: session_id_clone.clone(),
                content,
                done: chunk.done,
                done_reason: chunk.done_reason,
                total_duration: chunk.total_duration,
                eval_count: chunk.eval_count,
            };

            if let Err(e) = app_clone.emit("ollama:stream-chunk", &event) {
                log::error!("Failed to emit stream chunk: {}", e);
                return false;
            }

            !chunk.done
        })
        .await;

    // Remove from active streams
    state.active_streams.remove(&session_id);

    match result {
        Ok(_) => Ok(()),
        Err(e) => {
            let error_event = StreamErrorEvent {
                session_id: session_id.clone(),
                error: e.clone(),
            };
            let _ = app.emit("ollama:stream-error", &error_event);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn ollama_cancel_stream(
    state: State<'_, OllamaState>,
    session_id: String,
) -> Result<bool, String> {
    let was_active = state.active_streams.remove(&session_id).is_some();
    Ok(was_active)
}

#[tauri::command]
pub async fn ollama_pull_model(
    app: AppHandle,
    state: State<'_, OllamaState>,
    model: String,
) -> Result<(), String> {
    let model_clone = model.clone();
    let app_clone = app.clone();

    let result = state
        .client
        .pull_model(&model, move |progress| {
            let percent = match (progress.completed, progress.total) {
                (Some(completed), Some(total)) if total > 0 => {
                    Some((completed as f32 / total as f32) * 100.0)
                }
                _ => None,
            };

            let is_done = progress.status == "success";

            let event = PullProgressEvent {
                model: model_clone.clone(),
                status: progress.status,
                progress: percent,
                done: is_done,
            };

            if let Err(e) = app_clone.emit("ollama:pull-progress", &event) {
                log::error!("Failed to emit pull progress: {}", e);
                return false;
            }

            true
        })
        .await;

    match result {
        Ok(_) => Ok(()),
        Err(e) => {
            let event = PullProgressEvent {
                model: model.clone(),
                status: format!("error: {}", e),
                progress: None,
                done: true,
            };
            let _ = app.emit("ollama:pull-progress", &event);
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn ollama_delete_model(
    _state: State<'_, OllamaState>,
    model: String,
) -> Result<(), String> {
    let url = "http://localhost:11434/api/delete".to_string();

    let client = reqwest::Client::new();
    let response = client
        .delete(&url)
        .json(&serde_json::json!({ "name": model }))
        .send()
        .await
        .map_err(|e| format!("Failed to delete model: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to delete model ({}): {}", status, body));
    }

    Ok(())
}

// ============================================================================
// Process Management Commands
// ============================================================================

#[tauri::command]
pub async fn ollama_detect_installation() -> Result<OllamaInstallation, String> {
    Ok(process::detect_installation())
}

#[tauri::command]
pub async fn ollama_start_process(state: State<'_, OllamaState>) -> Result<u32, String> {
    let installation = process::detect_installation();

    if installation.installation_type == "none" {
        return Err("Ollama is not installed. Please install it from https://ollama.ai".to_string());
    }

    process::start_ollama(&installation, &state.process_manager).await
}

#[tauri::command]
pub async fn ollama_stop_process(state: State<'_, OllamaState>) -> Result<(), String> {
    process::stop_ollama(&state.process_manager, None).await
}

#[tauri::command]
pub async fn ollama_get_process_status(
    state: State<'_, OllamaState>,
) -> Result<OllamaProcessStatus, String> {
    Ok(process::get_process_status(&state.process_manager))
}
