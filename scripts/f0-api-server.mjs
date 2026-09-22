// Local acceptance only. Reuse the authoritative server and disposable DB fixtures.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';

if (process.env.DIARY_DISPOSABLE_TEST_ENV !== '1') throw new Error('Set DIARY_DISPOSABLE_TEST_ENV=1');
// Fail before allocating a database if another server already owns the fixture port.
const probe = createServer();
await new Promise((accept, reject) => { probe.once('error', reject); probe.listen(3201, '127.0.0.1', accept); });
await new Promise((accept, reject) => probe.close(error => error ? reject(error) : accept()));
const source = resolve(process.env.DIARY_SOURCE_ROOT ?? '../diary-v3');
const require = createRequire(resolve(source, 'package.json'));
const reportDirectory = resolve('.scratch/f0-runtime');
const databaseUrl = new URL(process.env.DATABASE_URL ?? 'postgresql://diary:diary_local@127.0.0.1:55433/diary_v3');
if (!['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname)) throw new Error('Local PostgreSQL only');
const { Pool } = require('pg');
const admin = new Pool({ connectionString: databaseUrl.toString() });
const list = async () => new Set((await admin.query("select datname from pg_database where datname like 'diary_v3_e2e_%'")).rows.map(row => row.datname));
const before = await list();
process.chdir(source);
const { register } = await import(pathToFileURL(require.resolve('tsx/esm/api')).href);
register({ tsconfig: resolve(source, 'tsconfig.json') });
await import(pathToFileURL(resolve(source, 'scripts/e2e-server.ts')).href);
const created = [...await list()].filter(name => !before.has(name));
await admin.end();
if (created.length !== 1) {
  process.emit('SIGTERM');
  throw new Error('Could not uniquely identify this disposable database; do not guess a database name');
}
await mkdir(reportDirectory, { recursive: true });
await writeFile(resolve(reportDirectory, 'server.json'), JSON.stringify({ baseUrl: 'http://127.0.0.1:3201', databaseName: created[0] }, null, 2) + '\n');
if (process.env.DIARY_F1_TRANSPORT_PROBE === '1') {
  const { installF1TransportProbe } = await import('./f1-transport-probe.mjs');
  const server = process._getActiveHandles().find(handle => handle.constructor.name === 'Server' && handle.address()?.port === 3201);
  if (!server) throw new Error('Cannot identify the owned local fixture server');
  installF1TransportProbe(server);
}
// Unlike force-killing a Windows process, this invokes source-owned DB cleanup.
process.stdin.setEncoding('utf8');
process.stdin.on('data', text => {
  if (text.trim() === 'stop') { process.stdin.pause(); process.emit('SIGTERM'); }
});
process.stdin.resume();
console.log('Synthetic API started on 127.0.0.1:3201. Type stop to dispose its database.');
