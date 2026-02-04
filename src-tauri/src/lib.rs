use tauri::webview::Color;
use tauri::{Manager, TitleBarStyle, WebviewWindowBuilder};

#[cfg(target_os = "windows")]
use window_vibrancy::apply_blur;

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

mod ollama;
use ollama::{
    ollama_cancel_stream, ollama_chat_stream, ollama_delete_model, ollama_health_check,
    ollama_list_models, ollama_pull_model, OllamaState,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(OllamaState::default())
        .invoke_handler(tauri::generate_handler![
            ollama_health_check,
            ollama_list_models,
            ollama_chat_stream,
            ollama_cancel_stream,
            ollama_pull_model,
            ollama_delete_model,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

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
