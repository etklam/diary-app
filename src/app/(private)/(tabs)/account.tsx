import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/context';
import { authColors, PrimaryButton, StatusMessage } from '@/components/auth-ui';

export default function AccountScreen() {
  const { state, logout, retryVerification } = useAuth();
  const user = state.status === 'signed-in' ? state.user : state.status === 'recoverable-error' ? state.user : null;
  if (!user) return <Redirect href="/" />;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>TRADE BASIC</Text>
          <Text style={styles.title}>Account</Text>
          <Text testID="auth-status" style={styles.subtitle}>Your account and session</Text>
        </View>
        {state.status === 'recoverable-error' ? (
          <View style={styles.warningBlock}>
            <StatusMessage tone="warning">We could not check your connection. Your account is still signed in on this device.</StatusMessage>
            <PrimaryButton testID="retry-session" label="Retry verification" onPress={() => void retryVerification()} />
          </View>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text testID="verified-email" selectable style={styles.value}>{user.email}</Text>
          <View style={styles.rule} />
          <Text style={styles.label}>Account role</Text>
          <Text style={styles.value}>{user.role}</Text>
          <View style={styles.rule} />
          <Text style={styles.label}>Timezone</Text>
          <Text style={styles.value}>{user.timezone}</Text>
        </View>
        <PrimaryButton testID="logout-button" label="Log out" onPress={() => void logout()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
