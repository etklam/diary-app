import type { ConfigContext, ExpoConfig } from 'expo/config';

const { validateRelease, previewPackage } = require('./config/release.cjs');

const buildVariant = process.env.APP_VARIANT ?? 'production';
const isDevelopmentBuild = buildVariant === 'development';
const release = process.env.APP_VARIANT && !isDevelopmentBuild ? validateRelease(process.env) : null;
if (!['development', 'preview', 'production'].includes(buildVariant)) throw new Error('Invalid APP_VARIANT');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: buildVariant === 'preview' ? 'Trade Basic Beta' : 'diary-app',
  slug: 'diary-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: buildVariant === 'preview' ? 'tradebasicbeta' : 'diaryapp',
  extra: { buildVariant, apiOrigin: release?.apiOrigin ?? null, supportUrl: release?.supportUrl ?? process.env.EXPO_PUBLIC_BETA_SUPPORT_URL ?? null, dataNotice: release?.dataNotice ?? process.env.EXPO_PUBLIC_BETA_DATA_NOTICE ?? null, ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}) },
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
  },
  android: {
    allowBackup: false,
    package: buildVariant === 'preview' ? previewPackage : 'com.etklam.diaryapp',
    versionCode: release?.versionCode ?? 1,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    ['expo-dev-client', { addGeneratedScheme: isDevelopmentBuild }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#343740',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-secure-store',
      {
        configureAndroidBackup: false,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: isDevelopmentBuild,
        },
      },
    ],
    ['expo-sqlite', { useSQLCipher: true }],
    './plugins/with-draft-backup.cjs',
    './plugins/with-single-attempt-writes.cjs',
    './plugins/with-release-safety.cjs',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
