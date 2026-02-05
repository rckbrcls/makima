use crate::pty::state::{PtyInstance, PtyState};
use crate::pty::types::{PtyExitPayload, PtyOutputPayload, PtySession};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::Read;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

#[tauri::command]
pub async fn pty_spawn(
    app: AppHandle,
    state: State<'_, PtyState>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<PtySession, String> {
    let session_id = format!("pty-{}", chrono::Utc::now().timestamp_millis());
    let cols = cols.unwrap_or(80);
    let rows = rows.unwrap_or(24);

    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    // Determine the shell to use
    let shell = std::env::var("SHELL").unwrap_or_else(|_| {
        if cfg!(target_os = "windows") {
            "powershell.exe".to_string()
        } else {
            "/bin/zsh".to_string()
        }
    });

    let mut cmd = CommandBuilder::new(&shell);

    // Set working directory if provided
    if let Some(dir) = &cwd {
        cmd.cwd(dir);
    }

    // Spawn the shell
    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let pid = child.process_id().unwrap_or(0);

    // Get writer for stdin
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    // Get reader for stdout
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;

    let master = Arc::new(Mutex::new(pair.master));
    let writer = Arc::new(Mutex::new(writer));

    let instance = PtyInstance {
        master,
        writer,
    };

    state.insert(session_id.clone(), instance);

    // Spawn a task to read output and emit events
    let session_id_clone = session_id.clone();
    let app_clone = app.clone();
    let state_clone = state.sessions_clone();

    tokio::task::spawn_blocking(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF - process exited
                    let _ = app_clone.emit(
                        "pty:exit",
                        PtyExitPayload {
                            session_id: session_id_clone.clone(),
                            exit_code: None,
                        },
                    );
                    state_clone.remove(&session_id_clone);
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit(
                        "pty:output",
                        PtyOutputPayload {
                            session_id: session_id_clone.clone(),
                            data,
                        },
                    );
                }
                Err(e) => {
                    log::error!("PTY read error: {}", e);
                    let _ = app_clone.emit(
                        "pty:exit",
                        PtyExitPayload {
                            session_id: session_id_clone.clone(),
                            exit_code: Some(-1),
                        },
                    );
                    state_clone.remove(&session_id_clone);
                    break;
                }
            }
        }
    });

    Ok(PtySession {
        session_id,
        pid,
    })
}

#[tauri::command]
pub async fn pty_write(
    state: State<'_, PtyState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state.write_to_session(&session_id, data.as_bytes()).await
}

#[tauri::command]
pub async fn pty_resize(
    state: State<'_, PtyState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.resize_session(&session_id, cols, rows).await
}

#[tauri::command]
pub async fn pty_kill(state: State<'_, PtyState>, session_id: String) -> Result<(), String> {
    if state.remove(&session_id).is_some() {
        log::info!("PTY session {} killed", session_id);
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}
