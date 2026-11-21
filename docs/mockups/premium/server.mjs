import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
http.createServer((request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const file = path.resolve(directory, decodeURIComponent(url.pathname).slice(1) || 'index.html');
    if (!file.startsWith(directory + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(response);
  } catch { response.writeHead(400).end(); }
}).listen(4320, '127.0.0.1', () => process.stdout.write('KOCHIVO premium: http://127.0.0.1:4320\n'));
