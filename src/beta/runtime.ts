import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { osVersion } from 'expo-device';
import { Platform } from 'react-native';
import { diagnosticSummary, reportMetadata, type SupportScreen } from './diagnostics';
import { supportDestination } from '../../config/release.cjs';

export function installedInfo() {
  // Never substitute a JS manifest version for the installed binary's identity.
  const application = requireOptionalNativeModule<{ nativeApplicationVersion?: string; nativeBuildVersion?: string }>('ExpoApplication');
  return { version: application?.nativeApplicationVersion, build: application?.nativeBuildVersion,
    platform: Platform.OS, osVersion, environment: Constants.expoConfig?.extra?.buildVariant };
}
export function supportConfig() {
  let url: string | null = null;
  try { url = supportDestination(Constants.expoConfig?.extra?.supportUrl); } catch { /* No fabricated fallback destination. */ }
  const notice = Constants.expoConfig?.extra?.dataNotice;
  return { url, notice: typeof notice === 'string' && notice.trim() ? notice : null };
}
export const diagnosticInput = (screen: SupportScreen, code?: string) => ({ ...installedInfo(), screen, ...reportMetadata.get(screen), ...(code ? { code } : {}) });
export const currentDiagnostic = (screen: SupportScreen, code?: string) => diagnosticSummary(diagnosticInput(screen, code));
