import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { IpcChannels, IpcResponses, IpcEvents } from '@gitlurk/shared';

/** Maps typed channels (`git:status`) to Tauri command names (`git_status`). */
export function channelToCommand(channel: string): string {
  return channel.replace(/[:-]/g, '_');
}

export function runningInTauri(): boolean {
  return isTauri();
}

export async function ipcInvoke<
  K extends keyof IpcChannels & keyof IpcResponses,
>(channel: K, payload: IpcChannels[K]): Promise<IpcResponses[K]> {
  if (!isTauri()) {
    throw new Error(
      'GitLurk must run inside the desktop app. Use: bun run tauri:dev',
    );
  }
  return invoke(channelToCommand(String(channel)), payload);
}

export function onEvent<K extends keyof IpcEvents>(
  event: K,
  handler: (payload: IpcEvents[K]) => void,
) {
  return listen<IpcEvents[K]>(String(event), (e) => handler(e.payload));
}
