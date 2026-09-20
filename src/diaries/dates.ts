// Diary dates are calendar labels, not instants. Never pass them through Date.
export function civilDate(value: string): string { return value; }

export function instantDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month');
  const [year, number] = month.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][number - 1];
  return { dateFrom: `${month}-01`, dateTo: `${month}-${days}`, days };
}
export function shiftMonth(month: string, delta: number) {
  monthRange(month);
  const [year, number] = month.split('-').map(Number);
  const index = year * 12 + number - 1 + delta;
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
}
// Gregorian weekday arithmetic on civil fields; no timezone conversion.
export function firstWeekday(month: string) {
  let [year, number] = month.split('-').map(Number);
  if (number < 3) year--;
  return (year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400)
    + [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4][number - 1] + 1) % 7;
}
