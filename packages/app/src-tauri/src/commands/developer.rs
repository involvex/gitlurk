use std::path::PathBuf;

use serde::Serialize;
use tauri::State;

use crate::{terminal, validate_repo_path, AppState};

#[derive(Serialize)]
pub struct GhVersionResponse {
    pub installed: bool,
    pub version: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GhAuthStatusResponse {
    pub logged_in: bool,
    pub summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GhRunItem {
    pub id: String,
    pub status: String,
    pub workflow: String,
    pub created_at: String,
    pub url: String,
}

#[derive(Serialize)]
pub struct GhRunListResponse {
    pub runs: Vec<GhRunItem>,
}

#[derive(Serialize)]
pub struct GhConfigEntry {
    pub key: String,
    pub value: String,
}

#[derive(Serialize)]
pub struct GhAliasEntry {
    pub name: String,
    pub expansion: String,
}

fn repo_cwd(path: Option<String>) -> Result<PathBuf, String> {
    match path {
        Some(p) => validate_repo_path(&p),
        None => Ok(std::env::current_dir().map_err(|e| e.to_string())?),
    }
}

fn parse_scope(scope: Option<String>) -> Result<String, String> {
    let value = scope.unwrap_or_else(|| "local".into());
    if matches!(value.as_str(), "global" | "local" | "system") {
        Ok(value)
    } else {
        Err("scope must be global, local, or system".into())
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_version(state: State<'_, AppState>) -> GhVersionResponse {
    let installed = state.gh.is_installed();
    let version = state.gh.version().ok().flatten();
    GhVersionResponse {
        installed,
        version,
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_auth_status(state: State<'_, AppState>) -> Result<GhAuthStatusResponse, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let output = state.gh.exec(&["auth", "status"], &cwd)?;
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let summary = format!("{stdout}{stderr}").trim().to_string();
    Ok(GhAuthStatusResponse {
        logged_in: output.status.success(),
        summary,
    })
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_run_list(
    state: State<'_, AppState>,
    repo: Option<String>,
    limit: Option<u32>,
    path: Option<String>,
) -> Result<GhRunListResponse, String> {
    let cwd = repo_cwd(path)?;
    let limit_str = limit.unwrap_or(10).to_string();
    let mut args = vec![
        "run",
        "list",
        "--limit",
        limit_str.as_str(),
        "--json",
        "databaseId,status,workflowName,createdAt,url",
    ];
    if let Some(r) = repo.as_deref() {
        args.push("--repo");
        args.push(r);
    }

    let output = state.gh.exec(&args, &cwd)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let parsed: Vec<serde_json::Value> =
        serde_json::from_slice(&output.stdout).unwrap_or_default();
    let runs = parsed
        .into_iter()
        .filter_map(|item| {
            Some(GhRunItem {
                id: item.get("databaseId")?.to_string(),
                status: item.get("status")?.as_str()?.to_string(),
                workflow: item.get("workflowName")?.as_str()?.to_string(),
                created_at: item.get("createdAt")?.as_str()?.to_string(),
                url: item.get("url")?.as_str()?.to_string(),
            })
        })
        .collect();

    Ok(GhRunListResponse { runs })
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_run_watch(
    state: State<'_, AppState>,
    run_id: Option<String>,
    repo: Option<String>,
    path: Option<String>,
) -> Result<(), String> {
    let cwd = repo_cwd(path)?;
    state.gh.resolve_gh()?;

    let mut cmd = format!("gh run watch");
    if let Some(id) = run_id {
        cmd.push(' ');
        cmd.push_str(&id);
    }
    if let Some(r) = repo {
        cmd.push_str(" --repo ");
        cmd.push_str(&r);
    }

    terminal::open_in_windows_terminal_with_command(cwd.to_string_lossy().as_ref(), &cmd)
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_repo_fork(
    state: State<'_, AppState>,
    repo: Option<String>,
    clone: Option<bool>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let mut args = vec!["repo", "fork"];
    if let Some(r) = repo.as_deref() {
        args.push(r);
    }
    if clone.unwrap_or(false) {
        args.push("--clone");
    }

    let output = state.gh.exec(&args, &cwd)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(serde_json::json!({ "summary": stdout }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_release_create(
    state: State<'_, AppState>,
    tag: String,
    title: Option<String>,
    notes: Option<String>,
    draft: Option<bool>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let mut args = vec!["release", "create", tag.as_str()];
    if let Some(t) = title.as_deref() {
        args.push("--title");
        args.push(t);
    }
    if let Some(n) = notes.as_deref() {
        args.push("--notes");
        args.push(n);
    }
    if draft.unwrap_or(false) {
        args.push("--draft");
    }

    let output = state.gh.exec(&args, &cwd)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(serde_json::json!({ "url": stdout }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_config_list(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let output = state.gh.exec(&["config", "list"], &cwd)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let entries: Vec<GhConfigEntry> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let (key, value) = line.split_once('=')?;
            Some(GhConfigEntry {
                key: key.to_string(),
                value: value.to_string(),
            })
        })
        .collect();

    Ok(serde_json::json!({ "entries": entries }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_config_get(
    state: State<'_, AppState>,
    key: String,
) -> Result<serde_json::Value, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let output = state.gh.exec(&["config", "get", key.as_str()], &cwd)?;
    if !output.status.success() {
        return Ok(serde_json::json!({ "value": null }));
    }
    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(serde_json::json!({ "value": value }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_config_set(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let output = state.gh.exec(&["config", "set", key.as_str(), value.as_str()], &cwd)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_alias_list(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let output = state.gh.exec(&["alias", "list"], &cwd)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let aliases: Vec<GhAliasEntry> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                return None;
            }
            let (name, expansion) = trimmed.split_once(':')?;
            Some(GhAliasEntry {
                name: name.trim().to_string(),
                expansion: expansion.trim().to_string(),
            })
        })
        .collect();

    Ok(serde_json::json!({ "aliases": aliases }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_git_config_list(
    state: State<'_, AppState>,
    scope: Option<String>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let scope = parse_scope(scope)?;
    let entries = state
        .git
        .config_list(&scope, &cwd, scope == "local")?;
    Ok(serde_json::json!({ "entries": entries }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_git_config_get(
    state: State<'_, AppState>,
    key: String,
    scope: Option<String>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let scope = parse_scope(scope)?;
    let value = state.git.config_get(&key, &scope, &cwd)?;
    Ok(serde_json::json!({ "value": value }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_git_config_set(
    state: State<'_, AppState>,
    key: String,
    value: String,
    scope: Option<String>,
    path: Option<String>,
) -> Result<(), String> {
    let cwd = repo_cwd(path)?;
    let scope = parse_scope(scope)?;
    state.git.config_set(&key, &value, &scope, &cwd)
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_git_config_edit(
    state: State<'_, AppState>,
    scope: Option<String>,
    path: Option<String>,
) -> Result<(), String> {
    let cwd = repo_cwd(path)?;
    let scope = parse_scope(scope)?;
    let config_path = state
        .git
        .config_path(&scope, &cwd)?
        .ok_or_else(|| format!("Could not resolve {scope} git config path"))?;

    #[cfg(windows)]
    {
        std::process::Command::new("notepad")
            .arg(&config_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    {
        let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vi".into());
        std::process::Command::new(editor)
            .arg(&config_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
