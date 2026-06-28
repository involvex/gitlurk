use tauri::{AppHandle, Emitter};

#[derive(serde::Serialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum UrlAction {
    OpenRepo {
        url: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        branch: Option<String>,
    },
    OpenLocalRepo {
        path: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        branch: Option<String>,
    },
    Oauth {
        code: String,
        state: String,
    },
    Clone {
        url: String,
    },
    Unknown {
        raw: String,
    },
}

const ALLOWED_HOSTS: &[&str] = &["github.com", "www.github.com"];

pub fn parse_app_url(raw: &str) -> UrlAction {
    let parsed = match url::Url::parse(raw) {
        Ok(url) => url,
        Err(_) => return UrlAction::Unknown { raw: raw.to_string() },
    };

    if parsed.scheme() != "mygit" {
        return UrlAction::Unknown { raw: raw.to_string() };
    }

    match parsed.host_str() {
        Some("oauth") => UrlAction::Oauth {
            code: parsed
                .query_pairs()
                .find(|(k, _)| k == "code")
                .map(|(_, v)| v.to_string())
                .unwrap_or_default(),
            state: parsed
                .query_pairs()
                .find(|(k, _)| k == "state")
                .map(|(_, v)| v.to_string())
                .unwrap_or_default(),
        },
        Some("openRepo") => {
            let repo_url = parsed.path().trim_start_matches('/').to_string();
            let branch = parsed
                .query_pairs()
                .find(|(k, _)| k == "branch")
                .map(|(_, v)| v.to_string());

            if !is_allowed_github_url(&repo_url) {
                return UrlAction::Unknown { raw: raw.to_string() };
            }

            UrlAction::OpenRepo {
                url: repo_url.split('?').next().unwrap_or(&repo_url).to_string(),
                branch,
            }
        }
        Some("openLocalRepo") => {
            let path = parsed.path().trim_start_matches('/').to_string();
            let branch = parsed
                .query_pairs()
                .find(|(k, _)| k == "branch")
                .map(|(_, v)| v.to_string());
            UrlAction::OpenLocalRepo { path, branch }
        }
        Some("cloneRepo") => {
            let repo_url = parsed.path().trim_start_matches('/').to_string();
            if !is_allowed_github_url(&repo_url) {
                return UrlAction::Unknown { raw: raw.to_string() };
            }
            UrlAction::Clone { url: repo_url }
        }
        _ => UrlAction::Unknown { raw: raw.to_string() },
    }
}

fn is_allowed_github_url(repo_url: &str) -> bool {
    match url::Url::parse(repo_url) {
        Ok(url) => ALLOWED_HOSTS.contains(&url.host_str().unwrap_or("")),
        Err(_) => false,
    }
}

pub fn handle_deep_link(app: &AppHandle, raw: &str) {
    let action = parse_app_url(raw);
    let _ = app.emit("url-action", action);
}
