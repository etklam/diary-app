import { describe, expect, it } from 'vitest';
import { canonicalArticleRoute, canonicalArticleSlug, canonicalArticleWebUrl, safeArticleCoverUri, safePublicWebOrigin } from '../../src/articles/model';
import { nativeContinuation, safeContinuation } from '../../src/navigation/continuation';
import { translate } from '../../src/preferences/translations';

describe('public article routes and media', () => {
  it('canonicalizes current article paths and legacy Blog slugs without accepting path injection', () => {
    expect(canonicalArticleRoute('/articles/market-review')).toBe('/articles/market-review');
    expect(canonicalArticleRoute('/blog/市場-回顧')).toBe('/articles/%E5%B8%82%E5%A0%B4-%E5%9B%9E%E9%A1%A7');
    expect(canonicalArticleSlug('market-review')).toBe('market-review');
    expect(canonicalArticleRoute('/blog/%2e%2e%2fsecurity')).toBeNull();
    expect(canonicalArticleRoute('/articles/slug?admin=true')).toBeNull();
    expect(safeContinuation('/blog/market-review')).toBe('/articles/market-review');
    expect(nativeContinuation('diaryapp://blog/market-review')).toBe('/articles/market-review');
  });

  it('only loads HTTPS cover images without credentials and leaves site-relative media unavailable without a web origin', () => {
    expect(safeArticleCoverUri('https://cdn.example.test/article.jpg')).toBe('https://cdn.example.test/article.jpg');
    expect(safeArticleCoverUri('http://cdn.example.test/article.jpg')).toBeNull();
    expect(safeArticleCoverUri('https://user:password@example.test/a.jpg')).toBeNull();
    expect(safeArticleCoverUri('/uploads/article.jpg')).toBeNull();
    expect(safePublicWebOrigin('https://www.example.test/')).toBe('https://www.example.test');
    expect(safePublicWebOrigin('http://www.example.test')).toBeNull();
    expect(safePublicWebOrigin('https://www.example.test/path')).toBeNull();
    expect(canonicalArticleWebUrl('市場-回顧', 'https://www.example.test')).toBe('https://www.example.test/articles/%E5%B8%82%E5%A0%B4-%E5%9B%9E%E9%A1%A7');
    expect(canonicalArticleWebUrl('market-review', null)).toBeNull();
    expect(safeArticleCoverUri('/uploads/article.jpg', 'https://www.example.test')).toBe('https://www.example.test/uploads/article.jpg');
    expect(safeArticleCoverUri('//evil.example/image.jpg', 'https://www.example.test')).toBeNull();
  });

  it('localizes public article and product guidance copy in both supported Chinese locales', () => {
    const messages = [
      'Published research and decision notes, kept readable and traceable.', 'Search articles', 'All categories',
      'Apply article filters', 'Loading articles…', 'Could not load articles. Retry to continue.',
      'No published articles match these filters.', 'This article is not available or is no longer published.',
      'Loading article…', 'Article app link', 'Share article', 'Help and support',
      'Open the articles list to find another published article or use Help and support.',
      'Start with an observation', 'Make a plan and review it', 'Research before deciding',
      'Read and share public material', 'Protect your account and drafts',
      'Browse published articles without signing in. When the public website origin is configured, article shares use the canonical website page; until then, native sharing uses an app link. Public web previews and search indexing stay on the website.',
      'Record what you observed, why you acted, and what you learned when you review the outcome. This guide describes the native workflows available in this build.',
      'About Trade Basic',
    ];
    for (const message of messages) {
      expect(translate(message, 'zh-TW'), message).not.toBe(message);
      expect(translate(message, 'zh-CN'), message).not.toBe(message);
    }
  });
});
