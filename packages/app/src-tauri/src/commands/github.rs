use reqwest::blocking::Client;
use serde::Deserialize;
use tauri::State;

use crate::AppState;

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
    let client = Client::new();
    let mut request = client
        .get(format!(
            "https://api.github.com/repos/{owner}/{repo}/pulls?state=open"
        ))
        .header("User-Agent", "MyGit-Desktop")
        .header("Accept", "application/vnd.github+json");

    if let Some(token) = token {
        request = request.header("Authorization", format!("Bearer {token}"));
    }

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
