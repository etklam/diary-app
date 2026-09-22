import { useRef, useState } from 'react';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { loginRequestSchema, registerRequestSchema } from '@diary/contracts';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { AccountPage, Choice, Copy, Failure, Field, fieldInvalid } from '@/components/account-ui';
import { PrimaryButton } from '@/components/auth-ui';
import { registerAccount } from '@/account/service';
import { safeContinuation, workspacePath } from '@/navigation/continuation';

export default function LoginScreen() {
  const { state, api, login, retryVerification } = useAuth();
  const ui = usePreferences();
  const params = useLocalSearchParams<{ returnTo?: string; mode?: string; security?: string }>();
  const registering = params.mode === 'register';
  const destination = safeContinuation(params.returnTo);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [name, setName] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [created, setCreated] = useState(false);
  const submitting = useRef(false);
  const authenticated = state.status === 'signed-in' || state.status === 'recoverable-error' && state.user;
  if (authenticated && ui.ready) return <Redirect href={(destination ?? workspacePath(ui.settings?.defaultWorkspacePage)) as Href} />;
  const pending = busy || state.status === 'bootstrapping' || !!authenticated;
  async function submit() {
    if (pending || submitting.current || !api) return;
    submitting.current = true;
    setError(null);
    try {
      const input = { email: email.trim(), password, ...(registering && name.trim() ? { name: name.trim() } : {}) };
      (registering ? registerRequestSchema : loginRequestSchema).parse(input);
      if (registering && password !== confirmation) { setError(new Error('Passwords do not match.')); return; }
      setBusy(true);
      if (registering) { await registerAccount(api, input); setCreated(true); } else await login(input.email, password);
    } catch (failure) { setError(failure); }
    finally { submitting.current = false; setBusy(false); setPassword(''); setConfirmation(''); }
  }
  return <AccountPage title={registering ? 'Create account' : 'Sign in'}>
    <Copy>Your trading journal, ready when you are.</Copy>
    <Choice label="Language" values={[[ 'en', 'English' ], ['zh-TW','繁體中文'],['zh-CN','简体中文']]} value={ui.locale} onChange={v => ui.setLocale(v as typeof ui.locale)} />
    {params.security === 'done' && <Copy>Security action completed. Sign in again.</Copy>}
    {params.security === 'uncertain' && <Copy>The result is uncertain. This device is signed out. Check your credentials before trying again; the action was not repeated.</Copy>}
    {state.status === 'configuration-error' && <Copy>{state.message}</Copy>}
    {state.status === 'session-invalid' && <Copy>{state.issue === 'storage' ? 'Secure session storage is unavailable. Check this device before signing in again.' : 'The saved session is no longer valid. Sign in again.'}</Copy>}
    {state.status === 'signed-out' && state.issue === 'invalid-credentials' && <Copy>The email or password is incorrect.</Copy>}
    {state.status === 'signed-out' && state.issue === 'login-unavailable' && <><Copy>{state.code?.includes('RATE') ? 'Too many requests. Please wait before trying again.' : 'Could not sign in. Check your connection and try again.'}</Copy>{state.code && <Copy>{state.code}</Copy>}</>}
    {state.status === 'signed-out' && state.issue === 'logout-unconfirmed' && <Copy>This device is signed out. Server revocation could not be confirmed.</Copy>}
    {state.status === 'recoverable-error' && <PrimaryButton label="Retry verification" onPress={() => void retryVerification()} />}
    {pending && <Copy>Checking session…</Copy>}
    {created ? <><Copy>Account created. Sign in to continue.</Copy><PrimaryButton testID="registered-sign-in" label="Sign in" onPress={() => { setCreated(false); router.setParams({ mode: 'login' }); }} /></> : <>
      {registering && <Field error={fieldInvalid(error, 'name')} label="Name" testID="name-input" value={name} onChangeText={setName} maxLength={100} editable={!pending} />}
      <Field error={fieldInvalid(error, 'email')} label="Email" testID="email-input" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" editable={!pending} />
      <Field error={fieldInvalid(error, 'password')} label="Password" testID="password-input" value={password} onChangeText={setPassword} secureTextEntry autoComplete={registering ? 'new-password' : 'current-password'} editable={!pending} />
      {registering && <><Copy>Use 8 or more characters, up to 72 UTF-8 bytes.</Copy><Field label="Confirm password" testID="confirm-input" value={confirmation} onChangeText={setConfirmation} secureTextEntry editable={!pending} /></>}
      {error instanceof Error && error.message === 'Passwords do not match.' ? <Copy>Passwords do not match.</Copy> : <Failure error={error} />}
      <PrimaryButton testID={registering ? 'register-button' : 'login-button'} label={registering ? 'Create account' : 'Sign in'} busy={pending} disabled={!email.trim() || !password || !api} onPress={() => void submit()} />
      <PrimaryButton testID="auth-switch" label={registering ? 'Sign in' : 'Create account'} disabled={pending} onPress={() => { setError(null); setPassword(''); setConfirmation(''); router.setParams({ mode: registering ? 'login' : 'register' }); }} />
    </>}
    <PrimaryButton label="Continue as guest" disabled={pending} onPress={() => router.push('/start')} />
  </AccountPage>;
}
