use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ============================================================================
// OpenClaw File Config Types (~/.openclaw/openclaw.json)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenClawFileConfig {
    pub gateway: GatewayFileConfig,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agents: Option<AgentsFileConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentsFileConfig {
    #[serde(default)]
    pub list: Vec<AgentEntryConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentEntryConfig {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayFileConfig {
    pub mode: String,
    pub port: u16,
    #[serde(default = "default_auth")]
    pub auth: GatewayAuthConfig,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayAuthConfig {
    pub token: String,
}

fn default_auth() -> GatewayAuthConfig {
    GatewayAuthConfig {
        token: uuid::Uuid::new_v4().to_string(),
    }
}

// ============================================================================
// Config File I/O
// ============================================================================

/// Returns the path to ~/.openclaw/openclaw.json
pub fn get_config_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "Could not determine HOME directory".to_string())?;
    Ok(PathBuf::from(home).join(".openclaw").join("openclaw.json"))
}

/// Reads and parses ~/.openclaw/openclaw.json. Returns Ok(None) if file doesn't exist.
pub fn read_config() -> Result<Option<OpenClawFileConfig>, String> {
    let path = get_config_path()?;

    if !path.exists() {
        return Ok(None);
    }

    let contents =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: OpenClawFileConfig = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(Some(config))
}

/// Creates ~/.openclaw/ dir if missing, writes config with pretty JSON.
pub fn write_config(config: &OpenClawFileConfig) -> Result<(), String> {
    let path = get_config_path()?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&path, json).map_err(|e| format!("Failed to write config file: {}", e))?;

    log::info!("Wrote OpenClaw config to {:?}", path);
    Ok(())
}

/// If config exists, reads and returns it (backfilling auth token if missing).
/// If not, creates one with provided values and returns it.
pub fn ensure_config(
    port: u16,
    workspace: Option<String>,
    password: Option<String>,
    token: Option<String>,
) -> Result<OpenClawFileConfig, String> {
    if let Some(mut existing) = read_config()? {
        // Backfill: if an old config was deserialized with a default token,
        // persist the generated token so the gateway can read it
        let raw = fs::read_to_string(get_config_path()?)
            .unwrap_or_default();
        if !raw.contains("\"auth\"") {
            log::info!("Backfilling auth.token into existing config");
            write_config(&existing)?;
        }
        return Ok(existing);
    }

    let auth_token = token.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let config = OpenClawFileConfig {
        gateway: GatewayFileConfig {
            mode: "local".to_string(),
            port,
            auth: GatewayAuthConfig { token: auth_token },
            workspace,
            password,
        },
        agents: None,
    };

    write_config(&config)?;
    Ok(config)
}
