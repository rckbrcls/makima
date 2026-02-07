use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCliInfo {
    pub name: String,
    pub command: String,
    pub version: Option<String>,
    pub installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCliDetectionResult {
    pub clis: Vec<AiCliInfo>,
}

struct CliCandidate {
    name: &'static str,
    binary: &'static str,
    version_flag: &'static str,
}

const KNOWN_CLIS: &[CliCandidate] = &[
    CliCandidate {
        name: "Claude Code",
        binary: "claude",
        version_flag: "--version",
    },
    CliCandidate {
        name: "Codex",
        binary: "codex",
        version_flag: "--version",
    },
    CliCandidate {
        name: "Gemini CLI",
        binary: "gemini",
        version_flag: "--version",
    },
    CliCandidate {
        name: "Aider",
        binary: "aider",
        version_flag: "--version",
    },
];

#[cfg(target_os = "macos")]
const SEARCH_PATHS: &[&str] = &[
    "/usr/local/bin",
    "/opt/homebrew/bin",
];

#[cfg(target_os = "linux")]
const SEARCH_PATHS: &[&str] = &[
    "/usr/local/bin",
    "/usr/bin",
    "/snap/bin",
];

#[cfg(target_os = "windows")]
const SEARCH_PATHS: &[&str] = &[];

fn find_cli_path(binary: &str) -> Option<String> {
    // Check common paths
    for dir in SEARCH_PATHS {
        let full_path = format!("{}/{}", dir, binary);
        if std::path::Path::new(&full_path).exists() {
            return Some(full_path);
        }
    }

    // Check ~/.local/bin (Unix only)
    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(home) = std::env::var("HOME") {
            let local_path = format!("{}/.local/bin/{}", home, binary);
            if std::path::Path::new(&local_path).exists() {
                return Some(local_path);
            }
        }
    }

    // Fallback to which/where
    let lookup_cmd = if cfg!(target_os = "windows") {
        "where"
    } else {
        "which"
    };

    let output = Command::new(lookup_cmd)
        .arg(binary)
        .output()
        .ok()?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout)
            .trim()
            .lines()
            .next()
            .unwrap_or("")
            .to_string();
        if !path.is_empty() && std::path::Path::new(&path).exists() {
            return Some(path);
        }
    }

    None
}

fn get_cli_version(path: &str, version_flag: &str) -> Option<String> {
    let output = Command::new(path)
        .arg(version_flag)
        .output()
        .ok()?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout)
            .trim()
            .to_string();
        if !version.is_empty() {
            return Some(version);
        }
    }

    // Some CLIs output version to stderr
    let stderr = String::from_utf8_lossy(&output.stderr)
        .trim()
        .to_string();
    if !stderr.is_empty() {
        return Some(stderr);
    }

    None
}

pub fn detect_ai_clis() -> AiCliDetectionResult {
    let clis: Vec<AiCliInfo> = KNOWN_CLIS
        .iter()
        .map(|candidate| {
            match find_cli_path(candidate.binary) {
                Some(path) => {
                    let version = get_cli_version(&path, candidate.version_flag);
                    AiCliInfo {
                        name: candidate.name.to_string(),
                        command: path,
                        version,
                        installed: true,
                    }
                }
                None => AiCliInfo {
                    name: candidate.name.to_string(),
                    command: candidate.binary.to_string(),
                    version: None,
                    installed: false,
                },
            }
        })
        .collect();

    AiCliDetectionResult { clis }
}
