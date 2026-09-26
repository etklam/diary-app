import { describe, expect, it } from 'vitest';
import { publicTools, toolBySlug } from '../../src/tools/catalog';

describe('public tools directory catalog', () => {
  it('tracks every source-defined public tool with a stable native route', () => {
    expect(publicTools.map(tool => tool.slug)).toEqual([
      'position-sizing', 'financial-freedom', 'relative-value', 'seasonality', 'etf', 'market-rotation', 'sec-filings',
    ]);
    expect(new Set(publicTools.map(tool => tool.slug)).size).toBe(publicTools.length);
    for (const tool of publicTools) expect(toolBySlug(tool.slug)).toBe(tool);
    expect(toolBySlug('not-a-tool')).toBeUndefined();
  });

  it('provides a name and purpose in each supported app locale', () => {
    for (const tool of publicTools) {
      for (const locale of ['en', 'zh-TW', 'zh-CN'] as const) {
        expect(tool.name[locale].trim()).not.toBe('');
        expect(tool.purpose[locale].trim()).not.toBe('');
      }
    }
  });
});
