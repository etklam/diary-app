import type { MarketHistorical } from '@diary/contracts/market';

function evenlySample<T>(rows: readonly T[], maxItems: number): T[] {
  if (!Number.isSafeInteger(maxItems) || maxItems < 1) throw new RangeError('Sample size must be a positive integer.');
  if (rows.length <= maxItems) return [...rows];
  if (maxItems === 1) return [rows[rows.length - 1]!];
  return Array.from({ length: maxItems }, (_, index) => rows[Math.round(index * (rows.length - 1) / (maxItems - 1))]!);
}

/** Bounds native drawing work even for all-history responses. */
export function chartRows(rows: MarketHistorical): MarketHistorical {
  return evenlySample(rows, 64);
}

/** A small, read-aloud sample complements the chart's min/max/first/latest labels. */
export function accessibleChartRows(rows: MarketHistorical): MarketHistorical {
  return evenlySample(rows, 6);
}
