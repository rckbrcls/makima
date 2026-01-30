//! Agent-related Tauri commands
//!
//! This module exposes commands for managing agents, sessions, actions,
//! approvals, and the global execution mode to the frontend.

use crate::database;
use crate::runtime::AppRuntime;
use crate::types::{
    Action, Agent, AgentDashboardState, AgentStatus, Approval, ApprovalState, BridgeMode,
    CreateAgentRequest, Event, Session, SessionState, SetModeRequest, StartSessionRequest,
};
use crate::utils::current_timestamp;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

// =============================================================================
// Agent Management Commands
// =============================================================================

/// Get the current agent dashboard state
#[tauri::command]
pub fn agent_state(state: State<'_, Arc<AppRuntime>>) -> Result<AgentDashboardState, String> {
    database::load_agent_dashboard_state(&state.db_path)
}

/// Create a new agent
#[tauri::command]
pub fn agent_create(
    state: State<'_, Arc<AppRuntime>>,
    request: CreateAgentRequest,
) -> Result<Agent, String> {
    let now = current_timestamp();
    let agent = Agent {
        id: Uuid::new_v4().to_string(),
        name: request.name,
        provider: request.provider,
        model: request.model,
        status: AgentStatus::Idle,
        created_at: now.clone(),
        updated_at: now,
    };

    database::create_agent(&state.db_path, &agent)?;

    // Add associated repos
    for repo in request.repos {
        database::add_agent_repo(&state.db_path, &agent.id, &repo)?;
    }

    Ok(agent)
}

/// Delete an agent by ID
#[tauri::command]
pub fn agent_delete(state: State<'_, Arc<AppRuntime>>, agent_id: String) -> Result<(), String> {
    database::delete_agent(&state.db_path, &agent_id)
}

/// Get a single agent by ID
#[tauri::command]
pub fn agent_get(
    state: State<'_, Arc<AppRuntime>>,
    agent_id: String,
) -> Result<Option<Agent>, String> {
    database::get_agent(&state.db_path, &agent_id)
}

/// List all agents
#[tauri::command]
pub fn agent_list(state: State<'_, Arc<AppRuntime>>) -> Result<Vec<Agent>, String> {
    database::list_agents(&state.db_path)
}

/// Add a repository to an agent
#[tauri::command]
pub fn agent_add_repo(
    state: State<'_, Arc<AppRuntime>>,
    agent_id: String,
    repo: String,
) -> Result<(), String> {
    database::add_agent_repo(&state.db_path, &agent_id, &repo)
}

/// Remove a repository from an agent
#[tauri::command]
pub fn agent_remove_repo(
    state: State<'_, Arc<AppRuntime>>,
    agent_id: String,
    repo: String,
) -> Result<(), String> {
    database::remove_agent_repo(&state.db_path, &agent_id, &repo)
}

/// List repositories for an agent
#[tauri::command]
pub fn agent_list_repos(
    state: State<'_, Arc<AppRuntime>>,
    agent_id: String,
) -> Result<Vec<String>, String> {
    database::list_agent_repos(&state.db_path, &agent_id)
}

// =============================================================================
// Session Management Commands
// =============================================================================

/// Start a new session for an agent
#[tauri::command]
pub fn session_start(
    state: State<'_, Arc<AppRuntime>>,
    request: StartSessionRequest,
) -> Result<Session, String> {
    // Check if agent exists
    let _agent = database::get_agent(&state.db_path, &request.agent_id)?
        .ok_or_else(|| "Agent not found".to_string())?;

    // Check if there's already an active session
    if let Some(_active) =
        database::get_active_session_for_agent(&state.db_path, &request.agent_id)?
    {
        return Err("Agent already has an active session".to_string());
    }

    let now = current_timestamp();
    let session = Session {
        id: Uuid::new_v4().to_string(),
        agent_id: request.agent_id.clone(),
        goal: request.goal,
        state: SessionState::Active,
        created_at: now.clone(),
        updated_at: now,
    };

    database::create_session(&state.db_path, &session)?;

    // Update agent status
    database::update_agent_status(&state.db_path, &request.agent_id, &AgentStatus::Running)?;

    Ok(session)
}

/// Get a session by ID
#[tauri::command]
pub fn session_get(
    state: State<'_, Arc<AppRuntime>>,
    session_id: String,
) -> Result<Option<Session>, String> {
    database::get_session(&state.db_path, &session_id)
}

/// List sessions for an agent
#[tauri::command]
pub fn session_list_by_agent(
    state: State<'_, Arc<AppRuntime>>,
    agent_id: String,
) -> Result<Vec<Session>, String> {
    database::list_sessions_by_agent(&state.db_path, &agent_id)
}

/// End a session (mark as done or failed)
#[tauri::command]
pub fn session_end(
    state: State<'_, Arc<AppRuntime>>,
    session_id: String,
    success: bool,
) -> Result<(), String> {
    let session = database::get_session(&state.db_path, &session_id)?
        .ok_or_else(|| "Session not found".to_string())?;

    let new_state = if success {
        SessionState::Done
    } else {
        SessionState::Failed
    };

    database::update_session_state(&state.db_path, &session_id, &new_state)?;
    database::update_agent_status(&state.db_path, &session.agent_id, &AgentStatus::Idle)?;

    Ok(())
}

// =============================================================================
// Action Management Commands
// =============================================================================

/// Get an action by ID
#[tauri::command]
pub fn action_get(
    state: State<'_, Arc<AppRuntime>>,
    action_id: String,
) -> Result<Option<Action>, String> {
    database::get_action(&state.db_path, &action_id)
}

/// List actions for a session
#[tauri::command]
pub fn action_list_by_session(
    state: State<'_, Arc<AppRuntime>>,
    session_id: String,
) -> Result<Vec<Action>, String> {
    database::list_actions_by_session(&state.db_path, &session_id)
}

// =============================================================================
// Approval Management Commands
// =============================================================================

/// Get pending approvals
#[tauri::command]
pub fn approval_list_pending(state: State<'_, Arc<AppRuntime>>) -> Result<Vec<Approval>, String> {
    database::list_pending_approvals(&state.db_path)
}

/// Approve an action
#[tauri::command]
pub fn approval_approve(
    state: State<'_, Arc<AppRuntime>>,
    approval_id: String,
    reason: Option<String>,
) -> Result<(), String> {
    let approval = database::get_approval(&state.db_path, &approval_id)?
        .ok_or_else(|| "Approval not found".to_string())?;

    database::resolve_approval(
        &state.db_path,
        &approval_id,
        &ApprovalState::Approved,
        Some("user"),
        reason.as_deref(),
    )?;

    // Update action status to running
    database::update_action_status(
        &state.db_path,
        &approval.action_id,
        &crate::types::ActionStatus::Running,
    )?;

    Ok(())
}

/// Reject an action
#[tauri::command]
pub fn approval_reject(
    state: State<'_, Arc<AppRuntime>>,
    approval_id: String,
    reason: Option<String>,
) -> Result<(), String> {
    let approval = database::get_approval(&state.db_path, &approval_id)?
        .ok_or_else(|| "Approval not found".to_string())?;

    database::resolve_approval(
        &state.db_path,
        &approval_id,
        &ApprovalState::Rejected,
        Some("user"),
        reason.as_deref(),
    )?;

    // Update action status to rejected
    database::update_action_status(
        &state.db_path,
        &approval.action_id,
        &crate::types::ActionStatus::Rejected,
    )?;

    Ok(())
}

// =============================================================================
// Events Commands
// =============================================================================

/// Get recent events for a session
#[tauri::command]
pub fn event_list_by_session(
    state: State<'_, Arc<AppRuntime>>,
    session_id: String,
    limit: Option<u32>,
) -> Result<Vec<Event>, String> {
    database::list_events_by_session(&state.db_path, &session_id, limit.unwrap_or(100))
}

/// Get recent events (global)
#[tauri::command]
pub fn event_list_recent(
    state: State<'_, Arc<AppRuntime>>,
    limit: Option<u32>,
) -> Result<Vec<Event>, String> {
    database::list_recent_events(&state.db_path, limit.unwrap_or(100))
}

// =============================================================================
// Settings Commands
// =============================================================================

/// Get the global execution mode
#[tauri::command]
pub fn mode_get(state: State<'_, Arc<AppRuntime>>) -> Result<BridgeMode, String> {
    database::get_global_mode(&state.db_path)
}

/// Set the global execution mode
#[tauri::command]
pub fn mode_set(state: State<'_, Arc<AppRuntime>>, request: SetModeRequest) -> Result<(), String> {
    database::set_global_mode(&state.db_path, &request.mode)
}
