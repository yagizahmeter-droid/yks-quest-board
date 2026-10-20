const http=require('node:http'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const pointerSelect=require('./pointer-select.cjs');
module.exports=async ({root,deps,action,asUser,admin,ids,personal})=>{
  // Local Auth/REST transport fixture; every data operation runs against real RLS in PostgreSQL.
  const users=ids.map((id,i)=>({id,email:`test${i}@example.test`,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()}));
  const token=user=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'local-fixture'].join('.');
  const api=http.createServer(async(req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Headers','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    if(req.method==='OPTIONS') {res.writeHead(204).end();return;}
    res.setHeader('Content-Type','application/json');
    try {
      const url=new URL(req.url,'http://localhost'); let text=''; for await(const chunk of req) text+=chunk; const body=text?JSON.parse(text):{};
      let uid; try{uid=JSON.parse(Buffer.from((req.headers.authorization||'').split('.')[1]||'','base64url').toString()).sub;}catch{}
      if(url.pathname==='/auth/v1/token' || url.pathname==='/auth/v1/signup') {
        const user=users.find(u=>u.email===body.email || u.id===body.refresh_token);
        if(!user || (body.password && body.password!=='test-password')) throw new Error('Invalid credentials');
        res.end(JSON.stringify({access_token:token(user),refresh_token:user.id,expires_in:3600,token_type:'bearer',user}));return;
      }
      if(url.pathname==='/auth/v1/user') {res.end(JSON.stringify(users.find(u=>u.id===uid)));return;}
      if(url.pathname==='/auth/v1/logout') {res.end('{}');return;}
      if(!ids.includes(uid)) {res.writeHead(401).end(JSON.stringify({message:'Authentication required'}));return;}
      if(url.pathname==='/rest/v1/rpc/ders_admin_status') {res.end(JSON.stringify((await asUser(uid,'select public.ders_admin_status() allowed')).rows[0].allowed));return;}
      if(url.pathname==='/rest/v1/rpc/ders_admin_record_event') {await asUser(uid,'select public.ders_admin_record_event($1,$2,$3)',[body.p_id,body.p_action,body.p_context]);res.end('null');return;}
      if(url.pathname==='/rest/v1/ders_admin_events') {res.end(JSON.stringify((await asUser(uid,'select action,context,created_at from ders_admin_events order by created_at desc limit 100')).rows));return;}
      if(url.pathname==='/rest/v1/ders_admin_notes') {
        if(req.method==='POST'){await asUser(uid,'insert into ders_admin_notes(id,user_id,kind,context,screen,body) values($1,$2,$3,$4,$5,$6)',[body.id,body.user_id,body.kind,body.context,body.screen,body.body]);res.writeHead(201).end();return;}
        const rows=(await asUser(uid,'select id,body,kind,context,screen,created_at from ders_admin_notes order by created_at desc limit 100')).rows;
        res.end(JSON.stringify(rows));return;
      }
      if(url.pathname==='/rest/v1/rpc/ders_action') {res.end(JSON.stringify(await action(uid,body.p_action,body.p_payload)));return;}
      if(url.pathname==='/rest/v1/rpc/ders_learning') {res.end(JSON.stringify((await asUser(uid,'select public.ders_learning($1,$2) r',[body.p_action,body.p_payload||{}])).rows[0].r));return;}
      if(url.pathname==='/rest/v1/quest_board_states') {
        const rows=(await asUser(uid,'select * from public.quest_board_states where user_id=$1',[uid])).rows;
        res.end(JSON.stringify(rows[0]||null));return;
      }
      res.writeHead(404).end('{}');
    }catch(error){res.writeHead(400).end(JSON.stringify({message:error.message,code:error.code||'fixture_error'}));}
  });
  await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
  process.env.PORT='0';const site=require('../scripts/server.cjs');await new Promise(resolve=>site.listening?resolve():site.once('listening',resolve));
  const {chromium}=deps('playwright'); let browser;
  try {
    browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
    if(process.env.V113_ONLY==='1'){
      await require('./learning-browser.cjs')({root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`,users,action,asUser,ids});return;
    }
    if(process.env.V112_ONLY==='1'){
      const options={root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`,users,admin};
      await require(process.env.ADMIN_PREVIEW_FIX_ONLY==='1'?'./admin-preview-fix.cjs':'./admin-browser.cjs')(options);
      if(process.env.ADMIN_PREVIEW_FIX_ONLY==='1')await require('./workspace-scroll.cjs')(options);
      return;
    }
    if(process.env.V111_ONLY==='1'){const opts={root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`,users,action,ids};await require('./stability-browser.cjs')(opts);await require('./v111-browser.cjs')(opts);return;}
    const errors=[];
    async function pageFor(index,width=1280){
      const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
      await context.route('**/config.js',route=>route.fulfill({contentType:'text/javascript',body:`window.YKS_CONFIG={supabaseUrl:'http://127.0.0.1:${api.address().port}',supabaseAnonKey:'local-public-fixture'};`}));
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${site.address().port}/#/account${index===4?'/signup':''}`);
      await page.fill('#authEmail',users[index].email);await page.fill('#authPassword','test-password');await page.click(index===4?'#signUpButton':'#signInButton');
      await page.waitForFunction(()=>Boolean(window.DersBoard.user));await page.evaluate(()=>window.DersUI.navigate('teacher'));
      if(index===4){await page.locator('#profileName').waitFor();return page;}
      await page.locator('#teacherPanel').getByText(index===0?'Test Teacher · Öğretmen':'Test Student · Öğrenci',{exact:true}).waitFor();return page;
    }
    // Restore an approved link and a clean board for isolated browser cases.
    const code=(await action(ids[0],'create_invite')).code;await action(ids[1],'request_connection',{code});
    const connection=(await action(ids[0],'overview')).connections[0];await action(ids[0],'respond_connection',{id:connection.id,status:'approved'});
    const t=await pageFor(0),s=await pageFor(1),phone=await pageFor(1,390);
    const fresh=await pageFor(4,360);assert.equal(await fresh.locator('#questCount').innerText(),'0 / 0');assert.equal(await fresh.locator('#totalXp').innerText(),'0 XP');
    const spacing=await fresh.locator('.profile-init').evaluate(el=>el.querySelector('button').getBoundingClientRect().top-el.querySelector('input').getBoundingClientRect().bottom);assert.ok(spacing>=12);console.log('PASS Teacher/student profile initialization button has safe mobile spacing');
    await pointerSelect(fresh,'#roleSelect','student');await fresh.fill('#profileName','New Student');await fresh.getByRole('button',{name:'Hesabımı hazırla'}).click();
    await fresh.locator('#teacherPanel').getByText('New Student · Öğrenci',{exact:true}).waitFor();
    assert.equal(await fresh.locator('#roleSelect').isDisabled(),true);await fresh.evaluate(()=>window.DersUI.navigate('program'));assert.equal(await fresh.locator('#addProgramButton').isVisible(),true);assert.equal(await fresh.locator('#editModeButton').isVisible(),false);console.log('PASS New account starts empty and role is set once');
    await t.locator('#teacherPanel [data-action="student"]').click();
    await t.fill('#assignmentName','Browser Program');await t.fill('#assignmentRange','21-28 Ekim');
    await pointerSelect(t,'#assignmentDraft [data-key="category"]','Fizik');await pointerSelect(t,'#assignmentDraft [data-key="topic_category"]','Enerji ve Madde');await pointerSelect(t,'#assignmentDraft [data-key="topic"]','Basınç ve Kaldırma Kuvveti');
    await t.locator('#assignmentDraft [data-key="detail"]').fill('50 soru ve analiz');await t.locator('#assignmentDraft [data-key="xp"]').fill('200');
    await t.getByRole('button',{name:'Programı gönder',exact:true}).click();
    await t.locator('#teacherPanel').getByText('Browser Program',{exact:true}).waitFor();
    await t.click('#dismissDialog');await t.locator('#questDialog').waitFor({state:'hidden'});
    await s.locator('#teacherPanel [data-action="refresh"]').click();await s.locator('#teacherPanel').getByText('Browser Program',{exact:true}).waitFor();
    await s.locator('#teacherPanel .teacher-item').filter({has:s.getByText('Browser Program',{exact:true})}).locator('[data-action="review"]').click();
    await s.getByRole('button',{name:'Programı kabul et',exact:true}).click();
    await s.locator('#weekSelect option').filter({hasText:'Browser Program'}).waitFor({state:'attached'});
    await s.locator('.quest').filter({hasText:'Basınç'}).click();await s.evaluate(()=>window.DersBoard.flush());
    await phone.evaluate(()=>window.DersBoard.flush());
    await phone.waitForFunction(()=>window.DersBoard.state.weeks.some(w=>w.name==='Browser Program'&&w.quests[0].done));
    assert.match(await phone.locator('#totalXp').innerText(),/380/);
    console.log('PASS Browser teacher sends, student accepts and second device sees completion');
    await s.locator('.quest').filter({hasText:'Basınç'}).getByRole('button',{name:'Değişiklik iste'}).click();
    assert.equal(await s.locator('#editTitle').getAttribute('readonly'),'');await s.fill('#editDetail','Basınç güncellendi');await s.getByRole('button',{name:'İsteği gönder'}).click();
    await s.locator('#questDialog').waitFor({state:'hidden'});await t.locator('#teacherPanel [data-action="refresh"]').click();
    await t.getByRole('button',{name:'Değişikliği onayla'}).click();await s.evaluate(()=>window.DersBoard.flush());
    await s.locator('.quest').filter({hasText:'Basınç güncellendi'}).waitFor();assert.equal(await s.locator('.quest-title').getByText('Basınç ve Kaldırma Kuvveti',{exact:true}).count(),1);console.log('PASS Browser change request and teacher approval');
    await pointerSelect(s,'#weekSelect','original');await s.locator('.quest').filter({hasText:'Temel Kavramlar'}).click();await s.evaluate(()=>window.DersBoard.flush());
    await s.getByRole('button',{name:/Tamamlananlar/}).click();assert.equal(await s.locator('.quest.done').count(),1);
    await s.evaluate(()=>window.DersUI.navigate('history'));assert.equal(await s.locator('#historyList .history-item').count(),2);await s.evaluate(()=>window.DersUI.navigate('program'));console.log('PASS Completed tab, independent weeks, global XP and history');
    await s.click('#newWeekButton');await s.fill('#modalWeekName','Empty browser week');await s.fill('#modalWeekRange','28 Ekim-4 Kasım');await s.click('#emptyWeekModalButton');
    await s.click('#openQuestEditor');await s.fill('#manualDetail','Manual browser task\nKonu anlatımı / soru çözümü');await s.click('#addQuestButton');
    await s.locator('.quest-title').filter({hasText:'Manual browser task'}).waitFor();console.log('PASS New empty week and manual quest');
    await s.context().setOffline(true);await s.locator('.quest').filter({hasText:'Manual browser task'}).click();
    await s.context().setOffline(false);await s.evaluate(()=>window.DersBoard.flush());await phone.evaluate(()=>window.DersBoard.flush());
    await phone.waitForFunction(()=>window.DersBoard.state.weeks.some(w=>w.name==='Empty browser week'&&w.quests[0]?.done));console.log('PASS Offline completion synchronizes after reconnect');
    await s.click('#editModeButton');await s.locator('.quest [data-action="edit"]').click();await s.fill('#editTitle','Edited manual task');await s.getByRole('button',{name:'Kaydet',exact:true}).click();
    await s.locator('.quest-title').filter({hasText:'Edited manual task'}).waitFor();console.log('PASS Personal quest edit mode');
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
    for(const width of [360,390,430,1280]){
      await s.setViewportSize({width,height:900});
      const overflow=await s.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      if(overflow) { await s.screenshot({path:path.join(root,'test-results',`overflow-${width}.png`),fullPage:true}); console.log('OVERFLOW ELEMENTS',JSON.stringify(await s.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length && e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,id:e.id,class:e.className?.baseVal??e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).slice(0,25)))); }
      assert.equal(overflow,false,`overflow at ${width}`);
      const titleWidth=await s.locator('.quest-main').first().evaluate(el=>el.getBoundingClientRect().width);
      assert.ok(titleWidth>=150,`Quest text squeezed at ${width}px: ${titleWidth}`);
      await s.screenshot({path:path.join(root,'test-results',`board-${width}.png`),fullPage:true});
      console.log(`PASS Responsive layout ${width}px`);
    }
    await t.setViewportSize({width:360,height:900});await t.getByRole('button',{name:'Davet kodu oluştur'}).click();
    await t.waitForFunction(()=>document.querySelector('#inviteResult')?.dataset.code?.length===24);
    assert.equal(await t.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await t.locator('#teacherPanel [data-action="student"]').click();await t.locator('[data-action="student-progress"]').click();await t.locator('#studentSummary').waitFor();
    assert.equal(await t.locator('#studentSummary').getByText('580 XP · 4/4 görev',{exact:true}).count(),1);
    await t.screenshot({path:path.join(root,'test-results','teacher-progress-360.png'),fullPage:true});
    await s.evaluate(()=>window.DersUI.navigate('teacher'));s.once('dialog',dialog=>dialog.accept());await s.locator('#teacherPanel [data-action="disconnect"]').click();
    await s.waitForFunction(()=>!document.querySelector('#teacherPanel [data-action="disconnect"]'));
    await t.evaluate(()=>window.DersTeacher.refresh());assert.equal(await t.locator('#questDialog').isVisible(),false);
    assert.equal(await t.locator('#teacherPanel [data-action="student"]').count(),0);console.log('PASS Teacher progress on mobile and revocation clears open student data');
    await s.evaluate(()=>window.DersUI.navigate('account'));await s.click('#signOutButton');await s.waitForFunction(()=>!window.DersBoard.user);
    assert.equal(await s.locator('#board').getByText('Edited manual task').count(),0);console.log('PASS Sign-out clears account-specific board');
    const pwaContext=await browser.newContext({viewport:{width:390,height:844}});const pwa=await pwaContext.newPage();
    await pwa.goto(`http://127.0.0.1:${site.address().port}`);await pwa.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),{timeout:20000});
    const cached=await pwa.evaluate(async()=>{const cache=await caches.open('ders-pwa-v1-1-2-preview-r1');return (await cache.keys()).map(r=>r.url);});
    assert.ok(cached.some(url=>url.endsWith('/vendor/supabase.js')));assert.ok(cached.every(url=>new URL(url).origin===`http://127.0.0.1:${site.address().port}` && !/\/rest\//.test(url)));
    for(const asset of ['appearance.js','appearance.css','assets/background-light.webp','assets/background-dark.webp','assets/brand-mark.svg','personal-catalog.js'])assert.ok(cached.some(url=>url.endsWith('/'+asset)));
    await pwa.evaluate(()=>{window.DersTheme.setStyle('glass');window.DersTheme.setAccent('red');});
    await pwaContext.setOffline(true);await pwa.reload();await pwa.locator('#homePage').waitFor();
    assert.equal(await pwa.evaluate(()=>window.DersTheme.style),'glass');assert.equal(await pwa.evaluate(()=>window.DersTheme.accent),'red');
    assert.equal(await pwa.evaluate(()=>typeof window.supabase.createClient),'function');console.log('PASS PWA shell and SDK reopen offline without caching private API data');
    assert.deepEqual(errors,[]);console.log('PASS No browser JavaScript errors');
    await require('./ui.cjs')({root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`,users,action,ids});
    await require('./appearance.cjs')({root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`,users});
    await require('./floating.cjs')({root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`});
    await require('./quest-browser.cjs')({root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`,users,action,ids,admin});
    await require('./catalog-browser.cjs')({root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`,users,action,ids});
    await require('./dropdown-layers.cjs')({root,browser,siteUrl:`http://127.0.0.1:${site.address().port}`});
    await require('./personal-catalog.cjs')({root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`,users,action,ids});
    await require('./teacher-general-browser.cjs')({root,browser,apiUrl:`http://127.0.0.1:${api.address().port}`,siteUrl:`http://127.0.0.1:${site.address().port}`,users,action,ids});
  }finally{if(browser)await browser.close();await new Promise(resolve=>api.close(resolve));await new Promise(resolve=>site.close(resolve));}
};
