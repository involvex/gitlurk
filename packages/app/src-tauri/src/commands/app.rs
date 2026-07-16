use std::fs;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::registry;
use crate::repo_watcher;
use crate::{validate_repo_path, AppState, Settings};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoEntry {
    pub path: String,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub last_opened_at: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
struct ReposFile {
    #[serde(default)]
    repos: Vec<RepoEntry>,
}

fn read_repos_file(state: &AppState) -> ReposFile {
    let file = state.repos_file();
    if !file.exists() {
        return ReposFile::default();
    }
    let content = match fs::read_to_string(file) {
        Ok(content) => content,
        Err(_) => return ReposFile::default(),
    };

    if let Ok(data) = serde_json::from_str::<ReposFile>(&content) {
        return data;
    }

    #[derive(Deserialize)]
    struct LegacyReposFile {
        repos: Vec<String>,
    }
    if let Ok(legacy) = serde_json::from_str::<LegacyReposFile>(&content) {
        return ReposFile {
            repos: legacy
                .repos
                .into_iter()
                .map(|path| RepoEntry {
                    path,
                    pinned: false,
                    last_opened_at: None,
                })
                .collect(),
        };
    }

    ReposFile::default()
}

fn write_repos_file(state: &AppState, repos: &[RepoEntry]) -> Result<(), String> {
    let file = state.repos_file();
    let data = ReposFile {
        repos: repos.to_vec(),
    };
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(file, content).map_err(|e| e.to_string())
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
    let data = read_repos_file(&state);
    Ok(serde_json::json!({ "repos": data.repos }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn app_save_repos(state: State<'_, AppState>, repos: Vec<RepoEntry>) -> Result<(), String> {
    write_repos_file(&state, &repos)
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
        "minimizeToTray": settings.minimize_to_tray,
        "terminalShell": settings.terminal_shell,
        "terminalShellPath": settings.terminal_shell_path,
        "backgroundFetchEnabled": settings.background_fetch_enabled,
        "backgroundFetchIntervalMin": settings.background_fetch_interval_min,
        "desktopNotifications": settings.desktop_notifications,
        "autoRefreshOnChange": settings.auto_refresh_on_change,
        "onboardingCompleted": settings.onboarding_completed,
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
    minimize_to_tray: Option<bool>,
    terminal_shell: Option<String>,
    terminal_shell_path: Option<String>,
    background_fetch_enabled: Option<bool>,
    background_fetch_interval_min: Option<u32>,
    desktop_notifications: Option<bool>,
    auto_refresh_on_change: Option<bool>,
    onboarding_completed: Option<bool>,
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
    if let Some(v) = minimize_to_tray {
        settings.minimize_to_tray = v;
    }
    if let Some(v) = terminal_shell {
        let trimmed = v.trim();
        let normalized = trimmed.to_ascii_lowercase();
        settings.terminal_shell = match normalized.as_str() {
            "powershell" | "cmd" | "pwsh" | "custom" => normalized,
            _ if trimmed.contains('\\')
                || trimmed.contains('/')
                || normalized.ends_with(".exe") =>
            {
                settings.terminal_shell_path = trimmed.to_string();
                "custom".into()
            }
            _ => "powershell".into(),
        };
    }
    if let Some(v) = terminal_shell_path {
        settings.terminal_shell_path = v.trim().to_string();
    }
    if let Some(v) = background_fetch_enabled {
        settings.background_fetch_enabled = v;
    }
    if let Some(v) = background_fetch_interval_min {
        settings.background_fetch_interval_min = v.clamp(5, 120);
    }
    if let Some(v) = desktop_notifications {
        settings.desktop_notifications = v;
    }
    if let Some(v) = auto_refresh_on_change {
        settings.auto_refresh_on_change = v;
    }
    if let Some(v) = onboarding_completed {
        settings.onboarding_completed = v;
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

#[tauri::command(rename_all = "camelCase")]
pub fn app_watch_repo(
    app: AppHandle,
    state: State<'_, AppState>,
    path: Option<String>,
) -> Result<(), String> {
    state.repo_watcher.stop();
    let Some(path) = path else {
        return Ok(());
    };
    let dir = validate_repo_path(&path)?;
    repo_watcher::watch_repo(app, &state.repo_watcher, &dir);
    Ok(())
}
