import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const phase = process.argv[2] ?? 'f0';
if (!/^f\d+$/.test(phase)) throw new Error('Expected a phase name such as f0 or f1');

const scope = ['src', 'scripts', 'tests', 'plugins', 'config', 'package.json', 'package-lock.json', 'app.config.ts', 'tsconfig.json', '.github/workflows/ci.yml'];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const hash = data => createHash('sha256').update(data).digest('hex');
const paths = [...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '--', ...scope).split('\n'))].filter(Boolean).sort();
const files = await Promise.all(paths.map(async path => ({ path, sha256: hash(await readFile(path)) })));
const report = { commit: git('rev-parse', 'HEAD'),
  changes: git('status', '--short', '--', ...scope).split('\n').filter(Boolean),
  scope: 'Allowlisted source/configuration and test helpers; excludes environment files, dependencies, databases and real user data',
  files, contentSha256: hash(JSON.stringify(files)) };
await mkdir(`docs/evidence/${phase}`, { recursive: true });
await writeFile(`docs/evidence/${phase}/app-source.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, contentSha256: report.contentSha256 }));
