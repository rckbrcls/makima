use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthSource {
    /// From environment variable
    Environment,
    /// From macOS Keychain (Claude Code credentials)
    ClaudeCodeKeychain,
    /// Manually entered API key
    Manual,
    /// Not configured
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthStatus {
    pub anthropic: ProviderAuthStatus,
    pub openai: ProviderAuthStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderAuthStatus {
    pub is_configured: bool,
    pub source: AuthSource,
    /// Masked key for display (e.g., "sk-ant-...abc123")
    pub masked_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedCredentials {
    pub api_key: String,
    pub source: AuthSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSourceAvailability {
    pub environment: bool,
    pub claude_code_keychain: bool,
    pub manual: bool,
}

/// Claude Code OAuth credentials structure (from Keychain)
#[derive(Debug, Clone, Deserialize)]
pub struct ClaudeCodeCredentials {
    #[serde(rename = "claudeAiOauth")]
    pub claude_ai_oauth: Option<ClaudeAiOauth>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ClaudeAiOauth {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: Option<String>,
}

impl ProviderAuthStatus {
    pub fn not_configured() -> Self {
        Self {
            is_configured: false,
            source: AuthSource::None,
            masked_key: None,
        }
    }

    pub fn configured(source: AuthSource, key: &str) -> Self {
        Self {
            is_configured: true,
            source,
            masked_key: Some(mask_api_key(key)),
        }
    }
}

/// Mask an API key for display (show first 10 and last 4 chars)
pub fn mask_api_key(key: &str) -> String {
    if key.len() <= 14 {
        return "*".repeat(key.len());
    }
    let prefix = &key[..10];
    let suffix = &key[key.len() - 4..];
    format!("{}...{}", prefix, suffix)
}
