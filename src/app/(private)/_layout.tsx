import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/context';
import { authColors } from '@/components/auth-ui';

export default function PrivateLayout() {
  const { state, diaryScope } = useAuth();
  if (state.status === 'bootstrapping') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={authColors.action} />
        <Text style={styles.text}>Verifying session…</Text>
      </View>
    );
  }
  if (state.status !== 'signed-in' && !(state.status === 'recoverable-error' && state.user)) {
    return <Redirect href="/" />;
  }
  return <Stack key={diaryScope?.ownerId} screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="diaries/[id]" options={{ headerShown: true, title: 'Diary', headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
  </Stack>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: authColors.canvas },
  text: { color: authColors.muted, fontSize: 16 },
});
