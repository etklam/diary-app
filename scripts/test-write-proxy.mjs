// Disposable local acceptance only. No production fault injection or payload logging.
import http from 'node:http';

if (process.env.DIARY_DISPOSABLE_TEST_ENV !== '1') throw new Error('Requires a disposable test environment.');
let mode = 'normal';
let posts = 0;
let commits = 0;
let patches = 0;
let patchCommits = 0;
let forwardedPatches = 0;
const held = new Set();
const delayed = [];
const heldReads = new Set();
const proxy = http.createServer((request, response) => {
  if (mode === 'detail503' && request.method === 'GET' && /^\/api\/diaries\/[1-9]\d*$/.test(request.url)) { response.writeHead(503).end('Synthetic detail refresh failure'); return; }
  if (mode === 'offline') { request.socket.destroy(); return; }
  const post = request.method === 'POST' && request.url === '/api/diaries';
  const patch = request.method === 'PATCH' && /^\/api\/diaries\/[1-9]\d*\/review$/.test(request.url);
  const mutation = post || patch;
  if (post) posts++;
  if (patch) patches++;
  const committed = status => { if (post && status === 201) commits++; if (patch && status === 200) patchCommits++; };
  if (mutation && ['http401', 'http503'].includes(mode)) {
    const status = mode === 'http401' ? 401 : 503;
    response.writeHead(status, { 'content-type': 'application/json', ...(status === 503 ? { 'retry-after': '0' } : {}) });
    response.end(JSON.stringify({ statusCode: status, statusMessage: 'Synthetic acceptance failure', data: { code: status === 401 ? 'AUTH_UNAUTHORIZED' : 'SERVICE_UNAVAILABLE', details: null, requestId: 'synthetic' } }));
    return;
  }
  const fault = mutation ? mode : 'normal';
  const holdRead = mode === 'hold-reads' && request.method === 'GET' && /^\/api\/(diaries\/(summary|activity)|reviews)(\?|$)/.test(request.url);
  if (fault === 'delayed') {
    // Keep the accepted request alive upstream of the app's timeout. Release is
    // explicit so a reconciliation GET can observe the old database snapshot.
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks);
      delayed.push(() => {
        if (patch) forwardedPatches++;
        const upstream = http.request({ hostname: '127.0.0.1', port: 3201, method: request.method, path: request.url,
          headers: { ...request.headers, host: '127.0.0.1:3201' } }, result => {
          committed(result.statusCode);
          result.resume();
        });
        upstream.on('error', () => {}); upstream.end(body);
      });
      response.writeHead(504, { 'content-type': 'text/plain' }).end('Synthetic timeout; upstream remains pending');
    });
    return;
  }
  if (patch) forwardedPatches++;
  const upstream = http.request({ hostname: '127.0.0.1', port: 3201, method: request.method, path: request.url,
    headers: { ...request.headers, host: '127.0.0.1:3201' } }, result => {
    committed(result.statusCode);
    if (holdRead) {
      const chunks = [];
      result.on('data', chunk => chunks.push(chunk));
      result.on('end', () => {
        const release = () => { response.writeHead(result.statusCode, result.headers); response.end(Buffer.concat(chunks)); };
        if (response.destroyed) return;
        heldReads.add(release); response.on('close', () => heldReads.delete(release));
      });
    } else if (/^committed50[234]$/.test(fault)) {
      result.resume(); result.on('end', () => response.writeHead(Number(fault.slice(-3)), { 'content-type': 'text/plain' }).end('Synthetic gateway error after commit'));
    } else if (fault === 'drop' || fault === 'hold') {
      result.resume();
      result.on('end', () => {
        if (fault === 'drop') response.destroy();
        else { held.add(response); response.on('close', () => held.delete(response)); }
      });
    } else { response.writeHead(result.statusCode, result.headers); result.pipe(response); }
  });
  upstream.on('error', () => response.destroy());
  request.pipe(upstream);
});
const control = http.createServer((request, response) => {
  const requested = new URL(request.url, 'http://localhost').searchParams.get('mode');
  if (requested) {
    if (requested === 'release') { for (const send of delayed.splice(0)) send(); }
    else if (!['normal', 'offline', 'detail503', 'drop', 'hold', 'http401', 'http503', 'committed502', 'committed503', 'committed504', 'delayed', 'hold-reads'].includes(requested)) { response.writeHead(400).end(); return; }
    mode = requested;
    if (mode === 'normal') {
      for (const pending of held) pending.destroy(); held.clear();
      for (const release of heldReads) release(); heldReads.clear();
    }
  }
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ mode, posts, commits, patches, patchCommits, forwardedPatches, held: held.size, delayed: delayed.length, heldReads: heldReads.size }));
});
proxy.listen(3101, '127.0.0.1');
control.listen(3102, '127.0.0.1', () => console.log('Disposable write proxy: API 3101, control 3102; no payload logging.'));
