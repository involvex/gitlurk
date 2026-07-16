import type { StateCreator } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AppMode = 'workspace' | 'discover';
export type AiProvider = 'opencode' | 'kilo';

export interface AuthDialogState {
  userCode: string;
  verificationUri: string;
  status: string;
}

export interface UiSlice {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  showCloneDialog: boolean;
  showTerminal: boolean;
  showPlugins: boolean;
  showSettings: boolean;
  explorerMenuEnabled: boolean;
  toast: string | null;
  authDialog: AuthDialogState | null;
  appMode: AppMode;
  sidebarWidth: number;
  fileListWidth: number;
  rightRailWidth: number;
  terminalHeight: number;
  aiProvider: AiProvider;
  aiModel: string;
  kiloBaseUrl: string;
  unreadNotifications: number;
  setTheme: (theme: ThemeMode) => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;
  setShowCloneDialog: (show: boolean) => void;
  setShowTerminal: (show: boolean) => void;
  setShowPlugins: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setExplorerMenuEnabled: (enabled: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setAuthDialog: (dialog: AuthDialogState | null) => void;
  setAuthDialogStatus: (status: string) => void;
  setAppMode: (mode: AppMode) => void;
  setSidebarWidth: (width: number) => void;
  setFileListWidth: (width: number) => void;
  setRightRailWidth: (width: number) => void;
  setTerminalHeight: (height: number) => void;
  setAiProvider: (provider: AiProvider) => void;
  setAiModel: (model: string) => void;
  setKiloBaseUrl: (url: string) => void;
  setUnreadNotifications: (count: number) => void;
  applyPanelSettings: (settings: {
    sidebarWidth: number;
    fileListWidth: number;
    rightRailWidth: number;
    terminalHeight: number;
    aiProvider: AiProvider;
    aiModel: string;
    kiloBaseUrl: string;
  }) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  theme: 'system',
  resolvedTheme: 'dark',
  showCloneDialog: false,
  showTerminal: false,
  showPlugins: false,
  showSettings: false,
  explorerMenuEnabled: false,
  toast: null,
  authDialog: null,
  appMode: 'workspace',
  sidebarWidth: 256,
  fileListWidth: 280,
  rightRailWidth: 224,
  terminalHeight: 192,
  aiProvider: 'opencode',
  aiModel: 'deepseek-v4-flash-free',
  kiloBaseUrl: 'https://api.kilo.ai/v1',
  unreadNotifications: 0,
  setTheme: (theme) => set({ theme }),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  setShowCloneDialog: (show) => set({ showCloneDialog: show }),
  setShowTerminal: (show) => set({ showTerminal: show }),
  setShowPlugins: (show) => set({ showPlugins: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setExplorerMenuEnabled: (enabled) => set({ explorerMenuEnabled: enabled }),
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
  setAuthDialog: (authDialog) => set({ authDialog }),
  setAuthDialogStatus: (status) =>
    set((state) =>
      state.authDialog ? { authDialog: { ...state.authDialog, status } } : {},
    ),
  setAppMode: (appMode) => set({ appMode }),
  setSidebarWidth: (width) => set({ sidebarWidth: clamp(width, 180, 420) }),
  setFileListWidth: (width) => set({ fileListWidth: clamp(width, 180, 480) }),
  setRightRailWidth: (width) => set({ rightRailWidth: clamp(width, 160, 400) }),
  setTerminalHeight: (height) =>
    set({ terminalHeight: clamp(height, 120, 480) }),
  setAiProvider: (aiProvider) => set({ aiProvider }),
  setAiModel: (aiModel) => set({ aiModel }),
  setKiloBaseUrl: (kiloBaseUrl) => set({ kiloBaseUrl }),
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  applyPanelSettings: (settings) =>
    set({
      sidebarWidth: clamp(settings.sidebarWidth, 180, 420),
      fileListWidth: clamp(settings.fileListWidth, 180, 480),
      rightRailWidth: clamp(settings.rightRailWidth, 160, 400),
      terminalHeight: clamp(settings.terminalHeight, 120, 480),
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel,
      kiloBaseUrl: settings.kiloBaseUrl,
    }),
});
