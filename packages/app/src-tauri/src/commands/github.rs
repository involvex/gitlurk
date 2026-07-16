use reqwest::blocking::Client;
use serde::Deserialize;
use tauri::State;

use crate::AppState;

fn github_client() -> Client {
    Client::new()
}

fn auth_headers(
    mut request: reqwest::blocking::RequestBuilder,
    token: Option<&str>,
) -> reqwest::blocking::RequestBuilder {
    request = request
        .header("User-Agent", "GitLurk-Desktop")
        .header("Accept", "application/vnd.github+json");
    if let Some(token) = token {
        request = request.header("Authorization", format!("Bearer {token}"));
    }
    request
}

fn require_token(state: &AppState) -> Result<String, String> {
    state
        .auth_token
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "Sign in to GitHub to use Discover".into())
}

#[derive(Deserialize)]
struct PullRequestItem {
    number: u64,
    title: String,
    html_url: String,
    state: String,
    user: PullRequestUser,
}

#[derive(Deserialize)]
struct PullRequestUser {
    login: String,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_list_prs(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let client = github_client();
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/repos/{owner}/{repo}/pulls?state=open"
        )),
        token.as_deref(),
    );

    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub API error: {}", response.status()));
    }

    let items: Vec<PullRequestItem> = response.json().map_err(|e| e.to_string())?;
    let pulls: Vec<serde_json::Value> = items
        .into_iter()
        .map(|pr| {
            serde_json::json!({
                "number": pr.number,
                "title": pr.title,
                "url": pr.html_url,
                "state": pr.state,
                "user": pr.user.login,
            })
        })
        .collect();

    Ok(serde_json::json!({ "pulls": pulls }))
}

#[derive(Deserialize)]
struct NotificationSubject {
    title: String,
    url: Option<String>,
}

#[derive(Deserialize)]
struct NotificationRepo {
    full_name: String,
    html_url: String,
}

#[derive(Deserialize)]
struct NotificationItem {
    id: String,
    unread: bool,
    reason: String,
    updated_at: String,
    subject: NotificationSubject,
    repository: NotificationRepo,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_list_notifications(
    state: State<'_, AppState>,
    all: Option<bool>,
) -> Result<serde_json::Value, String> {
    let token = require_token(&state)?;
    let client = github_client();
    let all_flag = if all.unwrap_or(false) { "true" } else { "false" };
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/notifications?all={all_flag}&per_page=50"
        )),
        Some(&token),
    );

    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub notifications error: {}", response.status()));
    }

    let items: Vec<NotificationItem> = response.json().map_err(|e| e.to_string())?;
    let unread_count = items.iter().filter(|n| n.unread).count();
    let notifications: Vec<serde_json::Value> = items
        .into_iter()
        .map(|n| {
            let html_url = n
                .subject
                .url
                .as_ref()
                .and_then(|u| api_url_to_html(u))
                .unwrap_or_else(|| n.repository.html_url.clone());
            serde_json::json!({
                "id": n.id,
                "title": n.subject.title,
                "reason": n.reason,
                "unread": n.unread,
                "updatedAt": n.updated_at,
                "repo": n.repository.full_name,
                "url": html_url,
            })
        })
        .collect();

    Ok(serde_json::json!({
        "notifications": notifications,
        "unreadCount": unread_count,
    }))
}

fn api_url_to_html(api_url: &str) -> Option<String> {
    // https://api.github.com/repos/owner/repo/issues/1 -> https://github.com/owner/repo/issues/1
    let stripped = api_url.strip_prefix("https://api.github.com/repos/")?;
    Some(format!("https://github.com/{stripped}"))
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_mark_notification_read(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let token = require_token(&state)?;
    let client = github_client();
    let request = auth_headers(
        client.patch(format!("https://api.github.com/notifications/threads/{id}")),
        Some(&token),
    );
    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() && response.status().as_u16() != 205 {
        return Err(format!(
            "Mark notification read failed: {}",
            response.status()
        ));
    }
    Ok(())
}

#[derive(Deserialize)]
struct FeedActor {
    login: String,
}

#[derive(Deserialize)]
struct FeedRepo {
    name: String,
}

#[derive(Deserialize)]
struct FeedEvent {
    id: String,
    #[serde(rename = "type")]
    event_type: String,
    created_at: String,
    actor: FeedActor,
    repo: FeedRepo,
    payload: serde_json::Value,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_list_feed(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let token = require_token(&state)?;
    let username = state
        .auth_username
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "Could not resolve GitHub username".to_string())?;

    let client = github_client();
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/users/{username}/received_events?per_page=40"
        )),
        Some(&token),
    );

    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub feed error: {}", response.status()));
    }

    let items: Vec<FeedEvent> = response.json().map_err(|e| e.to_string())?;
    let events: Vec<serde_json::Value> = items
        .into_iter()
        .map(|e| {
            let summary = feed_summary(&e.event_type, &e.payload);
            serde_json::json!({
                "id": e.id,
                "type": e.event_type,
                "actor": e.actor.login,
                "repo": e.repo.name,
                "createdAt": e.created_at,
                "summary": summary,
                "url": format!("https://github.com/{}", e.repo.name),
            })
        })
        .collect();

    Ok(serde_json::json!({ "events": events }))
}

fn feed_summary(event_type: &str, payload: &serde_json::Value) -> String {
    match event_type {
        "PushEvent" => {
            let commits = payload
                .get("commits")
                .and_then(|c| c.as_array())
                .map(|a| a.len())
                .unwrap_or(0);
            format!("pushed {commits} commit(s)")
        }
        "WatchEvent" => "starred".into(),
        "ForkEvent" => "forked".into(),
        "IssuesEvent" => {
            let action = payload
                .get("action")
                .and_then(|a| a.as_str())
                .unwrap_or("updated");
            format!("{action} an issue")
        }
        "PullRequestEvent" => {
            let action = payload
                .get("action")
                .and_then(|a| a.as_str())
                .unwrap_or("updated");
            format!("{action} a pull request")
        }
        "CreateEvent" => {
            let ref_type = payload
                .get("ref_type")
                .and_then(|a| a.as_str())
                .unwrap_or("ref");
            format!("created {ref_type}")
        }
        other => other.to_string(),
    }
}

#[derive(Deserialize)]
struct SearchRepoItem {
    full_name: String,
    html_url: String,
    description: Option<String>,
    stargazers_count: u64,
    language: Option<String>,
    forks_count: u64,
}

#[derive(Deserialize)]
struct SearchReposResponse {
    items: Vec<SearchRepoItem>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_search_repos(
    state: State<'_, AppState>,
    query: String,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let q = query.trim();
    if q.is_empty() {
        return Err("Search query is required".into());
    }

    let client = github_client();
    let encoded = urlencoding_lite(q);
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/search/repositories?q={encoded}&sort=stars&order=desc&per_page=30"
        )),
        token.as_deref(),
    );

    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub search error: {}", response.status()));
    }

    let data: SearchReposResponse = response.json().map_err(|e| e.to_string())?;
    let repos: Vec<serde_json::Value> = data
        .items
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "fullName": r.full_name,
                "url": r.html_url,
                "description": r.description.unwrap_or_default(),
                "stars": r.stargazers_count,
                "forks": r.forks_count,
                "language": r.language.unwrap_or_default(),
            })
        })
        .collect();

    Ok(serde_json::json!({ "repos": repos }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_trending(
    state: State<'_, AppState>,
    language: Option<String>,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let since = chrono_like_days_ago(7);
    let mut q = format!("created:>{since}");
    if let Some(lang) = language {
        let lang = lang.trim();
        if !lang.is_empty() && lang != "all" {
            q.push_str(&format!(" language:{lang}"));
        }
    }

    let client = github_client();
    let encoded = urlencoding_lite(&q);
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/search/repositories?q={encoded}&sort=stars&order=desc&per_page=30"
        )),
        token.as_deref(),
    );

    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub trending error: {}", response.status()));
    }

    let data: SearchReposResponse = response.json().map_err(|e| e.to_string())?;
    let repos: Vec<serde_json::Value> = data
        .items
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "fullName": r.full_name,
                "url": r.html_url,
                "description": r.description.unwrap_or_default(),
                "stars": r.stargazers_count,
                "forks": r.forks_count,
                "language": r.language.unwrap_or_default(),
            })
        })
        .collect();

    Ok(serde_json::json!({ "repos": repos }))
}

fn urlencoding_lite(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 2);
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            b' ' => out.push('+'),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

fn chrono_like_days_ago(days: i64) -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let secs = now - days * 86_400;
    let days_since_epoch = secs / 86_400;
    // Approximate Y-M-D from Unix day count via civil_from_days algorithm
    let z = days_since_epoch + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02}")
}
