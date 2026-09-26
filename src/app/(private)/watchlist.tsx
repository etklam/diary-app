import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import type { StockWatchlistItem } from '@diary/contracts/watchlist';
import { createWatchlistManager } from '@/watchlist/manager';
import { stockWatchlistService } from '@/watchlist/service';

type SortMode = 'order' | 'research' | 'symbol';

export default function WatchlistScreen() {
  const { api, diaryScope } = useAuth();
  if (!api || !diaryScope) return null;
  return <WatchlistOwner key={diaryScope.ownerId} api={api} scope={diaryScope} />;
}

function WatchlistOwner({ api, scope }: { api: NonNullable<ReturnType<typeof useAuth>['api']>; scope: NonNullable<ReturnType<typeof useAuth>['diaryScope']> }) {
  const model = useMemo(() => createWatchlistManager(stockWatchlistService(api, scope), scope.isCurrent), [api, scope]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const { colors: c, locale, t } = usePreferences();
  const { retryVerification } = useAuth();
  const formatDate = useMemo(() => (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)), [locale]);
  const [symbol, setSymbol] = useState('');
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortMode>('order');
  const locked = state.busy || state.mutationUncertain || state.error?.kind === 'session';

  useEffect(() => () => model.dispose(), [model]);
  useFocusEffect(useCallback(() => { void model.refresh(); }, [model]));

  const ordered = useMemo(() => {
    const items = [...(state.items ?? [])];
    if (sort === 'symbol') return items.sort((a, b) => a.stock.symbol.localeCompare(b.stock.symbol) || a.id.localeCompare(b.id));
    if (sort === 'research') return items.sort((a, b) => (b.latestRecord?.occurredAt ?? '').localeCompare(a.latestRecord?.occurredAt ?? '') || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    return items;
  }, [sort, state.items]);

  const add = async () => {
    if (await model.add(symbol)) setSymbol('');
  };
  const archive = (item: StockWatchlistItem) => Alert.alert(
    t('Remove company?'),
    t('This archives the Watchlist entry. Its research history is retained, and adding the symbol again restores it.'),
    [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Remove'), style: 'destructive', onPress: () => { void model.archive(item.id); } },
    ],
  );
  const retrySession = async () => {
    await retryVerification();
    if (scope.isCurrent()) await model.refresh();
  };

  return <AccountPage title="Watchlist">
    <Copy>Keep companies close while you develop your investment view.</Copy>
    {state.error?.kind === 'uncertain' && <StatusMessage tone="warning">A change may have reached the server. Refresh the Watchlist before making another change; no write was repeated.</StatusMessage>}
    {state.error?.kind === 'session' && <StatusMessage tone="warning">Your session needs verification before this Watchlist can be changed.</StatusMessage>}
    {state.error && state.error.kind !== 'uncertain' && state.error.kind !== 'session' && <StatusMessage tone="error">{state.error.code === 'SYS_VALIDATION_ERROR' ? 'Use 1–32 letters, numbers or dots for a stock symbol, and an order from 0 to 10000.' : 'The request failed. Your edits are still here; check the connection or account, then retry.'}</StatusMessage>}
    {state.error?.kind === 'session' && <PrimaryButton label="Retry verification" onPress={() => void retrySession()} />}
    {state.saved && <StatusMessage tone="warning">Watchlist updated.</StatusMessage>}

    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{t('Add a company')}</Text>
      <TextInput
        testID="watchlist-symbol"
        accessibilityLabel={t('Stock symbol')}
        value={symbol}
        onChangeText={setSymbol}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={32}
        returnKeyType="done"
        onSubmitEditing={() => void add()}
        editable={!locked}
        style={{ minHeight: 52, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.ink, fontSize: 17 }}
      />
      <PrimaryButton testID="watchlist-add" label="Add company" busy={state.busy} disabled={!symbol.trim() || locked} onPress={() => void add()} />
      {state.items && <Copy>{`${state.items.length} / 100 ${t('companies shown')}. ${t('The server returns at most 100 active entries. Removed entries are archived and can be restored by adding their symbol again.')}`}</Copy>}
    </View>

    {state.error && <PrimaryButton testID="watchlist-refresh" label="Refresh Watchlist" busy={state.loading} disabled={state.busy} onPress={() => void model.refresh()} />}
    {!state.items && state.loading && <Copy>Loading Watchlist…</Copy>}
    {!state.items && state.error && <Copy>Could not load the Watchlist. Retry to continue.</Copy>}
    {state.items && <>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 21, fontWeight: '700' }}>{t('Companies')} ({state.items.length})</Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {([['order', 'Custom order'], ['research', 'Latest research'], ['symbol', 'Symbol']] as const).map(([value, label]) => <Pressable
          key={value}
          accessibilityRole="radio"
          accessibilityState={{ selected: sort === value }}
          accessibilityLabel={t(label)}
          onPress={() => setSort(value)}
          style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: sort === value ? 2 : 1, borderColor: c.ink, backgroundColor: c.surface }}
        ><Text style={{ color: c.ink, fontSize: 15 }}>{t(label)}</Text></Pressable>)}
      </View>
      {!ordered.length && <Copy>No companies yet. Add a symbol to start your research.</Copy>}
      <View accessibilityRole="list" style={{ gap: 12 }}>
        {ordered.map(item => <View key={item.id} testID={`watchlist-${item.stock.symbol}`} style={{ padding: 16, gap: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
          <View style={{ gap: 4 }}>
            <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 21, fontWeight: '700' }}>{item.stock.symbol}</Text>
            {item.stock.name && <Text style={{ color: c.muted, fontSize: 16 }}>{item.stock.name}</Text>}
          </View>
          <Copy>{item.recordCount ? `${t('Research records')}: ${item.recordCount}${item.latestRecord ? ` · ${formatDate(item.latestRecord.occurredAt)}` : ''}` : 'No research records yet.'}</Copy>
          {item.latestRecord && <Text selectable style={{ color: c.ink, fontSize: 15, lineHeight: 23 }}>{item.latestRecord.summary}</Text>}
          <PrimaryButton testID={`watchlist-company-${item.stock.symbol}`} label="Open company research" onPress={() => router.push(`/stocks/${encodeURIComponent(item.stock.symbol)}` as Href)} />
          <Text style={{ color: c.muted, fontSize: 15 }}>{t('Sort order')}</Text>
          <TextInput
            testID={`watchlist-order-${item.id}`}
            accessibilityLabel={`${t('Sort order for')} ${item.stock.symbol}`}
            value={orderDrafts[item.id] ?? String(item.sortOrder)}
            onChangeText={value => setOrderDrafts(current => ({ ...current, [item.id]: value }))}
            keyboardType="number-pad"
            maxLength={5}
            editable={!locked}
            style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.canvas, color: c.ink, fontSize: 17 }}
          />
          {(orderDrafts[item.id] ?? String(item.sortOrder)) !== String(item.sortOrder) && <PrimaryButton
            testID={`watchlist-save-order-${item.id}`}
            label="Save order"
            busy={state.busy}
            disabled={locked}
            onPress={() => { void model.updateOrder(item.id, orderDrafts[item.id] ?? String(item.sortOrder)); }}
          />}
          <PrimaryButton testID={`watchlist-remove-${item.id}`} label="Remove from Watchlist" disabled={locked} onPress={() => archive(item)} />
        </View>)}
      </View>
    </>}
  </AccountPage>;
}
