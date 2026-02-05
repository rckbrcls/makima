use crate::anthropic::types::{
    AnthropicChatRequest, AnthropicError, AnthropicMessage, AnthropicStreamEvent, AnthropicUsage,
    ContentDelta,
};
use futures::StreamExt;
use reqwest::Client;
use std::time::Duration;

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION: &str = "2023-06-01";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(300);

#[derive(Clone)]
pub struct AnthropicClient {
    client: Client,
    base_url: String,
}

pub struct StreamState {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub stop_reason: Option<String>,
}

impl AnthropicClient {
    pub fn new(base_url: Option<String>) -> Self {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url: base_url.unwrap_or_else(|| ANTHROPIC_API_URL.to_string()),
        }
    }

    pub async fn validate_api_key(&self, api_key: &str) -> Result<bool, String> {
        let url = format!("{}/messages", self.base_url);

        let request = AnthropicChatRequest {
            model: "claude-3-5-haiku-20241022".to_string(),
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: "Hi".to_string(),
            }],
            max_tokens: 1,
            system: None,
            stream: false,
            temperature: None,
        };

        let response = self
            .client
            .post(&url)
            .header("x-api-key", api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Anthropic: {}", e))?;

        if response.status().is_success() {
            Ok(true)
        } else if response.status() == 401 {
            Ok(false)
        } else {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            Err(format!("Anthropic API error ({}): {}", status, body))
        }
    }

    pub async fn chat_stream<F>(
        &self,
        api_key: &str,
        model: String,
        messages: Vec<AnthropicMessage>,
        system: Option<String>,
        temperature: Option<f32>,
        max_tokens: i32,
        mut on_chunk: F,
    ) -> Result<(), String>
    where
        F: FnMut(String, bool, Option<String>, Option<AnthropicUsage>) -> bool,
    {
        let url = format!("{}/messages", self.base_url);

        let request = AnthropicChatRequest {
            model,
            messages,
            max_tokens,
            system,
            stream: true,
            temperature,
        };

        let response = self
            .client
            .post(&url)
            .header("x-api-key", api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Failed to send chat request: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();

            if let Ok(error) = serde_json::from_str::<AnthropicError>(&body) {
                return Err(format!(
                    "Anthropic API error ({}): {}",
                    status, error.error.message
                ));
            }
            return Err(format!("Anthropic API error ({}): {}", status, body));
        }

        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        let mut state = StreamState {
            input_tokens: 0,
            output_tokens: 0,
            stop_reason: None,
        };

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
            let text = String::from_utf8_lossy(&chunk);
            buffer.push_str(&text);

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.is_empty() || line.starts_with("event:") {
                    continue;
                }

                if let Some(data) = line.strip_prefix("data: ") {
                    match serde_json::from_str::<AnthropicStreamEvent>(data) {
                        Ok(event) => {
                            let result = self.process_event(event, &mut state, &mut on_chunk);
                            if let Some(done) = result {
                                if done {
                                    return Ok(());
                                }
                            }
                        }
                        Err(e) => {
                            log::warn!("Failed to parse Anthropic event '{}': {}", data, e);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    fn process_event<F>(
        &self,
        event: AnthropicStreamEvent,
        state: &mut StreamState,
        on_chunk: &mut F,
    ) -> Option<bool>
    where
        F: FnMut(String, bool, Option<String>, Option<AnthropicUsage>) -> bool,
    {
        match event {
            AnthropicStreamEvent::MessageStart { message } => {
                state.input_tokens = message.usage.input_tokens;
                state.output_tokens = message.usage.output_tokens;
                None
            }
            AnthropicStreamEvent::ContentBlockDelta { delta, .. } => {
                let content = match delta {
                    ContentDelta::TextDelta { text } => text,
                };

                let should_continue = on_chunk(content, false, None, None);
                if !should_continue {
                    return Some(true);
                }
                None
            }
            AnthropicStreamEvent::MessageDelta { delta, usage } => {
                if let Some(u) = usage {
                    state.output_tokens = u.output_tokens;
                }
                state.stop_reason = delta.stop_reason;
                None
            }
            AnthropicStreamEvent::MessageStop => {
                let usage = AnthropicUsage {
                    input_tokens: state.input_tokens,
                    output_tokens: state.output_tokens,
                };
                on_chunk(
                    String::new(),
                    true,
                    state.stop_reason.clone(),
                    Some(usage),
                );
                Some(true)
            }
            AnthropicStreamEvent::Error { error } => {
                log::error!("Anthropic stream error: {}", error.message);
                Some(true)
            }
            _ => None,
        }
    }
}

impl Default for AnthropicClient {
    fn default() -> Self {
        Self::new(None)
    }
}
