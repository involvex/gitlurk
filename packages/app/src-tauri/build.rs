use std::fs;
use std::path::Path;

fn read_env_file(path: &Path) -> std::collections::HashMap<String, String> {
    let mut values = std::collections::HashMap::new();
    if !path.exists() {
        return values;
    }
    if let Ok(iter) = dotenvy::from_path_iter(path) {
        for item in iter.flatten() {
            values.insert(item.0, item.1);
        }
    }
    values
}

fn pick(map: &std::collections::HashMap<String, String>, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(value) = map.get(*key) {
            if !value.is_empty() {
                return Some(value.clone());
            }
        }
    }
    None
}

fn pick_env(keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Ok(value) = std::env::var(key) {
            if !value.is_empty() {
                return Some(value);
            }
        }
    }
    None
}

fn main() {
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let root_env = manifest_dir.join("../../../.env");
    let oauth_resource = manifest_dir.join("resources/oauth.env");

    // Only watch the source .env — never the generated oauth.env (avoids rebuild loops).
    if root_env.exists() {
        println!("cargo:rerun-if-changed={}", root_env.display());
    }

    let file_values = read_env_file(&root_env);

    let client_id = pick(
        &file_values,
        &[
            "GITHUB_CLIENT_ID",
            "GITLURK_GITHUB_CLIENT_ID",
            "MYGIT_GITHUB_CLIENT_ID",
        ],
    )
    .or_else(|| {
        pick_env(&[
            "GITHUB_CLIENT_ID",
            "GITLURK_GITHUB_CLIENT_ID",
            "MYGIT_GITHUB_CLIENT_ID",
        ])
    })
    .unwrap_or_else(|| "Ov23liPLACEHOLDER".to_string());

    let redirect_uri = pick(
        &file_values,
        &[
            "GITHUB_REDIRECT_URI",
            "GITLURK_GITHUB_REDIRECT_URI",
            "MYGIT_GITHUB_REDIRECT_URI",
        ],
    )
    .or_else(|| {
        pick_env(&[
            "GITHUB_REDIRECT_URI",
            "GITLURK_GITHUB_REDIRECT_URI",
            "MYGIT_GITHUB_REDIRECT_URI",
        ])
    })
    .unwrap_or_else(|| "http://127.0.0.1/callback".to_string());

    if client_id != "Ov23liPLACEHOLDER" {
        println!("cargo:rustc-env=GITLURK_GITHUB_CLIENT_ID={client_id}");
    }

    let bundled_content =
        format!("GITHUB_CLIENT_ID={client_id}\nGITHUB_REDIRECT_URI={redirect_uri}\n");

    fs::create_dir_all(manifest_dir.join("resources")).ok();
    let should_write = fs::read_to_string(&oauth_resource)
        .map(|existing| existing != bundled_content)
        .unwrap_or(true);
    if should_write {
        fs::write(&oauth_resource, &bundled_content).expect("failed to write resources/oauth.env");
    }

    tauri_build::build()
}
