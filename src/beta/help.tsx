import { usePreferences, type Colors } from '@/preferences/context';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Linking, Modal, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { PrimaryButton } from '@/components/auth-ui';
import { createIntroduction, introKey } from './onboarding';
import { diagnosticInput, installedInfo, supportConfig } from './runtime';
import { createReport } from './report';
import type { SupportScreen } from './diagnostics';

function IntroductionText() {
  const { colors: authColors, t } = usePreferences();
  const styles = createStyles(authColors);
  return <><Text style={styles.title}>{t("Welcome to Trade Basic")}</Text>
    <Text style={styles.text}>{t("Create an account or sign in to record your observations and review your decisions.")}</Text>
    <Text style={styles.text}>{t("Drafts stay on this device until you explicitly save. Future modules are marked unavailable.")}</Text></>;
}
export function BetaIntroduction() {
  const { colors: authColors, t } = usePreferences();
  const styles = createStyles(authColors);
  const model = useMemo(() => createIntroduction({ get: () => SecureStore.getItemAsync(introKey), set: value => SecureStore.setItemAsync(introKey, value) }), []);
  const visible = useSyncExternalStore(model.subscribe, model.getSnapshot);
  useEffect(() => { void model.start(); }, [model]);
  return <Modal visible={visible} animationType="slide" onRequestClose={() => void model.dismiss()}>
    <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}><IntroductionText />
      <PrimaryButton label={t("Get started")} onPress={() => void model.dismiss()} />
      <Text style={styles.text}>{t("You can reopen this guide from Account.")}</Text>
    </ScrollView></SafeAreaView>
  </Modal>;
}
export function HelpButton({ screen, code, label = 'Help and support' }: { screen: SupportScreen; code?: string; label?: string }) {
  const { colors: authColors } = usePreferences();
  const styles = createStyles(authColors);
  const [open, setOpen] = useState(false);
  return <><PrimaryButton label={label} onPress={() => setOpen(true)} />
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.page}><HelpContent screen={screen} code={code} close={() => setOpen(false)} /></SafeAreaView>
    </Modal></>;
}
export function HelpContent({ screen, code, close }: { screen: SupportScreen; code?: string; close?: () => void }) {
  const { colors: authColors, t } = usePreferences();
  const styles = createStyles(authColors);
  const [summary, setSummary] = useState<string | null>(null);
  const [failure, setFailure] = useState(false);
  const config = supportConfig(); const info = installedInfo();
  const report = useMemo(() => createReport(diagnosticInput(screen, code), {
    share: async text => { await Share.share({ message: text }); },
    support: async () => { if (config.url) await Linking.openURL(config.url); },
  }), [screen, code, config.url]);
  const support = async () => { try { await report.support(); } catch { setFailure(true); } };
  return <ScrollView contentContainerStyle={styles.content}>
    {close && <PrimaryButton label={t("Close help")} onPress={close} />}
    <IntroductionText />
    <Text style={styles.title}>{t("About and version")}</Text>
    <Text selectable style={styles.text}>{t("Installed version:")}{info.version ?? t('Unavailable')} {t("· Build")}{info.build ?? t('Unavailable')} · {info.environment ?? t('Not configured')}</Text>
    <Text style={styles.title}>{t("Account help")}</Text>
    <Text style={styles.text}>{t("You can register in the app. For password recovery, contact support. Never share passwords, tokens or draft databases.")}</Text>
    {config.url ? <><Text selectable style={styles.text}>{config.url}</Text><PrimaryButton label={t("Open support")} onPress={() => void support()} /></>
      : <Text style={styles.text}>{t("Support is not configured for this build.")}</Text>}
    <Text style={styles.title}>{t("Data and drafts")}</Text>
    <Text style={styles.text}>{t("Confirmed diary and review saves are stored on the server. Local drafts are encrypted on this device; this is not end-to-end encryption.")}</Text>
    <Text style={styles.text}>{t("Ordinary logout asks before discarding drafts. Security revocation retains owner-bound drafts. Uninstalling loses local drafts and keys; do not uninstall to troubleshoot.")}</Text>
    <Text style={styles.text}>{config.notice ?? t('Hosting, retention and deletion policies await release-owner confirmation.')}</Text>
    <Text style={styles.text}>{t("For an uncertain save, keep the draft and check server state. If a confirmed save cannot be read, retry reading without submitting again.")}</Text>
    <PrimaryButton label={t("Inspect diagnostic summary")} onPress={() => setSummary(report.inspect())} />
    {summary && <>
      <Text style={styles.text}>{t("Review the summary before sharing. It excludes accounts, diary content, searches, drafts and credentials.")}</Text>
      <Text selectable accessibilityLabel={t("Diagnostic summary")} style={styles.text}>{summary}</Text>
      {config.url && <PrimaryButton label={t("Share summary")} onPress={() => { void report.share().catch(() => setFailure(true)); }} />}
      {config.url && <PrimaryButton label={t("Contact support")} onPress={() => void support()} />}
    </>}
    {failure && <Text accessibilityRole="alert" style={styles.text}>{t("Could not open the external app. Copy the support address and summary to contact support later.")}</Text>}
  </ScrollView>;
}
const createStyles = (authColors: Colors) => StyleSheet.create({ page: { flex: 1, backgroundColor: authColors.canvas }, content: { padding: 20, gap: 14 },
  title: { fontSize: 20, fontWeight: '700', color: authColors.ink }, text: { fontSize: 16, lineHeight: 25, color: authColors.ink } });
