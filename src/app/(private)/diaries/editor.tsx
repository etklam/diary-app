import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, BackHandler, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useHeaderHeight, usePreventRemove } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/context';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { ReadLoading } from '@/components/diary-ui';
import { Markdown } from '@/markdown/reader';
import { usePreferences, type Colors } from '@/preferences/context';
import type { DiaryEditorController } from '@/diary-editor/controller';
import type { EditorTransactionDraft } from '@/diary-editor/model';
import { ReminderFields } from '@/reminders/fields';
import { localTimezone, localTradeChoices, localTradeInstants, localTradeValue, resolveLocalTradeInstant } from '@/diary-editor/trade-time';

export default function DiaryEditorScreen() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const { diaryEditor, diaryScope } = useAuth();
  const controller = useMemo(() => diaryScope && diaryEditor
    ? diaryEditor.open(typeof id === 'string' ? id : null, typeof date === 'string' ? date : undefined) : null,
  [diaryEditor, diaryScope, id, date]);
  return controller ? <Editor key={`${diaryScope!.ownerId}:${id ?? date ?? 'today'}`} controller={controller} /> : null;
}

function Editor({ controller }: { controller: DiaryEditorController }) {
  const { colors, t } = usePreferences();
  const styles = createStyles(colors);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const [preview, setPreview] = useState(false);
  const [allowRemove, setAllowRemove] = useState(false);
  const { draft } = state;
  const unresolved = !!draft.attempt;
  const dirty = !state.confirmedId && draft.revision > 0;
  const locked = !state.ready || state.busy || unresolved || !!state.confirmedId;
  const ledgerRejectionMessage = state.ledgerRejection
    ? state.ledgerRejection.kind === 'no-holding'
      ? `${t('No holding is available to sell for')} ${state.ledgerRejection.symbol}. ${t('The sale was rejected. Your input is retained and server data was not changed.')}`
      : `${t('Sale quantity exceeds the available holding for')} ${state.ledgerRejection.symbol}. ${t('The sale was rejected. Your input is retained and server data was not changed.')}`
    : null;
  const saleTransactions = state.ledgerReadback?.transactions.filter(transaction => transaction.type === 'SELL') ?? [];
  const realizedTrades = state.ledgerReadback?.realizedTrades ?? null;
  const realizedSales = realizedTrades?.flatMap(result => {
    const sale = saleTransactions.find(transaction => transaction.id === result.id);
    return sale ? [{ result, sale }] : [];
  }) ?? [];

  usePreventRemove(dirty && !allowRemove && !state.busy, ({ data }) => {
    const leaveWithDraft = () => void controller.flush().then(() => {
      setAllowRemove(true); requestAnimationFrame(() => navigation.dispatch(data.action));
    }).catch(() => Alert.alert(t('Draft retained'), t('The encrypted draft could not be saved. Stay here and retry.')));
    const leave = { text: t(unresolved ? 'Leave with unresolved attempt' : 'Leave with encrypted draft'), onPress: leaveWithDraft };
    const discardAction = { text: t('Discard draft and leave'), style: 'destructive' as const, onPress: () => {
      void controller.discard().then(() => { setAllowRemove(true); requestAnimationFrame(() => navigation.dispatch(data.action)); })
        .catch(() => Alert.alert(t('Draft retained'), t('Could not discard the encrypted draft. Stay here and retry.')));
    } };
    const actions = unresolved
      ? [{ text: t('Stay here'), style: 'cancel' as const }, leave]
      : [{ text: t('Stay here'), style: 'cancel' as const }, leave, discardAction];
    Alert.alert(t('Diary changes are saved on this device'),
      t(unresolved ? 'Your exact write attempt is retained. Leaving does not cancel a request that may still complete.' : 'Choose whether to keep or discard your encrypted local edits.'), actions);
  });
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Keyboard.isVisible()) { Keyboard.dismiss(); return true; } return false;
    }); return () => subscription.remove();
  }, []));

  const discard = () => Alert.alert(t('Discard diary draft?'), t('Remove your local edits from this device? The server diary will remain unchanged.'), [
    { text: t('Keep draft'), style: 'cancel' }, { text: t('Discard draft'), style: 'destructive', onPress: () => {
      void controller.discard().then(() => { setAllowRemove(true); router.back(); })
        .catch(() => Alert.alert(t('Draft retained'), t('Could not discard the encrypted draft. Please retry.')));
    } },
  ]);
  const adoptLatest = () => Alert.alert(t('Use the current server version as a new baseline?'),
    t('Your local edits stay in the form. Saving afterward will explicitly apply them to the latest diary.'), [
      { text: t('Cancel'), style: 'cancel' }, { text: t('Use latest version'), onPress: () => void controller.adoptLatest() },
    ]);
  const messages = {
    storage: 'The encrypted draft could not be saved. Your existing data is retained; retry local storage before leaving.',
    read: 'Could not read the current diary. Your local edits remain. Retry the server read before saving.',
    validation: 'Enter a title and diary text, and check the date, tags, stock symbols and transaction fields. Quantity and price must be positive with at most 4 decimal places; trade time must be valid.',
    rejected: 'The server rejected this change. Your local edits are retained and the server was not changed.',
    conflict: 'The server diary changed or another diary already uses this date. Compare the current version before saving.',
    unknown: 'The save result is not confirmed. The exact request is retained. Check the server; it will not be submitted again automatically.',
  } as const;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {!state.ready && <ReadLoading label={t('Opening diary editor…')} />}
        {state.restored && <Text style={styles.meta}>{t('Restored your encrypted diary draft from this device.')}</Text>}
        {state.conflict ? <StatusMessage tone="warning">{t(messages.conflict)}</StatusMessage>
          : state.issue && <StatusMessage tone={state.issue === 'rejected' ? 'error' : 'warning'}>
            {ledgerRejectionMessage ?? t(messages[state.issue])}
          </StatusMessage>}
        {state.refreshIssue && <StatusMessage tone="warning">{t('Diary saved, but refreshing it failed. The save is confirmed; retry reading without submitting again.')}</StatusMessage>}
        {state.conflict && state.existingId && <PrimaryButton label={t('Open diary for this date')} onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: state.existingId! } } as Href)} />}
        {state.conflict && controller && draft.baseline && <PrimaryButton label={t('Adopt latest server version')} onPress={adoptLatest} />}
        {state.confirmedId ? <>
          <StatusMessage tone="warning">{t('Diary save confirmed.')}</StatusMessage>
          {state.ledgerReadbackIssue && <>
            <StatusMessage tone="warning">{t('The saved trade, canonical holding or realized result could not be confirmed yet. Only a read will be retried; no trade will be submitted again.')}</StatusMessage>
            <PrimaryButton label="Retry diary refresh" onPress={() => void controller.retryRefresh()} />
          </>}
          {state.ledgerReadback && <View style={styles.card}>
            <Text style={styles.label}>{t('Saved transactions')}</Text>
            {state.ledgerReadback.transactions.map(transaction => <Text key={transaction.id} style={styles.meta}>
              {transaction.type} {transaction.symbol} · {transaction.quantity} @ {transaction.price} · {transaction.tradeDate}
            </Text>)}
            <Text style={styles.label}>{t('Canonical holdings')}</Text>
            {state.ledgerReadback.holdings === null ? <Text style={styles.meta}>{t('Reading holdings…')}</Text>
              : state.ledgerReadback.holdings.length === 0 ? <Text style={styles.meta}>{t('No open holdings were returned.')}</Text>
              : state.ledgerReadback.holdings.map(holding => <Text key={holding.symbol} style={styles.meta}>
                {holding.symbol} · {holding.quantity} · {t('Average cost')}: {holding.avgCost} · {t('Total cost')}: {holding.totalCost}
              </Text>)}
            {saleTransactions.length > 0 && <>
              <Text style={styles.label}>{t('Realized results')}</Text>
              {realizedTrades === null ? <Text style={styles.meta}>{t('Reading recent realized results…')}</Text>
                : realizedSales.length === 0 ? <Text style={styles.meta}>{t('No matching realized result was returned; the sale may be outside the recent-results window or limit.')}</Text>
                : realizedSales.map(({ sale, result }) => <Text key={result.id} style={styles.meta}>
                  {sale.symbol} · {result.sellDate} · {t('Sale quantity')}: {result.sellQuantity} · {t('Realized gain / loss')}: {result.realizedPnL} · {t('Return')}: {result.realizedPnLPct}%
                </Text>)}
            </>}
          </View>}
          {state.persistence === 'error' && <PrimaryButton label={t('Retry local cleanup')} onPress={() => void controller.retryCleanup()} />}
          {state.refreshIssue && <PrimaryButton label={t('Retry diary refresh')} onPress={() => void controller.retryRefresh()} />}
          <PrimaryButton label={t('Open saved diary')} onPress={() => router.replace({ pathname: '/diaries/[id]', params: { id: state.confirmedId! } } as Href)} />
        </> : <>
          <Field label="Date (YYYY-MM-DD)" accessibilityLabel="Diary date" value={draft.fields.date} editable={!locked}
            onChangeText={date => controller.edit({ date })} colors={colors} />
          <Field label="Title" accessibilityLabel="Diary title" value={draft.fields.title} maxLength={500} editable={!locked}
            onChangeText={title => controller.edit({ title })} colors={colors} />
          <Text style={styles.label}>{t('Diary text (Markdown)')}</Text>
          {preview ? <View style={styles.preview}><Markdown>{draft.fields.content || t('Nothing to preview yet.')}</Markdown></View>
            : <TextInput accessibilityLabel={t('Diary text')} multiline textAlignVertical="top" maxLength={500000} editable={!locked}
              placeholder={t('Write your diary…')} placeholderTextColor={colors.muted} style={[styles.input, styles.body]}
              value={draft.fields.content} onChangeText={content => controller.edit({ content })} />}
          <PrimaryButton label={preview ? 'Edit Markdown' : 'Preview Markdown'} disabled={state.busy} onPress={() => setPreview(!preview)} />
          <Field label="Tags (comma separated)" accessibilityLabel="Diary tags" value={draft.fields.tags} maxLength={6000} editable={!locked}
            onChangeText={tags => controller.edit({ tags })} colors={colors} />
          <Field label="Stock symbols (comma separated)" accessibilityLabel="Stock symbols" value={draft.fields.stockSymbols} maxLength={1000} editable={!locked}
            onChangeText={stockSymbols => controller.edit({ stockSymbols })} colors={colors} />
          {(['thesis', 'risk', 'execution'] as const).map(key => <View key={key} style={styles.field}>
            <Text style={styles.label}>{t({ thesis: 'Thesis', risk: 'Risk', execution: 'Execution' }[key])}</Text>
            <TextInput accessibilityLabel={t({ thesis: 'Diary thesis', risk: 'Diary risk', execution: 'Diary execution' }[key])}
              multiline textAlignVertical="top" maxLength={10000} editable={!locked} style={[styles.input, styles.optional]}
              value={draft.fields[key]} onChangeText={value => controller.edit({ [key]: value })} />
            {!!draft.fields[key] && <PrimaryButton label={t(`Clear ${key}`)} disabled={locked} onPress={() => controller.edit({ [key]: '' })} />}
          </View>)}
          <TransactionAuthoring rows={draft.fields.transactions} disabled={locked}
            onChange={transactions => controller.edit({ transactions })} />
          <ReminderFields value={draft.fields.reminders} disabled={locked}
            onChange={reminders => controller.edit({ reminders })} />
          {unresolved && <View style={styles.field}>
            <Text style={styles.label}>{t('Unconfirmed save')}</Text>
            <Text style={styles.meta}>{t('A read may show whether the change is visible, but it cannot cancel a request still in flight.')}</Text>
            {state.recovery === 'matches' && <StatusMessage tone="warning">{t('The current diary matches this attempt, but the read cannot prove the original request has finished. Keep this attempt and inspect the diary before deciding what to do.')}</StatusMessage>}
            <PrimaryButton label={t('Check save outcome')} busy={state.busy} onPress={() => void controller.checkResult()} />
            {state.existingId && <PrimaryButton label={t('Open current diary')} onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: state.existingId! } } as Href)} />}
          </View>}
          {state.issue === 'read' && <PrimaryButton label={t('Retry server read')} onPress={() => void controller.start()} />}
          {state.persistence === 'error' && <PrimaryButton label={t('Retry local draft save')} onPress={() => void controller.flush().catch(() => {})} />}
          {state.restored && !unresolved && <PrimaryButton label={t('Discard diary draft')} disabled={state.busy} onPress={discard} />}
        </>}
      </ScrollView>
      {!state.confirmedId && <View style={styles.footer}>
        <Text accessibilityLiveRegion="polite" style={styles.meta}>{state.persistence === 'error' ? t('Encrypted draft storage unavailable')
          : state.persistence === 'pending' ? t('Saving encrypted draft on this device…')
          : dirty ? t('Encrypted draft saved on this device') : t('No local edits')}</Text>
        <PrimaryButton label={controller ? (draft.baseline ? 'Save diary changes' : 'Create diary') : 'Save diary'} busy={state.busy}
          disabled={locked || state.conflict || state.persistence === 'error'} onPress={() => void controller.save()} />
      </View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function TransactionAuthoring({ rows, disabled, onChange }: { rows: EditorTransactionDraft[]; disabled: boolean;
  onChange(rows: EditorTransactionDraft[]): void }) {
  const { colors, t } = usePreferences();
  const styles = createStyles(colors);
  const timezone = localTimezone();
  const update = (key: string, patch: Partial<EditorTransactionDraft>) => onChange(rows.map(row => row.key === key ? { ...row, ...patch } : row));
  const add = (type: 'BUY' | 'SELL') => {
    if (rows.length >= 100) return;
    const now = new Date();
    onChange([...rows, { key: `new-${now.getTime()}-${Math.random().toString(36).slice(2)}`, type,
      symbol: '', quantity: '', price: '', tradeDate: localTradeValue(now, timezone), instant: now.toISOString(), timeZone: timezone,
      notes: '', strategy: '', emotion: '' }]);
  };
  const emotions = ['calm', 'confident', 'uncertain', 'fomo', 'fear', 'greed'] as const;
  return <View style={styles.tradeSection}>
    <Text style={styles.title}>{t('Transactions')}</Text>
    <Text style={styles.meta}>{t('Record completed purchases and sales with up to 4 decimal places. Trade times use the device timezone.')}</Text>
    <Text style={styles.meta}>{timezone}</Text>
    {rows.map((row, index) => {
      if (row.id) return <View key={row.key} style={styles.card}>
        <Text style={styles.label}>{t('Saved transaction')} {index + 1} · {t(row.type === 'BUY' ? 'Purchase' : 'Sale')}</Text>
        <Text style={styles.meta}>{row.symbol} · {row.quantity} @ {row.price} · {row.instant}</Text>
        {row.strategy !== '' && <Text style={styles.meta}>{t('Strategy')}: {row.strategy}</Text>}
        {row.emotion !== '' && <Text style={styles.meta}>{t('Emotion')}: {t(emotionLabel(row.emotion))}</Text>}
        {row.notes !== '' && <Text style={styles.meta}>{t('Trade notes')}: {row.notes}</Text>}
      </View>;
      const rowTimezone = row.timeZone || timezone;
      const choices = localTradeChoices(row.tradeDate, row.instant, rowTimezone);
      const resolved = resolveLocalTradeInstant(row.tradeDate, row.instant, rowTimezone);
      return <View key={row.key} style={styles.card}>
        <View style={styles.tradeHeading}><Text style={styles.label}>{t(row.type === 'BUY' ? 'Purchase' : 'Sale')} {index + 1}</Text>
          <PrimaryButton label={row.type === 'BUY' ? 'Remove purchase' : 'Remove sale'} disabled={disabled} onPress={() => onChange(rows.filter(item => item.key !== row.key))} />
        </View>
        <TradeField label="Symbol" accessibilityLabel="Trade symbol" value={row.symbol} maxLength={20} editable={!disabled}
          autoCapitalize="characters" onChangeText={symbol => update(row.key, { symbol })} />
        <TradeField label="Quantity" accessibilityLabel="Trade quantity" value={row.quantity} maxLength={64} editable={!disabled}
          keyboardType="decimal-pad" onChangeText={quantity => update(row.key, { quantity })} />
        <TradeField label="Price per share" accessibilityLabel="Trade price" value={row.price} maxLength={64} editable={!disabled}
          keyboardType="decimal-pad" onChangeText={price => update(row.key, { price })} />
        <TradeField label="Trade date and time (device local)" accessibilityLabel="Trade date and time" value={row.tradeDate}
          maxLength={16} editable={!disabled} autoCapitalize="none" placeholder="YYYY-MM-DDTHH:mm"
          onChangeText={value => {
            const options = localTradeInstants(value, rowTimezone);
            update(row.key, { tradeDate: value, instant: value === row.tradeDate ? row.instant : options.length === 1 ? options[0]! : '', timeZone: rowTimezone });
          }} />
        <Text style={styles.meta}>{t('Trade timezone')}: {rowTimezone}</Text>
        {choices.length > 1 && <View style={styles.field}>
          <Text style={styles.label}>{t('Choose UTC occurrence')}</Text>
          {choices.map(choice => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ selected: row.instant === choice }}
            accessibilityLabel={`${t('UTC occurrence')} ${choice}`} disabled={disabled} onPress={() => update(row.key, { instant: choice })}
            style={[styles.choice, row.instant === choice && styles.choiceSelected]}><Text style={styles.meta}>{choice}</Text></Pressable>)}
        </View>}
        {!!row.tradeDate && !resolved && <StatusMessage tone="error">{t('Enter a valid local trade time and choose its UTC occurrence if the clock repeats.')}</StatusMessage>}
        <TradeField label="Strategy" accessibilityLabel="Trade strategy" value={row.strategy} maxLength={100} editable={!disabled}
          onChangeText={strategy => update(row.key, { strategy })} />
        <Text style={styles.label}>{t('Emotion')}</Text>
        <View style={styles.emotions}>
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: !row.emotion }} disabled={disabled}
            onPress={() => update(row.key, { emotion: '' })} style={[styles.choice, !row.emotion && styles.choiceSelected]}><Text style={styles.meta}>{t('None')}</Text></Pressable>
          {emotions.map(emotion => <Pressable key={emotion} accessibilityRole="radio" accessibilityState={{ selected: row.emotion === emotion }} disabled={disabled}
            onPress={() => update(row.key, { emotion })} style={[styles.choice, row.emotion === emotion && styles.choiceSelected]}>
            <Text style={styles.meta}>{t(emotionLabel(emotion))}</Text>
          </Pressable>)}
        </View>
        <TradeField label="Trade notes" accessibilityLabel="Trade notes" value={row.notes} maxLength={10000} editable={!disabled}
          multiline onChangeText={notes => update(row.key, { notes })} />
      </View>;
    })}
    <PrimaryButton label="Add purchase" disabled={disabled || rows.length >= 100} onPress={() => add('BUY')} />
    <PrimaryButton label="Add sale" disabled={disabled || rows.length >= 100} onPress={() => add('SELL')} />
  </View>;
}

function emotionLabel(emotion: string) {
  return ({ calm: 'Calm', confident: 'Confident', uncertain: 'Uncertain', fomo: 'Fear of missing out', fear: 'Fear', greed: 'Greed' } as Record<string, string>)[emotion] ?? emotion;
}

function TradeField({ label, accessibilityLabel, value, editable, maxLength, onChangeText, autoCapitalize = 'none',
  keyboardType = 'default', multiline = false, placeholder }: { label: string; accessibilityLabel: string; value: string;
  editable: boolean; maxLength: number; onChangeText(value: string): void; autoCapitalize?: 'none' | 'characters';
  keyboardType?: 'default' | 'decimal-pad'; multiline?: boolean; placeholder?: string }) {
  const { colors, t } = usePreferences();
  const styles = createStyles(colors);
  return <View style={styles.field}>
    <Text style={styles.label}>{t(label)}</Text>
    <TextInput accessibilityLabel={t(accessibilityLabel)} autoCapitalize={autoCapitalize} keyboardType={keyboardType}
      multiline={multiline} maxLength={maxLength} editable={editable} placeholder={placeholder} placeholderTextColor={colors.muted}
      style={[styles.input, multiline && styles.notes]} value={value} onChangeText={onChangeText} />
  </View>;
}

function Field({ label, accessibilityLabel, value, editable, maxLength = 32, onChangeText, colors }: {
  label: string; accessibilityLabel: string; value: string; editable: boolean; maxLength?: number;
  onChangeText(value: string): void; colors: Colors }) {
  const { t } = usePreferences();
  const styles = createStyles(colors);
  return <View style={styles.field}><Text style={styles.label}>{t(label)}</Text><TextInput accessibilityLabel={t(accessibilityLabel)}
    autoCapitalize="none" maxLength={maxLength} editable={editable} style={styles.input} value={value} onChangeText={onChangeText} /></View>;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 }, content: { padding: 16, gap: 14 },
  field: { gap: 8 }, label: { fontSize: 15, fontWeight: '700', color: colors.ink },
  input: { backgroundColor: colors.surface, color: colors.ink, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, minHeight: 48 },
  body: { minHeight: 220, lineHeight: 25, textAlignVertical: 'top' }, optional: { minHeight: 92, textAlignVertical: 'top' },
  preview: { padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  meta: { fontSize: 13, lineHeight: 20, color: colors.muted },
  title: { fontSize: 18, fontWeight: '700', color: colors.ink }, tradeSection: { gap: 12 }, card: { gap: 10, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  tradeHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  emotions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface },
  choiceSelected: { borderColor: colors.action, borderWidth: 2 }, notes: { minHeight: 80, textAlignVertical: 'top' },
  footer: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
