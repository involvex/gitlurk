use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub struct PtySessionManager {
    sessions: Mutex<HashMap<String, PtySessionHandle>>,
}

struct PtySessionHandle {
    writer: Box<dyn Write + Send>,
}

#[derive(Clone, Serialize)]
pub struct TerminalOutputEvent {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub data: String,
}

impl PtySessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn spawn(
        &self,
        app: AppHandle,
        cwd: String,
        cols: u16,
        rows: u16,
    ) -> Result<String, String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new("powershell.exe");
        cmd.cwd(cwd);
        let _child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| e.to_string())?;
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        let session_id = Uuid::new_v4().to_string();
        let session_id_for_thread = session_id.clone();

        std::thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(count) => {
                        let data = String::from_utf8_lossy(&buffer[..count]).to_string();
                        let _ = app.emit(
                            "terminal-output",
                            TerminalOutputEvent {
                                session_id: session_id_for_thread.clone(),
                                data,
                            },
                        );
                    }
                    Err(_) => break,
                }
            }
        });

        self.sessions.lock().unwrap().insert(
            session_id.clone(),
            PtySessionHandle { writer },
        );

        Ok(session_id)
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| "Terminal session not found".to_string())?;
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let _ = (session_id, cols, rows);
        Ok(())
    }

    pub fn kill(&self, session_id: &str) -> Result<(), String> {
        self.sessions.lock().unwrap().remove(session_id);
        Ok(())
    }
}
