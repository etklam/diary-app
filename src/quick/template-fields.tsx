import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { getQuickNoteObservationTypeOptions, getQuickNoteReflectionMarketConditionGroups, type QuickNoteTemplateData, type QuickNoteTemplateKind } from '@diary/domain';
import type { QuickController } from './controller';
import { usePreferences } from '../preferences/context';
import { QuickRelatedTrades } from './related-trades';

export function QuickTemplateFields({ kind, data, controller, disabled = false, change }: {
  kind: QuickNoteTemplateKind; data: QuickNoteTemplateData; controller: QuickController; disabled?: boolean; change(patch: Partial<QuickNoteTemplateData>): void;
}) {
  const { colors, locale, t } = usePreferences();
  const currentKind = useRef(kind);
  useEffect(() => { currentKind.current = kind; }, [kind]);
  const [spxBusy, setSpxBusy] = useState(false);
  const [spxError, setSpxError] = useState(false);
  const [spxSummary, setSpxSummary] = useState('');
  if (kind === 'blank') return null;
  const textField = (key: keyof QuickNoteTemplateData, label: string, multiline = false) => <View key={key} style={styles.field}>
    <Text style={[styles.label, { color: colors.ink }]}>{t(label)}</Text>
    <TextInput accessibilityLabel={t(label)} value={String(data[key] ?? '')} editable={!disabled} onChangeText={value => change({ [key]: value })}
      multiline={multiline} textAlignVertical={multiline ? 'top' : 'auto'} maxLength={10000}
      placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.border }, multiline && styles.multiline]} />
  </View>;
  const choices = (label: string, value: string, values: { value: string; label: string }[], onSelect: (selected: string) => void) => <View style={styles.field}>
    <Text style={[styles.label, { color: colors.ink }]}>{t(label)}</Text>
    <View style={styles.choices}>{values.map(option => <Pressable key={option.value} disabled={disabled} accessibilityRole="radio"
      accessibilityState={{ checked: option.value === value, disabled }} accessibilityLabel={t(option.label)} onPress={() => onSelect(option.value)}
      style={[styles.choice, { borderColor: colors.border, backgroundColor: option.value === value ? colors.action : colors.surface }]}>
      <Text style={{ color: option.value === value ? colors.onAction : colors.ink }}>{t(option.label)}</Text>
    </Pressable>)}</View>
  </View>;
  const loadSpxSession = async () => {
    setSpxBusy(true); setSpxError(false);
    try {
      const result = await controller.spxSession();
      if (currentKind.current !== 'reflection') return;
      change({ marketCondition: result.condition });
      setSpxSummary(`SPX ${result.condition} · ${result.changePercent.toFixed(2)}%`);
    } catch { if (currentKind.current === 'reflection') setSpxError(true); }
    finally { setSpxBusy(false); }
  };
  if (kind === 'trading') return <View style={styles.container}>
    <Text accessibilityRole="header" style={[styles.legend, { color: colors.ink }]}>{t('Trading note')}</Text>
    {choices('Operation', data.tradingType ?? '', [
      { value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }, { value: 'both', label: 'Both' }, { value: 'none', label: 'No trades' },
    ], tradingType => change({ tradingType }))}
    {textField('symbols', 'Symbols in note')}
    {choices('Market feeling', data.marketMood ?? '', [
      { value: 'bullish', label: 'Bullish' }, { value: 'bearish', label: 'Bearish' }, { value: 'neutral', label: 'Range-bound' },
    ], marketMood => change({ marketMood }))}
    {textField('note', 'Quick notes', true)}
  </View>;
  if (kind === 'reflection') {
    const conditions = getQuickNoteReflectionMarketConditionGroups(locale);
    return <View style={styles.container}>
      <Text accessibilityRole="header" style={[styles.legend, { color: colors.ink }]}>{t('Post-market reflection')}</Text>
      <View style={styles.field}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Use SPX session')} disabled={spxBusy || disabled} onPress={() => void loadSpxSession()}
          style={[styles.choice, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.ink }}>{spxBusy ? t('Loading market context…') : t('Use SPX session')}</Text>
        </Pressable>
        {!!spxSummary && <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: colors.muted }]}>{spxSummary}</Text>}
        {spxError && <Text accessibilityRole="alert" style={[styles.hint, { color: colors.errorText }]}>{t('Market context is unavailable. Choose a condition manually or retry.')}</Text>}
      </View>
      <Text style={[styles.label, { color: colors.ink }]}>{t('Market condition')}</Text>
      {conditions.map(group => <View key={group.label} style={styles.field}>
        <Text style={[styles.hint, { color: colors.muted }]}>{group.label}</Text>
        <View style={styles.choices}>{group.options.map(option => <Pressable key={option.value} disabled={disabled} accessibilityRole="radio"
          accessibilityState={{ checked: option.value === data.marketCondition, disabled }} accessibilityLabel={option.label} onPress={() => change({ marketCondition: option.value })}
          style={[styles.choice, { borderColor: colors.border, backgroundColor: option.value === data.marketCondition ? colors.action : colors.surface }]}>
          <Text style={{ color: option.value === data.marketCondition ? colors.onAction : colors.ink }}>{option.label}</Text>
        </Pressable>)}</View>
      </View>)}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.ink }]}>{t('Rating (0–5)')}</Text>
        <View style={styles.choices}>{[0, 1, 2, 3, 4, 5].map(rating => <Pressable key={rating} disabled={disabled} accessibilityRole="radio"
          accessibilityLabel={`${rating} ${t('stars')}`} accessibilityState={{ checked: rating === data.rating, disabled }} onPress={() => change({ rating })}
          style={[styles.choice, { borderColor: colors.border, backgroundColor: rating === data.rating ? colors.action : colors.surface }]}>
          <Text style={{ color: rating === data.rating ? colors.onAction : colors.ink }}>{rating}</Text>
        </Pressable>)}</View>
      </View>
      <View style={styles.switchRow}><Text style={[styles.label, { color: colors.ink, flex: 1 }]}>{t('No rash trading')}</Text>
        <Switch accessibilityLabel={t('No rash trading')} disabled={disabled} value={data.noRashTrading ?? false} onValueChange={noRashTrading => change({ noRashTrading })}
          trackColor={{ false: colors.border, true: colors.action }} thumbColor={data.noRashTrading ? colors.onAction : colors.surface} /></View>
      {textField('goodPoints', 'What went well', true)}
      {textField('improvePoints', 'Areas for improvement', true)}
      <QuickRelatedTrades controller={controller} value={data.relatedTrades ?? []} disabled={disabled} onChange={relatedTrades => change({ relatedTrades })} />
    </View>;
  }
  return <View style={styles.container}>
    <Text accessibilityRole="header" style={[styles.legend, { color: colors.ink }]}>{t('Market observation')}</Text>
    {textField('topic', 'Topic')}
    {choices('Observation type', data.observationType ?? '', getQuickNoteObservationTypeOptions(locale), observationType => change({ observationType }))}
    {textField('observationContent', 'Observation content', true)}
    {textField('action', 'Follow-up action', true)}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#888888', borderRadius: 10 },
  field: { gap: 7 }, legend: { fontSize: 16, fontWeight: '700' }, label: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18 }, input: { borderWidth: 1, borderRadius: 9, padding: 10, minHeight: 46, fontSize: 15 },
  multiline: { minHeight: 84, textAlignVertical: 'top' }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 }, switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
