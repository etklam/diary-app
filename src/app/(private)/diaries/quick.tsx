import { HelpButton } from '@/beta/help';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useHeaderHeight, usePreventRemove } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/context';
import { authColors, PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { ReadLoading } from '@/components/diary-ui';
import type { QuickController } from '@/quick/controller';

export default function QuickScreen() {
  const { quick, beginQuick } = useAuth();
  useEffect(() => { beginQuick(); }, [beginQuick]);
  return quick ? <Composer key={quick.getSnapshot().draft.ownerId} controller={quick} /> : null;
}

function Composer({ controller }: { controller: QuickController }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const [more, setMore] = useState(false);
  const { draft } = state;
  const locked = state.busy || !!draft.attempt || !!state.confirmedId || !state.ready;
  useEffect(() => { if (state.ready) void controller.lookup(); }, [controller, state.ready]);
  useEffect(() => {
    if (!state.confirmedId) return;
    router.replace({ pathname: '/diaries/[id]', params: { id: state.confirmedId } });
  }, [state.confirmedId]);
  usePreventRemove(state.ready && state.persistence !== 'saved' && !state.confirmedId, ({ data }) => {
    void controller.flush().then(() => {
      navigation.dispatch(data.action);
    }).catch(() => {});
  });
  useEffect(() => () => { void controller.flush().catch(() => {}); }, [controller]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Keyboard.isVisible()) { Keyboard.dismiss(); return true; }
      return false;
    });
    return () => subscription.remove();
  }, []));
  const errors = {
    storage: 'Your encrypted draft could not be saved or opened. Your existing data has not been deleted. Reopen the app to try again.',
    validation: 'Enter content and a valid date (YYYY-MM-DD). Check the title, tags and symbols too.',
    connection: draft.attempt ? 'The save could not be confirmed. Check the saved diary before trying to save again.' : 'Could not connect. Your draft is kept on this device. Try again when connected.',
    conflict: 'This date already has a diary. Choose Append to add your new writing to it.',
    session: 'Your writing is kept on this device. Your session needs to be checked before you save again.',
    server: 'The service did not accept this save. Your draft is kept. You can try again.',
  };
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.page}>
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {!state.ready && !state.issue && <ReadLoading label="Opening encrypted draft…" />}
        {state.restored && <Text style={styles.meta}>Restored your draft from this device.</Text>}
        {state.issue && <StatusMessage tone="warning">{errors[state.issue]}</StatusMessage>}
        {state.ready && <>
          <Text style={styles.label}>Your diary</Text>
          <TextInput testID="quick-content" accessibilityLabel="Diary content" maxLength={500000} multiline textAlignVertical="top" editable={!locked}
            placeholder="What is on your mind?" placeholderTextColor={authColors.muted} style={[styles.input, styles.editor]}
            value={draft.content} onChangeText={content => controller.edit({ content })} />
          <Text style={styles.label}>Date</Text>
          <TextInput testID="quick-date" accessibilityLabel="Diary date" maxLength={10} editable={!locked} value={draft.date} style={styles.input}
            autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={date => controller.edit({ date })} />
          <Text style={styles.meta}>{state.lookup === 'exists' ? `This date already has a diary. ${draft.mode === 'append' ? 'Append selected.' : 'Create selected — this may conflict.'}`
            : state.lookup === 'checking' ? 'Checking this date…' : state.lookup === 'error' ? 'Date could not be checked. It will be checked before saving.' : 'No diary found for this date.'}</Text>
          <View style={styles.modes}>
            <PrimaryButton label={draft.mode === 'create' ? 'Create selected' : 'Create'} disabled={locked} onPress={() => controller.edit({ mode: 'create' })} />
            <PrimaryButton label={draft.mode === 'append' ? 'Append selected' : 'Append'} disabled={locked} onPress={() => controller.edit({ mode: 'append' })} />
          </View>
          <PrimaryButton label={more ? 'Less' : 'More: title, tags, symbols'} onPress={() => setMore(!more)} />
          {more && <>
            <Text style={styles.label}>Title (optional; append keeps the existing title)</Text>
            <TextInput accessibilityLabel="Diary title" maxLength={500} editable={!locked} style={styles.input} value={draft.title} onChangeText={title => controller.edit({ title })} />
            <Text style={styles.label}>Tags (comma separated)</Text>
            <TextInput accessibilityLabel="Diary tags" maxLength={6000} editable={!locked} style={styles.input} value={draft.tags} onChangeText={tags => controller.edit({ tags })} />
            <Text style={styles.label}>Stock symbols (comma separated)</Text>
            <TextInput accessibilityLabel="Diary symbols" maxLength={1000} editable={!locked} autoCapitalize="characters" style={styles.input} value={draft.stockSymbols} onChangeText={stockSymbols => controller.edit({ stockSymbols })} />
          </>}
          {draft.attempt && <View style={styles.recovery}>
            <Text style={styles.label}>{draft.writeState === 'saving' && state.busy ? 'Saving…' : 'Write result uncertain'}</Text>
            <Text style={styles.meta}>{state.recovery === 'ambiguous' ? 'The saved diary changed. We cannot safely tell if your writing was added. Your draft is kept; inspect the diary before taking further action.' : 'Your writing may already be saved. Checking reads the diary without sending your writing again.'}</Text>
            <PrimaryButton label="Check saved diary" busy={state.busy} onPress={() => void controller.checkResult()} />
            {state.existingId && <PrimaryButton label="Open saved diary" onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: state.existingId! } })} />}
          </View>}
          {state.recovery === 'pending' && <Text style={styles.meta}>No change is visible yet. The original request may still commit. Your attempt remains locked; check again later.</Text>}
        </>}
        {(state.issue || draft.attempt) && <HelpButton screen="quick" code={draft.attempt ? 'UNKNOWN_WRITE' : state.issue ?? undefined} />}
      </ScrollView>
      <View style={styles.footer}>
        <Text accessibilityLiveRegion="polite" style={styles.meta}>{state.persistence === 'error' ? 'Draft storage unavailable' : state.persistence === 'pending' ? 'Saving draft on device…' : state.ready ? 'Draft saved on device' : 'Opening draft…'}</Text>
        <PrimaryButton testID="quick-save" label="Save" busy={state.busy} disabled={locked || !draft.content.trim() || state.persistence === 'error'} onPress={() => void controller.save()} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: authColors.canvas }, flex: { flex: 1 },
  content: { padding: 16, gap: 12 }, label: { fontSize: 15, fontWeight: '700', color: authColors.ink },
  meta: { fontSize: 13, lineHeight: 20, color: authColors.muted },
  input: { backgroundColor: authColors.surface, color: authColors.ink, borderColor: authColors.border, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, minHeight: 48 },
  editor: { minHeight: 230, fontSize: 18, lineHeight: 26 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, recovery: { gap: 12, paddingVertical: 12 },
  footer: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, backgroundColor: authColors.surface, borderTopWidth: 1, borderTopColor: authColors.border },
});
