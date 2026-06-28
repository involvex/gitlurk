use std::path::PathBuf;

use serde::Serialize;
use tauri::State;

use crate::git_service::GitStatusResult;
use crate::{validate_repo_path, AppState};

#[derive(Serialize)]
pub struct GitStatusResponse {
    pub staged: Vec<String>,
    pub unstaged: Vec<String>,
    pub untracked: Vec<String>,
    pub branch: String,
}

impl From<GitStatusResult> for GitStatusResponse {
    fn from(value: GitStatusResult) -> Self {
        Self {
            staged: value.staged,
            unstaged: value.unstaged,
            untracked: value.untracked,
            branch: value.branch,
        }
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_status(state: State<'_, AppState>, path: String) -> Result<GitStatusResponse, String> {
    let dir = validate_repo_path(&path)?;
    state.git.status(&dir).map(GitStatusResponse::from)
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_clone(
    state: State<'_, AppState>,
    url: String,
    dir: String,
) -> Result<serde_json::Value, String> {
    let target = validate_repo_path(&dir)?;
    state.git.clone_repo(&url, &target)?;
    Ok(serde_json::json!({ "path": target.to_string_lossy() }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_commit(
    state: State<'_, AppState>,
    path: String,
    message: String,
    files: Option<Vec<String>>,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let hash = state.git.commit(&dir, &message, files)?;
    Ok(serde_json::json!({ "hash": hash }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_pull(state: State<'_, AppState>, path: String) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let summary = state.git.pull(&dir)?;
    Ok(serde_json::json!({ "summary": summary }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_push(state: State<'_, AppState>, path: String) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let summary = state.git.push(&dir)?;
    Ok(serde_json::json!({ "summary": summary }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_branch_list(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let (branches, current) = state.git.branch_list(&dir)?;
    Ok(serde_json::json!({ "branches": branches, "current": current }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_branch_create(
    state: State<'_, AppState>,
    path: String,
    name: String,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    state.git.branch_create(&dir, &name)?;
    Ok(serde_json::json!({ "name": name }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_branch_checkout(
    state: State<'_, AppState>,
    path: String,
    name: String,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    state.git.branch_checkout(&dir, &name)?;
    Ok(serde_json::json!({ "name": name }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_is_repo(state: State<'_, AppState>, path: String) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let is_repo = state.git.is_repo(&dir)?;
    Ok(serde_json::json!({ "isRepo": is_repo }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_get_remote_origin(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let url = state.git.remote_origin(&dir)?;
    Ok(serde_json::json!({ "url": url }))
}
