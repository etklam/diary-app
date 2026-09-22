import { usePreferences, type Colors } from '@/preferences/context';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

export function PrimaryButton({ label, busy = false, disabled, ...props }: PressableProps & { label: string; busy?: boolean }) {
  const { colors: authColors, t } = usePreferences();
  const styles = createStyles(authColors);
  label = t(label);
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
  const { colors: authColors, t } = usePreferences();
  const styles = createStyles(authColors);
  return (
    <View accessibilityRole="alert" style={[styles.message, tone === 'error' ? styles.errorMessage : styles.warningMessage]}>
      <Text style={tone === 'error' ? styles.errorText : styles.warningText}>{t(children)}</Text>
    </View>
  );
}

const createStyles = (authColors: Colors) => StyleSheet.create({
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
