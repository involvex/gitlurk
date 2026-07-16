use tauri::{AppHandle, Manager};

use crate::protocol;

const REGISTRY_FLAG_FILE: &str = "explorer-menu.enabled";

fn import_reg_file(reg_path: &std::path::Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        let status = std::process::Command::new("reg")
            .args(["import", reg_path.to_string_lossy().as_ref()])
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(
                "Failed to update Explorer context menu registry keys. \
                 Per-user HKCU keys should not need Administrator; check if \
                 registry access is blocked by policy."
                    .into(),
            );
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = reg_path;
        Err("Explorer context menu is only supported on Windows".into())
    }
}

pub fn register_explorer_menu_if_enabled(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = app.path().app_data_dir()?;
    let flag = data_dir.join(REGISTRY_FLAG_FILE);
    if !flag.exists() {
        return Ok(());
    }

    let exe = std::env::current_exe()?;
    let exe_str = exe.to_string_lossy().replace('\\', "\\\\");
    // HKCU\Software\Classes — no admin elevation required (unlike HKCR).
    let reg_content = format!(
        r#"Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\Classes\Directory\shell\GitLurkOpen]
@="Open with GitLurk Desktop"
"Icon"="{exe_str}"

[HKEY_CURRENT_USER\Software\Classes\Directory\shell\GitLurkOpen\command]
@="\"{exe_str}\" --open-local \"%1\""

[HKEY_CURRENT_USER\Software\Classes\Directory\Background\shell\GitLurkOpen]
@="Open with GitLurk Desktop"
"Icon"="{exe_str}"

[HKEY_CURRENT_USER\Software\Classes\Directory\Background\shell\GitLurkOpen\command]
@="\"{exe_str}\" --open-local \"%V\""

[HKEY_CURRENT_USER\Software\Classes\Directory\shell\GitLurkTerminal]
@="Open in Windows Terminal"

[HKEY_CURRENT_USER\Software\Classes\Directory\shell\GitLurkTerminal\command]
@="wt.exe -d \"%1\""

[HKEY_CURRENT_USER\Software\Classes\Directory\Background\shell\GitLurkTerminal]
@="Open in Windows Terminal"

[HKEY_CURRENT_USER\Software\Classes\Directory\Background\shell\GitLurkTerminal\command]
@="wt.exe -d \"%V\""
"#
    );

    let reg_path = data_dir.join("gitlurk-context-menu.reg");
    std::fs::write(&reg_path, reg_content)?;
    import_reg_file(&reg_path)?;

    Ok(())
}

pub fn is_explorer_menu_enabled(app: &AppHandle) -> Result<bool, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(data_dir.join(REGISTRY_FLAG_FILE).exists())
}

pub fn enable_explorer_menu(app: &AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    std::fs::write(data_dir.join(REGISTRY_FLAG_FILE), "1").map_err(|e| e.to_string())?;
    register_explorer_menu_if_enabled(app).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn disable_explorer_menu(app: &AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let flag = data_dir.join(REGISTRY_FLAG_FILE);
    if flag.exists() {
        std::fs::remove_file(flag).map_err(|e| e.to_string())?;
    }

    let reg_path = data_dir.join("gitlurk-context-menu-remove.reg");
    let remove_content = r#"Windows Registry Editor Version 5.00

[-HKEY_CURRENT_USER\Software\Classes\Directory\shell\GitLurkOpen]
[-HKEY_CURRENT_USER\Software\Classes\Directory\Background\shell\GitLurkOpen]
[-HKEY_CURRENT_USER\Software\Classes\Directory\shell\GitLurkTerminal]
[-HKEY_CURRENT_USER\Software\Classes\Directory\Background\shell\GitLurkTerminal]
"#;
    std::fs::write(&reg_path, remove_content).map_err(|e| e.to_string())?;
    import_reg_file(&reg_path)?;

    // Best-effort cleanup of legacy HKCR keys from older builds (may fail without admin).
    let legacy_path = data_dir.join("gitlurk-context-menu-remove-legacy.reg");
    let legacy = r#"Windows Registry Editor Version 5.00

[-HKEY_CLASSES_ROOT\Directory\shell\GitLurkOpen]
[-HKEY_CLASSES_ROOT\Directory\Background\shell\GitLurkOpen]
[-HKEY_CLASSES_ROOT\Directory\shell\GitLurkTerminal]
[-HKEY_CLASSES_ROOT\Directory\Background\shell\GitLurkTerminal]
"#;
    let _ = std::fs::write(&legacy_path, legacy);
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("reg")
            .args(["import", legacy_path.to_string_lossy().as_ref()])
            .status();
    }

    Ok(())
}

pub fn parse_cli_args() -> Option<protocol::UrlAction> {
    let args: Vec<String> = std::env::args().collect();
    for (index, arg) in args.iter().enumerate() {
        if arg.starts_with("--open-local=") {
            let path = arg.trim_start_matches("--open-local=");
            return Some(protocol::UrlAction::OpenLocalRepo {
                path: path.to_string(),
                branch: None,
            });
        }
        if arg == "--open-local" {
            if let Some(path) = args.get(index + 1) {
                return Some(protocol::UrlAction::OpenLocalRepo {
                    path: path.clone(),
                    branch: None,
                });
            }
        }
        if arg.starts_with("--clone=") {
            let url = arg.trim_start_matches("--clone=");
            return Some(protocol::UrlAction::Clone {
                url: url.to_string(),
            });
        }
        if arg.starts_with("gitlurk://") {
            return Some(protocol::parse_app_url(arg));
        }
    }
    None
}
