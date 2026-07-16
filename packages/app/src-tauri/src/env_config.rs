use std::path::PathBuf;

/// Loads `.env` files in order; later files override earlier values.
pub fn load_env_files(extra_paths: &[PathBuf]) {
    let mut paths = Vec::new();

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    paths.push(manifest_dir.join("../../../.env"));
    paths.push(manifest_dir.join("resources/oauth.env"));

    if let Ok(cwd) = std::env::current_dir() {
        paths.push(cwd.join(".env"));
    }

    paths.extend(extra_paths.iter().cloned());

    for path in paths {
        if path.exists() {
            let _ = dotenvy::from_path_override(&path);
        }
    }
}

fn env_value(keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Ok(value) = std::env::var(key) {
            if !value.is_empty() {
                return Some(value);
            }
        }
    }
    None
}

pub fn github_client_id() -> String {
    env_value(&[
        "GITHUB_CLIENT_ID",
        "GITLURK_GITHUB_CLIENT_ID",
        "MYGIT_GITHUB_CLIENT_ID",
    ])
    .or_else(|| {
        option_env!("GITLURK_GITHUB_CLIENT_ID")
            .or(option_env!("MYGIT_GITHUB_CLIENT_ID"))
            .filter(|id| !id.is_empty())
            .map(str::to_string)
    })
    .unwrap_or_else(|| "Ov23liPLACEHOLDER".to_string())
}

/// Reserved for future web OAuth callback flows.
#[allow(dead_code)]
pub fn github_redirect_uri() -> String {
    env_value(&[
        "GITHUB_REDIRECT_URI",
        "GITLURK_GITHUB_REDIRECT_URI",
        "MYGIT_GITHUB_REDIRECT_URI",
    ])
    .unwrap_or_else(|| "http://127.0.0.1/callback".to_string())
}

/// Device Flow does not use a client secret; kept for future OAuth flows (backend only).
#[allow(dead_code)]
pub fn github_client_secret() -> Option<String> {
    env_value(&[
        "GITHUB_CLIENT_SECRET",
        "GITLURK_GITHUB_CLIENT_SECRET",
        "MYGIT_GITHUB_CLIENT_SECRET",
    ])
}
