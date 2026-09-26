import { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { postPublicListResponseSchema, type PostPublicListResponse } from '@diary/contracts/post';
import { AccountPage, Choice, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';

const categories = ['fundamental', 'technical', 'market', 'strategy'] as const;
const categoryLabel: Record<(typeof categories)[number], string> = {
  fundamental: 'Fundamental', technical: 'Technical', market: 'Market', strategy: 'Strategy',
};
type ListResult = { key: string; response?: PostPublicListResponse; error?: string };

function displayDate(value: string, locale: string) {
  return `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))} UTC`;
}

export function ArticlesScreen() {
  const { api, state: authState } = useAuth();
  const { colors: c, locale, t } = usePreferences();
  const [searchDraft, setSearchDraft] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<ListResult | null>(null);
  const key = useMemo(() => JSON.stringify([search, category, page]), [search, category, page]);
  const visible = result?.key === key ? result : null;
  const loading = !!api && !visible;
  const admin = authState.status === 'signed-in' && authState.user.role === 'ADMIN'
    || authState.status === 'recoverable-error' && authState.user?.role === 'ADMIN';

  useEffect(() => {
    if (!api) return;
    const controller = new AbortController();
    const requestKey = key;
    api.GET('/api/blog', { params: { query: { page, limit: 9, category: category || undefined, search: search || undefined } }, signal: controller.signal })
      .then(response => {
        if (controller.signal.aborted) return;
        const parsed = postPublicListResponseSchema.safeParse(response.data);
        if (!response.response.ok || !parsed.success) setResult({ key: requestKey, error: response.response.status === 404 ? 'The article list is unavailable.' : 'Could not load articles. Retry to continue.' });
        else setResult({ key: requestKey, response: parsed.data });
      }).catch(() => { if (!controller.signal.aborted) setResult({ key: requestKey, error: 'Could not load articles. Retry to continue.' }); });
    return () => controller.abort();
  }, [api, key, page, category, search, retry]);

  function apply() { setSearch(searchDraft.trim()); setCategory(categoryDraft); setPage(1); }
  function openArticle(slug: string) {
    router.push({ pathname: '/articles/[slug]', params: { slug } } as unknown as Href);
  }

  return <AccountPage title="Articles">
    <Copy>Published research and decision notes, kept readable and traceable.</Copy>
    {!api && <StatusMessage tone="warning">The API origin is missing or unsafe for this build.</StatusMessage>}
    <View style={{ gap: 7 }}>
      <Text style={{ color: c.ink, fontSize: 16 }}>{t('Search articles')}</Text>
      <TextInput testID="article-search" accessibilityLabel={t('Search articles')} value={searchDraft} onChangeText={setSearchDraft} onSubmitEditing={apply} maxLength={500} returnKeyType="search" style={{ minHeight: 50, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 10, backgroundColor: c.surface, color: c.ink, fontSize: 16 }} />
    </View>
    <Choice label="Category" value={categoryDraft || 'all'} onChange={value => setCategoryDraft(value === 'all' ? '' : value)} values={[
      ['all', 'All categories'], ...categories.map(value => [value, categoryLabel[value]] as const),
    ]} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <PrimaryButton testID="article-apply" label="Apply article filters" disabled={loading} onPress={apply} />
      <PrimaryButton label="Guide" onPress={() => router.push('/guide' as Href)} />
      <PrimaryButton label="About" onPress={() => router.push('/about' as Href)} />
    </View>
    {admin && <Copy>Public preview mode. Publishing and article administration are managed separately.</Copy>}
    {loading && <Text accessibilityLiveRegion="polite" style={{ color: c.muted, fontSize: 15 }}>{t('Loading articles…')}</Text>}
    {visible?.error && <><StatusMessage tone="warning">{visible.error}</StatusMessage><PrimaryButton label="Retry" onPress={() => setRetry(value => value + 1)} /></>}
    {visible?.response && <>
      {!visible.response.data.length && <Copy>No published articles match these filters.</Copy>}
      <View accessibilityRole="list" style={{ gap: 12 }}>
        {visible.response.data.map(post => <View key={post.id} style={{ padding: 16, gap: 8, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surface }}>
          <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 20, lineHeight: 27, fontWeight: '700' }}>{post.title}</Text>
          <Text style={{ color: c.muted, fontSize: 14 }}>{t(categoryLabel[post.category as keyof typeof categoryLabel] ?? post.category)} · {t('By')} {post.author.name ?? '—'} · {displayDate(post.publishedAt ?? post.createdAt, locale)}</Text>
          {post.excerpt && <Text selectable style={{ color: c.ink, fontSize: 15, lineHeight: 23 }}>{post.excerpt}</Text>}
          <PrimaryButton label="Read article" accessibilityHint={t('Opens the published article.')} onPress={() => openArticle(post.slug)} />
        </View>)}
      </View>
      {visible.response.pagination.totalPages > 1 && <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <PrimaryButton label="Previous page" disabled={loading || page <= 1} onPress={() => setPage(value => Math.max(1, value - 1))} />
        <Text accessibilityLabel={t('Article page')} style={{ color: c.ink, fontSize: 15 }}>{t('Page')} {page} / {visible.response.pagination.totalPages}</Text>
        <PrimaryButton label="Next page" disabled={loading || page >= visible.response.pagination.totalPages} onPress={() => setPage(value => value + 1)} />
      </View>}
    </>}
  </AccountPage>;
}
