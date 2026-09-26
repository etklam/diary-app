export function canonicalArticleSlug(value: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return null; }
  if (decoded.length < 1 || decoded.length > 255 || !/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u.test(decoded)) return null;
  return decoded;
}

export function canonicalArticleRoute(value: string): string | null {
  if (value === '/articles' || value === '/blog') return '/articles';
  const match = /^\/(articles|blog)\/([^/?#]+)$/.exec(value);
  if (!match || value.length > 4096) return null;
  const slug = canonicalArticleSlug(match[2]!);
  return slug ? `/articles/${encodeURIComponent(slug)}` : null;
}

export function safePublicWebOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function canonicalArticleWebUrl(slugValue: string, originValue: unknown): string | null {
  const slug = canonicalArticleSlug(slugValue);
  const origin = safePublicWebOrigin(originValue);
  return slug && origin ? `${origin}/articles/${encodeURIComponent(slug)}` : null;
}

export function safeArticleCoverUri(value: string | null, originValue?: unknown): string | null {
  if (!value) return null;
  try {
    const origin = safePublicWebOrigin(originValue);
    if (value.startsWith('/')) {
      if (!origin || value.startsWith('//')) return null;
      const url = new URL(value, origin);
      return url.origin === origin ? url.href : null;
    }
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
