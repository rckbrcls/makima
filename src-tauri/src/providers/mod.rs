//! Provider system for AI agents
//!
//! This module defines the provider abstraction for different AI agent backends:
//! - CLI Provider: Controls CLI agents (Claude Code, Codex, Gemini Code) via PTY
//! - Local Provider: For local models (Ollama, LM Studio) - future
//! - API Provider: For cloud APIs (OpenAI, Anthropic, Google) - future

pub mod action_executor;
mod cli_provider;

pub use action_executor::ActionExecutor;
pub use cli_provider::CliProvider;

use crate::types::{Agent, AgentProvider, AgentStatus, Session};
use std::path::Path;

/// Trait that all providers must implement
pub trait Provider: Send + Sync {
    /// Start a new session with the given goal
    fn start_session(
        &self,
        agent: &Agent,
        session: &Session,
        working_dir: &Path,
    ) -> Result<(), String>;

    /// Stop the current session
    fn stop_session(&self, session_id: &str) -> Result<(), String>;

    /// Pause the current session (if supported)
    fn pause_session(&self, session_id: &str) -> Result<(), String>;

    /// Resume a paused session
    fn resume_session(&self, session_id: &str) -> Result<(), String>;

    /// Get the current status of an agent
    fn get_status(&self, agent_id: &str) -> Result<AgentStatus, String>;

    /// Check if this provider is available/installed
    fn is_available(&self) -> bool;

    /// Get provider name
    fn name(&self) -> &str;
}

/// Factory function to create a provider based on agent configuration
pub fn create_provider(provider_type: &AgentProvider) -> Box<dyn Provider> {
    match provider_type {
        AgentProvider::Cli => Box::new(CliProvider::new()),
        AgentProvider::Local => {
            // TODO: Implement LocalProvider
            log::warn!("Local provider not yet implemented, falling back to CLI");
            Box::new(CliProvider::new())
        }
        AgentProvider::Api => {
            // TODO: Implement ApiProvider
            log::warn!("API provider not yet implemented, falling back to CLI");
            Box::new(CliProvider::new())
        }
    }
}
