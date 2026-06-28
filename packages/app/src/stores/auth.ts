import type { StateCreator } from 'zustand';

export interface AuthSlice {
  username: string | null;
  isAuthenticating: boolean;
  setAuth: (username: string | null) => void;
  setAuthenticating: (value: boolean) => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  username: null,
  isAuthenticating: false,
  setAuth: (username) => set({ username }),
  setAuthenticating: (value) => set({ isAuthenticating: value }),
});
