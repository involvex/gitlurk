use std::path::Path;
use std::process::{Command, Stdio};

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub main: String,
    pub permissions: Vec<String>,
}

#[derive(Serialize)]
struct PluginRequest {
    method: String,
    params: serde_json::Value,
}

pub fn load_manifest(plugin_dir: &Path) -> Result<PluginManifest, String> {
    let manifest_path = plugin_dir.join("mygit.plugin.json");
    let content = std::fs::read_to_string(manifest_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn invoke_plugin_command(
    plugin_dir: &Path,
    method: &str,
    params: serde_json::Value,
) -> Result<String, String> {
    let manifest = load_manifest(plugin_dir)?;
    if !manifest.permissions.iter().any(|p| p == "git.read" || p == "ui.toast") {
        return Err("Plugin lacks required permissions".into());
    }

    let entry = plugin_dir.join(&manifest.main);
    let request = PluginRequest {
        method: method.to_string(),
        params,
    };
    let payload = serde_json::to_string(&request).map_err(|e| e.to_string())?;

    let mut child = Command::new("bun")
        .arg(entry)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn plugin: {e}"))?;

    if let Some(stdin) = child.stdin.as_mut() {
        use std::io::Write;
        stdin
            .write_all(format!("{payload}\n").as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
