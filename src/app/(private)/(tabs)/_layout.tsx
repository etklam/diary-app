import { usePreferences } from '@/preferences/context';
import { Tabs } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShellColors } from '@/navigation/theme';
import { QuickAction } from '@/navigation/workspace';

export default function ProductTabs() {
  const { t, dark } = usePreferences();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const colors = useShellColors();
  const focused = useIsFocused();
  return <>{focused && <StatusBar style={dark ? "light" : "dark"} />}<Tabs initialRouteName="timeline" backBehavior="history"
    tabBar={fontScale > 1.4 ? ({ state, descriptors, navigation }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingBottom: insets.bottom, backgroundColor: colors.surface }}>
      {state.routes.filter(route => ['overview', 'timeline', 'portfolio', 'research', 'more'].includes(route.name)).map(route => {
        const selected = state.routes[state.index].key === route.key;
        const title = descriptors[route.key].options.title ?? route.name;
        const label = { Overview: 'Home', Portfolio: 'Assets', Research: 'Tools' }[title] ?? title;
        return <Pressable key={route.key} testID={`tab-${route.name}`} accessibilityRole="tab" accessibilityLabel={t(title)} accessibilityState={{ selected }}
          onPress={() => { const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params); }}
          style={{ width: '33.333%', minHeight: 48, padding: 8, alignItems: 'center', justifyContent: 'center', borderTopWidth: selected ? 3 : 0, borderColor: colors.ink }}>
          <Text style={{ fontSize: 14, textAlign: 'center', color: selected ? colors.ink : colors.muted, fontWeight: selected ? '700' : '400' }}>{t(label)}</Text>
        </Pressable>;
      })}
    </View> : undefined}
    screenOptions={{
    headerTitle: fontScale > 1.4 ? 'Trade' : 'Trade Basic', headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.ink, tabBarActiveTintColor: colors.ink,
    headerRight: () => <QuickAction />,
    tabBarInactiveTintColor: colors.muted,
    tabBarLabelStyle: { fontSize: 12 },
    tabBarLabel: ({ children, color }) => <Text style={{ color, fontSize: 12, textAlign: 'center' }}>{t(fontScale > 1.4 ? ({ Overview: 'Home', Portfolio: 'Assets', Research: 'Tools' }[children] ?? children) : children)}</Text>,
    tabBarStyle: { backgroundColor: colors.surface, height: 64 + insets.bottom + Math.max(0, fontScale - 1) * 48 },
  }}>
    <Tabs.Screen name="overview" options={{ title: t('Overview'), tabBarIcon: ({ color }) => <Text allowFontScaling={false} accessible={false} style={{ color, fontSize: 22 }}>⌂</Text> }} />
    <Tabs.Screen name="timeline" options={{ title: t('Diary'), tabBarIcon: ({ color }) => <Text allowFontScaling={false} accessible={false} style={{ color, fontSize: 22 }}>≡</Text> }} />
    <Tabs.Screen name="portfolio" options={{ title: t('Portfolio'), tabBarIcon: ({ color }) => <Text allowFontScaling={false} accessible={false} style={{ color, fontSize: 22 }}>▦</Text> }} />
    <Tabs.Screen name="research" options={{ title: t('Research'), tabBarIcon: ({ color }) => <Text allowFontScaling={false} accessible={false} style={{ color, fontSize: 22 }}>⌕</Text> }} />
    <Tabs.Screen name="more" options={{ title: t('More'), tabBarIcon: ({ color }) => <Text allowFontScaling={false} accessible={false} style={{ color, fontSize: 22 }}>···</Text> }} />
    <Tabs.Screen name="calendar" options={{ title: t('Calendar'), href: null }} />
    <Tabs.Screen name="library" options={{ title: t('Library'), href: null }} />
    <Tabs.Screen name="review" options={{ title: t('Review'), href: null }} />
    <Tabs.Screen name="account" options={{ title: t('Account'), href: null }} />
  </Tabs></>;
}
