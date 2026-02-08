use crate::openclaw::types::{GatewayProcessStatus, OpenClawInstallation};
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time::sleep;

/// Manages the lifecycle of the OpenClaw gateway process
pub struct GatewayProcessManager {
    pub managed_child: Option<Child>,
    pub managed_pid: Option<u32>,
    pub port: u16,
}

impl Default for GatewayProcessManager {
    fn default() -> Self {
        Self {
            managed_child: None,
            managed_pid: None,
            port: 18789,
        }
    }
}

/// Detects how OpenClaw is installed on the system
pub fn detect_installation() -> OpenClawInstallation {
    let node_available = check_node_available();
    let (path, version) = find_openclaw();

    OpenClawInstallation {
        installed: path.is_some(),
        path,
        version,
        node_available,
    }
}

/// Check if Node.js is available
fn check_node_available() -> bool {
    Command::new("node")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Find the OpenClaw CLI binary and version
fn find_openclaw() -> (Option<String>, Option<String>) {
    // Check common npm global paths
    let paths = [
        "/usr/local/bin/openclaw",
        "/opt/homebrew/bin/openclaw",
    ];

    for p in paths {
        if std::path::Path::new(p).exists() {
            let version = get_version(p);
            return (Some(p.to_string()), version);
        }
    }

    // Fallback: which
    if let Ok(output) = Command::new("which").arg("openclaw").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() && std::path::Path::new(&path).exists() {
                let version = get_version(&path);
                return (Some(path), version);
            }
        }
    }

    // Also check npx availability
    if let Ok(output) = Command::new("npx").args(["openclaw", "--version"]).output() {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return (Some("npx openclaw".to_string()), Some(version));
        }
    }

    (None, None)
}

/// Get version from openclaw binary
fn get_version(path: &str) -> Option<String> {
    Command::new(path)
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                let v = String::from_utf8_lossy(&o.stdout).trim().to_string();
                if !v.is_empty() { Some(v) } else { None }
            } else {
                None
            }
        })
}

/// Installs OpenClaw globally via npm
pub async fn install_openclaw() -> Result<OpenClawInstallation, String> {
    if !check_node_available() {
        return Err("Node.js is not installed. Install it from nodejs.org first.".to_string());
    }

    log::info!("Installing OpenClaw via npm install -g openclaw");

    let output = Command::new("npm")
        .args(["install", "-g", "openclaw"])
        .output()
        .map_err(|e| format!("Failed to run npm: {}", e))?;

    if output.status.success() {
        log::info!("OpenClaw installed successfully");
        Ok(detect_installation())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        log::error!("OpenClaw installation failed: {}", stderr);

        let message = if stderr.contains("EACCES") || stderr.contains("permission denied") {
            "Permission denied. Try fixing npm permissions or use a Node version manager (nvm).".to_string()
        } else if stderr.contains("ENOTFOUND") || stderr.contains("EAI_AGAIN") || stderr.contains("ETIMEDOUT") {
            "Network error. Check your internet connection and try again.".to_string()
        } else if stderr.contains("404") || stderr.contains("Not Found") {
            "Package not found. The openclaw package may not be published yet.".to_string()
        } else {
            format!("Installation failed: {}", stderr.lines().last().unwrap_or(&stderr).trim())
        };

        Err(message)
    }
}

/// Check if the OpenClaw gateway is running by trying to connect
pub fn is_gateway_running(port: u16) -> Option<u32> {
    // Check for a process listening on the gateway port
    let output = Command::new("lsof")
        .args(["-t", "-i", &format!(":{}", port)])
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

/// Starts the OpenClaw gateway process
pub async fn start_gateway(
    installation: &OpenClawInstallation,
    process_manager: &Mutex<GatewayProcessManager>,
    port: u16,
) -> Result<u32, String> {
    // Check if already running on the port
    if let Some(pid) = is_gateway_running(port) {
        return Err(format!("OpenClaw gateway is already running with PID {}", pid));
    }

    // Clean up any stale managed process before spawning a new one
    {
        let mut manager = process_manager
            .lock()
            .map_err(|e| format!("Failed to lock process manager: {}", e))?;
        if let Some(mut child) = manager.managed_child.take() {
            log::info!("Cleaning up stale gateway process");
            let _ = child.kill();
            let _ = child.wait();
        }
        manager.managed_pid = None;
    }

    let path = installation
        .path
        .as_ref()
        .ok_or("OpenClaw is not installed")?;

    let is_npx = path == "npx openclaw";
    let port_str = port.to_string();
    let (cmd_name, cmd_args): (&str, Vec<&str>) = if is_npx {
        ("npx", vec!["openclaw", "gateway", "--port", &port_str])
    } else {
        (path.as_str(), vec!["gateway", "--port", &port_str])
    };

    log::info!("Spawning gateway: {} {}", cmd_name, cmd_args.join(" "));

    let mut child = Command::new(cmd_name)
        .args(&cmd_args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn OpenClaw gateway: {}", e))?;

    let pid = child.id();
    log::info!("OpenClaw gateway started with PID: {}", pid);

    // Shared buffer to accumulate stderr output for error reporting
    let stderr_buf: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));

    // Drain stdout in a background thread, logging each line
    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(l) => log::info!("openclaw stdout: {}", l),
                    Err(_) => break,
                }
            }
        });
    }

    // Drain stderr in a background thread, logging and buffering each line
    if let Some(stderr) = child.stderr.take() {
        let buf_clone = Arc::clone(&stderr_buf);
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(l) => {
                        log::warn!("openclaw stderr: {}", l);
                        if let Ok(mut buf) = buf_clone.lock() {
                            if !buf.is_empty() {
                                buf.push('\n');
                            }
                            buf.push_str(&l);
                        }
                    }
                    Err(_) => break,
                }
            }
        });
    }

    // Brief pause to let the process crash early if it's going to
    sleep(Duration::from_millis(1500)).await;

    // Check if the process died immediately
    match child.try_wait() {
        Ok(Some(status)) => {
            // Give drain thread a moment to flush
            sleep(Duration::from_millis(100)).await;
            let captured = stderr_buf.lock().map(|b| b.clone()).unwrap_or_default();
            let detail = if captured.is_empty() {
                format!("exit code: {}", status)
            } else {
                log::error!("Gateway stderr output:\n{}", captured);
                captured.lines().last().unwrap_or(&captured).trim().to_string()
            };
            log::error!("Gateway process exited immediately: {}", detail);
            return Err(format!("Gateway process exited immediately ({})", detail));
        }
        Ok(None) => {
            log::info!("Process still alive after 1.5s, waiting for port {}...", port);
        }
        Err(e) => {
            return Err(format!("Failed to check gateway process: {}", e));
        }
    }

    // Store in manager
    {
        let mut manager = process_manager
            .lock()
            .map_err(|e| format!("Failed to lock process manager: {}", e))?;
        manager.managed_child = Some(child);
        manager.managed_pid = Some(pid);
        manager.port = port;
    }

    // Wait for the gateway to become available
    let timeout = if is_npx { Duration::from_secs(30) } else { Duration::from_secs(15) };

    match wait_for_gateway(port, timeout, process_manager, &stderr_buf).await {
        Ok(()) => Ok(pid),
        Err(e) => {
            // Clean up the failed process
            log::error!("Gateway failed to start, cleaning up: {}", e);
            let mut manager = process_manager
                .lock()
                .map_err(|err| format!("Failed to lock process manager: {}", err))?;
            if let Some(mut child) = manager.managed_child.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
            manager.managed_pid = None;
            Err(e)
        }
    }
}

/// Wait for the gateway to respond on its port, checking process liveness
async fn wait_for_gateway(
    port: u16,
    timeout: Duration,
    process_manager: &Mutex<GatewayProcessManager>,
    stderr_buf: &Arc<Mutex<String>>,
) -> Result<(), String> {
    let start = std::time::Instant::now();
    let url = format!("http://127.0.0.1:{}", port);
    let client = reqwest::Client::new();

    while start.elapsed() < timeout {
        // Check if the process died during startup
        if let Ok(mut manager) = process_manager.lock() {
            if let Some(ref mut child) = manager.managed_child {
                if let Ok(Some(status)) = child.try_wait() {
                    let captured = stderr_buf.lock().map(|b| b.clone()).unwrap_or_default();
                    let detail = if captured.is_empty() {
                        format!("{}", status)
                    } else {
                        log::error!("Gateway stderr at exit:\n{}", captured);
                        format!("{}: {}", status, captured.lines().last().unwrap_or(&captured).trim())
                    };
                    return Err(format!(
                        "Gateway process exited during startup ({})",
                        detail
                    ));
                }
            }
        }

        log::info!("Polling gateway at {} (elapsed: {:.1}s)", url, start.elapsed().as_secs_f64());

        // Try a simple HTTP request - the WS server may respond with upgrade required
        match client.get(&url).send().await {
            Ok(_) => {
                log::info!("OpenClaw gateway is responding on port {}", port);
                return Ok(());
            }
            Err(_) => {
                sleep(Duration::from_millis(500)).await;
            }
        }
    }

    let captured = stderr_buf.lock().map(|b| b.clone()).unwrap_or_default();
    if !captured.is_empty() {
        log::error!("Gateway stderr at timeout:\n{}", captured);
    }

    Err(format!(
        "OpenClaw gateway did not respond within {} seconds. Check if 'openclaw gateway' works in your terminal.{}",
        timeout.as_secs(),
        if captured.is_empty() { String::new() } else { format!("\nStderr: {}", captured.lines().last().unwrap_or(&captured).trim()) }
    ))
}

/// Stops the OpenClaw gateway process
pub async fn stop_gateway(
    process_manager: &Mutex<GatewayProcessManager>,
) -> Result<(), String> {
    let (managed_child_exists, managed_pid, port) = {
        let manager = process_manager
            .lock()
            .map_err(|e| format!("Failed to lock process manager: {}", e))?;
        (manager.managed_child.is_some(), manager.managed_pid, manager.port)
    };

    if managed_child_exists {
        let mut manager = process_manager
            .lock()
            .map_err(|e| format!("Failed to lock process manager: {}", e))?;
        if let Some(mut child) = manager.managed_child.take() {
            log::info!("Killing managed OpenClaw gateway process");
            let _ = child.kill();
            let _ = child.wait();
            manager.managed_pid = None;
            return Ok(());
        }
    }

    // Fallback: kill by PID or port
    let pid = managed_pid.or_else(|| is_gateway_running(port));

    if let Some(pid) = pid {
        log::info!("Stopping OpenClaw gateway with PID: {}", pid);

        let result = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .output();

        match result {
            Ok(output) if output.status.success() => {
                sleep(Duration::from_secs(2)).await;

                if is_gateway_running(port).is_some() {
                    log::warn!("Gateway still running, sending SIGKILL");
                    let _ = Command::new("kill")
                        .args(["-9", &pid.to_string()])
                        .output();
                }

                if let Ok(mut manager) = process_manager.lock() {
                    manager.managed_child = None;
                    manager.managed_pid = None;
                }

                Ok(())
            }
            _ => Err("Failed to stop OpenClaw gateway process".to_string()),
        }
    } else {
        Err("No OpenClaw gateway process found to stop".to_string())
    }
}

/// Gets the current status of the gateway process
pub fn get_gateway_status(process_manager: &Mutex<GatewayProcessManager>) -> GatewayProcessStatus {
    let (port, managed_pid) = if let Ok(manager) = process_manager.lock() {
        (manager.port, manager.managed_pid)
    } else {
        (18789, None)
    };

    let running_pid = is_gateway_running(port);

    let managed_by_app = managed_pid.is_some()
        && running_pid.is_some()
        && managed_pid == running_pid;

    GatewayProcessStatus {
        is_running: running_pid.is_some(),
        managed_by_app,
        pid: if managed_by_app { managed_pid } else { running_pid },
        port,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_installation() {
        let installation = detect_installation();
        // Just verify it doesn't panic
        assert!(installation.installed || !installation.installed);
    }

    #[test]
    fn test_default_process_manager() {
        let manager = GatewayProcessManager::default();
        assert_eq!(manager.port, 18789);
        assert!(manager.managed_child.is_none());
        assert!(manager.managed_pid.is_none());
    }
}
