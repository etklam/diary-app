const { spawnSync } = require('node:child_process');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { validateRelease } = require('../config/release.cjs');

// This path never calls the development wrapper and never creates signing keys.
try {
  const config = validateRelease(process.env);
  if (config.variant !== 'preview') throw new Error('Preview build requires preview configuration.');
  if (existsSync('android')) throw new Error('Use a fresh isolated checkout without android/. Existing native projects are not overwritten.');
  for (const name of ['BETA_KEYSTORE_PATH', 'BETA_KEYSTORE_PASSWORD', 'BETA_KEY_ALIAS', 'BETA_KEY_PASSWORD']) {
    if (!process.env[name]) throw new Error(`Missing authorized local signing setting: ${name}`);
  }
  if (!existsSync(process.env.BETA_KEYSTORE_PATH)) throw new Error('Authorized keystore file does not exist.');
  const clean = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  if (clean.status !== 0 || clean.stdout.trim()) throw new Error('Commit the reviewed candidate before release packaging; use a clean checkout.');
  const sourceCommit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const sourceTree = spawnSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).stdout.trim();
  const env = { ...process.env, BETA_LOCAL_SIGNING: '1', EXPO_NO_DOTENV: '1' };
  const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, { env, stdio: 'inherit', ...options });
    if (result.error || result.status !== 0) throw new Error('Preview build step failed; no distributable artifact is confirmed.');
  };
  run(process.execPath, [resolve('node_modules/expo/bin/cli'), 'prebuild', '--platform', 'android', '--no-install']);
  if (process.platform === 'win32') run('cmd.exe', ['/d', '/c', 'gradlew.bat', ':app:assembleRelease'], { cwd: resolve('android') });
  else run('./gradlew', [':app:assembleRelease'], { cwd: resolve('android') });
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/preview-build-input.json', JSON.stringify({ sourceCommit, sourceTree, profile: config.variant, apiOrigin: config.apiOrigin, versionCode: config.versionCode }, null, 2));
  console.log('Release output: android/app/build/outputs/apk/release/app-release.apk. Run artifact audit before sharing.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
