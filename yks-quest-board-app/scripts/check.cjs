const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const files=['ui.js','theme.js','appearance.js','program-composer.js','teacher.js','teacher-drafts.js','program-import.js','backgrounds.js','release-history.js','quest-system.js','curriculum.js','personal-catalog.js','select-controls.js','sync.js','service-worker.js'];
files.push('password-policy.js','week-dates.js');
files.push('admin.js','admin-preview.js','history-groups.js','focus-core.js','study.js','learning-ui.js');
files.push('exams-core.js','exams.js','experience.js');
files.push('class-model.js','class-dom.js','classes.js','teacher-workspace.js','program-tools.js','teacher-insights.js','program-schedules.js','teacher-actions.js');
files.push('admin-preview-workspace.js','admin-preview-classes.js','motion-ledger.js','motion.js','motion-ui.js');
for (const file of files) new vm.Script(fs.readFileSync(path.join(root,file),'utf8'), { filename:file });
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (match[1].trim()) new vm.Script(match[1], { filename:'index.html inline script' });
const shell=fs.readFileSync(path.join(root,'admin-preview.html'),'utf8');for(const m of shell.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:'admin-preview.html'});
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
