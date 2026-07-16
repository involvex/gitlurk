
use serde::Serialize;
use tauri::State;

use crate::git_service::GitStatusResult;
use crate::git_service::DiffKind;
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
    recurse_submodules: Option<bool>,
    depth: Option<u32>,
) -> Result<serde_json::Value, String> {
    let target = validate_repo_path(&dir)?;
    state.git.clone_repo(
        &url,
        &target,
        recurse_submodules.unwrap_or(false),
        depth,
    )?;
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

#[tauri::command(rename_all = "camelCase")]
pub fn git_diff(
    state: State<'_, AppState>,
    path: String,
    file: String,
    kind: String,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let diff_kind = DiffKind::from_str(&kind)?;
    let result = state.git.diff_file(&dir, &file, diff_kind)?;
    Ok(serde_json::json!({
        "patch": result.patch,
        "isBinary": result.is_binary,
    }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_restore(
    state: State<'_, AppState>,
    path: String,
    files: Vec<String>,
    staged: Option<bool>,
) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    state
        .git
        .restore_paths(&dir, &files, staged.unwrap_or(false))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_restore_all(
    state: State<'_, AppState>,
    path: String,
    staged: Option<bool>,
) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    state.git.restore_all(&dir, staged.unwrap_or(false))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_clean(
    state: State<'_, AppState>,
    path: String,
    files: Option<Vec<String>>,
) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    state.git.clean_paths(&dir, &files.unwrap_or_default())
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_stash_push(
    state: State<'_, AppState>,
    path: String,
    message: Option<String>,
) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    state
        .git
        .stash_push(&dir, message.as_deref())
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_stash_list(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let entries = state.git.stash_list(&dir)?;
    Ok(serde_json::json!({ "entries": entries }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_stash_pop(
    state: State<'_, AppState>,
    path: String,
    index: Option<usize>,
) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    state.git.stash_pop(&dir, index)
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_stash_drop(
    state: State<'_, AppState>,
    path: String,
    index: usize,
) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    state.git.stash_drop(&dir, index)
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_fetch(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    state.git.fetch(&dir)
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_remote_ahead(
    state: State<'_, AppState>,
    path: String,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let ahead = state.git.remote_ahead_count(&dir)?;
    Ok(serde_json::json!({ "ahead": ahead }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_add(
    state: State<'_, AppState>,
    path: String,
    files: Option<Vec<String>>,
) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    match files {
        Some(list) if !list.is_empty() => state.git.add_paths(&dir, &list),
        _ => state.git.add_all(&dir),
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_reset(
    state: State<'_, AppState>,
    path: String,
    files: Vec<String>,
) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    state.git.reset_paths(&dir, &files)
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_log(
    state: State<'_, AppState>,
    path: String,
    limit: Option<u32>,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let entries = state.git.log(&dir, limit.unwrap_or(50))?;
    Ok(serde_json::json!({ "entries": entries }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_show(
    state: State<'_, AppState>,
    path: String,
    sha: String,
) -> Result<serde_json::Value, String> {
    let dir = validate_repo_path(&path)?;
    let result = state.git.show_commit(&dir, &sha)?;
    Ok(serde_json::json!({
        "patch": result.patch,
        "isBinary": result.is_binary,
    }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn git_apply_cached(
    state: State<'_, AppState>,
    path: String,
    patch: String,
) -> Result<(), String> {
    let dir = validate_repo_path(&path)?;
    state.git.apply_cached_patch(&dir, &patch)
}
