use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::sync::Mutex;

pub struct GhService {
    gh_path: Mutex<Option<PathBuf>>,
}

impl GhService {
    pub fn new() -> Self {
        Self {
            gh_path: Mutex::new(None),
        }
    }

    pub fn resolve_gh(&self) -> Result<PathBuf, String> {
        if let Some(path) = self.gh_path.lock().unwrap().clone() {
            return Ok(path);
        }

        let found = find_system_gh().ok_or_else(|| {
            "GitHub CLI (gh) not found. Install from https://cli.github.com".to_string()
        })?;
        *self.gh_path.lock().unwrap() = Some(found.clone());
        Ok(found)
    }

    pub fn exec(&self, args: &[&str], cwd: &Path) -> Result<Output, String> {
        let gh = self.resolve_gh()?;
        Command::new(gh)
            .args(args)
            .current_dir(cwd)
            .output()
            .map_err(|e| format!("Failed to run gh: {e}"))
    }

    pub fn version(&self) -> Result<Option<String>, String> {
        match self.exec(&["--version"], Path::new(".")) {
            Ok(output) if output.status.success() => {
                let line = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if line.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(line))
                }
            }
            Ok(_) => Ok(None),
            Err(_) => Ok(None),
        }
    }

    pub fn is_installed(&self) -> bool {
        find_system_gh().is_some()
    }
}

fn find_system_gh() -> Option<PathBuf> {
    #[cfg(windows)]
    {
        let output = Command::new("where").arg("gh").output().ok()?;
        if !output.status.success() {
            return None;
        }
        let line = String::from_utf8_lossy(&output.stdout)
            .lines()
            .next()?
            .trim()
            .to_string();
        if line.is_empty() {
            None
        } else {
            Some(PathBuf::from(line))
        }
    }
    #[cfg(not(windows))]
    {
        let output = Command::new("which").arg("gh").output().ok()?;
        if !output.status.success() {
            return None;
        }
        let line = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if line.is_empty() {
            None
        } else {
            Some(PathBuf::from(line))
        }
    }
}
