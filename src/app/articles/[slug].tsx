import { useLocalSearchParams } from 'expo-router';
import { ArticleScreen } from '@/articles/ArticleScreen';

export default function ArticleRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <ArticleScreen slug={typeof slug === 'string' ? slug : ''} />;
}
