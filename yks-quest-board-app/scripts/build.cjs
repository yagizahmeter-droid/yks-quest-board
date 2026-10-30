const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.resolve(__dirname,'..'), out=path.join(root,'dist');
if(process.env.VERCEL_ENV==='production' || process.argv.includes('--production')) {
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'config.js'),'utf8'),context,{timeout:1000});
  const config=context.window.YKS_CONFIG;
  if(config?.supabaseUrl!=='https://jswgagzbetwviamiwcck.supabase.co')
    throw new Error('Production build blocked: config must use the existing live Supabase project.');
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.supabaseAnonKey || ''))
    throw new Error('Production build blocked: only a public Supabase publishable key is allowed.');
  if(process.env.VERCEL_PROJECT_ID && process.env.VERCEL_PROJECT_ID!=='prj_x2vIkhipW3ZaACfDAiOld1mXKZ4T')
    throw new Error('Production build blocked: unexpected Vercel project.');
  console.log('Production target verified: existing Vercel project and live Supabase.');
}
fs.mkdirSync(out,{recursive:true});
const assets=['index.html','config.js','sync.js','teacher.js','teacher-drafts.js','program-import.js','backgrounds.js','release-history.js','v111.css','quest-system.js','curriculum.js','personal-catalog.js','select-controls.js','quest-ui.css','ui.js','theme.js','ui.css','appearance.js','appearance.css','assets','service-worker.js','manifest.webmanifest','icons','vendor'];
assets.push('admin.js','admin.css','admin-preview.js','history-groups.js','focus-core.js','study.js','learning-ui.js','v113.css','v114.css');
assets.push('exams-core.js','exams.js','exams.css','experience.js','v121.css');
assets.push('classes.js','classes.css');
for(const asset of assets) fs.cpSync(path.join(root,asset),path.join(out,asset),{recursive:true});
console.log('Static D.E.R.S. assets prepared in dist; no account exports or tests included.');
