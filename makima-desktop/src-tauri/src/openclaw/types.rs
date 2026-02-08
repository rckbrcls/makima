use serde::{Deserialize, Serialize};

// ============================================================================
// OpenClaw WebSocket Protocol Types
// ============================================================================

/// A WebSocket frame sent to the OpenClaw gateway
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum OutgoingFrame {
    Req {
        id: String,
        method: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        params: Option<serde_json::Value>,
    },
}

/// A WebSocket frame received from the OpenClaw gateway
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum IncomingFrame {
    Res {
        id: String,
        ok: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        payload: Option<serde_json::Value>,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<ResError>,
    },
    Event {
        event: String,
        #[serde(default)]
        payload: serde_json::Value,
        #[serde(default)]
        seq: u64,
    },
}

/// Raw gateway event envelope emitted as `openclaw:gateway-event`
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayEventEnvelope {
    pub event: String,
    #[serde(default)]
    pub payload: serde_json::Value,
    #[serde(default)]
    pub seq: u64,
}

/// Error payload in a Res frame — can be a string or an object { code, message }
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ResError {
    Text(String),
    Structured {
        code: Option<String>,
        message: Option<String>,
    },
}

impl ResError {
    pub fn to_message(&self) -> String {
        match self {
            ResError::Text(s) => s.clone(),
            ResError::Structured { message, code } => {
                match (message, code) {
                    (Some(msg), _) => msg.clone(),
                    (None, Some(c)) => c.clone(),
                    _ => "Unknown error".to_string(),
                }
            }
        }
    }
}

// ============================================================================
// Connection Types
// ============================================================================

/// Parameters for connecting to the gateway
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectParams {
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
}

/// Connection status emitted to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawConnectionStatus {
    pub connected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gateway_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ============================================================================
// Installation & Process Types
// ============================================================================

/// Information about the OpenClaw installation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawInstallation {
    pub installed: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub node_available: bool,
}

/// Status of the gateway process
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayProcessStatus {
    pub is_running: bool,
    pub managed_by_app: bool,
    pub pid: Option<u32>,
    pub port: u16,
}

// ============================================================================
// Agent Event Types (emitted to frontend via Tauri events)
// ============================================================================

/// Agent event payload emitted as `openclaw:agent-event`
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawAgentEvent {
    pub event_type: String,
    pub session_key: String,
    #[serde(default)]
    pub data: serde_json::Value,
}

/// Approval request payload emitted as `openclaw:approval-request`
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalRequestPayload {
    pub approval_id: String,
    pub session_key: String,
    pub tool_name: String,
    pub arguments: serde_json::Value,
    pub risk: String,
    pub description: String,
}

/// Agent configuration from gateway
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawAgentConfig {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
    #[serde(default)]
    pub tools: Vec<String>,
}

/// Gateway configuration response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayConfig {
    #[serde(default)]
    pub agents: Vec<OpenClawAgentConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}
