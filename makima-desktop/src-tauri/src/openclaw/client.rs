use crate::openclaw::types::{
    ApprovalRequestPayload, IncomingFrame, OpenClawAgentEvent, OpenClawConnectionStatus,
    OutgoingFrame, ResError,
};
use dashmap::DashMap;
use futures::stream::SplitSink;
use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::net::TcpStream;
use tokio::sync::{oneshot, Mutex};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};

type WsSink = SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>;

/// WebSocket client for communicating with the OpenClaw gateway
pub struct OpenClawClient {
    sink: Arc<Mutex<WsSink>>,
    pending_requests: Arc<DashMap<String, oneshot::Sender<Result<serde_json::Value, String>>>>,
    connected: Arc<std::sync::atomic::AtomicBool>,
    reader_handle: tokio::task::JoinHandle<()>,
}

impl OpenClawClient {
    /// Connect to the OpenClaw gateway and start the reader loop
    pub async fn connect(
        url: &str,
        password: Option<String>,
        token: Option<String>,
        app_handle: AppHandle,
    ) -> Result<Self, String> {
        log::info!("Connecting to OpenClaw gateway at {}", url);

        let (ws_stream, _) = tokio_tungstenite::connect_async(url)
            .await
            .map_err(|e| {
                let msg = e.to_string();
                if msg.contains("Connection refused") {
                    "Gateway is not responding. Make sure it is running and try again.".to_string()
                } else if msg.contains("timed out") || msg.contains("Timed out") {
                    "Connection timed out. The gateway may be overloaded or unreachable.".to_string()
                } else {
                    format!("Failed to connect to gateway: {}", msg)
                }
            })?;

        let (sink, stream) = ws_stream.split();
        let sink = Arc::new(Mutex::new(sink));
        let pending_requests: Arc<
            DashMap<String, oneshot::Sender<Result<serde_json::Value, String>>>,
        > = Arc::new(DashMap::new());
        let connected = Arc::new(std::sync::atomic::AtomicBool::new(true));

        // Start reader task
        let pending_clone = pending_requests.clone();
        let connected_clone = connected.clone();
        let app_clone = app_handle.clone();

        let reader_handle = tokio::spawn(async move {
            Self::reader_loop(stream, pending_clone, connected_clone, app_clone).await;
        });

        let client = Self {
            sink,
            pending_requests,
            connected,
            reader_handle,
        };

        // Send connect handshake (protocol v3)
        let auth = if token.is_some() || password.is_some() {
            Some(serde_json::json!({
                "token": token,
                "password": password,
            }))
        } else {
            None
        };

        let connect_params = serde_json::json!({
            "minProtocol": 3,
            "maxProtocol": 3,
            "client": {
                "id": "openclaw-macos",
                "version": env!("CARGO_PKG_VERSION"),
                "platform": "darwin",
                "mode": "ui",
            },
            "auth": auth,
            "role": "operator",
            "scopes": ["operator.admin"],
        });

        let response = client.send_request("connect", Some(connect_params)).await?;

        // Extract gateway version from response
        let gateway_version = response
            .as_object()
            .and_then(|o| o.get("version"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let status = OpenClawConnectionStatus {
            connected: true,
            gateway_version,
            error: None,
        };

        let _ = app_handle.emit("openclaw:connection-status", &status);

        Ok(client)
    }

    /// Reader loop that processes incoming WebSocket frames
    async fn reader_loop(
        mut stream: futures::stream::SplitStream<WebSocketStream<MaybeTlsStream<TcpStream>>>,
        pending_requests: Arc<
            DashMap<String, oneshot::Sender<Result<serde_json::Value, String>>>,
        >,
        connected: Arc<std::sync::atomic::AtomicBool>,
        app_handle: AppHandle,
    ) {
        while let Some(msg_result) = stream.next().await {
            match msg_result {
                Ok(Message::Text(text)) => {
                    Self::handle_message(&text, &pending_requests, &app_handle);
                }
                Ok(Message::Close(_)) => {
                    log::info!("OpenClaw gateway connection closed");
                    break;
                }
                Err(e) => {
                    log::error!("OpenClaw WebSocket error: {}", e);
                    break;
                }
                _ => {} // Ignore ping/pong/binary
            }
        }

        connected.store(false, std::sync::atomic::Ordering::SeqCst);

        let status = OpenClawConnectionStatus {
            connected: false,
            gateway_version: None,
            error: Some("Connection closed".to_string()),
        };
        let _ = app_handle.emit("openclaw:connection-status", &status);

        log::info!("OpenClaw reader loop ended");
    }

    /// Handle a single incoming text message
    fn handle_message(
        text: &str,
        pending_requests: &DashMap<String, oneshot::Sender<Result<serde_json::Value, String>>>,
        app_handle: &AppHandle,
    ) {
        let frame: IncomingFrame = match serde_json::from_str(text) {
            Ok(f) => f,
            Err(e) => {
                log::warn!("Failed to parse OpenClaw frame: {} - {}", e, text);
                return;
            }
        };

        match frame {
            IncomingFrame::Res {
                id,
                ok,
                payload,
                error,
            } => {
                if let Some((_, sender)) = pending_requests.remove(&id) {
                    if ok {
                        let _ = sender.send(Ok(payload.unwrap_or(serde_json::Value::Null)));
                    } else {
                        let msg = error
                            .map(|e| e.to_message())
                            .unwrap_or_else(|| "Unknown error".to_string());
                        let _ = sender.send(Err(msg));
                    }
                }
            }
            IncomingFrame::Event {
                event,
                payload,
                ..
            } => {
                Self::handle_event(&event, payload, app_handle);
            }
        }
    }

    /// Handle incoming events from the gateway
    fn handle_event(event: &str, payload: serde_json::Value, app_handle: &AppHandle) {
        match event {
            "agent.message" | "agent.chunk" | "agent.tool_call" | "agent.done" | "agent.error" => {
                let session_key = payload
                    .get("sessionKey")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let agent_event = OpenClawAgentEvent {
                    event_type: event.to_string(),
                    session_key,
                    data: payload,
                };

                if let Err(e) = app_handle.emit("openclaw:agent-event", &agent_event) {
                    log::error!("Failed to emit agent event: {}", e);
                }
            }
            "approval.requested" => {
                let approval = ApprovalRequestPayload {
                    approval_id: payload
                        .get("approvalId")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    session_key: payload
                        .get("sessionKey")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    tool_name: payload
                        .get("toolName")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    arguments: payload
                        .get("arguments")
                        .cloned()
                        .unwrap_or(serde_json::Value::Null),
                    risk: payload
                        .get("risk")
                        .and_then(|v| v.as_str())
                        .unwrap_or("medium")
                        .to_string(),
                    description: payload
                        .get("description")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                };

                if let Err(e) = app_handle.emit("openclaw:approval-request", &approval) {
                    log::error!("Failed to emit approval request: {}", e);
                }
            }
            _ => {
                log::debug!("Unhandled OpenClaw event: {}", event);
            }
        }
    }

    /// Send a request and wait for a response
    pub async fn send_request(
        &self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, String> {
        if !self.is_connected() {
            return Err("Not connected to OpenClaw gateway".to_string());
        }

        let id = uuid::Uuid::new_v4().to_string();

        let frame = OutgoingFrame::Req {
            id: id.clone(),
            method: method.to_string(),
            params,
        };

        let text = serde_json::to_string(&frame)
            .map_err(|e| format!("Failed to serialize request: {}", e))?;

        let (tx, rx) = oneshot::channel();
        self.pending_requests.insert(id.clone(), tx);

        {
            let mut sink = self.sink.lock().await;
            sink.send(Message::Text(text.into()))
                .await
                .map_err(|e| format!("Failed to send message: {}", e))?;
        }

        // Wait for response with timeout
        match tokio::time::timeout(std::time::Duration::from_secs(30), rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => {
                self.pending_requests.remove(&id);
                Err("Request channel closed".to_string())
            }
            Err(_) => {
                self.pending_requests.remove(&id);
                Err("Request timed out".to_string())
            }
        }
    }

    /// Check if the client is connected
    pub fn is_connected(&self) -> bool {
        self.connected.load(std::sync::atomic::Ordering::SeqCst)
    }

    /// Disconnect from the gateway
    pub async fn disconnect(&self) {
        self.connected
            .store(false, std::sync::atomic::Ordering::SeqCst);

        let mut sink = self.sink.lock().await;
        let _ = sink.send(Message::Close(None)).await;
        let _ = sink.close().await;

        self.reader_handle.abort();
    }
}

impl Drop for OpenClawClient {
    fn drop(&mut self) {
        self.connected
            .store(false, std::sync::atomic::Ordering::SeqCst);
        self.reader_handle.abort();
    }
}
