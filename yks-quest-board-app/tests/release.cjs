const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'ders-release-'));
const liveUrl='https://jswgagzbetwviamiwcck.supabase.co';
const configSource=fs.readFileSync(path.join(root,'config.js'),'utf8');
const liveFixture=`window.YKS_CONFIG = { supabaseUrl: '${liveUrl}', supabaseAnonKey: 'sb_publishable_ejzua9mwzTFTn6hsUtm-gQ_FqFKmrwF' };\n`;
const releaseConfig=configSource.includes(liveUrl)?configSource:liveFixture;
let checks=0;
const current=require('../package.json').version;
const publicAssets=['config.js','index.html','sync.js','teacher.js','teacher-drafts.js','program-import.js','backgrounds.js','release-history.js','v111.css','admin.js','admin.css','admin-preview.js','history-groups.js','quest-system.js','curriculum.js','personal-catalog.js','select-controls.js','quest-ui.css','ui.js','theme.js','ui.css','appearance.js','appearance.css','assets','service-worker.js','manifest.webmanifest','icons','vendor','focus-core.js','study.js','learning-ui.js','v113.css','v114.css','exams-core.js','exams.js','exams.css','experience.js','v121.css'];
function pass(message){checks++;console.log('PASS release',message);}
try {
  for(const asset of [...publicAssets,'scripts'])
    fs.cpSync(path.join(root,asset),path.join(fixture,asset),{recursive:true});
  const fixtureConfig=path.join(fixture,'config.js');
  const run=(env={},flags=[])=>spawnSync(process.execPath,['-r',path.join(fixture,'scripts/windows-realpath.cjs'),path.join(fixture,'scripts/build.cjs'),...flags],{
    cwd:fixture,encoding:'utf8',windowsHide:true,env:{...process.env,VERCEL_ENV:'production',VERCEL_PROJECT_ID:'prj_x2vIkhipW3ZaACfDAiOld1mXKZ4T',...env}
  });
  if (!configSource.includes(liveUrl)) { const blocked=run();assert.notEqual(blocked.status,0);assert.ok(blocked.stderr.includes('existing live Supabase project'));pass('Current preview configuration cannot build for production'); }
  fs.writeFileSync(fixtureConfig,releaseConfig);
  let result=run();assert.equal(result.status,0,result.stderr);
  const builtConfig=fs.readFileSync(path.join(fixture,'dist/config.js'),'utf8');
  assert.equal(builtConfig,releaseConfig);assert.ok(builtConfig.includes(liveUrl));
  assert.equal(/hswipswqulolcwqvcjvi|sb_secret_|service_role/.test(builtConfig),false);
  pass('Production artifact contains the exact live public configuration');
  assert.ok(fs.readFileSync(path.join(fixture,'dist/index.html'),'utf8').includes('class="app-version"'));
  assert.deepEqual(fs.readdirSync(path.join(fixture,'dist')).sort(),publicAssets.slice().sort());
  const html=fs.readFileSync(path.join(fixture,'dist/index.html'),'utf8');
  assert.ok(html.includes('aria-label="Sürüm geçmişini aç">v'+current+'</button>'));
  assert.ok(!html.includes('v'+current+' · Önizleme'));
  const releases=require('../release-history.js').releases;
  assert.equal(releases[0].version,current);assert.equal(releases[0].date,'2026-10-30');assert.equal(releases[0].sections.length,4);
  assert.equal(releases.filter(r=>r.version===current).length,1);
  assert.match(fs.readFileSync(path.join(fixture,'dist/service-worker.js'),'utf8'),new RegExp('ders-pwa-v'+current.replaceAll('.','-')+'-release-r\\d+'));
  for(const asset of ['theme-vine.svg','theme-cloud-light.svg','theme-cloud-dark.svg'])assert.ok(fs.existsSync(path.join(fixture,'dist/assets',asset)));
  pass('Release includes only public assets, current identity, dated sectioned notes and its PWA cache');
  fs.writeFileSync(fixtureConfig,releaseConfig.replace(liveUrl,'https://hswipswqulolcwqvcjvi.supabase.co'));
  result=run();assert.notEqual(result.status,0);assert.ok(result.stderr.includes('existing live Supabase project'));
  pass('Vercel production environment rejects staging configuration');
  result=run({VERCEL_ENV:'preview'},['--production']);assert.notEqual(result.status,0);
  pass('Explicit local production validation also rejects staging');
  fs.writeFileSync(fixtureConfig,releaseConfig.replace(/sb_publishable_[A-Za-z0-9_-]+/,'sb_secret_forbidden'));
  result=run();assert.notEqual(result.status,0);assert.ok(result.stderr.includes('public Supabase publishable key'));
  pass('Private API keys cannot enter a production artifact');
  fs.writeFileSync(fixtureConfig,releaseConfig);
  result=run({VERCEL_PROJECT_ID:'prj_unrelated'});assert.notEqual(result.status,0);assert.ok(result.stderr.includes('unexpected Vercel project'));
  pass('Wrong Vercel project fails before building');
  result=run({VERCEL_PROJECT_ID:''},['--production']);assert.equal(result.status,0,result.stderr);
  pass('Production validation works locally without Vercel system variables');
  console.log(`RESULT: ${checks} production release checks passed; no remote writes`);
} finally {fs.rmSync(fixture,{recursive:true,force:true});}
