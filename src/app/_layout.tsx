import { Text, View } from 'react-native';
import { BetaIntroduction, HelpContent } from '@/beta/help';
import { PrimaryButton } from '@/components/auth-ui';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth/context';
import { PreferencesProvider, usePreferences } from '@/preferences/context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
        <BetaIntroduction />
        <AppStatusBar />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(private)" />
        </Stack>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { colors, t } = usePreferences();
  return <SafeAreaProvider><View style={{ flex: 1, paddingTop: 40, backgroundColor: colors.canvas }}>
    <Text accessibilityRole="alert" style={{ padding: 20, fontSize: 18, color: colors.ink }}>{t('This screen could not be displayed. Retrying preserves drafts and does not repeat writes.')}</Text>
    <PrimaryButton label="Retry" onPress={() => void retry()} />
    <HelpContent screen="root" code="RENDER_ERROR" />
  </View></SafeAreaProvider>;
}

function AppStatusBar() { const { dark } = usePreferences(); return <StatusBar style={dark ? "light" : "dark"} />; }
