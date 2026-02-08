use crate::openclaw::client::OpenClawClient;
use crate::openclaw::config::{self, OpenClawFileConfig};
use crate::openclaw::process::{self, GatewayProcessManager};
use crate::openclaw::types::{
    GatewayProcessStatus, OpenClawAgentConfig, OpenClawConnectionStatus, OpenClawInstallation,
};
use serde_json::Value;
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

async fn send_rpc(
    state: &State<'_, OpenClawState>,
    method: &str,
    params: Option<Value>,
) -> Result<Value, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard
        .as_ref()
        .ok_or("Not connected to OpenClaw gateway")?;

    client.send_request(method, params).await
}

async fn send_rpc_with_fallback(
    state: &State<'_, OpenClawState>,
    methods: &[&str],
    params: Option<Value>,
) -> Result<Value, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard
        .as_ref()
        .ok_or("Not connected to OpenClaw gateway")?;

    client.send_request_with_fallback(methods, params).await
}

fn value_as_non_empty_string(value: &Value) -> Option<String> {
    match value {
        Value::String(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        Value::Number(value) => Some(value.to_string()),
        _ => None,
    }
}

fn first_non_empty_string(
    source: &serde_json::Map<String, Value>,
    keys: &[&str],
) -> Option<String> {
    keys.iter()
        .find_map(|key| source.get(*key).and_then(value_as_non_empty_string))
}

fn first_nested_string(value: &Value, keys: &[&str]) -> Option<String> {
    match value {
        Value::Object(object) => first_non_empty_string(object, keys),
        _ => value_as_non_empty_string(value),
    }
}

fn extract_agent_items(value: &Value) -> Vec<Value> {
    match value {
        Value::Array(items) => items.clone(),
        Value::Object(object) => {
            for key in ["agents", "items", "list", "data"] {
                if let Some(Value::Array(items)) = object.get(key) {
                    return items.clone();
                }
            }

            for key in ["result", "payload", "value"] {
                if let Some(nested) = object.get(key) {
                    let nested_items = extract_agent_items(nested);
                    if !nested_items.is_empty() {
                        return nested_items;
                    }
                }
            }

            Vec::new()
        }
        _ => Vec::new(),
    }
}

fn parse_tools(value: Option<&Value>) -> Vec<String> {
    let mut tools = Vec::new();

    if let Some(Value::Array(items)) = value {
        for item in items {
            let maybe_tool = match item {
                Value::Object(object) => first_non_empty_string(object, &["name", "id", "tool"]),
                _ => value_as_non_empty_string(item),
            };

            if let Some(tool_name) = maybe_tool {
                if !tools.contains(&tool_name) {
                    tools.push(tool_name);
                }
            }
        }
    }

    tools
}

fn parse_agent_item(value: &Value) -> Option<OpenClawAgentConfig> {
    if let Ok(agent) = serde_json::from_value::<OpenClawAgentConfig>(value.clone()) {
        return Some(agent);
    }

    let object = value.as_object()?;
    let id = first_non_empty_string(object, &["id", "agentId", "key", "slug"])
        .or_else(|| first_non_empty_string(object, &["name", "displayName", "title"]))?;
    let name = first_non_empty_string(object, &["name", "displayName", "title"])
        .unwrap_or_else(|| id.clone());
    let description = first_non_empty_string(object, &["description", "summary"]);

    let model = object
        .get("model")
        .and_then(|value| first_nested_string(value, &["id", "name", "model", "value"]))
        .or_else(|| first_non_empty_string(object, &["modelId"]));

    let provider = object
        .get("provider")
        .and_then(|value| first_nested_string(value, &["id", "name", "provider", "value"]))
        .or_else(|| first_non_empty_string(object, &["providerId"]));

    let tools = parse_tools(
        object
            .get("tools")
            .or_else(|| object.get("toolNames"))
            .or_else(|| object.get("allowedTools")),
    );

    Some(OpenClawAgentConfig {
        id,
        name,
        description,
        model,
        provider,
        tools,
    })
}

fn parse_agents_from_response(response: &Value) -> Vec<OpenClawAgentConfig> {
    extract_agent_items(response)
        .iter()
        .filter_map(parse_agent_item)
        .collect()
}

fn parse_agents_from_file_config(config: &OpenClawFileConfig) -> Vec<OpenClawAgentConfig> {
    config
        .agents
        .as_ref()
        .map(|agents| {
            agents
                .list
                .iter()
                .map(|entry| OpenClawAgentConfig {
                    id: entry.id.clone(),
                    name: entry.name.clone().unwrap_or_else(|| entry.id.clone()),
                    description: None,
                    model: entry.model.clone(),
                    provider: None,
                    tools: Vec::new(),
                })
                .collect()
        })
        .unwrap_or_default()
}

fn includes_method_not_found(error: &str) -> bool {
    let normalized = error.to_lowercase();
    [
        "unknown method",
        "method not found",
        "not implemented",
        "unrecognized method",
        "does not exist",
    ]
    .iter()
    .any(|pattern| normalized.contains(pattern))
}

fn includes_param_validation(error: &str) -> bool {
    let normalized = error.to_lowercase();
    [
        "invalid params",
        "invalid send params",
        "must have required property",
        "unexpected property",
        "failed validation",
        "validation error",
    ]
    .iter()
    .any(|pattern| normalized.contains(pattern))
}

fn build_send_payload_variants(
    agent_id: &str,
    session_key: &str,
    message: &str,
    idempotency_key: &str,
) -> Vec<Value> {
    vec![
        serde_json::json!({
            "to": { "sessionKey": session_key },
            "idempotencyKey": idempotency_key,
            "message": message,
        }),
        serde_json::json!({
            "to": { "sessionKey": session_key, "agentId": agent_id },
            "idempotencyKey": idempotency_key,
            "message": message,
        }),
        serde_json::json!({
            "to": session_key,
            "idempotencyKey": idempotency_key,
            "message": message,
        }),
        serde_json::json!({
            "to": { "sessionKey": session_key },
            "idempotencyKey": idempotency_key,
            "content": message,
        }),
        serde_json::json!({
            "to": { "sessionKey": session_key },
            "idempotencyKey": idempotency_key,
            "input": { "type": "text", "text": message },
        }),
    ]
}

// ============================================================================
// Installation & Process Commands
// ============================================================================

#[tauri::command]
pub async fn openclaw_detect_installation() -> Result<OpenClawInstallation, String> {
    Ok(process::detect_installation())
}

#[tauri::command]
pub async fn openclaw_install() -> Result<OpenClawInstallation, String> {
    process::install_openclaw().await
}

#[tauri::command]
pub async fn openclaw_start_gateway(
    state: State<'_, OpenClawState>,
    port: Option<u16>,
    workspace: Option<String>,
    password: Option<String>,
) -> Result<u32, String> {
    let installation = process::detect_installation();

    if !installation.installed {
        return Err("OpenClaw is not installed. Install with: npm i -g openclaw".to_string());
    }

    let effective_port = port.unwrap_or(18789);

    // Ensure config exists before starting
    config::ensure_config(effective_port, workspace, password, None)?;

    // Update manager port
    {
        let mut manager = state
            .process_manager
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        manager.port = effective_port;
    }

    process::start_gateway(&installation, &state.process_manager, effective_port).await
}

#[tauri::command]
pub async fn openclaw_stop_gateway(state: State<'_, OpenClawState>) -> Result<(), String> {
    process::stop_gateway(&state.process_manager).await
}

#[tauri::command]
pub async fn openclaw_get_gateway_status(
    state: State<'_, OpenClawState>,
) -> Result<GatewayProcessStatus, String> {
    Ok(process::get_gateway_status(&state.process_manager))
}

// ============================================================================
// Config File Commands
// ============================================================================

#[tauri::command]
pub async fn openclaw_read_file_config() -> Result<Option<OpenClawFileConfig>, String> {
    config::read_config()
}

#[tauri::command]
pub async fn openclaw_write_file_config(config: OpenClawFileConfig) -> Result<(), String> {
    config::write_config(&config)
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
// Generic RPC (v3 first + fallback)
// ============================================================================

#[tauri::command]
pub async fn openclaw_rpc(
    state: State<'_, OpenClawState>,
    method: String,
    params: Option<Value>,
) -> Result<Value, String> {
    send_rpc(&state, &method, params).await
}

#[tauri::command]
pub async fn openclaw_rpc_with_fallback(
    state: State<'_, OpenClawState>,
    methods: Vec<String>,
    params: Option<Value>,
) -> Result<Value, String> {
    if methods.is_empty() {
        return Err("At least one method is required".to_string());
    }

    let refs: Vec<&str> = methods.iter().map(String::as_str).collect();
    send_rpc_with_fallback(&state, &refs, params).await
}

#[tauri::command]
pub async fn openclaw_get_status(state: State<'_, OpenClawState>) -> Result<Value, String> {
    send_rpc_with_fallback(&state, &["status", "gateway.status"], None).await
}

#[tauri::command]
pub async fn openclaw_get_health(state: State<'_, OpenClawState>) -> Result<Value, String> {
    send_rpc_with_fallback(&state, &["health", "gateway.health"], None).await
}

#[tauri::command]
pub async fn openclaw_ping(state: State<'_, OpenClawState>) -> Result<Value, String> {
    send_rpc_with_fallback(&state, &["ping", "gateway.ping"], None).await
}

// ============================================================================
// Wizard Commands
// ============================================================================

#[tauri::command]
pub async fn openclaw_wizard_start(
    state: State<'_, OpenClawState>,
    params: Option<Value>,
) -> Result<Value, String> {
    send_rpc_with_fallback(&state, &["wizard.start", "setup.wizard.start"], params).await
}

#[tauri::command]
pub async fn openclaw_wizard_next(
    state: State<'_, OpenClawState>,
    session_id: String,
    input: Option<Value>,
) -> Result<Value, String> {
    let params = serde_json::json!({
        "sessionId": session_id,
        "input": input,
    });

    send_rpc_with_fallback(&state, &["wizard.next", "setup.wizard.next"], Some(params)).await
}

#[tauri::command]
pub async fn openclaw_wizard_status(
    state: State<'_, OpenClawState>,
    session_id: Option<String>,
) -> Result<Value, String> {
    let params = session_id.map(|id| serde_json::json!({ "sessionId": id }));
    send_rpc_with_fallback(&state, &["wizard.status", "setup.wizard.status"], params).await
}

#[tauri::command]
pub async fn openclaw_wizard_cancel(
    state: State<'_, OpenClawState>,
    session_id: String,
) -> Result<Value, String> {
    let params = serde_json::json!({ "sessionId": session_id });
    send_rpc_with_fallback(&state, &["wizard.cancel", "setup.wizard.cancel"], Some(params))
        .await
}

// ============================================================================
// Session, Agent, Approval and Tool Commands
// ============================================================================

#[tauri::command]
pub async fn openclaw_create_session(
    state: State<'_, OpenClawState>,
    agent_id: Option<String>,
    title: Option<String>,
) -> Result<Value, String> {
    let params = serde_json::json!({
        "agentId": agent_id,
        "title": title,
    });

    send_rpc_with_fallback(&state, &["session.new", "session.create"], Some(params)).await
}

#[tauri::command]
pub async fn openclaw_resume_session(
    state: State<'_, OpenClawState>,
    session_key: String,
) -> Result<Value, String> {
    let params = serde_json::json!({ "sessionKey": session_key });
    send_rpc_with_fallback(&state, &["session.resume", "session.get"], Some(params)).await
}

#[tauri::command]
pub async fn openclaw_send_message(
    state: State<'_, OpenClawState>,
    agent_id: String,
    session_key: String,
    message: String,
) -> Result<Value, String> {
    let idempotency_key = uuid::Uuid::new_v4().to_string();
    let variants =
        build_send_payload_variants(&agent_id, &session_key, &message, &idempotency_key);
    let mut send_errors: Vec<String> = Vec::new();
    let mut should_try_legacy = true;

    for params in variants {
        match send_rpc(&state, "send", Some(params)).await {
            Ok(response) => return Ok(response),
            Err(error) => {
                send_errors.push(format!("send -> {}", error));

                if includes_method_not_found(&error) {
                    break;
                }

                if includes_param_validation(&error) {
                    continue;
                }

                should_try_legacy = false;
                break;
            }
        }
    }

    if should_try_legacy {
        let legacy_params = serde_json::json!({
            "agentId": agent_id,
            "sessionKey": session_key,
            "message": message,
        });

        match send_rpc(&state, "agent.send", Some(legacy_params)).await {
            Ok(response) => return Ok(response),
            Err(error) => {
                send_errors.push(format!("agent.send -> {}", error));
            }
        }
    }

    Err(send_errors.join(" | "))
}

#[tauri::command]
pub async fn openclaw_list_agents(
    state: State<'_, OpenClawState>,
) -> Result<Vec<OpenClawAgentConfig>, String> {
    let rpc_result = send_rpc_with_fallback(&state, &["agent.list", "agents.list"], None).await;

    match rpc_result {
        Ok(response) => {
            let agents = parse_agents_from_response(&response);
            if !agents.is_empty() {
                return Ok(agents);
            }

            if let Ok(Some(file_config)) = config::read_config() {
                let fallback_agents = parse_agents_from_file_config(&file_config);
                if !fallback_agents.is_empty() {
                    return Ok(fallback_agents);
                }
            }

            Ok(Vec::new())
        }
        Err(rpc_error) => {
            if let Ok(Some(file_config)) = config::read_config() {
                let fallback_agents = parse_agents_from_file_config(&file_config);
                if !fallback_agents.is_empty() {
                    return Ok(fallback_agents);
                }
            }

            Err(rpc_error)
        }
    }
}

#[tauri::command]
pub async fn openclaw_list_approvals(
    state: State<'_, OpenClawState>,
) -> Result<Value, String> {
    send_rpc_with_fallback(&state, &["approval.list", "approvals.list"], None).await
}

#[tauri::command]
pub async fn openclaw_resolve_approval(
    state: State<'_, OpenClawState>,
    approval_id: String,
    approved: bool,
    reason: Option<String>,
) -> Result<Value, String> {
    let params = serde_json::json!({
        "approvalId": approval_id,
        "approved": approved,
        "reason": reason,
    });

    send_rpc_with_fallback(&state, &["approval.resolve", "approvals.resolve"], Some(params))
        .await
}

#[tauri::command]
pub async fn openclaw_list_tools(state: State<'_, OpenClawState>) -> Result<Value, String> {
    send_rpc_with_fallback(&state, &["tools.list", "tool.list"], None).await
}

#[tauri::command]
pub async fn openclaw_invoke_tool(
    state: State<'_, OpenClawState>,
    name: String,
    arguments: Option<Value>,
) -> Result<Value, String> {
    let params = serde_json::json!({
        "name": name,
        "arguments": arguments,
    });

    send_rpc_with_fallback(&state, &["tools.invoke", "tool.invoke"], Some(params)).await
}

// ============================================================================
// Runtime Config Commands
// ============================================================================

#[tauri::command]
pub async fn openclaw_get_config(state: State<'_, OpenClawState>) -> Result<Value, String> {
    send_rpc_with_fallback(&state, &["config.get", "settings.get"], None).await
}

#[tauri::command]
pub async fn openclaw_get_config_schema(
    state: State<'_, OpenClawState>,
) -> Result<Value, String> {
    send_rpc_with_fallback(&state, &["config.schema", "config.getSchema"], None).await
}

#[tauri::command]
pub async fn openclaw_apply_config(
    state: State<'_, OpenClawState>,
    config: Value,
) -> Result<Value, String> {
    let params = serde_json::json!({ "config": config });
    send_rpc_with_fallback(&state, &["config.apply", "config.patch"], Some(params)).await
}

#[tauri::command]
pub async fn openclaw_patch_config(
    state: State<'_, OpenClawState>,
    patch: Value,
) -> Result<Value, String> {
    let params = serde_json::json!({ "patch": patch });
    send_rpc_with_fallback(&state, &["config.patch", "config.apply"], Some(params)).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::openclaw::config::{
        AgentEntryConfig, AgentsFileConfig, GatewayAuthConfig, GatewayFileConfig,
    };
    use serde_json::json;

    #[test]
    fn parse_agents_from_standard_gateway_shape() {
        let response = json!({
            "agents": [
                {
                    "id": "writer",
                    "name": "Writer",
                    "description": "Writes docs",
                    "model": "anthropic/claude-sonnet-4-5",
                    "provider": "anthropic",
                    "tools": ["shell", "grep"]
                }
            ]
        });

        let agents = parse_agents_from_response(&response);
        assert_eq!(agents.len(), 1);
        assert_eq!(agents[0].id, "writer");
        assert_eq!(agents[0].name, "Writer");
        assert_eq!(agents[0].tools, vec!["shell", "grep"]);
    }

    #[test]
    fn parse_agents_from_nested_legacy_shape() {
        let response = json!({
            "payload": {
                "items": [
                    {
                        "agentId": "builder",
                        "displayName": "Build Bot",
                        "model": { "id": "anthropic/claude-sonnet-4-5" },
                        "tools": [{ "name": "bash" }, { "id": "ripgrep" }, "git"]
                    }
                ]
            }
        });

        let agents = parse_agents_from_response(&response);
        assert_eq!(agents.len(), 1);
        assert_eq!(agents[0].id, "builder");
        assert_eq!(agents[0].name, "Build Bot");
        assert_eq!(
            agents[0].model.as_deref(),
            Some("anthropic/claude-sonnet-4-5")
        );
        assert_eq!(agents[0].tools, vec!["bash", "ripgrep", "git"]);
    }

    #[test]
    fn parse_agents_from_file_config_entries() {
        let config = OpenClawFileConfig {
            gateway: GatewayFileConfig {
                mode: "local".to_string(),
                port: 18789,
                auth: GatewayAuthConfig {
                    token: "token".to_string(),
                },
                workspace: None,
                password: None,
            },
            agents: Some(AgentsFileConfig {
                list: vec![
                    AgentEntryConfig {
                        id: "from-config-1".to_string(),
                        name: None,
                        default: None,
                        model: Some("openai/gpt-4.1".to_string()),
                    },
                    AgentEntryConfig {
                        id: "from-config-2".to_string(),
                        name: Some("Named Agent".to_string()),
                        default: Some(false),
                        model: None,
                    },
                ],
            }),
        };

        let agents = parse_agents_from_file_config(&config);
        assert_eq!(agents.len(), 2);
        assert_eq!(agents[0].id, "from-config-1");
        assert_eq!(agents[0].name, "from-config-1");
        assert_eq!(agents[0].model.as_deref(), Some("openai/gpt-4.1"));
        assert_eq!(agents[1].name, "Named Agent");
    }

    #[test]
    fn build_send_payload_variants_include_v3_fields() {
        let payloads = build_send_payload_variants(
            "agent-a",
            "session-a",
            "hello",
            "00000000-0000-4000-8000-000000000000",
        );

        assert!(!payloads.is_empty());
        assert!(payloads.iter().all(|payload| payload.get("to").is_some()));
        assert!(payloads
            .iter()
            .all(|payload| payload.get("idempotencyKey").is_some()));
    }

    #[test]
    fn detect_method_not_found_and_validation_errors() {
        assert!(includes_method_not_found("unknown method: agent.send"));
        assert!(includes_param_validation(
            "invalid send params: must have required property 'to'"
        ));
        assert!(!includes_param_validation("session not found"));
    }
}
