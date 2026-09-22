import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = resolve('vendor/shared-packages');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const previous = JSON.parse(await readFile(resolve(root, 'previous/manifest.json'), 'utf8'));
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const hash = data => createHash('sha256').update(data).digest('hex');
for (const item of manifest.packages) {
  const relative = item.tarball.replaceAll('\\', '/');
  const path = resolve(root, relative);
  assert(path.startsWith(root + sep), 'Artifact must stay inside vendor directory');
  assert.equal(hash(await readFile(path)), item.sha256, `${item.name} artifact digest`);
  assert.equal(packageJson.dependencies[item.name], `file:vendor/shared-packages/${relative}`);
  const installed = JSON.parse(await readFile(resolve('node_modules', item.name, 'PROVENANCE.json'), 'utf8'));
  assert.deepEqual(installed, item.provenance);
  const old = previous.packages.find(candidate => candidate.name === item.name);
  for (const exported of old.exports) assert(item.exports.includes(exported), `Removed export ${item.name}:${exported}`);
  for (const exported of item.exports) await import(exported === '.' ? item.name : item.name + exported.slice(1));
}
// This baseline has identical contracts. Any future drift requires an explicit review
// and new previous-client fixtures, rather than silently weakening this gate.
assert.equal(manifest.openApiSha256, previous.openApiSha256, 'OpenAPI changed: review previous-client compatibility');
console.log('PASS: tarball hashes, installed provenance, additive exports, runtime imports and unchanged API baseline');
