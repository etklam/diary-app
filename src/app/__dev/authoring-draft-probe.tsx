import { useCallback, useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { nativeAuthoringDraftRepository } from '@/quick/native-storage';

const identity = {
  scope: '["native-runtime-probe","https://synthetic.invalid"]',
  ownerId: 'native-runtime-probe-owner',
  entityType: 'native-runtime-probe',
  entityId: 'process-death',
} as const;
const schema = z.object({ content: z.string() }).strict();

export default function AuthoringDraftProbe() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevAuthoringDraftProbe />;
}

function DevAuthoringDraftProbe() {
  const [content, setContent] = useState('');
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('Opening encrypted storage…');
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const repository = await nativeAuthoringDraftRepository();
      const draft = await repository.load(identity, { schemaVersion: 1, schema });
      setContent(draft?.data.content ?? '');
      setRevision(draft?.revision ?? 0);
      setStatus(draft ? `Loaded synthetic draft revision ${draft.revision}.` : 'No saved synthetic draft.');
    } catch {
      setStatus('Encrypted draft read failed. No database details are shown.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const repository = await nativeAuthoringDraftRepository();
      const saved = await repository.save({
        ...identity,
        schemaVersion: 1,
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
        data: { content },
      }, schema);
      if (!saved) {
        await load();
        setStatus('A newer synthetic revision exists; the current saved value was reloaded.');
        return;
      }
      await load();
      setStatus(`Saved synthetic draft revision ${revision + 1}. Force-stop and reopen this route to verify persistence.`);
    } catch {
      setStatus('Encrypted draft save failed. No database details are shown.');
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      const repository = await nativeAuthoringDraftRepository();
      await repository.removeOwner(identity.scope, identity.ownerId);
      setContent('');
      setRevision(0);
      setStatus('Only the synthetic probe owner was cleared.');
    } catch {
      setStatus('Synthetic probe cleanup failed. No database details are shown.');
    } finally {
      setBusy(false);
    }
  };

  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700' }}>Developer-only encrypted draft probe</Text>
    <Text>This route uses a fixed synthetic owner and environment. It does not read or write signed-in account drafts.</Text>
    <Text accessibilityLiveRegion="polite">{status}</Text>
    <TextInput
      accessibilityLabel="Synthetic draft content"
      multiline
      editable={!busy}
      value={content}
      onChangeText={setContent}
      style={{ minHeight: 120, padding: 12, borderWidth: 1, borderColor: '#777', borderRadius: 8, textAlignVertical: 'top' }}
    />
    <View style={{ gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Save synthetic draft" disabled={busy} onPress={() => void save()} style={{ minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 8, backgroundColor: '#173B57', opacity: busy ? 0.6 : 1 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Save synthetic draft</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Reload synthetic draft" disabled={busy} onPress={() => void load()} style={{ minHeight: 48, justifyContent: 'center', padding: 12, borderWidth: 1, borderRadius: 8, opacity: busy ? 0.6 : 1 }}>
        <Text style={{ textAlign: 'center', fontWeight: '600' }}>Reload synthetic draft</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Clear synthetic probe owner" disabled={busy} onPress={() => void clear()} style={{ minHeight: 48, justifyContent: 'center', padding: 12, borderWidth: 1, borderRadius: 8, opacity: busy ? 0.6 : 1 }}>
        <Text style={{ textAlign: 'center', fontWeight: '600' }}>Clear synthetic probe owner</Text>
      </Pressable>
    </View>
  </ScrollView>;
}
