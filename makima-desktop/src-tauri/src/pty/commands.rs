use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;

use crate::pty::detect;
use crate::pty::state::{BackpressureState, PtyInstance, PtyState};
use crate::pty::types::{PtyExitPayload, PtyOutputPayload, PtySession};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::Read;
use std::sync::atomic::Ordering;
use std::sync::mpsc;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

/// Configuration for PTY output batching
const BATCH_INTERVAL_MS: u64 = 16; // ~60fps, smooth for UI
const MAX_BATCH_SIZE: usize = 32768; // 32KB max before forced emit
const READ_BUFFER_SIZE: usize = 8192; // 8KB read buffer
const MAX_UNACKED_BATCHES: u64 = 12; // Backpressure window (~192ms at 16ms/batch)
const BACKPRESSURE_WAIT_MS: u64 = 50; // Max condvar wait before re-check

enum PtyReaderMessage {
    Data(Vec<u8>),
    Eof,
    Error(String),
}

/// Encode accumulated bytes as base64, assign seq, and emit a pty:output event.
/// Returns the new seq value after emission.
fn emit_batch(
    app: &AppHandle,
    session_id: &str,
    buffer: &mut Vec<u8>,
    bp: &BackpressureState,
) {
    if buffer.is_empty() {
        return;
    }
    let encoded = B64.encode(&buffer);
    let seq = bp.seq_counter.fetch_add(1, Ordering::AcqRel);
    let _ = app.emit(
        "pty:output",
        PtyOutputPayload {
            session_id: session_id.to_string(),
            seq,
            data: encoded,
        },
    );
    buffer.clear();
}

/// Wait until backpressure allows more batches, or the session dies.
/// Returns false if the session is dead and the batcher should exit.
fn wait_for_backpressure(bp: &BackpressureState) -> bool {
    let timeout = Duration::from_millis(BACKPRESSURE_WAIT_MS);
    loop {
        if !bp.alive.load(Ordering::Acquire) {
            return false;
        }
        let current_seq = bp.seq_counter.load(Ordering::Acquire);
        let acked = bp.last_acked_seq.load(Ordering::Acquire);
        if current_seq.saturating_sub(acked) < MAX_UNACKED_BATCHES {
            return true;
        }
        // Wait on condvar with timeout
        let guard = bp.ack_mutex.lock().unwrap();
        let _ = bp.ack_condvar.wait_timeout(guard, timeout).unwrap();
    }
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
    command: Option<String>,
    args: Option<Vec<String>>,
) -> Result<PtySession, String> {
    log::info!("PTY spawn called with sessionId: {:?}, command: {:?}", sessionId, command);
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

    // Determine the executable to use
    let executable = match &command {
        Some(cmd) => cmd.clone(),
        None => {
            if cfg!(target_os = "windows") {
                std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".to_string())
            } else {
                std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
            }
        }
    };

    let mut cmd = CommandBuilder::new(&executable);

    // Add args if provided (only relevant when command is specified)
    if let Some(ref cli_args) = args {
        for arg in cli_args {
            cmd.arg(arg);
        }
    }

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
    let backpressure = Arc::new(BackpressureState::new());

    let instance = PtyInstance {
        master,
        writer,
        backpressure: backpressure.clone(),
    };

    state.insert(session_id.clone(), instance);

    // Channel for communication between reader and batcher threads
    let (tx, rx) = mpsc::channel::<PtyReaderMessage>();

    // Spawn reader thread - reads raw bytes from PTY and sends to channel
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
                    if tx.send(PtyReaderMessage::Data(buf[..n].to_vec())).is_err() {
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

    // Spawn batcher thread - batches data with backpressure and emits events
    let session_id_clone = session_id.clone();
    let app_clone = app.clone();
    let state_clone = state.sessions_clone();
    let bp = backpressure.clone();

    std::thread::spawn(move || {
        let mut accumulated: Vec<u8> = Vec::new();
        let mut last_emit = Instant::now();
        let batch_interval = Duration::from_millis(BATCH_INTERVAL_MS);

        loop {
            // Use recv_timeout to periodically flush even if no new data
            match rx.recv_timeout(batch_interval) {
                Ok(PtyReaderMessage::Data(data)) => {
                    accumulated.extend_from_slice(&data);

                    let now = Instant::now();
                    let time_elapsed = now.duration_since(last_emit) >= batch_interval;
                    let buffer_full = accumulated.len() >= MAX_BATCH_SIZE;

                    if (time_elapsed || buffer_full) && !accumulated.is_empty() {
                        // Backpressure: wait if too many unacked batches
                        if !wait_for_backpressure(&bp) {
                            // Session died while waiting
                            break;
                        }
                        emit_batch(&app_clone, &session_id_clone, &mut accumulated, &bp);
                        last_emit = Instant::now();
                    }
                }
                Ok(PtyReaderMessage::Eof) => {
                    // Flush remaining data
                    emit_batch(&app_clone, &session_id_clone, &mut accumulated, &bp);
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
                    emit_batch(&app_clone, &session_id_clone, &mut accumulated, &bp);
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
                        emit_batch(&app_clone, &session_id_clone, &mut accumulated, &bp);
                        last_emit = Instant::now();
                    }
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    // Reader thread died unexpectedly
                    emit_batch(&app_clone, &session_id_clone, &mut accumulated, &bp);
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
    if let Some((_, instance)) = state.remove(&session_id) {
        // Signal the batcher thread to stop waiting
        instance.backpressure.alive.store(false, Ordering::Release);
        instance.backpressure.ack_condvar.notify_one();
        log::info!("PTY session {} killed", session_id);
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn pty_ack(
    state: State<'_, PtyState>,
    session_id: String,
    seq: u64,
) -> Result<(), String> {
    state.ack_session(&session_id, seq)
}

#[tauri::command]
pub async fn detect_ai_clis() -> Result<detect::AiCliDetectionResult, String> {
    Ok(detect::detect_ai_clis())
}
