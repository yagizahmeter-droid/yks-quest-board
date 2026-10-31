const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pointerSelect=require('./pointer-select.cjs');
module.exports=async({root,browser,apiUrl,siteUrl,users,key='fixture',password='test-password'})=>{
 const testNote='Test türü önizleme düzeltmesi '+require('node:crypto').randomUUID();
 const fileContext=await browser.newContext({serviceWorkers:'block'});
 try{
  await fileContext.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.YKS_CONFIG={supabaseUrl:'${apiUrl}',supabaseAnonKey:'${key}'};`}));
  const filePage=await fileContext.newPage();
  await filePage.goto(require('node:url').pathToFileURL(path.join(root,'index.html')).href+'#/account');
  await filePage.fill('#authEmail',users[0].email);await filePage.fill('#authPassword',password);await filePage.click('#signInButton');
  await filePage.locator('#adminButton').waitFor({state:'visible'});
  await filePage.evaluate(async()=>{await DersBoard.flush();await DersTeacher.refresh();});
  await filePage.click('#adminButton');
  if(process.env.ADMIN_FILE_PREVIEW_REPRO==='1'){
   await filePage.click('[data-preview-role="student"]');
   await filePage.locator('#adminStatus').getByText(/başlatılamadı/).waitFor();
   assert.equal(await filePage.locator('.admin-frame').count(),0);
   console.log('PASS admin preview origin Original code reproduces file-origin CORS failure reported by user');return;
  }
  let blockedFetches=0;
  filePage.on('request',r=>{if(/\/(?:index[.]html|admin-preview[.]js|assets\/brand-mark[.]svg)$/.test(r.url()))blockedFetches++;});
  const before=await filePage.evaluate(()=>structuredClone(DersBoard.state));
  for(const role of ['student','teacher']){
   await filePage.click(`[data-preview-role="${role}"]`);
   await filePage.locator('#adminStatus').getByText(/dosyadan açılamaz/).waitFor();
   assert.equal(await filePage.locator('.admin-frame').count(),0);
  }
  assert.equal(blockedFetches,0);assert.deepEqual(await filePage.evaluate(()=>structuredClone(DersBoard.state)),before);
  console.log('PASS admin preview origin File-origin launch is diagnosed before any blocked asset fetch or account mutation');
 }finally{await fileContext.close();}
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 let missing=false,broken=false,checks=0;const errors=[],frameRequests=[];
 const pass=text=>{checks++;console.log('PASS admin preview fix',text);};
 await context.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.YKS_CONFIG={supabaseUrl:'${apiUrl}',supabaseAnonKey:'${key}'};`}));
 await context.route('**/index.html',async route=>{
  const response=await route.fetch();
  let html=await response.text();
  html=html.replace('</head>','<script src="https://vercel.live/_next-live/feedback/feedback.js"></script><script>window.__untrustedPreviewScript=true;</script><link rel="stylesheet" href="https://vercel.live/toolbar.css"></head>');
  html=html.replace('src="./theme.js"',`src="${siteUrl}/theme.js?fixture=1"`).replace('src="./vendor/supabase.js"',`src="${siteUrl}/vendor/supabase.js?fixture=1"`);
  await route.fulfill({response,body:html});
 });
 await context.route('**/admin-preview.js',async route=>{
  if(missing)return route.fulfill({status:503,contentType:'text/plain',body:'fixture missing asset'});
  const response=await route.fetch();let source=await response.text();
  if(broken)source=source.replace("document.addEventListener('DOMContentLoaded'","throw new Error('expected fixture failure');document.addEventListener('DOMContentLoaded'");
  await route.fulfill({response,body:source});
 });
 const p=await context.newPage();
 async function wheelPreview(frame){
  const top=await frame.evaluate(()=>{const spacer=document.createElement('div');spacer.dataset.scrollFixture='';spacer.style.height='1200px';document.querySelector('.app').append(spacer);window.scrollTo(0,0);return document.querySelector('.workspace-header').getBoundingClientRect().top;});
  await p.locator('.admin-frame').scrollIntoViewIfNeeded();const box=await p.locator('.admin-frame').boundingBox();
  await p.mouse.move(box.x+box.width-50,box.y+box.height/2);await p.mouse.wheel(0,350);
  await frame.waitForFunction(()=>scrollY>=250);
  assert.ok(await frame.evaluate(top=>Math.abs(top-document.querySelector('.workspace-header').getBoundingClientRect().top-scrollY)<2,top),'Preview header must follow its content');
  await frame.evaluate(()=>{document.querySelector('[data-scroll-fixture]').remove();window.scrollTo(0,0);});
 }
 p.on('pageerror',error=>{if(!broken)errors.push(error.message);});
 p.on('request',request=>{if(request.frame()!==p.mainFrame()&&/rest\/v1|auth\/v1|vercel.live/.test(request.url()))frameRequests.push(request.url());});
 try{
  await p.goto(siteUrl+'/#/account');await p.fill('#authEmail',users[0].email);await p.fill('#authPassword',password);await p.click('#signInButton');
  await p.locator('#adminButton').waitFor({state:'visible'});await p.evaluate(async()=>{await DersBoard.flush();await DersTeacher.refresh();});
  const before=await p.evaluate(()=>structuredClone(DersBoard.state));
  await p.click('#adminButton');
  if(process.env.ADMIN_PREVIEW_REPRO==='1'){
   await p.click('[data-preview-role="student"]');await p.getByText('Önizleme açılamadı. Yeniden dene.',{exact:true}).waitFor();
   assert.equal(await p.locator('.admin-frame').count(),0);pass('Existing code reproduces reported failure when fetched HTML includes an external toolbar script');return;
  }
  missing=true;await p.click('[data-preview-role="student"]');
  await p.locator('#adminStatus').getByText(/dosyaları yüklenemedi/).waitFor();
  assert.equal(await p.locator('.admin-frame').count(),0);
  missing=false;await p.click('[data-preview-role="student"]');
  await p.locator('#adminStatus').getByText(/Örnek veriler/).waitFor();
  let frame=await(await p.locator('.admin-frame').elementHandle()).contentFrame();
  await frame.locator('#programPage').waitFor({state:'visible'});
  assert.equal(await frame.evaluate(()=>DersBoard.user.email),'student@example.invalid');
  assert.equal(await frame.evaluate(()=>Boolean(window.__untrustedPreviewScript)),false);
  assert.equal(await frame.locator('script[src],link[rel="stylesheet"]').count(),0);
  await wheelPreview(frame);
  await frame.locator('.quest').filter({hasText:'Yaş Problemleri'}).locator('.check').click();await frame.evaluate(()=>DersBoard.flush());
  assert.deepEqual(await p.evaluate(()=>structuredClone(DersBoard.state)),before);
  pass('Missing asset has a clear error; retry opens actual student UI despite toolbar and rewritten script URLs');
  await p.click('[data-preview-role="teacher"]');await p.locator('iframe[title="Öğretmen örnek görünümü"]').waitFor({state:'visible'});
  frame=await(await p.locator('.admin-frame').elementHandle()).contentFrame();
  await frame.locator('#teacherPanel [data-action="student"]').click();await frame.locator('#assignmentForm').waitFor({state:'visible'});
  assert.equal(await frame.evaluate(()=>DersBoard.user.email),'teacher@example.invalid');
  assert.equal(await frame.evaluate(()=>{try{parent.document.body;return false;}catch{return true;}}),true);
  await wheelPreview(frame);
  await p.click('#adminReturn');await p.locator('.admin-frame').waitFor({state:'detached'});
  pass('Actual teacher composer opens, stays isolated and returns to admin');
  assert.deepEqual(await p.locator('#adminNoteKind option').allTextContents(),['Hata','Öneri','Test']);
  await pointerSelect(p,'#adminNoteKind','test');await p.fill('#adminNoteBody',testNote);
  await p.click('#adminSaveNote');await p.getByText('Not kaydedildi.',{exact:true}).waitFor();
  await p.locator('#adminNoteList').getByText(testNote,{exact:true}).waitFor();
  assert.match(await p.locator('#adminNoteList').innerText(),/Test ·/);pass('Hata, Öneri and Test are selectable and Test persists through RLS');
  await p.click('#adminClose');await p.waitForTimeout(100);await p.reload();await p.locator('#adminButton').waitFor({state:'visible'});
  await p.click('#adminButton');broken=true;await p.click('[data-preview-role="student"]');
  await p.locator('#adminStatus').getByText(/başlatılamadı/).waitFor();assert.equal(await p.locator('.admin-frame').count(),0);
  broken=false;await p.click('[data-preview-role="student"]');await p.locator('#adminStatus').getByText(/Örnek veriler/).waitFor();
  await p.click('#adminReturn');await p.locator('.admin-frame').waitFor({state:'detached'});
  assert.deepEqual(errors,[]);assert.deepEqual(frameRequests,[]);
  pass('Runtime failure is detected, cleaned up and recoverable; no unexpected errors or sandbox API requests');
  fs.writeFileSync(path.join(root,'test-results/admin-preview-fix.json'),JSON.stringify({checks,errors,frameRequests:frameRequests.length},null,2));
 }finally{await context.close();}
};
