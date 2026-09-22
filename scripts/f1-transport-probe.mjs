// Local synthetic API instrumentation. Never log headers, credentials or payloads.
import { createServer } from 'node:http';

export function installF1TransportProbe(server) {
  if (process.env.DIARY_DISPOSABLE_TEST_ENV !== '1' || server.address()?.port !== 3201) throw new Error('F1 disposable server required');
  let mode = 'normal';
  let requests = 0;
  let committed = 0;
  let dropped = 0;
  const observe = (request, response) => {
    if (request.method !== 'POST' || request.url !== '/api/auth/logout-all') return;
    requests++;
    if (mode !== 'drop') {
      response.once('finish', () => { if (response.statusCode === 200) committed++; });
      return;
    }
    // Let the real handler commit, then discard its response before any bytes leave.
    let status;
    response.writeHead = code => { status = code; return response; };
    response.write = () => true;
    response.end = () => { if (status === 200) committed++; dropped++; response.destroy(); return response; };
  };
  server.prependListener('request', observe);
  const control = createServer((request, response) => {
    const next = new URL(request.url, 'http://localhost').searchParams.get('mode');
    if (next && !['normal', 'drop'].includes(next)) { response.writeHead(400).end(); return; }
    if (next) mode = next;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ mode, requests, committed, dropped }));
  });
  control.listen(3211, '127.0.0.1');
  server.once('close', () => { server.removeListener('request', observe); control.close(); });
  return { close: () => { server.removeListener('request', observe); control.close(); } };
}
