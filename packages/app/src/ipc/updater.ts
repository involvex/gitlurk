import { check, type Update } from '@tauri-apps/plugin-updater';
import { runningInTauri } from './client';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  notes: string | null;
}

export interface DownloadProgress {
  received: number;
  total: number | null;
}

let pendingUpdate: Update | null = null;

/** Checks the configured updater endpoint. Returns null when up to date. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!runningInTauri()) {
    throw new Error('Updates are only available in the desktop app.');
  }
  const update = await check();
  pendingUpdate = update;
  if (!update) return null;
  return {
    version: update.version,
    currentVersion: update.currentVersion,
    notes: update.body ?? null,
  };
}

/**
 * Downloads and installs the previously found update. On Windows the new
 * version is applied on the next app restart (no auto-relaunch).
 */
export async function downloadAndInstallUpdate(
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  if (!runningInTauri()) {
    throw new Error('Updates are only available in the desktop app.');
  }
  let update = pendingUpdate;
  if (!update) {
    update = await check();
  }
  pendingUpdate = null;
  if (!update) {
    throw new Error('No update is available to install.');
  }

  let received = 0;
  let total: number | null = null;
  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      received = 0;
      total = event.data.contentLength ?? null;
    } else if (event.event === 'Progress') {
      received += event.data.chunkLength;
    }
    onProgress?.({ received, total });
  });
}
