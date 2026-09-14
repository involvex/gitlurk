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
