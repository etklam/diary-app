import { describe, expect, it } from 'vitest';
import { destinations, visibleDestinations } from '../../src/navigation/destinations';
import { shellText } from '../../src/navigation/copy';

describe('navigation access and readiness', () => {
  it('selects both Chinese scripts while retaining English fallback', () => {
    expect(shellText('Overview', 'zh-TW')).toBe('總覽');
    expect(shellText('Overview', 'zh-Hant-HK')).toBe('總覽');
    expect(shellText('Overview', 'zh-Hans-CN')).toBe('总览');
    expect(shellText('Overview', 'en-US')).toBe('Overview');
    expect(shellText('Overview', 'ja-JP')).toBe('Overview');
  });
  it('does not expose private or admin destinations to guests', () => {
    for (const section of ['overview', 'diary', 'portfolio', 'research', 'more'] as const) {
      expect(visibleDestinations(section, 'guest').every(item => item.audience === 'guest')).toBe(true);
    }
  });
  it('restricts administration to ADMIN and keeps unfinished routes non-actionable', () => {
    expect(visibleDestinations('more', 'USER').some(item => item.id === 'admin')).toBe(false);
    expect(visibleDestinations('more', 'ADMIN').find(item => item.id === 'admin')).toMatchObject({ audience: 'ADMIN' });
    expect(destinations.filter(item => item.href).map(item => item.id)).toEqual(['timeline', 'calendar', 'review', 'account', 'more-review']);
  });
});
