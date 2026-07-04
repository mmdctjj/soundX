use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::commands::{LyricSettingsPayload, TrackInfo};

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct PlayerState {
    pub is_playing: bool,
    pub track: Option<TrackInfo>,
    pub current_time: Option<f64>,
    pub duration: Option<f64>,
}

pub struct WindowManager<'a> {
    app: &'a AppHandle,
}

impl<'a> WindowManager<'a> {
    pub fn new(app: &'a AppHandle) -> Self {
        Self { app }
    }

    pub fn create_lyric_window(&self, settings: Option<LyricSettingsPayload>) -> Result<(), String> {
        if let Some(existing) = self.app.get_webview_window("lyric") {
            let _ = existing.close();
        }

        let mut builder =
            WebviewWindowBuilder::new(self.app, "lyric", WebviewUrl::App("index.html#/lyric".into()))
                .title("Lyric")
                .inner_size(800.0, 120.0)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(true)
                .visible(true);

        if let Some(s) = settings {
            if let (Some(x), Some(y)) = (s.x, s.y) {
                builder = builder.position(x as f64, y as f64);
            } else {
                let monitor = self
                    .app
                    .primary_monitor()
                    .map_err(|e| e.to_string())?
                    .ok_or("No primary monitor found")?;
                let size = monitor.size();
                let x = ((size.width as f64) - 800.0) / 2.0;
                let y = (size.height as f64) - 120.0 - 50.0;
                builder = builder.position(x, y);
            }
        }

        let window = builder.build().map_err(|e| e.to_string())?;

        #[cfg(target_os = "macos")]
        {
            let _ = window.set_always_on_top(true);
        }

        Ok(())
    }

    pub fn create_mini_window(&self) -> Result<(), String> {
        if let Some(existing) = self.app.get_webview_window("mini") {
            let _ = existing.close();
        }

        let window =
            WebviewWindowBuilder::new(self.app, "mini", WebviewUrl::App("index.html#/mini".into()))
                .title("Mini Player")
                .inner_size(360.0, 170.0)
                .decorations(false)
                .resizable(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .visible(true)
                .build()
                .map_err(|e| e.to_string())?;

        #[cfg(target_os = "macos")]
        {
            let _ = window.set_always_on_top(true);
        }

        Ok(())
    }
}

#[cfg(target_os = "macos")]
pub fn setup_macos_menu(app: &AppHandle) {
    use tauri::menu::{MenuBuilder, PredefinedMenuItem};

    let mk = |r: tauri::Result<_>| r.unwrap_or_else(|e| panic!("menu item: {}", e));

    let about = mk(PredefinedMenuItem::about(app, Some("AudioDock"), None));
    let separator1 = mk(PredefinedMenuItem::separator(app));
    let services = mk(PredefinedMenuItem::services(app, None));
    let separator2 = mk(PredefinedMenuItem::separator(app));
    let hide = mk(PredefinedMenuItem::hide(app, None));
    let hide_others = mk(PredefinedMenuItem::hide_others(app, None));
    let show_all = mk(PredefinedMenuItem::show_all(app, None));
    let separator3 = mk(PredefinedMenuItem::separator(app));
    let quit = mk(PredefinedMenuItem::quit(app, None));

    let menu = MenuBuilder::new(app)
        .items(&[
            &about,
            &separator1,
            &services,
            &separator2,
            &hide,
            &hide_others,
            &show_all,
            &separator3,
            &quit,
        ])
        .build()
        .unwrap();

    app.set_menu(menu).unwrap();
}
