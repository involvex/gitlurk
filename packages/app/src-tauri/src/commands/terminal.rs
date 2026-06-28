use tauri::{AppHandle, State};

use crate::AppState;

#[tauri::command(rename_all = "camelCase")]
pub fn terminal_spawn(
    app: AppHandle,
    state: State<'_, AppState>,
    cwd: String,
    cols: u16,
    rows: u16,
) -> Result<serde_json::Value, String> {
    let session_id = state
        .pty_sessions
        .spawn(app, cwd, cols, rows)?;
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
