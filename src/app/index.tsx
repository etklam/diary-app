import { HelpButton } from '@/beta/help';
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/context';
import { authColors, PrimaryButton, StatusMessage } from '@/components/auth-ui';

export default function LoginScreen() {
  const { state, login, retryVerification } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      return true;
    });
    return () => subscription.remove();
  }, []);

  if (state.status === 'signed-in' || (state.status === 'recoverable-error' && state.user)) {
    return <Redirect href="/timeline" />;
  }

  const busy = state.status === 'bootstrapping';
  const submit = () => {
    if (!email.trim() || !password || busy) return;
    void login(email, password);
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>TRADE BASIC</Text>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Your trading journal, ready when you are.</Text>
          </View>

          {state.status === 'configuration-error' ? (
            <StatusMessage tone="error">{state.message}</StatusMessage>
          ) : null}
          {state.status === 'session-invalid' ? (
            <StatusMessage tone="error">
              {state.issue === 'storage'
                ? 'Secure session storage failed. Sign-in was stopped to protect the session.'
                : 'The saved session is no longer valid. Sign in again.'}
            </StatusMessage>
          ) : null}
          {state.status === 'signed-out' && state.issue === 'invalid-credentials' ? (
            <StatusMessage tone="error">The email or password is incorrect.</StatusMessage>
          ) : null}
          {state.status === 'signed-out' && state.issue === 'logout-unconfirmed' ? (
            <StatusMessage tone="warning">
              You are signed out on this device. Server revocation could not be confirmed.
            </StatusMessage>
          ) : null}
          {state.status === 'recoverable-error' ? (
            <View style={styles.recovery}>
              <StatusMessage tone="warning">
                The API could not verify the saved session. The encrypted token pair was kept.
              </StatusMessage>
              <PrimaryButton testID="retry-session" label="Retry verification" onPress={() => void retryVerification()} />
            </View>
          ) : null}

          <HelpButton screen="login" label="取得帳號／登入協助 · Beta／Help" />
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="email-input"
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                returnKeyType="next"
                style={styles.input}
                value={email}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                testID="password-input"
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete="current-password"
                onChangeText={setPassword}
                onSubmitEditing={submit}
                returnKeyType="done"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>
            <PrimaryButton
              testID="login-button"
              label="Sign in"
              busy={busy}
              disabled={!email.trim() || !password || state.status === 'configuration-error'}
              onPress={submit}
            />
          </View>
          {busy ? (
            <View testID="auth-status" accessibilityLiveRegion="polite" style={styles.loading}>
              <ActivityIndicator color={authColors.action} />
              <Text style={styles.loadingText}>Checking session…</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: authColors.canvas },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 24 },
  heading: { gap: 8 },
  eyebrow: { color: authColors.action, fontSize: 12, letterSpacing: 2, fontWeight: '800' },
  title: { color: authColors.ink, fontSize: 42, lineHeight: 49, fontWeight: '700' },
  subtitle: { color: authColors.muted, fontSize: 16, lineHeight: 24 },
  form: { gap: 18 },
  field: { gap: 7 },
  label: { color: authColors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  input: { minHeight: 52, borderWidth: 1, borderColor: authColors.border, borderRadius: 12, backgroundColor: authColors.surface, color: authColors.ink, fontSize: 17, paddingHorizontal: 14, paddingVertical: 12 },
  recovery: { gap: 12 },
  loading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: authColors.muted, fontSize: 14 },
});
