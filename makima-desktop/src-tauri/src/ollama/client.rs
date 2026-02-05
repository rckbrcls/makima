use crate::ollama::types::{
    OllamaChatChunk, OllamaChatRequest, OllamaModelInfo, OllamaModelsResponse, OllamaPullProgress,
    OllamaPullRequest,
};
use futures::StreamExt;
use reqwest::Client;
use std::time::Duration;

const DEFAULT_BASE_URL: &str = "http://localhost:11434";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(300); // 5 minutes for long generations

#[derive(Clone)]
pub struct OllamaClient {
    client: Client,
    base_url: String,
}

impl OllamaClient {
    pub fn new(base_url: Option<String>) -> Self {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url: base_url.unwrap_or_else(|| DEFAULT_BASE_URL.to_string()),
        }
    }

    pub async fn check_health(&self) -> bool {
        let url = format!("{}/api/tags", self.base_url);
        match self.client.get(&url).send().await {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }

    pub async fn list_models(&self) -> Result<Vec<OllamaModelInfo>, String> {
        let url = format!("{}/api/tags", self.base_url);

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Ollama returned error status: {}",
                response.status()
            ));
        }

        let models_response: OllamaModelsResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse models response: {}", e))?;

        Ok(models_response.models)
    }

    pub async fn chat_stream<F>(
        &self,
        request: OllamaChatRequest,
        mut on_chunk: F,
    ) -> Result<(), String>
    where
        F: FnMut(OllamaChatChunk) -> bool,
    {
        let url = format!("{}/api/chat", self.base_url);

        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Failed to send chat request: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Ollama chat error ({}): {}", status, body));
        }

        let mut stream = response.bytes_stream();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;

            let text = String::from_utf8_lossy(&chunk);
            for line in text.lines() {
                if line.trim().is_empty() {
                    continue;
                }

                match serde_json::from_str::<OllamaChatChunk>(line) {
                    Ok(chat_chunk) => {
                        let done = chat_chunk.done;
                        let should_continue = on_chunk(chat_chunk);
                        if !should_continue || done {
                            return Ok(());
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to parse chunk '{}': {}", line, e);
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn pull_model<F>(&self, model_name: &str, mut on_progress: F) -> Result<(), String>
    where
        F: FnMut(OllamaPullProgress) -> bool,
    {
        let url = format!("{}/api/pull", self.base_url);

        let request = OllamaPullRequest {
            name: model_name.to_string(),
            stream: true,
        };

        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Failed to send pull request: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Ollama pull error ({}): {}", status, body));
        }

        let mut stream = response.bytes_stream();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;

            let text = String::from_utf8_lossy(&chunk);
            for line in text.lines() {
                if line.trim().is_empty() {
                    continue;
                }

                match serde_json::from_str::<OllamaPullProgress>(line) {
                    Ok(progress) => {
                        let is_done = progress.status == "success";
                        let should_continue = on_progress(progress);
                        if !should_continue || is_done {
                            return Ok(());
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to parse pull progress '{}': {}", line, e);
                    }
                }
            }
        }

        Ok(())
    }
}

impl Default for OllamaClient {
    fn default() -> Self {
        Self::new(None)
    }
}
