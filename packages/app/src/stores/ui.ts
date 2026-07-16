import type { StateCreator } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AppMode = 'workspace' | 'discover';
export type WorkspaceTab = 'changes' | 'history';
export type DiscoverTab = 'notifications' | 'feed' | 'explore' | 'trending';
export type AiProvider = 'opencode' | 'kilo';
export type TerminalShell = 'pwsh' | 'powershell' | 'cmd' | 'custom';

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
  showGhRunWatch: boolean;
  ghRunWatchLog: string;
  ghRunWatchRunning: boolean;
  ghRunWatchPath: string | null;
  explorerMenuEnabled: boolean;
  toast: string | null;
  authDialog: AuthDialogState | null;
  appMode: AppMode;
  discoverTab: DiscoverTab;
  sidebarWidth: number;
  fileListWidth: number;
  rightRailWidth: number;
  terminalHeight: number;
  aiProvider: AiProvider;
  aiModel: string;
  kiloBaseUrl: string;
  minimizeToTray: boolean;
  terminalShell: TerminalShell;
  terminalShellPath: string;
  unreadNotifications: number;
  workspaceTab: WorkspaceTab;
  showCommandPalette: boolean;
  showOnboarding: boolean;
  sidebarCollapsed: boolean;
  backgroundFetchEnabled: boolean;
  backgroundFetchIntervalMin: number;
  desktopNotifications: boolean;
  autoRefreshOnChange: boolean;
  onboardingCompleted: boolean;
  pendingDiscard:
    | { type: 'discard-file'; file: string; kind: import('./git-ops').DiffKind }
    | { type: 'discard-all-unstaged' }
    | { type: 'discard-all-untracked' }
    | null;
  setTheme: (theme: ThemeMode) => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;
  setShowCloneDialog: (show: boolean) => void;
  setShowTerminal: (show: boolean) => void;
  setShowPlugins: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowGhRunWatch: (show: boolean) => void;
  appendGhRunWatchLog: (chunk: string) => void;
  clearGhRunWatchLog: () => void;
  setGhRunWatchRunning: (running: boolean) => void;
  setGhRunWatchPath: (path: string | null) => void;
  setExplorerMenuEnabled: (enabled: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setAuthDialog: (dialog: AuthDialogState | null) => void;
  setAuthDialogStatus: (status: string) => void;
  setAppMode: (mode: AppMode) => void;
  setDiscoverTab: (tab: DiscoverTab) => void;
  setSidebarWidth: (width: number) => void;
  setFileListWidth: (width: number) => void;
  setRightRailWidth: (width: number) => void;
  setTerminalHeight: (height: number) => void;
  setAiProvider: (provider: AiProvider) => void;
  setAiModel: (model: string) => void;
  setKiloBaseUrl: (url: string) => void;
  setMinimizeToTray: (enabled: boolean) => void;
  setTerminalShell: (shell: TerminalShell) => void;
  setTerminalShellPath: (path: string) => void;
  setUnreadNotifications: (count: number) => void;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  setShowCommandPalette: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBackgroundFetchEnabled: (enabled: boolean) => void;
  setBackgroundFetchIntervalMin: (minutes: number) => void;
  setDesktopNotifications: (enabled: boolean) => void;
  setAutoRefreshOnChange: (enabled: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setPendingDiscard: (
    pending:
      | {
          type: 'discard-file';
          file: string;
          kind: import('./git-ops').DiffKind;
        }
      | { type: 'discard-all-unstaged' }
      | { type: 'discard-all-untracked' }
      | null,
  ) => void;
  applyPanelSettings: (settings: {
    sidebarWidth: number;
    fileListWidth: number;
    rightRailWidth: number;
    terminalHeight: number;
    aiProvider: AiProvider;
    aiModel: string;
    kiloBaseUrl: string;
    minimizeToTray?: boolean;
    terminalShell?: TerminalShell;
    terminalShellPath?: string;
    backgroundFetchEnabled?: boolean;
    backgroundFetchIntervalMin?: number;
    desktopNotifications?: boolean;
    autoRefreshOnChange?: boolean;
    onboardingCompleted?: boolean;
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
  showGhRunWatch: false,
  ghRunWatchLog: '',
  ghRunWatchRunning: false,
  ghRunWatchPath: null,
  explorerMenuEnabled: false,
  toast: null,
  authDialog: null,
  appMode: 'workspace',
  discoverTab: 'notifications',
  sidebarWidth: 256,
  fileListWidth: 280,
  rightRailWidth: 224,
  terminalHeight: 192,
  aiProvider: 'opencode',
  aiModel: 'deepseek-v4-flash-free',
  kiloBaseUrl: 'https://api.kilo.ai/v1',
  minimizeToTray: false,
  terminalShell: 'powershell',
  terminalShellPath: '',
  unreadNotifications: 0,
  workspaceTab: 'changes',
  showCommandPalette: false,
  showOnboarding: false,
  sidebarCollapsed: false,
  backgroundFetchEnabled: true,
  backgroundFetchIntervalMin: 15,
  desktopNotifications: true,
  autoRefreshOnChange: true,
  onboardingCompleted: false,
  pendingDiscard: null,
  setTheme: (theme) => set({ theme }),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  setShowCloneDialog: (show) => set({ showCloneDialog: show }),
  setShowTerminal: (show) => set({ showTerminal: show }),
  setShowPlugins: (show) => set({ showPlugins: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowGhRunWatch: (show) => set({ showGhRunWatch: show }),
  appendGhRunWatchLog: (chunk) =>
    set((state) => ({ ghRunWatchLog: state.ghRunWatchLog + chunk })),
  clearGhRunWatchLog: () => set({ ghRunWatchLog: '' }),
  setGhRunWatchRunning: (ghRunWatchRunning) => set({ ghRunWatchRunning }),
  setGhRunWatchPath: (ghRunWatchPath) => set({ ghRunWatchPath }),
  setExplorerMenuEnabled: (enabled) => set({ explorerMenuEnabled: enabled }),
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
  setAuthDialog: (authDialog) => set({ authDialog }),
  setAuthDialogStatus: (status) =>
    set((state) =>
      state.authDialog ? { authDialog: { ...state.authDialog, status } } : {},
    ),
  setAppMode: (appMode) => set({ appMode }),
  setDiscoverTab: (discoverTab) => set({ discoverTab }),
  setSidebarWidth: (width) => set({ sidebarWidth: clamp(width, 180, 420) }),
  setFileListWidth: (width) => set({ fileListWidth: clamp(width, 180, 480) }),
  setRightRailWidth: (width) => set({ rightRailWidth: clamp(width, 160, 400) }),
  setTerminalHeight: (height) =>
    set({ terminalHeight: clamp(height, 120, 480) }),
  setAiProvider: (aiProvider) => set({ aiProvider }),
  setAiModel: (aiModel) => set({ aiModel }),
  setKiloBaseUrl: (kiloBaseUrl) => set({ kiloBaseUrl }),
  setMinimizeToTray: (minimizeToTray) => set({ minimizeToTray }),
  setTerminalShell: (terminalShell) => set({ terminalShell }),
  setTerminalShellPath: (terminalShellPath) => set({ terminalShellPath }),
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  setWorkspaceTab: (workspaceTab) => set({ workspaceTab }),
  setShowCommandPalette: (showCommandPalette) => set({ showCommandPalette }),
  setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setBackgroundFetchEnabled: (backgroundFetchEnabled) =>
    set({ backgroundFetchEnabled }),
  setBackgroundFetchIntervalMin: (backgroundFetchIntervalMin) =>
    set({ backgroundFetchIntervalMin }),
  setDesktopNotifications: (desktopNotifications) =>
    set({ desktopNotifications }),
  setAutoRefreshOnChange: (autoRefreshOnChange) => set({ autoRefreshOnChange }),
  setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
  setPendingDiscard: (pendingDiscard) => set({ pendingDiscard }),
  applyPanelSettings: (settings) =>
    set({
      sidebarWidth: clamp(settings.sidebarWidth, 180, 420),
      fileListWidth: clamp(settings.fileListWidth, 180, 480),
      rightRailWidth: clamp(settings.rightRailWidth, 160, 400),
      terminalHeight: clamp(settings.terminalHeight, 120, 480),
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel,
      kiloBaseUrl: settings.kiloBaseUrl,
      ...(typeof settings.minimizeToTray === 'boolean'
        ? { minimizeToTray: settings.minimizeToTray }
        : {}),
      ...(settings.terminalShell
        ? { terminalShell: settings.terminalShell }
        : {}),
      ...(typeof settings.terminalShellPath === 'string'
        ? { terminalShellPath: settings.terminalShellPath }
        : {}),
      ...(typeof settings.backgroundFetchEnabled === 'boolean'
        ? { backgroundFetchEnabled: settings.backgroundFetchEnabled }
        : {}),
      ...(typeof settings.backgroundFetchIntervalMin === 'number'
        ? { backgroundFetchIntervalMin: settings.backgroundFetchIntervalMin }
        : {}),
      ...(typeof settings.desktopNotifications === 'boolean'
        ? { desktopNotifications: settings.desktopNotifications }
        : {}),
      ...(typeof settings.autoRefreshOnChange === 'boolean'
        ? { autoRefreshOnChange: settings.autoRefreshOnChange }
        : {}),
      ...(typeof settings.onboardingCompleted === 'boolean'
        ? { onboardingCompleted: settings.onboardingCompleted }
        : {}),
    }),
});
