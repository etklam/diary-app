import { calculateFinancialFreedom, withdrawalRatePresets, type FinancialFreedomInput } from '@diary/domain';

export type FireFormValues = {
  annualExpenses: string; currentAssets: string; monthlyContribution: string;
  expectedReturn: string; currentAge: string; withdrawalRate: string;
};
export type FireField = keyof FireFormValues;
export type FireRatePreset = 'conservative' | 'moderate' | 'aggressive' | 'custom';
const requiredFields: FireField[] = ['annualExpenses', 'currentAssets', 'monthlyContribution', 'expectedReturn', 'currentAge'];
// Native text inputs can accept pasted whitespace or JavaScript-only number syntax.
// Keep the decimal/exponent syntax supported by the source number inputs.
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

export function assessFinancialFreedomInput(values: FireFormValues, preset: FireRatePreset, now = new Date()) {
  const invalidFields = new Set<FireField>();
  for (const field of requiredFields) {
    if (field === 'currentAge' && values[field].trim() === '') continue;
    const value = Number(values[field]);
    if (!decimal.test(values[field].trim()) || !Number.isFinite(value) || value < 0
      || (field === 'annualExpenses' && value === 0)
      || (field === 'expectedReturn' && value > 30)
      || (field === 'currentAge' && (value > 120 || !Number.isInteger(value)))) invalidFields.add(field);
  }
  const withdrawalRate = Number(values.withdrawalRate);
  if (!decimal.test(values.withdrawalRate.trim()) || !Number.isFinite(withdrawalRate) || withdrawalRate <= 0 || withdrawalRate > 100) invalidFields.add('withdrawalRate');
  const selectedPreset = withdrawalRatePresets.find(item => item.id === preset);
  if (selectedPreset && withdrawalRate !== selectedPreset.rate) invalidFields.add('withdrawalRate');
  if (invalidFields.size) return { invalidFields, result: null, calculationError: false };

  const input: FinancialFreedomInput = {
    annualExpenses: Number(values.annualExpenses), currentAssets: Number(values.currentAssets),
    monthlyContribution: Number(values.monthlyContribution), expectedReturn: Number(values.expectedReturn),
    withdrawalRate, currentAge: values.currentAge.trim() === '' ? null : Number(values.currentAge),
  };
  try { return { invalidFields, result: calculateFinancialFreedom(input, now), calculationError: false }; }
  catch { return { invalidFields, result: null, calculationError: true }; }
}
