use std::fs;

use tauri::{AppHandle, State};

use crate::{AppState, Settings};

fn read_settings(state: &AppState) -> Settings {
    let file = state.settings_file();
    if !file.exists() {
        return Settings::default();
    }
    fs::read_to_string(file)
        .ok()
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

fn path_override_for_shell(preference: &str, settings: &Settings, shell_path: Option<String>) -> Option<String> {
    let from_arg = shell_path.filter(|s| !s.trim().is_empty());
    match preference {
        "custom" => from_arg.or_else(|| {
            let p = settings.terminal_shell_path.trim();
            if p.is_empty() {
                None
            } else {
                Some(p.to_string())
            }
        }),
        "pwsh" => from_arg.or_else(|| {
            let p = settings.terminal_pwsh_path.trim();
            if p.is_empty() {
                None
            } else {
                Some(p.to_string())
            }
        }),
        _ => None,
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn terminal_spawn(
    app: AppHandle,
    state: State<'_, AppState>,
    cwd: String,
    cols: u16,
    rows: u16,
    shell: Option<String>,
    shell_path: Option<String>,
) -> Result<serde_json::Value, String> {
    let settings = read_settings(&state);
    let preference = shell
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| settings.terminal_shell.clone());
    let override_path = path_override_for_shell(&preference, &settings, shell_path);
    let session_id = state.pty_sessions.spawn(
        app,
        cwd,
        cols,
        rows,
        &preference,
        override_path.as_deref(),
    )?;
    Ok(serde_json::json!({ "sessionId": session_id }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn terminal_write(
    state: State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state.pty_sessions.write(&session_id, &data)
}

#[tauri::command(rename_all = "camelCase")]
pub fn terminal_resize(
    state: State<'_, AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state.pty_sessions.resize(&session_id, cols, rows)
}

#[tauri::command(rename_all = "camelCase")]
pub fn terminal_kill(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state.pty_sessions.kill(&session_id)
}
