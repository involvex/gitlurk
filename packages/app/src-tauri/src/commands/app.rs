use std::fs;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::registry;
use crate::{AppState, Settings};

#[derive(Serialize, Deserialize, Default)]
struct ReposFile {
    repos: Vec<String>,
}

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

fn write_settings(state: &AppState, settings: &Settings) -> Result<(), String> {
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(state.settings_file(), content).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_take_pending_action(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    match state.take_cli_action() {
        Some(action) => Ok(serde_json::to_value(action).map_err(|e| e.to_string())?),
        None => Ok(serde_json::Value::Null),
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_get_repos(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let file = state.repos_file();
    if !file.exists() {
        return Ok(serde_json::json!({ "repos": [] }));
    }
    let content = fs::read_to_string(file).map_err(|e| e.to_string())?;
    let data: ReposFile = serde_json::from_str(&content).unwrap_or_default();
    Ok(serde_json::json!({ "repos": data.repos }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_save_repos(state: State<'_, AppState>, repos: Vec<String>) -> Result<(), String> {
    let file = state.repos_file();
    let data = ReposFile { repos };
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(file, content).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_get_settings(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let settings = read_settings(&state);
    Ok(serde_json::json!({
        "theme": settings.theme,
        "sidebarWidth": settings.sidebar_width,
        "fileListWidth": settings.file_list_width,
        "rightRailWidth": settings.right_rail_width,
        "terminalHeight": settings.terminal_height,
        "aiProvider": settings.ai_provider,
        "aiModel": settings.ai_model,
        "kiloBaseUrl": settings.kilo_base_url,
    }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_set_settings(
    state: State<'_, AppState>,
    theme: Option<String>,
    sidebar_width: Option<u32>,
    file_list_width: Option<u32>,
    right_rail_width: Option<u32>,
    terminal_height: Option<u32>,
    ai_provider: Option<String>,
    ai_model: Option<String>,
    kilo_base_url: Option<String>,
) -> Result<(), String> {
    let mut settings = read_settings(&state);
    if let Some(theme) = theme {
        settings.theme = theme;
    }
    if let Some(v) = sidebar_width {
        settings.sidebar_width = v;
    }
    if let Some(v) = file_list_width {
        settings.file_list_width = v;
    }
    if let Some(v) = right_rail_width {
        settings.right_rail_width = v;
    }
    if let Some(v) = terminal_height {
        settings.terminal_height = v;
    }
    if let Some(v) = ai_provider {
        settings.ai_provider = v;
    }
    if let Some(v) = ai_model {
        settings.ai_model = v;
    }
    if let Some(v) = kilo_base_url {
        settings.kilo_base_url = v;
    }
    write_settings(&state, &settings)
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_get_theme(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let settings = read_settings(&state);
    Ok(serde_json::json!({ "theme": settings.theme }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_set_theme(state: State<'_, AppState>, theme: String) -> Result<(), String> {
    let mut settings = read_settings(&state);
    settings.theme = theme;
    write_settings(&state, &settings)
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_get_explorer_menu(app: AppHandle) -> Result<serde_json::Value, String> {
    let enabled = registry::is_explorer_menu_enabled(&app)?;
    Ok(serde_json::json!({ "enabled": enabled }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_set_explorer_menu(app: AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        registry::enable_explorer_menu(&app)
    } else {
        registry::disable_explorer_menu(&app)
    }
}
