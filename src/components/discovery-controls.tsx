import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { authColors } from './auth-ui';
import type { DiscoveryInput } from '@/diaries/query';

export function SmallButton({ label, onPress, selected = false }: { label: string; onPress(): void; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress}
    style={[controls.button, selected && { backgroundColor: '#DFE5EF' }]}><Text style={controls.text}>{label}</Text></Pressable>;
}
export function QueryField({ label, value, change }: { label: string; value?: string; change(value: string): void }) {
  return <View style={{ gap: 4 }}><Text style={controls.text}>{label}</Text><TextInput accessibilityLabel={label} value={value ?? ''}
    onChangeText={change} autoCapitalize="none" style={controls.input} /></View>;
}
export function Filters({ input, change }: { input: DiscoveryInput; change(patch: DiscoveryInput): void }) {
  return <View style={{ gap: 8 }}>
    <QueryField label="Stock symbol" value={input.symbol} change={symbol => change({ symbol })} />
    <QueryField label="From date (YYYY-MM-DD)" value={input.dateFrom} change={dateFrom => change({ dateFrom })} />
    <QueryField label="To date (YYYY-MM-DD)" value={input.dateTo} change={dateTo => change({ dateTo })} />
    <Text style={controls.text}>Review status</Text><View style={controls.wrap}>
      {(['', 'none', 'pending', 'reviewed'] as const).map(value => <SmallButton key={value} label={value ? { none: 'No review', pending: 'Pending', reviewed: 'Reviewed' }[value] : 'Any review'}
        selected={(input.reviewStatus ?? '') === value} onPress={() => change({ reviewStatus: value })} />)}
    </View><View style={controls.wrap}>
      <SmallButton label="Newest first" selected={input.sortBy !== 'date-asc'} onPress={() => change({ sortBy: 'date-desc' })} />
      <SmallButton label="Oldest first" selected={input.sortBy === 'date-asc'} onPress={() => change({ sortBy: 'date-asc' })} />
    </View>
  </View>;
}
export const controls = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: authColors.border, justifyContent: 'center' },
  text: { fontSize: 15, color: authColors.ink, flexShrink: 1 },
  input: { minHeight: 48, borderWidth: 1, borderColor: authColors.border, backgroundColor: authColors.surface, borderRadius: 8, padding: 10, fontSize: 16, color: authColors.ink },
});
