mod commands;
mod database;
mod events;
mod process;
mod runtime;
mod seed;
mod types;
mod utils;

use runtime::AppRuntime;
use tauri::{Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};

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

            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("commander")
                .inner_size(800.0, 600.0)
                .resizable(true);

            // set transparent title bar only when building for macOS
            #[cfg(target_os = "macos")]
            let win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);

            let window = win_builder.build().unwrap();

            // set background color only when building for macOS
            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil};

                let ns_window = window.ns_window().unwrap() as id;
                unsafe {
                    // primary color (cyan): oklch(0.5 0.15 200) ≈ RGB(60, 150, 180) for light mode
                    // primary color (cyan): oklch(0.68 0.12 200) ≈ RGB(100, 180, 210) for dark mode
                    // Using light mode primary color (cyan)
                    let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                        nil,
                        60.0 / 255.0,
                        150.0 / 255.0,
                        180.0 / 255.0,
                        1.0,
                    );
                    ns_window.setBackgroundColor_(bg_color);
                }
            }

            let runtime = AppRuntime::new(app.handle())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            app.manage(runtime);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
