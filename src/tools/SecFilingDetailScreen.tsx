import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { secApiResponseSchema, secFilingDetailSchema, type SecCacheMeta, type SecFilingDetail } from '@diary/contracts/sec-filings';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { canonicalSecAccession, canonicalSecCik, originalSecDocumentUrl, secErrorCode, secErrorCopy } from './sec-filings';
const detailResponseSchema = secApiResponseSchema(secFilingDetailSchema);

type LoadResult = { key: string; detail?: SecFilingDetail; meta?: SecCacheMeta; error?: string };

function bytes(value: number, locale: string) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1024)} KB`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / (1024 * 1024))} MB`;
}

export function SecFilingDetailScreen({ cik, accession }: { cik: string; accession: string }) {
  const { api } = useAuth();
  const { colors: c, locale, t } = usePreferences();
  const normalizedCik = canonicalSecCik(cik);
  const normalizedAccession = canonicalSecAccession(accession);
  const key = `${normalizedCik ?? 'invalid'}:${normalizedAccession ?? 'invalid'}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const parsed = result?.key === key ? result : null;
  const pending = !!api && !!normalizedCik && !!normalizedAccession && !parsed;
  useEffect(() => {
    if (!api || !normalizedCik || !normalizedAccession) return;
    const controller = new AbortController();
    const requestKey = `${normalizedCik}:${normalizedAccession}`;
    api.GET('/api/tools/sec-filings/companies/{cik}/filings/{accession}', { params: { path: { cik: normalizedCik, accession: normalizedAccession } }, signal: controller.signal })
      .then(response => {
        if (controller.signal.aborted) return;
        const data = detailResponseSchema.safeParse(response.data);
        if (!response.response.ok || !data.success) setResult({ key: requestKey, error: secErrorCopy(secErrorCode(response.error)) });
        else setResult({ key: requestKey, detail: data.data.data, meta: data.data.meta });
      }).catch(() => { if (!controller.signal.aborted) setResult({ key: requestKey, error: secErrorCopy() }); });
    return () => controller.abort();
  }, [api, normalizedCik, normalizedAccession, attempt]);

  async function openDocument(basename: string) {
    if (!normalizedCik || !normalizedAccession) return;
    const url = originalSecDocumentUrl(normalizedCik, normalizedAccession, basename);
    if (!url) { setOpenError('The SEC document link did not pass the safety check.'); return; }
    try { await Linking.openURL(url); setOpenError(null); }
    catch { setOpenError('Could not open the SEC document.'); }
  }
  function goBack() { if (router.canGoBack()) router.back(); else router.replace('/tools/sec-filings' as Href); }

  return <AccountPage title="SEC filing detail">
    <PrimaryButton label="Back to filings" onPress={goBack} />
    {!normalizedCik || !normalizedAccession ? <StatusMessage tone="error">Check the company identifier and filing accession.</StatusMessage> : null}
    {pending && <Text accessibilityLiveRegion="polite" style={{ color: c.muted, fontSize: 15 }}>{t('Loading filing detail…')}</Text>}
    {!api && normalizedCik && normalizedAccession && <StatusMessage tone="warning">The API origin is missing or unsafe for this build.</StatusMessage>}
    {parsed?.error && <><StatusMessage tone="warning">{parsed.error}</StatusMessage><PrimaryButton label="Retry" onPress={() => { setResult(null); setAttempt(value => value + 1); }} /></>}
    {parsed?.meta && <CacheNotice meta={parsed.meta} />}
    {parsed?.detail && <View style={{ gap: 14 }}>
      <View style={{ gap: 6, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
        <Text style={{ color: c.muted, fontSize: 14 }}>{parsed.detail.company.name}</Text>
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 24, fontWeight: '700' }}>{parsed.detail.filing.form}{parsed.detail.filing.isAmendment ? ` · ${t('Amendment')}` : ''}</Text>
        <Text style={{ color: c.ink, fontSize: 15 }}>{parsed.detail.company.tickers.join(', ') || '—'} · {t('CIK')} {parsed.detail.company.cik}</Text>
        <Text selectable style={{ color: c.muted, fontSize: 14 }}>{t('Accession')}: {parsed.detail.filing.accession}</Text>
        <Text style={{ color: c.ink, fontSize: 15 }}>{t('Filed')}: {parsed.detail.filing.filingDate}</Text>
        <Text style={{ color: c.ink, fontSize: 15 }}>{t('Report period')}: {parsed.detail.filing.reportDate ?? t('Not provided')}</Text>
        <Text style={{ color: c.ink, fontSize: 14 }}>{t('Accepted')}: {parsed.detail.filing.acceptanceDateTime ?? t('Not provided')}</Text>
        <Text style={{ color: c.ink, fontSize: 14 }}>{t('Primary document')}: {parsed.detail.filing.primaryDocument}</Text>
        {parsed.detail.filing.primaryDocumentDescription && <Text style={{ color: c.muted, fontSize: 14 }}>{parsed.detail.filing.primaryDocumentDescription}</Text>}
      </View>
      {!parsed.detail.hasPdf && <StatusMessage tone="warning">This filing does not include a PDF. The original submitted files remain available below.</StatusMessage>}
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{t('Documents')} · {parsed.detail.documents.length}</Text>
      {!parsed.detail.documents.length && <Copy>No documents are listed for this filing.</Copy>}
      <View accessibilityRole="list" style={{ gap: 10 }}>
        {parsed.detail.documents.map(document => <View key={document.basename} style={{ gap: 8, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
          <Text selectable style={{ color: c.ink, fontSize: 16, fontWeight: '700' }}>{document.basename}</Text>
          <Text style={{ color: c.ink, fontSize: 14, lineHeight: 21 }}>{document.description ?? t('Not provided')} · {document.type ?? t('Not provided')}</Text>
          <Text style={{ color: c.muted, fontSize: 14 }}>{t(`Document class ${document.classification}`)}{document.isPrimary ? ` · ${t('Primary')}` : ''} · {bytes(document.size, locale)}</Text>
          <PrimaryButton label="Open original SEC document" accessibilityHint={t('Opens the official SEC filing in your browser.')} onPress={() => void openDocument(document.basename)} />
        </View>)}
      </View>
    </View>}
    {openError && <StatusMessage tone="warning">{openError}</StatusMessage>}
  </AccountPage>;
}

function CacheNotice({ meta }: { meta: SecCacheMeta }) {
  const { t, colors: c } = usePreferences();
  return <Text accessibilityLiveRegion="polite" style={{ color: meta.stale ? c.warningText : c.muted, fontSize: 14, lineHeight: 21 }}>
    {t(meta.stale ? 'Showing previously fetched SEC data because the provider could not refresh.' : 'SEC data fetched')}: {meta.fetchedAt} · {t(`Cache status ${meta.cacheStatus}`)}
  </Text>;
}
