import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { etfSymbolSchema } from '@diary/contracts/etf';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { etfWatchlistService } from '@/tools/etf-data';
import { createEtfWatchlistManager } from '@/tools/etf-watchlist-manager';

export default function EtfWatchlistScreen() {
  const { symbol: rawSymbol } = useLocalSearchParams<{ symbol?: string }>();
  const symbol = etfSymbolSchema.safeParse(rawSymbol);
  const initialSymbol = symbol.success ? symbol.data : '';
  const { api, diaryScope, state: auth } = useAuth();
  const { t } = usePreferences();
  if (!api || !diaryScope || auth.status !== 'signed-in') return <AccountPage title="ETF Watchlist"><Copy>{t('Verifying session…')}</Copy></AccountPage>;
  return <EtfWatchlistOwner key={diaryScope.ownerId} api={api} scope={diaryScope} initialSymbol={initialSymbol} />;
}

function EtfWatchlistOwner({ api, scope, initialSymbol }: {
  api: NonNullable<ReturnType<typeof useAuth>['api']>;
  scope: NonNullable<ReturnType<typeof useAuth>['diaryScope']>;
  initialSymbol: string;
}) {
  const service = useMemo(() => etfWatchlistService(api, scope), [api, scope]);
  const manager = useMemo(() => createEtfWatchlistManager(service, scope.isCurrent), [service, scope]);
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const { colors: c, locale, t } = usePreferences();
  const { retryVerification } = useAuth();
  const [symbol, setSymbol] = useState(initialSymbol);
  const locked = state.busy || state.mutationUncertain || state.error?.kind === 'session';
  const date = useMemo(() => (value: string | null) => {
    if (!value) return t('Unavailable');
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) ? `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed)} UTC` : t('Unavailable');
  }, [locale, t]);

  useEffect(() => {
    void manager.refresh();
    return () => manager.dispose();
  }, [manager]);

  const add = async () => { if (await manager.add(symbol)) setSymbol(''); };
  const remove = (id: string) => Alert.alert(
    t('Remove ETF?'),
    t('Remove this ETF from your research Watchlist? Stock holdings and transactions stay unchanged.'),
    [{ text: t('Cancel'), style: 'cancel' }, { text: t('Remove ETF'), style: 'destructive', onPress: () => { void manager.remove(id); } }],
    { cancelable: true },
  );
  const issue = state.error;
  const issueText = issue?.kind === 'session' ? t('Your session needs verification before this ETF Watchlist can be changed.')
    : issue?.code === 'ETF_NOT_FOUND' ? t('This ETF is not in the shared catalog.')
      : issue?.code === 'ETF_ALREADY_IN_WATCHLIST' ? t('This ETF is already on your Watchlist.')
        : issue?.code === 'SYS_VALIDATION_ERROR' ? t('Enter a valid ETF symbol with 1–20 characters.')
          : t('The ETF Watchlist request failed. Your symbol is still here; refresh the list or check the connection.');

  return <AccountPage title="ETF Watchlist">
    <Copy>{t('Follow ETFs from the shared catalog. Monthly closing prices are separate from live research quotes.')}</Copy>
    <Copy>{t('This research Watchlist is separate from stock holdings and transactions.')}</Copy>
    {state.mutationUncertain && <StatusMessage tone="warning">{t('The change may have reached the server. Refresh the ETF Watchlist before making another change; no write was repeated.')}</StatusMessage>}
    {!!issue && <StatusMessage tone={issue.kind === 'rejected' ? 'error' : 'warning'}>{issueText}</StatusMessage>}
    {issue?.kind === 'session' && <PrimaryButton label="Retry verification" onPress={() => void retryVerification()} />}
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 19, fontWeight: '700' }}>{t('ETF symbol')}</Text>
      <TextInput testID="etf-watchlist-symbol" accessibilityLabel={t('ETF symbol')} value={symbol} onChangeText={setSymbol} maxLength={20} autoCapitalize="characters" autoCorrect={false} returnKeyType="done" onSubmitEditing={() => void add()} editable={!locked} style={{ minHeight: 52, paddingHorizontal: 12, borderWidth: 1, borderColor: issue?.code === 'SYS_VALIDATION_ERROR' || issue?.code === 'ETF_NOT_FOUND' ? c.warningText : c.border, borderRadius: 10, backgroundColor: c.surface, color: c.ink, fontSize: 17 }} />
      <PrimaryButton testID="etf-watchlist-add" label="Add ETF" busy={state.busy} disabled={!symbol.trim() || locked} onPress={() => void add()} />
      {state.saved && <StatusMessage tone="warning">{t('ETF Watchlist updated.')}</StatusMessage>}
    </View>
    <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 21, fontWeight: '700' }}>{t('Your ETFs')} ({state.items?.length ?? 0})</Text>
    {state.items === null && state.loading && <Copy>{t('Loading ETF Watchlist…')}</Copy>}
    {state.items === null && issue && <>
      <Copy>{t('Could not load your ETF Watchlist. Retry to continue.')}</Copy>
      <PrimaryButton label="Refresh ETF Watchlist" busy={state.loading} disabled={state.busy} onPress={() => void manager.refresh()} />
    </>}
    {state.items && !state.items.length && <Copy>{t('No ETFs followed yet.')}</Copy>}
    {state.items && <View accessibilityRole="list" style={{ gap: 12 }}>
      {state.items.map(item => <View key={item.id} testID={`etf-watch-${item.symbol}`} style={{ gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{item.symbol}{item.name ? ` · ${item.name}` : ''}</Text>
        <Copy>{`${t('Latest monthly close')}: ${item.latestPrice === null ? t('Unavailable') : new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(item.latestPrice)} · ${date(item.latestDate)}`}</Copy>
        <PrimaryButton testID={`etf-watch-read-${item.id}`} label="Read research" onPress={() => router.push(`/tools/etf?symbol=${encodeURIComponent(item.symbol)}` as Href)} />
        <PrimaryButton testID={`etf-watch-remove-${item.id}`} label="Remove ETF" disabled={locked} onPress={() => remove(item.id)} />
      </View>)}
    </View>}
    <PrimaryButton label="Refresh ETF Watchlist" busy={state.loading} disabled={state.busy} onPress={() => void manager.refresh()} />
  </AccountPage>;
}
