// Minimal static server for browser tests: node tests/browser/serve.mjs <dir> <port>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [dir, port] = [path.resolve(process.argv[2]), +process.argv[3]];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
// test control: GET /__delay?ms=N delays every later response for the app page by N ms (0 = off), to simulate a weak signal
let pageDelay = 0;
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__delay') { pageDelay = +u.searchParams.get('ms') || 0; res.writeHead(200).end('ok'); return; }
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end('not found'); return; }
  const send = () => { res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); fs.createReadStream(f).pipe(res); };
  if (pageDelay && /\/(index\.html)?$/.test(p)) setTimeout(send, pageDelay); else send();
}).listen(port, () => console.log(`serving ${dir} on http://localhost:${port}/`));
