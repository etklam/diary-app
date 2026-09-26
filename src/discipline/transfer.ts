import { decodeDisciplineShare, parseDisciplineShare } from '@diary/contracts/discipline-share';
import type { DisciplineResponse } from '@diary/contracts/discipline';

export const MAX_DISCIPLINE_SHARE_JSON_BYTES = 1_048_576;
export const MAX_DISCIPLINE_SHARE_LINK_LENGTH = 131_072;

export type DisciplineImportPreview = ReturnType<typeof parseDisciplineShare> & { skipped: number };

export function inspectDisciplineImport(json: string): DisciplineImportPreview {
  if (new TextEncoder().encode(json).length > MAX_DISCIPLINE_SHARE_JSON_BYTES) throw new Error('Discipline share file is too large');
  const raw: unknown = JSON.parse(json);
  if (!raw || typeof raw !== 'object' || !('disciplines' in raw) || !Array.isArray(raw.disciplines)) throw new Error('Invalid discipline share data');
  const parsed = parseDisciplineShare(json);
  return { ...parsed, skipped: raw.disciplines.length - parsed.count };
}

export function nativeDisciplineShareUrl(encoded: string, scheme = 'diaryapp') {
  if (encoded.length > MAX_DISCIPLINE_SHARE_LINK_LENGTH) throw new Error('Discipline share link is too large');
  const json = decodeDisciplineShare(encoded);
  if (new TextEncoder().encode(json).length > MAX_DISCIPLINE_SHARE_JSON_BYTES) throw new Error('Discipline share link is too large');
  return `${scheme}://discipline/share?import=${encodeURIComponent(encoded)}`;
}

export function canonicalDisciplineShareContinuation(value: string): string | null {
  if (value.length > MAX_DISCIPLINE_SHARE_LINK_LENGTH || !value.startsWith('/discipline/share?import=')) return null;
  const raw = value.slice('/discipline/share?import='.length);
  if (!raw || raw.includes('&') || raw.includes('#')) return null;
  try {
    const encoded = decodeURIComponent(raw);
    decodeDisciplineShare(encoded);
    return `/discipline/share?import=${encodeURIComponent(encoded)}`;
  } catch { return null; }
}

export function matchesDisciplineImport(
  rows: readonly DisciplineResponse[],
  before: readonly Pick<DisciplineResponse, 'id' | 'content' | 'order'>[],
  expected: readonly string[],
  replacing: boolean,
): boolean {
  const beforeIds = new Set(before.map(row => row.id));
  if (replacing) return rows.length === expected.length && rows.every((row, index) => !beforeIds.has(row.id) && row.content === expected[index] && row.order === index);
  const prefixMatches = before.every((row, index) => rows[index]?.id === row.id && rows[index]?.content === row.content && rows[index]?.order === row.order);
  const suffix = rows.slice(before.length);
  const start = before.length ? Math.max(...before.map(row => row.order)) + 1 : 0;
  return prefixMatches && suffix.length === expected.length && suffix.every((row, index) => !beforeIds.has(row.id) && row.content === expected[index] && row.order === start + index);
}

export function matchesDisciplineBaseline(
  rows: readonly DisciplineResponse[],
  before: readonly Pick<DisciplineResponse, 'id' | 'content' | 'order'>[],
) {
  return rows.length === before.length && before.every((row, index) => rows[index]?.id === row.id && rows[index]?.content === row.content && rows[index]?.order === row.order);
}
