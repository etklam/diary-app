import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, Pressable, type TextInputProps, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { usePreferences } from '@/preferences/context';
import { AccountFailure } from '@/account/service';
import { ZodError } from 'zod';
export function fieldInvalid(error: unknown, name: string) { return error instanceof ZodError ? error.issues.some(issue => issue.path[0] === name) : error instanceof AccountFailure ? error.fields.includes(name) || name === 'currentPassword' && error.code === 'AUTH_LOGIN_INVALID_CREDENTIALS' : false; }

export function AccountPage({ title, children }: { title: string; children: ReactNode }) {
  const { colors: c, t } = usePreferences();
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.ink, fontSize: 17 }}>‹ {t('Back')}</Text></Pressable>
      <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 30, fontWeight: '700' }}>{t(title)}</Text>{children}
    </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function Copy({ children }: { children: string }) { const { colors, t } = usePreferences(); return <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 25 }}>{t(children)}</Text>; }
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: boolean }) {
  const { colors: c, t } = usePreferences();
  return <View style={{ gap: 8 }}><Text style={{ color: error ? c.errorText : c.ink, fontSize: 16 }}>{t(label)}</Text><TextInput accessibilityLabel={t(label)} autoCapitalize="none" {...props} style={[{ minHeight: 52, padding: 12, borderWidth: 1, borderColor: error ? c.errorText : c.border, backgroundColor: c.surface, color: c.ink, borderRadius: 10, fontSize: 17 }, props.style]} /></View>;
}
export function Choice({ label, values, value, onChange }: { label: string; values: readonly (readonly [string, string])[]; value: string; onChange(value: string): void }) {
  const { colors: c, t } = usePreferences();
  return <View style={{ gap: 8 }}><Copy>{label}</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{values.map(([key, title]) => <Pressable key={key} testID={`choice-${key}`} accessibilityRole="radio" accessibilityState={{ selected: value === key }} accessibilityLabel={t(title)} onPress={() => onChange(key)} style={{ minHeight: 48, padding: 12, borderRadius: 10, borderWidth: value === key ? 2 : 1, borderColor: value === key ? c.ink : c.border, backgroundColor: c.surface }}><Text style={{ color: c.ink, fontSize: 16 }}>{t(title)}</Text></Pressable>)}</View></View>;
}
export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange(value: boolean): void }) { const { t } = usePreferences(); return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Copy>{label}</Copy></View><Switch accessibilityLabel={t(label)} value={value} onValueChange={onChange} /></View>; }
export function Failure({ error }: { error: unknown }) {
  const { t, colors } = usePreferences();
  if (!error) return null;
  const code = error instanceof AccountFailure ? error.code : undefined;
  const message = code === 'AUTH_LOGIN_INVALID_CREDENTIALS' ? 'Your current password is incorrect.' : code?.includes('EMAIL') ? 'This email is already registered.' : code?.includes('RATE') ? 'Too many requests. Please wait before trying again.' : error instanceof ZodError ? 'Check the highlighted fields.' : error instanceof AccountFailure && error.kind === 'uncertain' ? 'The result could not be confirmed. Check the current state before submitting again.' : 'Request rejected. Check your entries.';
  return <Text accessibilityRole="alert" style={{ color: colors.errorText, fontSize: 16 }}>{t(message)}{code ? ` (${code})` : ''}</Text>;
}
