use rusqlite::Connection;
use tauri::webview::Color;
use tauri::{Manager, TitleBarStyle, WebviewWindowBuilder};

#[cfg(target_os = "windows")]
use window_vibrancy::apply_blur;

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

mod anthropic;
mod auth;
mod database;
mod filesystem;
mod git;
mod ollama;
mod openclaw;
mod openai;
mod providers;
mod pty;

use anthropic::{
    anthropic_cancel_stream, anthropic_chat_stream, anthropic_validate_key, AnthropicState,
};
use auth::{auth_check_source_availability, auth_get_status, auth_resolve_with_preference};
use database::{
    db_add_message, db_create_conversation, db_create_repository, db_delete_conversation,
    db_delete_repository, db_get_conversation, db_get_repository, db_list_conversations,
    db_list_conversations_by_repo, db_list_repositories, db_update_conversation, db_update_message,
    db_update_repository, initialize_database, DatabaseState,
};
use git::{git_current_branch, git_diff, git_diff_all, git_status};
use ollama::{
    ollama_cancel_stream, ollama_chat_stream, ollama_delete_model, ollama_detect_installation,
    ollama_get_process_status, ollama_health_check, ollama_list_models, ollama_pull_model,
    ollama_start_process, ollama_stop_process, OllamaState,
};
use openclaw::{
    openclaw_connect, openclaw_detect_installation, openclaw_disconnect,
    openclaw_get_config, openclaw_get_connection_status, openclaw_get_gateway_status,
    openclaw_install, openclaw_list_agents, openclaw_resolve_approval, openclaw_send_message,
    openclaw_start_gateway, openclaw_stop_gateway, OpenClawState,
};
use openai::{openai_cancel_stream, openai_chat_stream, openai_validate_key, OpenAIState};
use filesystem::reveal_in_finder;
use pty::{detect_ai_clis, pty_ack, pty_kill, pty_resize, pty_spawn, pty_write, PtyState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(OllamaState::default())
        .manage(OpenAIState::default())
        .manage(AnthropicState::default())
        .manage(OpenClawState::default())
        .manage(PtyState::new())
        .invoke_handler(tauri::generate_handler![
            ollama_health_check,
            ollama_list_models,
            ollama_chat_stream,
            ollama_cancel_stream,
            ollama_pull_model,
            ollama_delete_model,
            ollama_detect_installation,
            ollama_start_process,
            ollama_stop_process,
            ollama_get_process_status,
            openai_validate_key,
            openai_chat_stream,
            openai_cancel_stream,
            anthropic_validate_key,
            anthropic_chat_stream,
            anthropic_cancel_stream,
            auth_get_status,
            auth_resolve_with_preference,
            auth_check_source_availability,
            db_list_conversations,
            db_get_conversation,
            db_create_conversation,
            db_update_conversation,
            db_delete_conversation,
            db_add_message,
            db_update_message,
            db_list_repositories,
            db_get_repository,
            db_create_repository,
            db_update_repository,
            db_delete_repository,
            db_list_conversations_by_repo,
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
            pty_ack,
            detect_ai_clis,
            git_status,
            git_diff,
            git_diff_all,
            git_current_branch,
            openclaw_detect_installation,
            openclaw_install,
            openclaw_start_gateway,
            openclaw_stop_gateway,
            openclaw_get_gateway_status,
            openclaw_connect,
            openclaw_disconnect,
            openclaw_get_connection_status,
            openclaw_send_message,
            openclaw_list_agents,
            openclaw_resolve_approval,
            openclaw_get_config,
            reveal_in_finder,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let db_path = database::schema::get_database_path(app.handle());
            let conn = Connection::open(&db_path).expect("Failed to open database");
            initialize_database(&conn).expect("Failed to initialize database");
            app.manage(DatabaseState::new(conn));
            log::info!("Database initialized at {:?}", db_path);

            let window_config = app.config().app.windows.get(0).cloned().ok_or_else(|| {
                std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "Missing window config (app.windows[0])",
                )
            })?;

            let win_builder = WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                .background_color(Color(0, 0, 0, 0));

            // set transparent title bar only when building for macOS
            #[cfg(target_os = "macos")]
            let win_builder = win_builder.title_bar_style(TitleBarStyle::Overlay);

            let window = win_builder.build().unwrap();

            // set background color only when building for macOS
            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil};

                let ns_window = window.ns_window().unwrap() as id;
                unsafe {
                    ns_window.setOpaque_(false);
                    let bg_color = NSColor::clearColor(nil);
                    ns_window.setBackgroundColor_(bg_color);
                }
            }

            #[cfg(target_os = "macos")]
            {
                if let Err(error) =
                    apply_vibrancy(&window, NSVisualEffectMaterial::HudWindow, None, None)
                {
                    log::warn!("Failed to apply macOS vibrancy: {error}");
                }
            }

            #[cfg(target_os = "windows")]
            {
                if let Err(error) = apply_blur(&window, Some((18, 18, 18, 125))) {
                    log::warn!("Failed to apply Windows blur: {error}");
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
