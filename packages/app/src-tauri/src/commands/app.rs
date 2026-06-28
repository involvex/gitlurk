use std::fs;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::{AppState, Settings};

#[derive(Serialize, Deserialize, Default)]
struct ReposFile {
    repos: Vec<String>,
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
pub fn app_get_theme(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let file = state.settings_file();
    if !file.exists() {
        return Ok(serde_json::json!({ "theme": "system" }));
    }
    let content = fs::read_to_string(file).map_err(|e| e.to_string())?;
    let settings: Settings = serde_json::from_str(&content).unwrap_or_default();
    Ok(serde_json::json!({ "theme": settings.theme }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_set_theme(state: State<'_, AppState>, theme: String) -> Result<(), String> {
    let file = state.settings_file();
    let settings = Settings { theme };
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(file, content).map_err(|e| e.to_string())
}
