import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../..');
const aliases = [
  ['/brand-fonts/', path.join(repository, 'branding identity/01-brand-assets/fonts/app-webfonts')],
  ['/brand-png/', path.join(repository, 'branding identity/01-brand-assets/png')],
  ['/brand-tokens/', path.join(repository, 'branding identity/06-design-tokens')],
];
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8', '.ts': 'application/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.mp4': 'video/mp4' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const alias = aliases.find(([prefix]) => pathname.startsWith(prefix));
  const base = alias ? alias[1] : directory;
  const relative = alias ? pathname.slice(alias[0].length) : pathname.slice(1) || 'index.html';
  const filename = path.resolve(base, relative);
  if (!filename.startsWith(base + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    response.writeHead(404).end();
    return;
  }
  const size = fs.statSync(filename).size;
  const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const headers = { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
  if (range) {
    const start = Number(range[1]);
    const end = Math.min(Number(range[2] || size - 1), size - 1);
    if (start > end || start >= size) { response.writeHead(416).end(); return; }
    response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    fs.createReadStream(filename, { start, end }).pipe(response);
  } else {
    response.writeHead(200, { ...headers, 'Content-Length': size });
    fs.createReadStream(filename).pipe(response);
  }
});
server.listen(4318, '127.0.0.1', () => process.stdout.write('KOCHIVO reel preview: http://127.0.0.1:4318\n'));
