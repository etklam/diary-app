import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { useInstantDate, usePreferences } from '@/preferences/context';
import { createDisciplineManager } from '@/discipline/manager';
import { localizeDisciplineDraw } from '@/discipline/fallbacks';
import { disciplineService } from '@/discipline/service';
import type { DisciplineResponse } from '@diary/contracts/discipline';
import { DisciplineTransferPanel } from '@/discipline/transfer-panel';

export default function DisciplineScreen() {
  const { api, diaryScope } = useAuth();
  if (!api || !diaryScope) return null;
  return <OwnerDiscipline key={diaryScope.ownerId} api={api} scope={diaryScope} />;
}

function OwnerDiscipline({ api, scope }: { api: NonNullable<ReturnType<typeof useAuth>['api']>; scope: NonNullable<ReturnType<typeof useAuth>['diaryScope']> }) {
  const service = useMemo(() => disciplineService(api, scope), [api, scope]);
  const model = useMemo(() => createDisciplineManager(service, scope.isCurrent), [service, scope]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  const { colors: c, locale, t } = usePreferences();
  const { retryVerification, state: authState } = useAuth();
  const formatDate = useInstantDate();
  const navigation = useNavigation();
  const [content, setContent] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editBaseline, setEditBaseline] = useState('');
  const dirty = editing ? content !== editBaseline : content.length > 0;
  const locked = state.busy || state.mutationUncertain || state.error?.kind === 'session';
  const rows = state.rows ?? [];
  const custom = state.drawn?.isCustom ?? false;
  const drawnContent = useMemo(() => state.drawn ? localizeDisciplineDraw(state.drawn, locale) : '', [locale, state.drawn]);

  useEffect(() => () => model.dispose(), [model]);
  useFocusEffect(useCallback(() => { void model.refresh(); }, [model]));
  usePreventRemove(dirty, ({ data }) => Alert.alert(t('Discard your unsaved principle?'), t('Your unsaved principle will be lost.'), [
    { text: t('Cancel'), style: 'cancel' },
    { text: t('Discard'), style: 'destructive', onPress: () => { clear(); navigation.dispatch(data.action); } },
  ]));

  function clear() { setContent(''); setEditing(null); setEditBaseline(''); }
  async function save(id?: string) { if (await model.save(content, id)) clear(); }
  function edit(item: DisciplineResponse) { setEditing(item.id); setEditBaseline(item.content); setContent(item.content); }
  function remove(item: DisciplineResponse) {
    Alert.alert(t('Delete principle?'), t('This permanently deletes this principle.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete principle'), style: 'destructive', onPress: () => { void model.remove(item.id); } },
    ]);
  }
  async function verify() { await retryVerification(); if (scope.isCurrent()) await model.refresh(); }

  return <AccountPage title="Trading principles">
    <Copy>Keep the rules you want to remember before your next decision.</Copy>
    {state.error?.kind === 'uncertain' && <StatusMessage tone="warning">The create result is uncertain. The list was checked; keep this draft and refresh before deciding whether to retry.</StatusMessage>}
    {state.error?.kind === 'session' && <StatusMessage tone="warning">Your session needs verification before these principles can be changed.</StatusMessage>}
    {state.error?.kind === 'rejected' && <StatusMessage tone="error">{state.error.code === 'SYS_VALIDATION_ERROR' ? 'Enter a principle of 1–255 characters.' : 'The request was rejected. Your edits are still here; refresh and retry.'}</StatusMessage>}
    {state.error?.kind === 'stale' && <StatusMessage tone="warning">This account changed. Reopen the screen to load the current account’s principles.</StatusMessage>}
    {state.saved && <StatusMessage tone="warning">Principles updated.</StatusMessage>}
    {state.error?.kind === 'session' && <PrimaryButton label="Retry verification" onPress={() => void verify()} />}
    {state.error && state.error.kind !== 'session' && <PrimaryButton testID="discipline-refresh" label="Refresh principles" busy={state.loading} disabled={state.busy} onPress={() => void model.refresh()} />}
    {state.mutationUncertain && <Copy>Your unsaved principle stays in this form while you check the server list.</Copy>}

    {state.drawn && <View testID="discipline-draw" accessibilityLiveRegion="polite" style={{ padding: 16, gap: 8, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
      <Text style={{ color: c.muted, fontSize: 15, fontWeight: '600' }}>{t(custom ? 'From your principles' : 'A reminder to keep writing')}</Text>
      <Text selectable style={{ color: c.ink, fontSize: 19, lineHeight: 29 }}>{drawnContent}</Text>
    </View>}
    {state.rows && <PrimaryButton testID="discipline-draw" label="Read a random principle" busy={state.busy && !state.loading} disabled={locked} onPress={() => void model.draw()} />}

    {!state.rows && state.loading && <Copy>Loading principles…</Copy>}
    {!state.rows && state.error && <Copy>Could not load your principles. Retry to continue.</Copy>}
    {state.rows && <>
      <View style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{t(editing ? 'Edit principle' : 'Add a principle')}</Text>
        <TextInput
          testID="discipline-content"
          accessibilityLabel={t('Principle')}
          multiline
          maxLength={255}
          value={content}
          onChangeText={setContent}
          editable={!locked}
          textAlignVertical="top"
          style={{ minHeight: 116, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.ink, fontSize: 17, lineHeight: 25 }}
        />
        <PrimaryButton
          testID="discipline-save"
          label={editing ? 'Save changes' : 'Add principle'}
          busy={state.busy}
          disabled={locked || !content.trim()}
          onPress={() => void save(editing ?? undefined)}
        />
        {editing && <PrimaryButton label="Cancel" disabled={state.busy} onPress={clear} />}
        {editing && !rows.some(row => row.id === editing) && <PrimaryButton label="Save as a new principle" disabled={locked || !content.trim()} onPress={() => void save()} />}
      </View>

      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 22, fontWeight: '700' }}>{t('Your principles')} ({rows.length})</Text>
      {!rows.length && <Copy>No principles yet. Add a rule you want to keep practising.</Copy>}
      <View accessibilityRole="list" style={{ gap: 12 }}>
        {rows.map((item, index) => <View key={item.id} testID="discipline-row" style={{ padding: 16, gap: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
          <Text selectable style={{ color: c.ink, fontSize: 17, lineHeight: 26, flexShrink: 1 }}>{item.content}</Text>
          <Text style={{ color: c.muted, fontSize: 14 }}>{t('Created')} · {formatDate(item.createdAt)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <PrimaryButton testID={`discipline-up-${item.id}`} label="Move up" disabled={locked || dirty || editing !== null || index === 0} onPress={() => void model.move(item.id, -1)} />
            <PrimaryButton testID={`discipline-down-${item.id}`} label="Move down" disabled={locked || dirty || editing !== null || index === rows.length - 1} onPress={() => void model.move(item.id, 1)} />
            <PrimaryButton testID={`discipline-edit-${item.id}`} label="Edit" disabled={locked || dirty || editing !== null} onPress={() => edit(item)} />
            <PrimaryButton testID={`discipline-delete-${item.id}`} label="Delete principle" disabled={locked || dirty || editing !== null} onPress={() => remove(item)} />
          </View>
        </View>)}
      </View>
      <DisciplineTransferPanel service={service} rows={rows} ownerName={authState.status === 'signed-in' || authState.status === 'recoverable-error' ? authState.user?.name : undefined} onImported={() => void model.refresh()} onVerify={() => void verify()} />
    </>}
  </AccountPage>;
}
