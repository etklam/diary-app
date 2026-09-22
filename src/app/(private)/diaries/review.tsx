import { useInstantDate, usePreferences, type Colors } from '@/preferences/context';
import { HelpButton } from '@/beta/help';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, BackHandler, Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useHeaderHeight, usePreventRemove } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/context';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { ReadLoading } from '@/components/diary-ui';
import type { ReviewController } from '@/reviews/controller';
import { payloadFor } from '@/reviews/model';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reviews, diaryScope } = useAuth();
  const controller = useMemo(() => diaryScope && typeof id === 'string' ? reviews?.open(id) : null, [reviews, diaryScope, id]);
  return controller ? <Editor controller={controller} discard={() => reviews!.discard(id)} /> : null;
}
function Editor({ controller, discard }: { controller: ReviewController; discard(): Promise<void> }) {
  const { colors: authColors, t } = usePreferences();
  const styles = createStyles(authColors);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const [context, setContext] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const { draft, server } = state;
  const locked = !state.ready || state.busy || !!draft?.attempt || state.confirmed;
  usePreventRemove(!discarded && !state.confirmed && (state.busy || state.persistence !== 'saved'), ({ data }) => {
    if (state.busy) return;
    void controller.flush().then(() => navigation.dispatch(data.action)).catch(() => {});
  });
  useEffect(() => () => { void controller.flush().catch(() => {}); }, [controller]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Keyboard.isVisible()) { Keyboard.dismiss(); return true; } return false;
    }); return () => subscription.remove();
  }, []));
  useEffect(() => {
    if (!state.confirmed && !discarded) return;
    // Commit the removal-guard/header update before popping the native screen.
    const frame = requestAnimationFrame(() => router.back());
    return () => cancelAnimationFrame(frame);
  }, [state.confirmed, discarded]);
  let validation: string | null = null;
  if (draft) { try { payloadFor(draft.fields); } catch { validation = 'Choose an outcome and write at least one reflection (up to 10,000 characters each).'; } }
  const discardDraft = () => Alert.alert(t('Discard local review draft?'),
    draft?.attempt ? t('This does not cancel or reverse a possible server write. The unresolved request may still complete. Discarding is not proof that another submission is safe.') : t('Remove your local edits from this device? The server review will remain unchanged.'),
    [{ text: t('Keep draft'), style: 'cancel' }, { text: t('Discard local draft'), style: 'destructive', onPress: () => {
      void discard().then(() => setDiscarded(true)).catch(() => Alert.alert(t('Draft retained'), t('Could not discard the encrypted draft. Please try again.')));
    } }]);
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
    <KeyboardAvoidingView style={styles.page} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {!state.ready && !state.issue && <ReadLoading label={t("Opening review…")} />}
        {state.issue && <StatusMessage tone="warning">{state.issue}</StatusMessage>}
        {!state.ready && state.issue && <PrimaryButton label={t("Retry opening review")} onPress={() => void controller.start()} />}
        {state.restored && <Text style={styles.meta}>{t("Restored your encrypted review draft from this device.")}</Text>}
        {server && <>
          <Text style={styles.meta}>{server.date}</Text><Text style={styles.heading}>{server.title || t('Untitled diary')}</Text>
          <PrimaryButton label={context ? 'Hide original diary' : 'Show original diary'} onPress={() => setContext(!context)} />
          {context && <View style={styles.content}>
            <Text selectable style={styles.body}>{server.content || t('No diary text.')}</Text>
            {(['thesis', 'risk', 'execution'] as const).map(key => server[key] ? <View key={key}><Text style={styles.label}>{t({ thesis: 'Thesis', risk: 'Risk', execution: 'Execution' }[key])}</Text><Text selectable style={styles.body}>{server[key]}</Text></View> : null)}
          </View>}
        </>}
        {draft && <>
          {draft.baseline.reviewStatus === 'reviewed' && <Text style={styles.meta}>{t("Saving changes completes this review again and updates its server “reviewed at” timestamp.")}</Text>}
          <Text style={styles.label}>{t("Outcome")}</Text>
          {(['INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR'] as const).map(outcome => <PrimaryButton key={outcome} disabled={locked}
            label={`${draft.fields.reviewOutcome === outcome ? t('Selected:') + ' ' : ''}${t({ INTACT: 'Intact — thesis held', PARTIAL: 'Partial — partly held', INVALIDATED: 'Invalidated — thesis failed', UNCLEAR: 'Unclear — not enough evidence' }[outcome])}`}
            onPress={() => controller.edit({ reviewOutcome: outcome })} />)}
          {(['reviewSummary', 'reviewLearning', 'reviewAdjustment'] as const).map(key => <View key={key} style={styles.field}>
            <Text style={styles.label}>{t({ reviewSummary: 'Summary', reviewLearning: 'Learning', reviewAdjustment: 'Adjustment' }[key])}</Text>
            <TextInput accessibilityLabel={t({ reviewSummary: 'Review summary', reviewLearning: 'Review learning', reviewAdjustment: 'Review adjustment' }[key])}
              multiline textAlignVertical="top" maxLength={10000} editable={!locked} style={styles.input} value={draft.fields[key]} onChangeText={value => controller.edit({ [key]: value })} />
            <Text style={styles.meta}>{draft.fields[key].length}/10,000</Text>
          </View>)}
          {validation && <Text accessibilityLiveRegion="polite" style={styles.meta}>{t(validation)}</Text>}
          {state.conflict && !draft.attempt && <View style={styles.field}>
            <StatusMessage tone="warning">{t("The server review changed since this draft began. Your edits are retained. Compare both versions before continuing.")}</StatusMessage>
            <ServerVersion controller={controller} />
            <PrimaryButton label={t("Keep my edits and adopt this server baseline")} disabled={locked} onPress={() => Alert.alert(t('Use the new baseline?'), t('Your local edits will remain. A later explicit submission will replace the review fields. Concurrent server edits can still occur after checking.'), [
              { text: t('Cancel'), style: 'cancel' }, { text: t('Adopt baseline'), onPress: () => { void controller.adoptServerBaseline().catch(() => {}); } },
            ])} />
          </View>}
          {draft.attempt && <View style={styles.field}>
            <Text style={styles.label}>{t("Unconfirmed submission")}</Text>
            <Text style={styles.meta}>{t("The original PATCH may still complete. Matching text or an unchanged read does not prove its outcome. No second submission will be sent.")}</Text>
            <PrimaryButton label={draft.confirmed ? 'Finish local cleanup' : 'Check server state'} disabled={state.busy} onPress={() => void controller.check()} />
            {state.inspected && <ServerVersion controller={controller} />}
          </View>}
          <PrimaryButton label={t("Discard local review draft")} disabled={state.busy} onPress={discardDraft} />
        </>}
        {(state.issue || draft?.attempt) && <HelpButton screen="review-editor" code={draft?.attempt ? 'UNKNOWN_WRITE' : undefined} />}
      </ScrollView>
      <View style={styles.footer}>
        <Text accessibilityLiveRegion="polite" style={styles.meta}>{state.persistence === 'error' ? t('Local save failed — retry before leaving') : state.persistence === 'pending' ? t('Saving draft on device…') : draft?.attempt ? t('Unconfirmed attempt saved on device') : state.restored || draft?.revision ? t('Draft saved on device only') : t('No local changes')}</Text>
        {state.persistence === 'error' && <PrimaryButton label={t("Retry local save")} onPress={() => void controller.flush().catch(() => {})} />}
        <PrimaryButton label={draft?.baseline.reviewStatus === 'reviewed' ? 'Save review changes' : 'Complete review'} busy={state.busy}
          disabled={locked || !!validation || state.conflict || state.persistence === 'error'} onPress={() => { Keyboard.dismiss(); void controller.submit(); }} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function ServerVersion({ controller }: { controller: ReviewController }) {
  const instantDate = useInstantDate();
  const { colors: authColors, t } = usePreferences();
  const styles = createStyles(authColors);
  const { server } = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return server ? <View style={styles.field}><Text style={styles.label}>{t("Current server review (read-only)")}</Text>
    <Text style={styles.body}>{t({ none: 'No review', pending: 'Pending review', reviewed: 'Reviewed' }[server.reviewStatus])} · {server.reviewOutcome ? t(server.reviewOutcome) : t('No outcome')} · {server.reviewedAt ? instantDate(server.reviewedAt) : t('Not completed')}</Text>
    <Text selectable style={styles.body}>{t("Summary:")}{' '}{server.reviewSummary || '—'}{'\n'}{t("Learning:")}{' '}{server.reviewLearning || '—'}{'\n'}{t("Adjustment:")}{' '}{server.reviewAdjustment || '—'}</Text>
  </View> : null;
}
const createStyles = (authColors: Colors) => StyleSheet.create({
  page: { flex: 1, backgroundColor: authColors.canvas }, content: { padding: 16, gap: 12 }, field: { gap: 6 },
  heading: { fontSize: 20, fontWeight: '700', color: authColors.ink }, label: { fontSize: 15, fontWeight: '700', color: authColors.ink },
  body: { fontSize: 16, lineHeight: 24, color: authColors.ink }, meta: { fontSize: 13, lineHeight: 20, color: authColors.muted },
  input: { minHeight: 110, borderWidth: 1, borderColor: authColors.border, borderRadius: 10, padding: 12, backgroundColor: authColors.surface, color: authColors.ink, fontSize: 16 },
  footer: { padding: 12, gap: 6, borderTopWidth: 1, borderColor: authColors.border, backgroundColor: authColors.surface },
});
