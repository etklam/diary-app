import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { AccountPage, Copy } from '@/components/account-ui';
import { usePreferences } from '@/preferences/context';
import { publicTools } from '@/tools/catalog';

export default function PublicToolsDirectory() {
  const { colors: c, locale, t } = usePreferences();
  const localized = (entry: Record<'en' | 'zh-TW' | 'zh-CN', string>) => entry[locale];

  return <AccountPage title="Tools">
    <Copy>Explore public calculators and research tools. Tool workflows in this native build are not available yet; open an entry to see its status. Browsing this directory does not require sign-in or call private account APIs.</Copy>
    <View accessibilityRole="list" style={{ gap: 12 }}>
      {publicTools.map(tool => <Pressable
        key={tool.slug}
        testID={`public-tool-${tool.slug}`}
        accessibilityRole="link"
        accessibilityLabel={`${localized(tool.name)}. ${t('Not available in this build.')}`}
        onPress={() => router.push(`/tools/${tool.slug}` as Href)}
        style={{ minHeight: 48, padding: 16, gap: 8, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}
      >
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{localized(tool.name)}</Text>
        <Text style={{ color: c.ink, fontSize: 15, lineHeight: 23 }}>{localized(tool.purpose)}</Text>
        <Text style={{ color: c.muted, fontSize: 14 }}>{t('Not available in this build.')}</Text>
      </Pressable>)}
    </View>
  </AccountPage>;
}
