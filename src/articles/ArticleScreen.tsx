import { useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import { postPublicDetailSchema, type PostPublicDetail } from '@diary/contracts/post';
import { apiErrorResponseSchema } from '@diary/contracts';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { useAuth } from '@/auth/context';
import { usePreferences } from '@/preferences/context';
import { canonicalArticleSlug, canonicalArticleWebUrl, safeArticleCoverUri, safePublicWebOrigin } from './model';
import { Markdown } from '@/markdown/reader';
import { ArticleCover } from './ArticleCover';

type Result = { slug: string; article?: PostPublicDetail; error?: string };
const categoryLabels: Record<string, string> = { fundamental: 'Fundamental', technical: 'Technical', market: 'Market', strategy: 'Strategy' };

function publishedDate(value: string, locale: string) {
  return `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))} UTC`;
}

export function ArticleScreen({ slug: inputSlug }: { slug: string }) {
  const { api } = useAuth();
  const { colors: c, t } = usePreferences();
  const webOrigin = safePublicWebOrigin(Constants.expoConfig?.extra?.publicWebOrigin);
  const slug = canonicalArticleSlug(inputSlug);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareUsesAppLink, setShareUsesAppLink] = useState(false);
  const [shareError, setShareError] = useState(false);
  const visible = result?.slug === slug ? result : null;
  const loading = !!api && !!slug && !visible;

  useEffect(() => {
    if (!api || !slug) return;
    const controller = new AbortController();
    api.GET('/api/blog/{slug}', { params: { path: { slug } }, signal: controller.signal }).then(response => {
      if (controller.signal.aborted) return;
      const parsed = postPublicDetailSchema.safeParse(response.data);
      if (!response.response.ok || !parsed.success) {
        const apiError = apiErrorResponseSchema.safeParse(response.error);
        const missing = response.response.status === 404 || apiError.success && apiError.data.data.code === 'BLOG_NOT_FOUND';
        setResult({ slug, error: missing ? 'This article is not available or is no longer published.' : 'Could not load this article. Retry to continue.' });
      } else setResult({ slug, article: parsed.data });
    }).catch(() => { if (!controller.signal.aborted) setResult({ slug, error: 'Could not load this article. Retry to continue.' }); });
    return () => controller.abort();
  }, [api, slug, attempt]);

  async function share(article: PostPublicDetail) {
    const canonicalLink = canonicalArticleWebUrl(article.slug, webOrigin);
    const link = canonicalLink ?? Linking.createURL(`articles/${encodeURIComponent(article.slug)}`);
    setShareUsesAppLink(!canonicalLink);
    setShareLink(link); setShareError(false);
    try { await Share.share({ message: `${article.title}\n${link}` }); }
    catch { setShareError(true); }
  }
  function back() { if (router.canGoBack()) router.back(); else router.replace('/articles' as Href); }

  return <AccountPage title="Article">
    <PrimaryButton label="All articles" onPress={back} />
    {!slug && <StatusMessage tone="error">This article is not available or is no longer published.</StatusMessage>}
    {!api && slug && <StatusMessage tone="warning">The API origin is missing or unsafe for this build.</StatusMessage>}
    {loading && <Text accessibilityLiveRegion="polite" style={{ color: c.muted, fontSize: 15 }}>{t('Loading article…')}</Text>}
    {visible?.error && <>
      <StatusMessage tone="warning">{visible.error}</StatusMessage>
      <Copy>Open the articles list to find another published article or use Help and support.</Copy>
      <PrimaryButton label="Retry" onPress={() => setAttempt(value => value + 1)} />
      <PrimaryButton label="All articles" onPress={() => router.replace('/articles' as Href)} />
      <PrimaryButton label="Help and support" onPress={() => router.push('/about' as Href)} />
    </>}
    {visible?.article && <ArticleContent article={visible.article} webOrigin={webOrigin} onShare={() => void share(visible.article!)} />}
    {shareLink && <View style={{ gap: 8 }}>
      <Text style={{ color: c.ink, fontSize: 15 }}>{t('Article app link')}</Text>
      <Text selectable accessibilityLabel={t('Article app link')} style={{ color: c.ink, fontSize: 14, lineHeight: 20 }}>{shareLink}</Text>
      <Copy>{shareError ? 'Could not open the share sheet. You can select and copy the app link above.' : shareUsesAppLink ? 'The share sheet can send this app link. The app must be installed to open it.' : 'This link opens the canonical public article page on the website.'}</Copy>
    </View>}
  </AccountPage>;
}

function ArticleContent({ article, webOrigin, onShare }: { article: PostPublicDetail; webOrigin: string | null; onShare(): void }) {
  const { colors: c, locale, t } = usePreferences();
  const cover = safeArticleCoverUri(article.coverImage, webOrigin);
  return <View style={{ gap: 16 }}>
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.muted, fontSize: 14 }}>{t(categoryLabels[article.category] ?? article.category)} · {t('By')} {article.author.name ?? '—'} · {publishedDate(article.publishedAt ?? article.createdAt, locale)}</Text>
      <Text accessibilityRole="header" selectable style={{ color: c.ink, fontSize: 28, lineHeight: 36, fontWeight: '700' }}>{article.title}</Text>
      {article.excerpt && <Text selectable style={{ color: c.muted, fontSize: 18, lineHeight: 27 }}>{article.excerpt}</Text>}
    </View>
    {cover ? <ArticleCover key={cover} uri={cover} title={article.title} />
      : article.coverImage ? <Copy>Article cover image is unavailable in this build. The article text remains available.</Copy> : null}
    <PrimaryButton label="Share article" onPress={onShare} />
    <Markdown>{article.content}</Markdown>
  </View>;
}
