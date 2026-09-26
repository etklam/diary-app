import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Alert, AppState, Text, View } from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import type { AlertResponse } from '@diary/contracts/alerts';
import { useAuth } from '@/auth/context';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { usePreferences } from '@/preferences/context';
import { reminderService } from '@/reminders/service';
import { createReminderManager } from '@/reminders/manager';
import { isReminderRoot } from '@/reminders/model';

export default function RemindersScreen() {
  const { api, diaryScope } = useAuth();
  if (!api || !diaryScope) return null;
  return <RemindersOwner key={diaryScope.ownerId} api={api} scope={diaryScope} />;
}
function RemindersOwner({ api, scope }: { api: NonNullable<ReturnType<typeof useAuth>['api']>; scope: NonNullable<ReturnType<typeof useAuth>['diaryScope']> }) {
  const { retryVerification } = useAuth();
  const { colors: c, t, locale, settings } = usePreferences();
  const model = useMemo(() => createReminderManager(reminderService(api, scope), scope.isCurrent), [api, scope]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => () => model.dispose(), [model]);
  useFocusEffect(useCallback(() => { void model.refresh(); }, [model]));
  useEffect(() => { const sub = AppState.addEventListener('change', next => { if (next === 'active') void model.refresh(); }); return () => sub.remove(); }, [model]);
  const locked = !!state.pending || !!state.uncertainId || state.error?.kind === 'session';
  const dismiss = (row: AlertResponse) => Alert.alert(t(isReminderRoot(row) ? 'Dismiss entire series?' : 'Dismiss this reminder?'),
    t(isReminderRoot(row) ? 'This cancels every occurrence in this series.' : 'Other occurrences stay active.'), [
      { text: t('Cancel'), style: 'cancel' }, { text: t('Dismiss'), style: 'destructive', onPress: () => { void model.dismiss(row.id); } },
    ]);
  return <AccountPage title="Diary reminders">
    <Copy>Add or edit reminders in the related Diary editor.</Copy>
    <PrimaryButton label="Open Diary library" onPress={() => router.push('/library')} />
    <Copy>{`${t('Account timezone')}: ${settings?.timezone ?? t('Unavailable')}`}</Copy>
    {state.uncertainId && <StatusMessage tone="warning">Dismissal could not be confirmed. Refresh to inspect the current reminders. This request will not be repeated.</StatusMessage>}
    {state.error?.kind === 'session' && <StatusMessage tone="warning">Your session needs verification before reminders can be changed.</StatusMessage>}
    {state.error?.kind === 'session' && <PrimaryButton label="Retry verification" onPress={() => { void retryVerification().then(() => { if (scope.isCurrent()) void model.refresh(); }); }} />}
    {state.error?.kind === 'rejected' && <StatusMessage tone="error">The request was rejected. Your reminders are still shown; refresh before trying again.</StatusMessage>}
    {state.saved && <StatusMessage tone="warning">Reminder dismissed.</StatusMessage>}
    {state.readError && <StatusMessage tone="error">Could not refresh reminders. Previously loaded reminders are still shown.</StatusMessage>}
    <PrimaryButton label="Refresh reminders" busy={state.loading} disabled={!!state.pending} onPress={() => void model.refresh()} />
    {state.items && <Copy>{`${state.items.length} / 100 · ${t('Active reminders, earliest first. The server returns at most 100 occurrences.')}`}</Copy>}
    {state.items?.length === 0 && <Copy>No active reminders.</Copy>}
    <View accessibilityRole="list" style={{ gap: 12 }}>{state.items?.map(row => <View key={row.id} testID={`reminder-${row.id}`}
      style={{ gap: 10, padding: 16, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface }}>
      <Text selectable style={{ color: c.ink, fontSize: 18, lineHeight: 27 }}>{row.message}</Text>
      <Copy>{settings?.timezone ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: settings.timezone }).format(new Date(row.triggerAt)) : row.triggerAt}</Copy>
      {row.recurringMode && <Copy>{`${t(row.recurringMode === 'WEEK' ? 'Through Friday' : 'Through month end')} · ${row.instanceNumber}${row.isPaused ? ` · ${t('Paused')}` : ''}`}</Copy>}
      <Text style={{ color: c.ink, fontSize: 17 }}>{row.diary?.title ?? t('Diary')}</Text>
      <PrimaryButton label="Open related Diary" onPress={() => router.push(`/diaries/${row.diaryId}` as Href)} />
      <PrimaryButton label="Edit Diary reminders" disabled={locked} onPress={() => router.push({ pathname: '/diaries/editor', params: { id: row.diaryId } })} />
      <PrimaryButton label={isReminderRoot(row) ? 'Dismiss entire series' : 'Dismiss reminder'} disabled={locked} onPress={() => dismiss(row)} />
    </View>)}</View>
  </AccountPage>;
}
