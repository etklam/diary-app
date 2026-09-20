const { spawnSync } = require('node:child_process');
const { validateRelease } = require('../config/release.cjs');
try {
  if (validateRelease(process.env).variant !== 'preview') throw new Error('Expected preview environment.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(process.env.EAS_PROJECT_ID ?? '')) throw new Error('Set the existing authorized EAS_PROJECT_ID. This command does not create a project.');
  const clean = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  if (clean.status !== 0 || clean.stdout.trim()) throw new Error('Use a clean, committed candidate checkout.');
  const command = process.platform === 'win32' ? 'cmd.exe' : 'eas';
  const prefix = process.platform === 'win32' ? ['/d', '/c', 'eas'] : [];
  const result = spawnSync(command, [...prefix, 'build', '--platform', 'android', '--profile', 'preview', '--non-interactive'], {
    env: { ...process.env, EXPO_NO_DOTENV: '1' }, stdio: 'inherit',
  });
  if (result.error || result.status !== 0) throw new Error('EAS build unavailable or failed. Use the authorized CLI/account/credentials; no artifact is confirmed.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
