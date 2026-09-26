import { Pressable, Text, View } from 'react-native';
import { Copy, Field } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { usePreferences } from '@/preferences/context';
import { localTimezone, localTradeChoices, localTradeInstants, localTradeValue, resolveLocalTradeInstant } from '@/diary-editor/trade-time';
import type { ReminderEditor, ReminderRow } from './model';

export function ReminderFields({ value, onChange, disabled }: { value: ReminderEditor | undefined;
  onChange(value: ReminderEditor): void; disabled: boolean }) {
  const { colors: c, t, settings } = usePreferences();
  if (!value) return <StatusMessage tone="warning">Save or discard this older Diary draft, then reopen the editor to load its reminders.</StatusMessage>;
  const editor = value ?? { rows: [], original: [] };
  const change = (key: string, patch: Partial<ReminderRow>) => onChange({ ...editor, rows: editor.rows.map(row => row.key === key ? { ...row, ...patch } : row) });
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>{t('Diary reminders')}</Text>
    <Copy>One-off times use the displayed device timezone. Repeating reminders run at 09:00 in your account timezone on weekdays, through Friday or the end of the month.</Copy>
    <Copy>A weekly start on a weekend begins next Monday. A monthly start only uses remaining weekdays in that month, which may produce no reminders.</Copy>
    <Copy>{`${t('Account timezone')}: ${settings?.timezone ?? t('Unavailable')}`}</Copy>
    {!!editor.original.length && <Copy>Changing reminders replaces this Diary’s reminder schedule, including dismissed occurrences. Leave reminders unchanged to preserve them.</Copy>}
    {editor.rows.map((row, index) => {
      const choices = localTradeChoices(row.time, row.instant, row.timeZone);
      return <View key={row.key} style={{ gap: 10, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 10 }}>
        <Text style={{ color: c.ink, fontWeight: '700', fontSize: 17 }}>{t('Reminder')} {index + 1}</Text>
        <Field label="Reminder message" value={row.message} maxLength={500} multiline error={!row.message.trim()} editable={!disabled} onChangeText={message => change(row.key, { message })} />
        {!row.message.trim() && <StatusMessage tone="error">Enter a reminder message.</StatusMessage>}
        <Field label="Reminder time" value={row.time} maxLength={16} editable={!disabled} placeholder="YYYY-MM-DDTHH:mm"
          onChangeText={time => { const options = localTradeInstants(time, row.timeZone); change(row.key, { time, instant: time === row.time ? row.instant : options.length === 1 ? options[0]! : '' }); }} />
        <Copy>{`${t('Timezone')}: ${row.timeZone}`}</Copy>
        {choices.length > 1 && <View accessibilityRole="radiogroup" style={{ gap: 8 }}><Copy>Choose UTC occurrence</Copy>{choices.map(instant =>
          <Pressable key={instant} accessibilityRole="radio" accessibilityLabel={`${t('UTC occurrence')} ${instant}`}
            accessibilityState={{ selected: row.instant === instant, disabled }} disabled={disabled} onPress={() => change(row.key, { instant })}
            style={{ padding: 12, minHeight: 48, borderWidth: row.instant === instant ? 2 : 1, borderColor: c.border, borderRadius: 8 }}>
            <Text style={{ color: c.ink }}>{instant}</Text></Pressable>)}</View>}
        {!resolveLocalTradeInstant(row.time, row.instant, row.timeZone) && <StatusMessage tone="error">Enter a valid reminder time and choose its UTC occurrence if the clock repeats.</StatusMessage>}
        <Copy>Repeat</Copy>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([['', 'One-off'], ['WEEK', 'Through Friday'], ['MONTH', 'Through month end']] as const).map(([mode, label]) =>
            <Pressable key={mode} accessibilityRole="radio" accessibilityLabel={t(label)} accessibilityState={{ selected: row.mode === mode, disabled }} disabled={disabled}
              onPress={() => change(row.key, { mode })} style={{ padding: 12, minHeight: 48, borderWidth: row.mode === mode ? 2 : 1, borderColor: c.border, borderRadius: 8 }}>
              <Text style={{ color: c.ink, fontSize: 16 }}>{t(label)}</Text></Pressable>)}
        </View>
        <PrimaryButton label="Remove reminder" disabled={disabled} onPress={() => onChange({ ...editor, rows: editor.rows.filter(item => item.key !== row.key) })} />
      </View>;
    })}
    <PrimaryButton label="Add reminder" disabled={disabled || editor.rows.length >= 50} onPress={() => {
      const now = new Date(); const timeZone = localTimezone();
      onChange({ ...editor, rows: [...editor.rows, { key: `new-${now.getTime()}-${Math.random()}`, message: '',
        time: localTradeValue(now, timeZone), instant: now.toISOString(), timeZone, mode: '' }] });
    }} />
  </View>;
}
