const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  let requested; try { requested = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400).end(); return; }
  const asset = requested === '/' ? '/index.html' : requested;
  if (!/^\/(?:index\.html|config\.js|teacher\.js|sync\.js|service-worker\.js|manifest\.webmanifest|icons\/(?:icon\.svg|icon-(?:192|512)\.png)|vendor\/(?:supabase\.js|SUPABASE-LICENSE))$/.test(asset)) { res.writeHead(403).end(); return; }
  const file = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
  if (!file.startsWith(root+path.sep) || /(?:node_modules|\.pnpm-store|\.test-db|test-results|backups|tests|migrations|scripts|\.git)(?:[\\/]|$)/.test(requested)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => { if (error) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.setHeader('Cache-Control','no-store'); res.end(bytes); });
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`D.E.R.S. http://127.0.0.1:${server.address().port}`));
module.exports = server;
