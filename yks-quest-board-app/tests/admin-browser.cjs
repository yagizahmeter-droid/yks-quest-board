const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({root,browser,apiUrl,siteUrl,users,admin})=>{
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 const errors=[],requests=[];let checks=0;
 const pass=message=>{checks++;console.log('PASS v112',message);};
 await context.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.YKS_CONFIG={supabaseUrl:'${apiUrl}',supabaseAnonKey:'local-public-fixture'};`}));
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 p.on('request',r=>{if(r.frame()!==p.mainFrame()&&/auth\/v1|rest\/v1|preview.invalid/.test(r.url()))requests.push(r.url());});
 try {
  await p.goto(siteUrl+'/#/account');await p.waitForFunction(()=>window.DersBoard?.authReady);
  assert.equal(await p.locator('#adminButton').isVisible(),false);
  await p.fill('#authEmail',users[1].email);await p.fill('#authPassword','test-password');await p.click('#signInButton');
  await p.waitForFunction(()=>Boolean(DersBoard.user));await p.waitForTimeout(1100);
  assert.equal(await p.locator('#adminButton').isVisible(),false);
  await p.evaluate(()=>document.getElementById('adminButton').click());
  assert.equal(await p.locator('#adminDialog').isVisible(),false);pass('Guest and student cannot open admin panel, even by invoking hidden trigger');
  await p.evaluate(()=>DersBoard.client.auth.signOut());await p.waitForFunction(()=>!DersBoard.user);
  await p.fill('#authEmail',users[0].email);await p.fill('#authPassword','test-password');await p.click('#signInButton');
  await p.locator('#adminButton').waitFor({state:'visible'});
  await p.evaluate(async()=>{await DersBoard.flush();await DersTeacher.refresh();});
  const before=await p.evaluate(()=>structuredClone(DersBoard.state));
  await p.click('#adminButton');await p.locator('#adminDialog').waitFor({state:'visible'});
  await p.click('[data-preview-role="student"]');
  let frame=await (await p.locator('.admin-frame').elementHandle()).contentFrame();
  await frame.waitForFunction(()=>document.readyState==='complete'&&window.DersBoard?.user&&window.DersUI);
  await frame.locator('#programPage').waitFor({state:'visible'});
  assert.equal(await frame.evaluate(()=>DersBoard.user.email),'student@example.invalid');
  assert.equal(await p.locator('.admin-frame').getAttribute('sandbox'),'allow-scripts');
  assert.equal(await frame.evaluate(()=>{try{parent.document.body;return false;}catch{return true;}}),true);
  assert.equal(await frame.evaluate(()=>{try{return document.cookie.length===0;}catch{return true;}}),true);
  await frame.locator('.quest').filter({hasText:'Yaş Problemleri'}).locator('.check').click();
  await frame.evaluate(()=>DersBoard.flush());
  assert.deepEqual(await p.evaluate(()=>structuredClone(DersBoard.state)),before);
  const oldFrame=await p.locator('.admin-frame').elementHandle();
  p.once('dialog',d=>d.accept());await p.click('#adminReset');
  await p.waitForFunction(el=>!el.isConnected,oldFrame);
  frame=await (await p.locator('.admin-frame').elementHandle()).contentFrame();
  await frame.waitForFunction(()=>document.readyState==='complete'&&window.DersBoard?.user&&window.DersUI&&window.DersBoard.week().quests.length===2);
  assert.equal(await frame.evaluate(()=>DersBoard.week().quests.find(q=>q.id==='preview-personal').done),false);
  assert.deepEqual(await p.evaluate(()=>structuredClone(DersBoard.state)),before);
  pass('Reset replaces only sandbox memory and leaves account tasks, XP and notes untouched');
  pass('Student preview uses actual UI with isolated synthetic tasks and cannot read parent or cookies');
  await frame.evaluate(()=>{
    const s=DersBoard.state;
    s.studyHistory=[
      {id:'h1',weekId:'preview-week',weekName:'Örnek hafta',categoryId:'preview-math',categoryName:'Matematik',title:'Birinci kayıt',detail:'Analiz',xp:100,completedAt:'2026-10-17T22:30:00Z'},
      {id:'h2',weekId:'preview-week',weekName:'Örnek hafta',categoryId:'preview-math',categoryName:'Matematik',title:'İkinci kayıt',detail:'Analiz',xp:75,completedAt:'2026-10-17T18:30:00Z'},
      {id:'h3',weekId:'other',weekName:'Geçmiş hafta',categoryId:'preview-math',categoryName:'Matematik',title:'Eski kayıt',detail:'Analiz',xp:25,completedAt:'2026-10-16T18:30:00Z'}
    ];DersBoard.render();DersUI.navigate('history');
  });
  assert.equal(await frame.locator('.history-week-group').count(),2);
  assert.equal(await frame.locator('.history-day-label').count(),3);
  assert.equal(await frame.locator('#historyList .history-item').count(),3);
  await frame.fill('#historyDateFilter','2026-10-18');
  assert.equal(await frame.locator('#historyList .history-item').count(),1);
  assert.match(await frame.locator('#historyList').innerText(),/Birinci kayıt/);
  pass('Actual history screen groups by week/day and filters at Istanbul midnight');
  await p.click('[data-preview-role="teacher"]');
  frame=await (await p.locator('iframe[title="Öğretmen örnek görünümü"]').elementHandle()).contentFrame();
  await frame.locator('#teacherPanel [data-action="student"]').waitFor();
  await frame.locator('#teacherPanel [data-action="student"]').click();
  await frame.locator('#assignmentForm').waitFor();
  await frame.fill('#assignmentName','Örnek taslak');
  assert.deepEqual(await p.evaluate(()=>structuredClone(DersBoard.state)),before);
  assert.equal(requests.length,0);
  await p.click('#adminReturn');await p.locator('.admin-frame').waitFor({state:'detached'});
  pass('Teacher preview opens real curriculum composer, returns to admin and sends zero backend requests');
  await p.fill('#adminNoteBody','<img src=x onerror=alert(1)> test notu');
  await p.click('#adminSaveNote');await p.getByText('Not kaydedildi.',{exact:true}).waitFor();
  assert.equal(await p.locator('#adminNoteList img').count(),0);
  await p.click('#adminClose');await p.waitForTimeout(100);await p.click('#adminButton');
  await p.locator('#adminNoteList').getByText('<img src=x onerror=alert(1)> test notu',{exact:true}).waitFor();
  await p.locator('#adminEventList').getByText('Örnek veriler sıfırlandı · Öğrenci',{exact:true}).first().waitFor();
  await p.locator('#adminEventList').getByText('Test notu kaydedildi · Öğretmen',{exact:true}).first().waitFor();
  pass('Notes persist, reopen and render untrusted text without HTML execution');
  await p.route('**/rest/v1/ders_admin_notes',async route=>{if(route.request().method()==='POST')await route.fulfill({status:503,contentType:'application/json',body:'{"message":"test failure"}'});else await route.continue();});
  await p.fill('#adminNoteBody','Kaybolmaması gereken not');await p.click('#adminSaveNote');
  await p.getByText(/Not kaydedilemedi/).waitFor();
  assert.equal(await p.inputValue('#adminNoteBody'),'Kaybolmaması gereken not');
  await p.unroute('**/rest/v1/ders_admin_notes');await p.click('#adminSaveNote');await p.getByText('Not kaydedildi.',{exact:true}).waitFor();
  pass('Failed note save retains text and can be retried');
  await admin.query('delete from ders_admin_private.members where user_id=$1',[users[0].id]);
  await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await p.locator('#adminDialog').waitFor({state:'hidden'});assert.equal(await p.locator('#adminButton').isVisible(),false);
  await admin.query('insert into ders_admin_private.members(user_id) values($1)',[users[0].id]);
  pass('Revoked admin is denied immediately and active preview/panel is removed');
  for(const width of [360,390,430,1440]){
    await p.setViewportSize({width,height:900});
    for(const theme of ['light','dark'])for(const background of ['industrial','black','white','gray','pink']){
      await p.evaluate(({theme,background})=>{DersTheme.set(theme);DersTheme.setStyle('glass');DersBackgrounds.set(background);},{theme,background});
      const css=await p.locator('.stat').first().evaluate(el=>({bg:getComputedStyle(el).backgroundColor,blur:getComputedStyle(el).backdropFilter}));
      assert.match(css.bg,/rgba/);assert.ok(Number(css.bg.match(/,\s*([.\d]+)\)$/)[1])<.8,css.bg);
      assert.match(css.blur,/blur/);
      const contrast=await p.locator('.stat').first().evaluate(el=>{
        const channels=value=>value.match(/[\d.]+/g).map(Number);
        const lum=rgb=>rgb.map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0);
        const css=getComputedStyle(el),surface=channels(css.backgroundColor);
        return [css.color,getComputedStyle(document.documentElement).getPropertyValue('--muted')].flatMap(color=>[0,255].map(bg=>{
          const rgb=color.trim().startsWith('#')?color.trim().slice(1).match(/../g).map(c=>parseInt(c,16)):channels(color).slice(0,3);
          const a=lum(rgb),b=lum(surface.slice(0,3).map(c=>c*surface[3]+bg*(1-surface[3])));
          return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        }));
      });
      assert.ok(contrast.every(n=>n>=4.5),JSON.stringify({theme,background,contrast}));
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
  }
  pass('Saydam surfaces retain alpha and backdrop blur across 40 background/theme/viewport combinations');
  await p.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=240;canvas.height=120;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,120,120);ctx.fillStyle='#000';ctx.fillRect(120,0,120,120);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    await DersBackgrounds.upload(new File([blob],'test-photo.png',{type:'image/png'}));
  });
  assert.equal(await p.evaluate(()=>DersBackgrounds.selected),'custom');
  for(const theme of ['light','dark']){
    await p.evaluate(theme=>DersTheme.set(theme),theme);
    assert.match(await p.locator('.stat').first().evaluate(el=>getComputedStyle(el).backdropFilter),/blur/);
    await p.evaluate(()=>DersTheme.setStyle('classic'));
    assert.equal(await p.locator('.stat').first().evaluate(el=>getComputedStyle(el).backdropFilter),'none');
    assert.match(await p.locator('.stat').first().evaluate(el=>getComputedStyle(el).backgroundColor),/^rgb\(/);
    await p.evaluate(()=>DersTheme.setStyle('glass'));
  }
  await p.evaluate(()=>DersBackgrounds.remove());
  pass('Uploaded photo supports Saydam while Classic remains opaque without blur');
  await p.setViewportSize({width:1440,height:1000});await p.click('#appearanceButton');
  await p.getByRole('radio',{name:'Saydam',exact:true}).check();
  await p.locator('#appearanceDialog').getByRole('radio',{name:'Sistem teması',exact:true}).check();
  await p.click('#closeAppearance');await p.waitForTimeout(100);
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  for(const theme of ['light','dark']){
    await p.evaluate(theme=>{DersTheme.set(theme);DersBackgrounds.set('industrial');},theme);
    await p.screenshot({path:path.join(root,'test-results','v112-saydam-'+theme+'.png')});
  }
  await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.locator('#adminButton').waitFor({state:'visible'});
  await p.click('#adminButton');await p.screenshot({path:path.join(root,'test-results','v112-admin.png')});
  await p.setViewportSize({width:390,height:844});await p.click('[data-preview-role="student"]');
  frame=await (await p.locator('.admin-frame').elementHandle()).contentFrame();await frame.locator('#programPage').waitFor({state:'visible'});
  await p.screenshot({path:path.join(root,'test-results','v112-admin-mobile.png')});
  assert.ok(await p.locator('#adminDialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await p.evaluate(()=>DersBoard.client.auth.signOut());await p.locator('#adminDialog').waitFor({state:'hidden'});
  assert.equal(await p.locator('.admin-frame').count(),0);
  assert.deepEqual(errors,[]);pass('Mobile admin controls fit; logout destroys preview and notes; no browser errors');
  fs.writeFileSync(path.join(root,'test-results/v112.json'),JSON.stringify({checks,errors,databasePreviewRequests:requests.length},null,2));
 }catch(error){console.error('ADMIN BROWSER ERRORS',errors);throw error;}finally{await context.close();}
};
