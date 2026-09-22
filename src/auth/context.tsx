import Constants from 'expo-constants';
import { reportMetadata } from '@/beta/diagnostics';
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
import { createReviewManager, type ReviewManager } from '@/reviews/manager';
import { nativeReviewRepository, nativeDraftRepository } from '@/quick/native-storage';
import type { QuickController } from '@/quick/controller';

export type AppAuthState = AuthState | { status: 'configuration-error'; message: string };

type AuthContextValue = {
  api: ReturnType<typeof createAuthRuntime>['api'] | null;
  environmentKey: string;
  state: AppAuthState;
  diaryScope: DiaryReadScope | null;
  quick: QuickController | null;
  reviews: ReviewManager | null;
  diaryMutation: number;
  beginQuick(date?: string): Promise<boolean>;
  login(email: string, password: string): Promise<void>;
  logout(t?: (value: string) => string): Promise<void>;
  retryVerification(): Promise<void>;
  finishSecurity(): Promise<void>;
  flushDrafts(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const emptySubscribe = () => () => {};
const emptyScope = () => null;
const zeroMutation = () => 0;

function buildRuntime() {
  try {
    const config = loadApiConfig();
    const embedded = Constants.expoConfig?.extra;
    if (embedded?.buildVariant !== config.appEnvironment || (config.appEnvironment !== 'development' && embedded?.apiOrigin !== config.baseUrl)) {
      throw new ApiConfigurationError('Build/runtime configuration mismatch.');
    }
    const storage = createSecureSessionStorage(SecureStore, config.sessionStorageKey);
    const runtime = createAuthRuntime(config, storage);
    const lifecycle = createAuthLifecycle({ storage, runtime });
    const diaries = createDiaryAccess(runtime.api, lifecycle);
    diaries.subscribe(reportMetadata.clear);
    const quick = createQuickManager({ api: runtime.api, lifecycle, diaries,
      scope: JSON.stringify([config.appEnvironment, config.baseUrl]), repository: nativeDraftRepository, attemptId: randomUUID });
    const reviews = createReviewManager({ api: runtime.api, diaries, scope: JSON.stringify([config.appEnvironment, config.baseUrl]),
      repository: nativeReviewRepository, attemptId: randomUUID });
    return { lifecycle, diaries, quick, reviews, api: runtime.api, environmentKey: config.sessionStorageKey };
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
  const beginQuick = useCallback(async (date?: string) => await application?.quick.begin(date) ?? false, [application]);
  const [state, setState] = useState<AppAuthState>(() => lifecycle
    ? lifecycle.getState()
    : { status: 'configuration-error', message: 'The API origin is missing or unsafe for this build.' });
  const stateRef = useRef(state);
  const started = useRef<AuthLifecycle | undefined>(undefined);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!lifecycle) return;
    const unsubscribe = lifecycle.subscribe(setState);
    if (started.current !== lifecycle) {
      started.current = lifecycle;
      void lifecycle.bootstrap();
    }
    return () => { unsubscribe(); };
  }, [lifecycle]);

  useEffect(() => {
    if (!lifecycle) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') { void application?.quick.getSnapshot()?.flush().catch(() => {}); void application?.reviews.flush().catch(() => {}); }
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
  const logout = useCallback(async (t: (value: string) => string = value => value) => {
    try {
      if (!application) return;
      const expected = application.diaries.getScope();
      const hasReviews = await application.reviews.hasAny();
      let approved = false;
      const confirm = () => new Promise<boolean>(resolve => Alert.alert(
        t('Discard draft and log out?'),
        t('Logging out discards your local Quick Diary and Review drafts for this account. Discarding an unresolved attempt does not cancel or reverse a possible server write.'),
        [{ text: t('Cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('Discard draft and log out'), style: 'destructive', onPress: () => resolve(true) }],
        { cancelable: false },
      ));
      if (hasReviews) { approved = await confirm(); if (!approved) return; }
      if (expected !== application.diaries.getScope()) return;
      await application.quick.logout(async () => approved || await confirm(), async () => application.reviews.discardOwner());
    } catch {
      Alert.alert(t('Draft storage unavailable'), t('We could not safely remove your encrypted draft. You are still signed in. Please reopen the app and try again.'));
    }
  }, [application]);
  const retryVerification = useCallback(async () => {
    await lifecycle?.retryVerification();
  }, [lifecycle]);

  return (
    <AuthContext.Provider value={{ state, diaryScope, quick, reviews: application?.reviews ?? null, diaryMutation, beginQuick, login, logout, retryVerification,
      api: application?.api ?? null, environmentKey: application?.environmentKey ?? 'unconfigured',
      flushDrafts: async () => { await application?.quick.getSnapshot()?.flush(); await application?.reviews.flush(); },
      finishSecurity: async () => { await lifecycle?.logout(); },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
