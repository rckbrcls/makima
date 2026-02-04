use crate::auth::types::{ClaudeCodeCredentials, ResolvedCredentials, AuthSource};
use security_framework::passwords::get_generic_password;

const CLAUDE_CODE_SERVICE: &str = "Claude Code-credentials";
const CLAUDE_CODE_ACCOUNT: &str = ""; // Empty account for generic password

/// Read Claude Code credentials from macOS Keychain
pub fn read_claude_code_credentials() -> Option<ResolvedCredentials> {
    match get_generic_password(CLAUDE_CODE_SERVICE, CLAUDE_CODE_ACCOUNT) {
        Ok(password_bytes) => {
            let password_str = String::from_utf8_lossy(&password_bytes);
            parse_claude_code_credentials(&password_str)
        }
        Err(e) => {
            log::debug!("Failed to read Claude Code credentials from Keychain: {}", e);
            None
        }
    }
}

/// Parse Claude Code credentials JSON
fn parse_claude_code_credentials(json_str: &str) -> Option<ResolvedCredentials> {
    match serde_json::from_str::<ClaudeCodeCredentials>(json_str) {
        Ok(creds) => {
            if let Some(oauth) = creds.claude_ai_oauth {
                if !oauth.access_token.is_empty() {
                    return Some(ResolvedCredentials {
                        api_key: oauth.access_token,
                        source: AuthSource::ClaudeCodeKeychain,
                    });
                }
            }
            None
        }
        Err(e) => {
            log::warn!("Failed to parse Claude Code credentials JSON: {}", e);
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_credentials() {
        let json = r#"{"claudeAiOauth":{"accessToken":"sk-ant-test123","refreshToken":"sk-ant-refresh"}}"#;
        let result = parse_claude_code_credentials(json);
        assert!(result.is_some());
        let creds = result.unwrap();
        assert_eq!(creds.api_key, "sk-ant-test123");
        assert_eq!(creds.source, AuthSource::ClaudeCodeKeychain);
    }

    #[test]
    fn test_parse_empty_credentials() {
        let json = r#"{"claudeAiOauth":{"accessToken":"","refreshToken":""}}"#;
        let result = parse_claude_code_credentials(json);
        assert!(result.is_none());
    }
}
