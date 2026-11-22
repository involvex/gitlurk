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
    #[serde(rename = "type")]
    subject_type: Option<String>,
}

#[derive(Deserialize)]
struct NotificationOwner {
    avatar_url: Option<String>,
    #[allow(dead_code)]
    login: Option<String>,
}

#[derive(Deserialize)]
struct NotificationRepo {
    full_name: String,
    html_url: String,
    owner: Option<NotificationOwner>,
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
            let subject_type = n.subject.subject_type.as_deref().unwrap_or("");
            let html_url = notification_html_url(
                subject_type,
                &n.subject.title,
                n.subject.url.as_deref(),
                &n.repository.full_name,
                &n.repository.html_url,
            );
            let avatar_url = n
                .repository
                .owner
                .as_ref()
                .and_then(|o| o.avatar_url.clone())
                .unwrap_or_default();
            serde_json::json!({
                "id": n.id,
                "title": n.subject.title,
                "reason": n.reason,
                "unread": n.unread,
                "updatedAt": n.updated_at,
                "repo": n.repository.full_name,
                "url": html_url,
                "subjectType": subject_type,
                "avatarUrl": avatar_url,
            })
        })
        .collect();

    Ok(serde_json::json!({
        "notifications": notifications,
        "unreadCount": unread_count,
    }))
}

fn notification_html_url(
    subject_type: &str,
    title: &str,
    subject_url: Option<&str>,
    full_name: &str,
    repo_html_url: &str,
) -> String {
    if subject_type.eq_ignore_ascii_case("Release") {
        let tag = urlencoding_lite(title);
        return format!("https://github.com/{full_name}/releases/tag/{tag}");
    }

    if let Some(api_url) = subject_url {
        if let Some(mut html) = api_url_to_html(api_url) {
            if subject_type.eq_ignore_ascii_case("PullRequest") {
                html = html.replacen("/pulls/", "/pull/", 1);
            }
            return html;
        }
    }

    repo_html_url.to_string()
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
    avatar_url: Option<String>,
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
                "avatarUrl": e.actor.avatar_url.unwrap_or_default(),
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
struct SearchRepoOwner {
    avatar_url: Option<String>,
    #[allow(dead_code)]
    login: Option<String>,
}

#[derive(Deserialize)]
struct SearchRepoItem {
    full_name: String,
    html_url: String,
    description: Option<String>,
    stargazers_count: u64,
    language: Option<String>,
    forks_count: u64,
    owner: Option<SearchRepoOwner>,
    clone_url: Option<String>,
    private: Option<bool>,
    updated_at: Option<String>,
}

#[derive(Deserialize)]
struct SearchReposResponse {
    items: Vec<SearchRepoItem>,
}

fn map_repo_card(r: SearchRepoItem) -> serde_json::Value {
    serde_json::json!({
        "fullName": r.full_name,
        "url": r.html_url,
        "description": r.description.unwrap_or_default(),
        "stars": r.stargazers_count,
        "forks": r.forks_count,
        "language": r.language.unwrap_or_default(),
        "avatarUrl": r.owner.and_then(|o| o.avatar_url).unwrap_or_default(),
        "cloneUrl": r.clone_url.unwrap_or_default(),
        "private": r.private.unwrap_or(false),
        "updatedAt": r.updated_at.unwrap_or_default(),
    })
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
    let repos: Vec<serde_json::Value> = data.items.into_iter().map(map_repo_card).collect();

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
    let repos: Vec<serde_json::Value> = data.items.into_iter().map(map_repo_card).collect();

    Ok(serde_json::json!({ "repos": repos }))
}

#[derive(Deserialize)]
struct MyRepoItem {
    full_name: String,
    html_url: String,
    description: Option<String>,
    stargazers_count: u64,
    language: Option<String>,
    forks_count: u64,
    clone_url: Option<String>,
    private: Option<bool>,
    updated_at: Option<String>,
    owner: Option<SearchRepoOwner>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_list_my_repos(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let token = require_token(&state)?;
    let client = github_client();
    let request = auth_headers(
        client.get(
            "https://api.github.com/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator,organization_member",
        ),
        Some(&token),
    );

    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub my repos error: {}", response.status()));
    }

    let items: Vec<MyRepoItem> = response.json().map_err(|e| e.to_string())?;
    let repos: Vec<serde_json::Value> = items
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "fullName": r.full_name,
                "url": r.html_url,
                "description": r.description.unwrap_or_default(),
                "stars": r.stargazers_count,
                "forks": r.forks_count,
                "language": r.language.unwrap_or_default(),
                "avatarUrl": r.owner.and_then(|o| o.avatar_url).unwrap_or_default(),
                "cloneUrl": r.clone_url.unwrap_or_default(),
                "private": r.private.unwrap_or(false),
                "updatedAt": r.updated_at.unwrap_or_default(),
            })
        })
        .collect();

    Ok(serde_json::json!({ "repos": repos }))
}

#[derive(Deserialize)]
struct WorkflowRunItem {
    id: u64,
    name: Option<String>,
    status: String,
    conclusion: Option<String>,
    html_url: String,
    created_at: String,
    #[serde(default)]
    display_title: Option<String>,
    #[serde(default)]
    head_sha: Option<String>,
    #[serde(default)]
    head_branch: Option<String>,
}

#[derive(Deserialize)]
struct WorkflowRunsResponse {
    workflow_runs: Vec<WorkflowRunItem>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_list_runs(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    limit: Option<u32>,
) -> Result<serde_json::Value, String> {
    let token = state.auth_token.lock().unwrap().clone();
    let per_page = limit.unwrap_or(5).clamp(1, 30);
    let client = github_client();
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/repos/{owner}/{repo}/actions/runs?per_page={per_page}"
        )),
        token.as_deref(),
    );

    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub Actions API error: {}", response.status()));
    }

    let body: WorkflowRunsResponse = response.json().map_err(|e| e.to_string())?;
    let runs: Vec<serde_json::Value> = body
        .workflow_runs
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id.to_string(),
                "status": r.status,
                "conclusion": r.conclusion,
                "workflow": r.name.unwrap_or_else(|| "workflow".into()),
                "title": r.display_title.unwrap_or_default(),
                "createdAt": r.created_at,
                "url": r.html_url,
                "headSha": r.head_sha.unwrap_or_default(),
                "headBranch": r.head_branch.unwrap_or_default(),
            })
        })
        .collect();

    Ok(serde_json::json!({ "runs": runs }))
}

#[derive(Deserialize)]
struct CreatedPullRequest {
    number: u64,
    title: String,
    html_url: String,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_create_pr(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    title: String,
    body: Option<String>,
    head: String,
    base: String,
    draft: Option<bool>,
) -> Result<serde_json::Value, String> {
    let token = require_token(&state)?;
    let client = github_client();
    let payload = serde_json::json!({
        "title": title,
        "body": body.unwrap_or_default(),
        "head": head,
        "base": base,
        "draft": draft.unwrap_or(false),
    });
    let request = auth_headers(
        client
            .post(format!("https://api.github.com/repos/{owner}/{repo}/pulls"))
            .json(&payload),
        Some(&token),
    );

    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().unwrap_or_default();
        return Err(format!("GitHub create PR error: {status} {detail}"));
    }

    let pr: CreatedPullRequest = response.json().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "number": pr.number,
        "title": pr.title,
        "url": pr.html_url,
    }))
}

#[derive(Deserialize)]
struct PrLabel {
    name: String,
    color: String,
}

#[derive(Deserialize)]
struct PrRepoOwner {
    login: String,
}

#[derive(Deserialize)]
struct PrRepoRef {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    clone_url: Option<String>,
    #[serde(default)]
    fork: Option<bool>,
    #[serde(default)]
    owner: Option<PrRepoOwner>,
}

#[derive(Deserialize)]
struct PrBranchRef {
    #[serde(rename = "ref")]
    git_ref: String,
    sha: String,
    #[serde(default)]
    label: Option<String>,
    #[serde(default)]
    repo: Option<PrRepoRef>,
    #[serde(default)]
    user: Option<PullRequestUser>,
}

#[derive(Deserialize)]
struct PullRequestDetail {
    number: u64,
    title: String,
    #[serde(default)]
    body: Option<String>,
    html_url: String,
    state: String,
    #[serde(default)]
    draft: Option<bool>,
    user: PullRequestUser,
    base: PrBranchRef,
    head: PrBranchRef,
    created_at: String,
    updated_at: String,
    #[serde(default)]
    mergeable: Option<bool>,
    #[serde(default)]
    labels: Vec<PrLabel>,
    #[serde(default)]
    requested_reviewers: Vec<PullRequestUser>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_get_pr(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u64,
) -> Result<serde_json::Value, String> {
    let token = require_token(&state)?;
    let client = github_client();
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/repos/{owner}/{repo}/pulls/{number}"
        )),
        Some(&token),
    );
    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub get PR error: {}", response.status()));
    }
    let pr: PullRequestDetail = response.json().map_err(|e| e.to_string())?;
    let head_owner = pr
        .head
        .repo
        .as_ref()
        .and_then(|r| r.owner.as_ref())
        .map(|o| o.login.clone())
        .or_else(|| pr.head.user.as_ref().map(|u| u.login.clone()))
        .unwrap_or_else(|| owner.clone());
    let head_repo_name = pr
        .head
        .repo
        .as_ref()
        .and_then(|r| r.name.clone())
        .unwrap_or_else(|| repo.clone());
    let head_clone_url = pr
        .head
        .repo
        .as_ref()
        .and_then(|r| r.clone_url.clone())
        .unwrap_or_else(|| format!("https://github.com/{head_owner}/{head_repo_name}.git"));
    let head_is_fork = pr
        .head
        .repo
        .as_ref()
        .and_then(|r| r.fork)
        .unwrap_or(false)
        || head_owner != owner
        || head_repo_name != repo;

    Ok(serde_json::json!({
        "number": pr.number,
        "title": pr.title,
        "body": pr.body.unwrap_or_default(),
        "url": pr.html_url,
        "state": pr.state,
        "draft": pr.draft.unwrap_or(false),
        "user": pr.user.login,
        "base": {
            "ref": pr.base.git_ref,
            "sha": pr.base.sha,
            "label": pr.base.label.unwrap_or_default(),
        },
        "head": {
            "ref": pr.head.git_ref,
            "sha": pr.head.sha,
            "label": pr.head.label.unwrap_or_default(),
            "owner": head_owner,
            "repo": head_repo_name,
            "cloneUrl": head_clone_url,
            "isFork": head_is_fork,
        },
        "createdAt": pr.created_at,
        "updatedAt": pr.updated_at,
        "mergeable": pr.mergeable,
        "labels": pr.labels.into_iter().map(|l| serde_json::json!({
            "name": l.name,
            "color": l.color,
        })).collect::<Vec<_>>(),
        "requestedReviewers": pr.requested_reviewers.into_iter().map(|u| u.login).collect::<Vec<_>>(),
    }))
}

#[derive(Deserialize)]
struct PrFileItem {
    filename: String,
    status: String,
    additions: u64,
    deletions: u64,
    changes: u64,
    #[serde(default)]
    patch: Option<String>,
    #[serde(default)]
    previous_filename: Option<String>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_pr_files(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u64,
) -> Result<serde_json::Value, String> {
    let token = require_token(&state)?;
    let client = github_client();
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/repos/{owner}/{repo}/pulls/{number}/files?per_page=100"
        )),
        Some(&token),
    );
    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub PR files error: {}", response.status()));
    }
    let items: Vec<PrFileItem> = response.json().map_err(|e| e.to_string())?;
    let files: Vec<serde_json::Value> = items
        .into_iter()
        .map(|f| {
            let mut obj = serde_json::json!({
                "filename": f.filename,
                "status": f.status,
                "additions": f.additions,
                "deletions": f.deletions,
                "changes": f.changes,
            });
            if let Some(patch) = f.patch {
                obj.as_object_mut()
                    .unwrap()
                    .insert("patch".into(), serde_json::Value::String(patch));
            }
            if let Some(prev) = f.previous_filename {
                obj.as_object_mut().unwrap().insert(
                    "previousFilename".into(),
                    serde_json::Value::String(prev),
                );
            }
            obj
        })
        .collect();
    Ok(serde_json::json!({ "files": files }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_pr_diff(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u64,
) -> Result<serde_json::Value, String> {
    let token = require_token(&state)?;
    let client = github_client();
    let request = client
        .get(format!(
            "https://api.github.com/repos/{owner}/{repo}/pulls/{number}"
        ))
        .header("User-Agent", "GitLurk-Desktop")
        .header("Accept", "application/vnd.github.v3.diff")
        .header("Authorization", format!("Bearer {token}"));
    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub PR diff error: {}", response.status()));
    }
    let diff = response.text().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "diff": diff }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_request_reviewers(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u64,
    reviewers: Vec<String>,
) -> Result<(), String> {
    if reviewers.is_empty() {
        return Ok(());
    }
    let token = require_token(&state)?;
    let client = github_client();
    let payload = serde_json::json!({ "reviewers": reviewers });
    let request = auth_headers(
        client
            .post(format!(
                "https://api.github.com/repos/{owner}/{repo}/pulls/{number}/requested_reviewers"
            ))
            .json(&payload),
        Some(&token),
    );
    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().unwrap_or_default();
        return Err(format!("Request reviewers failed: {status} {detail}"));
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_set_pr_labels(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u64,
    labels: Vec<String>,
) -> Result<(), String> {
    if labels.is_empty() {
        return Ok(());
    }
    let token = require_token(&state)?;
    let client = github_client();
    let payload = serde_json::json!({ "labels": labels });
    let request = auth_headers(
        client
            .post(format!(
                "https://api.github.com/repos/{owner}/{repo}/issues/{number}/labels"
            ))
            .json(&payload),
        Some(&token),
    );
    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().unwrap_or_default();
        return Err(format!("Set PR labels failed: {status} {detail}"));
    }
    Ok(())
}

#[derive(Deserialize)]
struct ReviewItem {
    id: u64,
    user: Option<PullRequestUser>,
    state: String,
    #[serde(default)]
    body: Option<String>,
    #[serde(default)]
    submitted_at: Option<String>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_list_reviews(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u64,
) -> Result<serde_json::Value, String> {
    let token = require_token(&state)?;
    let client = github_client();
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/repos/{owner}/{repo}/pulls/{number}/reviews"
        )),
        Some(&token),
    );
    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub list reviews error: {}", response.status()));
    }
    let items: Vec<ReviewItem> = response.json().map_err(|e| e.to_string())?;
    let reviews: Vec<serde_json::Value> = items
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id,
                "user": r.user.map(|u| u.login).unwrap_or_else(|| "unknown".into()),
                "state": r.state,
                "body": r.body.unwrap_or_default(),
                "submittedAt": r.submitted_at,
            })
        })
        .collect();
    Ok(serde_json::json!({ "reviews": reviews }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_submit_review(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u64,
    body: Option<String>,
    event: String,
) -> Result<serde_json::Value, String> {
    let event_upper = event.to_uppercase();
    if !matches!(
        event_upper.as_str(),
        "APPROVE" | "REQUEST_CHANGES" | "COMMENT"
    ) {
        return Err("Review event must be APPROVE, REQUEST_CHANGES, or COMMENT".into());
    }
    let token = require_token(&state)?;
    let client = github_client();
    let mut payload = serde_json::json!({ "event": event_upper });
    if let Some(body) = body {
        if !body.trim().is_empty() {
            payload
                .as_object_mut()
                .unwrap()
                .insert("body".into(), serde_json::Value::String(body));
        }
    }
    // REQUEST_CHANGES and COMMENT require a body per GitHub API.
    if matches!(event.to_uppercase().as_str(), "REQUEST_CHANGES" | "COMMENT")
        && payload
            .get("body")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().is_empty())
            .unwrap_or(true)
    {
        return Err("A review body is required for Comment and Request changes".into());
    }
    let request = auth_headers(
        client
            .post(format!(
                "https://api.github.com/repos/{owner}/{repo}/pulls/{number}/reviews"
            ))
            .json(&payload),
        Some(&token),
    );
    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().unwrap_or_default();
        return Err(format!("Submit review failed: {status} {detail}"));
    }
    let review: ReviewItem = response.json().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "id": review.id,
        "state": review.state,
        "body": review.body.unwrap_or_default(),
    }))
}

#[derive(Deserialize)]
struct LabelItem {
    name: String,
    color: String,
    #[serde(default)]
    description: Option<String>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn github_list_labels(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
) -> Result<serde_json::Value, String> {
    let token = require_token(&state)?;
    let client = github_client();
    let request = auth_headers(
        client.get(format!(
            "https://api.github.com/repos/{owner}/{repo}/labels?per_page=100"
        )),
        Some(&token),
    );
    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub list labels error: {}", response.status()));
    }
    let items: Vec<LabelItem> = response.json().map_err(|e| e.to_string())?;
    let labels: Vec<serde_json::Value> = items
        .into_iter()
        .map(|l| {
            serde_json::json!({
                "name": l.name,
                "color": l.color,
                "description": l.description.unwrap_or_default(),
            })
        })
        .collect();
    Ok(serde_json::json!({ "labels": labels }))
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
