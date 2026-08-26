use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::{validate_repo_path, AppState, Settings};

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
#[serde(rename_all = "camelCase")]
pub struct GhStepItem {
    pub name: String,
    pub number: i64,
    pub status: String,
    pub conclusion: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GhJobItem {
    pub name: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub url: Option<String>,
    pub steps: Vec<GhStepItem>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GhRunDetailResponse {
    pub id: Option<String>,
    pub status: Option<String>,
    pub conclusion: Option<String>,
    pub workflow: Option<String>,
    pub display_title: Option<String>,
    pub url: Option<String>,
    pub jobs: Vec<GhJobItem>,
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

fn parse_gh_run_detail(stdout: &[u8]) -> GhRunDetailResponse {
    let parsed: serde_json::Value = serde_json::from_slice(stdout).unwrap_or_default();
    let steps_of = |job: &serde_json::Value| -> Vec<GhStepItem> {
        job.get("steps")
            .and_then(|v| v.as_array())
            .map(|steps| {
                steps
                    .iter()
                    .map(|step| GhStepItem {
                        name: step
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string(),
                        number: step
                            .get("number")
                            .and_then(|v| v.as_i64())
                            .unwrap_or_default(),
                        status: step
                            .get("status")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        conclusion: step
                            .get("conclusion")
                            .and_then(|v| v.as_str())
                            .map(str::to_string),
                        started_at: step
                            .get("startedAt")
                            .and_then(|v| v.as_str())
                            .map(str::to_string),
                        completed_at: step
                            .get("completedAt")
                            .and_then(|v| v.as_str())
                            .map(str::to_string),
                    })
                    .collect()
            })
            .unwrap_or_default()
    };
    let jobs = parsed
        .get("jobs")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .map(|job| GhJobItem {
                    name: job
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    status: job
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    conclusion: job
                        .get("conclusion")
                        .and_then(|v| v.as_str())
                        .map(str::to_string),
                    started_at: job
                        .get("startedAt")
                        .and_then(|v| v.as_str())
                        .map(str::to_string),
                    completed_at: job
                        .get("completedAt")
                        .and_then(|v| v.as_str())
                        .map(str::to_string),
                    url: job.get("url").and_then(|v| v.as_str()).map(str::to_string),
                    steps: steps_of(job),
                })
                .collect()
        })
        .unwrap_or_default();
    GhRunDetailResponse {
        id: parsed
            .get("databaseId")
            .map(|v| v.to_string().trim_matches('"').to_string()),
        status: parsed
            .get("status")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        conclusion: parsed
            .get("conclusion")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        workflow: parsed
            .get("workflowName")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        display_title: parsed
            .get("displayTitle")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        url: parsed.get("url").and_then(|v| v.as_str()).map(str::to_string),
        jobs,
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_run_view(
    state: State<'_, AppState>,
    run_id: Option<String>,
    repo: Option<String>,
    path: Option<String>,
) -> Result<GhRunDetailResponse, String> {
    let cwd = repo_cwd(path)?;
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let mut cmd = Command::new(&gh);
        cmd.arg("run").arg("view");
        if let Some(id) = &run_id {
            cmd.arg(id);
        }
        if let Some(r) = &repo {
            cmd.arg("--repo").arg(r);
        }
        cmd.args([
            "--json",
            "databaseId,status,conclusion,workflowName,displayTitle,url,jobs",
        ])
        .current_dir(&cwd);
        let output = cmd.output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(parse_gh_run_detail(&output.stdout))
    })
    .await
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dev_gh_run_rerun(
    state: State<'_, AppState>,
    run_id: String,
    repo: Option<String>,
    path: Option<String>,
) -> Result<(), String> {
    let cwd = repo_cwd(path)?;
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let mut cmd = Command::new(&gh);
        cmd.arg("run").arg("rerun").arg(&run_id).arg("--failed");
        if let Some(r) = &repo {
            cmd.arg("--repo").arg(r);
        }
        cmd.current_dir(&cwd);
        let output = cmd.output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    })
    .await
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
pub async fn dev_gh_repo_sync(
    state: State<'_, AppState>,
    repo: Option<String>,
    path: Option<String>,
) -> Result<serde_json::Value, String> {
    let cwd = repo_cwd(path)?;
    let gh = state.gh.resolve_gh()?;
    run_blocking(move || {
        let mut cmd = Command::new(&gh);
        cmd.arg("repo").arg("sync").current_dir(&cwd);
        if let Some(r) = repo.as_deref() {
            cmd.args(["-r", r]);
        }
        let output = cmd.output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if stderr.contains("no upstream") || stderr.contains("not a fork") {
                return Err(
                    "This repository has no upstream configured (is it a fork?)".into(),
                );
            }
            return Err(stderr);
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

fn read_settings(state: &AppState) -> Settings {
    let file = state.settings_file();
    if !file.exists() {
        return Settings::default();
    }
    std::fs::read_to_string(file)
        .ok()
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticsExportResponse {
    pub path: String,
}

/// Writes a sanitized diagnostics bundle (versions, auth summary, settings
/// subset). Contains no credentials, keyring material, or API keys.
#[tauri::command(rename_all = "camelCase")]
pub async fn dev_export_diagnostics(
    app: AppHandle,
    state: State<'_, AppState>,
    dir: String,
) -> Result<DiagnosticsExportResponse, String> {
    let out_dir = PathBuf::from(dir);
    if !out_dir.is_dir() {
        return Err("Directory does not exist".into());
    }

    let version = app.package_info().version.to_string();
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();

    // Sanitized snapshot: preference flags only — no secrets, tokens, or
    // machine-specific paths.
    let settings = {
        let s = read_settings(&state);
        serde_json::json!({
            "theme": s.theme,
            "themePreset": s.theme_preset,
            "aiProvider": s.ai_provider,
            "aiModel": s.ai_model,
            "terminalShell": s.terminal_shell,
            "minimizeToTray": s.minimize_to_tray,
            "backgroundFetchEnabled": s.background_fetch_enabled,
            "backgroundFetchIntervalMin": s.background_fetch_interval_min,
            "desktopNotifications": s.desktop_notifications,
            "notificationSoundEnabled": s.notification_sound_enabled,
            "autoRefreshOnChange": s.auto_refresh_on_change,
        })
    };

    let git = state.git.resolve_git()?;
    let gh_installed = state.gh.is_installed();
    let gh = state.gh.resolve_gh().ok();

    run_blocking(move || {
        let first_line = |out: &std::process::Output| {
            String::from_utf8_lossy(&out.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string()
        };

        let git_version = Command::new(&git)
            .args(["--version"])
            .output()
            .ok()
            .map(|out| first_line(&out))
            .filter(|line| !line.is_empty());

        let gh_version = gh.as_ref().and_then(|gh_path| {
            Command::new(gh_path)
                .args(["--version"])
                .output()
                .ok()
                .map(|out| first_line(&out))
                .filter(|line| !line.is_empty())
        });

        // gh auth status prints account/host info but never raw tokens.
        let (auth_logged_in, auth_summary) = gh.as_ref()
            .and_then(|gh_path| {
                let output = Command::new(gh_path)
                    .args(["auth", "status"])
                    .output()
                    .ok()?;
                let mut text = format!(
                    "{}{}",
                    String::from_utf8_lossy(&output.stdout),
                    String::from_utf8_lossy(&output.stderr)
                );
                text = text.trim().to_string();
                if text.len() > 800 {
                    text = format!("{}…", &text[..800]);
                }
                Some((output.status.success(), text))
            })
            .unwrap_or((false, "gh CLI unavailable".into()));

        let generated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let payload = serde_json::json!({
            "app": {
                "name": "GitLurk Desktop",
                "version": version,
                "os": os,
                "arch": arch,
            },
            "generatedAtUnixSecs": generated_at,
            "tools": {
                "git": git_version,
                "ghInstalled": gh_installed,
                "gh": gh_version,
            },
            "auth": {
                "loggedIn": auth_logged_in,
                "summary": auth_summary,
            },
            "settings": settings,
        });

        let target = out_dir.join(format!("gitlurk-diagnostics-{generated_at}.json"));
        std::fs::write(
            &target,
            serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;

        Ok(DiagnosticsExportResponse {
            path: target.to_string_lossy().into_owned(),
        })
    })
    .await
}
