import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

function update(contents: string) {
  const module = { exports: undefined as unknown as (config: object) => { modResults: { contents: string } } };
  runInNewContext(readFileSync('plugins/with-single-attempt-writes.cjs', 'utf8'), {
    module,
    require: () => ({ withMainApplication: (config: object, apply: (config: object) => object) => apply(config) }),
  });
  return module.exports({ modResults: { language: 'kt', contents } }).modResults.contents;
}
describe('native single-attempt plugin upgrades', () => {
  it('updates an existing generated block idempotently and preserves surrounding native setup', () => {
    const fresh = update('before\n    super.onCreate()\n    after');
    const legacy = fresh.replace('      val diaryConnections = okhttp3.ConnectionPool()\n', '').replace('        .connectionPool(diaryConnections)\n', '').replace(/            \/\/ A one-shot[\s\S]*?diaryConnections.evictAll\(\)\n/, '');
    expect(update(legacy)).toBe(fresh);
    expect(update(fresh)).toBe(fresh);
    expect(fresh).toContain('override fun isOneShot() = true');
    expect(fresh).toMatch(/before[\s\S]+after$/);
  });
  it('fails closed on an unrecognized existing transport block', () => {
    expect(() => update('super.onCreate()\n// diary-single-attempt-writes\ncustomSetup()')).toThrow('Cannot safely update');
  });
});
