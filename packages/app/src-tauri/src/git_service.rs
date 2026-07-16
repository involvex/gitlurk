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

    pub fn clone_repo(
        &self,
        url: &str,
        target: &Path,
        recurse_submodules: bool,
        depth: Option<u32>,
    ) -> Result<(), String> {
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

        let mut args = vec!["clone".to_string()];
        if recurse_submodules {
            args.push("--recurse-submodules".to_string());
        }
        if let Some(d) = depth {
            if d > 0 {
                args.push("--depth".to_string());
                args.push(d.to_string());
            }
        }
        args.push(url.to_string());
        args.push(folder_name.to_string());

        let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        let output = self.exec(&arg_refs, parent)?;
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

    pub fn config_list(
        &self,
        scope: &str,
        cwd: &Path,
        show_origin: bool,
    ) -> Result<Vec<GitConfigEntry>, String> {
        let scope_flag = format!("--{scope}");
        let mut args = vec!["config", scope_flag.as_str(), "--list"];
        if show_origin {
            args.push("--show-origin");
        }
        let output = self.exec(&args, cwd)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout
            .lines()
            .filter_map(parse_config_line)
            .collect())
    }

    pub fn config_get(&self, key: &str, scope: &str, cwd: &Path) -> Result<Option<String>, String> {
        let scope_flag = format!("--{scope}");
        let output = self.exec(&["config", scope_flag.as_str(), key], cwd)?;
        if !output.status.success() {
            return Ok(None);
        }
        let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if value.is_empty() {
            Ok(None)
        } else {
            Ok(Some(value))
        }
    }

    pub fn config_set(
        &self,
        key: &str,
        value: &str,
        scope: &str,
        cwd: &Path,
    ) -> Result<(), String> {
        let scope_flag = format!("--{scope}");
        let output = self.exec(
            &["config", scope_flag.as_str(), key, value],
            cwd,
        )?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn config_path(&self, scope: &str, cwd: &Path) -> Result<Option<String>, String> {
        let scope_flag = format!("--{scope}");
        let output = self.exec(&["config", scope_flag.as_str(), "--path"], cwd)?;
        if !output.status.success() {
            return Ok(None);
        }
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() {
            Ok(None)
        } else {
            Ok(Some(path))
        }
    }

    pub fn restore_paths(
        &self,
        dir: &Path,
        paths: &[String],
        staged: bool,
    ) -> Result<(), String> {
        if paths.is_empty() {
            return Ok(());
        }
        let mut args = vec!["restore"];
        if staged {
            args.push("--staged");
        }
        args.push("--");
        for path in paths {
            args.push(path);
        }
        let output = self.exec(&args, dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn restore_all(&self, dir: &Path, staged: bool) -> Result<(), String> {
        let mut args = vec!["restore"];
        if staged {
            args.push("--staged");
        }
        args.push(".");
        let output = self.exec(&args, dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn clean_paths(&self, dir: &Path, paths: &[String]) -> Result<(), String> {
        let output = if paths.is_empty() {
            self.exec(&["clean", "-fd"], dir)?
        } else {
            let mut args = vec!["clean", "-fd", "--"];
            for path in paths {
                args.push(path);
            }
            self.exec(&args, dir)?
        };
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn stash_push(&self, dir: &Path, message: Option<&str>) -> Result<(), String> {
        let output = match message {
            Some(msg) if !msg.trim().is_empty() => self.exec(&["stash", "push", "-m", msg], dir)?,
            _ => self.exec(&["stash", "push"], dir)?,
        };
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn stash_list(&self, dir: &Path) -> Result<Vec<StashEntry>, String> {
        let output = self.exec(&["stash", "list", "--format=%gd%x09%s"], dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        let mut entries = Vec::new();
        for (index, line) in String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter(|line| !line.trim().is_empty())
            .enumerate()
        {
            let message = line
                .split_once('\t')
                .map(|(_, msg)| msg.to_string())
                .unwrap_or_else(|| line.to_string());
            entries.push(StashEntry { index, message });
        }
        Ok(entries)
    }

    pub fn stash_pop(&self, dir: &Path, index: Option<usize>) -> Result<(), String> {
        let ref_name = index
            .map(|i| format!("stash@{{{i}}}"))
            .unwrap_or_else(|| "stash@{0}".into());
        let output = self.exec(&["stash", "pop", &ref_name], dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn stash_drop(&self, dir: &Path, index: usize) -> Result<(), String> {
        let ref_name = format!("stash@{{{index}}}");
        let output = self.exec(&["stash", "drop", &ref_name], dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn fetch(&self, dir: &Path) -> Result<(), String> {
        let output = self.exec(&["fetch"], dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn remote_ahead_count(&self, dir: &Path) -> Result<Option<u32>, String> {
        let branch_output = self.exec(&["branch", "--show-current"], dir)?;
        let branch = String::from_utf8_lossy(&branch_output.stdout)
            .trim()
            .to_string();
        if branch.is_empty() {
            return Ok(None);
        }
        let upstream = format!("origin/{branch}");
        let output = self.exec(
            &[
                "rev-list",
                "--count",
                &format!("HEAD..{upstream}"),
            ],
            dir,
        )?;
        if !output.status.success() {
            return Ok(None);
        }
        let count = String::from_utf8_lossy(&output.stdout)
            .trim()
            .parse::<u32>()
            .unwrap_or(0);
        Ok(Some(count))
    }

    pub fn add_paths(&self, dir: &Path, paths: &[String]) -> Result<(), String> {
        if paths.is_empty() {
            return Ok(());
        }
        let mut args = vec!["add", "--"];
        for path in paths {
            args.push(path);
        }
        let output = self.exec(&args, dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn add_all(&self, dir: &Path) -> Result<(), String> {
        let output = self.exec(&["add", "-A"], dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn reset_paths(&self, dir: &Path, paths: &[String]) -> Result<(), String> {
        if paths.is_empty() {
            return Ok(());
        }
        let mut args = vec!["reset", "HEAD", "--"];
        for path in paths {
            args.push(path);
        }
        let output = self.exec(&args, dir)?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }

    pub fn log(&self, dir: &Path, limit: u32) -> Result<Vec<CommitLogEntry>, String> {
        let limit = limit.max(1).min(500).to_string();
        let output = self.exec(
            &[
                "log",
                "--graph",
                "--decorate",
                &format!("-n{limit}"),
                "--date=short",
                "--pretty=format:%m%x1f%H%x1f%an%x1f%ad%x1f%s",
            ],
            dir,
        )?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }

        let mut entries = Vec::new();
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            let parts: Vec<&str> = trimmed.split('\x1f').collect();
            if parts.len() < 5 {
                continue;
            }
            entries.push(CommitLogEntry {
                graph: parts[0].to_string(),
                sha: parts[1].to_string(),
                author: parts[2].to_string(),
                date: parts[3].to_string(),
                subject: parts[4].to_string(),
            });
        }
        Ok(entries)
    }

    pub fn show_commit(&self, dir: &Path, sha: &str) -> Result<DiffResult, String> {
        let output = self.exec(&["show", "--format=", sha], dir)?;
        let exit = output.status.code();
        if !output.status.success() && exit != Some(1) {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        let patch = String::from_utf8_lossy(&output.stdout).to_string();
        let is_binary = patch.contains("Binary files");
        Ok(DiffResult { patch, is_binary })
    }

    pub fn apply_cached_patch(&self, dir: &Path, patch: &str) -> Result<(), String> {
        use std::io::Write;
        use std::process::{Command, Stdio};

        let git = self.resolve_git()?;
        let mut child = Command::new(git)
            .args(["apply", "--cached", "--"])
            .current_dir(dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .env("GIT_TERMINAL_PROMPT", "0")
            .spawn()
            .map_err(|e| format!("Failed to run git apply: {e}"))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(patch.as_bytes())
                .map_err(|e| format!("Failed to write patch: {e}"))?;
        }

        let output = child
            .wait_with_output()
            .map_err(|e| format!("git apply failed: {e}"))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StashEntry {
    pub index: usize,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitLogEntry {
    pub sha: String,
    pub subject: String,
    pub author: String,
    pub date: String,
    pub graph: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitConfigEntry {
    pub key: String,
    pub value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub origin: Option<String>,
}

fn parse_config_line(line: &str) -> Option<GitConfigEntry> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }

    if let Some((origin, rest)) = trimmed.split_once('\t') {
        if let Some(origin_path) = origin.strip_prefix("file:") {
            if let Some((key, value)) = rest.split_once('=') {
                return Some(GitConfigEntry {
                    key: key.to_string(),
                    value: value.to_string(),
                    origin: Some(origin_path.to_string()),
                });
            }
        }
    }

    let (key, value) = trimmed.split_once('=')?;
    Some(GitConfigEntry {
        key: key.to_string(),
        value: value.to_string(),
        origin: None,
    })
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
                .join("GitLurk")
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
