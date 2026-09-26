import { usePreferences, type Colors } from '@/preferences/context';
import { HelpButton } from '@/beta/help';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, BackHandler, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useNavigation, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight, usePreventRemove } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import { generateTemplateDraft, mergeQuickTemplate, type QuickNoteTemplateKind } from '@diary/domain';
import { useAuth } from '@/auth/context';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { ReadLoading } from '@/components/diary-ui';
import type { QuickController } from '@/quick/controller';
import type { QuickSnippetRecord } from '@/quick/repository';
import { QuickTemplateFields } from '@/quick/template-fields';
import { localizedQuickSnippets } from '@/quick/snippets';

export default function QuickScreen() {
  const { quick, beginQuick } = useAuth();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [dateKept, setDateKept] = useState(false);
  useEffect(() => {
    let active = true;
    void beginQuick(typeof date === 'string' ? date : undefined).then(opened => {
      if (active) setDateKept(!opened && typeof date === 'string' && quick?.getSnapshot().draft.date !== date);
    }).catch(() => { if (active) setDateKept(typeof date === 'string'); });
    return () => { active = false; };
  }, [beginQuick, date, quick]);
  return quick ? <View style={{ flex: 1 }}>
    {dateKept && <StatusMessage tone="warning">Your saved draft was kept. The requested date was not applied.</StatusMessage>}
    <Composer key={quick.getSnapshot().draft.ownerId} controller={quick} />
  </View> : null;
}

function Composer({ controller }: { controller: QuickController }) {
  const { colors: authColors, locale, t } = usePreferences();
  const styles = createStyles(authColors);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const [more, setMore] = useState(false);
  const [selectedSnippetId, setSelectedSnippetId] = useState('default-1');
  const [manageSnippets, setManageSnippets] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<QuickSnippetRecord | null>(null);
  const [snippetName, setSnippetName] = useState('');
  const [snippetContent, setSnippetContent] = useState('');
  const [snippetError, setSnippetError] = useState(false);
  const { draft } = state;
  const template = useMemo(() => generateTemplateDraft({ templateKind: draft.templateKind, date: draft.date, locale, templateData: draft.templateData }),
    [draft.templateData, draft.templateKind, draft.date, locale]);
  const snippets = useMemo(() => [...localizedQuickSnippets(locale), ...state.localData.snippets], [locale, state.localData.snippets]);
  const locked = state.busy || !!draft.attempt || !!state.confirmedId || !state.ready;
  useEffect(() => { if (state.ready) void controller.lookup(); }, [controller, state.ready]);
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
  const applyTemplate = (replace = false) => {
    const content = replace || !draft.content.trim() ? template.content
      : mergeQuickTemplate(draft.content, template.content, draft.appliedTemplate);
    const title = draft.titleTouched ? draft.title : draft.appliedTemplate ? template.title : draft.title.trim() ? draft.title : template.title;
    controller.edit({ content, appliedTemplate: template.content, title });
  };
  const confirmTemplateReplace = () => Alert.alert(t('Replace current writing?'), t('This will replace your current writing.'), [
    { text: t('Keep existing writing'), style: 'cancel' },
    { text: t('Replace writing'), style: 'destructive', onPress: () => applyTemplate(true) },
  ]);
  const selectedSnippet = snippets.find(snippet => snippet.id === selectedSnippetId) ?? snippets[0];
  const insertSnippet = () => {
    if (!selectedSnippet) return;
    controller.edit({ content: draft.content.trim() ? `${draft.content}\n\n${selectedSnippet.content}` : selectedSnippet.content });
  };
  const replaceWithSnippet = () => {
    if (!selectedSnippet) return;
    Alert.alert(t('Replace current writing?'), t('This will replace your current writing.'), [
      { text: t('Keep existing writing'), style: 'cancel' },
      { text: t('Replace with snippet'), style: 'destructive', onPress: () => controller.edit({ content: selectedSnippet.content, appliedTemplate: '' }) },
    ]);
  };
  const chooseSnippet = (snippet: QuickSnippetRecord) => {
    setSelectedSnippetId(snippet.id);
    const custom = state.localData.snippets.find(item => item.id === snippet.id) ?? null;
    setEditingSnippet(custom); setSnippetName(custom?.name ?? ''); setSnippetContent(custom?.content ?? '');
  };
  const saveSnippet = () => {
    const snippet: QuickSnippetRecord = { id: editingSnippet?.id ?? `custom-${randomUUID()}`, name: snippetName.trim(), content: snippetContent };
    void controller.saveSnippet(snippet).then(() => {
      setSelectedSnippetId(snippet.id); setEditingSnippet(snippet); setSnippetError(false);
    }).catch(() => setSnippetError(true));
  };
  const deleteSnippet = () => {
    if (!editingSnippet) return;
    Alert.alert(t('Delete snippet'), t('Delete this saved snippet from this account?'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete snippet'), style: 'destructive', onPress: () => {
        void controller.deleteSnippet(editingSnippet.id).then(() => {
          setSelectedSnippetId('default-1'); setEditingSnippet(null); setSnippetName(''); setSnippetContent(''); setSnippetError(false);
        }).catch(() => setSnippetError(true));
      } },
    ]);
  };
  const toggleRecentTag = (tag: string) => {
    const tags = draft.tags.split(',').map(value => value.trim()).filter(Boolean);
    controller.edit({ tags: tags.includes(tag) ? tags.filter(value => value !== tag).join(', ') : [...tags, tag].join(', ') });
  };
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
        {!state.ready && !state.issue && <ReadLoading label={t("Opening encrypted draft…")} />}
        {state.restored && <Text style={styles.meta}>{t("Restored your draft from this device.")}</Text>}
        {state.issue && <StatusMessage tone="warning">{errors[state.issue]}</StatusMessage>}
        {state.confirmedId ? <View style={styles.saved}>
          <Text accessibilityRole="header" style={styles.label}>{t('Saved diary')}</Text>
          <StatusMessage tone="warning">{t('Diary saved.')}</StatusMessage>
          <PrimaryButton label="Open saved diary" onPress={() => router.replace({ pathname: '/diaries/[id]', params: { id: state.confirmedId! } })} />
          <PrimaryButton label="Return to previous screen" onPress={() => router.canGoBack() ? router.back() : router.replace('/timeline')} />
        </View> : state.ready && <>
          <Text style={styles.label}>{t("Your diary")}</Text>
          <TextInput testID="quick-content" accessibilityLabel={t("Diary content")} maxLength={500000} multiline textAlignVertical="top" editable={!locked}
            placeholder={t("What is on your mind?")} placeholderTextColor={authColors.muted} style={[styles.input, styles.editor]}
            value={draft.content} onChangeText={content => controller.edit({ content })} />
          <Text style={styles.label}>{t("Date")}</Text>
          <TextInput testID="quick-date" accessibilityLabel={t("Diary date")} maxLength={10} editable={!locked} value={draft.date} style={styles.input}
            autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={date => controller.edit({ date })} />
          <Text style={styles.meta}>{state.lookup === 'exists' ? `${t('This date already has a diary.')} ${t(draft.mode === 'append' ? 'Append selected.' : 'Create selected — this may conflict.')}`
            : state.lookup === 'checking' ? t('Checking this date…') : state.lookup === 'error' ? t('Date could not be checked. It will be checked before saving.') : t('No diary found for this date.')}</Text>
          <View style={styles.modes}>
            <PrimaryButton label={draft.mode === 'create' ? 'Create selected' : 'Create'} disabled={locked} onPress={() => controller.edit({ mode: 'create' })} />
            <PrimaryButton label={draft.mode === 'append' ? 'Append selected' : 'Append'} disabled={locked} onPress={() => controller.edit({ mode: 'append' })} />
          </View>
          <PrimaryButton label={more ? 'Less' : 'Writing tools and templates'} onPress={() => setMore(!more)} />
          {more && <>
            <Text style={styles.meta}>{t('Apply template changes only when you are ready. Your current writing and selected date/symbols are retained.')}</Text>
            <Text style={styles.label}>{t('Writing template')}</Text>
            <View style={styles.choices}>
            {(['blank', 'trading', 'reflection', 'observation'] as const).map((kind: QuickNoteTemplateKind) => {
                const label = ({ blank: 'Free writing', trading: 'Trading note', reflection: 'Post-market reflection', observation: 'Market observation' } as const)[kind];
                const selected = draft.templateKind === kind;
                return <Pressable key={kind} disabled={locked} accessibilityRole="radio" accessibilityLabel={t(label)} accessibilityState={{ checked: selected, disabled: locked }}
                  onPress={() => controller.edit({ templateKind: kind })}
                  style={[styles.choice, { backgroundColor: selected ? authColors.action : authColors.surface, borderColor: authColors.border }]}>
                  <Text style={{ color: selected ? authColors.onAction : authColors.ink }}>{t(label)}</Text>
                </Pressable>;
              })}
            </View>
            <QuickTemplateFields kind={draft.templateKind} data={draft.templateData} controller={controller} disabled={locked}
              change={patch => controller.edit({ templateData: { ...draft.templateData, ...patch } })} />
            {draft.templateKind !== 'blank' && <View style={styles.modes}>
              <PrimaryButton label="Apply template changes" disabled={locked} onPress={() => applyTemplate()} />
              {!!draft.content.trim() && <PrimaryButton label="Replace writing" disabled={locked} onPress={confirmTemplateReplace} />}
            </View>}
            <Text accessibilityRole="header" style={styles.label}>{t('Saved snippets')}</Text>
            {snippets.map(snippet => {
              const selected = snippet.id === selectedSnippetId;
              return <Pressable key={snippet.id} accessibilityRole="radio" accessibilityLabel={snippet.name} accessibilityState={{ checked: selected }}
                onPress={() => chooseSnippet(snippet)} style={[styles.choice, { backgroundColor: selected ? authColors.action : authColors.surface, borderColor: authColors.border }]}>
                <Text style={{ color: selected ? authColors.onAction : authColors.ink }}>{snippet.name}</Text>
              </Pressable>;
            })}
            <View style={styles.modes}>
              <PrimaryButton label="Insert snippet" disabled={!selectedSnippet || locked} onPress={insertSnippet} />
              <PrimaryButton label="Replace with snippet" disabled={!selectedSnippet || locked} onPress={replaceWithSnippet} />
              <PrimaryButton label={manageSnippets ? 'Less' : 'Manage snippets'} onPress={() => setManageSnippets(!manageSnippets)} />
            </View>
            <Text style={styles.meta}>{t('Saved snippets are encrypted on this device for this account.')}</Text>
            {manageSnippets && <View style={styles.snippetEditor}>
              <Text accessibilityRole="header" style={styles.label}>{t(editingSnippet ? 'Edit snippet' : 'New snippet')}</Text>
              <View style={styles.choices}>{state.localData.snippets.map(snippet => <Pressable key={snippet.id} accessibilityRole="button"
                accessibilityLabel={snippet.name} onPress={() => chooseSnippet(snippet)} style={[styles.choice, { borderColor: authColors.border, backgroundColor: authColors.surface }]}>
                <Text style={{ color: authColors.ink }}>{snippet.name}</Text>
              </Pressable>)}</View>
              <TextInput accessibilityLabel={t('Snippet name')} placeholder={t('Snippet name')} maxLength={100} value={snippetName}
                onChangeText={setSnippetName} style={styles.input} />
              <TextInput accessibilityLabel={t('Snippet content')} placeholder={t('Snippet content')} multiline textAlignVertical="top"
                maxLength={500000} value={snippetContent} onChangeText={setSnippetContent} style={[styles.input, styles.editor]} />
              <View style={styles.modes}>
                <PrimaryButton label="Save snippet" disabled={!snippetName.trim() || !snippetContent.trim()} onPress={saveSnippet} />
                <PrimaryButton label="New snippet" onPress={() => { setEditingSnippet(null); setSnippetName(''); setSnippetContent(''); }} />
                {!!editingSnippet && <PrimaryButton label="Delete snippet" onPress={deleteSnippet} />}
              </View>
              {snippetError && <StatusMessage tone="warning">{t('Could not save this snippet on the device.')}</StatusMessage>}
            </View>}
            {state.localData.error && <StatusMessage tone="warning">{t('Recent suggestions could not be loaded or saved. Your diary draft remains available.')}</StatusMessage>}
            <Text style={styles.label}>{t("Title (optional; append keeps the existing title)")}</Text>
            <TextInput accessibilityLabel={t("Diary title")} maxLength={500} editable={!locked} style={styles.input} value={draft.title} onChangeText={title => controller.edit({ title, titleTouched: true })} />
            <Text style={styles.label}>{t("Tags (comma separated)")}</Text>
            <TextInput accessibilityLabel={t("Diary tags")} maxLength={6000} editable={!locked} style={styles.input} value={draft.tags} onChangeText={tags => controller.edit({ tags })} />
            <Text accessibilityRole="header" style={styles.label}>{t('Recent tags')}</Text>
            <Text style={styles.meta}>{t('Tap a recent tag to add or remove it.')}</Text>
            {state.localData.ready && state.localData.recentTags.length === 0 && <Text style={styles.meta}>{t('No recent tags yet.')}</Text>}
            <View style={styles.choices}>{state.localData.recentTags.map(tag => {
              const selected = draft.tags.split(',').map(value => value.trim()).includes(tag);
              return <Pressable key={tag} accessibilityRole="checkbox" accessibilityLabel={tag} accessibilityState={{ checked: selected }}
                onPress={() => toggleRecentTag(tag)} style={[styles.choice, { backgroundColor: selected ? authColors.action : authColors.surface, borderColor: authColors.border }]}>
                <Text style={{ color: selected ? authColors.onAction : authColors.ink }}>{tag}</Text>
              </Pressable>;
            })}</View>
            <Text style={styles.label}>{t("Stock symbols (comma separated)")}</Text>
            <TextInput accessibilityLabel={t("Diary symbols")} maxLength={1000} editable={!locked} autoCapitalize="characters" style={styles.input} value={draft.stockSymbols} onChangeText={stockSymbols => controller.edit({ stockSymbols })} />
          </>}
          {draft.attempt && <View style={styles.recovery}>
            <Text style={styles.label}>{draft.writeState === 'saving' && state.busy ? t('Saving…') : t('Write result uncertain')}</Text>
            <Text style={styles.meta}>{state.recovery === 'ambiguous' ? t('The saved diary changed. We cannot safely tell if your writing was added. Your draft is kept; inspect the diary before taking further action.') : t('Your writing may already be saved. Checking reads the diary without sending your writing again.')}</Text>
            <PrimaryButton label={t("Check saved diary")} busy={state.busy} onPress={() => void controller.checkResult()} />
            {state.existingId && <PrimaryButton label={t("Open saved diary")} onPress={() => router.push({ pathname: '/diaries/[id]', params: { id: state.existingId! } })} />}
          </View>}
          {state.recovery === 'pending' && <Text style={styles.meta}>{t("No change is visible yet. The original request may still commit. Your attempt remains locked; check again later.")}</Text>}
        </>}
        {(state.issue || draft.attempt) && <HelpButton screen="quick" code={draft.attempt ? 'UNKNOWN_WRITE' : state.issue ?? undefined} />}
      </ScrollView>
      {!state.confirmedId && <View style={styles.footer}>
        <Text accessibilityLiveRegion="polite" style={styles.meta}>{state.persistence === 'error' ? t('Draft storage unavailable') : state.persistence === 'pending' ? t('Saving draft on device…') : state.ready ? t('Draft saved on device') : t('Opening draft…')}</Text>
        <PrimaryButton testID="quick-save" label={t("Save")} busy={state.busy} disabled={locked || !draft.content.trim() || state.persistence === 'error'} onPress={() => void controller.save()} />
      </View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const createStyles = (authColors: Colors) => StyleSheet.create({
  page: { flex: 1, backgroundColor: authColors.canvas }, flex: { flex: 1 },
  content: { padding: 16, gap: 12 }, label: { fontSize: 15, fontWeight: '700', color: authColors.ink },
  meta: { fontSize: 13, lineHeight: 20, color: authColors.muted },
  input: { backgroundColor: authColors.surface, color: authColors.ink, borderColor: authColors.border, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, minHeight: 48 },
  editor: { minHeight: 230, fontSize: 18, lineHeight: 26 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 }, recovery: { gap: 12, paddingVertical: 12 },
  snippetEditor: { padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#888888', borderRadius: 10, gap: 10 },
  saved: { gap: 12, padding: 16 },
  footer: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, backgroundColor: authColors.surface, borderTopWidth: 1, borderTopColor: authColors.border },
});
