import type { FinancialFreedomResult } from '@diary/domain';
import type { FireFormValues, FireRatePreset } from './financial-freedom-input';

export function buildFinancialFreedomMarkdown(values: FireFormValues, preset: FireRatePreset, result: FinancialFreedomResult, money: (value: number) => string, locale: string, t: (key: string) => string) {
  const years = result.yearsToFreedom === null ? t('Not reached within the 100-year model') : result.yearsToFreedom === 0 ? t('Already at target') : `${result.yearsToFreedom.toFixed(1)} ${t('years')}`;
  const month = result.freedomDate ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(result.freedomDate) : t('Unavailable');
  const output = [
    `# ${t('Financial freedom calculator')}`, `## ${t('Assumptions')}`,
    `${t('Annual expenses')}: ${values.annualExpenses}`, `${t('Current assets')}: ${values.currentAssets}`,
    `${t('Monthly contribution')}: ${values.monthlyContribution}`, `${t('Expected annual return (%)')}: ${values.expectedReturn}`,
    `${t('Current age (optional)')}: ${values.currentAge.trim() || '—'}`, `${t('Withdrawal rate')}: ${values.withdrawalRate}% (${t(preset === 'custom' ? 'Custom' : preset)})`,
    `## ${t('Results under these assumptions')}`, `${t('Target assets')}: ${money(result.fireNumber)}`,
    `${t('Target progress')}: ${result.currentProgress.toFixed(1)}%`, `${t('Still to accumulate')}: ${money(result.amountNeeded)}`,
    `${t('Estimated years')}: ${years}`, `${t('Estimated target month')}: ${month}`,
    `## ${t('Withdrawals at the target')}`, `${t('Monthly')}: ${money(result.monthlyWithdrawal)}`,
    `${t('Weekly')}: ${money(result.weeklyWithdrawal)}`, `${t('Daily')}: ${money(result.dailyWithdrawal)}`,
    `## ${t('First ten years')}`, `| ${t('Year')} | ${t('Starting assets')} | ${t('Annual contributions')} | ${t('Annual returns')} | ${t('Ending assets')} | ${t('Status')} |`,
    '|---|---:|---:|---:|---:|---|',
    ...result.yearlyProjection.slice(0, 10).map(row => `| ${row.year} | ${money(row.startingAssets)} | ${money(row.contribution)} | ${money(row.returns)} | ${money(row.endingAssets)} | ${t(row.isFreed ? 'Your stated target is reached' : 'Accumulating')} |`),
    t('Nominal model: monthly compounding and contributions at month end. Inflation, taxes and post-withdrawal asset fluctuations are excluded. Use one currency for all amounts.'),
  ];
  return output.join('\n');
}
