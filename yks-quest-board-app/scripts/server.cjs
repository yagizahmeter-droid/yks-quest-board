const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp' };
const server = http.createServer((req, res) => {
  let requested; try { requested = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400).end(); return; }
  const asset = requested === '/' ? '/index.html' : requested;
  if(['/focus-core.js','/study.js','/learning-ui.js','/v113.css'].includes(asset)){res.setHeader('Content-Type',types[path.extname(asset)]);fs.createReadStream(path.join(root,asset.slice(1))).pipe(res);return;}
  if(/^\/icons\/ders-(?:v3\.svg|(?:16|32|192|512|apple|maskable)-v3\.png)$/.test(asset)){res.setHeader('Content-Type',types[path.extname(asset)]);fs.createReadStream(path.join(root,asset.slice(1))).pipe(res);return;}
  if(['/admin.js','/admin.css','/admin-preview.js','/history-groups.js','/program-import.js','/backgrounds.js','/release-history.js','/v111.css'].includes(asset)){res.setHeader('Content-Type',types[path.extname(asset)]);fs.createReadStream(path.join(root,asset.slice(1))).pipe(res);return;}
  if (!/^\/(?:index\.html|config\.js|teacher(?:-drafts)?\.js|quest-system\.js|curriculum\.js|personal-catalog\.js|select-controls\.js|quest-ui\.css|sync\.js|ui\.js|theme\.js|ui\.css|appearance\.(?:js|css)|assets\/(?:background-(?:light|dark)\.webp|brand-mark\.svg)|service-worker\.js|manifest\.webmanifest|icons\/(?:ders-v2\.svg|ders-(?:192|512|maskable|apple)-v2\.png)|vendor\/(?:supabase\.js|lucide\.js|SUPABASE-LICENSE|LUCIDE-LICENSE))$/.test(asset)) { res.writeHead(403).end(); return; }
  const file = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
  if (!file.startsWith(root+path.sep) || /(?:node_modules|\.pnpm-store|\.test-db|test-results|backups|tests|migrations|scripts|\.git)(?:[\\/]|$)/.test(requested)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => { if (error) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.setHeader('Cache-Control','no-store'); res.end(bytes); });
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`D.E.R.S. http://127.0.0.1:${server.address().port}`));
module.exports = server;
