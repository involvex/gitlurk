/** Match a KeyboardEvent against a hotkey string like "Ctrl+Shift+P". */
export function matchesHotkey(event: KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey
    .split('+')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return false;

  const keyPart = parts[parts.length - 1] ?? '';
  const mods = new Set(parts.slice(0, -1));

  const needCtrl =
    mods.has('ctrl') ||
    mods.has('control') ||
    mods.has('cmd') ||
    mods.has('command') ||
    mods.has('meta') ||
    mods.has('cmdorctrl');
  const needAlt = mods.has('alt') || mods.has('option');
  const needShift = mods.has('shift');

  if (needCtrl !== (event.ctrlKey || event.metaKey)) return false;
  if (needAlt !== event.altKey) return false;
  if (needShift !== event.shiftKey) return false;

  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (keyPart === 'space' || keyPart === ' ') {
    return event.code === 'Space' || eventKey === ' ';
  }
  if (keyPart.startsWith('f') && /^f\d{1,2}$/.test(keyPart)) {
    return eventKey.toLowerCase() === keyPart;
  }
  return eventKey.toLowerCase() === keyPart;
}

/** Build a hotkey label from a KeyboardEvent (for capture UI). */
export function hotkeyFromEvent(event: KeyboardEvent): string | null {
  if (
    event.key === 'Control' ||
    event.key === 'Shift' ||
    event.key === 'Alt' ||
    event.key === 'Meta'
  ) {
    return null;
  }

  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');

  let key = event.key;
  if (key.length === 1) {
    key = key.toUpperCase();
  } else if (key === ' ') {
    key = 'Space';
  }

  parts.push(key);
  return parts.join('+');
}
