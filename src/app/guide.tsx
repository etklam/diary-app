import { router, type Href } from 'expo-router';
import { Text, View } from 'react-native';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';

export default function Guide() {
  const { state } = useAuth();
  const signedIn = state.status === 'signed-in' || state.status === 'recoverable-error' && !!state.user;
  return <AccountPage title="Guide">
    <Copy>Record what you observed, why you acted, and what you learned when you review the outcome. This guide describes the native workflows available in this build.</Copy>
    <Section title="Start with an observation" body="Use Quick Diary for a dated note, or open the Diary workspace to browse Timeline and Calendar. Add context before saving, then return to a diary entry to review it later." />
    <Section title="Make a plan and review it" body="Use Diary Review to record what happened and schedule a follow-up. Keep trading principles in Discipline as reminders for future decisions." />
    <Section title="Research before deciding" body="The Watchlist and Company Hub keep stock research together. The Public Tools directory shows current capability status; native workflows include ETF research, Market State, Financial Freedom and SEC filings. Other entries explain their availability before you continue." />
    <Section title="Read and share public material" body="Browse published articles without signing in. When the public website origin is configured, article shares use the canonical website page; until then, native sharing uses an app link. Public web previews and search indexing stay on the website." />
    <Section title="Protect your account and drafts" body="Sign in before saving server-backed records. Review the current screen before submitting; an uncertain save should be checked before you try it again. Local authoring drafts are encrypted on this device, but this is not end-to-end encryption." />
    <View style={{ gap: 10 }}>
      <PrimaryButton label="Open Diary workspace" onPress={() => router.push(signedIn ? '/timeline' : { pathname: '/', params: { returnTo: '/timeline' } } as Href)} />
      <PrimaryButton label="Explore public tools" onPress={() => router.push('/tools' as Href)} />
      <PrimaryButton label="Read articles" onPress={() => router.push('/articles' as Href)} />
      <PrimaryButton label="About and support" onPress={() => router.push('/about' as Href)} />
    </View>
  </AccountPage>;
}

function Section({ title, body }: { title: string; body: string }) {
  const { colors: c, t } = usePreferences();
  return <View style={{ gap: 6, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
    <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 18, fontWeight: '700' }}>{t(title)}</Text>
    <Copy>{body}</Copy>
  </View>;
}
