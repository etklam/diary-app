import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { partnerService } from '../../src/partners/service';

const baseUrl = process.env.DIARY_API_BASE_URL;
const enabled = process.env.DIARY_DISPOSABLE_TEST_ENV === '1' && !!baseUrl;

async function createOwner(label: string) {
  const scenario = randomUUID();
  const compact = scenario.replaceAll('-', '');
  const transport: typeof fetch = (input, init) => {
    const request = new Request(input, init);
    request.headers.set('x-e2e-test-id', scenario);
    request.headers.set('x-forwarded-for', `fd00:${compact.slice(0, 4)}:${compact.slice(4, 8)}:${compact.slice(8, 12)}::1`);
    return fetch(request);
  };
  const email = `partners-${label}-${scenario}@example.test`;
  const credentials = { email, password: 'SyntheticPartners2026' };
  const registered = await transport(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
  });
  expect(registered.status).toBe(200);

  let stored: Awaited<ReturnType<ReturnType<typeof createNativeSession>['login']>> | null = null;
  const native = createNativeSession({
    baseUrl: baseUrl!, fetch: transport,
    storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } },
  });
  await native.login(credentials);
  const api = createApiClient({ baseUrl: baseUrl!, fetch: native.fetch });
  return { email, native, service: partnerService(api, { isCurrent: () => true }) };
}

describe.runIf(enabled)('F5 disposable Partner API acceptance', () => {
  it('invites, rejects wrong-side acceptance, connects, shares independently, withdraws and unlinks', async () => {
    const owner = await createOwner('owner');
    const partner = await createOwner('partner');
    const invitee = await createOwner('invitee');
    try {
      expect(await owner.service.read()).toEqual({ links: [] });
      expect(await partner.service.read()).toEqual({ links: [] });

      const pending = await owner.service.invite(partner.email.toUpperCase());
      expect(pending).toMatchObject({ status: 'pending_outgoing', pendingOutgoing: true, initiatedByCurrentUser: true });
      expect((await partner.service.read()).links[0]).toMatchObject({ id: pending.id, status: 'pending_incoming', pendingIncoming: true });
      await expect(owner.service.accept(pending.id)).rejects.toMatchObject({ kind: 'rejected' });
      const connected = await partner.service.accept(pending.id);
      expect(connected).toMatchObject({ id: pending.id, status: 'connected', initiatedByCurrentUser: false });

      await owner.service.updateSharing(pending.id, { shareDiaries: true });
      await partner.service.updateSharing(pending.id, { shareStockNotes: true });
      const ownerView = (await owner.service.read()).links[0]!;
      const partnerView = (await partner.service.read()).links[0]!;
      expect(ownerView).toMatchObject({ selfSharesDiaries: true, partnerSharesDiaries: false, selfSharesStockNotes: false, partnerSharesStockNotes: true });
      expect(partnerView).toMatchObject({ selfSharesDiaries: false, partnerSharesDiaries: true, selfSharesStockNotes: true, partnerSharesStockNotes: false });

      const outgoing = await owner.service.invite(invitee.email);
      await owner.service.remove(outgoing.id);
      expect((await owner.service.read()).links.map(link => link.id)).toEqual([pending.id]);
      expect(await invitee.service.read()).toEqual({ links: [] });

      await owner.service.remove(pending.id);
      expect(await owner.service.read()).toEqual({ links: [] });
      expect(await partner.service.read()).toEqual({ links: [] });
    } finally {
      await owner.native.logout().catch(() => {});
      await partner.native.logout().catch(() => {});
      await invitee.native.logout().catch(() => {});
    }
  });
});
