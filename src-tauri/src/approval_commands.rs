//! Advanced approval-related Tauri commands
//!
//! Provides frontend-accessible commands for the enhanced approval workflow,
//! including bulk operations, mode toggle, and per-session pending lists.

use crate::approval_service::ApprovalService;
use crate::runtime::AppRuntime;
use crate::types::{Approval, BridgeMode};
use std::sync::Arc;
use tauri::{AppHandle, State};

/// Approve a pending action (advanced version with reviewer tracking)
#[tauri::command]
pub fn approval_approve_v2(
    state: State<'_, Arc<AppRuntime>>,
    app_handle: AppHandle,
    approval_id: String,
    reviewer: String,
    reason: Option<String>,
) -> Result<serde_json::Value, String> {
    let service = ApprovalService::new();

    let result = service.approve_action(
        &state.db_path,
        &approval_id,
        &reviewer,
        reason.as_deref(),
        Some(&app_handle),
    )?;

    Ok(serde_json::json!({
        "success": true,
        "action_id": result.action_id,
        "status": result.status.as_str(),
        "output": result.output,
        "error": result.error
    }))
}

/// Reject a pending action (advanced version with reviewer tracking)
#[tauri::command]
pub fn approval_reject_v2(
    state: State<'_, Arc<AppRuntime>>,
    app_handle: AppHandle,
    approval_id: String,
    reviewer: String,
    reason: Option<String>,
) -> Result<(), String> {
    let service = ApprovalService::new();

    service.reject_action(
        &state.db_path,
        &approval_id,
        &reviewer,
        reason.as_deref(),
        Some(&app_handle),
    )
}

/// Approve all pending actions for a session
#[tauri::command]
pub fn approval_approve_all(
    state: State<'_, Arc<AppRuntime>>,
    app_handle: AppHandle,
    session_id: String,
    reviewer: String,
) -> Result<usize, String> {
    let service = ApprovalService::new();

    let results =
        service.approve_all_pending(&state.db_path, &session_id, &reviewer, Some(&app_handle))?;

    Ok(results.len())
}

/// Reject all pending actions for a session
#[tauri::command]
pub fn approval_reject_all(
    state: State<'_, Arc<AppRuntime>>,
    app_handle: AppHandle,
    session_id: String,
    reviewer: String,
    reason: Option<String>,
) -> Result<usize, String> {
    let service = ApprovalService::new();

    service.reject_all_pending(
        &state.db_path,
        &session_id,
        &reviewer,
        reason.as_deref(),
        Some(&app_handle),
    )
}

/// Get pending approvals count
#[tauri::command]
pub fn approval_pending_count(state: State<'_, Arc<AppRuntime>>) -> Result<usize, String> {
    let service = ApprovalService::new();

    service.pending_count(&state.db_path)
}

/// Get pending approvals for a session
#[tauri::command]
pub fn approval_pending_for_session(
    state: State<'_, Arc<AppRuntime>>,
    session_id: String,
) -> Result<Vec<Approval>, String> {
    let service = ApprovalService::new();

    service.pending_for_session(&state.db_path, &session_id)
}

/// Set global execution mode (safe/auto) - advanced version
#[tauri::command]
pub fn mode_set_v2(
    state: State<'_, Arc<AppRuntime>>,
    app_handle: AppHandle,
    mode: String,
) -> Result<(), String> {
    let service = ApprovalService::new();

    let bridge_mode = match mode.to_lowercase().as_str() {
        "safe" => BridgeMode::Safe,
        "auto" => BridgeMode::Auto,
        _ => return Err(format!("Invalid mode: {}. Use 'safe' or 'auto'", mode)),
    };

    service.set_mode(&state.db_path, bridge_mode, Some(&app_handle))
}

/// Get current execution mode - advanced version
#[tauri::command]
pub fn mode_get_v2(state: State<'_, Arc<AppRuntime>>) -> Result<String, String> {
    let service = ApprovalService::new();

    let mode = service.get_mode(&state.db_path)?;
    Ok(match mode {
        BridgeMode::Safe => "safe".to_string(),
        BridgeMode::Auto => "auto".to_string(),
    })
}

/// Toggle execution mode between safe and auto
#[tauri::command]
pub fn mode_toggle(
    state: State<'_, Arc<AppRuntime>>,
    app_handle: AppHandle,
) -> Result<String, String> {
    let service = ApprovalService::new();

    let current_mode = service.get_mode(&state.db_path)?;
    let new_mode = match current_mode {
        BridgeMode::Safe => BridgeMode::Auto,
        BridgeMode::Auto => BridgeMode::Safe,
    };

    service.set_mode(&state.db_path, new_mode.clone(), Some(&app_handle))?;

    Ok(match new_mode {
        BridgeMode::Safe => "safe".to_string(),
        BridgeMode::Auto => "auto".to_string(),
    })
}
