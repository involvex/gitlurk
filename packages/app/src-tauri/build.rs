use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::Read;
use std::path::Path;

fn read_env_file(path: &Path) -> HashMap<String, String> {
    let mut values = HashMap::new();
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

fn pick(map: &HashMap<String, String>, keys: &[&str]) -> Option<String> {
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
        if let Ok(value) = env::var(key) {
            if !value.is_empty() {
                return Some(value);
            }
        }
    }
    None
}

/// Curated list of gitignore templates from github/gitignore
/// Keys match the filename (without .gitignore) in the repo (case-insensitive)
/// Covers languages, frameworks, IDEs, OS, and tools
const CURATED_TEMPLATES: &[(&str, &str)] = &[
    // Languages
    ("node", "Node"),
    ("python", "Python"),
    ("rust", "Rust"),
    ("go", "Go"),
    ("java", "Java"),
    ("c++", "C++"),
    ("ruby", "Ruby"),
    ("swift", "Swift"),
    ("kotlin", "Kotlin"),
    // Frameworks
    ("vue", "Vue"),
    ("nextjs", "Next.js"),
    ("rails", "Rails"),
    ("laravel", "Laravel"),
    // IDEs
    ("visualstudiocode", "VisualStudioCode"),
    ("jetbrains", "JetBrains"),
    ("vim", "Vim"),
    ("emacs", "Emacs"),
    ("xcode", "Xcode"),
    ("visualstudio", "VisualStudio"),
    // OS
    ("macos", "macOS"),
    ("windows", "Windows"),
    ("linux", "Linux"),
    // Tools
    ("terraform", "Terraform"),
    ("dotnet", ".NET"),
];

// Map from our curated IDs to actual filenames in github/gitignore repo
fn normalize_template_id(id: &str) -> &str {
    match id {
        "c++" => "C++",
        "visualstudiocode" => "VisualStudioCode",
        "dotnet" => "Dotnet",
        _ => id,
    }
}

fn fetch_gitignore_templates(manifest_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let templates_dir = manifest_dir.join("templates");
    fs::create_dir_all(&templates_dir)?;

    // Check if templates already exist (cached)
    let marker_file = templates_dir.join(".gitignore_templates_synced");
    if marker_file.exists() {
        println!("cargo:info=gitignore templates already cached, skipping download");
        return Ok(());
    }

    println!("cargo:info=Downloading gitignore templates from github/gitignore...");

    // Download the main branch zip
    let url = "https://github.com/github/gitignore/archive/refs/heads/main.zip";
    let response = reqwest::blocking::get(url)?;
    let bytes = response.bytes()?;

    // Extract zip in memory
    let cursor = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor)?;

    let mut downloaded = 0;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();

        // Skip directories
        if file.is_dir() {
            continue;
        }

        // Only process .gitignore files anywhere in the repo (root, Global/, community/, etc.)
        if !name.ends_with(".gitignore") {
            continue;
        }

        // Extract template name (remove .gitignore extension and any path prefix)
        let template_name_raw = name
            .split('/')
            .next_back() // Get last component
            .unwrap_or(&name)
            .strip_suffix(".gitignore")
            .unwrap_or(&name);

        let template_name_lower = template_name_raw.to_lowercase();

        // Check if this is one of our curated templates (using normalized IDs for matching)
        let is_curated = CURATED_TEMPLATES.iter().any(|(id, _)| {
            let normalized = normalize_template_id(id).to_lowercase();
            normalized == template_name_lower
        });
        if !is_curated {
            continue;
        }

        // Find the original curated ID for this template
        let curated_id = CURATED_TEMPLATES
            .iter()
            .find(|(id, _)| normalize_template_id(id).to_lowercase() == template_name_lower)
            .map(|(id, _)| *id)
            .unwrap_or("unknown");

        let mut content = String::new();
        file.read_to_string(&mut content)?;

        // Write to templates directory using our curated ID as filename
        let out_path = templates_dir.join(format!("{curated_id}.gitignore"));
        fs::write(&out_path, &content)?;
        downloaded += 1;
        println!("cargo:info=  Downloaded: {curated_id} (from {template_name_raw})");
    }

    if downloaded == 0 {
        println!("cargo:warning=No curated templates downloaded, using fallback");
        return Err("No templates downloaded".into());
    }

    // Write marker file to indicate sync completed
    fs::write(&marker_file, env!("CARGO_PKG_VERSION"))?;

    Ok(())
}

fn generate_templates_rs(manifest_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let templates_dir = manifest_dir.join("templates");
    let output_path = manifest_dir.join("src/gitignore_templates.rs");

    let mut template_entries = Vec::new();

    for (id, display_name) in CURATED_TEMPLATES {
        let file_path = templates_dir.join(format!("{id}.gitignore"));
        if file_path.exists() {
            // Use include_str! with relative path from src/
            let rel_path = format!("../templates/{id}.gitignore");
            template_entries.push(format!(
                r#"    GitignoreTemplate {{
        id: "{id}",
        name: "{display_name}",
        content: include_str!("{rel_path}"),
    }},"#
            ));
        } else {
            println!("cargo:warning=Template file not found: {id}.gitignore");
        }
    }

    let content = format!(
        r#"// @generated by build.rs - do not edit manually
// Source: https://github.com/github/gitignore (MIT license)

#[derive(Debug, Clone)]
pub struct GitignoreTemplate {{
    pub id: &'static str,
    pub name: &'static str,
    pub content: &'static str,
}}

pub const GITIGNORE_TEMPLATES: &[GitignoreTemplate] = &[
{entries}
];

pub fn get_all_templates() -> Vec<GitignoreTemplate> {{
    GITIGNORE_TEMPLATES.to_vec()
}}

pub fn get_template(id: &str) -> Option<&'static GitignoreTemplate> {{
    GITIGNORE_TEMPLATES.iter().find(|t| t.id == id)
}}"#,
        entries = template_entries.join("\n")
    );

    fs::write(&output_path, content)?;
    println!(
        "cargo:info=Generated gitignore_templates.rs with {} templates",
        template_entries.len()
    );

    Ok(())
}

fn main() {
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let root_env = manifest_dir.join("../../../.env");
    let oauth_resource = manifest_dir.join("resources/oauth.env");

    // Only watch the source .env — never the generated oauth.env (avoids rebuild loops).
    if root_env.exists() {
        println!("cargo:rerun-if-changed={}", root_env.display());
    }

    // Watch template files for changes
    let templates_dir = manifest_dir.join("templates");
    if templates_dir.exists() {
        if let Ok(entries) = fs::read_dir(&templates_dir) {
            for entry in entries.flatten() {
                println!("cargo:rerun-if-changed={}", entry.path().display());
            }
        }
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

    // Fetch and generate gitignore templates
    if let Err(e) = fetch_gitignore_templates(&manifest_dir) {
        println!("cargo:warning=Failed to fetch gitignore templates: {e}");
        // Don't fail the build - generate with whatever templates exist
    }
    if let Err(e) = generate_templates_rs(&manifest_dir) {
        println!("cargo:warning=Failed to generate gitignore_templates.rs: {e}");
    }

    tauri_build::build()
}
