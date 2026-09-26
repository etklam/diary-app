export function localTimezone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }

function dateParts(date: Date, timeZone = localTimezone()) {
  const values: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-US', { timeZone, calendar: 'gregory', numberingSystem: 'latn',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return values;
}

function timezoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = dateParts(date, timeZone);
  const representedUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return (representedUtc - date.getTime()) / 60_000;
}

export function localTradeValue(date: Date, timeZone = localTimezone()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const parts = dateParts(date, timeZone);
  return `${String(parts.year).padStart(4, '0')}-${pad(Number(parts.month))}-${pad(Number(parts.day))}T${pad(Number(parts.hour))}:${pad(Number(parts.minute))}`;
}

/** Return every instant represented by a device-local minute (zero for a DST gap, two for a repeated minute). */
export function localTradeInstants(value: string, timeZone = localTimezone()): string[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return [];
  const [, year, month, day, hour, minute] = match;
  const base = new Date(0);
  base.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  base.setUTCHours(Number(hour), Number(minute), 0, 0);
  const naive = base.getTime();
  if (!Number.isFinite(naive) || base.toISOString().slice(0, 16) !== value) return [];
  const offsets = new Set<number>();
  for (let h = -36; h <= 36; h += 1) offsets.add(timezoneOffsetMinutes(new Date(naive + h * 3_600_000), timeZone));
  return [...offsets].map(offset => new Date(naive - offset * 60_000))
    .filter(date => localTradeValue(date, timeZone) === value).map(date => date.toISOString()).sort();
}

export type InstantEdit = { value: string; instant: string; timeZone: string };

export function instantEditFromInstant(instant: string, timeZone = localTimezone()): InstantEdit {
  const date = new Date(instant);
  return { value: Number.isFinite(date.getTime()) ? localTradeValue(date, timeZone) : '', instant, timeZone };
}

export function changeInstantLocalValue(current: InstantEdit, value: string): InstantEdit {
  return { ...current, value, instant: value === current.value ? current.instant : '' };
}

/** Preserve exact seconds/milliseconds on an untouched value; otherwise require an unambiguous local minute. */
export function resolveLocalTradeInstant(value: string, selected: string, timeZone = localTimezone()): string | undefined {
  if (selected) {
    const date = new Date(selected);
    if (Number.isFinite(date.getTime()) && localTradeValue(date, timeZone) === value) return date.toISOString();
  }
  const choices = localTradeInstants(value, timeZone);
  return choices.length === 1 ? choices[0] : undefined;
}

export function localTradeChoices(value: string, selected: string, timeZone = localTimezone()): string[] {
  const choices = localTradeInstants(value, timeZone);
  if (!selected) return choices;
  const date = new Date(selected);
  if (!Number.isFinite(date.getTime()) || localTradeValue(date, timeZone) !== value) return choices;
  const minute = Math.floor(date.getTime() / 60_000) * 60_000;
  return choices.map(choice => Date.parse(choice) === minute ? date.toISOString() : choice);
}
