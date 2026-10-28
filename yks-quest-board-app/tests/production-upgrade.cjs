const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results'),signal=path.join(out,'production-v121-ready.json');
async function waitForInstalledShell(page){
 // Await cache probes explicitly so a Promise cannot be mistaken for a ready shell.
 const deadline=Date.now()+30000;
 while(Date.now()<deadline){
  const ready=await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();if(!registration||registration.installing||registration.waiting||registration.active?.state!=='activated'||navigator.serviceWorker.controller!==registration.active)return false;const keys=await caches.keys();if(!keys.includes('ders-pwa-v1-2-1-release-r1'))return false;const cache=await caches.open('ders-pwa-v1-2-1-release-r1'),html=await cache.match(location.origin+'/');return Boolean(html&&(await html.text()).includes('learning-ui.js')&&await cache.match(location.origin+'/focus-core.js')&&await cache.match(location.origin+'/study.js')&&await cache.match(location.origin+'/learning-ui.js'));});
  if(ready)return;await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('New service worker and release shell did not finish activating');
}
(async()=>{
 const verifyNow=process.argv.includes('--verify-now');fs.mkdirSync(out,{recursive:true});if(!verifyNow)assert.equal(fs.existsSync(signal),false,'Remove the previous test signal before a new run');
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
  let databaseRequests=0;await context.route('**/*.supabase.co/**',route=>{databaseRequests++;return route.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.equal((await page.goto('https://dershub.vercel.app/')).status(),200);
  await page.waitForFunction(()=>window.DersBoard?.authReady&&navigator.serviceWorker.controller);
  assert.equal(await page.evaluate(()=>Boolean(DersBoard.user)),false);
  const marker=require('node:crypto').randomUUID();await page.evaluate(value=>localStorage.setItem('ders-release-probe',value),marker);
  const before=await page.evaluate(async()=>({version:document.querySelector('.app-version').textContent,cacheKeys:await caches.keys()}));
  fs.writeFileSync(path.join(out,'production-upgrade-before.json'),JSON.stringify(before,null,2));console.log('READY_FOR_RELEASE',JSON.stringify(before));
  // Keep the old service worker and guest browser alive until deployment has been verified READY.
  const deadline=Date.now()+15*60*1000;
  while(!verifyNow&&!fs.existsSync(signal)){if(Date.now()>deadline)throw Error('Release signal timed out');await new Promise(resolve=>setTimeout(resolve,500));}
  if(!verifyNow){const release=JSON.parse(fs.readFileSync(signal,'utf8'));assert.equal(release.version,'1.2.1');}
  await page.reload();await page.waitForFunction(()=>window.DersReleases&&DersBoard.authReady);
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  await waitForInstalledShell(page);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ders-release-probe')),marker);
  assert.equal(await page.evaluate(()=>YKS_CONFIG.supabaseUrl),'https://jswgagzbetwviamiwcck.supabase.co');
  assert.equal(await page.locator('.app-version').textContent(),'v1.2.1');
  const manifest=await page.evaluate(()=>fetch('./manifest.webmanifest').then(r=>r.json()));
  for(const icon of manifest.icons){const size=await page.evaluate(src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);image.onerror=reject;image.src=src;}),icon.src);if(icon.type==='image/png')assert.equal(size.join('x'),icon.sizes);}
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.locator('.app-footer').waitFor();
  await page.locator('#versionHistoryButton').click();assert.match(await page.locator('#releaseHistoryDialog h3').first().textContent(),/^v1\.2\.1 /);assert.equal(await page.locator('#releaseHistoryDialog time').first().getAttribute('datetime'),'2026-10-28');assert.equal(await page.locator('#releaseHistoryDialog section').first().locator('h4').count(),6);await page.keyboard.press('Escape');
  await page.screenshot({path:path.join(out,'production-v121-mobile.png')});
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(out,'production-v121-desktop.png')});
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.DersReleases);assert.equal(await page.locator('.app-version').textContent(),'v1.2.1');
  await page.locator('#versionHistoryButton').click();await page.locator('#releaseHistoryDialog').waitFor();assert.equal(await page.locator('#releaseHistoryDialog section').count(),11);
  assert.deepEqual(errors,[]);assert.equal(databaseRequests,0);
  const result={passed:true,version:'1.2.1',previousVersion:before.version,pwaUpgrade:!before.cacheKeys.includes('ders-pwa-v1-2-1-release-r1'),installedShell:true,offline:true,manifestIcons:true,releaseHistory:true,localStoragePreserved:true,databaseRequests,realUserWrites:false};
  fs.writeFileSync(path.join(out,'production-upgrade-result.json'),JSON.stringify(result,null,2));console.log('RESULT',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
