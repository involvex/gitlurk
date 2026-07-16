use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use portable_pty::{native_pty_system, Child, CommandBuilder, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub struct PtySessionManager {
    sessions: Mutex<HashMap<String, PtySessionHandle>>,
}

struct PtySessionHandle {
    writer: Box<dyn Write + Send>,
    /// Must stay alive for the ConPTY session; dropping early can trigger
    /// 0xc0000142 (STATUS_DLL_INIT_FAILED) while the shell is still starting.
    _child: Box<dyn Child + Send + Sync>,
}

#[derive(Clone, Serialize)]
pub struct TerminalOutputEvent {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub data: String,
}

impl PtySessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn spawn(
        &self,
        app: AppHandle,
        cwd: String,
        cols: u16,
        rows: u16,
        shell_preference: &str,
        custom_path: Option<&str>,
    ) -> Result<String, String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let shell = resolve_shell(shell_preference, custom_path)?;
        let mut cmd = CommandBuilder::new(&shell);
        cmd.cwd(&cwd);

        // Interactive flags for PowerShell hosts.
        let lower = shell.to_ascii_lowercase();
        if lower.ends_with("pwsh.exe") || lower.ends_with("powershell.exe") {
            cmd.arg("-NoLogo");
        }

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to start shell ({shell}): {e}"))?;
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        let session_id = Uuid::new_v4().to_string();
        let session_id_for_thread = session_id.clone();

        std::thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(count) => {
                        let data = String::from_utf8_lossy(&buffer[..count]).to_string();
                        let _ = app.emit(
                            "terminal-output",
                            TerminalOutputEvent {
                                session_id: session_id_for_thread.clone(),
                                data,
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });

        self.sessions.lock().unwrap().insert(
            session_id.clone(),
            PtySessionHandle {
                writer,
                _child: child,
            },
        );

        Ok(session_id)
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| "Terminal session not found".to_string())?;
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let _ = (session_id, cols, rows);
        Ok(())
    }

    pub fn kill(&self, session_id: &str) -> Result<(), String> {
        self.sessions.lock().unwrap().remove(session_id);
        Ok(())
    }
}

/// Resolve an absolute shell path. Prefer full paths to avoid WindowsApps
/// stubs / broken shims that show Application Error 0xc0000142 under ConPTY.
pub fn resolve_shell(
    preference: &str,
    custom_path: Option<&str>,
) -> Result<String, String> {
    let pref = preference.trim();
    if pref.is_empty() {
        return Ok(resolve_pwsh()
            .or_else(resolve_windows_powershell)
            .unwrap_or_else(resolve_cmd));
    }

    let lower = pref.to_ascii_lowercase();
    if lower == "custom" {
        let path = custom_path
            .map(str::trim)
            .filter(|p| !p.is_empty())
            .ok_or_else(|| {
                "Custom shell path is empty — set it in Settings → General".to_string()
            })?;
        return validate_shell_path(path);
    }

    // Allow pasting a full path as the preference itself.
    if looks_like_path(pref) {
        return validate_shell_path(pref);
    }

    match lower.as_str() {
        "cmd" => Ok(resolve_cmd()),
        "powershell" => resolve_windows_powershell()
            .ok_or_else(|| "Windows PowerShell not found".to_string()),
        "pwsh" => {
            if let Some(path) = custom_path.map(str::trim).filter(|p| !p.is_empty()) {
                return validate_shell_path(path);
            }
            resolve_pwsh()
                .or_else(resolve_windows_powershell)
                .ok_or_else(|| "PowerShell 7 (pwsh) not found".to_string())
        }
        _ => Ok(resolve_pwsh()
            .or_else(resolve_windows_powershell)
            .unwrap_or_else(resolve_cmd)),
    }
}

fn looks_like_path(value: &str) -> bool {
    value.contains('\\')
        || value.contains('/')
        || value.ends_with(".exe")
        || value.ends_with(".cmd")
        || value.ends_with(".bat")
}

fn validate_shell_path(path: &str) -> Result<String, String> {
    let p = PathBuf::from(path);
    if p.is_file() {
        Ok(p.to_string_lossy().into_owned())
    } else {
        Err(format!("Shell executable not found: {path}"))
    }
}

fn resolve_cmd() -> String {
    std::env::var("ComSpec").unwrap_or_else(|_| {
        let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
        PathBuf::from(system_root)
            .join("System32")
            .join("cmd.exe")
            .to_string_lossy()
            .into_owned()
    })
}

fn resolve_windows_powershell() -> Option<String> {
    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| r"C:\Windows".into());
    let path = PathBuf::from(system_root)
        .join("System32")
        .join("WindowsPowerShell")
        .join("v1.0")
        .join("powershell.exe");
    if path.is_file() {
        Some(path.to_string_lossy().into_owned())
    } else {
        None
    }
}

fn resolve_pwsh() -> Option<String> {
    // Prefer the MSI/ZIP install under Program Files — PATH often hits
    // WindowsApps aliases or .dotnet\tools shims that fail under ConPTY.
    let program_files = [
        std::env::var("ProgramFiles").ok(),
        std::env::var("ProgramW6432").ok(),
        Some(r"C:\Program Files".into()),
    ];

    for pf in program_files.into_iter().flatten() {
        let base = PathBuf::from(pf).join("PowerShell");
        if let Some(found) = newest_pwsh_under(&base) {
            return Some(found);
        }
    }

    find_on_path("pwsh.exe")
}

fn newest_pwsh_under(base: &Path) -> Option<String> {
    if !base.is_dir() {
        return None;
    }
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(base) {
        for entry in entries.flatten() {
            let pwsh = entry.path().join("pwsh.exe");
            if pwsh.is_file() {
                candidates.push(pwsh);
            }
        }
    }
    candidates.sort();
    candidates
        .pop()
        .map(|p| p.to_string_lossy().into_owned())
}

fn find_on_path(exe: &str) -> Option<String> {
    let path = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path) {
        let candidate = dir.join(exe);
        if !candidate.is_file() {
            continue;
        }
        let as_str = candidate.to_string_lossy();
        // Skip known-broken ConPTY hosts / app execution aliases.
        if as_str.contains(r"\WindowsApps\")
            || as_str.contains(r"\.dotnet\tools\")
            || as_str.contains(r"\AppData\Local\Microsoft\WindowsApps\")
        {
            continue;
        }
        return Some(as_str.into_owned());
    }
    None
}
