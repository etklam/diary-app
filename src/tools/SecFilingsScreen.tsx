import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import {
  secApiResponseSchema, secCompanySearchResultSchema, secFilingPageSchema,
  type SecCacheMeta, type SecCompanySearchResult, type SecFilingPage,
} from '@diary/contracts/sec-filings';
import { AccountPage, Choice, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { normalizeSecCompanyQuery, secErrorCode, secErrorCopy, validateSecFilingFilters } from './sec-filings';

const forms = ['10-K', '10-Q', '8-K', '20-F', '6-K', '40-F'] as const;
type Amendments = 'include' | 'exclude' | 'only';
type Filters = { forms: string[]; filedFrom: string; filedTo: string; periodFrom: string; periodTo: string; amendments: Amendments };
const initialFilters: Filters = { forms: [], filedFrom: '', filedTo: '', periodFrom: '', periodTo: '', amendments: 'include' };

function CacheNotice({ meta }: { meta: SecCacheMeta | null }) {
  const { t, colors: c } = usePreferences();
  if (!meta) return null;
  return <Text accessibilityLiveRegion="polite" style={{ color: meta.stale ? c.warningText : c.muted, fontSize: 14, lineHeight: 21 }}>
    {t(meta.stale ? 'Showing previously fetched SEC data because the provider could not refresh.' : 'SEC data fetched')}: {meta.fetchedAt} · {t(`Cache status ${meta.cacheStatus}`)}
  </Text>;
}

export function SecFilingsScreen() {
  const { api } = useAuth();
  const { colors: c, t } = usePreferences();
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<SecCompanySearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<SecCompanySearchResult | null>(null);
  const [page, setPage] = useState<SecFilingPage | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [filterDraft, setFilterDraft] = useState<Filters>(initialFilters);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [filingBusy, setFilingBusy] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [filingError, setFilingError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [meta, setMeta] = useState<SecCacheMeta | null>(null);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const companyRequest = useRef(0);
  const filingRequest = useRef(0);
  const companyController = useRef<AbortController | null>(null);
  const filingController = useRef<AbortController | null>(null);
  const companySchema = secApiResponseSchema(secCompanySearchResultSchema.array().max(20));
  const pageSchema = secApiResponseSchema(secFilingPageSchema);

  useEffect(() => () => { companyController.current?.abort(); filingController.current?.abort(); }, []);

  async function searchCompany() {
    if (!api || companyBusy) return;
    const normalized = normalizeSecCompanyQuery(query);
    if (!normalized) { setCompanyError('Enter a company name, ticker, or 1–10 digit CIK.'); return; }
    const request = ++companyRequest.current;
    companyController.current?.abort();
    filingController.current?.abort(); filingRequest.current += 1; setFilingBusy(false);
    const controller = new AbortController(); companyController.current = controller;
    setCompanyBusy(true); setCompanyError(null); setCompanies([]); setSelectedCompany(null); setPage(null); setFilingError(null); setMeta(null);
    try {
      const result = await api.GET('/api/tools/sec-filings/companies', { params: { query: { q: normalized, limit: 10 } }, signal: controller.signal });
      if (request !== companyRequest.current || controller.signal.aborted) return;
      const parsed = companySchema.safeParse(result.data);
      if (!result.response.ok || !parsed.success) setCompanyError(secErrorCopy(secErrorCode(result.error)));
      else { setCompanies(parsed.data.data); setMeta(parsed.data.meta); }
    } catch {
      if (request === companyRequest.current && !controller.signal.aborted) setCompanyError(secErrorCopy());
    } finally {
      if (request === companyRequest.current) setCompanyBusy(false);
      if (companyController.current === controller) companyController.current = null;
    }
  }

  async function loadFilings(company: SecCompanySearchResult, selectedFilters: Filters, cursor?: string) {
    if (!api) return;
    const request = ++filingRequest.current;
    filingController.current?.abort();
    const controller = new AbortController(); filingController.current = controller;
    setFilingBusy(true); setFilingError(null); setFilterError(null);
    try {
      const result = await api.GET('/api/tools/sec-filings/companies/{cik}/filings', {
        params: { path: { cik: company.cik }, query: {
          forms: selectedFilters.forms.length ? selectedFilters.forms.join(',') : undefined,
          filedFrom: selectedFilters.filedFrom || undefined, filedTo: selectedFilters.filedTo || undefined,
          periodFrom: selectedFilters.periodFrom || undefined, periodTo: selectedFilters.periodTo || undefined,
          amendments: selectedFilters.amendments, cursor, limit: 50,
        } }, signal: controller.signal,
      });
      if (request !== filingRequest.current || controller.signal.aborted) return;
      const parsed = pageSchema.safeParse(result.data);
      if (!result.response.ok || !parsed.success) setFilingError(secErrorCopy(secErrorCode(result.error)));
      else { setPage(parsed.data.data); setMeta(parsed.data.meta); }
    } catch {
      if (request === filingRequest.current && !controller.signal.aborted) setFilingError(secErrorCopy());
    } finally {
      if (request === filingRequest.current) setFilingBusy(false);
      if (filingController.current === controller) filingController.current = null;
    }
  }

  function selectCompany(company: SecCompanySearchResult) {
    setSelectedCompany(company); setPage(null); setFilingError(null); setFilterError(null);
    setFilters(initialFilters); setFilterDraft(initialFilters); setCursors([undefined]); setPageIndex(0);
    void loadFilings(company, initialFilters);
  }

  function applyFilters() {
    if (!selectedCompany) return;
    const validation = validateSecFilingFilters(filterDraft);
    if (validation) { setFilterError('Check filing dates and filters. The start date must not be after the end date.'); return; }
    setFilters(filterDraft); setCursors([undefined]); setPageIndex(0); setPage(null);
    void loadFilings(selectedCompany, filterDraft);
  }

  function resetFilters() {
    setFilters(initialFilters); setFilterDraft(initialFilters); setCursors([undefined]); setPageIndex(0); setPage(null);
    if (selectedCompany) void loadFilings(selectedCompany, initialFilters);
  }
  function nextPage() {
    if (!selectedCompany || !page?.nextCursor || filingBusy) return;
    const next = pageIndex + 1;
    setCursors(current => { const value = [...current]; value[next] = page.nextCursor!; return value; });
    setPageIndex(next); void loadFilings(selectedCompany, filters, page.nextCursor);
  }
  function previousPage() {
    if (!selectedCompany || pageIndex === 0 || filingBusy) return;
    const previous = pageIndex - 1; setPageIndex(previous); void loadFilings(selectedCompany, filters, cursors[previous]);
  }
  function retry() {
    if (selectedCompany) void loadFilings(selectedCompany, filters, cursors[pageIndex]);
    else void searchCompany();
  }
  function openFiling(accession: string) {
    if (!selectedCompany) return;
    router.push({ pathname: '/tools/sec-filings/[cik]/[accession]', params: { cik: selectedCompany.cik, accession } } as unknown as Href);
  }
  function toggleForm(form: string) {
    setFilterDraft(current => ({ ...current, forms: current.forms.includes(form) ? current.forms.filter(value => value !== form) : [...current.forms, form] }));
  }
  function dateField(label: string, field: 'filedFrom' | 'filedTo' | 'periodFrom' | 'periodTo') {
    return <View key={field} style={{ gap: 6, flex: 1, minWidth: 135 }}>
      <Text style={{ color: c.ink, fontSize: 14 }}>{t(label)}</Text>
      <TextInput accessibilityLabel={t(label)} value={filterDraft[field]} onChangeText={value => setFilterDraft(current => ({ ...current, [field]: value }))} maxLength={10} placeholder="YYYY-MM-DD" placeholderTextColor={c.muted} autoCapitalize="none" style={{ minHeight: 48, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.ink, fontSize: 15 }} />
    </View>;
  }

  return <AccountPage title="SEC filings">
    <Copy>Search official company filings and read their document indexes. This public research tool does not require sign-in.</Copy>
    <Text style={{ color: c.ink, fontSize: 16 }}>{t('Company, ticker, or CIK')}</Text>
    <TextInput testID="sec-company-query" accessibilityLabel={t('Company, ticker, or CIK')} value={query} onChangeText={value => { setQuery(value.slice(0, 120)); setCompanyError(null); }} onSubmitEditing={() => void searchCompany()} returnKeyType="search" maxLength={120} autoCorrect={false} style={{ minHeight: 52, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.ink, fontSize: 17 }} />
    <PrimaryButton testID="sec-search" label="Search SEC" busy={companyBusy} disabled={!query.trim() || companyBusy} onPress={() => void searchCompany()} />
    {companyError && <StatusMessage tone="warning">{companyError}</StatusMessage>}
    {companies.length > 0 && !selectedCompany && <View accessibilityRole="list" style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{t('Company matches')}</Text>
      {companies.map(company => <Pressable key={company.cik} accessibilityRole="button" accessibilityLabel={`${company.name}. ${company.tickers.join(', ')}. CIK ${company.cik}`} onPress={() => selectCompany(company)} style={{ minHeight: 56, padding: 14, gap: 6, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
        <Text style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{company.name}</Text>
        <Text style={{ color: c.muted, fontSize: 14 }}>{company.tickers.join(', ') || '—'} · {t('CIK')} {company.cik} · {t(`Matched by ${company.matchedBy}`)}</Text>
      </Pressable>)}
    </View>}
    {selectedCompany && <>
      <View style={{ gap: 6, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
        <Text style={{ color: c.muted, fontSize: 14 }}>{t('Selected company')}</Text>
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 21, fontWeight: '700' }}>{selectedCompany.name}</Text>
        <Text style={{ color: c.ink, fontSize: 15 }}>{selectedCompany.tickers.join(', ') || '—'} · {selectedCompany.exchanges.join(', ') || '—'}</Text>
        <Text style={{ color: c.muted, fontSize: 14 }}>{t('CIK')} {selectedCompany.cik}</Text>
      </View>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 19, fontWeight: '700' }}>{t('Filing filters')}</Text>
      <View style={{ gap: 8 }}>
        <Text style={{ color: c.ink, fontSize: 15 }}>{t('Forms')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {forms.map(form => <Pressable key={form} accessibilityRole="checkbox" accessibilityLabel={`${t('Form')}: ${form}`} accessibilityState={{ checked: filterDraft.forms.includes(form) }} onPress={() => toggleForm(form)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: filterDraft.forms.includes(form) ? 2 : 1, borderColor: filterDraft.forms.includes(form) ? c.action : c.border, backgroundColor: c.surface }}>
            <Text style={{ color: c.ink, fontSize: 15 }}>{filterDraft.forms.includes(form) ? '☑ ' : '☐ '}{form}</Text>
          </Pressable>)}
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{dateField('Filed from', 'filedFrom')}{dateField('Filed to', 'filedTo')}{dateField('Report period from', 'periodFrom')}{dateField('Report period to', 'periodTo')}</View>
      <Choice label="Amendments" value={filterDraft.amendments} onChange={value => setFilterDraft(current => ({ ...current, amendments: value as Amendments }))} values={[
        ['include', 'Include amendments'], ['exclude', 'Exclude amendments'], ['only', 'Amendments only'],
      ]} />
      {filterError && <StatusMessage tone="error">{filterError}</StatusMessage>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <PrimaryButton testID="sec-apply-filters" label="Apply filters" busy={filingBusy} disabled={filingBusy} onPress={applyFilters} />
        <PrimaryButton label="Reset filters" disabled={filingBusy} onPress={resetFilters} />
      </View>
      <CacheNotice meta={meta} />
      {filingError && <><StatusMessage tone="warning">{filingError}</StatusMessage><PrimaryButton label="Retry" busy={filingBusy} onPress={retry} /></>}
      {filingBusy && <Text accessibilityLiveRegion="polite" style={{ color: c.muted, fontSize: 15 }}>{t('Loading SEC filings…')}</Text>}
      {page && <>
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 19, fontWeight: '700' }}>{t('Filings')} · {page.filings.length}</Text>
        {!page.filings.length && <Copy>No filings match the selected filters.</Copy>}
        <View accessibilityRole="list" style={{ gap: 12 }}>
          {page.filings.map(filing => <View key={filing.accession} style={{ padding: 14, gap: 7, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700' }}>{filing.form}{filing.isAmendment ? ` · ${t('Amendment')}` : ''}</Text>
            <Text style={{ color: c.ink, fontSize: 14 }}>{t('Filed')}: {filing.filingDate} · {t('Report period')}: {filing.reportDate ?? t('Not provided')}</Text>
            <Text selectable style={{ color: c.muted, fontSize: 13 }}>{t('Accession')}: {filing.accession}</Text>
            <Text selectable style={{ color: c.ink, fontSize: 14 }}>{filing.primaryDocumentDescription ?? t('Primary document')}: {filing.primaryDocument}</Text>
            {filing.acceptanceDateTime && <Text style={{ color: c.muted, fontSize: 13 }}>{t('Accepted')}: {filing.acceptanceDateTime} UTC</Text>}
            <PrimaryButton label="Open filing details" onPress={() => openFiling(filing.accession)} />
          </View>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <PrimaryButton label="Previous page" disabled={filingBusy || pageIndex === 0} onPress={previousPage} />
          <Text accessibilityLabel={t('Filing page')} style={{ color: c.ink, alignSelf: 'center', fontSize: 16 }}>{pageIndex + 1}</Text>
          <PrimaryButton label="Next page" disabled={filingBusy || !page.nextCursor} onPress={nextPage} />
        </View>
      </>}
    </>}
  </AccountPage>;
}
