import type { StateCreator } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UiSlice {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  showCloneDialog: boolean;
  showTerminal: boolean;
  toast: string | null;
  setTheme: (theme: ThemeMode) => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;
  setShowCloneDialog: (show: boolean) => void;
  setShowTerminal: (show: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  theme: 'system',
  resolvedTheme: 'dark',
  showCloneDialog: false,
  showTerminal: false,
  toast: null,
  setTheme: (theme) => set({ theme }),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  setShowCloneDialog: (show) => set({ showCloneDialog: show }),
  setShowTerminal: (show) => set({ showTerminal: show }),
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
});
