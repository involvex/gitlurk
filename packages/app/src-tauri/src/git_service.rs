use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::sync::Mutex;

use serde::Serialize;

#[derive(Debug, Clone, Copy)]
pub enum DiffKind {
    Staged,
    Unstaged,
    Untracked,
}

impl DiffKind {
    pub fn from_str(value: &str) -> Result<Self, String> {
        match value {
            "staged" => Ok(Self::Staged),
            "unstaged" => Ok(Self::Unstaged),
            "untracked" => Ok(Self::Untracked),
            _ => Err(format!("Unknown diff kind: {value}")),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffResult {
    pub patch: String,
    pub is_binary: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitStatusResult {
    pub staged: Vec<String>,
    pub unstaged: Vec<String>,
    pub untracked: Vec<String>,
    pub branch: String,
}

pub struct GitService {
    git_path: Mutex<Option<PathBuf>>,
    bundled_paths: Mutex<Vec<PathBuf>>,
}

impl GitService {
    pub fn new() -> Self {
        Self {
            git_path: Mutex::new(None),
            bundled_paths: Mutex::new(Vec::new()),
        }
    }

    pub fn resolve_git(&self) -> Result<PathBuf, String> {
        if let Some(path) = self.git_path.lock().unwrap().clone() {
            return Ok(path);
        }

        if let Some(system) = find_system_git() {
            *self.git_path.lock().unwrap() = Some(system.clone());
            return Ok(system);
        }

        if let Some(bundled) = find_bundled_git(&self.bundled_paths.lock().unwrap()) {
            *self.git_path.lock().unwrap() = Some(bundled.clone());
            return Ok(bundled);
        }

        Err("Git not found. Install Git for Windows or bundle Portable Git.".into())
    }

    pub fn exec(&self, args: &[&str], cwd: &Path) -> Result<Output, String> {
        let git = self.resolve_git()?;
        Command::new(git)
            .args(args)
            .current_dir(cwd)
            .env("GIT_TERMINAL_PROMPT", "0")
            .output()
            .map_err(|e| format!("Failed to run git: {e}"))
    }

    pub fn is_repo(&self, dir: &Path) -> Result<bool, String> {
        let output = self.exec(&["rev-parse", "--is-inside-work-tree"], dir)?;
        Ok(output.status.success()
            && String::from_utf8_lossy(&output.stdout).trim() == "true")
    }

    pub fn status(&self, dir: &Path) -> Result<GitStatusResult, String> {
        let branch_output = self.exec(&["branch", "--show-current"], dir)?;
        let status_output = self.exec(&["status", "--porcelain"], dir)?;

        let mut staged = Vec::new();
        let mut unstaged = Vec::new();
        let mut untracked = Vec::new();

        for line in String::from_utf8_lossy(&status_output.stdout).lines() {
            if line.is_empty() {
                continue;
            }
            let index = line.chars().next().unwrap_or(' ');
            let work_tree = line.chars().nth(1).unwrap_or(' ');
            let file = line.get(3..).unwrap_or("").trim().to_string();

            if index == '?' && work_tree == '?' {
                untracked.push(file);
                continue;
            }
            if index != ' ' && index != '?' {
                staged.push(file.clone());
            }
            if work_tree != ' ' && work_tree != '?' {
                unstaged.push(file);
            }
        }

        Ok(GitStatusResult {
            staged,
            unstaged,
            untracked,
            branch: String::from_utf8_lossy(&branch_output.stdout)
                .trim()
                .to_string(),
        })
    }

    pub fn clone_repo(&self, url: &str, target: &Path) -> Result<(), String> {
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let parent = target
            .parent()
            .ok_or_else(|| "Invalid target directory".to_string())?;
        let folder_name = target
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid folder name".to_string())?;

        let output = self.exec(&["clone", url, folder_name], parent)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn commit(&self, dir: &Path, message: &str, files: Option<Vec<String>>) -> Result<String, String> {
        if let Some(list) = files {
            if !list.is_empty() {
                let mut args = vec!["add", "--"];
                for file in &list {
                    args.push(file);
                }
                let add = self.exec(&args, dir)?;
                if !add.status.success() {
                    return Err(String::from_utf8_lossy(&add.stderr).to_string());
                }
            }
        } else {
            let add = self.exec(&["add", "-A"], dir)?;
            if !add.status.success() {
                return Err(String::from_utf8_lossy(&add.stderr).to_string());
            }
        }

        let commit = self.exec(&["commit", "-m", message], dir)?;
        if !commit.status.success() {
            return Err(String::from_utf8_lossy(&commit.stderr).to_string());
        }

        let hash = self.exec(&["rev-parse", "HEAD"], dir)?;
        Ok(String::from_utf8_lossy(&hash.stdout).trim().to_string())
    }

    pub fn pull(&self, dir: &Path) -> Result<String, String> {
        let output = self.exec(&["pull"], dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    pub fn push(&self, dir: &Path) -> Result<String, String> {
        let output = self.exec(&["push"], dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    pub fn branch_list(&self, dir: &Path) -> Result<(Vec<String>, String), String> {
        let branches_output = self.exec(&["branch", "--format=%(refname:short)"], dir)?;
        let current_output = self.exec(&["branch", "--show-current"], dir)?;
        let branches: Vec<String> = String::from_utf8_lossy(&branches_output.stdout)
            .lines()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect();
        let current = String::from_utf8_lossy(&current_output.stdout)
            .trim()
            .to_string();
        Ok((branches, current))
    }

    pub fn branch_create(&self, dir: &Path, name: &str) -> Result<(), String> {
        let output = self.exec(&["branch", name], dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
        Ok(())
    }

    pub fn branch_checkout(&self, dir: &Path, name: &str) -> Result<(), String> {
        let output = self.exec(&["checkout", name], dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
        Ok(())
    }

    pub fn remote_origin(&self, dir: &Path) -> Result<Option<String>, String> {
        let output = self.exec(&["remote", "get-url", "origin"], dir)?;
        if !output.status.success() {
            return Ok(None);
        }
        Ok(Some(
            String::from_utf8_lossy(&output.stdout).trim().to_string(),
        ))
    }

    pub fn diff_file(&self, dir: &Path, file: &str, kind: DiffKind) -> Result<DiffResult, String> {
        let output = match kind {
            DiffKind::Unstaged => self.exec(&["diff", "--", file], dir)?,
            DiffKind::Staged => self.exec(&["diff", "--cached", "--", file], dir)?,
            DiffKind::Untracked => {
                let file_path = dir.join(file);
                let file_str = file_path
                    .to_str()
                    .ok_or_else(|| "Invalid file path".to_string())?;
                #[cfg(windows)]
                let null_dev = "NUL";
                #[cfg(not(windows))]
                let null_dev = "/dev/null";
                self.exec(&["diff", "--no-index", null_dev, file_str], dir)?
            }
        };

        let exit = output.status.code();
        if !output.status.success() && exit != Some(1) {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let combined = stdout.to_string();
        let is_binary = combined.contains("Binary files");
        Ok(DiffResult {
            patch: combined,
            is_binary,
        })
    }

    pub fn set_bundled_search_paths(&self, paths: Vec<PathBuf>) {
        *self.bundled_paths.lock().unwrap() = paths;
    }
}

fn find_system_git() -> Option<PathBuf> {
    let output = Command::new("where").arg("git").output().ok()?;
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

fn find_bundled_git(extra_paths: &[PathBuf]) -> Option<PathBuf> {
    let mut candidates = vec![
        PathBuf::from("resources/git/cmd/git.exe"),
        PathBuf::from("resources/git/bin/git.exe"),
    ];
    candidates.extend(extra_paths.iter().cloned());

    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        candidates.push(
            PathBuf::from(local)
                .join("MyGit")
                .join("git")
                .join("cmd")
                .join("git.exe"),
        );
    }

    for path in candidates {
        if path.exists() {
            return Some(path);
        }
    }
    None
}
