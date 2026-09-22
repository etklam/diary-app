import { describe, expect, it, vi } from 'vitest';
import { createApiClient, NO_AUTOMATIC_SESSION_RETRY_HEADER } from '@diary/api-client';
import { registerRequestSchema, changePasswordRequestSchema } from '@diary/contracts';
import { accountService, registerAccount } from '../../src/account/service';
import { createSettingsEditor, settingsInput, validateSettings, type Settings } from '../../src/preferences/model';
import { safeContinuation, workspacePath } from '../../src/navigation/continuation';
import { parseMarkdown, markdownTarget } from '../../src/markdown/model';
import { deferred } from './fixtures';
import { redirectSystemPath } from '../../src/app/+native-intent';

const settings: Settings = { name: null, timezone: 'Pacific/Kiritimati', locale: 'en', defaultWorkspacePage: 'calendar', expectedMonthlyTrades: 0, expectedProfit: '9999999999999.99', expectedAvgHolding: '0.00', excludeHolidaysInStats: true };
describe('account foundation', () => {
  it('carries only allowed cold native context through the root authentication gate', () => {
    expect(redirectSystemPath({ path: 'diaryapp:///diaries/quick?date=2024-03-02', initial: true })).toBe('/?returnTo=%2Fdiaries%2Fquick%3Fdate%3D2024-03-02');
    expect(redirectSystemPath({ path: 'tradebasicbeta://diaries/review?id=42', initial: true })).toBe('/?returnTo=%2Fdiaries%2Freview%3Fid%3D42');
    for (const path of ['https://evil.test/diaries/1', 'diaryapp:///diaries/quick?save=1', 'diaryapp:///diaries/0', 'diaryapp:///security#submit']) expect(redirectSystemPath({ path, initial: true })).toBe(path);
    expect(redirectSystemPath({ path: '/security', initial: false })).toBe('/security');
  });
  it('accepts only bounded implemented continuations, never mutation/context injection', () => {
    for (const unsafe of ['https://evil.test', '//evil.test', '/diaries/0', '/diaries/9223372036854775808', '/diaries/quick?save=1', '/diaries/quick?date=2025-02-29', '/security#submit', ['/timeline']]) expect(safeContinuation(unsafe)).toBeNull();
    expect(safeContinuation('/diaries/quick?date=2024-02-29')).toBe('/diaries/quick?date=2024-02-29');
    expect(safeContinuation('/diaries/9223372036854775807')).not.toBeNull();
    expect(safeContinuation('/diaries/review?id=42')).toBe('/diaries/review?id=42');
    expect(safeContinuation('/diaries/review?id=42&save=1')).toBeNull();
    expect(workspacePath('diaries')).toBe('/library'); expect(workspacePath('calendar')).toBe('/calendar');
  });
  it('uses canonical UTF-8 password bounds and keeps exact decimal/zero preferences', () => {
    expect(registerRequestSchema.safeParse({ email: 'a@example.test', password: '密'.repeat(25) }).success).toBe(false);
    expect(changePasswordRequestSchema.safeParse({ currentPassword: 'old', newPassword: '密'.repeat(24) }).success).toBe(true);
    expect(validateSettings(settingsInput(settings))).toMatchObject({ expectedMonthlyTrades: 0, expectedProfit: '9999999999999.99', expectedAvgHolding: '0.00' });
    expect(() => validateSettings({ ...settingsInput(settings), expectedMonthlyTrades: '' })).toThrow();
    expect(() => validateSettings({ ...settingsInput(settings), timezone: 'Mars/Base' })).toThrow();
  });
  it('does not overwrite edited fields with a late refresh or late save response', async () => {
    const read = deferred<Settings>(); const save = deferred<Settings>();
    const model = createSettingsEditor({ read: () => read.promise, save: () => save.promise });
    const pending = model.load(); model.edit({ ...settingsInput(settings), name: 'My unsaved edit' }); read.resolve(settings); await pending;
    expect(model.getSnapshot().input?.name).toBe('My unsaved edit');
    const saving = model.save(); model.edit({ ...settingsInput(settings), name: 'Newer edit' }); save.resolve(settings); await saving;
    expect(model.getSnapshot()).toMatchObject({ dirty: true, input: { name: 'Newer edit' } });
  });
  it('ignores a disposed owner editor response', async () => {
    const response = deferred<Settings>(); const model = createSettingsEditor({ read: () => response.promise, save: vi.fn() });
    const loading = model.load(); model.dispose(); response.resolve(settings); await loading; expect(model.getSnapshot().input).toBeNull();
  });
  it('guards account writes by owner epoch and forbids automatic session replay', async () => {
    let current = true; const pending = deferred<Response>();
    const transport = vi.fn(async (input: RequestInfo | URL) => { const request = input as Request; expect(request.headers.get(NO_AUTOMATIC_SESSION_RETRY_HEADER)).toBe('1'); return pending.promise; });
    const api = createApiClient({ baseUrl: 'http://localhost', fetch: transport }); const service = accountService(api, { isCurrent: () => current });
    const saving = service.save(settings); current = false; pending.resolve(Response.json({ success: true, settings }));
    await expect(saving).rejects.toMatchObject({ kind: 'stale' });
    await expect(service.logoutAll()).rejects.toMatchObject({ kind: 'stale' }); expect(transport).toHaveBeenCalledTimes(1);
  });
  it('reports uncertain registration/security outcomes without retrying', async () => {
    const transport = vi.fn(async () => { throw new TypeError('lost response'); });
    const api = createApiClient({ baseUrl: 'http://localhost', fetch: transport });
    await expect(registerAccount(api, { email: 'a@example.test', password: 'synthetic-password' })).rejects.toMatchObject({ kind: 'uncertain' });
    await expect(accountService(api, { isCurrent: () => true }).logoutAll()).rejects.toMatchObject({ kind: 'uncertain' });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('does not classify a mismatched HTTP/error envelope as a confirmed rejection', async () => {
    const transport = vi.fn(async () => Response.json({ statusCode: 401, statusMessage: 'Synthetic', data: { code: 'AUTH_UNAUTHORIZED', details: null, requestId: 'synthetic' } }, { status: 409 }));
    const api = createApiClient({ baseUrl: 'http://localhost', fetch: transport });
    await expect(accountService(api, { isCurrent: () => true }).logoutAll()).rejects.toMatchObject({ kind: 'uncertain' });
    expect(transport).toHaveBeenCalledOnce();
  });
});
describe('safe native Markdown', () => {
  it('parses GFM without mutating source and retains HTML as inert nodes', () => {
    const text = '# Heading\n\n- [x] Done\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nalert(1)\n```\n\n<script>alert(1)</script>';
    const tree = parseMarkdown(text); expect(tree.children.map(n => n.type)).toEqual(['heading', 'list', 'table', 'code', 'html']);
    expect(tree.children.at(-1)).toMatchObject({ type: 'html', value: '<script>alert(1)</script>' }); expect(text).toContain('- [x] Done');
  });
  it('denies executable, credentialed, protocol-relative and local-file URLs', () => {
    for (const url of ['javascript:alert(1)', 'data:image/svg+xml,xxx', 'file:///secret', '//evil.test', 'https://user:secret@example.test', 'https://example.test\\evil', 'https://example.test/\n']) expect(markdownTarget(url)).toBeNull();
    expect(markdownTarget('/diaries/1')).toEqual({ kind: 'internal', url: '/diaries/1' });
    expect(markdownTarget('/diaries/1', true)).toBeNull();
    expect(markdownTarget('https://example.test/image.png', true)?.kind).toBe('external');
  });
});
