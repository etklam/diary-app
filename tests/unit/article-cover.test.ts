import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImageProps, TextProps } from 'react-native';
import type { ReactElement } from 'react';
import { translate } from '../../src/preferences/translations';
import type { Locale } from '../../src/preferences/model';
import { ArticleCover } from '../../src/articles/ArticleCover';

// Exercise the component's native image/error contract without claiming device image loading.
const state = vi.hoisted(() => ({ failed: false, locale: 'en' as Locale }));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: () => [state.failed, (failed: boolean) => { state.failed = failed; }],
}));
vi.mock('react-native', () => ({ Image: 'NativeImage', Text: 'NativeText' }));
vi.mock('../../src/preferences/context', () => ({
  usePreferences: () => ({ colors: { ink: '#123456' }, t: (key: string) => translate(key, state.locale) }),
}));

describe('public article cover load failure', () => {
  beforeEach(() => { state.failed = false; state.locale = 'en'; });

  it.each(['en', 'zh-TW', 'zh-CN'] as const)('replaces a failed HTTPS cover with localized accessible recovery in %s', locale => {
    state.locale = locale;
    const props = { uri: 'https://cdn.example.test/missing-cover.jpg', title: 'Published research' };
    const image = ArticleCover(props) as ReactElement<ImageProps>;
    expect(image.type).toBe('NativeImage');
    expect(image.props.source).toEqual({ uri: props.uri });
    expect(image.props.accessibilityLabel).toBe(props.title);
    expect(image.props.onError).toBeTypeOf('function');
    image.props.onError!({ nativeEvent: { error: 'HTTP 404' } } as Parameters<NonNullable<ImageProps['onError']>>[0]);
    const recovery = ArticleCover(props) as ReactElement<TextProps>;
    expect(recovery.type).toBe('NativeText');
    expect(recovery.props.children).toBe(translate('Article cover image is unavailable in this build. The article text remains available.', locale));
    expect(recovery.props.accessibilityLiveRegion).toBe('polite');
    expect(recovery.props.style).toMatchObject({ color: '#123456', fontSize: 16 });
    expect(recovery.props.numberOfLines).toBeUndefined();
  });
});
