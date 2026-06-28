use keyring::Entry;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::env_config;
use crate::AppState;

const SERVICE: &str = "mygit-desktop";

pub fn init_auth(state: State<'_, AppState>) {
    let _ = auth_get_token(state);
}

#[derive(Serialize, Deserialize)]
struct DeviceStartResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u64,
    interval: u64,
}

#[derive(Serialize, Deserialize)]
struct DevicePollResponse {
    access_token: Option<String>,
    error: Option<String>,
}

#[tauri::command(rename_all = "camelCase")]
pub fn auth_github_device_start() -> Result<serde_json::Value, String> {
    let client = Client::new();
    let client_id = env_config::github_client_id();
    let response = client
        .post("https://github.com/login/device/code")
        .header("Accept", "application/json")
        .form(&[("client_id", client_id.as_str()), ("scope", "repo read:user")])
        .send()
        .map_err(|e| e.to_string())?;

    let data: DeviceStartResponse = response.json().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "deviceCode": data.device_code,
        "userCode": data.user_code,
        "verificationUri": data.verification_uri,
        "expiresIn": data.expires_in,
        "interval": data.interval,
    }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn auth_github_device_poll(
    state: State<'_, AppState>,
    device_code: String,
) -> Result<serde_json::Value, String> {
    let client = Client::new();
    let client_id = env_config::github_client_id();
    let response = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", client_id.as_str()),
            ("device_code", device_code.as_str()),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .map_err(|e| e.to_string())?;

    let data: DevicePollResponse = response.json().map_err(|e| e.to_string())?;

    if let Some(error) = data.error {
        if error == "authorization_pending" {
            return Ok(serde_json::json!({ "pending": true }));
        }
        if error == "slow_down" {
            return Ok(serde_json::json!({ "slowDown": true }));
        }
        return Ok(serde_json::json!({ "error": error }));
    }

    if let Some(token) = data.access_token {
        store_token(&state, &token)?;
        return Ok(serde_json::json!({ "success": true }));
    }

    Ok(serde_json::json!({ "pending": true }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn auth_get_token(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    if let Ok(entry) = Entry::new(SERVICE, "github") {
        if let Ok(token) = entry.get_password() {
            *state.auth_token.lock().unwrap() = Some(token.clone());
            let username = fetch_username(&token).unwrap_or(None);
            *state.auth_username.lock().unwrap() = username.clone();
            return Ok(serde_json::json!({ "username": username }));
        }
    }

    Ok(serde_json::json!({ "username": null }))
}

#[tauri::command(rename_all = "camelCase")]
pub fn auth_logout(state: State<'_, AppState>) -> Result<(), String> {
    if let Ok(entry) = Entry::new(SERVICE, "github") {
        let _ = entry.delete_credential();
    }
    *state.auth_token.lock().unwrap() = None;
    *state.auth_username.lock().unwrap() = None;
    Ok(())
}

fn store_token(state: &AppState, token: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, "github").map_err(|e| e.to_string())?;
    entry.set_password(token).map_err(|e| e.to_string())?;
    *state.auth_token.lock().unwrap() = Some(token.to_string());
    if let Some(username) = fetch_username(token)? {
        *state.auth_username.lock().unwrap() = Some(username);
    }
    Ok(())
}

fn fetch_username(token: &str) -> Result<Option<String>, String> {
    let client = Client::new();
    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {token}"))
        .header("User-Agent", "MyGit-Desktop")
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Ok(None);
    }

    #[derive(Deserialize)]
    struct User {
        login: String,
    }

    let user: User = response.json().map_err(|e| e.to_string())?;
    Ok(Some(user.login))
}
