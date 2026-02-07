use crate::openclaw::client::OpenClawClient;
use crate::openclaw::process::{self, GatewayProcessManager};
use crate::openclaw::types::{
    GatewayProcessStatus, OpenClawAgentConfig, OpenClawConnectionStatus, OpenClawInstallation,
};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex as TokioMutex;

pub struct OpenClawState {
    pub client: Arc<TokioMutex<Option<OpenClawClient>>>,
    pub process_manager: Arc<Mutex<GatewayProcessManager>>,
}

impl Default for OpenClawState {
    fn default() -> Self {
        Self {
            client: Arc::new(TokioMutex::new(None)),
            process_manager: Arc::new(Mutex::new(GatewayProcessManager::default())),
        }
    }
}

// ============================================================================
// Installation & Process Commands
// ============================================================================

#[tauri::command]
pub async fn openclaw_detect_installation() -> Result<OpenClawInstallation, String> {
    Ok(process::detect_installation())
}

#[tauri::command]
pub async fn openclaw_start_gateway(
    state: State<'_, OpenClawState>,
) -> Result<u32, String> {
    let installation = process::detect_installation();

    if !installation.installed {
        return Err(
            "OpenClaw is not installed. Install with: npm i -g openclaw".to_string(),
        );
    }

    let port = {
        let manager = state
            .process_manager
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        manager.port
    };

    process::start_gateway(&installation, &state.process_manager, port).await
}

#[tauri::command]
pub async fn openclaw_stop_gateway(
    state: State<'_, OpenClawState>,
) -> Result<(), String> {
    process::stop_gateway(&state.process_manager).await
}

#[tauri::command]
pub async fn openclaw_get_gateway_status(
    state: State<'_, OpenClawState>,
) -> Result<GatewayProcessStatus, String> {
    Ok(process::get_gateway_status(&state.process_manager))
}

// ============================================================================
// Connection Commands
// ============================================================================

#[tauri::command]
pub async fn openclaw_connect(
    app: AppHandle,
    state: State<'_, OpenClawState>,
    password: Option<String>,
    token: Option<String>,
) -> Result<OpenClawConnectionStatus, String> {
    // Disconnect existing connection if any
    {
        let mut client_guard = state.client.lock().await;
        if let Some(existing) = client_guard.take() {
            existing.disconnect().await;
        }
    }

    let port = {
        let manager = state
            .process_manager
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        manager.port
    };

    let url = format!("ws://127.0.0.1:{}", port);

    match OpenClawClient::connect(&url, password, token, app.clone()).await {
        Ok(client) => {
            let status = OpenClawConnectionStatus {
                connected: true,
                gateway_version: None,
                error: None,
            };

            let mut client_guard = state.client.lock().await;
            *client_guard = Some(client);

            Ok(status)
        }
        Err(e) => {
            let status = OpenClawConnectionStatus {
                connected: false,
                gateway_version: None,
                error: Some(e.clone()),
            };

            let _ = app.emit("openclaw:connection-status", &status);

            Err(e)
        }
    }
}

#[tauri::command]
pub async fn openclaw_disconnect(
    app: AppHandle,
    state: State<'_, OpenClawState>,
) -> Result<(), String> {
    let mut client_guard = state.client.lock().await;
    if let Some(client) = client_guard.take() {
        client.disconnect().await;
    }

    let status = OpenClawConnectionStatus {
        connected: false,
        gateway_version: None,
        error: None,
    };
    let _ = app.emit("openclaw:connection-status", &status);

    Ok(())
}

#[tauri::command]
pub async fn openclaw_get_connection_status(
    state: State<'_, OpenClawState>,
) -> Result<OpenClawConnectionStatus, String> {
    let client_guard = state.client.lock().await;
    match &*client_guard {
        Some(client) if client.is_connected() => Ok(OpenClawConnectionStatus {
            connected: true,
            gateway_version: None,
            error: None,
        }),
        _ => Ok(OpenClawConnectionStatus {
            connected: false,
            gateway_version: None,
            error: None,
        }),
    }
}

// ============================================================================
// Agent Commands
// ============================================================================

#[tauri::command]
pub async fn openclaw_send_message(
    state: State<'_, OpenClawState>,
    agent_id: String,
    session_key: String,
    message: String,
) -> Result<serde_json::Value, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard
        .as_ref()
        .ok_or("Not connected to OpenClaw gateway")?;

    let params = serde_json::json!({
        "agentId": agent_id,
        "sessionKey": session_key,
        "message": message,
    });

    client.send_request("agent.send", Some(params)).await
}

#[tauri::command]
pub async fn openclaw_list_agents(
    state: State<'_, OpenClawState>,
) -> Result<Vec<OpenClawAgentConfig>, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard
        .as_ref()
        .ok_or("Not connected to OpenClaw gateway")?;

    let response = client.send_request("agent.list", None).await?;

    let agents: Vec<OpenClawAgentConfig> = serde_json::from_value(
        response
            .get("agents")
            .cloned()
            .unwrap_or(serde_json::Value::Array(vec![])),
    )
    .map_err(|e| format!("Failed to parse agents: {}", e))?;

    Ok(agents)
}

#[tauri::command]
pub async fn openclaw_resolve_approval(
    state: State<'_, OpenClawState>,
    approval_id: String,
    approved: bool,
    reason: Option<String>,
) -> Result<serde_json::Value, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard
        .as_ref()
        .ok_or("Not connected to OpenClaw gateway")?;

    let params = serde_json::json!({
        "approvalId": approval_id,
        "approved": approved,
        "reason": reason,
    });

    client.send_request("approval.resolve", Some(params)).await
}

#[tauri::command]
pub async fn openclaw_get_config(
    state: State<'_, OpenClawState>,
) -> Result<serde_json::Value, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard
        .as_ref()
        .ok_or("Not connected to OpenClaw gateway")?;

    client.send_request("config.get", None).await
}
