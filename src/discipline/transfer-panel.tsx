import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, Text, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { createDisciplineShare, encodeDisciplineShare } from '@diary/contracts/discipline-share';
import type { DisciplineResponse } from '@diary/contracts/discipline';
import type { disciplineService } from './service';
import { matchesDisciplineImport, nativeDisciplineShareUrl, inspectDisciplineImport, type DisciplineImportPreview } from './transfer';
import { Copy, Toggle } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { usePreferences } from '@/preferences/context';

type Service = ReturnType<typeof disciplineService>;
type Attempt = { before: Pick<DisciplineResponse, 'id' | 'content' | 'order'>[]; expected: string[]; replace: boolean };

export function DisciplineTransferPanel({ service, rows, ownerName, onImported, onVerify }: { service: Service; rows: readonly DisciplineResponse[]; ownerName?: string | null; onImported(): void; onVerify(): void }) {
  const { colors: c, t } = usePreferences();
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(() => new Set());
  const [json, setJson] = useState('');
  const [preview, setPreview] = useState<DisciplineImportPreview | null>(null);
  const [replace, setReplace] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [includeAuthor, setIncludeAuthor] = useState(false);
  const [prepared, setPrepared] = useState<{ json: string; link: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const selected = useMemo(() => rows.filter(row => !deselectedIds.has(row.id)), [rows, deselectedIds]);

  function toggleSelected(id: string) {
    setDeselectedIds(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setPrepared(null); setFailure(null); setStatus(null);
  }
  function inspect(value = json) {
    try { setPreview(inspectDisciplineImport(value)); setFailure(null); setStatus(null); }
    catch { setPreview(null); setFailure('This is not a valid principles file. Check the JSON and try again.'); }
  }
  async function chooseFile() {
    if (busy) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
      if (result.canceled) return;
      const text = await new File(result.assets[0]!.uri).text();
      setJson(text); setPreview(null); setFailure(null); setStatus(null); inspect(text);
    } catch {
      setFailure('The selected file could not be read. Your text and previous preview are unchanged.');
    }
  }
  async function prepareExport() {
    if (busy || !selected.length) return;
    setBusy(true); setFailure(null); setStatus(null); setPrepared(null);
    try {
      const response = await service.exportShare({ title: title.trim() || undefined, description: description.trim() || undefined, includeAuthor });
      const serverRows = response.data.disciplines;
      if (serverRows.length !== rows.length || serverRows.some((item, index) => item.content !== rows[index]?.content || item.order !== rows[index]?.order)) {
        setFailure('Principles changed on the server. Refresh the list and select them again.'); return;
      }
      const data = createDisciplineShare(
        selected.map((row, order) => ({ content: row.content, order })),
        { title: title.trim() || undefined, description: description.trim() || undefined, author: includeAuthor ? response.data.author : undefined },
        response.data.exportedAt,
      );
      const exportedJson = JSON.stringify(data, null, 2);
      const encoded = encodeDisciplineShare(data);
      const configuredScheme = Constants.expoConfig?.scheme;
      const link = nativeDisciplineShareUrl(encoded, Array.isArray(configuredScheme) ? configuredScheme[0] ?? 'diaryapp' : configuredScheme ?? 'diaryapp');
      setPrepared({ json: exportedJson, link }); setStatus('Export prepared.');
    } catch (error) {
      const kind = (error as { kind?: string })?.kind;
      setFailure(kind === 'session' ? 'Your session needs verification before principles can be imported.' : kind === 'rejected' ? 'No principles are available to export.' : 'The export could not be confirmed. Refresh the list and try again.');
    } finally { setBusy(false); }
  }
  async function copyText(value: string, success: string) {
    try { await Clipboard.setStringAsync(value); setFailure(null); setStatus(success); }
    catch { setFailure('Could not copy. Select the visible link and copy it manually.'); }
  }
  async function shareFile() {
    if (!prepared || busy) return;
    setBusy(true); setFailure(null);
    const file = new File(Paths.cache, `trading-principles-${Date.now()}.json`);
    try {
      file.create({ overwrite: true }); file.write(prepared.json);
      if (!await Sharing.isAvailableAsync()) throw new Error('sharing-unavailable');
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: t('Share JSON file') });
    } catch { setFailure('The JSON file could not be shared. The prepared text is still available below.'); }
    finally { try { if (file.exists) file.delete(); } catch { /* the temporary cache file expires with the cache */ } setBusy(false); }
  }
  async function shareLink() {
    if (!prepared || busy) return;
    try { await Share.share({ message: prepared.link }); }
    catch { setFailure('Could not open link.'); }
  }
  function clearImport() { setJson(''); setPreview(null); setFailure(null); setAttempt(null); setStatus('Import completed.'); onImported(); }
  async function checkAttempt(current: Attempt) {
    if (busy) return;
    setBusy(true); setFailure(null); setStatus(null);
    try {
      const rowsNow = await service.read();
      if (matchesDisciplineImport(rowsNow, current.before, current.expected, current.replace)) { clearImport(); return; }
      setFailure('The imported rows are not confirmed yet. Keep this preview and check again later.'); onImported();
    } catch { setFailure('The import result is uncertain. The list was checked. Keep this preview; this request will not be repeated.'); }
    finally { setBusy(false); }
  }
  async function performImport() {
    if (!preview || busy || attempt) return;
    const current: Attempt = { before: rows.map(({ id, content, order }) => ({ id, content, order })), expected: preview.disciplines.map(row => row.content), replace };
    setBusy(true); setFailure(null); setStatus(null);
    try { await service.importShare(json, replace); clearImport(); }
    catch (error) {
      const kind = (error as { kind?: string })?.kind;
      if (kind === 'uncertain') {
        setAttempt(current);
        try {
          const rowsNow = await service.read();
          if (matchesDisciplineImport(rowsNow, current.before, current.expected, current.replace)) { clearImport(); return; }
          setFailure('The import result is uncertain. The list was checked. Keep this preview; this request will not be repeated.');
        } catch { setFailure('The import result is uncertain. The list was checked. Keep this preview; this request will not be repeated.'); }
      } else if (kind === 'session') setFailure('Your session needs verification before principles can be imported.');
      else setFailure('The server rejected this import. Your preview is still here.');
    } finally { setBusy(false); }
  }
  function requestImport() {
    if (!preview || busy || attempt) return;
    if (!replace) { void performImport(); return; }
    Alert.alert(t('Replace all current principles with this preview? This cannot be undone.'), '', [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Replace current principles'), style: 'destructive', onPress: () => void performImport() },
    ]);
  }

  return <View style={{ gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
    <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{t('Import and share')}</Text>
    <Text style={{ color: c.ink, fontSize: 16, lineHeight: 24 }}>{t('Select principles to export')}</Text>
    {rows.map(row => <Pressable key={row.id} accessibilityRole="checkbox" accessibilityState={{ checked: !deselectedIds.has(row.id) }} accessibilityLabel={`${t('Select principle for export')}: ${row.content}`} onPress={() => toggleSelected(row.id)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <Text style={{ color: !deselectedIds.has(row.id) ? c.action : c.muted, fontSize: 22 }}>{!deselectedIds.has(row.id) ? '☑' : '☐'}</Text><Text selectable style={{ flex: 1, color: c.ink, fontSize: 16, lineHeight: 23 }}>{row.content}</Text>
    </Pressable>)}
    <PrimaryButton label={`Prepare export (${selected.length})`} busy={busy} disabled={!selected.length} onPress={() => void prepareExport()} />
    <Text style={{ color: c.ink, fontSize: 16 }}>{t('Share title')}</Text><TextInput accessibilityLabel={t('Share title')} value={title} onChangeText={value => { setTitle(value); setPrepared(null); }} editable={!busy} style={{ minHeight: 48, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.canvas, color: c.ink, fontSize: 16 }} />
    <Text style={{ color: c.ink, fontSize: 16 }}>{t('Share description')}</Text><TextInput accessibilityLabel={t('Share description')} value={description} onChangeText={value => { setDescription(value); setPrepared(null); }} multiline editable={!busy} style={{ minHeight: 72, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.canvas, color: c.ink, fontSize: 16 }} />
    <Toggle label="Include my profile name" value={includeAuthor} onChange={value => { setIncludeAuthor(value); setPrepared(null); }} />
    {includeAuthor && <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>{t('Anyone with this link can read the selected principles and included name')} {ownerName ? `(${ownerName})` : ''}</Text>}
    {prepared && <>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 18, fontWeight: '700' }}>{t('Share preview link')}</Text>
      <Copy>{t('The public website origin is not configured. You can still share this app preview link or the JSON file.')}</Copy>
      <Text selectable accessibilityLabel={t('Share preview link')} style={{ color: c.ink, fontSize: 14, lineHeight: 20 }}>{prepared.link}</Text>
      <PrimaryButton label="Copy preview link" onPress={() => void copyText(prepared.link, 'Preview link copied.')} />
      <PrimaryButton label="Open preview" onPress={() => router.push(prepared.link.replace(/^[a-z0-9.+-]+:\/\/discipline/, '/discipline') as Href)} />
      <PrimaryButton label="Share preview link" onPress={() => void shareLink()} />
      <PrimaryButton label="Share JSON file" busy={busy} onPress={() => void shareFile()} />
      <PrimaryButton label="Copy JSON" onPress={() => void copyText(prepared.json, 'Export prepared.')} />
      <Text selectable accessibilityLabel={t('Share JSON')} style={{ color: c.muted, fontSize: 13, lineHeight: 19, maxHeight: 180 }}>{prepared.json}</Text>
      <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>{t('Anyone with this link can read the selected principles and included name')}</Text>
    </>}
    <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 18, fontWeight: '700' }}>{t('Share JSON')}</Text>
    <PrimaryButton label="Choose JSON file" disabled={busy || !!attempt} onPress={() => void chooseFile()} />
    <TextInput testID="discipline-import-json" accessibilityLabel={t('Paste or edit JSON')} multiline value={json} onChangeText={value => { setJson(value); setPreview(null); setFailure(null); setStatus(null); }} editable={!busy && !attempt} textAlignVertical="top" style={{ minHeight: 140, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.canvas, color: c.ink, fontSize: 14, lineHeight: 21 }} />
    <PrimaryButton label="Preview import" busy={busy} disabled={!json.trim() || !!attempt} onPress={() => inspect()} />
    {preview && <View testID="discipline-import-preview" accessibilityLiveRegion="polite" style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 18, fontWeight: '700' }}>{t('Accepted principles')}: {preview.count}</Text>
      <Text style={{ color: c.muted, fontSize: 15 }}>{t('Skipped rows')}: {preview.skipped}</Text>
      {preview.disciplines.map((row, index) => <Text key={`${index}-${row.order}`} selectable style={{ color: c.ink, fontSize: 16, lineHeight: 24 }}>{index + 1}. {row.content}</Text>)}
      <Toggle label="Replace all existing principles" value={replace} onChange={setReplace} />
      <PrimaryButton label={replace ? 'Replace current principles' : 'Append import'} busy={busy} disabled={busy || !!attempt} onPress={requestImport} />
    </View>}
    {attempt && <PrimaryButton label="Check import status" busy={busy} disabled={busy} onPress={() => void checkAttempt(attempt)} />}
    {failure && <StatusMessage tone="warning">{failure}</StatusMessage>}
    {failure?.includes('verification') && <PrimaryButton label="Retry verification" busy={busy} onPress={onVerify} />}
    {status && <StatusMessage tone="warning">{status}</StatusMessage>}
    <Copy>{t(replace ? 'This replaces every principle in your account.' : 'The imported content will be added after your current principles.')}</Copy>
  </View>;
}
