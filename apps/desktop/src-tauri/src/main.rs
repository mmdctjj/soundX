use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

mod commands;
mod tray;
mod window;
mod cache;
mod protocol;

use commands::AppState;
use cache::CacheManager;
use window::PlayerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Register custom protocol for media://
            protocol::register()?;

            // Initialize app state
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("audiodock"));
            let cache_manager = Arc::new(CacheManager::new(app_data_dir));
            app.manage(AppState {
                cache_manager,
                player_state: Mutex::new(PlayerState::default()),
            });

            // Setup tray (must be after state init)
            tray::setup_tray(app.handle())?;

            // Setup menu for macOS
            #[cfg(target_os = "macos")]
            window::setup_macos_menu(app.handle());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_device_name,
            commands::get_auto_launch,
            commands::set_auto_launch,
            commands::select_directory,
            commands::open_url,
            commands::open_directory,
            commands::cache_check,
            commands::cache_download,
            commands::cache_list,
            commands::cache_get_size,
            commands::cache_clear,
            commands::minimize_window,
            commands::maximize_window,
            commands::close_window,
            commands::set_always_on_top,
            commands::get_player_state,
            commands::show_main_window,
            commands::create_lyric_window,
            commands::create_mini_window,
            commands::close_lyric_window,
            commands::set_ignore_mouse_events,
            commands::update_lyric_position,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
