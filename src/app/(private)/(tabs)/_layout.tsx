import { Tabs } from 'expo-router';
import { Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authColors } from '@/components/auth-ui';

export default function ProductTabs() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return <Tabs initialRouteName="timeline" backBehavior="initialRoute" screenOptions={{
    headerTitle: 'Trade Basic', headerStyle: { backgroundColor: authColors.surface },
    headerTintColor: authColors.ink, tabBarActiveTintColor: authColors.ink,
    tabBarInactiveTintColor: authColors.muted,
    tabBarStyle: { backgroundColor: authColors.surface, height: 64 + insets.bottom + Math.max(0, fontScale - 1) * 24 },
  }}>
    <Tabs.Screen name="timeline" options={{ title: 'Timeline', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>≡</Text> }} />
    <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>▦</Text> }} />
    <Tabs.Screen name="review" options={{ title: 'Review', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>✓</Text> }} />
    <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>○</Text> }} />
  </Tabs>;
}
