import { Text, View } from 'react-native';
import { BetaIntroduction, HelpContent } from '@/beta/help';
import { PrimaryButton } from '@/components/auth-ui';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth/context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BetaIntroduction />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(private)" />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <SafeAreaProvider><View style={{ flex: 1, paddingTop: 40 }}>
    <Text accessibilityRole="alert" style={{ padding: 20, fontSize: 18 }}>畫面無法顯示。請保留草稿；重新顯示畫面不會捨棄資料或重新送出寫入。</Text>
    <PrimaryButton label="重新顯示畫面" onPress={() => void retry()} />
    <HelpContent screen="root" code="RENDER_ERROR" />
  </View></SafeAreaProvider>;
}
