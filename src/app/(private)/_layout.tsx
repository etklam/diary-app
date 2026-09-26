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
  const params = useGlobalSearchParams<{ date?: string; id?: string; symbol?: string; diaryId?: string }>();
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
    const destination = safeContinuation(pathname + (pathname === '/etf-watchlist' && typeof params.symbol === 'string' ? `?symbol=${encodeURIComponent(params.symbol)}` : pathname === '/trade-plans/new' && typeof params.diaryId === 'string' ? `?diaryId=${encodeURIComponent(params.diaryId)}` : ((pathname === '/diaries/quick' || pathname === '/diaries/editor') && typeof params.date === 'string' ? `?date=${encodeURIComponent(params.date)}` : ((pathname === '/diaries/review' || pathname === '/diaries/editor') && typeof params.id === 'string' ? `?id=${encodeURIComponent(params.id)}` : ''))));
    return <AuthRedirect destination={destination} />;
  }
  return <Stack key={diaryScope?.ownerId} screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="diaries/quick" options={{ headerShown: true, title: t('Quick Diary'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="diaries/review" options={{ headerShown: true, title: t('Review'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="diaries/editor" options={{ headerShown: true, title: t('Diary editor'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="diaries/[id]" options={{ headerShown: true, title: t('Diary'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="trade-plans/index" options={{ headerShown: true, title: t('Trade Plans'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="trade-plans/new" options={{ headerShown: true, title: t('Trade Plans'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="trade-plans/[id]" options={{ headerShown: true, title: t('Trade Plans'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="api-keys" options={{ headerShown: true, title: t('API keys'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="watchlist" options={{ headerShown: true, title: t('Watchlist'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="alerts" options={{ headerShown: true, title: t('Diary reminders'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="etf-watchlist" options={{ headerShown: true, title: t('ETF Watchlist'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="discipline" options={{ headerShown: true, title: t('Trading principles'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
    <Stack.Screen name="partners" options={{ headerShown: true, title: t('Partners'), headerStyle: { backgroundColor: authColors.surface }, headerTintColor: authColors.ink }} />
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
