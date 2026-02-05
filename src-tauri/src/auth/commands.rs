use crate::auth::types::{AuthSource, AuthSourceAvailability, AuthStatus, ProviderAuthStatus, ResolvedCredentials};
use std::env;

/// Get authentication status for all providers
#[tauri::command]
pub async fn auth_get_status(
    manual_anthropic_key: Option<String>,
    manual_openai_key: Option<String>,
) -> Result<AuthStatus, String> {
    let anthropic = get_anthropic_auth_status(manual_anthropic_key);
    let openai = get_openai_auth_status(manual_openai_key);

    Ok(AuthStatus { anthropic, openai })
}

/// Check availability of each auth source for a provider
#[tauri::command]
pub async fn auth_check_source_availability(
    provider: String,
    manual_key: Option<String>,
) -> Result<AuthSourceAvailability, String> {
    let has_env = match provider.as_str() {
        "anthropic" => env::var("ANTHROPIC_API_KEY").map(|k| !k.is_empty()).unwrap_or(false),
        "openai" => env::var("OPENAI_API_KEY").map(|k| !k.is_empty()).unwrap_or(false),
        _ => false,
    };

    let has_manual = manual_key.map(|k| !k.is_empty()).unwrap_or(false);

    Ok(AuthSourceAvailability {
        environment: has_env,
        manual: has_manual,
    })
}

/// Resolve credentials with explicit preference
#[tauri::command]
pub async fn auth_resolve_with_preference(
    provider: String,
    preferred_source: String,
    manual_key: Option<String>,
) -> Result<Option<ResolvedCredentials>, String> {
    match preferred_source.as_str() {
        "auto" => {
            // Priority: Environment > Manual
            let env_var = match provider.as_str() {
                "anthropic" => "ANTHROPIC_API_KEY",
                "openai" => "OPENAI_API_KEY",
                _ => return Err(format!("Unknown provider: {}", provider)),
            };

            // 1. Check environment variable
            if let Ok(key) = env::var(env_var) {
                if !key.is_empty() {
                    return Ok(Some(ResolvedCredentials {
                        api_key: key,
                        source: AuthSource::Environment,
                    }));
                }
            }

            // 2. Use manual key if provided
            if let Some(key) = manual_key {
                if !key.is_empty() {
                    return Ok(Some(ResolvedCredentials {
                        api_key: key,
                        source: AuthSource::Manual,
                    }));
                }
            }

            Ok(None)
        }
        "environment" => {
            let env_var = match provider.as_str() {
                "anthropic" => "ANTHROPIC_API_KEY",
                "openai" => "OPENAI_API_KEY",
                _ => return Err(format!("Unknown provider: {}", provider)),
            };
            if let Ok(key) = env::var(env_var) {
                if !key.is_empty() {
                    return Ok(Some(ResolvedCredentials {
                        api_key: key,
                        source: AuthSource::Environment,
                    }));
                }
            }
            Ok(None)
        }
        "manual" => {
            if let Some(key) = manual_key {
                if !key.is_empty() {
                    return Ok(Some(ResolvedCredentials {
                        api_key: key,
                        source: AuthSource::Manual,
                    }));
                }
            }
            Ok(None)
        }
        _ => Err(format!("Unknown preferred source: {}", preferred_source)),
    }
}

fn get_anthropic_auth_status(manual_key: Option<String>) -> ProviderAuthStatus {
    // Check environment variable first
    if let Ok(key) = env::var("ANTHROPIC_API_KEY") {
        if !key.is_empty() {
            return ProviderAuthStatus::configured(AuthSource::Environment, &key);
        }
    }

    // Check manual key
    if let Some(key) = manual_key {
        if !key.is_empty() {
            return ProviderAuthStatus::configured(AuthSource::Manual, &key);
        }
    }

    ProviderAuthStatus::not_configured()
}

fn get_openai_auth_status(manual_key: Option<String>) -> ProviderAuthStatus {
    // Check environment variable first
    if let Ok(key) = env::var("OPENAI_API_KEY") {
        if !key.is_empty() {
            return ProviderAuthStatus::configured(AuthSource::Environment, &key);
        }
    }

    // Check manual key
    if let Some(key) = manual_key {
        if !key.is_empty() {
            return ProviderAuthStatus::configured(AuthSource::Manual, &key);
        }
    }

    ProviderAuthStatus::not_configured()
}
