import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { etfProfileQuerySchema } from '@diary/contracts/etf-profile';
import { etfSymbolSchema } from '@diary/contracts/etf';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { createEtfResearchManager, type EtfQuery, type EtfResearchState } from './etf-research-manager';
import { etfResearchService, type EtfProfile } from './etf-data';

type Locale = 'en' | 'zh-TW' | 'zh-CN';
type Metric = { key: string; label: string; value: number | null; suffix?: string; signed?: boolean; currency?: string | null; section: 'risk' | 'valuation' | 'rs' };
type Palette = { canvas: string; surface: string; ink: string; muted: string; border: string; action: string };
const emptyState: EtfResearchState = { request: { symbol: 'SPY', benchmark: 'SPY', period: '3m' }, loading: false, data: null, error: null };
const noSubscribe = () => () => {};
const emptySnapshot = () => emptyState;

const labels: Record<Locale, Record<string, string>> = {
  en: { high: '52-week high', low: '52-week low', distHigh: 'Distance to high', distLow: 'Distance to low', vol20: '20-day volatility', vol60: '60-day volatility', vol252: '252-day volatility', drawdown: '1-year maximum drawdown', volume: 'Volume / prior 20-day average', aum: 'Assets under management', expense: 'Expense ratio', pe: 'P/E', pb: 'P/B', yield: 'Dividend yield', etfReturn: 'ETF return', benchmarkReturn: 'Benchmark return', relative: 'Relative return (pp)' },
  'zh-TW': { high: '52 週高位', low: '52 週低位', distHigh: '距高位', distLow: '距低位', vol20: '20 日波動率', vol60: '60 日波動率', vol252: '252 日波動率', drawdown: '1 年最大回撤', volume: '成交量／前 20 日平均', aum: '管理資產', expense: '費用率', pe: '本益比', pb: '股價淨值比', yield: '股息率', etfReturn: 'ETF 回報', benchmarkReturn: '基準回報', relative: '相對回報（百分點）' },
  'zh-CN': { high: '52 周高位', low: '52 周低位', distHigh: '距高位', distLow: '距低位', vol20: '20 日波动率', vol60: '60 日波动率', vol252: '252 日波动率', drawdown: '1 年最大回撤', volume: '成交量／前 20 日平均', aum: '管理资产', expense: '费用率', pe: '市盈率', pb: '市净率', yield: '股息率', etfReturn: 'ETF 回报', benchmarkReturn: '基准回报', relative: '相对回报（百分点）' },
};
const metricFields = (data: EtfProfile, locale: Locale): Metric[] => {
  const l = labels[locale];
  return [
    { key: 'risk.high52w', label: l.high, value: data.risk.high52w, section: 'risk' },
    { key: 'risk.low52w', label: l.low, value: data.risk.low52w, section: 'risk' },
    { key: 'risk.distanceToHighPct', label: l.distHigh, value: data.risk.distanceToHighPct, suffix: '%', signed: true, section: 'risk' },
    { key: 'risk.distanceToLowPct', label: l.distLow, value: data.risk.distanceToLowPct, suffix: '%', section: 'risk' },
    { key: 'risk.volatility20d', label: l.vol20, value: data.risk.volatility20d, suffix: '%', section: 'risk' },
    { key: 'risk.volatility60d', label: l.vol60, value: data.risk.volatility60d, suffix: '%', section: 'risk' },
    { key: 'risk.volatility252d', label: l.vol252, value: data.risk.volatility252d, suffix: '%', section: 'risk' },
    { key: 'risk.maxDrawdown1y', label: l.drawdown, value: data.risk.maxDrawdown1y, suffix: '%', signed: true, section: 'risk' },
    { key: 'risk.volumeSpikeRatio', label: l.volume, value: data.risk.volumeSpikeRatio, section: 'risk' },
    { key: 'valuation.aum', label: l.aum, value: data.valuation.aum, currency: data.valuation.currency, section: 'valuation' },
    { key: 'valuation.expenseRatioPct', label: l.expense, value: data.valuation.expenseRatioPct, suffix: '%', section: 'valuation' },
    { key: 'valuation.pe', label: l.pe, value: data.valuation.pe, section: 'valuation' },
    { key: 'valuation.pb', label: l.pb, value: data.valuation.pb, section: 'valuation' },
    { key: 'valuation.dividendYieldPct', label: l.yield, value: data.valuation.dividendYieldPct, suffix: '%', section: 'valuation' },
    { key: 'rs.symbolReturnPct', label: l.etfReturn, value: data.rs.symbolReturnPct, suffix: '%', signed: true, section: 'rs' },
    { key: 'rs.benchmarkReturnPct', label: l.benchmarkReturn, value: data.rs.benchmarkReturnPct, suffix: '%', signed: true, section: 'rs' },
    { key: 'rs.relativeReturnPct', label: l.relative, value: data.rs.relativeReturnPct, suffix: ' pp', signed: true, section: 'rs' },
  ];
};

export function EtfResearchScreen({ initialSymbol = 'SPY', initialBenchmark = 'SPY', initialPeriod = '3m' }: {
  initialSymbol?: string; initialBenchmark?: string; initialPeriod?: string;
}) {
  const { api } = useAuth();
  const { colors: c, locale, t } = usePreferences();
  const fallback = useMemo<EtfQuery>(() => ({
    symbol: etfSymbolSchema.safeParse(initialSymbol).success ? etfSymbolSchema.parse(initialSymbol) : 'SPY',
    benchmark: initialBenchmark === 'QQQ' ? 'QQQ' : 'SPY',
    period: (['1m', '3m', '6m', '1y'] as const).includes(initialPeriod as EtfQuery['period']) ? initialPeriod as EtfQuery['period'] : '3m',
  }), [initialBenchmark, initialPeriod, initialSymbol]);
  const [symbol, setSymbol] = useState(fallback.symbol);
  const [benchmark, setBenchmark] = useState<EtfQuery['benchmark']>(fallback.benchmark);
  const [period, setPeriod] = useState<EtfQuery['period']>(fallback.period);
  const [invalid, setInvalid] = useState(false);
  const service = useMemo(() => api ? etfResearchService(api) : null, [api]);
  const manager = useMemo(() => service ? createEtfResearchManager(service, fallback) : null, [fallback, service]);
  const state = useSyncExternalStore(manager?.subscribe ?? noSubscribe, manager?.getSnapshot ?? emptySnapshot, manager?.getSnapshot ?? emptySnapshot);

  useEffect(() => {
    if (!manager) return;
    manager.open(fallback);
    return () => manager.dispose();
  }, [fallback, manager]);

  const localeKey = locale as Locale;
  const tDay = useMemo(() => (value: string | null) => {
    if (!value) return t('Unavailable');
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : t('Unavailable');
  }, [locale, t]);
  const number = useMemo(() => (value: number | null, suffix = '', signed = false, currency: string | null = null) => {
    if (value === null) return t('Unavailable');
    let formatted: string;
    if (currency) {
      try { formatted = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 4 }).format(value); }
      catch { formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 3, signDisplay: signed ? 'always' : 'auto' }).format(value); }
    } else formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 3, signDisplay: signed ? 'always' : 'auto' }).format(value);
    return `${formatted}${suffix}`;
  }, [locale, t]);

  const openProfile = () => {
    const parsed = etfSymbolSchema.safeParse(symbol);
    const query = etfProfileQuerySchema.safeParse({ benchmark, period });
    if (!parsed.success || !query.success) { setInvalid(true); return; }
    setInvalid(false);
    manager?.open({ symbol: parsed.data, benchmark: query.data.benchmark, period: query.data.period });
  };
  const profile = state.data;
  const allMetrics = profile ? metricFields(profile, localeKey) : [];
  const palette: Palette = { canvas: c.canvas, surface: c.surface, ink: c.ink, muted: c.muted, border: c.border, action: c.action };
  const watchlistPath = `/etf-watchlist?symbol=${encodeURIComponent((profile?.symbol ?? symbol).trim().toUpperCase())}`;
  const statusText = profile?.meta.status === 'complete' ? t('Available metrics loaded.') : profile?.meta.status === 'partial' ? t('Some data is unavailable.') : profile?.meta.status === 'unavailable' ? t('Research data is unavailable for this symbol.') : null;

  if (!api) return <AccountPage title="ETF research"><StatusMessage tone="error">{t('Public ETF research is not configured on this build.')}</StatusMessage></AccountPage>;
  return <AccountPage title="ETF research">
    <Copy>{t('Read risk, fund details and relative returns together, with their data dates.')}</Copy>
    <Section title={t('Research parameters')} palette={palette}>
      <Text style={{ color: c.ink, fontSize: 16 }}>{t('ETF symbol')}</Text>
      <TextInput testID="etf-symbol" accessibilityLabel={t('ETF symbol')} value={symbol} onChangeText={setSymbol} autoCapitalize="characters" autoCorrect={false} maxLength={20} returnKeyType="search" onSubmitEditing={openProfile} style={{ minHeight: 52, paddingHorizontal: 12, borderWidth: 1, borderColor: invalid ? c.warningText : c.border, borderRadius: 10, backgroundColor: c.canvas, color: c.ink, fontSize: 17 }} />
      {invalid && <StatusMessage tone="error">{t('Check the ETF symbol, benchmark and period.')}</StatusMessage>}
      <Choice title={t('Compare with')} selected={benchmark} values={['SPY', 'QQQ']} palette={palette} onSelect={value => setBenchmark(value as EtfQuery['benchmark'])} />
      <Choice title={t('Period')} selected={period} values={['1m', '3m', '6m', '1y']} palette={palette} onSelect={value => setPeriod(value as EtfQuery['period'])} />
      <PrimaryButton testID="etf-read" label="Read ETF" busy={state.loading} disabled={state.loading} onPress={openProfile} />
      <PrimaryButton label="ETF watchlist" onPress={() => router.push(watchlistPath as Href)} />
      {state.error && <StatusMessage tone={state.error.kind === 'rejected' ? 'error' : 'warning'}>{state.error.kind === 'rejected' && state.error.code === 'SYS_VALIDATION_ERROR' ? t('Check the ETF symbol, benchmark and period.') : t('ETF research could not be loaded. Your inputs are still here; check the connection or symbol and retry.')}</StatusMessage>}
      {state.error && <PrimaryButton label="Try again" onPress={() => manager?.retry()} />}
    </Section>
    {state.loading && <Copy>{t('Loading ETF research…')}</Copy>}
    {profile && <>
      <Section title={t('Latest quote')} palette={palette}>
        {statusText && <Text accessibilityRole="alert" style={{ color: profile.meta.status === 'complete' ? c.ink : c.warningText, fontSize: 15, lineHeight: 23 }}>{statusText}{profile.meta.isStale ? ` ${t('Showing previously fetched data because a source could not be refreshed.')}` : ''}</Text>}
        <MetricRow label={t('Latest price')} value={number(profile.quote?.regularMarketPrice ?? null, '', false, profile.quote?.currency ?? null)} palette={palette} />
        <MetricRow label={t('Previous close')} value={number(profile.quote?.previousClose ?? null, '', false, profile.quote?.currency ?? null)} palette={palette} />
        <MetricRow label={t('Change')} value={number(profile.quote?.change ?? null, '', true, profile.quote?.currency ?? null)} palette={palette} />
        <MetricRow label={t('Change percent')} value={number(profile.quote?.changePercent ?? null, '%', true)} palette={palette} />
        <MetricRow label={t('Market status')} value={profile.quote?.marketState ?? t('Unavailable')} palette={palette} />
        <MetricRow label={t('Market time')} value={tDay(profile.quote?.lastUpdateTime ?? null)} palette={palette} />
        <MetricRow label={t('Observation date')} value={profile.meta.asOf ? tDay(profile.meta.asOf) : t('Unavailable')} palette={palette} />
        <MetricRow label={t('Fetched')} value={tDay(profile.meta.fetchedAt)} palette={palette} />
      </Section>
      <Section title={t('Price risk')} palette={palette}>
        {allMetrics.filter(item => item.section === 'risk').map(item => <DataMetric key={item.key} metric={item} profile={profile} palette={palette} number={number} t={t} tDay={tDay} />)}
        <MetricRow label={t('Observations')} value={new Intl.NumberFormat(locale).format(profile.risk.observations)} palette={palette} />
        <MetricRow label={t('Observation date')} value={profile.risk.asOf ?? t('Unavailable')} palette={palette} />
      </Section>
      <Section title={t('Fund details')} palette={palette}>
        {allMetrics.filter(item => item.section === 'valuation').map(item => <DataMetric key={item.key} metric={item} profile={profile} palette={palette} number={number} t={t} tDay={tDay} />)}
      </Section>
      <Section title={t('Relative returns')} palette={palette}>
        <MetricRow label={t('Compare with')} value={profile.benchmark} palette={palette} />
        <MetricRow label={t('Period')} value={t(profile.period === '1m' ? '1 month' : profile.period === '3m' ? '3 months' : profile.period === '6m' ? '6 months' : '1 year')} palette={palette} />
        {allMetrics.filter(item => item.section === 'rs').map(item => <DataMetric key={item.key} metric={item} profile={profile} palette={palette} number={number} t={t} tDay={tDay} />)}
        <MetricRow label={t('Observation window')} value={`${profile.rs.from ?? t('Unavailable')} – ${profile.rs.to ?? t('Unavailable')}`} palette={palette} />
        <MetricRow label={t('Trend')} value={profile.rs.trend ? t(profile.rs.trend) : t('Unavailable')} palette={palette} />
      </Section>
      <Section title={t('Method and limits')} palette={palette}>
        <Copy>{t('Risk uses daily closes: sample volatility annualized over 252 trading days, drawdown over 252 observations, and current volume versus the previous 20 observations. Returns use common trading dates; relative return is the difference in percentage points.')}</Copy>
        <SourceDetails profile={profile} metrics={allMetrics} palette={palette} t={t} tDay={tDay} />
      </Section>
    </>}
  </AccountPage>;
}

function DataMetric({ metric, profile, palette, number, t, tDay }: {
  metric: Metric; profile: EtfProfile; palette: Palette;
  number(value: number | null, suffix?: string, signed?: boolean, currency?: string | null): string;
  t(value: string): string; tDay(value: string | null): string;
}) {
  const source = profile.meta.sources[metric.key];
  return <View accessible accessibilityLabel={`${metric.label}: ${number(metric.value, metric.suffix ?? '', metric.signed ?? false, metric.currency ?? null)}`} style={{ gap: 3, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: palette.border }}>
    <MetricRow label={metric.label} value={number(metric.value, metric.suffix ?? '', metric.signed ?? false, metric.currency ?? null)} palette={palette} />
    {source && <Text style={{ color: palette.muted, fontSize: 13 }}>{`${t('Source')}: ${t(source.source)} · ${t('Fetched')}: ${tDay(source.fetchedAt)}${source.isStale ? ` · ${t('Stale')}` : ''}`}</Text>}
  </View>;
}

function SourceDetails({ profile, metrics, palette, t, tDay }: { profile: EtfProfile; metrics: Metric[]; palette: Palette; t(value: string): string; tDay(value: string | null): string }) {
  const [expanded, setExpanded] = useState(false);
  const byKey = new Map(metrics.map(metric => [metric.key, metric.label]));
  const sources = Object.entries(profile.meta.sources);
  return <View style={{ gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={t(expanded ? 'Hide data sources' : 'Show data sources')} onPress={() => setExpanded(value => !value)} style={{ minHeight: 48, justifyContent: 'center' }}>
      <Text style={{ color: palette.action, fontSize: 16, fontWeight: '700' }}>{t(expanded ? 'Hide data sources' : 'Show data sources')}</Text>
    </Pressable>
    {expanded && (sources.length ? sources.map(([key, value]) => <Text key={key} style={{ color: palette.muted, fontSize: 14, lineHeight: 22 }}>{`${byKey.get(key) ?? t('Latest price')} · ${t(value.source)} · ${tDay(value.fetchedAt)}${value.isStale ? ` · ${t('Stale')}` : ''}`}</Text>) : <Copy>{t('No source fields are available for this response.')}</Copy>)}
  </View>;
}

function MetricRow({ label, value, palette }: { label: string; value: string; palette: Palette }) {
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingVertical: 5 }}>
    <Text style={{ flex: 1, color: palette.muted, fontSize: 15, lineHeight: 22 }}>{label}</Text>
    <Text selectable accessibilityLabel={`${label}: ${value}`} style={{ maxWidth: '58%', color: palette.ink, fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'], textAlign: 'right' }}>{value}</Text>
  </View>;
}

function Section({ title, children, palette }: { title: string; children: React.ReactNode; palette: Palette }) {
  return <View style={{ gap: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }}>
    <Text accessibilityRole="header" style={{ color: palette.ink, fontSize: 20, fontWeight: '700' }}>{title}</Text>{children}
  </View>;
}

function Choice({ title, selected, values, palette, onSelect }: { title: string; selected: string; values: string[]; palette: Palette; onSelect(value: string): void }) {
  return <View style={{ gap: 6 }}>
    <Text style={{ color: palette.ink, fontSize: 15 }}>{title}</Text>
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {values.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${title}: ${value}`} accessibilityState={{ selected: selected === value }} onPress={() => onSelect(value)} style={{ minHeight: 48, minWidth: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: selected === value ? 2 : 1, borderColor: selected === value ? palette.action : palette.border, backgroundColor: palette.surface }}><Text style={{ color: palette.ink, fontSize: 16 }}>{value}</Text></Pressable>)}
    </View>
  </View>;
}
