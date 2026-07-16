use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::{validate_repo_path, AppState};

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

async fn run_blocking<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("Background task failed: {e}"))?
}

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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GhRunOutputEvent {
    data: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GhRunDoneEvent {
    exit_code: i32,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_version(state: State<'_, AppState>) -> Result<GhVersionResponse, String> {
    let installed = state.gh.is_installed();
    if !installed {
        return Ok(GhVersionResponse {
            installed: false,
            version: None,
        });
    }
    let gh = match state.gh.resolve_gh() {
        Ok(p) => p,
        Err(_) => {
            return Ok(GhVersionResponse {
                installed: false,
                version: None,
            });
        }
    };
    let version = run_blocking(move || {
        let output = Command::new(&gh)
            .args(["--version"])
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Ok(None);
        }
        let line = String::from_utf8_lossy(&output.stdout)
            .lines()
            .next()
            .unwrap_or("")
            .trim()
            .to_string();
        Ok(if line.is_empty() { None } else { Some(line) })
    })
    .await
    .ok()
    .flatten();

    Ok(GhVersionResponse {
        installed: true,
        version,
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_auth_status(
    state: State<'_, AppState>,
) -> Result<GhAuthStatusResponse, String> {
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        let gh2 = gh.clone();
        std::thread::spawn(move || {
            let result = Command::new(&gh2)
                .args(["auth", "status"])
                .output()
                .map_err(|e| e.to_string());
            let _ = tx.send(result);
        });
        match rx.recv_timeout(Duration::from_secs(5)) {
            Ok(Ok(output)) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                let summary = format!("{stdout}{stderr}").trim().to_string();
                let summary = if summary.len() > 800 {
                    format!("{}…", &summary[..800])
                } else {
                    summary
                };
                Ok(GhAuthStatusResponse {
                    logged_in: output.status.success(),
                    summary,
                })
            }
            Ok(Err(e)) => Err(e),
            Err(_) => Ok(GhAuthStatusResponse {
                logged_in: false,
                summary: "Timed out waiting for gh auth status (5s)".into(),
            }),
        }
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_run_list(
    state: State<'_, AppState>,
    repo: Option<String>,
    limit: Option<u32>,
    path: Option<String>,
) -> Result<GhRunListResponse, String> {
    let cwd = repo_cwd(path)?;
    let gh = state.gh.resolve_gh()?;
    let limit_str = limit.unwrap_or(10).to_string();
    run_blocking(move || {
        let mut cmd = Command::new(&gh);
        cmd.args([
            "run",
            "list",
            "--limit",
            &limit_str,
            "--json",
            "databaseId,status,workflowName,createdAt,url",
        ])
        .current_dir(&cwd);
        if let Some(r) = repo.as_deref() {
            cmd.args(["--repo", r]);
        }
        let output = cmd.output().map_err(|e| e.to_string())?;
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
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_run_watch(
    app: AppHandle,
    state: State<'_, AppState>,
    run_id: Option<String>,
    repo: Option<String>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let gh = state.gh.resolve_gh()?;

    {
        let mut watch = state.gh_watch.lock().unwrap();
        if let Some(mut child) = watch.take() {
            let _ = child.kill();
        }
    }

    let mut cmd = Command::new(&gh);
    cmd.arg("run").arg("watch");
    if let Some(id) = &run_id {
        cmd.arg(id);
    }
    if let Some(r) = &repo {
        cmd.arg("--repo").arg(r);
    }
    cmd.current_dir(&cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start gh run watch: {e}"))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    *state.gh_watch.lock().unwrap() = Some(child);

    let app_out = app.clone();
    if let Some(out) = stdout {
        std::thread::spawn(move || {
            let reader = BufReader::new(out);
            for line in reader.lines().flatten() {
                let _ = app_out.emit(
                    "dev:gh-run-output",
                    GhRunOutputEvent {
                        data: format!("{line}\n"),
                    },
                );
            }
        });
    }

    let app_err = app.clone();
    if let Some(err) = stderr {
        std::thread::spawn(move || {
            let reader = BufReader::new(err);
            for line in reader.lines().flatten() {
                let _ = app_err.emit(
                    "dev:gh-run-output",
                    GhRunOutputEvent {
                        data: format!("{line}\n"),
                    },
                );
            }
        });
    }

    let app_done = app.clone();
    let watch_slot = Arc::clone(&state.gh_watch);
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(200));
        let mut slot = watch_slot.lock().unwrap();
        let Some(child) = slot.as_mut() else {
            let _ = app_done.emit("dev:gh-run-done", GhRunDoneEvent { exit_code: -1 });
            break;
        };
        match child.try_wait() {
            Ok(Some(status)) => {
                let code = status.code().unwrap_or(1);
                let _ = slot.take();
                let _ = app_done.emit("dev:gh-run-done", GhRunDoneEvent { exit_code: code });
                break;
            }
            Ok(None) => {}
            Err(_) => {
                let _ = slot.take();
                let _ = app_done.emit("dev:gh-run-done", GhRunDoneEvent { exit_code: 1 });
                break;
            }
        }
    });

    Ok(serde_json::json!({ "started": true }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn dev_gh_run_watch_stop(state: State<'_, AppState>) -> Result<(), String> {
    let mut watch = state.gh_watch.lock().unwrap();
    if let Some(mut child) = watch.take() {
        let _ = child.kill();
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_repo_fork(
    state: State<'_, AppState>,
    repo: Option<String>,
    clone: Option<bool>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let mut cmd = Command::new(&gh);
        cmd.arg("repo").arg("fork").current_dir(&cwd);
        if let Some(r) = repo.as_deref() {
            cmd.arg(r);
        }
        if clone.unwrap_or(false) {
            cmd.arg("--clone");
        }
        let output = cmd.output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(serde_json::json!({
            "summary": String::from_utf8_lossy(&output.stdout).trim()
        }))
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_release_create(
    state: State<'_, AppState>,
    tag: String,
    title: Option<String>,
    notes: Option<String>,
    draft: Option<bool>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let mut args = vec!["release".into(), "create".into(), tag];
        if let Some(t) = title {
            args.push("--title".into());
            args.push(t);
        }
        if let Some(n) = notes {
            args.push("--notes".into());
            args.push(n);
        }
        if draft.unwrap_or(false) {
            args.push("--draft".into());
        }
        let output = Command::new(&gh)
            .args(&args)
            .current_dir(&cwd)
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(serde_json::json!({
            "url": String::from_utf8_lossy(&output.stdout).trim()
        }))
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_config_list(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let output = Command::new(&gh)
            .args(["config", "list"])
            .output()
            .map_err(|e| e.to_string())?;
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
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_config_get(
    state: State<'_, AppState>,
    key: String,
) -> Result<serde_json::Value, String> {
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let output = Command::new(&gh)
            .args(["config", "get", &key])
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Ok(serde_json::json!({ "value": null }));
        }
        Ok(serde_json::json!({
            "value": String::from_utf8_lossy(&output.stdout).trim()
        }))
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_config_set(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let output = Command::new(&gh)
            .args(["config", "set", &key, &value])
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_alias_list(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let output = Command::new(&gh)
            .args(["alias", "list"])
            .output()
            .map_err(|e| e.to_string())?;
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
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_git_config_list(
    state: State<'_, AppState>,
    scope: Option<String>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let scope = parse_scope(scope)?;
    let git = state.git.resolve_git()?;
    let show_origin = scope == "local";
    run_blocking(move || {
        let scope_flag = format!("--{scope}");
        let mut args = vec!["config", scope_flag.as_str(), "--list"];
        if show_origin {
            args.push("--show-origin");
        }
        let output = Command::new(&git)
            .args(&args)
            .current_dir(&cwd)
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        let entries: Vec<serde_json::Value> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter_map(|line| {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    return None;
                }
                if let Some((origin, rest)) = trimmed.split_once('\t') {
                    if let Some(origin_path) = origin.strip_prefix("file:") {
                        if let Some((key, value)) = rest.split_once('=') {
                            return Some(serde_json::json!({
                                "key": key,
                                "value": value,
                                "origin": origin_path,
                            }));
                        }
                    }
                }
                let (key, value) = trimmed.split_once('=')?;
                Some(serde_json::json!({ "key": key, "value": value }))
            })
            .take(500)
            .collect();
        Ok(serde_json::json!({ "entries": entries }))
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_git_config_get(
    state: State<'_, AppState>,
    key: String,
    scope: Option<String>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let scope = parse_scope(scope)?;
    let git = state.git.resolve_git()?;
    run_blocking(move || {
        let scope_flag = format!("--{scope}");
        let output = Command::new(&git)
            .args(["config", scope_flag.as_str(), &key])
            .current_dir(&cwd)
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Ok(serde_json::json!({ "value": null }));
        }
        let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(serde_json::json!({ "value": if value.is_empty() { serde_json::Value::Null } else { value.into() } }))
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_git_config_set(
    state: State<'_, AppState>,
    key: String,
    value: String,
    scope: Option<String>,
    path: Option<String>,
) -> Result<(), String> {
    let cwd = repo_cwd(path)?;
    let scope = parse_scope(scope)?;
    let git = state.git.resolve_git()?;
    run_blocking(move || {
        let scope_flag = format!("--{scope}");
        let output = Command::new(&git)
            .args(["config", scope_flag.as_str(), &key, &value])
            .current_dir(&cwd)
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_git_config_edit(
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

    run_blocking(move || {
        #[cfg(windows)]
        {
            Command::new("notepad")
                .arg(&config_path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        #[cfg(not(windows))]
        {
            let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vi".into());
            Command::new(editor)
                .arg(&config_path)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    })
    .await
}
