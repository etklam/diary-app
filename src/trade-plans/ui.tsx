import { usePreferences } from '@/preferences/context';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { ReactNode } from 'react';

export function usePlanStyles() {
  const { colors } = usePreferences();
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 16, paddingBottom: 32, gap: 16 },
    heading: { fontSize: 28, lineHeight: 36, color: colors.ink, fontWeight: '700' }, section: { fontSize: 22, lineHeight: 30, color: colors.ink, fontWeight: '600' },
    label: { fontSize: 16, lineHeight: 25, color: colors.ink, fontWeight: '600' }, body: { fontSize: 16, lineHeight: 25, color: colors.ink }, muted: { fontSize: 14, lineHeight: 21, color: colors.muted },
    card: { padding: 16, gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    field: { minHeight: 48, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.ink, fontSize: 16 },
    errorField: { borderColor: colors.errorText, borderWidth: 2 },
    button: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.action, justifyContent: 'center', alignItems: 'center' },
    secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    buttonText: { color: colors.onAction, fontSize: 16, fontWeight: '700', textAlign: 'center' }, secondaryText: { color: colors.ink },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 48, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
    activeChip: { borderColor: colors.action, borderWidth: 2 }, error: { padding: 12, borderRadius: 10, backgroundColor: colors.errorBackground, color: colors.errorText, fontSize: 15, lineHeight: 22 },
  });
}
export function PlanButton({ label, onPress, disabled, secondary = false, testID }: { label: string; onPress(): void; disabled?: boolean; secondary?: boolean; testID?: string }) {
  const styles = usePlanStyles();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.5 }]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
}
export function PlanChoice({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress(): void; testID?: string }) {
  const styles = usePlanStyles();
  return <Pressable testID={testID} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected, checked: selected }} onPress={onPress} style={[styles.chip, selected && styles.activeChip]}><Text style={styles.body}>{label}</Text></Pressable>;
}
export function PlanField({ label, value, onChangeText, error, multiline, ...props }: TextInputProps & { label: string; value: string; onChangeText(value: string): void; error?: boolean; multiline?: boolean }) {
  const styles = usePlanStyles();
  return <View style={{ gap: 6 }}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} accessibilityHint={error ? 'Check this field' : undefined} value={value} onChangeText={onChangeText} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.field, error && styles.errorField, multiline && { minHeight: 96 }]} {...props} /></View>;
}
export function PlanCard({ children }: { children: ReactNode }) { const styles = usePlanStyles(); return <View style={styles.card}>{children}</View>; }
