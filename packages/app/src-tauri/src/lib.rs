use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

mod commands;
mod env_config;
mod git_service;
mod mcp_server;
mod plugin_host;
mod protocol;
mod pty_session;
mod registry;
mod terminal;
mod tray;

pub struct AppState {
    pub data_dir: PathBuf,
    pub git: git_service::GitService,
    pub auth_token: Mutex<Option<String>>,
    pub auth_username: Mutex<Option<String>>,
    pub mcp_token: String,
    pub pty_sessions: pty_session::PtySessionManager,
    pub pending_cli_action: Mutex<Option<protocol::UrlAction>>,
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
            pty_sessions: pty_session::PtySessionManager::new(),
            pending_cli_action: Mutex::new(None),
        }
    }

    pub fn repos_file(&self) -> PathBuf {
        self.data_dir.join("repos.json")
    }

    pub fn settings_file(&self) -> PathBuf {
        self.data_dir.join("settings.json")
    }

    pub fn queue_cli_action(&self, action: protocol::UrlAction) {
        *self.pending_cli_action.lock().unwrap() = Some(action);
    }

    pub fn take_cli_action(&self) -> Option<protocol::UrlAction> {
        self.pending_cli_action.lock().unwrap().take()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_sidebar_width")]
    pub sidebar_width: u32,
    #[serde(default = "default_file_list_width")]
    pub file_list_width: u32,
    #[serde(default = "default_right_rail_width")]
    pub right_rail_width: u32,
    #[serde(default = "default_terminal_height")]
    pub terminal_height: u32,
    #[serde(default = "default_ai_provider")]
    pub ai_provider: String,
    #[serde(default = "default_ai_model")]
    pub ai_model: String,
    #[serde(default = "default_kilo_base_url")]
    pub kilo_base_url: String,
}

fn default_theme() -> String {
    "system".into()
}
fn default_sidebar_width() -> u32 {
    256
}
fn default_file_list_width() -> u32 {
    280
}
fn default_right_rail_width() -> u32 {
    224
}
fn default_terminal_height() -> u32 {
    192
}
fn default_ai_provider() -> String {
    "opencode".into()
}
fn default_ai_model() -> String {
    "deepseek-v4-flash-free".into()
}
fn default_kilo_base_url() -> String {
    "https://api.kilo.ai/v1".into()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            sidebar_width: default_sidebar_width(),
            file_list_width: default_file_list_width(),
            right_rail_width: default_right_rail_width(),
            terminal_height: default_terminal_height(),
            ai_provider: default_ai_provider(),
            ai_model: default_ai_model(),
            kilo_base_url: default_kilo_base_url(),
        }
    }
}

pub fn run() {
    env_config::load_env_files(&[]);

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
                let mut i = 0;
                while i < argv.len() {
                    let arg = &argv[i];
                    if arg.starts_with("gitlurk://") {
                        protocol::handle_deep_link(app, arg);
                    } else if arg.starts_with("--open-local=") {
                        let path = arg.trim_start_matches("--open-local=").to_string();
                        let action = protocol::UrlAction::OpenLocalRepo {
                            path,
                            branch: None,
                        };
                        if let Some(state) = app.try_state::<AppState>() {
                            state.queue_cli_action(action.clone());
                        }
                        emit_to_main(app, "cli-action", action);
                    } else if arg == "--open-local" {
                        if let Some(path) = argv.get(i + 1) {
                            let action = protocol::UrlAction::OpenLocalRepo {
                                path: path.clone(),
                                branch: None,
                            };
                            if let Some(state) = app.try_state::<AppState>() {
                                state.queue_cli_action(action.clone());
                            }
                            emit_to_main(app, "cli-action", action);
                            i += 1;
                        }
                    } else if arg.starts_with("--clone=") {
                        let url = arg.trim_start_matches("--clone=").to_string();
                        let action = protocol::UrlAction::Clone { url };
                        if let Some(state) = app.try_state::<AppState>() {
                            state.queue_cli_action(action.clone());
                        }
                        emit_to_main(app, "cli-action", action);
                    }
                    i += 1;
                }
            },
        ));
    }

    builder
        .setup(|app| {
            let mut env_paths = Vec::new();
            if let Ok(resource_dir) = app.path().resource_dir() {
                env_paths.push(resource_dir.join("oauth.env"));
            }
            if let Ok(app_data) = app.path().app_data_dir() {
                env_paths.push(app_data.join(".env"));
            }
            if let Ok(exe) = std::env::current_exe() {
                if let Some(dir) = exe.parent() {
                    env_paths.push(dir.join(".env"));
                }
            }
            env_config::load_env_files(&env_paths);

            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&data_dir).ok();

            let state = AppState::new(data_dir.clone());
            app.manage(state);

            let state = app.state::<AppState>();
            commands::auth::init_auth(state);

            let mut bundled_paths = Vec::new();
            if let Ok(resource_dir) = app.path().resource_dir() {
                bundled_paths.push(resource_dir.join("git").join("cmd").join("git.exe"));
                bundled_paths.push(resource_dir.join("git").join("bin").join("git.exe"));
            }
            if let Ok(exe) = std::env::current_exe() {
                if let Some(dir) = exe.parent() {
                    bundled_paths.push(dir.join("resources").join("git").join("cmd").join("git.exe"));
                }
            }
            app.state::<AppState>().git.set_bundled_search_paths(bundled_paths);

            tray::setup_tray(app.handle())?;
            if let Err(err) = registry::register_explorer_menu_if_enabled(app.handle()) {
                eprintln!("Explorer context menu registration failed: {err}");
            }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(err) = mcp_server::start_mcp_server(handle).await {
                    eprintln!("MCP server error: {err}");
                }
            });

            if let Some(action) = registry::parse_cli_args() {
                // Store for the frontend to pick up after listeners are ready —
                // emitting here races the webview boot and drops --open-local.
                app.state::<AppState>().queue_cli_action(action.clone());
                emit_to_main(app.handle(), "cli-action", action);
            }

            #[cfg(desktop)]
            {
                app.deep_link().register("gitlurk")?;
                if let Ok(Some(urls)) = app.deep_link().get_current() {
                    for url in urls {
                        protocol::handle_deep_link(app.handle(), url.as_ref());
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
            commands::git::git_diff,
            commands::dialog::dialog_open_directory,
            commands::dialog::dialog_save_directory,
            commands::app::app_get_repos,
            commands::app::app_save_repos,
            commands::app::app_get_settings,
            commands::app::app_set_settings,
            commands::app::app_take_pending_action,
            commands::app::app_get_theme,
            commands::app::app_set_theme,
            commands::app::app_get_explorer_menu,
            commands::app::app_set_explorer_menu,
            commands::auth::auth_github_device_start,
            commands::auth::auth_github_device_poll,
            commands::auth::auth_get_token,
            commands::auth::auth_logout,
            commands::github::github_list_prs,
            commands::github::github_list_notifications,
            commands::github::github_mark_notification_read,
            commands::github::github_list_feed,
            commands::github::github_search_repos,
            commands::github::github_trending,
            commands::ai::ai_set_api_key,
            commands::ai::ai_has_api_key,
            commands::ai::ai_list_models,
            commands::ai::ai_generate_commit_message,
            commands::ai::ai_test_connection,
            commands::shell::shell_open_external,
            commands::shell::shell_open_terminal,
            commands::shell::shell_reveal_in_explorer,
            commands::terminal::terminal_spawn,
            commands::terminal::terminal_write,
            commands::terminal::terminal_resize,
            commands::terminal::terminal_kill,
            commands::plugins::plugins_list_marketplace,
            commands::plugins::plugins_list_installed,
            commands::plugins::plugins_install,
            commands::plugins::plugins_invoke,
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
