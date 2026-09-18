import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { ApiConfigurationError, loadApiConfig } from '@/config/api';
import { createAuthLifecycle, type AuthLifecycle, type AuthState } from './lifecycle';
import { createAuthRuntime } from './runtime';
import { createSecureSessionStorage } from './secure-session-storage';

export type AppAuthState = AuthState | { status: 'configuration-error'; message: string };

type AuthContextValue = {
  state: AppAuthState;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  retryVerification(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function buildLifecycle(): AuthLifecycle | null {
  try {
    const config = loadApiConfig();
    const storage = createSecureSessionStorage(SecureStore, config.sessionStorageKey);
    return createAuthLifecycle({ storage, runtime: createAuthRuntime(config, storage) });
  } catch (error) {
    if (error instanceof ApiConfigurationError) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const lifecycle = useMemo(() => buildLifecycle(), []);
  const [state, setState] = useState<AppAuthState>(() => lifecycle
    ? lifecycle.getState()
    : { status: 'configuration-error', message: 'The API origin is missing or unsafe for this build.' });
  const stateRef = useRef(state);
  const started = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!lifecycle) return;
    const unsubscribe = lifecycle.subscribe(setState);
    if (!started.current) {
      started.current = true;
      void lifecycle.bootstrap();
    }
    return () => { unsubscribe(); };
  }, [lifecycle]);

  useEffect(() => {
    if (!lifecycle) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      const current = stateRef.current;
      if (current.status === 'signed-in' || (current.status === 'recoverable-error' && current.user)) {
        void lifecycle.retryVerification();
      }
    });
    return () => subscription.remove();
  }, [lifecycle]);

  const login = useCallback(async (email: string, password: string) => {
    await lifecycle?.login({ email: email.trim(), password });
  }, [lifecycle]);
  const logout = useCallback(async () => {
    await lifecycle?.logout();
  }, [lifecycle]);
  const retryVerification = useCallback(async () => {
    await lifecycle?.retryVerification();
  }, [lifecycle]);

  return (
    <AuthContext.Provider value={{ state, login, logout, retryVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
