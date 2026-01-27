use crate::database::{init_db, load_state, persist_full_state, resolve_db_path};
use crate::seed::{empty_state, seed_state};
use crate::types::{DashboardState, ProcessEntry};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        atomic::{AtomicU32, Ordering},
        Arc, Mutex,
    },
};
use tauri::AppHandle;

#[derive(Debug)]
pub struct AppRuntime {
    pub data: Mutex<DashboardState>,
    pub processes: Mutex<HashMap<u32, ProcessEntry>>,
    pub next_execution_id: AtomicU32,
    pub next_history_id: AtomicU32,
    pub db_path: PathBuf,
}

impl AppRuntime {
    pub fn new(app: &AppHandle) -> Result<Arc<Self>, String> {
        let db_path = resolve_db_path(app)?;
        init_db(&db_path)?;
        let mut data = load_state(&db_path).unwrap_or_else(|error| {
            log::warn!("failed to load state from sqlite: {error}");
            empty_state()
        });

        if data.repositories.is_empty()
            && data.commands.is_empty()
            && data.execution_history.is_empty()
        {
            data = seed_state();
            persist_full_state(&db_path, &data)?;
        }

        let next_history_id = data
            .execution_history
            .iter()
            .map(|item| item.id)
            .max()
            .unwrap_or(0)
            + 1;

        Ok(Arc::new(Self {
            data: Mutex::new(data),
            processes: Mutex::new(HashMap::new()),
            next_execution_id: AtomicU32::new(1),
            next_history_id: AtomicU32::new(next_history_id),
            db_path,
        }))
    }

    pub fn next_execution_id(&self) -> u32 {
        self.next_execution_id.fetch_add(1, Ordering::SeqCst)
    }

    pub fn next_history_id(&self) -> u32 {
        self.next_history_id.fetch_add(1, Ordering::SeqCst)
    }
}
