mod agent_commands;
mod approval_commands;
mod approval_service;
mod bridge;
mod commands;
mod database;
mod events;
mod port_registry;
mod process;
mod providers;
mod runtime;
mod seed;
mod types;
mod utils;

use port_registry::PortRegistry;
use runtime::AppRuntime;
use tauri::{Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Commander commands
            commands::commander_state,
            commands::commander_add_repository,
            commands::commander_repo_branches,
            commands::commander_import_commands,
            commands::commander_add_command,
            commands::commander_update_command,
            commands::commander_run_command,
            commands::commander_stop_command,
            commands::commander_delete_command,
            commands::commander_delete_repository,
            commands::commander_get_execution_logs,
            // Port registry commands
            port_registry::port_registry_lease_port,
            port_registry::port_registry_release_port,
            port_registry::port_registry_list_leases,
            port_registry::port_registry_allocate_port_and_lease,
            // Agent commands
            agent_commands::agent_state,
            agent_commands::agent_create,
            agent_commands::agent_delete,
            agent_commands::agent_get,
            agent_commands::agent_list,
            agent_commands::agent_add_repo,
            agent_commands::agent_remove_repo,
            agent_commands::agent_list_repos,
            agent_commands::session_start,
            agent_commands::session_get,
            agent_commands::session_list_by_agent,
            agent_commands::session_end,
            agent_commands::action_get,
            agent_commands::action_list_by_session,
            agent_commands::approval_list_pending,
            agent_commands::approval_approve,
            agent_commands::approval_reject,
            agent_commands::event_list_by_session,
            agent_commands::event_list_recent,
            agent_commands::mode_get,
            agent_commands::mode_set,
            // Advanced approval commands
            approval_commands::approval_approve_v2,
            approval_commands::approval_reject_v2,
            approval_commands::approval_approve_all,
            approval_commands::approval_reject_all,
            approval_commands::approval_pending_count,
            approval_commands::approval_pending_for_session,
            approval_commands::mode_set_v2,
            approval_commands::mode_get_v2,
            approval_commands::mode_toggle
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("")
                .inner_size(800.0, 600.0)
                .resizable(true)
                .min_inner_size(400.0, 400.0);

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

            let runtime = AppRuntime::new(app.handle())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            app.manage(runtime);
            app.manage(PortRegistry::new());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
