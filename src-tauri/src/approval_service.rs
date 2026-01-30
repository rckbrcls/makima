//! Approval Service - Manages action approval workflow
//!
//! This module handles the approval logic for agent actions in safe mode,
//! including creating approvals, processing user decisions, and notifying
//! the CLI about approval outcomes.

use crate::database;
use crate::providers::action_executor::{ActionExecutor, ActionResult};
use crate::types::{
    Action, ActionStatus, ActionType, Approval, ApprovalState, BridgeMode, Session,
};
use crate::utils::current_timestamp;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// Approval Service handles the workflow for action approvals
pub struct ApprovalService {
    pub executor: Arc<ActionExecutor>,
}

impl Default for ApprovalService {
    fn default() -> Self {
        Self::new()
    }
}

impl ApprovalService {
    pub fn new() -> Self {
        Self {
            executor: Arc::new(ActionExecutor::new()),
        }
    }

    /// Process an incoming action request based on the current mode
    ///
    /// In Safe mode: Creates an approval request and blocks the action
    /// In Auto mode: Executes the action immediately
    pub fn process_action_request(
        &self,
        db_path: &Path,
        session: &Session,
        action_type: ActionType,
        payload: serde_json::Value,
        summary: Option<String>,
        app: Option<&AppHandle>,
    ) -> Result<ProcessActionResult, String> {
        // Get the global mode
        let mode = database::get_global_mode(db_path)?;

        // Create the action
        let now = current_timestamp();
        let action = Action {
            id: Uuid::new_v4().to_string(),
            session_id: session.id.clone(),
            action_type: action_type.clone(),
            status: match mode {
                BridgeMode::Safe => ActionStatus::Blocked,
                BridgeMode::Auto => ActionStatus::Running,
            },
            payload: serde_json::to_string(&payload).unwrap_or_default(),
            summary: summary.clone(),
            created_at: now.clone(),
            updated_at: now.clone(),
        };

        database::create_action(db_path, &action)?;

        match mode {
            BridgeMode::Safe => {
                // Create approval request
                let approval = Approval {
                    id: Uuid::new_v4().to_string(),
                    action_id: action.id.clone(),
                    state: ApprovalState::Pending,
                    reviewer: None,
                    reason: None,
                    created_at: now.clone(),
                    resolved_at: None,
                };

                database::create_approval(db_path, &approval)?;

                // Emit approval request event to frontend
                if let Some(app) = app {
                    let _ = app.emit(
                        "approval://requested",
                        serde_json::json!({
                            "approval_id": approval.id,
                            "action_id": action.id,
                            "session_id": session.id,
                            "action_type": format!("{:?}", action_type),
                            "summary": summary,
                            "payload": payload,
                            "created_at": now
                        }),
                    );
                }

                Ok(ProcessActionResult::Blocked { action, approval })
            }
            BridgeMode::Auto => {
                // Execute immediately
                // Get working directory from session's agent repos
                let agent = database::get_agent(db_path, &session.agent_id)?
                    .ok_or_else(|| "Agent not found".to_string())?;

                let repos = database::list_agent_repos(db_path, &agent.id)?;
                let working_dir = repos
                    .first()
                    .map(|r| std::path::PathBuf::from(r))
                    .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

                let result = self
                    .executor
                    .execute(&action, &working_dir, app, Some(db_path));

                // Emit action completed event
                if let Some(app) = app {
                    let _ = app.emit(
                        "action://finished",
                        serde_json::json!({
                            "action_id": action.id,
                            "session_id": session.id,
                            "status": result.status.as_str(),
                            "output": result.output,
                            "error": result.error
                        }),
                    );
                }

                Ok(ProcessActionResult::Executed { action, result })
            }
        }
    }

    /// Approve an action and execute it
    pub fn approve_action(
        &self,
        db_path: &Path,
        approval_id: &str,
        reviewer: &str,
        reason: Option<&str>,
        app: Option<&AppHandle>,
    ) -> Result<ActionResult, String> {
        // Get the approval
        let approval = database::get_approval(db_path, approval_id)?
            .ok_or_else(|| "Approval not found".to_string())?;

        if approval.state != ApprovalState::Pending {
            return Err("Approval is not pending".to_string());
        }

        // Get the action
        let action = database::get_action(db_path, &approval.action_id)?
            .ok_or_else(|| "Action not found".to_string())?;

        // Update approval state
        database::resolve_approval(
            db_path,
            approval_id,
            &ApprovalState::Approved,
            Some(reviewer),
            reason,
        )?;

        // Update action status to running
        database::update_action_status(db_path, &action.id, &ActionStatus::Running)?;

        // Get session for working directory
        let session = database::get_session(db_path, &action.session_id)?
            .ok_or_else(|| "Session not found".to_string())?;

        let agent = database::get_agent(db_path, &session.agent_id)?
            .ok_or_else(|| "Agent not found".to_string())?;

        let repos = database::list_agent_repos(db_path, &agent.id)?;
        let working_dir = repos
            .first()
            .map(|r| std::path::PathBuf::from(r))
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

        // Execute the action
        let result = self
            .executor
            .execute(&action, &working_dir, app, Some(db_path));

        // Emit events
        if let Some(app) = app {
            // Approval resolved event
            let _ = app.emit(
                "approval://resolved",
                serde_json::json!({
                    "approval_id": approval_id,
                    "action_id": action.id,
                    "state": "approved",
                    "reviewer": reviewer,
                    "reason": reason
                }),
            );

            // Action finished event
            let _ = app.emit(
                "action://finished",
                serde_json::json!({
                    "action_id": action.id,
                    "session_id": action.session_id,
                    "status": result.status.as_str(),
                    "output": result.output,
                    "error": result.error
                }),
            );
        }

        Ok(result)
    }

    /// Reject an action
    pub fn reject_action(
        &self,
        db_path: &Path,
        approval_id: &str,
        reviewer: &str,
        reason: Option<&str>,
        app: Option<&AppHandle>,
    ) -> Result<(), String> {
        // Get the approval
        let approval = database::get_approval(db_path, approval_id)?
            .ok_or_else(|| "Approval not found".to_string())?;

        if approval.state != ApprovalState::Pending {
            return Err("Approval is not pending".to_string());
        }

        // Update approval state
        database::resolve_approval(
            db_path,
            approval_id,
            &ApprovalState::Rejected,
            Some(reviewer),
            reason,
        )?;

        // Update action status to rejected
        database::update_action_status(db_path, &approval.action_id, &ActionStatus::Rejected)?;

        // Emit event
        if let Some(app) = app {
            let _ = app.emit(
                "approval://resolved",
                serde_json::json!({
                    "approval_id": approval_id,
                    "action_id": approval.action_id,
                    "state": "rejected",
                    "reviewer": reviewer,
                    "reason": reason
                }),
            );
        }

        Ok(())
    }

    /// Approve all pending approvals for a session
    pub fn approve_all_pending(
        &self,
        db_path: &Path,
        session_id: &str,
        reviewer: &str,
        app: Option<&AppHandle>,
    ) -> Result<Vec<ActionResult>, String> {
        let pending = database::list_pending_approvals(db_path)?;
        let mut results = Vec::new();

        for approval in pending {
            // Check if this approval belongs to the session
            let action = database::get_action(db_path, &approval.action_id)?;
            if let Some(action) = action {
                if action.session_id == session_id {
                    let result = self.approve_action(db_path, &approval.id, reviewer, None, app)?;
                    results.push(result);
                }
            }
        }

        Ok(results)
    }

    /// Reject all pending approvals for a session
    pub fn reject_all_pending(
        &self,
        db_path: &Path,
        session_id: &str,
        reviewer: &str,
        reason: Option<&str>,
        app: Option<&AppHandle>,
    ) -> Result<usize, String> {
        let pending = database::list_pending_approvals(db_path)?;
        let mut count = 0;

        for approval in pending {
            // Check if this approval belongs to the session
            let action = database::get_action(db_path, &approval.action_id)?;
            if let Some(action) = action {
                if action.session_id == session_id {
                    self.reject_action(db_path, &approval.id, reviewer, reason, app)?;
                    count += 1;
                }
            }
        }

        Ok(count)
    }

    /// Switch the global execution mode
    pub fn set_mode(
        &self,
        db_path: &Path,
        mode: BridgeMode,
        app: Option<&AppHandle>,
    ) -> Result<(), String> {
        database::set_global_mode(db_path, &mode)?;

        // Emit mode change event
        if let Some(app) = app {
            let _ = app.emit(
                "mode://changed",
                serde_json::json!({
                    "mode": match mode {
                        BridgeMode::Safe => "safe",
                        BridgeMode::Auto => "auto",
                    }
                }),
            );
        }

        Ok(())
    }

    /// Get the current mode
    pub fn get_mode(&self, db_path: &Path) -> Result<BridgeMode, String> {
        database::get_global_mode(db_path)
    }

    /// Check if an action type requires approval in the current mode
    pub fn requires_approval(
        &self,
        db_path: &Path,
        action_type: &ActionType,
    ) -> Result<bool, String> {
        let mode = database::get_global_mode(db_path)?;

        match mode {
            BridgeMode::Auto => Ok(false),
            BridgeMode::Safe => {
                // In safe mode, all potentially destructive actions require approval
                Ok(matches!(
                    action_type,
                    ActionType::RunCommand
                        | ActionType::StartDevServer
                        | ActionType::WriteFile
                        | ActionType::EditFile
                        | ActionType::DeleteFile
                        | ActionType::GitCheckout
                        | ActionType::GitCommit
                        | ActionType::SearchWeb
                        | ActionType::OpenUrl
                ))
            }
        }
    }

    /// Get pending approvals count for UI badge
    pub fn pending_count(&self, db_path: &Path) -> Result<usize, String> {
        let pending = database::list_pending_approvals(db_path)?;
        Ok(pending.len())
    }

    /// Get pending approvals for a specific session
    pub fn pending_for_session(
        &self,
        db_path: &Path,
        session_id: &str,
    ) -> Result<Vec<Approval>, String> {
        let pending = database::list_pending_approvals(db_path)?;
        let mut session_pending = Vec::new();

        for approval in pending {
            if let Some(action) = database::get_action(db_path, &approval.action_id)? {
                if action.session_id == session_id {
                    session_pending.push(approval);
                }
            }
        }

        Ok(session_pending)
    }
}

/// Result of processing an action request
pub enum ProcessActionResult {
    /// Action was blocked and needs approval (safe mode)
    Blocked { action: Action, approval: Approval },
    /// Action was executed immediately (auto mode)
    Executed {
        action: Action,
        result: ActionResult,
    },
}

/// Action type classification for approval requirements
#[derive(Debug, Clone, PartialEq)]
pub enum ActionRisk {
    /// Low risk - can be auto-approved
    Low,
    /// Medium risk - approval recommended
    Medium,
    /// High risk - always requires approval in safe mode
    High,
}

impl ActionRisk {
    pub fn from_action_type(action_type: &ActionType) -> Self {
        match action_type {
            // Low risk - read-only operations
            ActionType::ReadFile
            | ActionType::ListFiles
            | ActionType::GitStatus
            | ActionType::GitDiff
            | ActionType::Notify
            | ActionType::Sleep => ActionRisk::Low,

            // Medium risk - search/browse operations
            ActionType::SearchWeb | ActionType::OpenUrl => ActionRisk::Medium,

            // High risk - write/modify operations
            ActionType::RunCommand
            | ActionType::StartDevServer
            | ActionType::StopDevServer
            | ActionType::WriteFile
            | ActionType::EditFile
            | ActionType::DeleteFile
            | ActionType::GitCheckout
            | ActionType::GitCommit => ActionRisk::High,
        }
    }
}
