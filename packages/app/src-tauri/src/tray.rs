use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow, Window};

pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        restore_from_tray(&window);
    }
}

pub fn hide_to_tray(window: &Window) {
    let _ = window.hide();
    let _ = window.set_skip_taskbar(true);
}

pub fn restore_from_tray(window: &WebviewWindow) {
    let _ = window.set_skip_taskbar(false);
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "tray_show", "Show GitLurk", true, None::<&str>)?;
    let notifications = MenuItem::with_id(
        app,
        "tray_notifications",
        "Show Notifications",
        true,
        None::<&str>,
    )?;
    let discover =
        MenuItem::with_id(app, "tray_discover", "Open Discover", true, None::<&str>)?;
    let settings =
        MenuItem::with_id(app, "tray_settings", "Settings", true, None::<&str>)?;
    let pull = MenuItem::with_id(app, "tray_pull", "Pull Active Repo", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "tray_quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &show,
            &PredefinedMenuItem::separator(app)?,
            &notifications,
            &discover,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &pull,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("GitLurk Desktop")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "tray_show" => {
                show_main(app);
                let _ = app.emit("tray-action", "show");
            }
            "tray_notifications" => {
                show_main(app);
                let _ = app.emit("tray-action", "notifications");
            }
            "tray_discover" => {
                show_main(app);
                let _ = app.emit("tray-action", "discover");
            }
            "tray_settings" => {
                show_main(app);
                let _ = app.emit("tray-action", "settings");
            }
            "tray_pull" => {
                let _ = app.emit("tray-action", "pull");
            }
            "tray_quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                show_main(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    } else {
        builder = builder.icon(tauri::include_image!("icons/32x32.png"));
    }

    builder.build(app)?;
    Ok(())
}
