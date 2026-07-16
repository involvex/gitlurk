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
        .unwrap_or(settings.terminal_shell);
    let custom = shell_path
        .filter(|s| !s.trim().is_empty())
        .or_else(|| {
            if settings.terminal_shell_path.trim().is_empty() {
                None
            } else {
                Some(settings.terminal_shell_path.clone())
            }
        });
    let session_id = state.pty_sessions.spawn(
        app,
        cwd,
        cols,
        rows,
        &preference,
        custom.as_deref(),
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
