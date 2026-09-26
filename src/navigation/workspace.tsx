import { usePreferences, type Colors } from '@/preferences/context';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/context';
import { visibleDestinations, type Section } from './destinations';
import { useShellColors } from './theme';

export function QuickAction({ testID = 'global-quick' }: { testID?: string }) {
  const { t } = usePreferences();
  const { beginQuick, diaryScope } = useAuth();
  const colors = useShellColors();
  const opening = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function open() {
    if (opening.current || !diaryScope) return;
    opening.current = true; setBusy(true); setFailed(false);
    try { if (await beginQuick()) router.push('/diaries/quick'); else setFailed(true); }
    catch { setFailed(true); }
    finally { opening.current = false; setBusy(false); }
  }
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={t(failed ? 'Could not open draft. Retry Quick Diary' : 'Quick Diary')}
    accessibilityState={{ disabled: busy || !diaryScope }} disabled={busy || !diaryScope} onPress={() => void open()}
    style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}>
    <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{t(failed ? 'Retry Quick' : busy ? 'Opening…' : '+ Quick')}</Text>
  </Pressable>;
}

export function Workspace({ section, title, description }: { section: Section; title: string; description: string }) {
  const { colors: authColors, t } = usePreferences();
  const styles = createStyles(authColors);
  const colors = useShellColors();
  const { state } = useAuth();
  const audience = state.status === 'signed-in' && state.user.role === 'ADMIN' ? 'ADMIN' : 'USER';
  const items = visibleDestinations(section, audience);
  const shortcuts = section === 'overview' ? visibleDestinations('diary', audience).filter(item => item.href) : [];
  return <SafeAreaView edges={['left', 'right']} style={[styles.page, { backgroundColor: colors.canvas }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.ink }]}>{t(title)}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{t(description)}</Text>
      {[...shortcuts, ...items].map(item => <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {item.href ? <Pressable testID={`destination-${item.id}`} accessibilityRole="button" onPress={() => router.push(item.href! as Href)} style={styles.link}>
          <Text style={[styles.title, { color: colors.ink }]}>{t(item.title)} →</Text>
        </Pressable> : <>
          <Text style={[styles.title, { color: colors.ink }]}>{t(item.title)}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{t('Not available in this build.')}</Text>
        </>}
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

const createStyles = (authColors: Colors) => StyleSheet.create({
  page: { flex: 1 }, content: { padding: 16, gap: 16, flexGrow: 1 },
  heading: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '600' }, body: { fontSize: 16, lineHeight: 25 },
  card: { padding: 16, gap: 8, borderRadius: 14, borderWidth: 1 }, link: { minHeight: 48, justifyContent: 'center' },
});
