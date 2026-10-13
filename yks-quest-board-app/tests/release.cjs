const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'ders-release-'));
const liveUrl='https://jswgagzbetwviamiwcck.supabase.co';
const configSource=fs.readFileSync(path.join(root,'config.js'),'utf8');
let checks=0;
function pass(message){checks++;console.log('PASS release',message);}
try {
  for(const asset of ['config.js','index.html','sync.js','teacher.js','ui.js','theme.js','ui.css','appearance.js','appearance.css','assets','service-worker.js','manifest.webmanifest','icons','vendor','scripts'])
    fs.cpSync(path.join(root,asset),path.join(fixture,asset),{recursive:true});
  const fixtureConfig=path.join(fixture,'config.js');
  const run=(env={},flags=[])=>spawnSync(process.execPath,['-r',path.join(fixture,'scripts/windows-realpath.cjs'),path.join(fixture,'scripts/build.cjs'),...flags],{
    cwd:fixture,encoding:'utf8',windowsHide:true,env:{...process.env,VERCEL_ENV:'production',VERCEL_PROJECT_ID:'prj_x2vIkhipW3ZaACfDAiOld1mXKZ4T',...env}
  });
  let result=run();assert.equal(result.status,0,result.stderr);
  const builtConfig=fs.readFileSync(path.join(fixture,'dist/config.js'),'utf8');
  assert.equal(builtConfig,configSource);assert.ok(builtConfig.includes(liveUrl));
  assert.equal(/hswipswqulolcwqvcjvi|sb_secret_|service_role/.test(builtConfig),false);
  pass('Production artifact contains the exact live public configuration');
  assert.ok(fs.readFileSync(path.join(fixture,'dist/index.html'),'utf8').includes('class="app-version"'));
  assert.deepEqual(fs.readdirSync(path.join(fixture,'dist')).sort(),['config.js','icons','index.html','manifest.webmanifest','service-worker.js','sync.js','teacher.js','theme.js','ui.css','ui.js','appearance.js','appearance.css','assets','vendor'].sort());
  pass('Release includes v1.0.1 and only public application assets');
  fs.writeFileSync(fixtureConfig,configSource.replace(liveUrl,'https://hswipswqulolcwqvcjvi.supabase.co'));
  result=run();assert.notEqual(result.status,0);assert.ok(result.stderr.includes('existing live Supabase project'));
  pass('Vercel production environment rejects staging configuration');
  result=run({VERCEL_ENV:'preview'},['--production']);assert.notEqual(result.status,0);
  pass('Explicit local production validation also rejects staging');
  fs.writeFileSync(fixtureConfig,configSource.replace(/sb_publishable_[A-Za-z0-9_-]+/,'sb_secret_forbidden'));
  result=run();assert.notEqual(result.status,0);assert.ok(result.stderr.includes('public Supabase publishable key'));
  pass('Private API keys cannot enter a production artifact');
  fs.writeFileSync(fixtureConfig,configSource);
  result=run({VERCEL_PROJECT_ID:'prj_unrelated'});assert.notEqual(result.status,0);assert.ok(result.stderr.includes('unexpected Vercel project'));
  pass('Wrong Vercel project fails before building');
  result=run({VERCEL_PROJECT_ID:''},['--production']);assert.equal(result.status,0,result.stderr);
  pass('Production validation works locally without Vercel system variables');
  console.log(`RESULT: ${checks} production release checks passed; no remote writes`);
} finally {fs.rmSync(fixture,{recursive:true,force:true});}
