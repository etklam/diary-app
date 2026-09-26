import { describe, expect, it, vi } from 'vitest';
import type { PartnerLinkResponse } from '@diary/contracts/partners';
import { createPartnerManager } from '../../src/partners/manager';
import { partnerService, PartnerFailure, type PartnerService } from '../../src/partners/service';

const link: PartnerLinkResponse = {
  id: '10', acceptedAt: '2026-09-01T00:00:00Z', createdAt: '2026-08-31T00:00:00Z',
  partner: { id: '11', email: 'partner@example.test', name: 'Partner' }, status: 'connected',
  selfSharesDiaries: false, partnerSharesDiaries: true, selfSharesStockNotes: false, partnerSharesStockNotes: false,
  pendingIncoming: false, pendingOutgoing: false, initiatedByCurrentUser: true,
};
const ok = (data: unknown) => ({ response: new Response(null, { status: 200 }), data });
function fakeService(overrides: Partial<PartnerService> = {}) {
  return {
    read: vi.fn(async () => ({ links: [link] })),
    invite: vi.fn(async () => ({ ...link, id: '12', status: 'pending_outgoing' as const, acceptedAt: null, pendingIncoming: false, pendingOutgoing: true })),
    accept: vi.fn(async () => ({ ...link, status: 'connected' as const })),
    updateSharing: vi.fn(async () => ({ ...link, selfSharesDiaries: true })),
    remove: vi.fn(async () => ({ success: true as const })),
    ...overrides,
  } as PartnerService;
}

describe('partner relationship service and manager', () => {
  it('normalizes invite identity and marks relationship mutations as no-retry writes', async () => {
    const post = vi.fn(async (_path: string, _options: unknown) => ok({ link: { ...link, id: '12', partner: { ...link.partner, email: 'target@example.test' }, status: 'pending_outgoing', acceptedAt: null, pendingIncoming: false, pendingOutgoing: true, initiatedByCurrentUser: true } }));
    const api = { POST: post } as never;
    const service = partnerService(api, { isCurrent: () => true } as never);
    await service.invite(' Target@Example.Test ');
    expect(post.mock.calls[0]?.[1]).toMatchObject({ body: { partnerEmail: 'target@example.test' }, headers: { 'x-diary-no-automatic-session-retry': '1' } });
  });

  it('keeps diary and note sharing as independent owner-controlled flags', async () => {
    const updateSharing = vi.fn(async (_id: string, input: unknown) => ({ ...link, selfSharesStockNotes: true, ...input as object }));
    const manager = createPartnerManager(fakeService({ updateSharing }), () => true);
    await manager.refresh();
    expect(await manager.setSharing('10', 'shareStockNotes', true)).toBe(true);
    expect(updateSharing).toHaveBeenCalledWith('10', { shareStockNotes: true });
    expect(manager.getSnapshot().links?.[0]).toMatchObject({ selfSharesDiaries: false, selfSharesStockNotes: false });
    manager.dispose();
  });

  it('locks all changes after an uncertain toggle until an explicit permission refresh', async () => {
    const updateSharing = vi.fn().mockRejectedValueOnce(new PartnerFailure('uncertain')).mockResolvedValue({ ...link, selfSharesDiaries: true });
    const service = fakeService({ updateSharing });
    const manager = createPartnerManager(service, () => true);
    await manager.refresh();
    expect(await manager.setSharing('10', 'shareDiaries', true)).toBe(false);
    expect(manager.getSnapshot().mutationUncertain).toBe(true);
    expect(await manager.setSharing('10', 'shareStockNotes', true)).toBe(false);
    expect(updateSharing).toHaveBeenCalledTimes(1);
    await manager.refresh(false);
    expect(manager.getSnapshot().mutationUncertain).toBe(true);
    await manager.refresh();
    expect(manager.getSnapshot().mutationUncertain).toBe(false);
    manager.dispose();
  });

  it('does not expose a late partner list response after the owner scope changes', async () => {
    let resolve!: (value: { links: PartnerLinkResponse[] }) => void;
    const read = vi.fn(() => new Promise<{ links: PartnerLinkResponse[] }>(done => { resolve = done; }));
    let active = true;
    const manager = createPartnerManager(fakeService({ read }), () => active);
    const loading = manager.refresh();
    active = false;
    resolve({ links: [link] });
    await loading;
    expect(manager.getSnapshot().links).toBeNull();
    manager.dispose();
  });

  it('can reload after a development effect cleanup', async () => {
    const manager = createPartnerManager(fakeService(), () => true);
    await manager.refresh();
    manager.dispose();
    manager.subscribe(() => {});
    await manager.refresh();
    expect(manager.getSnapshot().links).toEqual([link]);
    manager.dispose();
  });
});
