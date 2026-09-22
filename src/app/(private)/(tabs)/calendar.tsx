import { usePreferences } from '@/preferences/context';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calendarDateInTimezone } from '@diary/domain';
import { useAuth } from '@/auth/context';
import { useDiaryStyles, ReadFailure, ReadLoading } from '@/components/diary-ui';
import { SmallButton, useControls } from '@/components/discovery-controls';
import { createCalendarState } from '@/diaries/discovery-state';
import { firstWeekday, monthRange, shiftMonth } from '@/diaries/dates';
import type { DiaryReadScope } from '@/diaries/access';

export default function CalendarScreen() {
  const { diaryScope, state } = useAuth();
  const user = state.status === 'signed-in' || state.status === 'recoverable-error' ? state.user : null;
  return diaryScope && user ? <Calendar scope={diaryScope} timezone={user.timezone} /> : null;
}
function Calendar({ scope, timezone }: { scope: DiaryReadScope; timezone: string }) {
  const { t, locale, colors: authColors } = usePreferences();
  const styles = useDiaryStyles();
  const controls = useControls();
  const { diaryMutation, beginQuick } = useAuth();
  const today = calendarDateInTimezone(new Date(), timezone);
  const [initialToday] = useState(today);
  const model = useMemo(() => createCalendarState(scope, initialToday), [scope, initialToday]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  useEffect(() => { void model.load(); return model.cancel; }, [model, diaryMutation]);
  if (!scope.isCurrent()) return null;
  const range = monthRange(state.month);
  const day = state.activity?.data.find(item => item.date === state.selected);
  const write = async () => {
    const initialized = await beginQuick(state.selected);
    if (!scope.isCurrent()) return;
    if (initialized) router.push('/diaries/quick');
    else Alert.alert(t('Resume existing draft?'), t('Your existing draft or unresolved save has been kept with its original date and content.'), [
      { text: t('Cancel'), style: 'cancel' }, { text: t('Resume draft'), onPress: () => { if (scope.isCurrent()) router.push('/diaries/quick'); } },
    ]);
  };
  return <SafeAreaView edges={['left', 'right']} style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.heading}>{t("Calendar")}</Text>
    <View style={controls.wrap}>
      <SmallButton label={t("Previous month")} onPress={() => model.month(shiftMonth(state.month, -1))} />
      <SmallButton label={t("Next month")} onPress={() => model.month(shiftMonth(state.month, 1))} />
      <SmallButton label={t("Today")} onPress={() => model.month(today.slice(0, 7), today)} />
    </View><Text style={styles.title}>{state.month}</Text>
    <View style={{ flexDirection: 'row', marginHorizontal: -12 }}>{(locale === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['日', '一', '二', '三', '四', '五', '六']).map((label, i) => <Text key={i} style={[styles.meta, { width: '14.2857%', textAlign: 'center' }]}>{label}</Text>)}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -12 }}>
      {Array.from({ length: firstWeekday(state.month) }, (_, i) => <View key={`blank-${i}`} style={{ width: '14.2857%' }} />)}
      {Array.from({ length: range.days }, (_, i) => {
        const date = `${state.month}-${String(i + 1).padStart(2, '0')}`;
        const exists = state.activity?.data.some(item => item.date === date);
        return <Pressable key={date} accessibilityRole="button" accessibilityState={{ selected: date === state.selected }}
          accessibilityLabel={`${date}${date === today ? ', ' + t('Today') : ''}, ${t(state.activity ? exists ? 'Diary' : 'No diary for this date.' : 'Loading month activity…')}`}
          onPress={() => model.select(date)} style={{ width: '14.2857%', minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 8,
            backgroundColor: date === state.selected ? authColors.border : 'transparent', borderWidth: date === today ? 1 : 0, borderColor: authColors.muted }}>
          <Text style={styles.body}>{i + 1}</Text><Text style={{ fontSize: 12 }}>{state.activity ? exists ? '●' : ' ' : '?'}</Text>
        </Pressable>;
      })}
    </View>
    {state.loading && <ReadLoading label={t("Loading month activity…")} />}
    {state.issue && <ReadFailure issue={state.issue} retry={() => void model.load()} />}
    {state.activity && <>
      {!state.activity.data.length && <Text style={styles.meta}>{t("No diaries in this month.")}</Text>}
      <Text style={styles.title}>{state.selected}</Text>
      {day ? <><Text style={styles.meta}>{day.transactionCount} {t("transactions ·")}{' '}{day.alertCount} {t("alerts")}</Text>
        <SmallButton label={t("Open diary")} onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: day.diaryId } })} /></>
        : <><Text style={styles.body}>{t("No diary for this date.")}</Text><SmallButton label={t("Write for this date")} onPress={() => void write()} /></>}
      <SmallButton label={t("Refresh activity")} onPress={() => void model.load()} />
    </>}
  </ScrollView></SafeAreaView>;
}
