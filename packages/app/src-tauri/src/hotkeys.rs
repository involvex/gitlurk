use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use crate::AppState;

pub fn default_show_app() -> String {
    "Ctrl+Alt+G".into()
}

pub fn default_command_palette() -> String {
    "Ctrl+Shift+P".into()
}

/// Normalize UI hotkey strings (Ctrl+Alt+G) for the global-shortcut parser.
fn to_plugin_shortcut(hotkey: &str) -> String {
    hotkey
        .split('+')
        .map(|part| {
            let p = part.trim();
            match p.to_ascii_lowercase().as_str() {
                "ctrl" | "control" => "Ctrl".to_string(),
                "cmd" | "command" | "meta" => "Cmd".to_string(),
                "alt" | "option" => "Alt".to_string(),
                "shift" => "Shift".to_string(),
                other if other.len() == 1 => other.to_ascii_uppercase(),
                other => {
                    let mut chars = other.chars();
                    match chars.next() {
                        Some(c) => format!("{}{}", c.to_ascii_uppercase(), chars.as_str()),
                        None => String::new(),
                    }
                }
            }
        })
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("+")
}

pub fn register_show_app_hotkey(app: &AppHandle) {
    let settings = {
        let Some(state) = app.try_state::<AppState>() else {
            return;
        };
        let file = state.settings_file();
        if !file.exists() {
            crate::Settings::default()
        } else {
            std::fs::read_to_string(&file)
                .ok()
                .and_then(|raw| serde_json::from_str(&raw).ok())
                .unwrap_or_default()
        }
    };

    let hotkey = if settings.hotkey_show_app.trim().is_empty() {
        default_show_app()
    } else {
        settings.hotkey_show_app.clone()
    };

    let _ = app.global_shortcut().unregister_all();

    let plugin_str = to_plugin_shortcut(&hotkey);
    let Ok(shortcut) = plugin_str.parse::<Shortcut>() else {
        eprintln!("Invalid show-app hotkey: {hotkey} ({plugin_str})");
        return;
    };

    if let Err(err) = app.global_shortcut().register(shortcut) {
        eprintln!("Failed to register show-app hotkey '{hotkey}': {err}");
    }
}
