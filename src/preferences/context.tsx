import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/auth/context';
import { accountService } from '@/account/service';
import type { Settings, Theme, Locale } from './model';
import { shellText } from '@/navigation/copy';
import { translate } from './translations';
import { userSettingsSchema } from '@diary/contracts/settings';

const light = { canvas: '#F4F4F5', surface: '#FFFFFF', ink: '#202124', muted: '#60636A', border: '#DADCE0', action: '#343740', actionPressed: '#202228', onAction: '#FFFFFF', warningBackground: '#FFF1D6', warningText: '#76511A', errorBackground: '#FCE8E6', errorText: '#8B2C24' };
const dark = { canvas: '#141518', surface: '#212329', ink: '#F5F5F7', muted: '#BBC0CA', border: '#454953', action: '#E3E6ED', actionPressed: '#BBC0CA', onAction: '#202124', warningBackground: '#3A301B', warningText: '#F5D497', errorBackground: '#422624', errorText: '#FFB4AB' };
export type Colors = typeof light;
const deviceLocale = (): Locale => { const value = Intl.DateTimeFormat().resolvedOptions().locale; return /^zh.*(TW|HK|Hant)/i.test(value) ? 'zh-TW' : /^zh/i.test(value) ? 'zh-CN' : 'en'; };
const UiContext = createContext<{
  colors: Colors; locale: Locale; theme: Theme; dark: boolean; settings: Settings | null; ready: boolean; error: boolean;
  t(value: string): string; setTheme(value: Theme): Promise<void>; setLocale(value: Locale): void;
  apply(settings: Settings): void; refresh(): Promise<void>;
} | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { api, diaryScope, environmentKey, state } = useAuth();
  const [theme, setThemeState] = useState<Theme>('system');
  const [guestLocale, setGuestLocale] = useState<Locale>(deviceLocale);
  const [record, setRecord] = useState<{ owner: typeof diaryScope; settings: Settings | null; ready: boolean; error: boolean }>({ owner: null, settings: null, ready: false, error: false });
  const revision = useRef(0);
  const themeRevision = useRef(0);
  const cacheWrites = useRef(Promise.resolve());
  const cache = (key: string, value: string) => {
    const write = cacheWrites.current.then(() => SecureStore.setItemAsync(key, value));
    cacheWrites.current = write.catch(() => {});
    return write;
  };
  const scheme = useColorScheme();
  const themeKey = `${environmentKey}.appearance`;
  useEffect(() => { let active = true; const expected = themeRevision.current; void SecureStore.getItemAsync(themeKey).then(value => { if (active && expected === themeRevision.current && (value === 'light' || value === 'dark' || value === 'system')) setThemeState(value); }).catch(() => {}); return () => { active = false; }; }, [themeKey]);
  const refresh = async () => {
    const scope = diaryScope;
    const expected = ++revision.current;
    if (!api || !scope) return;
    const cacheKey = `${environmentKey}.preferences.${scope.ownerId}`;
    try {
      const raw = await SecureStore.getItemAsync(cacheKey);
      const cached = raw ? userSettingsSchema.safeParse(JSON.parse(raw)) : null;
      if (cached?.success && scope.isCurrent() && revision.current === expected) setRecord(old => old.owner === scope && old.settings ? old : { owner: scope, settings: cached.data, ready: false, error: false });
    } catch { /* Server remains authoritative when the optional cache is unavailable. */ }
    try {
      const settings = await accountService(api, scope).read();
      if (scope.isCurrent() && revision.current === expected) { setRecord({ owner: scope, settings, ready: true, error: false }); void cache(cacheKey, JSON.stringify(settings)).catch(() => {}); }
    } catch { if (scope.isCurrent() && revision.current === expected) setRecord(old => ({ owner: scope, settings: old.owner === scope ? old.settings : null, ready: true, error: true })); }
  };
  // This effect initiates an external storage/API read; only its async response updates state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); /* Owner capability changes invalidate late requests. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaryScope]);
  useEffect(() => { const subscription = AppState.addEventListener('change', next => { if (next === 'active') void refresh(); }); return () => subscription.remove(); });
  const settings = record.owner === diaryScope ? record.settings : null;
  const locale = settings?.locale ?? guestLocale;
  const isDark = theme === 'dark' || (theme === 'system' && scheme === 'dark');
  return <UiContext.Provider value={{ colors: isDark ? dark : light, locale, theme, dark: isDark, settings,
    ready: state.status !== 'bootstrapping' && (!diaryScope || record.owner === diaryScope && record.ready), error: record.owner === diaryScope && record.error,
    t: value => translate(shellText(value, locale), locale), setLocale: setGuestLocale,
    async setTheme(value) { const expected = ++themeRevision.current; await cache(themeKey, value); if (themeRevision.current === expected) setThemeState(value); },
    apply(value) { if (!diaryScope?.isCurrent()) return; revision.current++; setRecord({ owner: diaryScope, settings: value, ready: true, error: false }); void cache(`${environmentKey}.preferences.${diaryScope.ownerId}`, JSON.stringify(value)).catch(() => {}); }, refresh,
  }}>{children}</UiContext.Provider>;
}
const fallback = { colors: light, locale: 'en' as Locale, theme: 'system' as Theme, dark: false, settings: null, ready: true, error: false, t: (value: string) => value, setTheme: async (_value: Theme) => {}, setLocale: (_value: Locale) => {}, apply: (_value: Settings) => {}, refresh: async () => {} };
export function usePreferences() { return useContext(UiContext) ?? fallback; }
export function useAppColors() { return usePreferences().colors; }
export function useInstantDate() {
  const { locale, settings } = usePreferences();
  const { state } = useAuth();
  const user = state.status === 'signed-in' || state.status === 'recoverable-error' ? state.user : null;
  return (value: string) => new Date(value).toLocaleString(locale, { timeZone: settings?.timezone ?? user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone });
}
