use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::{Arc, Mutex};

use tauri::{AppHandle, Manager};

use crate::AppState;

pub async fn start_mcp_server(app: AppHandle) -> Result<(), String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let token = app
        .state::<AppState>()
        .mcp_token
        .clone();

    let token_file = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("mcp-token.txt");
    std::fs::write(&token_file, format!("{port}\n{token}")).map_err(|e| e.to_string())?;

    let app = Arc::new(Mutex::new(app));

    std::thread::spawn(move || {
        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let mut buffer = [0u8; 8192];
                let size = stream.read(&mut buffer).unwrap_or(0);
                if size == 0 {
                    continue;
                }

                let request = String::from_utf8_lossy(&buffer[..size]);
                let auth_ok = request.contains(&format!("Authorization: Bearer {token}"));

                let app_guard = app.lock().unwrap();
                let state = app_guard.state::<AppState>();

                let (status, body) = if !auth_ok {
                    (401, r#"{"error":"unauthorized"}"#.to_string())
                } else if request.contains("GET /api/repos") {
                    match std::fs::read_to_string(state.repos_file()) {
                        Ok(content) => (200, content),
                        Err(_) => (200, r#"{"repos":[]}"#.to_string()),
                    }
                } else if request.contains("GET /health") {
                    (200, r#"{"status":"ok"}"#.to_string())
                } else {
                    (404, r#"{"error":"not found"}"#.to_string())
                };

                let response = format!(
                    "HTTP/1.1 {status} OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = stream.write_all(response.as_bytes());
            }
        }
    });

    Ok(())
}
