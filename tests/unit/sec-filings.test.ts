import { describe, expect, it } from 'vitest';
import { canonicalSecAccession, canonicalSecCik, normalizeSecCompanyQuery, originalSecDocumentUrl, secErrorCode, secErrorCopy, validateSecFilingFilters } from '../../src/tools/sec-filings';
import { nativeContinuation, safeContinuation } from '../../src/navigation/continuation';

describe('SEC filing identifiers and client routes', () => {
  it('normalizes CIK and ticker inputs and rejects malformed route identifiers', () => {
    expect(normalizeSecCompanyQuery(' 1 ')).toBe('0000000001');
    expect(normalizeSecCompanyQuery(' syn ')).toBe('SYN');
    expect(normalizeSecCompanyQuery('  Apple Inc.  ')).toBe('Apple Inc.');
    expect(canonicalSecCik('1')).toBe('0000000001');
    expect(canonicalSecCik('12345678901')).toBeNull();
    expect(canonicalSecAccession('0000000001-24-000001')).toBe('0000000001-24-000001');
    expect(canonicalSecAccession('1-24-1')).toBeNull();
  });

  it('builds original links only for canonical SEC filing paths and safe basenames', () => {
    expect(originalSecDocumentUrl('1', '0000000001-24-000001', 'annual report.htm')).toBe('https://www.sec.gov/Archives/edgar/data/1/000000000124000001/annual%20report.htm');
    expect(originalSecDocumentUrl('1', '0000000001-24-000001', '../outside.txt')).toBeNull();
    expect(originalSecDocumentUrl('1', '0000000001-24-000001', 'a/b.txt')).toBeNull();
  });

  it('validates date bounds and maps provider failure states', () => {
    expect(validateSecFilingFilters({ forms: ['10-K'], filedFrom: '2024-01-01', filedTo: '2024-12-31', periodFrom: '', periodTo: '', amendments: 'include' })).toBeNull();
    expect(validateSecFilingFilters({ forms: [], filedFrom: '2024-12-31', filedTo: '2024-01-01', periodFrom: '', periodTo: '', amendments: 'include' })).not.toBeNull();
    expect(secErrorCopy('SEC_UPSTREAM_RATE_LIMITED')).toMatch(/limiting requests/i);
    expect(secErrorCopy('SEC_CONFIG_MISSING')).toMatch(/not configured/i);
    expect(secErrorCode({ statusCode: 503, statusMessage: 'Unavailable', data: { code: 'SEC_UPSTREAM_UNAVAILABLE', details: null, requestId: 'test' } })).toBe('SEC_UPSTREAM_UNAVAILABLE');
  });

  it('preserves canonical company and filing identifiers in native routes', () => {
    const path = '/tools/sec-filings/0000000001/0000000001-24-000001';
    expect(safeContinuation('/tools/sec-filings/1/0000000001-24-000001')).toBe(path);
    expect(nativeContinuation(`diaryapp://tools${path.slice('/tools'.length)}`)).toBe(path);
    expect(safeContinuation('/tools/sec-filings/1/invalid')).toBeNull();
    expect(safeContinuation(`${path}?include=all`)).toBeNull();
  });
});
