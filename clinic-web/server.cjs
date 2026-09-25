const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const port = Number(process.env.PORT || 5500);

http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(__dirname, '.' + pathname);
  const relative = path.relative(__dirname, file);
  const allowed = pathname === '/index.html' || /^\/(js|css|assets)\//.test(pathname);
  if (!allowed || relative.startsWith('..') || path.isAbsolute(relative)) {
    response.writeHead(404).end(); return;
  }
  fs.readFile(file, (error, content) => {
    if (error) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`MediCare frontend: http://127.0.0.1:${port}\n`);
});
