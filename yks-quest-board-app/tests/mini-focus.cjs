const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
// Retain only synthetic session storage across reloads; no real account or API is used.
const fixture=fs.readFileSync(path.join(root,'admin-preview.js'),'utf8').replace("Object.defineProperty(window,'localStorage',{value:memory()});",'');
async function main(){let server,browser;const errors=[],remote=[],ledger=new Map();let loseReply=false,saves=0;
 try{
  let url=process.env.DERS_MINI_TEST_URL;
  if(!url){process.env.PORT='0';server=require('../scripts/server.cjs');if(!server.listening)await new Promise(r=>server.once('listening',r));url=`http://127.0.0.1:${server.address().port}/`;}
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',hasTouch:true});
  await context.route('**/*.supabase.co/**',r=>{remote.push(r.request().url());return r.abort();});
  await context.exposeFunction('miniTestLedger',(action,payload)=>{
   if(action==='read')return [...ledger.values()];
   saves++;
   for(const span of payload.segments){const old=ledger.get(span.id);if(old)assert.deepEqual(span,old,'Retry must not alter recorded time');else{assert.ok(![...ledger.values()].some(x=>x.started_at<span.ended_at&&x.ended_at>span.started_at),'Time spans must not overlap');ledger.set(span.id,span);}}
   if(loseReply){loseReply=false;return {data:null,error:{message:'Synthetic lost acknowledgement'}};}return {data:{saved:true},error:null};
  });
  await context.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'text/javascript',body:`document.currentScript.dataset.role='student';\n${fixture}\nconst originalClient=window.supabase.createClient;window.supabase.createClient=(...args)=>{const client=originalClient(...args),rpc=client.rpc;client.rpc=async(name,args)=>{if(name==='ders_learning'&&args.p_action==='save_segments')return window.miniTestLedger('save',args.p_payload);const result=await rpc(name,args);if(name==='ders_learning'&&['overview','report'].includes(args.p_action)&&result.data)result.data.segments=await window.miniTestLedger('read');return result;};return client;};`}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date(Date.now()-3600000)});
  await page.goto(url);await page.waitForFunction(()=>window.DersBoard?.user&&window.DersStudy?.loaded);
  const board=await page.evaluate(()=>JSON.stringify(window.DersBoard.state));
  const state=()=>page.evaluate(()=>structuredClone(window.DersStudy.session));
  const nav=route=>page.evaluate(route=>window.DersUI.navigate(route),route);
  const control=async name=>{assert.equal(await page.locator('#focusMiniPause').getAttribute('aria-label'),name);assert.equal(await page.locator('#focusMiniPause').getAttribute('title'),name);assert.equal(await page.locator('#focusMiniPause svg '+(name==='Duraklat'?'rect':'polygon')).count(),name==='Duraklat'?2:1);};
  const resetState=async()=>{const s=await state();assert.equal(s.status,'paused');assert.equal(s.phase,'work');assert.equal(s.cycle,1);assert.equal(s.remainingMs,120000);assert.equal(s.activeSince,null);assert.equal(await page.locator('#miniClock').textContent(),'00:02:00');await control('Devam et');};
  await nav('focus');await page.fill('#workMinutes','2');await page.fill('#breakMinutes','1');await page.locator('#focusRepeat').check();await page.locator('#focusAuto').check();await page.locator('#focusSound').uncheck();await page.click('#focusStart');await nav('home');await control('Duraklat');
  await page.clock.fastForward(10000);await page.click('#focusMiniPause');await control('Devam et');const paused=await state();assert.equal(paused.status,'paused');
  await page.click('#focusMiniPause');await control('Duraklat');await page.clock.fastForward(5000);await page.click('#focusMiniPause');
  const id=(await state()).id;await page.click('#focusMiniReset');await resetState();assert.equal((await state()).id,id);assert.equal((await state()).segments.length,2);
  await page.evaluate(()=>window.DersStudy.flush());assert.equal(ledger.size,2);
  await page.reload();await page.waitForFunction(()=>window.DersStudy?.loaded);await nav('home');await resetState();
  await nav('program');await control('Devam et');assert.ok(await page.locator('#focusMini').isVisible());await page.click('#focusMiniOpen');assert.ok(await page.locator('#focusResume').isVisible());assert.equal(await page.locator('#focusClock').textContent(),'00:02:00');
  await page.click('#focusResume');await nav('home');await control('Duraklat');await context.setOffline(true);await page.clock.fastForward(7000);await page.click('#focusMiniReset');await resetState();assert.equal(await page.evaluate(()=>window.DersStudy.pending),1);
  const pending=await page.evaluate(()=>window.DersStudy.segments());await page.click('#focusMiniReset');assert.deepEqual(await page.evaluate(()=>window.DersStudy.segments()),pending);
  loseReply=true;await context.setOffline(false);await page.evaluate(()=>window.DersStudy.flush());await page.evaluate(()=>window.DersStudy.flush());await page.waitForFunction(()=>window.DersStudy.pending===0);assert.equal(ledger.size,3);assert.ok(saves>=4);
  await page.click('#focusMiniPause');await page.clock.fastForward(125000);assert.equal((await state()).phase,'break');const beforeBreak=ledger.size;await page.click('#focusMiniReset');await resetState();await page.evaluate(()=>window.DersStudy.flush());assert.equal(ledger.size,beforeBreak);
  await page.click('#focusMiniPause');await page.clock.fastForward(3000);await page.reload();await page.waitForFunction(()=>window.DersStudy?.loaded);await nav('home');await control('Duraklat');assert.equal((await state()).status,'running');await page.click('#focusMiniReset');await resetState();await page.evaluate(()=>window.DersStudy.flush());
  const spans=[...ledger.values()].sort((a,b)=>a.started_at.localeCompare(b.started_at));for(let i=1;i<spans.length;i++)assert.ok(spans[i].started_at>=spans[i-1].ended_at);assert.equal(new Set(spans.map(s=>s.id)).size,spans.length);
  const total=spans.reduce((n,s)=>n+Date.parse(s.ended_at)-Date.parse(s.started_at),0);assert.ok(total>=145000&&total<155000,`Net time must exclude pause/break/reset time: ${total}`);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.DersBoard.state)),board,'Tasks, XP and task history unchanged');
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});let cases=0;
  for(const width of [360,390,430,1440])for(const style of ['classic','glass'])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await page.evaluate(({style,theme})=>{window.DersTheme.setStyle(style);window.DersTheme.set(theme);},{style,theme});
   const bounds=await page.locator('#focusMini').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height,viewport:innerWidth};});assert.ok(bounds.left>=0&&bounds.right<=width&&bounds.width<=350&&bounds.height<=90,JSON.stringify(bounds));
   for(const id of ['focusMiniPause','focusMiniReset']){const r=await page.locator('#'+id).boundingBox();assert.ok(r.width>=44&&r.height>=44);}
   await page.locator('#focusMiniPause').tap();await control('Duraklat');await page.locator('#focusMiniReset').tap();await resetState();cases++;
   if(width===390||width===1440)await page.screenshot({path:path.join(root,'test-results',`mini-focus-${width}-${style}-${theme}.png`)});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  const result={passed:true,cases,resetWhileRunning:true,resetWhilePaused:true,resetDuringBreak:true,reloadPaused:true,reloadRunning:true,navigation:true,mainAndMiniSynchronized:true,offlineRetryDeduplicated:true,taskXpHistoryUnchanged:true,databaseRequests:remote.length};fs.writeFileSync(path.join(root,'test-results','mini-focus-result.json'),JSON.stringify(result,null,2));console.log('PASS Mini focus',JSON.stringify(result));
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
