// Disposable local acceptance only. No production fault injection or payload logging.
import http from 'node:http';

if (process.env.DIARY_DISPOSABLE_TEST_ENV !== '1') throw new Error('Requires a disposable test environment.');
let mode = 'normal';
let posts = 0;
let commits = 0;
const held = new Set();
const proxy = http.createServer((request, response) => {
  if (mode === 'offline') { request.socket.destroy(); return; }
  const mutation = request.method === 'POST' && request.url === '/api/diaries';
  if (mutation) posts++;
  if (mutation && ['http401', 'http503'].includes(mode)) {
    const status = mode === 'http401' ? 401 : 503;
    response.writeHead(status, { 'content-type': 'application/json', ...(status === 503 ? { 'retry-after': '0' } : {}) });
    response.end(JSON.stringify({ statusCode: status, statusMessage: 'Synthetic acceptance failure', data: { code: status === 401 ? 'AUTH_UNAUTHORIZED' : 'SERVICE_UNAVAILABLE', details: null, requestId: 'synthetic' } }));
    return;
  }
  const fault = mutation ? mode : 'normal';
  const upstream = http.request({ hostname: '127.0.0.1', port: 3201, method: request.method, path: request.url,
    headers: { ...request.headers, host: '127.0.0.1:3201' } }, result => {
    if (mutation && result.statusCode === 201) commits++;
    if (fault === 'drop' || fault === 'hold') {
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
    if (!['normal', 'offline', 'drop', 'hold', 'http401', 'http503'].includes(requested)) { response.writeHead(400).end(); return; }
    mode = requested;
    if (mode === 'normal') { for (const pending of held) pending.destroy(); held.clear(); }
  }
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ mode, posts, commits, held: held.size }));
});
proxy.listen(3101, '127.0.0.1');
control.listen(3102, '127.0.0.1', () => console.log('Disposable write proxy: API 3101, control 3102; no payload logging.'));
