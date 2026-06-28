use std::process::Command;

pub fn open_in_windows_terminal(repo_path: &str) -> Result<(), String> {
    Command::new("wt")
        .args(["-d", repo_path])
        .spawn()
        .map_err(|e| format!("Windows Terminal not found: {e}"))?;
    Ok(())
}
