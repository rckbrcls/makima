# Makima Desktop Tauri Backend

> **Status:** Active
> Rust-side native capability layer for Makima Desktop.

## Summary

- Active Rust/Tauri capability layer for Makima Desktop.
- Solves provider calls, auth status, SQLite persistence, Git inspection, PTY lifecycle, filesystem reveal commands, and native window effects.
- Main stack: Rust 2021, Tauri 2, rusqlite, portable-pty, git2, reqwest, tokio, tokio-tungstenite, and window-vibrancy.
- Current status: active backend for the Makima desktop app.
- Technical value: separates native execution, database, provider, Git, PTY, and filesystem modules from the React renderer.

Tauri package that exposes native commands to the Makima React desktop app.

## Features

- Provider commands for Anthropic, OpenAI, and Ollama.
- Auth status and source-resolution commands.
- SQLite-backed conversation, repository, message, and CLI-session persistence.
- Git status and diff commands.
- PTY spawn, write, resize, kill, ack, and AI CLI detection.
- Filesystem command for revealing paths in Finder.
- macOS vibrancy and Windows blur setup.

## Tech Stack

- Rust 2021
- Tauri 2
- rusqlite
- portable-pty
- git2
- reqwest
- tokio
- tokio-tungstenite
- window-vibrancy

## Project Structure

```text
src-tauri/
├── Cargo.toml
└── src/
    ├── anthropic/
    ├── auth/
    ├── database/
    ├── git/
    ├── ollama/
    ├── openai/
    ├── pty/
    ├── filesystem.rs
    ├── lib.rs
    └── main.rs
```

## Architecture

`src/lib.rs` wires Tauri plugins, registers invoke handlers, initializes the local database, creates the window, and applies native visual effects where supported. Feature modules keep provider, database, Git, and terminal behavior separated from the app bootstrap.
