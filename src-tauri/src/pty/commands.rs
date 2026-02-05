use crate::pty::state::{PtyInstance, PtyState};
use crate::pty::types::{PtyExitPayload, PtyOutputPayload, PtySession};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::Read;
use std::sync::mpsc;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

/// Configuration for PTY output batching
const BATCH_INTERVAL_MS: u64 = 16; // ~60fps, smooth for UI
const MAX_BATCH_SIZE: usize = 32768; // 32KB max before forced emit
const READ_BUFFER_SIZE: usize = 8192; // 8KB read buffer

enum PtyReaderMessage {
    Data(String),
    Eof,
    Error(String),
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn pty_spawn(
    app: AppHandle,
    state: State<'_, PtyState>,
    sessionId: Option<String>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<PtySession, String> {
    log::info!("PTY spawn called with sessionId: {:?}", sessionId);
    let session_id = sessionId.unwrap_or_else(|| format!("pty-{}", chrono::Utc::now().timestamp_millis()));
    log::info!("PTY spawn using session_id: {}", session_id);
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

    // Channel for communication between reader and batcher threads
    let (tx, rx) = mpsc::channel::<PtyReaderMessage>();

    // Spawn reader thread - reads from PTY and sends to channel
    let session_id_for_reader = session_id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; READ_BUFFER_SIZE];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = tx.send(PtyReaderMessage::Eof);
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    if tx.send(PtyReaderMessage::Data(data)).is_err() {
                        break; // Receiver dropped
                    }
                }
                Err(e) => {
                    log::error!("PTY read error for {}: {}", session_id_for_reader, e);
                    let _ = tx.send(PtyReaderMessage::Error(e.to_string()));
                    break;
                }
            }
        }
    });

    // Spawn batcher thread - batches data and emits events
    let session_id_clone = session_id.clone();
    let app_clone = app.clone();
    let state_clone = state.sessions_clone();

    std::thread::spawn(move || {
        let mut accumulated = String::new();
        let mut last_emit = Instant::now();
        let batch_interval = Duration::from_millis(BATCH_INTERVAL_MS);

        loop {
            // Use recv_timeout to periodically flush even if no new data
            match rx.recv_timeout(batch_interval) {
                Ok(PtyReaderMessage::Data(data)) => {
                    accumulated.push_str(&data);

                    let now = Instant::now();
                    let time_elapsed = now.duration_since(last_emit) >= batch_interval;
                    let buffer_full = accumulated.len() >= MAX_BATCH_SIZE;

                    if (time_elapsed || buffer_full) && !accumulated.is_empty() {
                        let _ = app_clone.emit(
                            "pty:output",
                            PtyOutputPayload {
                                session_id: session_id_clone.clone(),
                                data: std::mem::take(&mut accumulated),
                            },
                        );
                        last_emit = now;
                    }
                }
                Ok(PtyReaderMessage::Eof) => {
                    // Flush remaining data
                    if !accumulated.is_empty() {
                        let _ = app_clone.emit(
                            "pty:output",
                            PtyOutputPayload {
                                session_id: session_id_clone.clone(),
                                data: std::mem::take(&mut accumulated),
                            },
                        );
                    }
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
                Ok(PtyReaderMessage::Error(_)) => {
                    // Flush remaining data
                    if !accumulated.is_empty() {
                        let _ = app_clone.emit(
                            "pty:output",
                            PtyOutputPayload {
                                session_id: session_id_clone.clone(),
                                data: std::mem::take(&mut accumulated),
                            },
                        );
                    }
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
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Timeout - flush any accumulated data
                    if !accumulated.is_empty() {
                        let _ = app_clone.emit(
                            "pty:output",
                            PtyOutputPayload {
                                session_id: session_id_clone.clone(),
                                data: std::mem::take(&mut accumulated),
                            },
                        );
                        last_emit = Instant::now();
                    }
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    // Reader thread died unexpectedly
                    if !accumulated.is_empty() {
                        let _ = app_clone.emit(
                            "pty:output",
                            PtyOutputPayload {
                                session_id: session_id_clone.clone(),
                                data: std::mem::take(&mut accumulated),
                            },
                        );
                    }
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
