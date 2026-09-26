import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import type { DisciplineResponse } from '@diary/contracts/discipline';
import { decodeDisciplineShare } from '@diary/contracts/discipline-share';
import { useAuth } from '@/auth/context';
import { AccountPage, Copy, Toggle } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { disciplineService } from '@/discipline/service';
import { inspectDisciplineImport, matchesDisciplineImport, canonicalDisciplineShareContinuation, MAX_DISCIPLINE_SHARE_LINK_LENGTH, type DisciplineImportPreview } from '@/discipline/transfer';
import { usePreferences } from '@/preferences/context';

export default function PublicDisciplineShareScreen() {
  const params = useLocalSearchParams<{ import?: string | string[] }>();
  const { state, api, diaryScope, retryVerification } = useAuth();
  const encoded = typeof params.import === 'string' ? params.import : null;
  const preview = useMemo(() => {
    if (!encoded || encoded.length > MAX_DISCIPLINE_SHARE_LINK_LENGTH) return null;
    try { return inspectDisciplineImport(decodeDisciplineShare(encoded)); }
    catch { return null; }
  }, [encoded]);

  if (state.status === 'bootstrapping') return <LoadingShare />;
  if (!preview || !encoded) return <ShareError />;
  const signedIn = state.status === 'signed-in' || state.status === 'recoverable-error' && !!state.user;
  if (signedIn && api && diaryScope) return <AuthenticatedShare key={diaryScope.ownerId} encoded={encoded} preview={preview} api={api} scope={diaryScope} retryVerification={retryVerification} />;
  const returnTo = canonicalDisciplineShareContinuation(`/discipline/share?import=${encodeURIComponent(encoded)}`);
  if (!returnTo) return <ShareError />;
  return <AccountPage title="Public discipline preview">
    <ShareContents preview={preview} />
    <Copy>Anyone with this link can read this content. Importing requires an account and your confirmation.</Copy>
    <PrimaryButton label="Sign in to import these principles" onPress={() => router.push({ pathname: '/', params: { returnTo } } as Href)} />
    <PrimaryButton label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
  </AccountPage>;
}

function ShareContents({ preview }: { preview: DisciplineImportPreview }) {
  const { colors: c, t } = usePreferences();
  return <View style={{ gap: 12 }}>
    <Text style={{ color: c.ink, fontSize: 22, fontWeight: '700' }}>{preview.title}</Text>
    {preview.description && <Text style={{ color: c.ink, fontSize: 16, lineHeight: 24 }}>{preview.description}</Text>}
    {preview.author && <Text style={{ color: c.muted, fontSize: 15 }}>{preview.author}</Text>}
    <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 18, fontWeight: '700' }}>{t('Accepted principles')}: {preview.count}</Text>
    {preview.disciplines.map((row, index) => <Text key={`${index}-${row.order}`} selectable style={{ color: c.ink, fontSize: 17, lineHeight: 25 }}>{index + 1}. {row.content}</Text>)}
  </View>;
}

function AuthenticatedShare({ encoded, preview, api, scope, retryVerification }: { encoded: string; preview: DisciplineImportPreview; api: NonNullable<ReturnType<typeof useAuth>['api']>; scope: NonNullable<ReturnType<typeof useAuth>['diaryScope']>; retryVerification(): Promise<void> }) {
  const service = useMemo(() => disciplineService(api, scope), [api, scope]);
  const { colors: c } = usePreferences();
  const [rows, setRows] = useState<DisciplineResponse[] | null>(null);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState<{ before: Pick<DisciplineResponse, 'id' | 'content' | 'order'>[]; expected: string[]; replace: boolean } | null>(null);
  const [imported, setImported] = useState(false);
  const { t } = usePreferences();

  useEffect(() => {
    let active = true;
    void service.read().then(value => { if (active) setRows(value); }).catch(error => { if (active) setFailure((error as { kind?: string })?.kind === 'session' ? 'Your session needs verification before principles can be imported.' : 'Could not load your principles. Retry to continue.'); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [service]);

  async function checkUncertain() {
    if (!uncertain || busy) return;
    setBusy(true); setFailure(null);
    try {
      const current = await service.read(); setRows(current);
      if (matchesDisciplineImport(current, uncertain.before, uncertain.expected, uncertain.replace)) { setImported(true); setStatus('Import completed.'); setUncertain(null); }
      else setFailure('The imported rows are not confirmed yet. Keep this preview and check again later.');
    } catch { setFailure('The import result is uncertain. The list was checked. Keep this preview; this request will not be repeated.'); }
    finally { setBusy(false); }
  }
  async function importRows() {
    if (!rows || busy || uncertain || imported) return;
    const attempt = { before: rows.map(({ id, content, order }) => ({ id, content, order })), expected: preview.disciplines.map(row => row.content), replace };
    setBusy(true); setFailure(null); setStatus(null);
    try { await service.importShare(decodeDisciplineShare(encoded), replace); setImported(true); setStatus('Import completed.'); }
    catch (error) {
      const kind = (error as { kind?: string })?.kind;
      if (kind === 'uncertain') {
        setUncertain(attempt);
        try {
          const current = await service.read(); setRows(current);
          if (matchesDisciplineImport(current, attempt.before, attempt.expected, attempt.replace)) { setImported(true); setStatus('Import completed.'); setUncertain(null); }
          else setFailure('The import result is uncertain. The list was checked. Keep this preview; this request will not be repeated.');
        } catch { setFailure('The import result is uncertain. The list was checked. Keep this preview; this request will not be repeated.'); }
      } else if (kind === 'session') setFailure('Your session needs verification before principles can be imported.');
      else setFailure('The server rejected this import. Your preview is still here.');
    } finally { setBusy(false); }
  }
  function confirmImport() {
    if (!replace) { void importRows(); return; }
    Alert.alert(t('Replace all current principles with this preview? This cannot be undone.'), '', [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Replace current principles'), style: 'destructive', onPress: () => void importRows() },
    ]);
  }
  const loadFailed = !rows && !busy;
  return <AccountPage title="Public discipline preview">
    <ShareContents preview={preview} />
    <Copy>Anyone with this link can read this content. Importing requires an account and your confirmation.</Copy>
    {rows === null && busy && <ActivityIndicator color={c.action} />}
    {rows && <>
      <Copy>{`Your account has ${rows.length} principles.`}</Copy>
      <Copy>{replace ? 'This replaces every principle in your account.' : 'The imported content will be added after your current principles.'}</Copy>
      <Toggle label="Replace all existing principles" value={replace} onChange={setReplace} />
      <PrimaryButton label={replace ? 'Replace current principles' : 'Append import'} busy={busy} disabled={busy || imported || !!uncertain} onPress={confirmImport} />
    </>}
    {loadFailed && <PrimaryButton label="Retry" onPress={() => { setFailure(null); setBusy(true); void service.read().then(setRows).catch(() => setFailure('Could not load your principles. Retry to continue.')).finally(() => setBusy(false)); }} />}
    {uncertain && <PrimaryButton label="Check import status" busy={busy} disabled={busy} onPress={() => void checkUncertain()} />}
    {failure && <StatusMessage tone="warning">{failure}</StatusMessage>}
    {status && <StatusMessage tone="warning">{status}</StatusMessage>}
    {failure?.includes('needs verification') && <PrimaryButton label="Retry verification" onPress={() => void retryVerification()} />}
    {imported && <PrimaryButton label="Open Trading principles" onPress={() => router.replace('/(private)/discipline' as Href)} />}
  </AccountPage>;
}

function LoadingShare() { const { colors: c, t } = usePreferences(); return <View style={{ flex: 1, backgroundColor: c.canvas, justifyContent: 'center', alignItems: 'center', gap: 12 }}><ActivityIndicator color={c.action} /><Text style={{ color: c.ink }}>{t('Checking session…')}</Text></View>; }
function ShareError() { return <AccountPage title="Public discipline preview"><StatusMessage tone="error">This is not a valid principles file. Check the JSON and try again.</StatusMessage><PrimaryButton label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /></AccountPage>; }
