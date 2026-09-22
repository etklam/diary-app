import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve(process.env.DIARY_SOURCE_ROOT ?? '../diary-v3');
const output = 'docs/evidence/f0/source-baseline.json';
const git = (...args) => execFileSync('git', ['-c', `safe.directory=${source.replaceAll('\\', '/')}`, '-C', source, ...args], { encoding: 'utf8' }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFile(resolve(source, path), 'utf8');
const paths = git('ls-files').split('\n').filter(path =>
  /^(apps\/(api|web)\/|packages\/(contracts|api-client|domain|db)\/|tests\/|scripts\/|openapi\/|docs\/|PRODUCT\.md$|PLAN\.md$|package(-lock)?\.json$)/.test(path)
  && !/(^|\/)(\.env[^/]*|node_modules|dist|build)(\/|$)/.test(path)
  && /\.(ts|tsx|js|mjs|cjs|json|md|sql|yaml|yml|sh)$/.test(path));
const files = [];
const tests = [];
for (const path of paths) {
  const content = await read(path);
  files.push({ path, sha256: hash(content) });
  if (/^tests\/.*\.(test|spec)\.ts$/.test(path)) tests.push({ path, content });
}
const spec = JSON.parse(await read('openapi/openapi.json'));
function home(path) {
  if (path.startsWith('/api/agent/')) return 'External Agent service; native provenance in Diary/Research';
  if (path === '/api/og/discipline.svg') return 'Web social preview; More / Discipline native share equivalent';
  if (path.startsWith('/api/blog')) return 'More / Articles and publishing';
  if (path.startsWith('/api/admin')) return 'More / Administration';
  if (path.startsWith('/api/auth') || path.startsWith('/api/user') || path.startsWith('/api/api-keys')) return 'More / Account, preferences and API keys';
  if (/^\/api\/(partners|discipline|alerts)/.test(path) || path.startsWith('/api/stocks/alerts')) return 'More / Partners, Discipline and reminders';
  if (path === '/api/portfolio/overview') return 'Overview';
  if (/^\/api\/(stats|portfolio)/.test(path) || /^\/api\/stocks\/(holdings|portfolio|prices|exposure|attention)$/.test(path)) return 'Portfolio';
  if (/^\/api\/(diaries|trade-plans|reviews|holidays)/.test(path)) return 'Diary / Library, Calendar, Review and Plans';
  return 'Research / Company, Watchlist and tools';
}
const operations = [];
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    const prefix = path.split('/{')[0];
    const examples = tests.filter(test => test.content.includes(prefix)).map(test => test.path);
    const security = operation.security ?? spec.security ?? [];
    const admin = path.startsWith('/api/admin/') || (path.startsWith('/api/blog') && (method !== 'get' || path.includes('/admin')));
    const role = admin ? 'ADMIN' : path.startsWith('/api/agent/') ? 'Scoped Agent API key' :
      (!security.length || security.some(option => !Object.keys(option).length)) ? 'Public or credential-bearing auth operation (see request schema)' :
        'Authenticated USER or ADMIN; owner/sharing checks remain mandatory';
    operations.push({ method: method.toUpperCase(), path, operationId: operation.operationId ?? null,
      summary: operation.summary ?? null, description: operation.description ?? null,
      security, role, nativeHome: home(path),
      dataEffect: method === 'get' ? 'Read/projection/download; see response contract' : 'Server-authorized mutation; see request and linked behavioral fixtures',
      parameters: operation.parameters ?? [], requestBody: operation.requestBody ?? null,
      responses: operation.responses, syntheticTestCandidates: examples,
      syntheticTestCommand: `npm test -- ${examples.filter(path => path.startsWith('tests/integration/')).join(' ') || examples.join(' ')}`,
      authorizationReview: 'Read linked source tests and handler; OpenAPI security does not encode all owner/role/scope checks.' });
  }
}
const matrix = await readFile('docs/feature-parity.md', 'utf8');
const issues = await readFile('.scratch/diary-app-full-parity/ISSUES.md', 'utf8');
const capabilities = [...matrix.matchAll(/^\| ([ADRP TNSCX]\d{2}) \|/gm)].map(match => match[1]);
const stories = [...new Set([...issues.matchAll(/US-\d{3}/g)].map(match => match[0]))].sort();
const registry = await read('apps/web/app/routes.ts');
const routes = [...registry.matchAll(/(?:route\('([^']+)',\s*'([^']+)'|index\('([^']+)')/g)]
  .map(match => ({ path: match[1] ?? '/', file: match[2] ?? match[3] }));
assert.equal(new Set(capabilities).size, 51);
assert.equal(stories.length, 114);
assert.equal(routes.length, 52);
for (const route of routes) assert(matrix.includes(route.path === '/' ? 'home' : route.path), `Unmapped route ${route.path}`);
const manifest = {
  schemaVersion: 1, sourceCommit: git('rev-parse', 'HEAD'),
  sourceChanges: git('status', '--short', '--untracked-files=no').split('\n').filter(Boolean),
  sourceScope: 'Tracked product, contracts, domain, database, behavioral tests and operational source; no environment files, dependencies or user data.',
  openApiSha256: hash(await read('openapi/openapi.json')),
  routeRegistrySha256: hash(registry), capabilities, stories, routes, files, operations,
  reviewNotes: [
    'Candidate test links are source evidence, not a claim that every operation has been executed on native.',
    'Web-only sitemap/redirect/design-preview and service operations are mapped in docs/feature-parity.md.',
    'Current API snapshot is unchanged from the previous mobile artifact; domain changes are documented in shared-packages.md.',
  ],
};
const content = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(await readFile(output, 'utf8'), content, 'Source baseline drift: review and refreeze explicitly');
else { await mkdir('docs/evidence/f0', { recursive: true }); await writeFile(output, content); }
console.log(JSON.stringify({ result: 'PASS', capabilities: capabilities.length, stories: stories.length, routes: routes.length,
  files: files.length, operations: operations.length, operationsWithoutTestCandidate: operations.filter(item => !item.syntheticTestCandidates.length).length,
  sha256: hash(content) }));
