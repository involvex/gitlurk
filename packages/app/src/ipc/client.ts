import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { IpcChannels, IpcResponses, IpcEvents } from '@mygit/shared';

export async function ipcInvoke<
  K extends keyof IpcChannels & keyof IpcResponses,
>(channel: K, payload: IpcChannels[K]): Promise<IpcResponses[K]> {
  return invoke(String(channel), payload);
}

export function onEvent<K extends keyof IpcEvents>(
  event: K,
  handler: (payload: IpcEvents[K]) => void,
) {
  return listen<IpcEvents[K]>(String(event), (e) => handler(e.payload));
}
