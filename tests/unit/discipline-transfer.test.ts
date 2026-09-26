import { describe, expect, it } from 'vitest';
import type { DisciplineResponse } from '@diary/contracts/discipline';
import { createDisciplineShare, encodeDisciplineShare } from '@diary/contracts/discipline-share';
import { inspectDisciplineImport, matchesDisciplineBaseline, matchesDisciplineImport, nativeDisciplineShareUrl } from '../../src/discipline/transfer';
import { nativeContinuation, safeContinuation } from '../../src/navigation/continuation';

const row = (id: string, content: string, order: number): DisciplineResponse => ({ id, content, order, createdAt: '2026-09-01T00:00:00Z' });

describe('Discipline import/export sharing', () => {
  it('previews accepted and skipped rows while preserving duplicate content and source order', () => {
    const preview = inspectDisciplineImport(JSON.stringify({ version: '1.0', type: 'trading-disciplines', disciplines: [
      { content: '  Keep risk small. ' }, null, { content: '   ' }, { content: 'Repeat' }, { content: 'Repeat' },
    ] }));
    expect(preview.disciplines.map(item => item.content)).toEqual(['Keep risk small.', 'Repeat', 'Repeat']);
    expect(preview.count).toBe(3);
    expect(preview.skipped).toBe(2);
    expect(() => inspectDisciplineImport(JSON.stringify({ version: '1.0', type: 'trading-disciplines', disciplines: [{ content: 'x'.repeat(256) }] }))).toThrow();
  });

  it('reconciles append and replacement only when the exact target state is visible', () => {
    const before = [row('10', 'Existing', 4)];
    expect(matchesDisciplineBaseline(before, before)).toBe(true);
    expect(matchesDisciplineImport([before[0]!, row('11', 'New', 5)], before, ['New'], false)).toBe(true);
    expect(matchesDisciplineImport([row('12', 'New', 0)], before, ['New'], true)).toBe(true);
    expect(matchesDisciplineImport([before[0]!, row('11', 'New', 5), row('12', 'New', 6)], before, ['New'], false)).toBe(false);
    expect(matchesDisciplineBaseline([row('10', 'Changed', 4)], before)).toBe(false);
  });

  it('validates native public-link routes before preserving them through login', () => {
    const data = createDisciplineShare([{ content: '規則: 停止加碼', order: 0 }], { title: 'Rules' }, '2026-09-26T00:00:00Z');
    const encoded = encodeDisciplineShare(data);
    const path = `/discipline/share?import=${encodeURIComponent(encoded)}`;
    expect(nativeDisciplineShareUrl(encoded)).toBe(`diaryapp://discipline/share?import=${encodeURIComponent(encoded)}`);
    expect(safeContinuation(path)).toBe(path);
    expect(nativeContinuation(nativeDisciplineShareUrl(encoded))).toBe(path);
    expect(safeContinuation(`${path}&replaceExisting=true`)).toBeNull();
    expect(safeContinuation('/discipline/share?import=not-a-share')).toBeNull();
  });
});
