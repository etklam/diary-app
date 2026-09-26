import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { withdrawalRatePresets } from '@diary/domain';
import { AccountPage, Copy } from '@/components/account-ui';
import { PrimaryButton, StatusMessage } from '@/components/auth-ui';
import { usePreferences } from '@/preferences/context';
import { buildFinancialFreedomMarkdown } from './financial-freedom-output';
import { assessFinancialFreedomInput, type FireField, type FireRatePreset } from './financial-freedom-input';

const initialValues = { annualExpenses: '600000', currentAssets: '1000000', monthlyContribution: '20000', expectedReturn: '8', currentAge: '30', withdrawalRate: '4' };
type Field = FireField;
type RatePreset = FireRatePreset;
const fields: Field[] = ['annualExpenses', 'currentAssets', 'monthlyContribution', 'expectedReturn', 'currentAge'];

export function FinancialFreedomScreen() {
  const { colors: c, locale, t } = usePreferences();
  const [values, setValues] = useState(initialValues);
  const [preset, setPreset] = useState<RatePreset>('moderate');
  const [showAll, setShowAll] = useState(false);
  const [copyOutcome, setCopyOutcome] = useState<{ text: string; status: 'copied' | 'failed' } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const assessment = useMemo(() => assessFinancialFreedomInput(values, preset), [preset, values]);
  const invalid = assessment.invalidFields;
  const result = assessment.result;

  const money = (number: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(number);
  const years = result?.yearsToFreedom === null ? t('Not reached within the 100-year model')
    : result?.yearsToFreedom === 0 ? t('Already at target') : result?.yearsToFreedom !== undefined ? `${result.yearsToFreedom.toFixed(1)} ${t('years')}` : t('Unavailable');
  const freedomMonth = result?.freedomDate ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(result.freedomDate) : t('Unavailable');
  const md = result ? buildFinancialFreedomMarkdown(values, preset, result, money, locale, t) : '';
  const copyState = copyOutcome?.text === md ? copyOutcome.status : 'idle';
  const exportExpanded = showExport || copyState === 'failed';
  const returnBand = Number(values.expectedReturn) <= 4 ? 'Lower return assumption (0–4%)' : Number(values.expectedReturn) <= 10 ? 'Middle return assumption (>4–10%)' : 'Higher return assumption (>10%)';
  const panel = { backgroundColor: c.surface, borderColor: c.border };

  const change = (field: Field, value: string) => { setValues(current => ({ ...current, [field]: value })); setCopyOutcome(null); };
  const setRatePreset = (next: RatePreset) => {
    setPreset(next);
    const selected = withdrawalRatePresets.find(item => item.id === next);
    if (selected) setValues(current => ({ ...current, withdrawalRate: String(selected.rate) }));
    setCopyOutcome(null);
  };
  const copy = async () => {
    if (!md) return;
    try { const copied = await Clipboard.setStringAsync(md); setCopyOutcome({ text: md, status: copied ? 'copied' : 'failed' }); }
    catch { setCopyOutcome({ text: md, status: 'failed' }); }
  };
  const labels: Record<Field, string> = {
    annualExpenses: 'Annual expenses', currentAssets: 'Current assets', monthlyContribution: 'Monthly contribution',
    expectedReturn: 'Expected annual return (%)', currentAge: 'Current age (optional)', withdrawalRate: 'Custom withdrawal rate (%)',
  };

  return <AccountPage title="Financial freedom calculator">
    <Copy>{t('Adjust your saving and spending assumptions to explore the distance to your target.')}</Copy>
    <Panel title={t('Assumptions')} style={panel} ink={c.ink}>
      {fields.map((field, index) => <View key={field} style={{ gap: 5 }}>
        <Text style={{ color: invalid.has(field) ? c.errorText : c.ink, fontSize: 16 }}>{t(labels[field])}</Text>
        <TextInput testID={`fire-${field}`} accessibilityLabel={t(labels[field])} value={values[field]} onChangeText={value => change(field, value)} keyboardType="decimal-pad" maxLength={40} returnKeyType={index === fields.length - 1 ? 'done' : 'next'} autoCorrect={false} style={{ minHeight: 50, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: invalid.has(field) ? c.errorText : c.border, backgroundColor: c.canvas, color: c.ink, fontSize: 17 }} />
      </View>)}
      {!invalid.has('expectedReturn') && <Copy>{t(returnBand)}</Copy>}
      <Text style={{ color: c.ink, fontSize: 16 }}>{t('Withdrawal rate')}</Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {withdrawalRatePresets.map(item => <RateChoice key={item.id} selected={preset === item.id} label={`${t(item.id)} · ${item.rate}%`} onPress={() => setRatePreset(item.id)} colors={c} />)}
        <RateChoice selected={preset === 'custom'} label={t('Custom')} onPress={() => setRatePreset('custom')} colors={c} />
      </View>
      {preset === 'custom' && <View style={{ gap: 5 }}>
        <Text style={{ color: invalid.has('withdrawalRate') ? c.errorText : c.ink, fontSize: 16 }}>{t(labels.withdrawalRate)}</Text>
        <TextInput testID="fire-withdrawalRate" accessibilityLabel={t(labels.withdrawalRate)} value={values.withdrawalRate} onChangeText={value => change('withdrawalRate', value)} keyboardType="decimal-pad" maxLength={8} style={{ minHeight: 50, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: invalid.has('withdrawalRate') ? c.errorText : c.border, backgroundColor: c.canvas, color: c.ink, fontSize: 17 }} />
      </View>}
      <Copy>{t('A lower withdrawal rate requires a higher asset target. Presets are scenarios for comparison.')}</Copy>
      {invalid.size > 0 && <StatusMessage tone="error">{t('Complete valid inputs. Expenses and withdrawal rate must be positive; assets and contributions cannot be negative; return must be 0–30%, and age an integer from 0 to 120.')}</StatusMessage>}
    </Panel>

    <Panel title={t('Results under these assumptions')} style={panel} ink={c.ink}>
      {!result ? <Copy>{t(assessment.calculationError ? 'These values exceed the calculation range. Reduce an assumption; no result has been displayed.' : 'A valid result is not available for these inputs. Correct the highlighted assumptions; no values have been rounded into a result.')}</Copy> : <>
        <ValueRow label={t('Target assets')} value={money(result.fireNumber)} colors={c} />
        <ValueRow label={t('Still to accumulate')} value={money(result.amountNeeded)} colors={c} />
        <ValueRow label={t('Target progress')} value={`${result.currentProgress.toFixed(1)}%`} colors={c} />
        <View accessibilityRole="progressbar" accessibilityLabel={t('Target progress')} accessibilityValue={{ min: 0, max: 100, now: result.currentProgress }} style={{ height: 12, backgroundColor: c.border, borderRadius: 8, overflow: 'hidden' }}><View style={{ width: `${Math.max(0, Math.min(100, result.currentProgress))}%`, height: '100%', backgroundColor: c.action }} /></View>
        <ValueRow label={t('Estimated years')} value={years} colors={c} />
        <ValueRow label={t('Estimated target month')} value={freedomMonth} colors={c} />
        <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 18, fontWeight: '700', marginTop: 6 }}>{t('Withdrawals at the target')}</Text>
        <ValueRow label={t('Monthly')} value={money(result.monthlyWithdrawal)} colors={c} />
        <ValueRow label={t('Weekly')} value={money(result.weeklyWithdrawal)} colors={c} />
        <ValueRow label={t('Daily')} value={money(result.dailyWithdrawal)} colors={c} />
        <Copy>{t('Nominal model: monthly compounding and contributions at month end. Inflation, taxes and post-withdrawal asset fluctuations are excluded. Use one currency for all amounts.')}</Copy>
        <Copy>{t('Inputs are not stored.')}</Copy>
        <PrimaryButton testID="fire-copy" label="Copy results" onPress={() => void copy()} />
        {copyState === 'copied' && <StatusMessage tone="warning">{t('Results copied, including the first ten years.')}</StatusMessage>}
        {copyState === 'failed' && <StatusMessage tone="error">{t('Clipboard access failed. Select the text below to copy it manually.')}</StatusMessage>}
        <Pressable testID="fire-export-toggle" accessibilityRole="button" accessibilityLabel={t('Copyable text')} accessibilityState={{ expanded: exportExpanded }} onPress={() => { setShowExport(!exportExpanded); if (copyState === 'failed') setCopyOutcome(null); }} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={{ color: c.action, fontSize: 16 }}>{t('Copyable text')} {exportExpanded ? '−' : '+'}</Text>
        </Pressable>
        {exportExpanded && <Text testID="fire-export-text" selectable accessibilityLabel={`${t('Copyable text')}: ${md}`} style={{ padding: 12, color: c.ink, backgroundColor: c.canvas, borderColor: c.border, borderWidth: 1, borderRadius: 8, fontSize: 16 }}>{md}</Text>}
      </>}
    </Panel>

    {result && <Panel title={t('Annual asset projection')} style={panel} ink={c.ink}>
      <Copy>{t('Scroll horizontally to see every column.')}</Copy>
      <ScrollView horizontal accessibilityRole="none" accessibilityLabel={t('Annual projection table')}>
        <View style={{ minWidth: 740, borderWidth: 1, borderColor: c.border, borderRadius: 9, overflow: 'hidden' }} testID="fire-projection">
          <ProjectionRow header colors={c} values={[t('Year'), t('Age'), t('Starting assets'), t('Annual contributions'), t('Annual returns'), t('Ending assets'), t('Status')]} />
          {result.yearlyProjection.slice(0, showAll ? undefined : 10).map(row => <ProjectionRow key={row.year} colors={c} values={[String(row.year), row.age === null ? '—' : String(row.age), money(row.startingAssets), money(row.contribution), money(row.returns), money(row.endingAssets), t(row.isFreed ? 'Your stated target is reached' : 'Accumulating')]} />)}
        </View>
      </ScrollView>
      {result.yearlyProjection.length > 10 && <PrimaryButton label={showAll ? 'Show the first ten years' : 'Show all projected years'} onPress={() => setShowAll(value => !value)} />}
    </Panel>}
  </AccountPage>;
}

function Panel({ title, children, style, ink }: { title: string; children: React.ReactNode; style: object; ink: string }) {
  return <View style={{ gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, ...style }}><Text accessibilityRole="header" style={{ color: ink, fontSize: 20, fontWeight: '700' }}>{title}</Text>{children}</View>;
}

function RateChoice({ selected, label, onPress, colors }: { selected: boolean; label: string; onPress(): void; colors: { ink: string; action: string; surface: string; border: string } }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 10, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.action : colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.ink, fontSize: 15 }}>{label}</Text></Pressable>;
}

function ValueRow({ label, value, colors }: { label: string; value: string; colors: { ink: string; muted: string; border: string } }) {
  return <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ flex: 1, color: colors.muted, fontSize: 15, lineHeight: 22 }}>{label}</Text><Text selectable style={{ maxWidth: '55%', color: colors.ink, textAlign: 'right', fontSize: 16, lineHeight: 22, fontVariant: ['tabular-nums'] }}>{value}</Text></View>;
}

function ProjectionRow({ values, header = false, colors }: { values: string[]; header?: boolean; colors: { ink: string; muted: string; border: string; surface: string; action: string } }) {
  const { t } = usePreferences();
  const labels = ['Year', 'Age', 'Starting assets', 'Annual contributions', 'Annual returns', 'Ending assets', 'Status'];
  return <View accessible accessibilityRole={header ? 'header' : 'text'} accessibilityLabel={header ? values.join('. ') : values.map((value, index) => `${t(labels[index])}: ${value}`).join('. ')} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: header ? colors.surface : undefined, borderBottomWidth: 1, borderBottomColor: colors.border }}>
    {values.map((value, index) => <Text key={`${index}-${value}`} style={{ width: index < 2 ? 70 : 100, paddingHorizontal: 6, paddingVertical: 6, color: header ? colors.action : colors.ink, fontSize: 13, fontWeight: header ? '700' : '400', fontVariant: ['tabular-nums'] }}>{value}</Text>)}
  </View>;
}

