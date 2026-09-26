import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { MarketState } from '@diary/contracts/market-state';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { createMarketStateManager } from './market-state-manager';
import { marketStateService } from './market-state-data';

const noSubscribe = () => () => {};
const emptyState = () => ({ snapshot: null, history: null, snapshotLoading: false, historyLoading: false, snapshotError: null, historyError: null });
const stateLabels: Record<MarketState, string> = { risk_on: 'Risk-on', neutral: 'Neutral', defensive: 'Defensive', risk_off: 'Risk-off', unknown: 'Unknown' };
const metricLabels = { up4: 'Advancing 4% or more', down4: 'Declining 4% or more', ratio: '10-day advance / decline ratio', above40: 'Above 40-day average', coverage: 'Universe coverage', score: 'Breadth score' };
const dateLabel = (value: string | null, locale: string, t: (key: string) => string) => {
  if (!value) return t('Unavailable');
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed) : t('Unavailable');
};
const valueLabel = (value: number | null, locale: string, suffix = '', t: (key: string) => string) => value === null ? t('Unavailable') : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}${suffix}`;

export function MarketStateScreen() {
  const { api } = useAuth();
  const { colors: c, locale, t } = usePreferences();
  const manager = useMemo(() => api ? createMarketStateManager(marketStateService(api)) : null, [api]);
  const state = useSyncExternalStore(manager?.subscribe ?? noSubscribe, manager?.getSnapshot ?? emptyState, manager?.getSnapshot ?? emptyState);

  useEffect(() => {
    if (!manager) return;
    void manager.refreshSnapshot();
    void manager.refreshHistory();
    return () => manager.dispose();
  }, [manager]);

  if (!api) return <AccountPage title="Market state"><StatusMessage tone="error">{t('Public market state is not configured on this build.')}</StatusMessage></AccountPage>;
  const snapshot = state.snapshot;
  const unknown = snapshot?.marketState === 'unknown';
  const warmup = unknown && !snapshot?.isStale && (snapshot.coveragePct === null || snapshot.coveragePct >= 90);
  const coverageStatus = !snapshot ? null : snapshot.isStale ? 'Snapshot is stale. The reading is unknown until fresh data arrives.' : snapshot.coveragePct === null || snapshot.coveragePct < 90 ? 'Coverage is too low to classify this market.' : warmup ? 'Breadth history is warming up. The state remains unknown.' : snapshot.coveragePct < 100 ? 'Partial universe coverage.' : null;
  const panel = { backgroundColor: c.surface, borderColor: c.border };
  const text = { color: c.ink };

  return <AccountPage title="Market state">
    <Copy>{t('Read persisted market breadth and its supporting observations. This screen does not run or schedule market-data jobs.')}</Copy>
    <Panel title={t('Latest market state')} style={panel} titleStyle={text}>
      {state.snapshotLoading && !snapshot && <Copy>{t('Loading market state…')}</Copy>}
      {state.snapshotError?.kind === 'missing' && !snapshot && <><StatusMessage tone="warning">{t('No market-state snapshot is available yet. It will appear after the scheduled source job writes one.')}</StatusMessage><PrimaryButton label="Retry market state" busy={state.snapshotLoading} onPress={() => void manager?.refreshSnapshot()} /></>}
      {state.snapshotError && state.snapshotError.kind !== 'missing' && <><StatusMessage tone="error">{snapshot ? t('Market state refresh failed. The prior snapshot remains visible.') : t('Market state could not be loaded. Retry this section.')}</StatusMessage><PrimaryButton label="Retry market state" busy={state.snapshotLoading} onPress={() => void manager?.refreshSnapshot()} /></>}
      {snapshot && <>
        {coverageStatus && <StatusMessage tone="warning">{t(coverageStatus)}</StatusMessage>}
        {snapshot.isStale && <StatusMessage tone="warning">{t('Stale')}</StatusMessage>}
        <Metric label={t('Regime')} value={t(stateLabels[snapshot.marketState])} colors={c} />
        <Metric label={t('Universe')} value={snapshot.universeKey} colors={c} />
        <Metric label={t('Snapshot date')} value={dateLabel(snapshot.date, locale, t)} colors={c} />
        <Metric label={t('Latest price date')} value={dateLabel(snapshot.latestPriceDate, locale, t)} colors={c} />
        <Metric label={t('Coverage')} value={valueLabel(snapshot.coveragePct, locale, '%', t)} colors={c} />
        <Metric label={t(metricLabels.score)} value={valueLabel(snapshot.score, locale, '', t)} colors={c} />
        <Metric label={t(metricLabels.up4)} value={valueLabel(snapshot.up4, locale, ` · ${valueLabel(snapshot.up4Pct, locale, '%', t)}`, t)} colors={c} />
        <Metric label={t(metricLabels.down4)} value={valueLabel(snapshot.down4, locale, ` · ${valueLabel(snapshot.down4Pct, locale, '%', t)}`, t)} colors={c} />
        <Metric label={t(metricLabels.ratio)} value={valueLabel(snapshot.ratio10d, locale, '', t)} colors={c} />
        <Metric label={t(metricLabels.above40)} value={valueLabel(snapshot.above40dPct, locale, '%', t)} colors={c} />
        <Copy>{t(unknown ? 'Unknown breadth is not a positive signal. Use caution until the underlying observations qualify.' : snapshot.marketState === 'risk_on' ? 'Risk-on breadth is confirmed by the stored market-state inputs.' : snapshot.marketState === 'risk_off' ? 'Risk-off breadth is confirmed by the stored market-state inputs.' : snapshot.marketState === 'defensive' ? 'The stored breadth readings indicate defensive conditions.' : 'The stored breadth readings are mixed.')}</Copy>
        {!unknown && <Metric label={t('Suggested exposure range')} value={snapshot.suggestedExposure} colors={c} />}
      </>}
      {!snapshot && !state.snapshotLoading && !state.snapshotError && <><Copy>{t('No market-state snapshot is available yet.')}</Copy><PrimaryButton label="Retry market state" onPress={() => void manager?.refreshSnapshot()} /></>}
    </Panel>

    <Panel title={t('Breadth history and confirmation')} style={panel} titleStyle={text}>
      <Copy>{t('Daily observations use the persisted configured universe. Missing values remain unavailable; each row is dated separately.')}</Copy>
      {state.historyLoading && !state.history && <Copy>{t('Loading breadth history…')}</Copy>}
      {state.historyError && <><StatusMessage tone="error">{state.history?.length ? t('History refresh failed. The prior rows remain visible.') : t('Breadth history could not be loaded. Retry this section.')}</StatusMessage><PrimaryButton label="Retry breadth history" busy={state.historyLoading} onPress={() => void manager?.refreshHistory()} /></>}
      {state.history && state.history.length === 0 && <Copy>{t('No breadth history is available yet.')}</Copy>}
      {state.history && state.history.length > 0 && <ScrollView horizontal nestedScrollEnabled accessibilityRole="none" accessibilityLabel={t('Scrollable breadth history table')}>
        <View style={{ minWidth: 720, gap: 1, borderColor: c.border, borderWidth: 1, borderRadius: 10, overflow: 'hidden' }} testID="market-state-history">
          <HistoryRow values={[t('Date'), t('Regime'), t('Advancing %'), t('Declining %'), t('10-day ratio'), t('Above 40-day %')]} header colors={c} />
          {state.history.map(row => <HistoryRow key={row.date} values={[dateLabel(row.date, locale, t), t(stateLabels[row.marketState]), valueLabel(row.up4Pct, locale, '%', t), valueLabel(row.down4Pct, locale, '%', t), valueLabel(row.ratio10d, locale, '', t), valueLabel(row.above40dPct, locale, '%', t)]} colors={c} />)}
        </View>
      </ScrollView>}
      {!state.history && !state.historyLoading && !state.historyError && <PrimaryButton label="Retry breadth history" onPress={() => void manager?.refreshHistory()} />}
    </Panel>
  </AccountPage>;
}

function Panel({ title, children, style, titleStyle }: { title: string; children: React.ReactNode; style: object; titleStyle: object }) {
  return <View style={{ gap: 9, padding: 16, borderRadius: 12, borderWidth: 1, ...style }}><Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', ...titleStyle }}>{title}</Text>{children}</View>;
}

function Metric({ label, value, colors }: { label: string; value: string; colors: { ink: string; muted: string; border: string } }) {
  return <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ flex: 1, color: colors.muted, fontSize: 15, lineHeight: 22 }}>{label}</Text><Text selectable style={{ maxWidth: '55%', color: colors.ink, textAlign: 'right', fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'] }}>{value}</Text></View>;
}

function HistoryRow({ values, header = false, colors }: { values: string[]; header?: boolean; colors: { ink: string; muted: string; border: string; action: string; surface: string } }) {
  const rowLabel = values.join('. ');
  return <View accessible accessibilityLabel={rowLabel} style={{ flexDirection: 'row', backgroundColor: header ? colors.surface : undefined, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 46, alignItems: 'center' }}>
    {values.map((value, index) => <Text key={`${index}-${value}`} style={{ width: index === 0 ? 150 : 114, paddingHorizontal: 8, paddingVertical: 6, color: header ? colors.action : colors.ink, fontSize: 14, fontWeight: header ? '700' : '400', fontVariant: ['tabular-nums'] }}>{value}</Text>)}
  </View>;
}
