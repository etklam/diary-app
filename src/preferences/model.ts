import { userSettingsSchema, updateUserSettingsSchema } from '@diary/contracts/settings';
import { ZodError } from 'zod';
export type Settings = ReturnType<typeof userSettingsSchema.parse>;
export type Locale = Settings['locale'];
export type Theme = 'system' | 'light' | 'dark';
export function settingsInput(settings: Settings) {
  return { ...settings, name: settings.name ?? '', expectedMonthlyTrades: String(settings.expectedMonthlyTrades) };
}
export type SettingsInput = ReturnType<typeof settingsInput>;
export function validateSettings(input: SettingsInput) {
  // A blank numeric field is not a request to replace the value with zero.
  if (!/^\d+$/.test(input.expectedMonthlyTrades.trim())) throw new ZodError([{ code: 'custom', path: ['expectedMonthlyTrades'], message: 'Enter a whole number' }]);
  return updateUserSettingsSchema.parse(input);
}
export function createSettingsEditor(service: { read(): Promise<Settings>; save(input: unknown): Promise<Settings> }) {
  let revision = 0;
  let disposed = false;
  let state: { input: SettingsInput | null; dirty: boolean; busy: boolean; error: unknown; saved: boolean } = { input: null, dirty: false, busy: false, error: null, saved: false };
  const listeners = new Set<() => void>();
  const update = (next: Partial<typeof state>) => { if (disposed) return; state = { ...state, ...next }; listeners.forEach(l => l()); };
  return {
    getSnapshot: () => state,
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
    edit(input: SettingsInput) { revision++; update({ input, dirty: true, saved: false, error: null }); },
    async load() {
      disposed = false;
      const expected = ++revision;
      update({ busy: true, error: null });
      try { const settings = await service.read(); if (revision === expected && !state.dirty) update({ input: settingsInput(settings) }); }
      catch (error) { update({ error }); }
      finally { update({ busy: false }); }
    },
    async save() {
      if (!state.input || state.busy) return null;
      let input;
      try { input = validateSettings(state.input); } catch (error) { update({ error }); return null; }
      const expected = revision;
      update({ busy: true, error: null, saved: false });
      try {
        const settings = await service.save(input);
        if (!disposed && revision === expected) update({ input: settingsInput(settings), dirty: false, saved: true });
        return disposed ? null : settings;
      } catch (error) { update({ error }); return null; }
      finally { update({ busy: false }); }
    },
    dispose() { disposed = true; revision++; listeners.clear(); },
  };
}
