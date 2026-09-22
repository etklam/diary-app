import { usePreferences, type Colors } from '@/preferences/context';
import { HelpButton } from '@/beta/help';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/context';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';

export default function AccountScreen() {
  const { colors: authColors, t, error: preferenceError, refresh } = usePreferences();
  const styles = createStyles(authColors);
  const { state, logout, retryVerification } = useAuth();
  const user = state.status === 'signed-in' ? state.user : state.status === 'recoverable-error' ? state.user : null;
  if (!user) return <Redirect href="/" />;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{t("TRADE BASIC")}</Text>
          <Text style={styles.title}>{t("Account")}</Text>
          <Text testID="auth-status" style={styles.subtitle}>{t("Your account and session")}</Text>
        </View>
        {state.status === 'recoverable-error' ? (
          <View style={styles.warningBlock}>
            <StatusMessage tone="warning">{t("We could not check your connection. Your account is still signed in on this device.")}</StatusMessage>
            <PrimaryButton testID="retry-session" label={t("Retry verification")} onPress={() => void retryVerification()} />
          </View>
        ) : null}
        {preferenceError && <><StatusMessage tone="warning">Could not load preferences. Retry or continue with device defaults.</StatusMessage><PrimaryButton label="Retry" onPress={() => void refresh()} /></>}
        <View style={styles.card}>
          <Text style={styles.label}>{t("Email")}</Text>
          <Text testID="verified-email" selectable style={styles.value}>{user.email}</Text>
          <View style={styles.rule} />
          <Text style={styles.label}>{t("Account role")}</Text>
          <Text style={styles.value}>{user.role}</Text>
          <View style={styles.rule} />
          <Text style={styles.label}>{t("Timezone")}</Text>
          <Text style={styles.value}>{user.timezone}</Text>
        </View>
        <HelpButton screen="account" code={state.status === 'recoverable-error' ? state.issue : undefined} />
        <PrimaryButton testID="account-preferences" label={t("Preferences")} onPress={() => router.push('/preferences')} />
        <PrimaryButton testID="account-security" label={t("Account security")} onPress={() => router.push('/security')} />
        <PrimaryButton testID="logout-button" label={t("Log out")} onPress={() => void logout(t)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (authColors: Colors) => StyleSheet.create({
  page: { flex: 1, backgroundColor: authColors.canvas },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 24 },
  heading: { gap: 8 },
  eyebrow: { color: authColors.action, fontSize: 12, letterSpacing: 2, fontWeight: '800' },
  title: { color: authColors.ink, fontSize: 38, lineHeight: 45, fontWeight: '700' },
  subtitle: { color: authColors.muted, fontSize: 16, lineHeight: 24 },
  warningBlock: { gap: 12 },
  card: { backgroundColor: authColors.surface, borderColor: authColors.border, borderWidth: 1, borderRadius: 18, padding: 20, gap: 9 },
  label: { color: authColors.muted, fontSize: 13, lineHeight: 18, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  value: { color: authColors.ink, fontSize: 18, lineHeight: 26 },
  rule: { height: 1, backgroundColor: authColors.border, marginVertical: 8 },
});
