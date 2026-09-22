import { usePreferences, type Colors } from '@/preferences/context';
import { useState } from 'react';
import { safeContinuation } from '@/navigation/continuation';
import { Redirect, Stack, usePathname, useGlobalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/context';

export default function PrivateLayout() {
  const { colors: authColors, t } = usePreferences();
  const styles = createStyles(authColors);
  const { state, diaryScope } = useAuth();
  const pathname = usePathname();
  // This layout guards the active child route, not its own layout params.
  const params = useGlobalSearchParams<{ date?: string; id?: string }>();
  if (state.status === 'bootstrapping') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={authColors.action} />
        <Text style={styles.text}>{t("Verifying session…")}</Text>
      </View>
    );
  }
  if (state.status !== 'signed-in' && !(state.status === 'recoverable-error' && state.user)) {
    // Redirecting can clear child parameters before this layout unmounts.
    // Freeze the first valid destination so a second render cannot erase it.
    const destination = safeContinuation(pathname + (pathname === '/diaries/quick' && typeof params.date === 'string' ? `?date=${encodeURIComponent(params.date)}` : pathname === '/diaries/review' && typeof params.id === 'string' ? `?id=${encodeURIComponent(params.id)}` : ''));
    return <AuthRedirect destination={destination} />;
  }
  return <Stack key={diaryScope?.ownerId} screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="diaries/quick" options={{ headerShown: true, title: t('Quick Diary'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="diaries/review" options={{ headerShown: true, title: t('Review'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="diaries/[id]" options={{ headerShown: true, title: t('Diary'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
  </Stack>;
}

function AuthRedirect({ destination }: { destination: string | null }) {
  const [returnTo] = useState(destination);
  return <Redirect href={{ pathname: '/', params: { returnTo: returnTo ?? '' } }} />;
}

const createStyles = (authColors: Colors) => StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: authColors.canvas },
  text: { color: authColors.muted, fontSize: 16 },
});
