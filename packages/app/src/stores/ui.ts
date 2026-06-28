import type { StateCreator } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UiSlice {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  showCloneDialog: boolean;
  showTerminal: boolean;
  showPlugins: boolean;
  explorerMenuEnabled: boolean;
  toast: string | null;
  setTheme: (theme: ThemeMode) => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;
  setShowCloneDialog: (show: boolean) => void;
  setShowTerminal: (show: boolean) => void;
  setShowPlugins: (show: boolean) => void;
  setExplorerMenuEnabled: (enabled: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  theme: 'system',
  resolvedTheme: 'dark',
  showCloneDialog: false,
  showTerminal: false,
  showPlugins: false,
  explorerMenuEnabled: false,
  toast: null,
  setTheme: (theme) => set({ theme }),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  setShowCloneDialog: (show) => set({ showCloneDialog: show }),
  setShowTerminal: (show) => set({ showTerminal: show }),
  setShowPlugins: (show) => set({ showPlugins: show }),
  setExplorerMenuEnabled: (enabled) => set({ explorerMenuEnabled: enabled }),
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
});
