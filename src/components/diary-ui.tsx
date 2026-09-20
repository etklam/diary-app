import { HelpButton } from '@/beta/help';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { authColors, PrimaryButton } from './auth-ui';
import type { ReadIssue } from '@/diaries/access';

export function ReadLoading({ label }: { label: string }) {
  return <View style={diaryStyles.block} accessibilityLiveRegion="polite"><ActivityIndicator color={authColors.action} /><Text style={diaryStyles.meta}>{label}</Text></View>;
}

const messages: Record<ReadIssue, string> = {
  network: 'Could not connect. Check your connection and try again.',
  server: 'The service could not complete this request. Please try again.',
  'invalid-response': 'This response could not be read. Please try again.',
  'not-found': 'Diary not found. It may have been removed or is not available to this account.',
  session: 'Your session could not be verified. Retry or open Account to sign in again.',
};
export function ReadFailure({ issue, retry }: { issue: ReadIssue; retry: () => void }) {
  return <View style={diaryStyles.block}>
    <Text accessibilityRole="alert" style={diaryStyles.body}>{messages[issue]}</Text>
    {issue !== 'not-found' && <PrimaryButton label="Retry" onPress={retry} />}
    <HelpButton screen="diary-read" code={issue} />
  </View>;
}
export function Labels({ symbols, tags }: { symbols: string[]; tags: string[] }) {
  if (!symbols.length && !tags.length) return null;
  return <View style={diaryStyles.labels}>
    {symbols.map(symbol => <Text key={`symbol:${symbol}`} style={diaryStyles.symbol}>{symbol}</Text>)}
    {tags.map(tag => <Text key={`tag:${tag}`} style={diaryStyles.tag}>#{tag}</Text>)}
  </View>;
}
export const diaryStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: authColors.canvas },
  content: { padding: 16, gap: 14, flexGrow: 1 },
  block: { paddingVertical: 20, gap: 14 },
  card: { padding: 18, gap: 9, borderRadius: 14, borderWidth: 1, borderColor: authColors.border, backgroundColor: authColors.surface },
  heading: { fontSize: 28, lineHeight: 36, fontWeight: '700', color: authColors.ink },
  title: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: authColors.ink },
  body: { fontSize: 16, lineHeight: 25, color: authColors.ink },
  meta: { fontSize: 13, lineHeight: 20, color: authColors.muted },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symbol: { fontSize: 13, lineHeight: 20, fontWeight: '700', color: authColors.ink, backgroundColor: authColors.canvas, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  tag: { fontSize: 13, lineHeight: 20, color: authColors.muted, paddingVertical: 3 },
});
