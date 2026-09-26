import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View, StyleSheet } from 'react-native';
import type { RecentClosedTrade } from '@diary/domain';
import type { QuickController } from './controller';
import { usePreferences } from '../preferences/context';

type State = 'loading' | 'ready' | 'error';

export function QuickRelatedTrades({ controller, value, disabled = false, onChange }: {
  controller: QuickController; value: RecentClosedTrade[]; disabled?: boolean; onChange(trades: RecentClosedTrade[]): void;
}) {
  const { colors, t } = usePreferences();
  const [trades, setTrades] = useState<RecentClosedTrade[] | null>(null);
  const [status, setStatus] = useState<State>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void controller.recentClosedTrades().then(result => {
      if (active) { setTrades(result); setStatus('ready'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [controller, retry]);
  const options = [...new Map([...(trades ?? []), ...value].map(trade => [trade.id, trade])).values()];
  return <View accessibilityRole="summary" style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <Text accessibilityRole="header" style={[styles.heading, { color: colors.ink }]}>{t('Related trade review')}</Text>
    <Text style={[styles.meta, { color: colors.muted }]}>{t('Select from your latest 50 sales in the past 30 days.')}</Text>
    <Text accessibilityLiveRegion="polite" style={[styles.meta, { color: colors.muted }]}>{t('Selected')}: {value.length}</Text>
    {status === 'loading' && <Text accessibilityLiveRegion="polite" style={[styles.meta, { color: colors.muted }]}>{t('Loading related trades…')}</Text>}
    {status === 'error' && <View style={styles.error}>
      <Text accessibilityRole="alert" style={[styles.meta, { color: colors.errorText }]}>{t('Recent trades could not be loaded. Selected trades are still saved with your draft.')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Retry')} disabled={disabled} onPress={() => { setStatus('loading'); setRetry(value => value + 1); }} style={styles.retry}>
        <Text style={{ color: colors.ink }}>{t('Retry')}</Text>
      </Pressable>
    </View>}
    {status === 'ready' && options.length === 0 && <Text style={[styles.meta, { color: colors.muted }]}>{t('No recent sales to select.')}</Text>}
    {options.map(trade => {
      const checked = value.some(item => item.id === trade.id);
      const label = `${trade.symbol} ${trade.sellDate.slice(0, 10)}, ${t('Quantity')} ${trade.sellQuantity}, ${t('Realized gain / loss')} ${trade.realizedPnL}, ${t('Return')} ${trade.realizedPnLPct}%`;
      return <View key={trade.id} style={[styles.trade, { borderTopColor: colors.border }]}>
        <View style={styles.copy}>
          <Text style={[styles.symbol, { color: colors.ink }]}>{trade.symbol} · {trade.sellDate.slice(0, 10)}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{t('Quantity')}: {trade.sellQuantity}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>{t('Realized gain / loss')}: {trade.realizedPnL} · {t('Return')}: {trade.realizedPnLPct}%</Text>
        </View>
        <Switch accessibilityLabel={label} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} disabled={disabled} value={checked}
          onValueChange={selected => onChange(selected ? [...value.filter(item => item.id !== trade.id), trade] : value.filter(item => item.id !== trade.id))}
          trackColor={{ false: colors.border, true: colors.action }} thumbColor={checked ? colors.onAction : colors.surface} />
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  heading: { fontSize: 16, fontWeight: '700' }, meta: { fontSize: 13, lineHeight: 19 },
  trade: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  copy: { flex: 1, gap: 3 }, symbol: { fontSize: 15, fontWeight: '700' }, error: { gap: 6 },
  retry: { fontSize: 15, fontWeight: '700', textDecorationLine: 'underline', alignSelf: 'flex-start', padding: 6 },
});
