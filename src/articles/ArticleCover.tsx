import { useState } from 'react';
import { Image, Text } from 'react-native';
import { usePreferences } from '../preferences/context';

/** Mount with the validated URI as its key so another cover gets a fresh attempt. */
export function ArticleCover({ uri, title }: { uri: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const { colors, t } = usePreferences();
  if (failed) return <Text testID="article-cover-unavailable" accessibilityLiveRegion="polite" style={{ color: colors.ink, fontSize: 16, lineHeight: 25 }}>
    {t('Article cover image is unavailable in this build. The article text remains available.')}
  </Text>;
  return <Image source={{ uri }} accessibilityLabel={title} resizeMode="cover" onError={() => setFailed(true)} style={{ width: '100%', height: 220, borderRadius: 12 }} />;
}
