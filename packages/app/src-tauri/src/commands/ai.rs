use keyring::Entry;
use reqwest::blocking::Client;
use serde::Deserialize;
use tauri::State;

use crate::validate_repo_path;
use crate::{AppState, Settings};
use std::fs;
use std::path::Path;

const SERVICE: &str = "gitlurk-desktop";
const OPENCODE_BASE: &str = "https://opencode.ai/zen/v1";
const MAX_DIFF_CHARS: usize = 10_000;

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

fn key_account(provider: &str) -> &'static str {
    match provider {
        "kilo" => "ai-kilo",
        _ => "ai-opencode",
    }
}

fn get_api_key(provider: &str) -> Result<String, String> {
    let entry = Entry::new(SERVICE, key_account(provider)).map_err(|e| e.to_string())?;
    entry
        .get_password()
        .map_err(|_| format!("No API key saved for provider '{provider}'. Add one in Settings."))
}

#[tauri::command(rename_all = "camelCase")]
pub fn ai_set_api_key(provider: String, key: String) -> Result<(), String> {
    let provider = normalize_provider(&provider)?;
    let entry = Entry::new(SERVICE, key_account(provider)).map_err(|e| e.to_string())?;
    if key.trim().is_empty() {
        let _ = entry.delete_credential();
        return Ok(());
    }
    entry.set_password(key.trim()).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn ai_has_api_key(provider: String) -> Result<serde_json::Value, String> {
    let provider = normalize_provider(&provider)?;
    let has = get_api_key(provider).is_ok();
    Ok(serde_json::json!({ "hasKey": has }))
}

fn normalize_provider(provider: &str) -> Result<&'static str, String> {
    match provider {
        "opencode" => Ok("opencode"),
        "kilo" => Ok("kilo"),
        other => Err(format!("Unknown AI provider: {other}")),
    }
}

#[derive(Deserialize)]
struct ModelsResponse {
    data: Vec<ModelItem>,
}

#[derive(Deserialize)]
struct ModelItem {
    id: String,
}

#[tauri::command(rename_all = "camelCase")]
pub fn ai_list_models(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let settings = read_settings(&state);
    let provider = normalize_provider(&settings.ai_provider)?;

    if provider == "opencode" {
        let key = get_api_key(provider).ok();
        let client = Client::new();
        let mut request = client
            .get(format!("{OPENCODE_BASE}/models"))
            .header("User-Agent", "GitLurk-Desktop");
        if let Some(key) = key.as_ref() {
            request = request.header("Authorization", format!("Bearer {key}"));
        }
        let response = request.send().map_err(|e| e.to_string())?;
        if !response.status().is_success() {
            // Fall back to known free default
            return Ok(serde_json::json!({
                "models": ["deepseek-v4-flash-free"],
                "provider": "opencode",
            }));
        }
        let data: ModelsResponse = response.json().map_err(|e| e.to_string())?;
        let mut models: Vec<String> = data
            .data
            .into_iter()
            .map(|m| m.id)
            .filter(|id| id.contains("free") || id.ends_with("-free"))
            .collect();
        if models.is_empty() {
            models.push("deepseek-v4-flash-free".into());
        }
        if !models.iter().any(|m| m == "deepseek-v4-flash-free") {
            models.insert(0, "deepseek-v4-flash-free".into());
        }
        return Ok(serde_json::json!({ "models": models, "provider": "opencode" }));
    }

    // Kilo: expose kilo-auto + current model
    let mut models = vec!["kilo-auto".to_string()];
    if !settings.ai_model.is_empty() && settings.ai_model != "kilo-auto" {
        models.push(settings.ai_model.clone());
    }
    Ok(serde_json::json!({ "models": models, "provider": "kilo" }))
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn ai_generate_commit_message(
    state: State<'_, AppState>,
    path: String,
    style: Option<String>,
) -> Result<serde_json::Value, String> {
    let settings = read_settings(&state);
    let provider = normalize_provider(&settings.ai_provider)?;
    let api_key = get_api_key(provider)?;
    let repo_path = validate_repo_path(&path)?;
    let summary = build_diff_summary(&state, &repo_path)?;

    let style_hint = style.unwrap_or_else(|| "concise conventional commit".into());
    let system = format!(
        "You write git commit messages. Reply with only the commit message text \
         (subject + optional body). Prefer {style_hint} style. No quotes or markdown fences."
    );
    let user = format!(
        "Repository changes:\n\n{summary}\n\nWrite a commit message for these changes."
    );

    let (base_url, model) = if provider == "kilo" {
        let base = if settings.kilo_base_url.trim().is_empty() {
            "https://api.kilo.ai/v1".to_string()
        } else {
            settings.kilo_base_url.trim_end_matches('/').to_string()
        };
        let model = if settings.ai_model.trim().is_empty() {
            "kilo-auto".to_string()
        } else {
            settings.ai_model.clone()
        };
        (base, model)
    } else {
        let model = if settings.ai_model.trim().is_empty() {
            "deepseek-v4-flash-free".to_string()
        } else {
            settings.ai_model.clone()
        };
        (OPENCODE_BASE.to_string(), model)
    };

    let client = Client::new();
    let body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": user },
        ],
        "temperature": 0.3,
        "max_tokens": 400,
    });

    let response = client
        .post(format!("{base_url}/chat/completions"))
        .header("Authorization", format!("Bearer {api_key}"))
        .header("User-Agent", "GitLurk-Desktop")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        return Err(format!("AI API error {status}: {text}"));
    }

    let data: ChatResponse = response.json().map_err(|e| e.to_string())?;
    let message = data
        .choices
        .first()
        .and_then(|c| c.message.content.clone())
        .unwrap_or_default()
        .trim()
        .to_string();

    if message.is_empty() {
        return Err("AI returned an empty commit message".into());
    }

    Ok(serde_json::json!({ "message": message }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn ai_test_connection(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let settings = read_settings(&state);
    let provider = normalize_provider(&settings.ai_provider)?;
    let api_key = get_api_key(provider)?;

    let base_url = if provider == "kilo" {
        settings.kilo_base_url.trim_end_matches('/').to_string()
    } else {
        OPENCODE_BASE.to_string()
    };

    let client = Client::new();
    let response = client
        .get(format!("{base_url}/models"))
        .header("Authorization", format!("Bearer {api_key}"))
        .header("User-Agent", "GitLurk-Desktop")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Connection failed: HTTP {}", response.status()));
    }

    Ok(serde_json::json!({ "ok": true, "provider": provider }))
}

fn build_diff_summary(state: &AppState, repo_path: &Path) -> Result<String, String> {
    let status = state.git.status(repo_path)?;
    let mut parts = Vec::new();
    parts.push(format!(
        "Branch: {}\nStaged: {}\nUnstaged: {}\nUntracked: {}",
        status.branch,
        status.staged.len(),
        status.unstaged.len(),
        status.untracked.len()
    ));

    if !status.staged.is_empty() {
        parts.push(format!("Staged files:\n  - {}", status.staged.join("\n  - ")));
    }
    if !status.unstaged.is_empty() {
        parts.push(format!(
            "Unstaged files:\n  - {}",
            status.unstaged.join("\n  - ")
        ));
    }
    if !status.untracked.is_empty() {
        parts.push(format!(
            "Untracked files:\n  - {}",
            status.untracked.join("\n  - ")
        ));
    }

    let mut remaining = MAX_DIFF_CHARS;
    let mut patch_buf = String::new();

    let file_kinds: Vec<(String, crate::git_service::DiffKind)> = status
        .staged
        .iter()
        .map(|f| (f.clone(), crate::git_service::DiffKind::Staged))
        .chain(
            status
                .unstaged
                .iter()
                .map(|f| (f.clone(), crate::git_service::DiffKind::Unstaged)),
        )
        .chain(
            status
                .untracked
                .iter()
                .take(5)
                .map(|f| (f.clone(), crate::git_service::DiffKind::Untracked)),
        )
        .collect();

    for (file, kind) in file_kinds {
        if remaining == 0 {
            break;
        }
        match state.git.diff_file(repo_path, &file, kind) {
            Ok(diff) if !diff.is_binary && !diff.patch.is_empty() => {
                let chunk = if diff.patch.len() > remaining {
                    &diff.patch[..remaining]
                } else {
                    &diff.patch
                };
                patch_buf.push_str(&format!("\n--- {file} ---\n{chunk}"));
                remaining = remaining.saturating_sub(chunk.len());
            }
            _ => {}
        }
    }

    if !patch_buf.is_empty() {
        parts.push(format!("Diff excerpts:{patch_buf}"));
    }

    Ok(parts.join("\n\n"))
}
