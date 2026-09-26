import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { router, type Href } from 'expo-router';
import { changePasswordRequestSchema } from '@diary/contracts';
import { useAuth } from '@/auth/context';
import { AccountFailure, accountService } from '@/account/service';
import { usePreferences } from '@/preferences/context';
import { AccountPage, Copy, Field, Failure, fieldInvalid } from '@/components/account-ui';
import { PrimaryButton } from '@/components/auth-ui';
export default function SecurityScreen() {
  const { api, diaryScope, flushDrafts, finishSecurity } = useAuth(); const { t } = usePreferences();
  const [currentPassword, setCurrent] = useState(''); const [newPassword, setNext] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<unknown>(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const latch = useRef(false);
  async function submit(kind: 'password' | 'all') {
    if (!api || !diaryScope || latch.current) return;
    const scope = diaryScope;
    setError(null); setMessage('');
    if (kind === 'password') {
      if (newPassword !== confirmation) { setMessage('Passwords do not match.'); return; }
      const valid = changePasswordRequestSchema.safeParse({ currentPassword, newPassword }); if (!valid.success) { setError(valid.error); return; }
    }
    latch.current = true; setBusy(true);
    try {
      const approved = await new Promise<boolean>(resolve => Alert.alert(t('Continue with this security action?'), t('Every device will be signed out. Encrypted drafts stay with this account for your next sign-in.'), [{ text: t('Cancel'), style: 'cancel', onPress: () => resolve(false) }, { text: t('Continue'), style: 'destructive', onPress: () => resolve(true) }], { cancelable: false }));
      if (!approved || !scope.isCurrent()) return;
      try { await flushDrafts(); } catch { setMessage('Draft storage unavailable. The security action was not sent.'); return; }
      if (!scope.isCurrent()) return;
      let outcome = 'done';
      try { const service = accountService(api, scope); if (kind === 'password') await service.password({ currentPassword, newPassword }); else await service.logoutAll(); }
      catch (failure) {
        if (!scope.isCurrent()) return;
        if (failure instanceof AccountFailure && failure.kind === 'rejected') { setError(failure); return; }
        outcome = 'uncertain';
      }
      if (!scope.isCurrent()) return;
      await finishSecurity();
      router.replace({ pathname: '/', params: { security: outcome, returnTo: '/security' } });
    } finally { setCurrent(''); setNext(''); setConfirmation(''); latch.current = false; setBusy(false); }
  }
  return <AccountPage title="Account security"><Copy>Every device will be signed out. Encrypted drafts stay with this account for your next sign-in.</Copy>
    <Copy>External integrations use separate, limited API keys.</Copy>
    <PrimaryButton label="Manage API keys" onPress={() => router.push('/api-keys' as Href)} />
    <Copy>Use 8 or more characters, up to 72 UTF-8 bytes.</Copy>
    <Field error={fieldInvalid(error, 'currentPassword')} label="Current password" testID="security-current" value={currentPassword} onChangeText={setCurrent} secureTextEntry editable={!busy} autoComplete="current-password" />
    <Field error={fieldInvalid(error, 'newPassword')} label="New password" testID="security-new" value={newPassword} onChangeText={setNext} secureTextEntry editable={!busy} autoComplete="new-password" />
    <Field label="Confirm new password" testID="security-confirm" value={confirmation} onChangeText={setConfirmation} secureTextEntry editable={!busy} />
    <Failure error={error} />{!!message && <Copy>{message}</Copy>}
    <PrimaryButton testID="security-change" label="Change password" busy={busy} onPress={() => void submit('password')} />
    <PrimaryButton testID="security-all" label="Sign out all devices" disabled={busy} onPress={() => void submit('all')} />
  </AccountPage>;
}
