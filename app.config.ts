import type { ConfigContext, ExpoConfig } from 'expo/config';

const buildVariant = process.env.APP_VARIANT ?? 'production';
const isDevelopmentBuild = buildVariant === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'diary-app',
  slug: 'diary-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'diaryapp',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
  },
  android: {
    package: 'com.etklam.diaryapp',
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
    [
      'expo-splash-screen',
      {
        backgroundColor: '#173F35',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-secure-store',
      {
        configureAndroidBackup: true,
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
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
