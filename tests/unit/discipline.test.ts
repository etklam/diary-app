import { describe, expect, it, vi } from 'vitest';
import type { DisciplineResponse } from '@diary/contracts/discipline';
import { createDisciplineManager } from '../../src/discipline/manager';
import { localizeDisciplineDraw } from '../../src/discipline/fallbacks';
import { DisciplineFailure, type DisciplineService } from '../../src/discipline/service';

const row = (id: string, content: string, order: number): DisciplineResponse => ({ id, content, order, createdAt: '2026-09-01T00:00:00Z' });
function service(overrides: Partial<DisciplineService> = {}) {
  return {
    read: vi.fn(async () => []), random: vi.fn(async () => ({ content: 'User rule', isCustom: true })),
    create: vi.fn(async () => row('1', 'New rule', 0)), update: vi.fn(async () => row('1', 'Changed rule', 0)),
    remove: vi.fn(async () => ({ success: true as const })), reorder: vi.fn(async () => []), ...overrides,
  } as DisciplineService;
}

describe('trading principles manager', () => {
  it('labels and localizes only the known source fallback quotes', () => {
    const fallback = { content: '明天見', isCustom: false };
    expect(localizeDisciplineDraw(fallback, 'en')).toBe('See you tomorrow.');
    expect(localizeDisciplineDraw(fallback, 'zh-TW')).toBe('明天見');
    expect(localizeDisciplineDraw({ content: '明天見', isCustom: true }, 'en')).toBe('明天見');
    expect(localizeDisciplineDraw({ content: 'New user content', isCustom: false }, 'en')).toBe('New user content');
  });

  it('reconciles a lost create response from the owner list and never repeats the POST', async () => {
    const created = row('10', 'Keep risk small.', 0);
    const read = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([created]);
    const create = vi.fn().mockRejectedValue(new DisciplineFailure('uncertain'));
    const api = service({ read, create });
    const manager = createDisciplineManager(api, () => true);
    await manager.refresh();

    expect(await manager.save(created.content)).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(manager.getSnapshot()).toMatchObject({ rows: [created], saved: true, mutationUncertain: false });
    manager.dispose();
  });

  it('keeps uncertain creates locked until an explicit list refresh settles the state', async () => {
    const read = vi.fn().mockResolvedValue([]);
    const create = vi.fn().mockRejectedValue(new DisciplineFailure('uncertain'));
    const api = service({ read, create });
    const manager = createDisciplineManager(api, () => true);
    await manager.refresh();

    expect(await manager.save('Unconfirmed rule')).toBe(false);
    expect(manager.getSnapshot().mutationUncertain).toBe(true);
    expect(await manager.save('Unconfirmed rule')).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
    await manager.refresh();
    expect(manager.getSnapshot().mutationUncertain).toBe(false);
    manager.dispose();
  });

  it('waits for the reorder response and publishes the server ordered result', async () => {
    const before = [row('1', 'First', 0), row('2', 'Second', 1)];
    const after = [row('2', 'Second', 0), row('1', 'First', 1)];
    let resolve!: (rows: DisciplineResponse[]) => void;
    const reorder = vi.fn(() => new Promise<DisciplineResponse[]>(done => { resolve = done; }));
    const read = vi.fn().mockResolvedValueOnce(before).mockResolvedValue(after);
    const manager = createDisciplineManager(service({ read, reorder }), () => true);
    await manager.refresh();
    const moving = manager.move('2', -1);
    expect(manager.getSnapshot().rows?.map(item => item.id)).toEqual(['1', '2']);
    resolve(after);
    expect(await moving).toBe(true);
    expect(manager.getSnapshot().rows?.map(item => item.id)).toEqual(['2', '1']);
    manager.dispose();
  });

  it('does not display a late collection read after the owner capability expires', async () => {
    let resolve!: (rows: DisciplineResponse[]) => void;
    const read = vi.fn(() => new Promise<DisciplineResponse[]>(done => { resolve = done; }));
    let active = true;
    const manager = createDisciplineManager(service({ read }), () => active);
    const loading = manager.refresh();
    active = false;
    resolve([row('99', 'Another owner', 0)]);
    await loading;
    expect(manager.getSnapshot().rows).toBeNull();
    manager.dispose();
  });

  it('can reload after a development effect cleanup', async () => {
    const manager = createDisciplineManager(service(), () => true);
    await manager.refresh();
    manager.dispose();
    manager.subscribe(() => {});
    await manager.refresh();
    expect(manager.getSnapshot().rows).toEqual([]);
    manager.dispose();
  });
});
