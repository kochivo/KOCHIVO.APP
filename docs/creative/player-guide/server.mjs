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
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.ts': 'application/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const alias = aliases.find(([prefix]) => pathname.startsWith(prefix));
    const base = alias ? alias[1] : directory;
    const relative = alias ? pathname.slice(alias[0].length) : pathname.slice(1) || 'index.html';
    const filename = path.resolve(base, relative);
    if (!filename.startsWith(base + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      response.writeHead(404).end(); return;
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(filename).pipe(response);
  } catch { response.writeHead(400).end(); }
});
server.listen(4319, '127.0.0.1', () => process.stdout.write('KOCHIVO player guide: http://127.0.0.1:4319\n'));
