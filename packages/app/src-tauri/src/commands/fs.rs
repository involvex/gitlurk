use std::fs;
use std::io::Read;
use std::path::{Component, Path, PathBuf};

use serde::Serialize;

use crate::validate_repo_path;

const MAX_FILE_BYTES: u64 = 512 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirEntryDto {
    name: String,
    path: String,
    kind: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReadFileDto {
    content: String,
    truncated: bool,
    binary: bool,
}

fn resolve_under_repo(repo_path: &str, relative_path: Option<&str>) -> Result<PathBuf, String> {
    let repo = validate_repo_path(repo_path)?;
    let repo_canon = fs::canonicalize(&repo).unwrap_or(repo.clone());

    let relative = relative_path.map(str::trim).filter(|p| !p.is_empty());
    let target = match relative {
        None => repo.clone(),
        Some(rel) => {
            if rel.contains('\0') {
                return Err("Invalid path".into());
            }
            let joined = PathBuf::from(&repo).join(rel);
            for component in Path::new(rel).components() {
                match component {
                    Component::Normal(_) | Component::CurDir => {}
                    Component::ParentDir => {
                        return Err("Path must not contain .. segments".into());
                    }
                    Component::RootDir | Component::Prefix(_) => {
                        return Err("Absolute paths are not allowed".into());
                    }
                }
            }
            joined
        }
    };

    let target_canon = fs::canonicalize(&target).unwrap_or(target.clone());
    if !target_canon.starts_with(&repo_canon) {
        return Err("Path escapes repository root".into());
    }

    Ok(target)
}

fn to_repo_relative(repo: &Path, absolute: &Path) -> String {
    absolute
        .strip_prefix(repo)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default()
}

fn looks_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(8000).any(|&b| b == 0)
}

#[tauri::command(rename_all = "camelCase")]
pub fn fs_list_dir(
    repo_path: String,
    relative_path: Option<String>,
) -> Result<serde_json::Value, String> {
    let dir = resolve_under_repo(&repo_path, relative_path.as_deref())?;
    if !dir.is_dir() {
        return Err("Not a directory".into());
    }

    let repo = validate_repo_path(&repo_path)?;
    let mut entries: Vec<DirEntryDto> = Vec::new();

    let read_dir = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in read_dir.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name == ".git" {
            continue;
        }
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let kind = if file_type.is_dir() {
            "dir"
        } else if file_type.is_file() {
            "file"
        } else {
            continue;
        };
        let abs = entry.path();
        let path = to_repo_relative(&repo, &abs);
        if path.is_empty() && name != "." {
            // Fallback when canonicalize strip fails (e.g. symlink edge cases).
            let fallback = relative_path
                .as_deref()
                .map(str::trim)
                .filter(|p| !p.is_empty())
                .map(|p| format!("{p}/{name}"))
                .unwrap_or_else(|| name.clone());
            entries.push(DirEntryDto {
                name,
                path: fallback.replace('\\', "/"),
                kind,
            });
        } else {
            entries.push(DirEntryDto { name, path, kind });
        }
    }

    entries.sort_by(|a, b| {
        match (a.kind, b.kind) {
            ("dir", "file") => std::cmp::Ordering::Less,
            ("file", "dir") => std::cmp::Ordering::Greater,
            _ => a.name.to_ascii_lowercase().cmp(&b.name.to_ascii_lowercase()),
        }
    });

    Ok(serde_json::json!({ "entries": entries }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn fs_read_file(
    repo_path: String,
    relative_path: String,
) -> Result<serde_json::Value, String> {
    let file = resolve_under_repo(&repo_path, Some(&relative_path))?;
    if !file.is_file() {
        return Err("Not a file".into());
    }

    let meta = fs::metadata(&file).map_err(|e| e.to_string())?;
    let size = meta.len();
    let mut handle = fs::File::open(&file).map_err(|e| e.to_string())?;
    let read_len = size.min(MAX_FILE_BYTES) as usize;
    let mut buf = vec![0u8; read_len];
    let n = handle.read(&mut buf).map_err(|e| e.to_string())?;
    buf.truncate(n);

    if looks_binary(&buf) {
        return Ok(serde_json::to_value(ReadFileDto {
            content: String::new(),
            truncated: size > MAX_FILE_BYTES,
            binary: true,
        })
        .map_err(|e| e.to_string())?);
    }

    let content = String::from_utf8_lossy(&buf).into_owned();
    Ok(serde_json::to_value(ReadFileDto {
        content,
        truncated: size > MAX_FILE_BYTES,
        binary: false,
    })
    .map_err(|e| e.to_string())?)
}
