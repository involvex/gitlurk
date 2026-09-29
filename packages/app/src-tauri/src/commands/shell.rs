use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::State;

use crate::{process_util, terminal, validate_repo_path, AppState};

static LAST_TOOL_LAUNCH: Mutex<Option<Instant>> = Mutex::new(None);

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
            // Pass /select,<path> as one argv so spaces don't break parsing.
            std::process::Command::new("explorer.exe")
                .arg(format!("/select,{}", target.display()))
                .spawn()
                .map_err(|e| e.to_string())?;
        } else if target.is_dir() {
            std::process::Command::new("explorer.exe")
                .arg(target.as_os_str())
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            return Err("Path does not exist".into());
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

fn strip_verbatim_prefix(path: &str) -> String {
    path.strip_prefix(r"\\?\")
        .unwrap_or(path)
        .to_string()
}

fn to_wsl_path(path: &Path) -> Result<String, String> {
    let normalized = strip_verbatim_prefix(&path.to_string_lossy()).replace('\\', "/");
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

fn looks_like_document_command(command: &str) -> bool {
    let lower = command.to_ascii_lowercase();
    const BLOCKED: &[&str] = &[
        ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".rs", ".md",
        ".txt", ".toml", ".yaml", ".yml", ".css", ".html", ".svg", ".png",
        ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".lock",
    ];
    BLOCKED.iter().any(|ext| lower.ends_with(ext))
}

fn rate_limit_tool_launch() -> Result<(), String> {
    let mut guard = LAST_TOOL_LAUNCH
        .lock()
        .map_err(|_| "Tool launch lock poisoned".to_string())?;
    if let Some(prev) = *guard {
        if prev.elapsed() < Duration::from_millis(750) {
            return Err("Slow down — wait a moment before launching another tool".into());
        }
    }
    *guard = Some(Instant::now());
    Ok(())
}

/// Launch a native CLI on Windows without ShellExecute-ing the target path.
/// Uses `cmd /C` so `.cmd` shims (code/cursor) resolve like a normal shell.
#[cfg(windows)]
fn spawn_native_windows(command: &str, args: &[String]) -> Result<(), String> {
    if command.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|'])
        && !Path::new(command).exists()
    {
        // Absolute paths to real executables are OK; reject odd metacharacters otherwise.
        if !Path::new(command).is_absolute() {
            return Err(format!("Invalid tool command: {command}"));
        }
    }
    if looks_like_document_command(command) {
        return Err(format!(
            "Refusing to launch '{command}' — that looks like a document, not a program"
        ));
    }

    // Prefer cmd so PATH `.cmd` shims work. Never use `start` with the target path alone
    // (that ShellExecutes the file and pops "Open with" for .ts/.rs/etc.).
    let mut cmdline = process_util::command("cmd");
    cmdline.arg("/C");
    cmdline.arg(command);
    for a in args {
        cmdline.arg(a);
    }
    cmdline
        .spawn()
        .map_err(|e| format!("Failed to launch '{command}': {e}"))?;
    Ok(())
}

#[cfg(not(windows))]
fn spawn_native_windows(_command: &str, _args: &[String]) -> Result<(), String> {
    Err("Native tool launch is only implemented for Windows".into())
}

#[tauri::command(rename_all = "camelCase")]
pub fn shell_run_tool(
    path: String,
    command: String,
    args: Vec<String>,
    kind: String,
) -> Result<(), String> {
    rate_limit_tool_launch()?;

    let target = validate_repo_path(&path)?;
    if !target.exists() {
        return Err("Path does not exist".into());
    }
    let absolute = target
        .canonicalize()
        .unwrap_or_else(|_| target.clone());
    let path_str = strip_verbatim_prefix(&absolute.to_string_lossy());
    let is_file = absolute.is_file();
    let dir_buf: PathBuf = if is_file {
        absolute
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| absolute.clone())
    } else {
        absolute.clone()
    };
    let dir_str = strip_verbatim_prefix(&dir_buf.to_string_lossy());
    let file_name = absolute
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let wsl_path = to_wsl_path(&absolute).unwrap_or_default();

    let substituted: Vec<String> = args
        .iter()
        .map(|a| substitute_placeholders(a, &path_str, &dir_str, &file_name, &wsl_path))
        .collect();

    // Never allow an arg that is only a document path to be used as the program.
    for a in &substituted {
        if looks_like_document_command(a) && a == &path_str {
            // Path args to editors are fine; the program name is checked separately.
            continue;
        }
    }

    match kind.as_str() {
        "native" => {
            let cmd = command.trim();
            if cmd.is_empty() {
                return Err("Tool command is empty".into());
            }
            if looks_like_document_command(cmd) {
                return Err(format!(
                    "Refusing to launch '{cmd}' — that looks like a document, not a program"
                ));
            }
            #[cfg(windows)]
            {
                spawn_native_windows(cmd, &substituted)?;
            }
            #[cfg(not(windows))]
            {
                std::process::Command::new(cmd)
                    .args(&substituted)
                    .spawn()
                    .map_err(|e| format!("Failed to launch '{cmd}': {e}"))?;
            }
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
                let mut cmdline = process_util::command("wsl.exe");
                cmdline
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

    #[test]
    fn rejects_document_commands() {
        assert!(looks_like_document_command("foo.ts"));
        assert!(looks_like_document_command(r"D:\a\b.rs"));
        assert!(!looks_like_document_command("code"));
        assert!(!looks_like_document_command("cursor.cmd"));
    }
}
