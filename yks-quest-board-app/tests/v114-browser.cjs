const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline');
const fixture=fs.readFileSync(path.join(root,'admin-preview.js'),'utf8');
async function main(){let server,browser;const errors=[],remote=[];
 try{
  process.env.PORT='0';server=require('../scripts/server.cjs');if(!server.listening)await new Promise(r=>server.once('listening',r));
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',hasTouch:true,isMobile:true});
  await c.route('**/*.supabase.co/**',r=>{remote.push(r.request().url());return r.abort();});
  await c.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'text/javascript',body:`document.currentScript.dataset.role='teacher';\n${fixture}\nconst make=window.supabase.createClient;window.supabase.createClient=(...args)=>{const c=make(...args),rpc=c.rpc;c.rpc=async(name,args)=>name==='ders_admin_status'?{data:true,error:null}:name==='ders_admin_record_event'?{data:null,error:null}:rpc(name,args);c.from=()=>{const q={select:()=>q,order:()=>q,limit:async()=>({data:[],error:null}),insert:async()=>({data:null,error:null})};return q;};return c;};`}));
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.DERS_V114_URL||`http://127.0.0.1:${server.address().port}/`);await p.waitForFunction(()=>window.DersStudy?.loaded);await p.locator('#adminButton').waitFor({state:'attached'});
  await p.evaluate(async()=>{const w=DersBoard.week(),base=w.quests[0];w.quests=Array.from({length:250},(_,i)=>({...base,id:'perf-'+i,title:'Güvenli test '+i}));await DersBoard.client.rpc('ders_action',{p_action:'sync_board',p_payload:{state:structuredClone(DersBoard.state)}});DersBoard.render();DersUI.navigate('focus');});
  await p.locator('#focusSound').uncheck();await p.click('#focusStart');await p.evaluate(()=>DersUI.navigate('program'));
  await p.evaluate(()=>{window.miniMutations=0;window.miniLongTasks=[];new MutationObserver(r=>window.miniMutations+=r.length).observe(document.body,{subtree:true,childList:true,attributes:true});new PerformanceObserver(list=>miniLongTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:false});});
  const perf=await c.newCDPSession(p);await perf.send('Performance.enable');const before=(await perf.send('Performance.getMetrics')).metrics;await p.waitForTimeout(5000);const after=(await perf.send('Performance.getMetrics')).metrics;
  const values=await p.evaluate(()=>({mutations:miniMutations,longTasks:miniLongTasks}));values.scriptMs=Math.round((after.find(m=>m.name==='ScriptDuration').value-before.find(m=>m.name==='ScriptDuration').value)*1000);values.layouts=after.find(m=>m.name==='LayoutCount').value-before.find(m=>m.name==='LayoutCount').value;
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});fs.writeFileSync(path.join(root,'test-results',baseline?'v114-perf-before.json':'v114-perf-after.json'),JSON.stringify(values,null,2));console.log('PERFORMANCE',JSON.stringify(values));
  await p.click('#toggleNavigation');await p.click('#adminButton');await p.waitForTimeout(500);const opened=await p.locator('#adminDialog').evaluate(el=>el.open);console.log('MOBILE_ADMIN_OPEN',opened);
  if(baseline)return;
  assert.ok(opened,'Mobile admin handoff must not be cancelled by drawer popstate');assert.equal(await p.locator('body').evaluate(el=>el.classList.contains('drawer-open')),false);
  await p.evaluate(()=>DersTheme.setStyle('natural'));
  await p.click('[data-preview-role=student]');let f=await(await p.locator('.admin-frame').elementHandle()).contentFrame();await f.waitForFunction(()=>window.DersBoard?.user&&window.DersUI);await f.locator('#programPage').waitFor({state:'visible'});assert.equal(await p.locator('.admin-frame').getAttribute('sandbox'),'allow-scripts allow-forms');
  assert.equal(await f.locator('html').getAttribute('data-appearance'),'natural');assert.match(await f.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--vine')),/data:image\/svg\+xml/);
  await p.evaluate(()=>DersTheme.setStyle('cloud'));
  await p.click('[data-preview-role=teacher]');f=await(await p.locator('.admin-frame').elementHandle()).contentFrame();await f.locator('#teacherPanel [data-action=student]').waitFor();await p.click('#adminReset');await p.waitForFunction(()=>document.querySelector('.admin-frame')&&document.querySelector('#adminReturn:not([hidden])'));await p.click('#adminReturn');await p.locator('#adminNoteForm').waitFor({state:'visible'});
  await p.fill('#adminNoteBody','İlk satır');await p.locator('#adminNoteBody').press('Enter');await p.locator('#adminNoteBody').pressSequentially('İkinci satır');assert.equal(await p.inputValue('#adminNoteBody'),'İlk satır\nİkinci satır');assert.equal(await p.locator('#adminNoteStatus').textContent(),'');
  await p.locator('#adminNoteBody').fill('');await p.evaluate(()=>{document.querySelector('#adminNoteList').innerHTML='<li><p>Güvenli kaydırma testi</p></li>'.repeat(100);DersUI.clearDirty(document.querySelector('#adminDialog'));});await p.mouse.move(200,500);await p.mouse.wheel(0,500);await p.waitForFunction(()=>document.querySelector('#adminDialog').scrollTop>100);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#adminDialog').open);
  await p.evaluate(()=>DersStudy.act('finish'));
  await p.evaluate(async()=>{const w=DersBoard.week(),base=w.quests[0];w.quests=Array.from({length:250},(_,i)=>({...base,id:'scroll-'+i}));await DersBoard.client.rpc('ders_action',{p_action:'sync_board',p_payload:{state:structuredClone(DersBoard.state)}});DersBoard.render();DersUI.navigate('program');scrollTo(0,0);});
  console.log('TOUCH_SCROLL_SETUP',JSON.stringify(await p.evaluate(()=>({height:document.documentElement.scrollHeight,overflow:getComputedStyle(document.body).overflow,modal:history.state.modal,openDialogs:document.querySelectorAll('dialog[open]').length}))));
  // Windows headless Chrome's synthetic gesture helper is a no-op even on a plain page.
  await perf.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:220,y:650}]});
  for(let y=600;y>=200;y-=50){await perf.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:220,y}]});await p.waitForTimeout(25);}
  await perf.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForFunction(()=>scrollY>100);
  const previousHistory=await p.evaluate(()=>structuredClone(DersBoard.state.studyHistory));await p.evaluate(async()=>{const w=DersBoard.week(),q=w.quests[0];DersBoard.state.studyHistory=Array.from({length:150},(_,i)=>({id:'history-'+i,userId:DersBoard.user.id,questId:q.id,categoryId:q.categoryId||q.subject,categoryName:'Matematik',title:'Örnek çalışma',detail:'Test',xp:0,completedAt:new Date().toISOString(),weekId:w.id,weekName:w.name}));await DersBoard.client.rpc('ders_action',{p_action:'sync_board',p_payload:{state:structuredClone(DersBoard.state)}});DersBoard.render();DersUI.navigate('history');});
  await p.mouse.move(220,500);await p.mouse.wheel(0,600);await p.waitForFunction(()=>scrollY>100);await p.evaluate(async history=>{DersBoard.state.studyHistory=history;await DersBoard.client.rpc('ders_action',{p_action:'sync_board',p_payload:{state:structuredClone(DersBoard.state)}});DersBoard.render();},previousHistory);
  for(const style of ['classic','glass'])for(const theme of ['light','dark']){await p.evaluate(({style,theme})=>{DersTheme.setStyle(style);DersTheme.set(theme);DersTheme.setAccent('red');},{style,theme});await p.click('#appearanceButton');const swatch=await p.locator('.accent-swatch:has(input[value=red])>span').evaluate(el=>getComputedStyle(el).backgroundColor),applied=await p.evaluate(()=>{const e=document.createElement('span');e.style.color='var(--accent)';document.body.append(e);const color=getComputedStyle(e).color;e.remove();return color;});assert.equal(swatch,applied);assert.equal(applied,theme==='light'?'rgb(198, 40, 40)':'rgb(255, 69, 58)');await p.click('#closeAppearance');await p.waitForFunction(()=>!history.state.modal);}
  await p.evaluate(()=>DersTheme.setAccent('green'));
  const modes=['classic','glass','natural','cloud'];let views=0;
  for(const width of [360,390,430,1440])for(const style of modes)for(const theme of ['light','dark']){
   await p.setViewportSize({width,height:900});await p.evaluate(({style,theme})=>{DersTheme.setStyle(style);DersTheme.set(theme);DersUI.navigate('program');},{style,theme});assert.equal(await p.locator('html').getAttribute('data-appearance'),style);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   for(const id of ['openQuestEditor','openWeekReport']){const b=p.locator('#'+id);const r=await b.boundingBox();assert.ok(r.width>=44&&r.height>=44);const lines=await b.evaluate(el=>el.scrollHeight/parseFloat(getComputedStyle(el).lineHeight));assert.ok(lines<=2.5,'Button text must not wrap excessively');}
   await p.mouse.move(width-25,450);await p.mouse.wheel(0,600);await p.waitForFunction(()=>scrollY>100);await p.evaluate(()=>scrollTo(0,0));
   if(width===390||width===1440){await p.evaluate(()=>DersUI.navigate('home'));await p.screenshot({path:path.join(root,'test-results',`v114-home-${width}-${style}-${theme}.png`)});}
   await p.evaluate(()=>DersUI.navigate('focus'));const a=await p.locator('#focusSettings').boundingBox(),clock=await p.locator('.focus-face').boundingBox();assert.ok(a.height<620);assert.ok(clock.y<a.y+a.height+80);
   await p.screenshot({path:path.join(root,'test-results',`v114-${width}-${style}-${theme}.png`)});views++;
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log('PASS v114 mobile admin/isolated previews, multiline input, '+views+' viewport/theme combinations, scroll and zero production data requests');
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
