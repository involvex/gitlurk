import type { StateCreator } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemePreset =
  'github-dark' | 'github-light' | 'dim' | 'high-contrast';
export type AppMode = 'workspace' | 'discover';
export type WorkspaceTab = 'overview' | 'changes' | 'history';
export type DiscoverTab =
  'notifications' | 'feed' | 'explore' | 'trending' | 'my-repos';
export type AiProvider = 'opencode' | 'kilo';
export type TerminalShell = 'pwsh' | 'powershell' | 'cmd' | 'custom';

export interface TerminalSessionInfo {
  id: string;
  title: string;
}

export interface AuthDialogState {
  userCode: string;
  verificationUri: string;
  status: string;
}

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'installed'
  | 'error';

export interface UpdateState {
  phase: UpdatePhase;
  version?: string;
  currentVersion?: string;
  notes?: string | null;
  received?: number;
  total?: number | null;
  error?: string;
}

export interface UiSlice {
  theme: ThemeMode;
  themePreset: ThemePreset;
  resolvedTheme: 'light' | 'dark';
  showCloneDialog: boolean;
  showTerminal: boolean;
  showPlugins: boolean;
  showSettings: boolean;
  showGhRunWatch: boolean;
  ghRunWatchLog: string;
  ghRunWatchRunning: boolean;
  ghRunWatchPath: string | null;
  ghRunView: import('@gitlurk/shared').IpcResponses['dev:gh-run-view'] | null;
  ghRunViewLoading: boolean;
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
  terminalPwshPath: string;
  terminalSessions: TerminalSessionInfo[];
  activeTerminalSessionId: string | null;
  unreadNotifications: number;
  workspaceTab: WorkspaceTab;
  showCommandPalette: boolean;
  showOnboarding: boolean;
  showWhatsNew: boolean;
  showUpdateDialog: boolean;
  updateCheck: UpdateState;
  sidebarCollapsed: boolean;
  backgroundFetchEnabled: boolean;
  backgroundFetchIntervalMin: number;
  desktopNotifications: boolean;
  notificationSoundEnabled: boolean;
  autoRefreshOnChange: boolean;
  onboardingCompleted: boolean;
  hotkeyShowApp: string;
  hotkeyCommandPalette: string;
  defaultCloneDir: string;
  commitTemplate: string | null;
  pendingDiscard:
    | { type: 'discard-file'; file: string; kind: import('./git-ops').DiffKind }
    | { type: 'discard-all-unstaged' }
    | { type: 'discard-all-untracked' }
    | null;
  setTheme: (theme: ThemeMode) => void;
  setThemePreset: (preset: ThemePreset) => void;
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
  setGhRunView: (
    view: import('@gitlurk/shared').IpcResponses['dev:gh-run-view'] | null,
  ) => void;
  setGhRunViewLoading: (loading: boolean) => void;
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
  setTerminalPwshPath: (path: string) => void;
  setTerminalSessions: (sessions: TerminalSessionInfo[]) => void;
  setActiveTerminalSessionId: (id: string | null) => void;
  setUnreadNotifications: (count: number) => void;
  setWorkspaceTab: (tab: WorkspaceTab) => void;
  setShowCommandPalette: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setShowWhatsNew: (show: boolean) => void;
  setShowUpdateDialog: (show: boolean) => void;
  setUpdateCheck: (partial: Partial<UpdateState>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBackgroundFetchEnabled: (enabled: boolean) => void;
  setBackgroundFetchIntervalMin: (minutes: number) => void;
  setDesktopNotifications: (enabled: boolean) => void;
  setNotificationSoundEnabled: (enabled: boolean) => void;
  setAutoRefreshOnChange: (enabled: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setHotkeyShowApp: (hotkey: string) => void;
  setHotkeyCommandPalette: (hotkey: string) => void;
  setDefaultCloneDir: (dir: string) => void;
  setCommitTemplate: (template: string | null) => void;
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
    terminalPwshPath?: string;
    backgroundFetchEnabled?: boolean;
    backgroundFetchIntervalMin?: number;
    desktopNotifications?: boolean;
    notificationSoundEnabled?: boolean;
    autoRefreshOnChange?: boolean;
    onboardingCompleted?: boolean;
    themePreset?: ThemePreset;
    hotkeyShowApp?: string;
    hotkeyCommandPalette?: string;
    defaultCloneDir?: string;
  }) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  theme: 'system',
  themePreset: 'github-dark',
  resolvedTheme: 'dark',
  showCloneDialog: false,
  showTerminal: false,
  showPlugins: false,
  showSettings: false,
  showGhRunWatch: false,
  ghRunWatchLog: '',
  ghRunWatchRunning: false,
  ghRunWatchPath: null,
  ghRunView: null,
  ghRunViewLoading: false,
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
  terminalPwshPath: '',
  terminalSessions: [],
  activeTerminalSessionId: null,
  unreadNotifications: 0,
  workspaceTab: 'overview',
  showCommandPalette: false,
  showOnboarding: false,
  showWhatsNew: false,
  showUpdateDialog: false,
  updateCheck: { phase: 'idle' },
  sidebarCollapsed: false,
  backgroundFetchEnabled: true,
  backgroundFetchIntervalMin: 15,
  desktopNotifications: true,
  notificationSoundEnabled: true,
  autoRefreshOnChange: true,
  onboardingCompleted: false,
  hotkeyShowApp: 'Ctrl+Alt+G',
  hotkeyCommandPalette: 'Ctrl+Shift+P',
  defaultCloneDir: '',
  pendingDiscard: null,
  commitTemplate: null,
  setTheme: (theme) => set({ theme }),
  setThemePreset: (themePreset) => set({ themePreset }),
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
  setGhRunView: (ghRunView) => set({ ghRunView }),
  setGhRunViewLoading: (ghRunViewLoading) => set({ ghRunViewLoading }),
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
  setTerminalPwshPath: (terminalPwshPath) => set({ terminalPwshPath }),
  setTerminalSessions: (terminalSessions) => set({ terminalSessions }),
  setActiveTerminalSessionId: (activeTerminalSessionId) =>
    set({ activeTerminalSessionId }),
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  setWorkspaceTab: (workspaceTab) => set({ workspaceTab }),
  setShowCommandPalette: (showCommandPalette) => set({ showCommandPalette }),
  setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
  setShowWhatsNew: (showWhatsNew) => set({ showWhatsNew }),
  setShowUpdateDialog: (showUpdateDialog) => set({ showUpdateDialog }),
  setUpdateCheck: (partial) =>
    set((state) => ({ updateCheck: { ...state.updateCheck, ...partial } })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setBackgroundFetchEnabled: (backgroundFetchEnabled) =>
    set({ backgroundFetchEnabled }),
  setBackgroundFetchIntervalMin: (backgroundFetchIntervalMin) =>
    set({ backgroundFetchIntervalMin }),
  setDesktopNotifications: (desktopNotifications) =>
    set({ desktopNotifications }),
  setNotificationSoundEnabled: (notificationSoundEnabled) =>
    set({ notificationSoundEnabled }),
  setAutoRefreshOnChange: (autoRefreshOnChange) => set({ autoRefreshOnChange }),
  setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
  setHotkeyShowApp: (hotkeyShowApp) => set({ hotkeyShowApp }),
  setHotkeyCommandPalette: (hotkeyCommandPalette) =>
    set({ hotkeyCommandPalette }),
  setDefaultCloneDir: (defaultCloneDir) => set({ defaultCloneDir }),
  setCommitTemplate: (commitTemplate) => set({ commitTemplate }),
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
      ...(typeof settings.terminalPwshPath === 'string'
        ? { terminalPwshPath: settings.terminalPwshPath }
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
      ...(typeof settings.notificationSoundEnabled === 'boolean'
        ? { notificationSoundEnabled: settings.notificationSoundEnabled }
        : {}),
      ...(typeof settings.autoRefreshOnChange === 'boolean'
        ? { autoRefreshOnChange: settings.autoRefreshOnChange }
        : {}),
      ...(typeof settings.onboardingCompleted === 'boolean'
        ? { onboardingCompleted: settings.onboardingCompleted }
        : {}),
      ...(settings.themePreset ? { themePreset: settings.themePreset } : {}),
      ...(settings.hotkeyShowApp
        ? { hotkeyShowApp: settings.hotkeyShowApp }
        : {}),
      ...(settings.hotkeyCommandPalette
        ? { hotkeyCommandPalette: settings.hotkeyCommandPalette }
        : {}),
      ...(typeof settings.defaultCloneDir === 'string'
        ? { defaultCloneDir: settings.defaultCloneDir }
        : {}),
    }),
});
