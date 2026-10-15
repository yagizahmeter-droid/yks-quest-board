const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const files=['ui.js','theme.js','appearance.js','teacher.js','quest-system.js','curriculum.js','personal-catalog.js','select-controls.js','sync.js','service-worker.js'];
for (const file of files) new vm.Script(fs.readFileSync(path.join(root,file),'utf8'), { filename:file });
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (match[1].trim()) new vm.Script(match[1], { filename:'index.html inline script' });
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML ids');
if (/sb_secret_|service_role/.test(fs.readFileSync(path.join(root,'config.js'),'utf8'))) throw new Error('Private API key in browser config');
const icons = require('../vendor/lucide.js').icons;
const iconSources=html+files.map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
for (const m of iconSources.matchAll(/data-lucide="([a-z-]+)"/g)) {
  const name = m[1].split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join('');
  if (!icons[name] && !icons[m[1]]) throw new Error('Unknown Lucide icon: '+m[1]);
}
console.log('JavaScript syntax, unique HTML IDs and public configuration checks passed.');
