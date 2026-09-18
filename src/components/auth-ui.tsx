import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

export const authColors = {
  canvas: '#F4F1EA', surface: '#FFFCF6', ink: '#17221E', muted: '#63706A', border: '#D7D0C3',
  action: '#173F35', actionPressed: '#0F3028', onAction: '#FFFFFF',
  warningBackground: '#FFF1D6', warningText: '#76511A', errorBackground: '#FCE8E6', errorText: '#8B2C24',
} as const;

export function PrimaryButton({ label, busy = false, disabled, ...props }: PressableProps & { label: string; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || busy}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, (disabled || busy) && styles.buttonDisabled]}
      {...props}>
      {busy ? <ActivityIndicator color={authColors.onAction} /> : <Text style={styles.buttonLabel}>{label}</Text>}
    </Pressable>
  );
}

export function StatusMessage({ tone, children }: { tone: 'warning' | 'error'; children: string }) {
  return (
    <View accessibilityRole="alert" style={[styles.message, tone === 'error' ? styles.errorMessage : styles.warningMessage]}>
      <Text style={tone === 'error' ? styles.errorText : styles.warningText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 20, backgroundColor: authColors.action },
  buttonPressed: { backgroundColor: authColors.actionPressed },
  buttonDisabled: { opacity: 0.55 },
  buttonLabel: { color: authColors.onAction, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  message: { borderRadius: 10, padding: 12 },
  warningMessage: { backgroundColor: authColors.warningBackground },
  errorMessage: { backgroundColor: authColors.errorBackground },
  warningText: { color: authColors.warningText, fontSize: 15, lineHeight: 22 },
  errorText: { color: authColors.errorText, fontSize: 15, lineHeight: 22 },
});
