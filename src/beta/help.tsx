import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Linking, Modal, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { authColors, PrimaryButton } from '@/components/auth-ui';
import { createIntroduction, introKey, workflow } from './onboarding';
import { diagnosticInput, installedInfo, supportConfig } from './runtime';
import { createReport } from './report';
import type { SupportScreen } from './diagnostics';

function IntroductionText() {
  return <><Text style={styles.title}>歡迎使用 Trade Basic Beta</Text>{workflow.map(text => <Text key={text} style={styles.text}>{text}</Text>)}
    <Text style={styles.text}>這是受邀測試版。安裝 APK 不會建立帳號；請使用主辦方個別核准的帳號。此版本沒有自行註冊或忘記密碼功能。</Text></>;
}
export function BetaIntroduction() {
  const model = useMemo(() => createIntroduction({ get: () => SecureStore.getItemAsync(introKey), set: value => SecureStore.setItemAsync(introKey, value) }), []);
  const visible = useSyncExternalStore(model.subscribe, model.getSnapshot);
  useEffect(() => { void model.start(); }, [model]);
  return <Modal visible={visible} animationType="slide" onRequestClose={() => void model.dismiss()}>
    <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}><IntroductionText />
      <PrimaryButton label="開始使用／稍後再看" onPress={() => void model.dismiss()} />
      <Text style={styles.text}>之後可從登入頁或 Account 的 Beta／Help 再次查看。</Text>
    </ScrollView></SafeAreaView>
  </Modal>;
}
export function HelpButton({ screen, code, label = 'Beta／Help · Report a problem' }: { screen: SupportScreen; code?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return <><PrimaryButton label={label} onPress={() => setOpen(true)} />
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.page}><HelpContent screen={screen} code={code} close={() => setOpen(false)} /></SafeAreaView>
    </Modal></>;
}
export function HelpContent({ screen, code, close }: { screen: SupportScreen; code?: string; close?: () => void }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [failure, setFailure] = useState(false);
  const config = supportConfig(); const info = installedInfo();
  const report = useMemo(() => createReport(diagnosticInput(screen, code), {
    share: async text => { await Share.share({ message: text }); },
    support: async () => { if (config.url) await Linking.openURL(config.url); },
  }), [screen, code, config.url]);
  const support = async () => { try { await report.support(); } catch { setFailure(true); } };
  return <ScrollView contentContainerStyle={styles.content}>
    {close && <PrimaryButton label="關閉說明" onPress={close} />}
    <IntroductionText />
    <Text style={styles.title}>About／版本</Text>
    <Text selectable style={styles.text}>已安裝版本：{info.version ?? '無法讀取'} · Build {info.build ?? '無法讀取'} · {info.environment ?? '未設定'}</Text>
    <Text style={styles.title}>取得帳號／登入協助</Text>
    <Text style={styles.text}>請聯絡測試主辦方申請個別帳號、登入或密碼協助。這是人工協助流程，並非自動密碼重設。不要提供密碼、驗證 token 或草稿資料庫。</Text>
    {config.url ? <><Text selectable style={styles.text}>{config.url}</Text><PrimaryButton label="開啟支援管道" onPress={() => void support()} /></>
      : <Text style={styles.text}>支援目的地尚未設定。此安裝尚不可對外邀請測試者，請向提供安裝檔的主辦方確認。</Text>}
    <Text style={styles.title}>資料與草稿</Text>
    <Text style={styles.text}>按下儲存並由伺服器確認後，日誌與複盤會保存在此測試服務的伺服器。Quick Diary 與 Review 的本機草稿使用 SQLCipher 加密；這不代表端對端加密。</Text>
    <Text style={styles.text}>確認登出／捨棄會刪除目前帳號的本機草稿，不能取消可能正在完成的伺服器寫入。解除安裝會失去裝置草稿與金鑰；請不要以解除安裝來排除故障。Beta 與開發版是不同安裝，不會自動繼承草稿。</Text>
    <Text style={styles.text}>{config.notice ?? '伺服器存放位置、保留／移除政策與刪除申請方式尚未經主辦方確認；在確認前不得開始外部測試。'}</Text>
    <Text style={styles.text}>儲存結果未確認：保留加密草稿，使用唯讀「Check server state／Check saved diary」。已儲存但讀取失敗：重試讀取即可，不需再次提交。</Text>
    <PrimaryButton label="Report a problem／檢視診斷摘要" onPress={() => setSummary(report.inspect())} />
    {summary && <>
      <Text style={styles.text}>請先檢查下列摘要；長按文字可選取複製。摘要不包含帳號、日誌、搜尋、草稿或憑證。附加描述時請自行避免私人內容。</Text>
      <Text selectable accessibilityLabel="Diagnostic summary" style={styles.text}>{summary}</Text>
      {config.url && <PrimaryButton label="自行選擇分享摘要" onPress={() => { void report.share().catch(() => setFailure(true)); }} />}
      {config.url && <PrimaryButton label="聯絡已設定的支援管道" onPress={() => void support()} />}
    </>}
    {failure && <Text accessibilityRole="alert" style={styles.text}>無法開啟外部應用程式。請複製支援地址與診斷摘要，稍後手動聯絡。</Text>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: authColors.canvas }, content: { padding: 20, gap: 14 },
  title: { fontSize: 20, fontWeight: '700', color: authColors.ink }, text: { fontSize: 16, lineHeight: 25, color: authColors.ink } });
