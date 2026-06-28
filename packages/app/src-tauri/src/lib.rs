use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_deep_link::DeepLinkExt;

mod commands;
mod git_service;
mod mcp_server;
mod plugin_host;
mod protocol;
mod registry;
mod terminal;
mod tray;

pub struct AppState {
    pub data_dir: PathBuf,
    pub git: git_service::GitService,
    pub auth_token: Mutex<Option<String>>,
    pub auth_username: Mutex<Option<String>>,
    pub mcp_token: String,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> Self {
        let mcp_token = uuid::Uuid::new_v4().to_string();
        Self {
            data_dir,
            git: git_service::GitService::new(),
            auth_token: Mutex::new(None),
            auth_username: Mutex::new(None),
            mcp_token,
        }
    }

    pub fn repos_file(&self) -> PathBuf {
        self.data_dir.join("repos.json")
    }

    pub fn settings_file(&self) -> PathBuf {
        self.data_dir.join("settings.json")
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Settings {
    pub theme: String,
}

pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(
            |app, argv, _cwd| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                for arg in argv {
                    if arg.starts_with("mygit://") {
                        protocol::handle_deep_link(app, &arg);
                    } else if arg.starts_with("--open-local=") {
                        let path = arg.trim_start_matches("--open-local=");
                        let action = protocol::UrlAction::OpenLocalRepo {
                            path: path.to_string(),
                            branch: None,
                        };
                        let _ = app.emit("cli-action", action);
                    }
                }
            },
        ));
    }

    builder
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&data_dir).ok();

            let state = AppState::new(data_dir.clone());
            app.manage(state);

            let state = app.state::<AppState>();
            commands::auth::init_auth(state);

            tray::setup_tray(app.handle())?;
            registry::register_explorer_menu_if_enabled(app.handle())?;

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(err) = mcp_server::start_mcp_server(handle).await {
                    eprintln!("MCP server error: {err}");
                }
            });

            if let Some(action) = registry::parse_cli_args() {
                emit_to_main(app.handle(), "cli-action", action);
            }

            #[cfg(desktop)]
            {
                app.deep_link().register("mygit")?;
                if let Ok(Some(urls)) = app.deep_link().get_current() {
                    for url in urls {
                        protocol::handle_deep_link(app.handle(), &url.to_string());
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::git::git_status,
            commands::git::git_clone,
            commands::git::git_commit,
            commands::git::git_pull,
            commands::git::git_push,
            commands::git::git_branch_list,
            commands::git::git_branch_create,
            commands::git::git_branch_checkout,
            commands::git::git_is_repo,
            commands::git::git_get_remote_origin,
            commands::dialog::dialog_open_directory,
            commands::dialog::dialog_save_directory,
            commands::app::app_get_repos,
            commands::app::app_save_repos,
            commands::app::app_get_theme,
            commands::app::app_set_theme,
            commands::auth::auth_github_device_start,
            commands::auth::auth_github_device_poll,
            commands::auth::auth_get_token,
            commands::auth::auth_logout,
            commands::github::github_list_prs,
            commands::shell::shell_open_external,
            commands::shell::shell_open_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn validate_repo_path(input: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(input);
    let normalized = path
        .components()
        .collect::<PathBuf>()
        .to_string_lossy()
        .to_string();

    if normalized.contains("..") {
        return Err("Path must not contain .. segments".into());
    }

    let blocked = ["\\Windows\\", "\\Program Files\\", "\\Program Files (x86)\\"];
    let lower = normalized.to_lowercase();
    for prefix in blocked {
        if lower.contains(&prefix.to_lowercase()) {
            return Err("Path is in a blocked system directory".into());
        }
    }

    Ok(path)
}

pub fn emit_to_main(app: &AppHandle, event: &str, payload: impl Serialize + Clone) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit(event, payload);
    }
}
