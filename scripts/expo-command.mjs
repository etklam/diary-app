import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

const expoCli = resolve('node_modules/expo/bin/cli');
const result = spawnSync(process.execPath, [expoCli, ...process.argv.slice(2)], {
  env: {
    ...process.env,
    APP_VARIANT: 'development',
    EXPO_PUBLIC_APP_ENV: 'development',
  },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
