use std::fs;
use std::path::{Path, PathBuf};

use serde::Deserialize;
use tauri::{AppHandle, Manager, State};

use crate::plugin_host::{invoke_plugin_command, load_manifest, PluginManifest};
use crate::AppState;

#[derive(Debug, Deserialize)]
struct MarketplaceCatalog {
    plugins: Vec<MarketplaceEntry>,
}

#[derive(Debug, Deserialize, Clone)]
struct MarketplaceEntry {
    id: String,
    name: String,
    version: String,
    #[serde(rename = "downloadUrl")]
    download_url: String,
    sha256: String,
    permissions: Vec<String>,
}

fn plugins_dir(state: &AppState) -> PathBuf {
    state.data_dir.join("plugins")
}

fn marketplace_catalog_path(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        for candidate in [
            resource_dir.join("marketplace").join("catalog.json"),
            resource_dir.join("catalog.json"),
        ] {
            if candidate.exists() {
                return Ok(candidate);
            }
        }
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dev_catalog = manifest_dir
        .join("..")
        .join("..")
        .join("marketplace")
        .join("catalog.json");
    if dev_catalog.exists() {
        return Ok(dev_catalog);
    }

    Err("Marketplace catalog not found".into())
}

fn read_catalog(app: &AppHandle) -> Result<MarketplaceCatalog, String> {
    let path = marketplace_catalog_path(app)?;
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let target = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_all(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn plugins_list_marketplace(app: AppHandle) -> Result<serde_json::Value, String> {
    let catalog = read_catalog(&app)?;
    let plugins: Vec<serde_json::Value> = catalog
        .plugins
        .into_iter()
        .map(|plugin| {
            serde_json::json!({
                "id": plugin.id,
                "name": plugin.name,
                "version": plugin.version,
                "downloadUrl": plugin.download_url,
                "sha256": plugin.sha256,
                "permissions": plugin.permissions,
            })
        })
        .collect();
    Ok(serde_json::json!({ "plugins": plugins }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn plugins_list_installed(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let root = plugins_dir(&state);
    if !root.exists() {
        return Ok(serde_json::json!({ "plugins": [] }));
    }

    let mut plugins = Vec::new();
    for entry in fs::read_dir(root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if !entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            continue;
        }
        let manifest = load_manifest(&entry.path())?;
        plugins.push(serde_json::json!({
            "id": manifest.id,
            "name": manifest.name,
            "version": manifest.version,
        }));
    }

    Ok(serde_json::json!({ "plugins": plugins }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn plugins_install(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<serde_json::Value, String> {
    let catalog = read_catalog(&app)?;
    let entry = catalog
        .plugins
        .into_iter()
        .find(|plugin| plugin.id == id)
        .ok_or_else(|| format!("Plugin not found: {id}"))?;

    let source = resolve_plugin_source(&entry.download_url)?;
    let target = plugins_dir(&state).join(&entry.id);
    if target.exists() {
        fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
    }

    if source.is_dir() {
        copy_dir_all(&source, &target)?;
    } else if source.is_file() {
        fs::create_dir_all(&target).map_err(|e| e.to_string())?;
        let file_name = source.file_name().ok_or("Invalid plugin file")?;
        fs::copy(&source, target.join(file_name)).map_err(|e| e.to_string())?;
    } else {
        return Err(format!("Plugin source not found: {}", source.display()));
    }

    let _manifest: PluginManifest = load_manifest(&target)?;
    Ok(serde_json::json!({
        "id": entry.id,
        "path": target.to_string_lossy(),
    }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn plugins_invoke(
    state: State<'_, AppState>,
    id: String,
    method: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let plugin_dir = plugins_dir(&state).join(id);
    let result = invoke_plugin_command(&plugin_dir, &method, params)?;
    Ok(serde_json::json!({ "result": result }))
}

fn resolve_plugin_source(download_url: &str) -> Result<PathBuf, String> {
    if download_url.starts_with("file://") {
        let path = download_url.trim_start_matches("file://");
        return Ok(PathBuf::from(path));
    }

    if download_url.starts_with("repo://") {
        let relative = download_url.trim_start_matches("repo://");
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        return Ok(manifest_dir.join("..").join("..").join(relative));
    }

    Err(format!("Unsupported download URL: {download_url}"))
}
