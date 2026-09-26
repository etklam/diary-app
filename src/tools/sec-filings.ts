import { apiErrorResponseSchema } from '@diary/contracts';
import { secCompanySearchQuerySchema, secFilingListQuerySchema } from '@diary/contracts/sec-filings';

export function normalizeSecCompanyQuery(value: string): string | null {
  const trimmed = value.trim().normalize('NFKC');
  if (!secCompanySearchQuerySchema.safeParse({ q: trimmed }).success) return null;
  if (/^\d{1,10}$/.test(trimmed)) return trimmed.padStart(10, '0');
  if (/^[a-z0-9.-]{1,20}$/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed;
}

export function canonicalSecCik(value: string): string | null {
  const trimmed = value.trim();
  return /^\d{1,10}$/.test(trimmed) ? trimmed.padStart(10, '0') : null;
}

export function canonicalSecAccession(value: string): string | null {
  const trimmed = value.trim();
  return /^\d{10}-\d{2}-\d{6}$/.test(trimmed) ? trimmed : null;
}

export function validateSecFilingFilters(input: {
  forms: readonly string[]; filedFrom: string; filedTo: string; periodFrom: string; periodTo: string; amendments: 'include' | 'exclude' | 'only';
}): string | null {
  const result = secFilingListQuerySchema.safeParse({
    forms: input.forms.join(','),
    filedFrom: input.filedFrom || undefined,
    filedTo: input.filedTo || undefined,
    periodFrom: input.periodFrom || undefined,
    periodTo: input.periodTo || undefined,
    amendments: input.amendments,
    limit: 50,
  });
  return result.success ? null : result.error.issues[0]?.message ?? 'Invalid filing filters';
}

export function originalSecDocumentUrl(cik: string, accession: string, basename: string): string | null {
  const canonicalCik = canonicalSecCik(cik);
  const canonicalAccession = canonicalSecAccession(accession);
  const safeBasename = basename.length <= 255 && /^[\x20-\x7E]+$/.test(basename)
    && basename !== '.' && basename !== '..' && !/[\\/%\0]/.test(basename);
  if (!canonicalCik || !canonicalAccession || !safeBasename) return null;
  const archiveCik = String(Number(canonicalCik));
  return `https://www.sec.gov/Archives/edgar/data/${archiveCik}/${canonicalAccession.replaceAll('-', '')}/${encodeURIComponent(basename)}`;
}

export function secErrorCode(error: unknown): string | undefined {
  const parsed = apiErrorResponseSchema.safeParse(error);
  return parsed.success ? parsed.data.data.code : undefined;
}

export function secErrorCopy(code?: string) {
  switch (code) {
    case 'SEC_CONFIG_MISSING': return 'SEC provider is not configured on this server.';
    case 'SEC_COMPANY_NOT_FOUND': return 'No SEC company matched this search.';
    case 'SEC_FILING_NOT_FOUND': return 'This SEC filing is no longer available.';
    case 'SEC_DOCUMENT_NOT_FOUND': return 'This SEC document is no longer available.';
    case 'SEC_UPSTREAM_RATE_LIMITED': return 'The SEC is limiting requests. Wait and retry.';
    case 'SEC_RATE_LIMITED': return 'Too many SEC requests. Wait before retrying.';
    case 'SEC_UPSTREAM_UNAVAILABLE': return 'SEC data is temporarily unavailable. Retry later.';
    case 'SEC_UPSTREAM_INVALID_RESPONSE': return 'The SEC returned data that could not be read.';
    case 'SEC_UNSAFE_REDIRECT': return 'The SEC document link did not pass the safety check.';
    case 'SEC_FILE_TOO_LARGE': return 'This SEC document exceeds the permitted size.';
    case 'SEC_PACKAGE_LIMIT_EXCEEDED': return 'The SEC download exceeds the permitted package size.';
    case 'SEC_QUEUE_FULL': return 'The SEC request queue is busy. Retry later.';
    case 'SEC_VALIDATION_ERROR': return 'Check the company identifier and filing filters.';
    default: return 'SEC filings are temporarily unavailable. Retry later.';
  }
}
