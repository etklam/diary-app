import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { calculateFinancialFreedom, deriveQuickTitle } from '@diary/domain';
import { buildNormalizedTrendSeries } from '@diary/domain/market-rotation/trend-series';

const dates = Array.from({ length: 320 }, (_, i) => new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10));
const prices = new Map(dates.map((date, i) => [`SYN:${date}`, i === 7 ? null : 100 + i]));
const input = { annualExpenses: 600000, currentAssets: 1000000, monthlyContribution: 20000, expectedReturn: 8, withdrawalRate: 4, currentAge: 30 };
const cases = {
  chartSeries320Points: () => buildNormalizedTrendSeries({ symbol: 'SYN', qualifiedDates: dates, priceBySymbolDate: prices, comparisonDate: dates[0] }),
  fireProjection: () => calculateFinancialFreedom(input, new Date('2026-09-22T00:00:00Z')),
  authoringTitle10000Characters: () => deriveQuickTitle('Synthetic writing '.repeat(625)),
};
const results = {};
for (const [name, run] of Object.entries(cases)) {
  for (let i = 0; i < 20; i++) run();
  const times = Array.from({ length: 100 }, () => { const start = performance.now(); run(); return performance.now() - start; }).sort((a, b) => a - b);
  results[name] = { samples: times.length, p50Ms: times[49], p95Ms: times[94] };
}
const report = { node: process.version, platform: process.platform, kind: 'Host domain computation only; excludes native chart rendering, editor input and network', results };
await writeFile('docs/evidence/f0/host-performance.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
