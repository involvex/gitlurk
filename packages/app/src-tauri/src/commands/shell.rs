use std::path::{Path, PathBuf};

use tauri::State;

use crate::{terminal, validate_repo_path, AppState};

#[tauri::command(rename_all = "camelCase")]
pub fn shell_open_external(url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Only http(s) URLs are allowed".into());
    }
    #[cfg(windows)]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn shell_open_terminal(_state: State<'_, AppState>, path: String) -> Result<(), String> {
    let target = validate_repo_path(&path)?;
    // wt -d needs a directory; if a file was passed, open its parent.
    let dir = if target.is_file() {
        target
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or(target)
    } else {
        target
    };
    terminal::open_in_windows_terminal(dir.to_string_lossy().as_ref())
}

#[tauri::command(rename_all = "camelCase")]
pub fn shell_reveal_in_explorer(path: String) -> Result<(), String> {
    let target = validate_repo_path(&path)?;
    #[cfg(windows)]
    {
        if target.is_file() {
            std::process::Command::new("explorer.exe")
                .arg(format!("/select,{}", target.display()))
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            std::process::Command::new("explorer.exe")
                .arg(target.as_os_str())
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(not(windows))]
    {
        let open_path = if target.is_file() {
            target.parent().unwrap_or(&target)
        } else {
            &target
        };
        std::process::Command::new("xdg-open")
            .arg(open_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn to_wsl_path(path: &Path) -> Result<String, String> {
    let normalized = path.to_string_lossy().replace('\\', "/");
    let bytes = normalized.as_bytes();
    if bytes.len() < 2 || bytes[1] != b':' {
        return Err(format!("Cannot convert path to WSL: {}", path.display()));
    }
    let drive = (bytes[0] as char).to_ascii_lowercase();
    if !drive.is_ascii_alphabetic() {
        return Err(format!("Cannot convert path to WSL: {}", path.display()));
    }
    let rest = normalized[2..]
        .trim_start_matches('/')
        .trim_end_matches('/');
    if rest.is_empty() {
        Ok(format!("/mnt/{drive}"))
    } else {
        Ok(format!("/mnt/{drive}/{rest}"))
    }
}

fn substitute_placeholders(
    template: &str,
    path: &str,
    dir: &str,
    file_name: &str,
    wsl_path: &str,
) -> String {
    template
        .replace("{path}", path)
        .replace("{dir}", dir)
        .replace("{fileName}", file_name)
        .replace("{wslPath}", wsl_path)
}

#[tauri::command(rename_all = "camelCase")]
pub fn shell_run_tool(
    path: String,
    command: String,
    args: Vec<String>,
    kind: String,
) -> Result<(), String> {
    let target = validate_repo_path(&path)?;
    let absolute = target
        .canonicalize()
        .unwrap_or_else(|_| target.clone());
    let path_str = absolute.to_string_lossy().to_string();
    let is_file = absolute.is_file();
    let dir_buf: PathBuf = if is_file {
        absolute
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| absolute.clone())
    } else {
        absolute.clone()
    };
    let dir_str = dir_buf.to_string_lossy().to_string();
    let file_name = absolute
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let wsl_path = to_wsl_path(&absolute).unwrap_or_default();

    let substituted: Vec<String> = args
        .iter()
        .map(|a| substitute_placeholders(a, &path_str, &dir_str, &file_name, &wsl_path))
        .collect();

    match kind.as_str() {
        "native" => {
            let cmd = command.trim();
            if cmd.is_empty() {
                return Err("Tool command is empty".into());
            }
            std::process::Command::new(cmd)
                .args(&substituted)
                .spawn()
                .map_err(|e| format!("Failed to launch '{cmd}': {e}"))?;
        }
        "wsl" => {
            if wsl_path.is_empty() {
                return Err("Cannot convert path for WSL".into());
            }
            let script = if substituted.is_empty() {
                format!("cd '{wsl_path}' && exec bash -l")
            } else {
                substituted.join(" ")
            };
            #[cfg(windows)]
            {
                std::process::Command::new("wsl.exe")
                    .args(["-e", "bash", "-lc", &script])
                    .spawn()
                    .map_err(|e| format!("Failed to launch WSL: {e}"))?;
            }
            #[cfg(not(windows))]
            {
                let _ = command;
                return Err("WSL tools are only supported on Windows".into());
            }
        }
        other => return Err(format!("Unknown tool kind: {other}")),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wsl_path_drive_root() {
        assert_eq!(to_wsl_path(Path::new(r"C:\")).unwrap(), "/mnt/c");
    }

    #[test]
    fn wsl_path_nested() {
        assert_eq!(
            to_wsl_path(Path::new(r"C:\Users\a\repo")).unwrap(),
            "/mnt/c/Users/a/repo"
        );
    }

    #[test]
    fn substitute_all_placeholders() {
        let out = substitute_placeholders(
            "{path}|{dir}|{fileName}|{wslPath}",
            r"D:\r\f.txt",
            r"D:\r",
            "f.txt",
            "/mnt/d/r/f.txt",
        );
        assert_eq!(out, r"D:\r\f.txt|D:\r|f.txt|/mnt/d/r/f.txt");
    }
}
