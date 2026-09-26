import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { canonicalArticleRoute } from '@/articles/model';

export default function LegacyBlogRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const canonical = typeof slug === 'string' ? canonicalArticleRoute(`/blog/${encodeURIComponent(slug)}`) : null;
  return <Redirect href={(canonical ?? '/articles') as Href} />;
}
