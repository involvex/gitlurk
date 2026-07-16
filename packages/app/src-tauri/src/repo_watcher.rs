use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

pub struct RepoWatcher {
    inner: Mutex<Option<WatcherHandle>>,
}

struct WatcherHandle {
    _watcher: RecommendedWatcher,
    stop_tx: mpsc::Sender<()>,
}

impl RepoWatcher {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    pub fn watch(&self, app: AppHandle, path: PathBuf) {
        self.stop();
        if !path.exists() {
            return;
        }

        let (event_tx, event_rx) = mpsc::channel();
        let (stop_tx, stop_rx) = mpsc::channel();

        let app_for_events = app.clone();
        thread::spawn(move || {
            let mut last_emit = std::time::Instant::now()
                .checked_sub(Duration::from_secs(1))
                .unwrap_or_else(std::time::Instant::now);
            loop {
                match event_rx.recv_timeout(Duration::from_millis(400)) {
                    Ok(()) => {
                        if last_emit.elapsed() >= Duration::from_millis(750) {
                            let _ = app_for_events.emit("repo-changed", ());
                            last_emit = std::time::Instant::now();
                        }
                    }
                    Err(RecvTimeoutError::Timeout) => {
                        if stop_rx.try_recv().is_ok() {
                            break;
                        }
                    }
                    Err(RecvTimeoutError::Disconnected) => break,
                }
            }
        });

        let event_tx_for_notify = event_tx.clone();
        let watcher = RecommendedWatcher::new(
            move |result: notify::Result<notify::Event>| {
                if let Ok(event) = result {
                    match event.kind {
                        EventKind::Create(_)
                        | EventKind::Modify(_)
                        | EventKind::Remove(_) => {
                            let _ = event_tx_for_notify.send(());
                        }
                        _ => {}
                    }
                }
            },
            Config::default(),
        );

        let watcher = match watcher {
            Ok(mut w) => {
                if w.watch(&path, RecursiveMode::Recursive).is_err() {
                    return;
                }
                w
            }
            Err(_) => return,
        };

        *self.inner.lock().unwrap() = Some(WatcherHandle {
            _watcher: watcher,
            stop_tx,
        });
    }

    pub fn stop(&self) {
        if let Some(handle) = self.inner.lock().unwrap().take() {
            let _ = handle.stop_tx.send(());
        }
    }
}

impl Default for RepoWatcher {
    fn default() -> Self {
        Self::new()
    }
}

pub fn watch_repo(app: AppHandle, watcher: &RepoWatcher, path: &Path) {
    watcher.watch(app, path.to_path_buf());
}
