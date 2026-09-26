import { describe, expect, it } from 'vitest';
import { assessFinancialFreedomInput, type FireFormValues } from '../../src/tools/financial-freedom-input';
import { buildFinancialFreedomMarkdown } from '../../src/tools/financial-freedom-output';
import { translate } from '../../src/preferences/translations';

const base: FireFormValues = { annualExpenses: '600000', currentAssets: '1000000', monthlyContribution: '20000', expectedReturn: '8', currentAge: '30', withdrawalRate: '4' };
const now = new Date('2026-09-05T12:00:00Z');

describe('Financial Freedom native input and shared calculation', () => {
  it('matches the shared source regression fixture without rounding intermediate values', () => {
    const result = assessFinancialFreedomInput(base, 'moderate', now);
    expect(result.invalidFields.size).toBe(0);
    expect(result.result).toMatchObject({ fireNumber: 15_000_000, amountNeeded: 14_000_000, monthsToFreedom: 227 });
    expect(result.result?.yearlyProjection[0]?.contribution).toBe(240_000);
    expect(result.result?.yearsToFreedom?.toFixed(1)).toBe('18.9');
    expect(result.result?.yearlyProjection[0]?.endingAssets).toBeCloseTo(1_331_998.0272300418, 6);
  });

  it('rejects zero costs, negative assets, out-of-range return, non-integer age and invalid custom rate', () => {
    const invalid = assessFinancialFreedomInput({ ...base, annualExpenses: '0', currentAssets: '-1', expectedReturn: '31', currentAge: '30.5', withdrawalRate: '101' }, 'custom', now);
    expect([...invalid.invalidFields].sort()).toEqual(['annualExpenses', 'currentAge', 'currentAssets', 'expectedReturn', 'withdrawalRate']);
    expect(invalid.result).toBeNull();
  });

  it('allows an empty optional age and preserves unreachable and already-reached scenarios', () => {
    const noAge = assessFinancialFreedomInput({ ...base, currentAge: '', monthlyContribution: '0', expectedReturn: '0' }, 'moderate', now);
    expect(noAge.invalidFields.size).toBe(0);
    expect(noAge.result?.monthsToFreedom).toBeNull();
    expect(noAge.result?.yearlyProjection[0]?.age).toBeNull();
    const reached = assessFinancialFreedomInput({ ...base, currentAssets: '20000000' }, 'moderate', now);
    expect(reached.result?.monthsToFreedom).toBe(0);
    expect(reached.result?.amountNeeded).toBe(0);
  });

  it('shows no numeric result if large finite inputs overflow the source model', () => {
    const overflow = assessFinancialFreedomInput({ ...base, currentAssets: String(Number.MAX_VALUE) }, 'moderate', now);
    expect(overflow.invalidFields.size).toBe(0);
    expect(overflow.calculationError).toBe(true);
    expect(overflow.result).toBeNull();
  });

  it.each([' ', '\n\t', '0x10', '0b10', '1,000', 'NaN', 'Infinity'])('does not silently interpret pasted non-decimal input %j as an amount', value => {
    const invalid = assessFinancialFreedomInput({ ...base, currentAssets: value, monthlyContribution: value, expectedReturn: value }, 'moderate', now);
    expect([...invalid.invalidFields]).toEqual(['currentAssets', 'monthlyContribution', 'expectedReturn']);
    expect(invalid.result).toBeNull();
  });

  it('accepts decimal/exponent input, zero contributions and a whitespace-only optional age without inventing age zero', () => {
    const valid = assessFinancialFreedomInput({ ...base, annualExpenses: ' 6e5 ', monthlyContribution: '0.0', currentAge: '  ' }, 'moderate', now);
    expect(valid.result?.fireNumber).toBe(15_000_000);
    expect(valid.result?.yearlyProjection[0]?.age).toBeNull();
    expect(assessFinancialFreedomInput({ ...base, withdrawalRate: '0x4' }, 'custom', now).result).toBeNull();
  });

  it('keeps preset rates authoritative and permits custom rates at the upper boundary', () => {
    expect(assessFinancialFreedomInput({ ...base, withdrawalRate: '3' }, 'moderate', now).invalidFields.has('withdrawalRate')).toBe(true);
    expect(assessFinancialFreedomInput({ ...base, withdrawalRate: '3' }, 'conservative', now).result?.fireNumber).toBe(20_000_000);
    expect(assessFinancialFreedomInput({ ...base, withdrawalRate: '5' }, 'aggressive', now).result?.fireNumber).toBe(12_000_000);
    expect(assessFinancialFreedomInput({ ...base, withdrawalRate: '100', expectedReturn: '30', currentAge: '120' }, 'custom', now).result?.fireNumber).toBe(600_000);
  });

  it('preserves the inclusive 100-year boundary and UTC month-end clamping through native inputs', () => {
    const values = { ...base, annualExpenses: '120000', withdrawalRate: '100', currentAssets: '0', monthlyContribution: '100', expectedReturn: '0' };
    expect(assessFinancialFreedomInput(values, 'custom', now).result?.monthsToFreedom).toBe(1200);
    expect(assessFinancialFreedomInput({ ...values, annualExpenses: '120100' }, 'custom', now).result?.monthsToFreedom).toBeNull();
    const monthEnd = assessFinancialFreedomInput({ ...values, annualExpenses: '100' }, 'custom', new Date('2028-01-31T23:30:00Z')).result;
    expect(monthEnd?.freedomDate?.toISOString()).toBe('2028-02-29T23:30:00.000Z');
  });

  it.each(['en', 'zh-TW', 'zh-CN'] as const)('exports the assumptions, all summary values and exactly ten source projection years in %s', locale => {
    const t = (key: string) => translate(key, locale);
    const money = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
    const result = assessFinancialFreedomInput(base, 'custom', now).result!;
    const text = buildFinancialFreedomMarkdown(base, 'custom', result, money, locale, t);
    expect(text).toContain(`# ${t('Financial freedom calculator')}`);
    expect(text).toContain(`${t('Withdrawal rate')}: 4% (${t('Custom')})`);
    expect(text).not.toContain('(custom)');
    expect(text).toContain(`${t('Annual expenses')}: 600000`);
    expect(text).toContain(`${t('Expected annual return (%)')}: 8`);
    expect(text).toContain(`${t('Current age (optional)')}: 30`);
    expect(text).toContain(`${t('Target assets')}: 15,000,000`);
    expect(text).toContain(`${t('Target progress')}: 6.7%`);
    expect(text).toContain(`${t('Estimated years')}: 18.9 ${t('years')}`);
    expect(text).toContain(`${t('Monthly')}: 50,000`);
    expect(text).toContain('| 1 | 1,000,000 | 240,000 | 91,998 | 1,331,998 |');
    expect(text).toContain('| 10 |');
    expect(text).not.toContain('| 11 |');
    expect(text.split('\n').filter(line => /^\| \d+ \|/.test(line))).toHaveLength(10);
    expect(text).toContain(t('Nominal model: monthly compounding and contributions at month end. Inflation, taxes and post-withdrawal asset fluctuations are excluded. Use one currency for all amounts.'));
  });

  it('exports unreachable and already-achieved states without a false future date or numeric years', () => {
    const t = (key: string) => key;
    const values = { ...base, currentAge: '', monthlyContribution: '0', expectedReturn: '0' };
    const result = assessFinancialFreedomInput(values, 'moderate', now).result!;
    const text = buildFinancialFreedomMarkdown(values, 'moderate', result, String, 'en', t);
    expect(text).toContain('Current age (optional): —');
    expect(text).toContain('Estimated years: Not reached within the 100-year model');
    expect(text).toContain('Estimated target month: Unavailable');
    const achieved = { ...values, currentAssets: '20000000' };
    const achievedResult = assessFinancialFreedomInput(achieved, 'moderate', now).result!;
    expect(buildFinancialFreedomMarkdown(achieved, 'moderate', achievedResult, String, 'en', t)).toContain('Estimated years: Already at target');
  });
});
