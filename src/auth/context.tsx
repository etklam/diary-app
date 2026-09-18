import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { ApiConfigurationError, loadApiConfig } from '@/config/api';
import { createAuthLifecycle, type AuthLifecycle, type AuthState } from './lifecycle';
import { createAuthRuntime } from './runtime';
import { createSecureSessionStorage } from './secure-session-storage';
import { createDiaryAccess, type DiaryReadScope } from '@/diaries/access';
import { createQuickManager } from '@/quick/manager';
import { nativeDraftRepository } from '@/quick/native-storage';
import type { QuickController } from '@/quick/controller';

export type AppAuthState = AuthState | { status: 'configuration-error'; message: string };

type AuthContextValue = {
  state: AppAuthState;
  diaryScope: DiaryReadScope | null;
  quick: QuickController | null;
  diaryMutation: number;
  beginQuick(): void;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  retryVerification(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const emptySubscribe = () => () => {};
const emptyScope = () => null;
const zeroMutation = () => 0;

function buildRuntime() {
  try {
    const config = loadApiConfig();
    const storage = createSecureSessionStorage(SecureStore, config.sessionStorageKey);
    const runtime = createAuthRuntime(config, storage);
    const lifecycle = createAuthLifecycle({ storage, runtime });
    const diaries = createDiaryAccess(runtime.api, lifecycle);
    const quick = createQuickManager({ api: runtime.api, lifecycle, diaries,
      scope: JSON.stringify([config.appEnvironment, config.baseUrl]), repository: nativeDraftRepository, attemptId: randomUUID });
    return { lifecycle, diaries, quick };
  } catch (error) {
    if (error instanceof ApiConfigurationError) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const application = useMemo(() => buildRuntime(), []);
  const lifecycle: AuthLifecycle | undefined = application?.lifecycle;
  const diaryScope = useSyncExternalStore(application?.diaries.subscribe ?? emptySubscribe, application?.diaries.getScope ?? emptyScope);
  const quick = useSyncExternalStore(application?.quick.subscribe ?? emptySubscribe, application?.quick.getSnapshot ?? emptyScope);
  const diaryMutation = useSyncExternalStore(application?.diaries.subscribeMutations ?? emptySubscribe, application?.diaries.getMutation ?? zeroMutation);
  const beginQuick = useCallback(() => application?.quick.begin(), [application]);
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
      if (nextState !== 'active') void application?.quick.getSnapshot()?.flush().catch(() => {});
      if (nextState !== 'active') return;
      const current = stateRef.current;
      if (current.status === 'signed-in' || (current.status === 'recoverable-error' && current.user)) {
        void lifecycle.retryVerification();
      }
    });
    return () => subscription.remove();
  }, [application, lifecycle]);

  const login = useCallback(async (email: string, password: string) => {
    await lifecycle?.login({ email: email.trim(), password });
  }, [lifecycle]);
  const logout = useCallback(async () => {
    try {
      await application?.quick.logout(() => new Promise<boolean>(resolve => Alert.alert(
        'Discard draft and log out?',
        'Logging out will discard your local unsent Quick Diary draft. If a save is still unconfirmed, it may already be on the server. Check its result before logging out.',
        [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Discard draft and log out', style: 'destructive', onPress: () => resolve(true) }],
        { cancelable: false },
      )));
    } catch {
      Alert.alert('Draft storage unavailable', 'We could not safely remove your encrypted draft. You are still signed in. Please reopen the app and try again.');
    }
  }, [application]);
  const retryVerification = useCallback(async () => {
    await lifecycle?.retryVerification();
  }, [lifecycle]);

  return (
    <AuthContext.Provider value={{ state, diaryScope, quick, diaryMutation, beginQuick, login, logout, retryVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
