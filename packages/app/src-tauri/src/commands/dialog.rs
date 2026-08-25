use tauri_plugin_dialog::DialogExt;

#[tauri::command(rename_all = "camelCase")]
pub async fn dialog_open_directory(
    app: tauri::AppHandle,
    title: Option<String>,
) -> Result<Option<String>, String> {
    let result = app
        .dialog()
        .file()
        .set_title(title.unwrap_or_else(|| "Select folder".to_string()))
        .blocking_pick_folder();

    Ok(result.map(|p| p.to_string()))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dialog_save_directory(
    app: tauri::AppHandle,
    title: Option<String>,
    default_path: Option<String>,
) -> Result<Option<String>, String> {
    let mut builder = app.dialog().file();
    builder = builder.set_title(title.unwrap_or_else(|| "Select folder".to_string()));
    if let Some(default_path) = default_path {
        builder = builder.set_directory(default_path);
    }
    let result = builder.blocking_pick_folder();
    Ok(result.map(|p| p.to_string()))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dialog_open_file(
    app: tauri::AppHandle,
    title: Option<String>,
    extensions: Option<Vec<String>>,
) -> Result<Option<String>, String> {
    let mut builder = app.dialog().file();
    builder = builder.set_title(title.unwrap_or_else(|| "Select file".to_string()));
    if let Some(exts) = extensions {
        let filters: Vec<String> = exts;
        builder = builder.add_filter("Files", &filters.iter().map(|s| s.as_str()).collect::<Vec<_>>());
    }
    let result = builder.blocking_pick_file();
    Ok(result.map(|p| p.to_string()))
}
