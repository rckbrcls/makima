use serde::{Deserialize, Serialize};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tokio::time::sleep;

/// Represents the type of Ollama installation found on the system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InstallationType {
    None,
    Cli,
    App,
    Both,
}

impl InstallationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            InstallationType::None => "none",
            InstallationType::Cli => "cli",
            InstallationType::App => "app",
            InstallationType::Both => "both",
        }
    }
}

/// Information about the Ollama installation on the system
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaInstallation {
    pub installation_type: String,
    pub cli_path: Option<String>,
    pub app_installed: bool,
}

/// Current status of the Ollama process
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaProcessStatus {
    pub is_running: bool,
    pub managed_by_app: bool,
    pub pid: Option<u32>,
}

/// Manages the lifecycle of the Ollama process when started by this app
pub struct OllamaProcessManager {
    pub managed_child: Option<Child>,
    pub managed_pid: Option<u32>,
}

impl Default for OllamaProcessManager {
    fn default() -> Self {
        Self {
            managed_child: None,
            managed_pid: None,
        }
    }
}

/// Detects how Ollama is installed on the system (macOS only)
pub fn detect_installation() -> OllamaInstallation {
    let app_installed = std::path::Path::new("/Applications/Ollama.app").exists();

    // Check for CLI in common locations
    let cli_path = find_ollama_cli();

    let installation_type = match (&cli_path, app_installed) {
        (Some(_), true) => InstallationType::Both,
        (Some(_), false) => InstallationType::Cli,
        (None, true) => InstallationType::App,
        (None, false) => InstallationType::None,
    };

    OllamaInstallation {
        installation_type: installation_type.as_str().to_string(),
        cli_path,
        app_installed,
    }
}

/// Finds the Ollama CLI executable path
fn find_ollama_cli() -> Option<String> {
    // Common paths on macOS
    let paths = [
        "/usr/local/bin/ollama",
        "/opt/homebrew/bin/ollama",
    ];

    for path in paths {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }

    // Try using 'which' command as fallback
    let output = Command::new("which")
        .arg("ollama")
        .output()
        .ok()?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout)
            .trim()
            .to_string();
        if !path.is_empty() && std::path::Path::new(&path).exists() {
            return Some(path);
        }
    }

    None
}

/// Checks if Ollama is currently running
pub fn is_ollama_running() -> Option<u32> {
    // Use pgrep to find Ollama process
    let output = Command::new("pgrep")
        .args(["-x", "ollama"])
        .output()
        .ok()?;

    if output.status.success() {
        let pid_str = String::from_utf8_lossy(&output.stdout);
        // Take the first PID if multiple
        if let Some(first_line) = pid_str.lines().next() {
            return first_line.trim().parse().ok();
        }
    }

    // Also check for "ollama serve" process
    let output = Command::new("pgrep")
        .args(["-f", "ollama serve"])
        .output()
        .ok()?;

    if output.status.success() {
        let pid_str = String::from_utf8_lossy(&output.stdout);
        if let Some(first_line) = pid_str.lines().next() {
            return first_line.trim().parse().ok();
        }
    }

    None
}

/// Starts Ollama process based on installation type
pub async fn start_ollama(
    installation: &OllamaInstallation,
    process_manager: &Mutex<OllamaProcessManager>,
) -> Result<u32, String> {
    // Check if already running
    if let Some(pid) = is_ollama_running() {
        return Err(format!("Ollama is already running with PID {}", pid));
    }

    match installation.installation_type.as_str() {
        "cli" | "both" => start_ollama_cli(installation, process_manager).await,
        "app" => start_ollama_app().await,
        "none" => Err("Ollama is not installed".to_string()),
        _ => Err("Unknown installation type".to_string()),
    }
}

/// Starts Ollama using the CLI (`ollama serve`)
async fn start_ollama_cli(
    installation: &OllamaInstallation,
    process_manager: &Mutex<OllamaProcessManager>,
) -> Result<u32, String> {
    let cli_path = installation
        .cli_path
        .as_ref()
        .ok_or("CLI path not found")?;

    log::info!("Starting Ollama CLI from: {}", cli_path);

    let child = Command::new(cli_path)
        .arg("serve")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to spawn Ollama process: {}", e))?;

    let pid = child.id();
    log::info!("Ollama started with PID: {}", pid);

    // Store the child process for management
    {
        let mut manager = process_manager
            .lock()
            .map_err(|e| format!("Failed to lock process manager: {}", e))?;
        manager.managed_child = Some(child);
        manager.managed_pid = Some(pid);
    }

    // Wait for health check with timeout
    wait_for_ollama_healthy(Duration::from_secs(10)).await?;

    Ok(pid)
}

/// Starts Ollama.app using `open -a`
async fn start_ollama_app() -> Result<u32, String> {
    log::info!("Starting Ollama.app");

    Command::new("open")
        .args(["-a", "Ollama"])
        .spawn()
        .map_err(|e| format!("Failed to open Ollama.app: {}", e))?;

    // Wait for health check with timeout
    wait_for_ollama_healthy(Duration::from_secs(10)).await?;

    // Get the PID after app starts
    is_ollama_running().ok_or("Ollama.app started but process not found".to_string())
}

/// Waits for Ollama to become healthy (respond to API)
async fn wait_for_ollama_healthy(timeout: Duration) -> Result<(), String> {
    let start = std::time::Instant::now();
    let client = reqwest::Client::new();
    let health_url = "http://localhost:11434/";

    while start.elapsed() < timeout {
        match client.get(health_url).send().await {
            Ok(response) if response.status().is_success() => {
                log::info!("Ollama is healthy");
                return Ok(());
            }
            _ => {
                sleep(Duration::from_millis(500)).await;
            }
        }
    }

    Err(format!(
        "Ollama did not become healthy within {} seconds",
        timeout.as_secs()
    ))
}

/// Stops the Ollama process
pub async fn stop_ollama(
    process_manager: &Mutex<OllamaProcessManager>,
    force_kill_pid: Option<u32>,
) -> Result<(), String> {
    // First, try to stop managed process
    let managed_pid = {
        let mut manager = process_manager
            .lock()
            .map_err(|e| format!("Failed to lock process manager: {}", e))?;

        if let Some(mut child) = manager.managed_child.take() {
            log::info!("Killing managed Ollama process");
            let _ = child.kill();
            let _ = child.wait();
            manager.managed_pid = None;
            return Ok(());
        }

        manager.managed_pid
    };

    // If we have a managed PID but no child (shouldn't happen normally), use it
    let pid_to_kill = force_kill_pid.or(managed_pid).or_else(is_ollama_running);

    if let Some(pid) = pid_to_kill {
        log::info!("Stopping Ollama process with PID: {}", pid);

        // Try SIGTERM first (graceful)
        let result = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .output();

        match result {
            Ok(output) if output.status.success() => {
                // Wait a bit for graceful shutdown
                sleep(Duration::from_secs(2)).await;

                // Check if still running
                if is_ollama_running().is_some() {
                    log::warn!("Ollama still running, sending SIGKILL");
                    let _ = Command::new("kill")
                        .args(["-9", &pid.to_string()])
                        .output();
                }

                // Clear managed state
                if let Ok(mut manager) = process_manager.lock() {
                    manager.managed_child = None;
                    manager.managed_pid = None;
                }

                Ok(())
            }
            _ => {
                // Try osascript for Ollama.app
                log::info!("Trying to quit Ollama.app via AppleScript");
                let result = Command::new("osascript")
                    .args(["-e", "tell application \"Ollama\" to quit"])
                    .output();

                match result {
                    Ok(output) if output.status.success() => {
                        sleep(Duration::from_secs(2)).await;
                        Ok(())
                    }
                    _ => Err("Failed to stop Ollama process".to_string()),
                }
            }
        }
    } else {
        Err("No Ollama process found to stop".to_string())
    }
}

/// Gets the current status of the Ollama process
pub fn get_process_status(process_manager: &Mutex<OllamaProcessManager>) -> OllamaProcessStatus {
    let running_pid = is_ollama_running();

    let (managed_by_app, managed_pid) = if let Ok(manager) = process_manager.lock() {
        let is_managed = manager.managed_pid.is_some()
            && running_pid.is_some()
            && manager.managed_pid == running_pid;
        (is_managed, manager.managed_pid)
    } else {
        (false, None)
    };

    OllamaProcessStatus {
        is_running: running_pid.is_some(),
        managed_by_app,
        pid: if managed_by_app { managed_pid } else { running_pid },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_installation() {
        let installation = detect_installation();
        // Just verify it doesn't panic and returns valid data
        assert!(["none", "cli", "app", "both"]
            .contains(&installation.installation_type.as_str()));
    }

    #[test]
    fn test_installation_type_as_str() {
        assert_eq!(InstallationType::None.as_str(), "none");
        assert_eq!(InstallationType::Cli.as_str(), "cli");
        assert_eq!(InstallationType::App.as_str(), "app");
        assert_eq!(InstallationType::Both.as_str(), "both");
    }
}
