// Synthetic native image acceptance only. No API credentials or user content.
import { createServer } from 'node:http';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

if (process.env.DIARY_DISPOSABLE_TEST_ENV !== '1') throw new Error('Disposable fixture required');
function chunk(kind, data) {
  const bytes = Buffer.concat([Buffer.from(kind), data]);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, bytes, checksum]);
}
const header = Buffer.alloc(13); header.writeUInt32BE(120); header.writeUInt32BE(60, 4); header[8] = 8; header[9] = 2;
const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: 120 }, () => [65, 125, 195]).flat())]);
const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.concat(Array(60).fill(row)))), chunk('IEND', Buffer.alloc(0))]);
const requests = [];
const server = createServer((request, response) => {
  const found = request.url?.startsWith('/pixel.png?fixture=');
  requests.push({ image: found ? 'valid' : 'missing', authorization: !!request.headers.authorization, cookie: !!request.headers.cookie });
  writeFileSync('docs/evidence/f1/native/image-requests.json', JSON.stringify(requests, null, 2) + '\n');
  response.writeHead(found ? 200 : 404, { 'content-type': found ? 'image/png' : 'text/plain' });
  response.end(found ? png : 'Synthetic missing image');
});
server.listen(3210, '127.0.0.1', () => console.log('READY'));
process.stdin.on('data', () => server.close(() => process.exit(0)));
