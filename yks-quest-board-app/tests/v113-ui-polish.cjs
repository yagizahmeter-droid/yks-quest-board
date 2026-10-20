const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline');
const fixture=fs.readFileSync(path.join(root,'admin-preview.js'),'utf8');
async function main(){let server,browser;const errors=[],remote=[];
 try{
  const target=process.env.DERS_UI_PREVIEW_URL;
  if(!target){process.env.PORT='0';server=require('../scripts/server.cjs');if(!server.listening)await new Promise(r=>server.once('listening',r));}
  const url=target||`http://127.0.0.1:${server.address().port}/`;
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const c=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',hasTouch:true});
  await c.route('**/*',async route=>{const u=new URL(route.request().url());if(/supabase\.co$/.test(u.hostname)){remote.push(u.hostname);return route.abort();}return route.continue();});
  await c.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'text/javascript',body:`document.currentScript.dataset.role='student';\n${fixture}`}));
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.DersBoard?.user&&window.DersStudy?.loaded);const snapshot=await p.evaluate(()=>JSON.stringify(window.DersBoard.state));
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  if(baseline){for(const width of [390,1440]){await p.setViewportSize({width,height:900});await p.evaluate(()=>window.DersUI.navigate('focus'));await p.locator('#focusTone').selectOption('soft');const parent=p.locator('#focusTone').locator('..');await parent.locator('.select-trigger').click();console.log('BASELINE',width,await parent.evaluate(el=>({width:el.getBoundingClientRect().width,option:[...el.querySelectorAll('[role=option]')].map(x=>({text:x.textContent,width:x.clientWidth,height:x.clientHeight}))})));await p.screenshot({path:path.join(root,'test-results',`polish-before-${width}.png`)});await p.keyboard.press('Escape');}return;}
  let cases=0;
  for(const width of [360,390,430,1366,1440,1920])for(const style of ['classic','glass'])for(const theme of ['light','dark']){
   await p.setViewportSize({width,height:900});await p.evaluate(({style,theme})=>{window.DersTheme.setStyle(style);window.DersTheme.set(theme);window.DersUI.navigate('home');},{style,theme});
   const pairs=p.locator('#homePage .stats > .stat');assert.equal(await pairs.count(),2);assert.deepEqual(await pairs.locator('.stat-metric strong').evaluateAll(xs=>xs.map(x=>x.id)),['totalXp','level','progressText','questCount']);assert.equal(await p.locator('#homePage [data-route=focus]').count(),0);assert.equal(await p.locator('.main-nav [data-route=focus]').count(),1);
   const boxes=await pairs.evaluateAll(xs=>xs.map(x=>({x:x.getBoundingClientRect().x,y:x.getBoundingClientRect().y,w:x.getBoundingClientRect().width})));assert.equal(boxes[0].x,boxes[1].x);assert.equal(boxes[0].w,boxes[1].w);assert.ok(boxes[1].y>boxes[0].y);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.screenshot({path:path.join(root,'test-results',`polish-home-${width}-${style}-${theme}.png`),fullPage:true});
   await p.evaluate(()=>window.DersUI.navigate('focus'));await p.locator('#focusSound').uncheck();await p.locator('#focusRepeat').check();await p.locator('#focusAuto').check();const tone=p.locator('#focusTone').locator('..');await tone.locator('.select-trigger').click();await tone.getByRole('option',{name:'Yumuşak',exact:true}).click();assert.equal(await p.inputValue('#focusTone'),'soft');assert.equal(await tone.locator('.select-trigger > span').innerText(),'Yumuşak');
   const value=await tone.locator('.select-trigger > span').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));assert.ok(value.scroll<=value.client,`tone clipped ${width}/${style}/${theme}`);
   await tone.locator('.select-trigger').click();const option=tone.getByRole('option',{name:'Yumuşak',exact:true});const size=await option.evaluate(el=>({height:el.clientHeight,width:el.clientWidth,line:parseFloat(getComputedStyle(el).lineHeight)}));assert.ok(size.height>=44&&size.width>=140);assert.ok(size.height<=size.line+28,`wrapped option ${JSON.stringify(size)}`);await tone.locator('.select-popup').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});await p.screenshot({path:path.join(root,'test-results',`polish-focus-${width}-${style}-${theme}.png`)});await p.keyboard.press('Escape');
   await tone.locator('.select-trigger').focus();await p.keyboard.press('Enter');await p.keyboard.press('Home');await p.keyboard.press('Enter');assert.equal(await p.inputValue('#focusTone'),'bell');await tone.locator('.select-trigger').tap();await tone.getByRole('option',{name:'Yumuşak',exact:true}).tap();assert.equal(await p.inputValue('#focusTone'),'soft');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);cases++;
  }
  await p.fill('#workMinutes','1');await p.click('#focusStart');await p.waitForFunction(()=>window.DersStudy.session?.status==='running');await p.click('#focusPause');assert.equal(await p.evaluate(()=>window.DersStudy.session.status),'paused');await p.click('#focusResume');assert.equal(await p.evaluate(()=>window.DersStudy.session.status),'running');await p.click('#focusFinish');assert.equal(await p.evaluate(()=>window.DersStudy.session.status),'ended');assert.equal(await p.evaluate(()=>JSON.stringify(window.DersBoard.state)),snapshot);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log(`PASS ${cases} viewport/style/theme cases: 2 paired cards, sidebar-only focus shortcut, unbroken tone options, mouse/keyboard/touch, timer controls, unchanged task/XP data. Zero database requests.`);
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
