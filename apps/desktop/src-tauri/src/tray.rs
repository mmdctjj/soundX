use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

pub fn setup_tray(app: &AppHandle) -> Result<(), String> {
    build_main_tray(app)?;

    #[cfg(target_os = "macos")]
    {
        build_macos_extra_trays(app)?;
    }

    Ok(())
}

fn build_main_tray(app: &AppHandle) -> Result<(), String> {
    let show_main = MenuItemBuilder::with_id("show_main", "Show Main Window")
        .build(app)
        .map_err(|e| e.to_string())?;
    let sep1 = PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?;
    let prev = MenuItemBuilder::with_id("prev", "Previous Track")
        .build(app)
        .map_err(|e| e.to_string())?;
    let play_pause = MenuItemBuilder::with_id("play_pause", "Play/Pause")
        .build(app)
        .map_err(|e| e.to_string())?;
    let next = MenuItemBuilder::with_id("next", "Next Track")
        .build(app)
        .map_err(|e| e.to_string())?;
    let sep2 = PredefinedMenuItem::separator(app).map_err(|e| e.to_string())?;
    let quit = MenuItemBuilder::with_id("quit", "Quit")
        .build(app)
        .map_err(|e| e.to_string())?;

    let menu = MenuBuilder::new(app)
        .item(&show_main)
        .item(&sep1)
        .item(&prev)
        .item(&play_pause)
        .item(&next)
        .item(&sep2)
        .item(&quit)
        .build()
        .map_err(|e| e.to_string())?;

    TrayIconBuilder::with_id("tray_main")
        .menu(&menu)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(|tray, event| handle_tray_icon_event(tray.app_handle(), &event))
        .build(app)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(target_os = "macos")]
fn build_macos_extra_trays(app: &AppHandle) -> Result<(), String> {
    let map_err_str = |e: tauri::Error| e.to_string();

    let lyric_menu = MenuBuilder::new(app)
        .item(
            &MenuItemBuilder::with_id("toggle_lyric", "Toggle Lyrics")
                .build(app)
                .map_err(map_err_str)?,
        )
        .item(&PredefinedMenuItem::separator(app).map_err(map_err_str)?)
        .item(
            &MenuItemBuilder::with_id("show_main", "Show Main Window")
                .build(app)
                .map_err(map_err_str)?,
        )
        .item(
            &MenuItemBuilder::with_id("quit", "Quit")
                .build(app)
                .map_err(map_err_str)?,
        )
        .build()
        .map_err(map_err_str)?;

    TrayIconBuilder::with_id("tray_lyric")
        .title("AudioDock")
        .menu(&lyric_menu)
        .on_menu_event(handle_menu_event)
        .build(app)
        .map_err(map_err_str)?;

    let prev_menu = MenuBuilder::new(app)
        .item(
            &MenuItemBuilder::with_id("prev", "Previous Track")
                .build(app)
                .map_err(map_err_str)?,
        )
        .build()
        .map_err(map_err_str)?;
    TrayIconBuilder::with_id("tray_prev")
        .icon_as_template(true)
        .menu(&prev_menu)
        .on_menu_event(handle_menu_event)
        .build(app)
        .map_err(map_err_str)?;

    let play_menu = MenuBuilder::new(app)
        .item(
            &MenuItemBuilder::with_id("play_pause", "Play/Pause")
                .build(app)
                .map_err(map_err_str)?,
        )
        .build()
        .map_err(map_err_str)?;
    TrayIconBuilder::with_id("tray_play")
        .icon_as_template(true)
        .menu(&play_menu)
        .on_menu_event(handle_menu_event)
        .build(app)
        .map_err(map_err_str)?;

    let next_menu = MenuBuilder::new(app)
        .item(
            &MenuItemBuilder::with_id("next", "Next Track")
                .build(app)
                .map_err(map_err_str)?,
        )
        .build()
        .map_err(map_err_str)?;
    TrayIconBuilder::with_id("tray_next")
        .icon_as_template(true)
        .menu(&next_menu)
        .on_menu_event(handle_menu_event)
        .build(app)
        .map_err(map_err_str)?;

    Ok(())
}

fn handle_tray_icon_event(app: &AppHandle, event: &TrayIconEvent) {
    if matches!(
        event,
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        }
    ) {
        show_main_window(app);
    }
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id.0.as_str() {
        "show_main" => show_main_window(app),
        "quit" => app.exit(0),
        "play_pause" => emit_event(app, "player:toggle"),
        "prev" => emit_event(app, "player:prev"),
        "next" => emit_event(app, "player:next"),
        "toggle_lyric" => emit_event(app, "lyric:toggle"),
        _ => {}
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn emit_event(app: &AppHandle, event: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit(event, ());
    }
}
