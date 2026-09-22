import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useAuth } from '@/auth/context';
import { accountService } from '@/account/service';
import { usePreferences } from '@/preferences/context';
import { createSettingsEditor, type SettingsInput, type Theme } from '@/preferences/model';
import { AccountPage, Choice, Copy, Field, Failure, Toggle, fieldInvalid } from '@/components/account-ui';
import { PrimaryButton } from '@/components/auth-ui';
export default function PreferencesScreen() {
  const { api, diaryScope } = useAuth();
  const model = useMemo(() => api && diaryScope ? createSettingsEditor(accountService(api, diaryScope)) : null, [api, diaryScope]);
  return model ? <Editor key={diaryScope!.ownerId} model={model} /> : null;
}
function Editor({ model }: { model: ReturnType<typeof createSettingsEditor> }) {
  const ui = usePreferences(); const { retryVerification } = useAuth();
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const [appearanceError, setAppearanceError] = useState(false);
  const navigation = useNavigation();
  useEffect(() => { void model.load(); return () => model.dispose(); }, [model]);
  usePreventRemove(state.dirty, ({ data }) => Alert.alert(ui.t('Discard changes?'), ui.t('Your unsaved preference edits will be lost.'), [
    { text: ui.t('Cancel'), style: 'cancel' }, { text: ui.t('Discard'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
  ]));
  const edit = <K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) => { if (state.input) model.edit({ ...state.input, [key]: value }); };
  async function save() { const settings = await model.save(); if (settings) { ui.apply(settings); await retryVerification(); } }
  const input = state.input;
  return <AccountPage title="Preferences">
    <Choice label="Appearance" value={ui.theme} values={[[ 'system', 'System' ],['light','Light'],['dark','Dark']]} onChange={v => { setAppearanceError(false); void ui.setTheme(v as Theme).catch(() => setAppearanceError(true)); }} />
    <Copy>Appearance is saved on this device.</Copy>{appearanceError && <Copy>Could not save appearance on this device.</Copy>}
    {!input && state.busy && <Copy>Loading preferences…</Copy>}
    <Failure error={state.error} />
    {!input && !state.busy && <PrimaryButton label="Retry" onPress={() => void model.load()} />}
    {input && <>
      <Field error={fieldInvalid(state.error, 'name')} label="Name" testID="settings-name" value={input.name} onChangeText={v => edit('name', v)} editable={!state.busy} maxLength={100} />
      <Field error={fieldInvalid(state.error, 'timezone')} label="Timezone" testID="settings-timezone" value={input.timezone} onChangeText={v => edit('timezone', v)} editable={!state.busy} />
      <Choice label="Language" value={input.locale} values={[[ 'en','English' ],['zh-TW','繁體中文'],['zh-CN','简体中文']]} onChange={v => edit('locale', v as SettingsInput['locale'])} />
      <Choice label="Default workspace" value={input.defaultWorkspacePage} values={[[ 'diaries','Library' ],['timeline','Timeline'],['calendar','Calendar']]} onChange={v => edit('defaultWorkspacePage', v as SettingsInput['defaultWorkspacePage'])} />
      <Field error={fieldInvalid(state.error, 'expectedMonthlyTrades')} label="Expected monthly trades" testID="settings-trades" value={input.expectedMonthlyTrades} onChangeText={v => edit('expectedMonthlyTrades', v)} keyboardType="number-pad" editable={!state.busy} />
      <Field error={fieldInvalid(state.error, 'expectedProfit')} label="Expected profit" testID="settings-profit" value={input.expectedProfit} onChangeText={v => edit('expectedProfit', v)} keyboardType="numbers-and-punctuation" editable={!state.busy} />
      <Field error={fieldInvalid(state.error, 'expectedAvgHolding')} label="Expected average holding" testID="settings-holding" value={input.expectedAvgHolding} onChangeText={v => edit('expectedAvgHolding', v)} keyboardType="numbers-and-punctuation" editable={!state.busy} />
      <Toggle label="Exclude holidays in statistics" value={input.excludeHolidaysInStats} onChange={v => edit('excludeHolidaysInStats', v)} />
      {state.dirty && <Copy>Unsaved changes</Copy>}{state.saved && <Copy>Preferences saved.</Copy>}
      <PrimaryButton testID="settings-save" label="Save preferences" busy={state.busy} onPress={() => void save()} />
    </>}
  </AccountPage>;
}
