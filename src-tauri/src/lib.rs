mod commands;
mod database;
mod events;
mod process;
mod runtime;
mod seed;
mod types;
mod utils;

use runtime::AppRuntime;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::commander_state,
            commands::commander_add_repository,
            commands::commander_add_command,
            commands::commander_run_command,
            commands::commander_stop_command
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let runtime = AppRuntime::new(app.handle())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            app.manage(runtime);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
