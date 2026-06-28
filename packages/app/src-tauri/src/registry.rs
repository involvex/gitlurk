use tauri::{AppHandle, Manager};

use crate::protocol;

const REGISTRY_FLAG_FILE: &str = "explorer-menu.enabled";

pub fn register_explorer_menu_if_enabled(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = app.path().app_data_dir()?;
    let flag = data_dir.join(REGISTRY_FLAG_FILE);
    if !flag.exists() {
        return Ok(());
    }

    let exe = std::env::current_exe()?;
    let exe_str = exe.to_string_lossy().replace('\\', "\\\\");
    let reg_content = format!(
        r#"Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\Directory\shell\MyGitOpen]
@="Open with MyGit Desktop"
"Icon"="{exe_str}"

[HKEY_CLASSES_ROOT\Directory\shell\MyGitOpen\command]
@="\"{exe_str}\" --open-local \"%1\""

[HKEY_CLASSES_ROOT\Directory\Background\shell\MyGitOpen]
@="Open with MyGit Desktop"
"Icon"="{exe_str}"

[HKEY_CLASSES_ROOT\Directory\Background\shell\MyGitOpen\command]
@="\"{exe_str}\" --open-local \"%V\""

[HKEY_CLASSES_ROOT\Directory\shell\MyGitTerminal]
@="Open in Windows Terminal"

[HKEY_CLASSES_ROOT\Directory\shell\MyGitTerminal\command]
@="wt.exe -d \"%1\""

[HKEY_CLASSES_ROOT\Directory\Background\shell\MyGitTerminal]
@="Open in Windows Terminal"

[HKEY_CLASSES_ROOT\Directory\Background\shell\MyGitTerminal\command]
@="wt.exe -d \"%V\""
"#
    );

    let reg_path = data_dir.join("mygit-context-menu.reg");
    std::fs::write(&reg_path, reg_content)?;

    #[cfg(windows)]
    {
        let _ = std::process::Command::new("reg")
            .args(["import", reg_path.to_string_lossy().as_ref()])
            .status();
    }

    Ok(())
}

pub fn enable_explorer_menu(app: &AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    std::fs::write(data_dir.join(REGISTRY_FLAG_FILE), "1").map_err(|e| e.to_string())?;
    register_explorer_menu_if_enabled(app).map_err(|e| e.to_string())?;
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
        if arg.starts_with("mygit://") {
            return Some(protocol::parse_app_url(arg));
        }
    }
    None
}
