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
    let dir = validate_repo_path(&path)?;
    terminal::open_in_windows_terminal(dir.to_string_lossy().as_ref())
}
