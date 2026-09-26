import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/auth/context';
import { accountService } from '@/account/service';
import { createApiKeysManager, type ApiKeyScope } from '@/account/api-keys';
import { useInstantDate, usePreferences } from '@/preferences/context';
import { AccountPage, Copy, Failure, Field } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';

export default function ApiKeysScreen() {
  const { api, diaryScope } = useAuth();
  const model = useMemo(() => api && diaryScope ? createApiKeysManager(accountService(api, diaryScope)) : null, [api, diaryScope]);
  return model ? <ApiKeysEditor key={diaryScope!.ownerId} model={model} /> : null;
}

function ApiKeysEditor({ model }: { model: ReturnType<typeof createApiKeysManager> }) {
  const { colors, t } = usePreferences();
  const formatInstant = useInstantDate();
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState<ApiKeyScope>('DIARY_CREATE');
  const [copyMessage, setCopyMessage] = useState('');
  const [copyError, setCopyError] = useState(false);

  useEffect(() => { void model.refresh(); return () => model.dispose(); }, [model]);
  useFocusEffect(useCallback(() => () => { model.clearOneTimeSecret(); setCopyMessage(''); }, [model]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') { model.clearOneTimeSecret(); setCopyMessage(''); }
    });
    return () => subscription.remove();
  }, [model]);

  const create = async () => {
    setCopyMessage(''); setCopyError(false);
    await model.create(label, scope);
    if (model.getSnapshot().oneTimeSecret) setLabel('');
  };
  const copySecret = async () => {
    const secret = state.oneTimeSecret;
    if (!secret) return;
    setCopyError(false); setCopyMessage('');
    try {
      const copied = await Clipboard.setStringAsync(secret);
      if (!copied) throw new Error('Clipboard did not accept text');
      setCopyMessage('API key copied. It remains in the device clipboard until replaced.');
    } catch {
      setCopyError(true);
      setCopyMessage('Could not copy the key. Select the visible key manually.');
    }
  };
  const confirmRevoke = (keyLabel: string) => new Promise<boolean>(resolve => {
    Alert.alert(
      t('Revoke this API key?'),
      `${t('Requests using this key will stop working. This cannot be undone.')}\n\n${keyLabel}`,
      [
        { text: t('Cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('Revoke key'), style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });

  return <AccountPage title="API keys">
    <Copy>API keys let external tools use only the capability selected here. They do not sign in to this app.</Copy>
    <Copy>The complete secret is shown once after creation. Save it in a password manager; it cannot be viewed again.</Copy>
    <Field label="Key name" testID="api-key-label" value={label} onChangeText={setLabel} maxLength={100} editable={!state.busy} autoCapitalize="sentences" />
    <Copy>Permission</Copy>
    <View style={{ gap: 8 }}>
      <ScopeChoice selected={scope === 'DIARY_CREATE'} label="Create Diaries only" onPress={() => setScope('DIARY_CREATE')} disabled={state.busy} />
      <ScopeChoice selected={scope === 'AGENT_WRITE'} label="Submit Agent evidence" onPress={() => setScope('AGENT_WRITE')} disabled={state.busy} />
    </View>
    <Copy>{scope === 'DIARY_CREATE' ? 'This key can create Diaries through the Agent Diary endpoint. It cannot read account data or edit existing Diaries.' : 'This key can submit Agent Stock Timeline evidence for stocks on your Watchlist. It cannot create Diaries or manage your account.'}</Copy>
    <Failure error={state.error} />
    {state.unknownCreateOutcome && <>
      <StatusMessage tone="warning">The creation result is uncertain. Refresh the key list; the secret cannot be recovered.</StatusMessage>
      <PrimaryButton label="I understand; allow a new key request" disabled={state.busy} onPress={() => model.acknowledgeUnknownCreate()} />
    </>}
    <PrimaryButton testID="api-key-create" label="Create API key" busy={state.busy} disabled={!label.trim() || state.unknownCreateOutcome} onPress={() => void create()} />
    {!state.loaded && state.loading && <ActivityIndicator accessibilityLabel={t('Loading API keys…')} color={colors.action} />}
    {state.loaded && state.keys.length === 0 && <Copy>No API keys yet.</Copy>}

    {state.oneTimeSecret && <View style={{ gap: 12, borderWidth: 1, borderColor: colors.warningText, borderRadius: 12, padding: 14, backgroundColor: colors.warningBackground }}>
      <Copy>Copy or save this key now. Leaving this screen or returning to the app later will hide it permanently.</Copy>
      <Text selectable accessibilityLabel={t('One-time API key')} testID="api-key-secret" style={{ color: colors.ink, fontSize: 16, lineHeight: 24 }}>{state.oneTimeSecret}</Text>
      <PrimaryButton testID="api-key-copy" label="Copy key" onPress={() => void copySecret()} />
      <PrimaryButton label="Hide key" onPress={() => { model.clearOneTimeSecret(); setCopyMessage(''); }} />
      {!!copyMessage && <Text accessibilityRole={copyError ? 'alert' : undefined} style={{ color: copyError ? colors.errorText : colors.ink, fontSize: 15 }}>{t(copyMessage)}</Text>}
    </View>}

    {state.keys.map(key => {
      const revoked = key.revokedAt !== null || state.confirmedRevocations.includes(key.id);
      return <View key={key.id} style={{ gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.surface }}>
        <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>{key.label}</Text>
        <Copy>{key.keyPrefix}</Copy>
        <Copy>{key.scope === 'DIARY_CREATE' ? 'Diary creation' : 'Agent evidence'}</Copy>
        <Text style={{ color: colors.ink, fontSize: 16 }}>{t('Created:')} {formatInstant(key.createdAt)}</Text>
        <Text style={{ color: colors.ink, fontSize: 16 }}>{t('Last used:')} {key.lastUsedAt ? formatInstant(key.lastUsedAt) : t('Never')}</Text>
        {revoked ? key.revokedAt ? <Text style={{ color: colors.ink, fontSize: 16 }}>{t('Revoked:')} {formatInstant(key.revokedAt)}</Text> : <Copy>Revocation confirmed. Refresh to verify the server timestamp.</Copy> : <PrimaryButton label="Revoke key" disabled={state.busy} onPress={() => void (async () => {
          if (await confirmRevoke(key.label)) await model.revoke(key.id);
        })()} />}
      </View>;
    })}
    {(state.loaded || !!state.error) && <PrimaryButton label="Refresh API keys" busy={state.loading} onPress={() => void model.refresh()} />}
  </AccountPage>;
}

function ScopeChoice({ selected, label, onPress, disabled }: { selected: boolean; label: string; onPress(): void; disabled: boolean }) {
  const { colors, t } = usePreferences();
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected, disabled }} accessibilityLabel={t(label)} onPress={onPress} disabled={disabled}
    style={{ minHeight: 52, justifyContent: 'center', padding: 12, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.ink : colors.border, borderRadius: 10, backgroundColor: colors.surface }}>
    <Text style={{ color: colors.ink, fontSize: 16 }}>{t(label)}</Text>
  </Pressable>;
}
