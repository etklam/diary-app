import { afterEach, describe, expect, it, vi } from 'vitest';
import { diagnosticSummary, reportMetadata, safeFailure } from '../../src/beta/diagnostics';
import { createIntroduction, workflow } from '../../src/beta/onboarding';
import { createReport } from '../../src/beta/report';
import { createApiClient } from '@diary/api-client';
import { createQuickApi } from '../../src/quick/api';
import { deferred } from './fixtures';

const native = vi.hoisted(() => ({ application: { nativeApplicationVersion: '1.4.2', nativeBuildVersion: '27' } as object | null }));
vi.mock('expo', () => ({ requireOptionalNativeModule: () => native.application }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '99.0.0', extra: { buildVariant: 'preview' } } } }));
vi.mock('react-native', () => ({ Platform: { OS: 'android', Version: 36 } }));
vi.mock('expo-device', () => ({ osVersion: '16' }));
afterEach(() => { reportMetadata.clear(); native.application = { nativeApplicationVersion: '1.4.2', nativeBuildVersion: '27' }; });

describe('privacy-safe beta help', () => {
  it('includes only allowlisted metadata and rejects private strings even in allowed keys', () => {
    const privateText = 'private diary email@example.com bearer token search symbol';
    const summary = diagnosticSummary({ version: privateText, build: privateText, screen: privateText,
      osVersion: privateText, platform: privateText, environment: privateText, code: privateText, requestId: '9223372036854775806',
      diary: privateText, password: privateText, title: privateText, accountId: '123' } as never);
    expect(summary).not.toContain(privateText); expect(summary).not.toContain('9223372036854775806');
    expect(summary).not.toContain('123'); expect(summary).toContain('Screen: help');
    expect(safeFailure({ code: 'UNKNOWN_WRITE', requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })).toEqual({ code: 'UNKNOWN_WRITE', requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
  });
  it('uses actual native installed version and build, not JS manifest identity', async () => {
    const { installedInfo, currentDiagnostic, supportConfig } = await import('../../src/beta/runtime');
    expect(installedInfo()).toMatchObject({ version: '1.4.2', build: '27', environment: 'preview', osVersion: '16' });
    expect(currentDiagnostic('account')).toContain('Build: 27');
    expect(currentDiagnostic('account')).not.toContain('99.0.0');
    native.application = null;
    expect(currentDiagnostic('account')).toContain('Version: unavailable');
    expect(supportConfig()).toEqual({ url: null, notice: null });
  });
  it('retains no response bodies and clears correlation metadata on epoch invalidation', () => {
    reportMetadata.set('quick', { code: 'UNKNOWN_WRITE', requestId: 'bad-private-value' });
    expect(reportMetadata.get('quick')).toEqual({ code: 'UNKNOWN_WRITE', requestId: 'unavailable' });
    reportMetadata.clear(); expect(reportMetadata.get('quick')).toBeUndefined();
  });
  it('captures only validated API error metadata and clears it before a later failed write', async () => {
    const transport = vi.fn(async () => Response.json({ statusCode: 401, statusMessage: 'private response text',
      data: { code: 'AUTH_UNAUTHORIZED', details: [{ value: 'private diary content' }], requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } }, { status: 401 }));
    const api = createQuickApi(createApiClient({ baseUrl: 'https://synthetic.example.test', fetch: transport }),
      { ownerId: '1', isCurrent: () => true, changed: vi.fn() }, {} as never);
    const payload = { date: '2026-09-21', content: 'private diary content' } as never;
    expect(await api.write(payload)).toMatchObject({ ok: false, status: 401 });
    expect(reportMetadata.get('quick')).toEqual({ code: 'AUTH_UNAUTHORIZED', requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
    transport.mockRejectedValueOnce(Error('private network exception'));
    await expect(api.write(payload)).rejects.toThrow(); expect(reportMetadata.get('quick')).toBeUndefined();
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('rejects old-owner error responses before they can replace another owner’s support state', async () => {
    const response = deferred<Response>(); let current = true;
    const api = createQuickApi(createApiClient({ baseUrl: 'https://synthetic.example.test', fetch: () => response.promise }),
      { ownerId: '1', isCurrent: () => current, changed: vi.fn() }, {} as never);
    const pending = api.write({ date: '2026-09-21', content: 'synthetic' } as never);
    current = false; reportMetadata.clear(); reportMetadata.set('quick', { code: 'UNKNOWN_WRITE' });
    response.resolve(Response.json({ statusCode: 401, statusMessage: 'private', data: { code: 'AUTH_UNAUTHORIZED', details: null,
      requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } }, { status: 401 }));
    await expect(pending).rejects.toThrow(); expect(reportMetadata.get('quick')?.code).toBe('UNKNOWN_WRITE');
  });
  it('does not share before explicit inspection or mutate anything on support/recovery', async () => {
    const share = vi.fn(async () => {}); const support = vi.fn(async () => {});
    const report = createReport({ screen: 'review-editor', code: 'UNKNOWN_WRITE', title: 'private' } as never, { share, support });
    await report.share(); expect(share).not.toHaveBeenCalled(); expect(support).not.toHaveBeenCalled();
    const summary = report.inspect(); expect(summary).not.toContain('private'); expect(share).not.toHaveBeenCalled();
    await report.share(); expect(share).toHaveBeenCalledExactlyOnceWith(summary);
    await report.support(); expect(support).toHaveBeenCalledTimes(1);
    expect(Object.keys(report).sort()).toEqual(['inspect', 'share', 'support']);
  });
  it('leaves the inspected report available after external sharing fails', async () => {
    const report = createReport({ screen: 'quick', code: 'UNKNOWN_WRITE' }, { share: async () => { throw Error('offline'); }, support: async () => {} });
    const summary = report.inspect(); await expect(report.share()).rejects.toThrow('offline'); expect(report.inspect()).toBe(summary);
  });
});
describe('first-use introduction lifecycle', () => {
  it('shows once, dismisses without touching drafts, and can reopen from help', async () => {
    let saved: string | null = null;
    const storage = { get: async () => saved, set: vi.fn(async value => { saved = value; }) };
    const introduction = createIntroduction(storage); const listener = vi.fn(); introduction.subscribe(listener);
    await introduction.start(); expect(introduction.getSnapshot()).toBe(true);
    await introduction.dismiss(); expect(introduction.getSnapshot()).toBe(false); expect(storage.set).toHaveBeenCalledExactlyOnceWith('seen');
    const reopened = createIntroduction(storage); await reopened.start(); expect(reopened.getSnapshot()).toBe(false);
    reopened.show(); expect(reopened.getSnapshot()).toBe(true); expect(listener).toHaveBeenCalledTimes(2);
    expect(workflow.join(' ')).toContain('不代表伺服器已儲存');
  });
  it('preference failures remain dismissible and never prevent access or delete writing', async () => {
    const introduction = createIntroduction({ get: async () => { throw Error('storage'); }, set: async () => { throw Error('storage'); } });
    await introduction.start(); expect(introduction.getSnapshot()).toBe(true);
    await introduction.dismiss(); expect(introduction.getSnapshot()).toBe(false);
  });
});
