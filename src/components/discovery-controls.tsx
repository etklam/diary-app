import { usePreferences, useAppColors, type Colors } from '@/preferences/context';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { DiscoveryInput } from '@/diaries/query';

export function SmallButton({ label, onPress, selected = false }: { label: string; onPress(): void; selected?: boolean }) {
  const { colors: authColors, t } = usePreferences();
  const controls = createStyles(authColors);
  label = t(label);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress}
    style={[controls.button, selected && { backgroundColor: authColors.border }]}><Text style={controls.text}>{label}</Text></Pressable>;
}
export function QueryField({ label, value, change }: { label: string; value?: string; change(value: string): void }) {
  const { colors: authColors, t } = usePreferences();
  const controls = createStyles(authColors);
  label = t(label);
  return <View style={{ gap: 4 }}><Text style={controls.text}>{label}</Text><TextInput accessibilityLabel={label} value={value ?? ''}
    onChangeText={change} autoCapitalize="none" style={controls.input} /></View>;
}
export function Filters({ input, change }: { input: DiscoveryInput; change(patch: DiscoveryInput): void }) {
  const { colors: authColors, t } = usePreferences();
  const controls = createStyles(authColors);
  return <View style={{ gap: 8 }}>
    <QueryField label={t("Stock symbol")} value={input.symbol} change={symbol => change({ symbol })} />
    <QueryField label={t("From date (YYYY-MM-DD)")} value={input.dateFrom} change={dateFrom => change({ dateFrom })} />
    <QueryField label={t("To date (YYYY-MM-DD)")} value={input.dateTo} change={dateTo => change({ dateTo })} />
    <Text style={controls.text}>{t("Review status")}</Text><View style={controls.wrap}>
      {(['', 'none', 'pending', 'reviewed'] as const).map(value => <SmallButton key={value} label={value ? { none: 'No review', pending: 'Pending', reviewed: 'Reviewed' }[value] : 'Any review'}
        selected={(input.reviewStatus ?? '') === value} onPress={() => change({ reviewStatus: value })} />)}
    </View><View style={controls.wrap}>
      <SmallButton label={t("Newest first")} selected={input.sortBy !== 'date-asc'} onPress={() => change({ sortBy: 'date-desc' })} />
      <SmallButton label={t("Oldest first")} selected={input.sortBy === 'date-asc'} onPress={() => change({ sortBy: 'date-asc' })} />
    </View>
  </View>;
}
const createStyles = (authColors: Colors) => StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: authColors.border, justifyContent: 'center' },
  text: { fontSize: 15, color: authColors.ink, flexShrink: 1 },
  input: { minHeight: 48, borderWidth: 1, borderColor: authColors.border, backgroundColor: authColors.surface, borderRadius: 8, padding: 10, fontSize: 16, color: authColors.ink },
});

export function useControls() { return createStyles(useAppColors()); }
