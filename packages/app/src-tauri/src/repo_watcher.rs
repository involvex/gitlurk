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

fn path_should_ignore(path: &Path) -> bool {
    path.components().any(|component| match component {
        std::path::Component::Normal(name) => {
            let name = name.to_string_lossy();
            name.eq_ignore_ascii_case(".git")
                || name.eq_ignore_ascii_case("node_modules")
                || name.eq_ignore_ascii_case("target")
                || name.eq_ignore_ascii_case(".next")
                || name.eq_ignore_ascii_case("dist")
        }
        _ => false,
    })
}

fn event_should_ignore(event: &notify::Event) -> bool {
    if event.paths.is_empty() {
        return false;
    }
    event.paths.iter().all(|path| path_should_ignore(path))
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
                        // Longer coalesce window to avoid stacking git ops.
                        if last_emit.elapsed() >= Duration::from_millis(1500) {
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
                            if event_should_ignore(&event) {
                                return;
                            }
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
