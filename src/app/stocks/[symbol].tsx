import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { stockSymbolSchema } from '@diary/contracts/watchlist';
import { marketRangeSchema, type MarketHistorical, type MarketRange } from '@diary/contracts/market';
import type { CompanyHubResponse } from '@diary/contracts/company-hub';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { companyHubService, type MarketSource } from '@/company-hub/service';
import { createCompanyHubManager, type CompanyHubState } from '@/company-hub/manager';
import { accessibleChartRows, chartRows } from '@/company-hub/chart';

const ranges: readonly MarketRange[] = marketRangeSchema.options;
const noSubscribe = () => () => {};
const emptySnapshot: CompanyHubState = {
  symbol: '', range: '1y', quote: { loading: false, value: null, error: null }, history: { loading: false, value: null, error: null },
  owner: { loading: false, value: null, error: null, guest: true },
};
const getEmptySnapshot = () => emptySnapshot;

export default function CompanyScreen() {
  const { symbol: rawSymbol } = useLocalSearchParams<{ symbol?: string }>();
  const symbol = stockSymbolSchema.safeParse(rawSymbol);
  if (!symbol.success) return <Redirect href={'/tools' as Href} />;
  return <CompanyHubContent key={symbol.data} symbol={symbol.data} />;
}

function CompanyHubContent({ symbol }: { symbol: string }) {
  const { api, diaryScope, state: auth, retryVerification } = useAuth();
  const ownerScope = auth.status === 'signed-in' && diaryScope?.isCurrent() ? diaryScope : null;
  const isCurrent = useMemo(() => () => !ownerScope || ownerScope.isCurrent(), [ownerScope]);
  const service = useMemo(() => api ? companyHubService(api, ownerScope ?? undefined) : null, [api, ownerScope]);
  const manager = useMemo(() => service ? createCompanyHubManager(service, isCurrent) : null, [service, isCurrent]);
  const state = useSyncExternalStore(manager?.subscribe ?? noSubscribe, manager?.getSnapshot ?? getEmptySnapshot, manager?.getSnapshot ?? getEmptySnapshot);
  const { colors: c, locale, t } = usePreferences();
  const rangeRef = useRef<MarketRange>('1y');
  const signedOut = auth.status !== 'signed-in' && auth.status !== 'bootstrapping';

  useEffect(() => {
    if (!manager) return;
    manager.open(symbol, rangeRef.current, !ownerScope);
    return () => { manager.dispose(); };
  }, [manager, ownerScope, symbol]);

  const formatDate = useMemo(() => (value: string | null) => {
    if (!value) return t('Unavailable');
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : t('Unavailable');
  }, [locale, t]);
  const formatPrice = useMemo(() => (value: number | null | undefined, currency: string | null | undefined) => {
    if (value == null) return t('Unavailable');
    if (currency) {
      try { return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 4 }).format(value); } catch { /* unsupported provider currency */ }
    }
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value);
  }, [locale, t]);

  if (!api) return <AccountPage title="Company"><StatusMessage tone="error">{t('Public market data is not configured on this build.')}</StatusMessage></AccountPage>;
  if (!state || state.symbol !== symbol) return <AccountPage title="Company"><Copy>{t('Loading company research…')}</Copy></AccountPage>;

  const quote = state.quote.value?.data;
  const owner = state.owner.value;
  const quoteCurrency = quote?.currency ?? owner?.company.currency ?? null;
  const partialQuote = !!quote && [quote.previousClose, quote.change, quote.changePercent, quote.currency, quote.marketState, quote.lastUpdateTime].some(value => value === null);
  const retryAccount = () => {
    if (auth.status === 'recoverable-error') { void retryVerification(); return; }
    router.push({ pathname: '/', params: { returnTo: `/stocks/${symbol}` } });
  };

  return <AccountPage title="Company">
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 26, fontWeight: '700' }}>{owner?.company.name ?? symbol}</Text>
      {owner?.company.name && <Text style={{ color: c.muted, fontSize: 16 }}>{symbol}</Text>}
      {ownerScope ? <PrimaryButton label="Open Watchlist" onPress={() => router.push('/watchlist' as Href)} /> : signedOut && <PrimaryButton label={auth.status === 'recoverable-error' ? 'Retry verification' : 'Sign in to view your company context'} onPress={retryAccount} />}
    </View>

    <Section title={t('Latest quote')}>
      {state.quote.loading && !quote && <Copy>{t('Loading quote…')}</Copy>}
      {state.quote.error && <StatusMessage tone="warning">{t('Quote unavailable. Price and change fields remain unavailable; no values were substituted.')}</StatusMessage>}
      {quote && <>
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 32, fontWeight: '700' }}>{formatPrice(quote.regularMarketPrice, quote.currency)}</Text>
        <Copy>{`${t('Previous close')}: ${formatPrice(quote.previousClose, quoteCurrency)}`}</Copy>
        <Copy>{`${t('Change')}: ${formatPrice(quote.change, quoteCurrency)} · ${quote.changePercent === null ? t('Unavailable') : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(quote.changePercent)}%`}`}</Copy>
        <Copy>{`${t('Market status')}: ${quote.marketState ?? t('Unavailable')}`}</Copy>
        {partialQuote && <StatusMessage tone="warning">{t('Some quote fields are unavailable.')}</StatusMessage>}
        <Copy>{`${t('Market time')}: ${formatDate(quote.lastUpdateTime)}`}</Copy>
        <Provenance source={state.quote.value?.source ?? null} fetchedAt={state.quote.value?.fetchedAt ?? null} formatDate={formatDate} />
      </>}
      {!quote && !state.quote.loading && <PrimaryButton label="Retry quote and history" onPress={() => manager?.refresh()} />}
      {quote && state.quote.loading && <Copy>{t('Refreshing quote…')}</Copy>}
    </Section>

    <Section title={t('Price history')}>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ranges.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${t('Price history')}: ${rangeLabel(value, t)}`} accessibilityState={{ selected: state.range === value }} onPress={() => { rangeRef.current = value; manager?.setRange(value); }} style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, borderWidth: state.range === value ? 2 : 1, borderColor: c.border, backgroundColor: c.surface }}><Text style={{ color: c.ink, fontSize: 14 }}>{rangeLabel(value, t)}</Text></Pressable>)}
      </View>
      {state.history.loading && !state.history.value && <Copy>{t('Loading price history…')}</Copy>}
      {state.history.error && <StatusMessage tone="warning">{t('Price history is unavailable for this selection. The quote and saved research remain available.')}</StatusMessage>}
      {state.history.value && state.history.value.data.length === 0 && <Copy>{t('No historical prices are available for this period.')}</Copy>}
      {state.history.value && state.history.value.data.length > 0 && <PriceHistory
        rows={state.history.value.data}
        currency={quoteCurrency}
        locale={locale}
        colors={{ ink: c.ink, muted: c.muted, border: c.border, action: c.action, surface: c.surface }}
        range={state.range}
        t={t}
        formatPrice={formatPrice}
      />}
      {state.history.value && <Provenance source={state.history.value.source} fetchedAt={state.history.value.fetchedAt} formatDate={formatDate} />}
      {state.history.loading && state.history.value && <Copy>{t('Updating selected history…')}</Copy>}
      {state.history.error && <PrimaryButton label="Retry price history" onPress={() => manager?.setRange(state.range)} />}
    </Section>

    <Section title={t('Your company context')}>
      {state.owner.guest && <Copy>{t('Sign in to read your private holding, Diary, notes and Thesis context. Public quotes and history are available without an account.')}</Copy>}
      {state.owner.loading && <Copy>{t('Loading private company context…')}</Copy>}
      {state.owner.error && <StatusMessage tone="warning">{state.owner.error.kind === 'session' ? t('Your session needs verification before private company context can be shown.') : t('Private company context is unavailable. Public market data remains separate.')}</StatusMessage>}
      {state.owner.error?.kind === 'session' && <PrimaryButton label="Retry verification" onPress={retryAccount} />}
      {state.owner.error && state.owner.error.kind !== 'session' && <PrimaryButton label="Retry private context" onPress={() => manager?.refresh()} />}
      {owner && <OwnerResearch owner={owner} quotePrice={quote?.regularMarketPrice ?? null} currency={quoteCurrency} formatPrice={formatPrice} locale={locale} formatDate={formatDate} />}
    </Section>

    <Section title={t('Research entrances')}>
      <Copy>{t('Continue with public research or return to the companies you follow.')}</Copy>
      <PrimaryButton label="Explore research tools" onPress={() => router.push('/tools' as Href)} />
      {ownerScope && <PrimaryButton label="Open Watchlist" onPress={() => router.push('/watchlist' as Href)} />}
    </Section>
  </AccountPage>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors: c } = usePreferences();
  return <View style={{ gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
    <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{title}</Text>{children}
  </View>;
}

function Provenance({ source, fetchedAt, formatDate }: { source: MarketSource | null; fetchedAt: string | null; formatDate(value: string | null): string }) {
  const { t } = usePreferences();
  const label = source === 'upstream' ? t('Live from source') : source === 'cache' ? t('Server cache') : source === 'stale' ? t('Stale cached data') : t('Source unavailable');
  return <Copy>{`${t('Data source')}: ${label} · ${t('Fetched')}: ${formatDate(fetchedAt)}`}</Copy>;
}

function OwnerResearch({ owner, quotePrice, currency, formatPrice, locale, formatDate }: {
  owner: CompanyHubResponse; quotePrice: number | null; currency: string | null; formatPrice(value: number | null | undefined, currency: string | null | undefined): string;
  locale: string; formatDate(value: string | null): string;
}) {
  const { colors: c, t } = usePreferences();
  const position = owner.position;
  const thesisFields: readonly [string, string | null][] = [
    ['Current view', owner.thesis?.summary ?? null], ['Why I own it', owner.thesis?.whyIOwnIt ?? null],
    ['Growth drivers', owner.thesis?.growthDrivers ?? null], ['Risks', owner.thesis?.risks ?? null],
    ['Invalidation conditions', owner.thesis?.invalidationConditions ?? null],
  ];
  return <View style={{ gap: 18 }}>
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{t(position.state === 'held' ? 'Currently held' : position.state === 'closed' ? 'Position closed' : position.state === 'research_only' ? 'Research only' : 'Untracked')}</Text>
      {position.state === 'held' && <>
        <Copy>{`${t('Quantity')}: ${new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }).format(position.quantity)}`}</Copy>
        <Copy>{`${t('Average cost')}: ${formatPrice(position.averageCost, currency)}`}</Copy>
        <Copy>{`${t('Cost basis')}: ${formatPrice(position.totalCost, currency)}`}</Copy>
        <Copy>{`${t('Market value')}: ${formatPrice(quotePrice === null ? null : position.quantity * quotePrice, currency)}`}</Copy>
        <Copy>{t('Market value uses the quote shown above.')}</Copy>
        {quotePrice === null && <StatusMessage tone="warning">{t('Quote unavailable. Your cost basis remains available; market value was not replaced with zero.')}</StatusMessage>}
      </>}
    </View>
    {owner.thesis && <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{t('Investment Thesis')} · {t(owner.thesis.status)}</Text>
      {thesisFields.map(([label, content]) => content ? <View key={label} style={{ gap: 3 }}><Text style={{ color: c.muted, fontSize: 14 }}>{t(label)}</Text><Text selectable style={{ color: c.ink, fontSize: 15, lineHeight: 23 }}>{content}</Text></View> : null)}
      {owner.thesis.reviewDueAt && <Copy>{`${t('Review due')}: ${formatDate(owner.thesis.reviewDueAt)}`}</Copy>}
    </View>}
    {!!owner.reviews.length && <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{t('Recent Thesis reviews')}</Text>
      {owner.reviews.slice(0, 10).map(review => <View key={review.id} style={{ gap: 4 }}><Copy>{`${t(review.outcome)} · ${t(review.portfolioDecision)} · ${formatDate(review.reviewedAt)}`}</Copy>{review.whatChanged && <Text selectable style={{ color: c.ink, fontSize: 15 }}>{review.whatChanged}</Text>}{review.whatImproved && <Text selectable style={{ color: c.ink, fontSize: 15 }}>{`${t('What improved')}: ${review.whatImproved}`}</Text>}{review.whatDeteriorated && <Text selectable style={{ color: c.muted, fontSize: 15 }}>{`${t('What deteriorated')}: ${review.whatDeteriorated}`}</Text>}</View>)}
    </View>}
    {!!owner.notes.length && <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{t('Recent Stock Notes')}</Text>
      {owner.notes.slice(0, 10).map(note => <View key={note.id} style={{ gap: 4 }}><Text style={{ color: c.muted, fontSize: 14 }}>{note.source === 'partner' ? `${t('Shared by')} ${note.sourceName ?? t('Partner')}` : t('Private note')} · {formatDate(note.date)}</Text><Text style={{ color: c.ink, fontSize: 16, fontWeight: '600' }}>{note.title}</Text><Text selectable style={{ color: c.ink, fontSize: 15, lineHeight: 23 }}>{note.content}</Text></View>)}
    </View>}
    {!!owner.evidence.length && <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{t('Recent evidence')}</Text>
      {owner.evidence.slice(0, 10).map(item => <View key={item.id} style={{ gap: 3 }}><Copy>{`${item.sourceTitle ?? t(item.sourceType)} · ${formatDate(item.occurredAt)}`}</Copy><Text selectable style={{ color: c.ink, fontSize: 15, lineHeight: 23 }}>{item.summary}</Text></View>)}
    </View>}
    {!!owner.relatedDiaries.length && <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{t('Related Diaries')}</Text>
      {owner.relatedDiaries.slice(0, 10).map(diary => <PrimaryButton key={diary.id} label={`${diary.date} · ${diary.title} · ${diary.transactionCount} ${t('transactions')}`} onPress={() => router.push(`/diaries/${diary.id}` as Href)} />)}
    </View>}
    {!owner.thesis && !owner.reviews.length && !owner.notes.length && !owner.evidence.length && !owner.relatedDiaries.length && <Copy>{t('No personal research has been recorded for this company yet.')}</Copy>}
  </View>;
}

function PriceHistory({ rows, currency, locale, colors, range, t, formatPrice }: {
  rows: MarketHistorical; currency: string | null; locale: string;
  colors: { ink: string; muted: string; border: string; action: string; surface: string };
  range: MarketRange; t(value: string): string; formatPrice(value: number | null | undefined, currency: string | null | undefined): string;
}) {
  const [width, setWidth] = useState(0);
  const height = 164;
  const values = rows.map(row => row.close);
  const min = Math.min(...values), max = Math.max(...values);
  const yRange = max - min || 1;
  const displayRows = chartRows(rows);
  const points = width > 0 ? displayRows.map((row, index) => ({
    x: displayRows.length === 1 ? width / 2 : index * width / (displayRows.length - 1),
    y: 10 + (height - 20) * (1 - (row.close - min) / yRange),
  })) : [];
  const samples = accessibleChartRows(rows);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const dateText = (timestamp: number) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(timestamp * 1000));
  const accessibleLabel = `${t('Price history chart')}, ${rangeLabel(range, t)}. ${t('Lowest')}: ${formatPrice(min, currency)}. ${t('Highest')}: ${formatPrice(max, currency)}. ${t('First')}: ${formatPrice(rows[0]?.close, currency)}. ${t('Latest')}: ${formatPrice(rows.at(-1)?.close, currency)}.`;
  return <View style={{ gap: 10 }}>
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={accessibleLabel} style={{ height, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: height / 2, height: 1, backgroundColor: colors.border }} />
      {points.slice(1).map((point, index) => {
        const prior = points[index]!; const dx = point.x - prior.x; const dy = point.y - prior.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        return <View key={`${index}-${displayRows[index + 1]?.timestamp}`} pointerEvents="none" style={{ position: 'absolute', left: (prior.x + point.x - length) / 2, top: (prior.y + point.y) / 2 - 1, width: length, height: 2, borderRadius: 1, backgroundColor: colors.action, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }} />;
      })}
    </View>
    <Copy>{`${t('Lowest')}: ${formatPrice(min, currency)} · ${t('Highest')}: ${formatPrice(max, currency)} · ${t('First')}: ${formatPrice(rows[0]?.close, currency)} · ${t('Latest')}: ${formatPrice(rows.at(-1)?.close, currency)}`}</Copy>
    <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>{t('Accessible sample values')}</Text>
    {samples.map(row => <Text key={row.timestamp} accessibilityLabel={`${dateText(row.timestamp)}: ${formatPrice(row.close, currency)}`} style={{ color: colors.muted, fontSize: 14 }}>{`${dateText(row.timestamp)} · ${formatPrice(row.close, currency)}`}</Text>)}
  </View>;
}

function rangeLabel(range: MarketRange, t: (value: string) => string) {
  const label: Record<MarketRange, string> = { '1mo': '1 month', '3mo': '3 months', '6mo': '6 months', '1y': '1 year', '5y': '5 years', max: 'Max' };
  return t(label[range]);
}
