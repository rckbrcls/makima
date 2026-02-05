use dashmap::DashMap;
use portable_pty::{MasterPty, PtySize};
use std::io::Write;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct PtyInstance {
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
}

pub struct PtyState {
    pub sessions: Arc<DashMap<String, PtyInstance>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self::new()
    }
}

impl PtyState {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(DashMap::new()),
        }
    }

    pub fn insert(&self, session_id: String, instance: PtyInstance) {
        self.sessions.insert(session_id, instance);
    }

    pub fn remove(&self, session_id: &str) -> Option<(String, PtyInstance)> {
        self.sessions.remove(session_id)
    }

    pub fn get(
        &self,
        session_id: &str,
    ) -> Option<dashmap::mapref::one::Ref<'_, String, PtyInstance>> {
        self.sessions.get(session_id)
    }

    pub fn sessions_clone(&self) -> Arc<DashMap<String, PtyInstance>> {
        self.sessions.clone()
    }

    pub async fn write_to_session(&self, session_id: &str, data: &[u8]) -> Result<(), String> {
        let session = self.get(session_id).ok_or("Session not found")?;
        let mut writer = session.writer.lock().await;
        writer.write_all(data).map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn resize_session(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let session = self.get(session_id).ok_or("Session not found")?;
        let master = session.master.lock().await;
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())
    }
}
