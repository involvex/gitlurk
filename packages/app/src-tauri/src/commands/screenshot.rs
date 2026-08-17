use std::fs;
use std::path::PathBuf;

#[tauri::command(rename_all = "camelCase")]
pub fn screenshot_capture(save_path: String) -> Result<(), String> {
    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    let primary = monitors.first().ok_or("No monitors found")?;

    let image = primary.capture_image().map_err(|e| e.to_string())?;
    let path = PathBuf::from(&save_path);

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    image.save(&path).map_err(|e| e.to_string())?;

    Ok(())
}
