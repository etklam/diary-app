import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hostedOrigin, supportDestination, validateRelease } from '../../config/release.cjs';

// Non-contacted syntax fixtures; no endpoint here is an authorized deployment.
const settings = { APP_VARIANT: 'preview', EXPO_PUBLIC_APP_ENV: 'preview',
  EXPO_PUBLIC_API_BASE_URL: 'https://beta.operator-approved.org', BETA_APPROVED_API_ORIGIN: 'https://beta.operator-approved.org',
  EXPO_PUBLIC_BETA_SUPPORT_URL: 'mailto:help@operator-approved.org',
  EXPO_PUBLIC_BETA_DATA_NOTICE: 'Synthetic policy fixture for validation only; never distribute this configuration.',
  ANDROID_VERSION_CODE: '7', BETA_CONFIGURATION_APPROVED: '1' };
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('release configuration', () => {
  it.each([undefined, '', 'http://api.operator-approved.org', 'https://localhost', 'https://10.0.2.2',
    'https://127.0.0.1', 'https://[::1]', 'https://api.example.com', 'https://api.example.test', 'https://api.local',
    'https://127.0.0.1.nip.io', 'https://your-api.org', 'https://name:password@api.operator-approved.org',
    'https://api.operator-approved.org/path', 'https://api.operator-approved.org/path/..',
    'https://api.operator-approved.org?', 'https://api.operator-approved.org#', 'https://api.operator-approved.org\\',
    ' https://api.operator-approved.org', 'https://api.operator-approved.org/\n'])('rejects unsafe origin %s', value => {
    expect(() => hostedOrigin(value)).toThrow();
  });
  it('requires approved origin, support, confirmed notice, environment and explicit version', () => {
    expect(validateRelease(settings)).toMatchObject({ variant: 'preview', versionCode: 7 });
    for (const key of Object.keys(settings)) expect(() => validateRelease({ ...settings, [key]: '' })).toThrow();
    for (const code of ['0', '-1', '1.5', '01', '1000000000']) expect(() => validateRelease({ ...settings, ANDROID_VERSION_CODE: code })).toThrow();
    expect(() => validateRelease({ ...settings, EXPO_PUBLIC_APP_ENV: 'development' })).toThrow();
    expect(() => validateRelease({ ...settings, BETA_APPROVED_API_ORIGIN: 'https://other.operator-approved.org' })).toThrow();
    expect(() => validateRelease({ ...settings, EXPO_PUBLIC_BETA_DATA_NOTICE: 'TODO decide data handling before release' })).toThrow();
  });
  it('accepts a support path or single email, never credentials or message parameters', () => {
    expect(supportDestination('https://operator-approved.org/help')).toBe('https://operator-approved.org/help');
    for (const value of ['mailto:help@example.com', 'mailto:help@operator-approved.org?body=secret',
      'https://user:secret@operator-approved.org/help', 'https://operator-approved.org/help?token=secret', 'http://operator-approved.org']) {
      expect(() => supportDestination(value)).toThrow();
    }
  });
  it.each(['development', 'preview', 'production'])('separates %s native configuration', async variant => {
    Object.entries({ ...settings, APP_VARIANT: variant, EXPO_PUBLIC_APP_ENV: variant }).forEach(([key, value]) => vi.stubEnv(key, value));
    const factory = (await import('../../app.config')).default;
    const config = factory({ config: {} } as never);
    expect(config.extra?.buildVariant).toBe(variant);
    expect(config.android?.package).toBe(variant === 'preview' ? 'com.etklam.diaryapp.preview' : 'com.etklam.diaryapp');
    expect(config.name).toBe(variant === 'preview' ? 'Trade Basic Beta' : 'diary-app');
    expect(config.android?.allowBackup).toBe(false);
    expect(config.plugins).toContainEqual(['expo-sqlite', { useSQLCipher: true }]);
    expect(config.plugins).toContain('./plugins/with-single-attempt-writes.cjs');
    expect(config.plugins).toContain('./plugins/with-release-safety.cjs');
    expect(config.plugins).toContainEqual(['expo-build-properties', { android: { usesCleartextTraffic: variant === 'development' } }]);
    expect(config.plugins).toContainEqual(['expo-dev-client', { addGeneratedScheme: variant === 'development' }]);
    expect(config.android?.versionCode).toBe(variant === 'development' ? 1 : 7);
  });
  it('keeps EAS preview standalone with its own environment', () => {
    const profiles = JSON.parse(readFileSync('eas.json', 'utf8')).build;
    expect(profiles.preview).toMatchObject({ developmentClient: false, distribution: 'internal', environment: 'preview',
      android: { buildType: 'apk' }, env: { APP_VARIANT: 'preview', EXPO_PUBLIC_APP_ENV: 'preview' } });
    expect(profiles.development.developmentClient).toBe(true);
    expect(profiles.production.environment).toBe('production');
  });
  it('executes the local preview path without the development wrapper or environment rewrite', () => {
    const calls: { command: string; args: string[]; options?: { env?: Record<string, string> } }[] = [];
    const env = { ...settings, BETA_KEYSTORE_PATH: '/private/operator-key', BETA_KEYSTORE_PASSWORD: 'not-logged', BETA_KEY_ALIAS: 'approved', BETA_KEY_PASSWORD: 'not-logged' };
    runInNewContext(readFileSync('scripts/preview-build.cjs', 'utf8'), {
      process: { env, execPath: 'node', platform: 'linux' }, console: { log: vi.fn(), error: (message: string) => { throw Error(message); } },
      require: (name: string) => ({
        'node:child_process': { spawnSync: (command: string, args: string[], options: object) => { calls.push({ command, args, options }); return { status: 0, stdout: args[0] === 'status' ? '' : 'synthetic-hash' }; } },
        'node:fs': { existsSync: (path: string) => path === env.BETA_KEYSTORE_PATH, mkdirSync: vi.fn(), writeFileSync: vi.fn() },
        'node:path': { resolve }, '../config/release.cjs': { validateRelease },
      })[name],
    });
    const builds = calls.filter(call => call.command !== 'git');
    expect(builds).toHaveLength(2);
    expect(builds[0].args).toContain('prebuild');
    expect(builds[1].args).toContain(':app:assembleRelease');
    for (const call of builds) expect(call.options?.env).toMatchObject({ APP_VARIANT: 'preview', EXPO_PUBLIC_APP_ENV: 'preview', EXPO_NO_DOTENV: '1', BETA_LOCAL_SIGNING: '1' });
    expect(JSON.stringify(builds.map(call => call.args))).not.toContain('expo-command');
  });
  it('installs a fail-closed release task without changing the single-attempt plugin', () => {
    let apply: (config: { modResults: { contents: string } }) => { modResults: { contents: string } };
    const module = { exports: (_config: object) => ({}) };
    runInNewContext(readFileSync('plugins/with-release-safety.cjs', 'utf8'), { module, require: () => ({ withAppBuildGradle: (_config: object, callback: typeof apply) => { apply = callback; } }) });
    module.exports({});
    const result = apply!({ modResults: { contents: 'android {}' } });
    expect(result.modResults.contents).toContain('preReleaseBuild');
    expect(result.modResults.contents).toContain('scripts/validate-release.cjs');
    expect(result.modResults.contents).toContain('signing.keyAlias == "androiddebugkey"');
    expect(result.modResults.contents).toContain('signing.storeFile.name == "debug.keystore"');
    expect(apply!(result).modResults.contents).toBe(result.modResults.contents);
  });
});
