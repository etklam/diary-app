import net from 'node:net';

const listenHost = process.env.DIARY_PROXY_HOST ?? '127.0.0.1';
const listenPort = Number(process.env.DIARY_PROXY_PORT ?? '3101');
const upstreamHost = process.env.DIARY_UPSTREAM_HOST ?? '127.0.0.1';
const upstreamPort = Number(process.env.DIARY_UPSTREAM_PORT ?? '3201');
if (![listenPort, upstreamPort].every(Number.isSafeInteger)) throw new Error('Proxy ports must be integers.');

const server = net.createServer((client) => {
  const upstream = net.connect({ host: upstreamHost, port: upstreamPort });
  client.pipe(upstream);
  upstream.pipe(client);
  const closeBoth = () => { client.destroy(); upstream.destroy(); };
  client.on('error', closeBoth);
  upstream.on('error', closeBoth);
});
server.listen(listenPort, listenHost, () => {
  console.log(`TCP fault proxy listening on ${listenHost}:${listenPort} -> ${upstreamHost}:${upstreamPort}`);
});
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
