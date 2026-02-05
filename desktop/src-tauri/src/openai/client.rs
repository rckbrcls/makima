use crate::openai::types::{
    OpenAIChatRequest, OpenAIError, OpenAIMessage, OpenAIStreamChunk, StreamOptions,
};
use futures::StreamExt;
use reqwest::Client;
use std::time::Duration;

const OPENAI_API_URL: &str = "https://api.openai.com/v1";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(300);

#[derive(Clone)]
pub struct OpenAIClient {
    client: Client,
    base_url: String,
}

impl OpenAIClient {
    pub fn new(base_url: Option<String>) -> Self {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url: base_url.unwrap_or_else(|| OPENAI_API_URL.to_string()),
        }
    }

    pub async fn validate_api_key(&self, api_key: &str) -> Result<bool, String> {
        let url = format!("{}/models", self.base_url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
            .map_err(|e| format!("Failed to connect to OpenAI: {}", e))?;

        if response.status().is_success() {
            Ok(true)
        } else if response.status() == 401 {
            Ok(false)
        } else {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            Err(format!("OpenAI API error ({}): {}", status, body))
        }
    }

    pub async fn chat_stream<F>(
        &self,
        api_key: &str,
        model: String,
        messages: Vec<OpenAIMessage>,
        temperature: Option<f32>,
        max_tokens: Option<i32>,
        mut on_chunk: F,
    ) -> Result<(), String>
    where
        F: FnMut(OpenAIStreamChunk) -> bool,
    {
        let url = format!("{}/chat/completions", self.base_url);

        let request = OpenAIChatRequest {
            model,
            messages,
            stream: true,
            temperature,
            max_tokens,
            stream_options: Some(StreamOptions {
                include_usage: true,
            }),
        };

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Failed to send chat request: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();

            if let Ok(error) = serde_json::from_str::<OpenAIError>(&body) {
                return Err(format!(
                    "OpenAI API error ({}): {}",
                    status, error.error.message
                ));
            }
            return Err(format!("OpenAI API error ({}): {}", status, body));
        }

        let mut stream = response.bytes_stream();
        let mut buffer = String::new();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
            let text = String::from_utf8_lossy(&chunk);
            buffer.push_str(&text);

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.is_empty() {
                    continue;
                }

                if line == "data: [DONE]" {
                    return Ok(());
                }

                if let Some(data) = line.strip_prefix("data: ") {
                    match serde_json::from_str::<OpenAIStreamChunk>(data) {
                        Ok(stream_chunk) => {
                            let is_done = stream_chunk
                                .choices
                                .first()
                                .map(|c| c.finish_reason.is_some())
                                .unwrap_or(false);

                            let should_continue = on_chunk(stream_chunk);
                            if !should_continue || is_done {
                                return Ok(());
                            }
                        }
                        Err(e) => {
                            log::warn!("Failed to parse OpenAI chunk '{}': {}", data, e);
                        }
                    }
                }
            }
        }

        Ok(())
    }
}

impl Default for OpenAIClient {
    fn default() -> Self {
        Self::new(None)
    }
}
