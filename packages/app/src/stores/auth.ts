import type { StateCreator } from 'zustand';

export interface AuthSlice {
  token: string | null;
  username: string | null;
  isAuthenticating: boolean;
  setAuth: (token: string | null, username: string | null) => void;
  setAuthenticating: (value: boolean) => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  token: null,
  username: null,
  isAuthenticating: false,
  setAuth: (token, username) => set({ token, username }),
  setAuthenticating: (value) => set({ isAuthenticating: value }),
});
