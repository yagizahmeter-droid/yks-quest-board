const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
module.exports = async ({root,browser,apiUrl,siteUrl,users,action,ids}) => {
  let checks = 0;
  const contexts = [], errors = [];
  const pass = text => { checks++; console.log('PASS UI', text); };
  async function newPage(width = 1280, route = 'home', system = 'light') {
    const ctx = await browser.newContext({ viewport:{width,height:900},colorScheme:system,serviceWorkers:'block' }); contexts.push(ctx);
    await ctx.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.YKS_CONFIG={supabaseUrl:'${apiUrl}',supabaseAnonKey:'fixture'};`}));
    const p = await ctx.newPage();p.on('pageerror',e=>errors.push(e.message)); await p.goto(`${siteUrl}/#${route.startsWith('access_token=')?'':'/'}${route}`);
    await p.waitForFunction(()=>window.DersBoard?.authReady && window.DersUI);
    return p;
  }
  async function login(p,i) {
    await p.evaluate(()=>window.DersUI.navigate('account'));
    await p.fill('#authEmail',users[i].email); await p.fill('#authPassword','test-password'); await p.click('#signInButton');
    await p.waitForFunction(()=>Boolean(window.DersBoard.user));
    await p.evaluate(()=>window.DersTeacher.refresh());
  }
  const go = (p, route) => p.evaluate(route=>window.DersUI.navigate(route),route);
  try {
    const tokenResponse = await fetch(apiUrl+'/auth/v1/token', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:users[1].email,password:'test-password'})});
    const session = await tokenResponse.json();
    const callback = await newPage(1280,`access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}&expires_in=3600&token_type=bearer&type=signup`);
    await callback.waitForFunction(()=>Boolean(window.DersBoard.user));
    assert.equal(await callback.evaluate(()=>location.hash),'#/home');
    assert.equal(await callback.evaluate(()=>window.DersBoard.user.id),users[1].id);pass('Auth callback is consumed before routing and tokens are removed from URL');
    const guest = await newPage(390,'teacher');
    assert.equal(await guest.locator('#accountPage').isVisible(),true);assert.equal(await guest.locator('#teacherPage').isVisible(),false);
    assert.equal(await guest.locator('#teacherPanel [data-action="student"]').count(),0);pass('Direct private route requires sign-in');
    await guest.click('#toggleNavigation'); await guest.getByRole('radio',{name:'Koyu tema'}).check();
    assert.equal(await guest.evaluate(()=>document.documentElement.dataset.theme),'dark');
    await guest.reload();assert.equal(await guest.evaluate(()=>document.documentElement.dataset.theme),'dark');pass('Dark preference survives reload without a light flash');
    await guest.click('#toggleNavigation');await guest.getByRole('radio',{name:'Sistem teması'}).check();
    assert.equal(await guest.evaluate(()=>document.documentElement.dataset.theme),'light');
    await guest.emulateMedia({colorScheme:'dark'});await guest.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
    await guest.emulateMedia({colorScheme:'light'});await guest.waitForFunction(()=>document.documentElement.dataset.theme==='light');pass('System theme follows device changes');
    await guest.getByRole('radio',{name:'Açık tema'}).check();await guest.click('#closeNavigation');
    await guest.waitForFunction(()=>!document.body.classList.contains('drawer-open'));
    await guest.fill('#authEmail',users[1].email);await guest.fill('#authPassword','invalid-password');await guest.click('#signInButton');
    await guest.locator('#syncStatus').getByText('İşlem tamamlanamadı. Bilgilerini kontrol edip tekrar dene.',{exact:true}).waitFor();pass('Authentication errors use understandable Turkish messages');
    await login(guest,1);await go(guest,'home');
    assert.equal(await guest.locator('#board').isVisible(),false);assert.equal(await guest.locator('#teacherPanel').isVisible(),false);
    assert.equal(await guest.locator('#homePage .destination').count(),3);pass('Home contains only four metrics and three destinations');
    await guest.click('#toggleNavigation');await guest.locator('.main-nav [data-route="program"]').click();
    await guest.locator('#programPage').waitFor();assert.equal(await guest.evaluate(()=>document.body.classList.contains('drawer-open')),false);
    await guest.goBack();await guest.locator('#homePage').waitFor();await guest.goForward();await guest.locator('#programPage').waitFor();pass('Mobile drawer, browser back and forward preserve page history');
    const before = await guest.evaluate(()=>JSON.stringify(window.DersBoard.state));
    await guest.reload();await guest.locator('#programPage').waitFor();
    assert.equal(await guest.locator('#editModeButton').isVisible(),true);pass('Program route and authenticated session survive reload');
    await guest.click('#newWeekButton'); await guest.locator('#weekModalBackdrop.open').waitFor();
    await guest.goBack();await guest.waitForFunction(()=>!document.querySelector('#weekModalBackdrop').classList.contains('open'));
    assert.equal(await guest.locator('#programPage').isVisible(),true);pass('System-style back closes a modal before leaving the page');
    await guest.click('#newWeekButton'); await guest.fill('#modalWeekName','Unsaved week');
    guest.once('dialog',d=>d.dismiss());await guest.goBack();await guest.waitForFunction(()=>history.state?.modal==='week');
    assert.equal(await guest.locator('#weekModalBackdrop').isVisible(),true);assert.equal(await guest.inputValue('#modalWeekName'),'Unsaved week');
    guest.once('dialog',d=>d.accept());await guest.click('#closeWeekModal');await guest.waitForFunction(()=>!document.querySelector('#weekModalBackdrop').classList.contains('open'));pass('Dirty modal warns and cancellation retains its content');
    await guest.click('#openQuestEditor');await guest.fill('#manualTitle','Unsaved personal draft');
    guest.once('dialog',d=>d.dismiss());await go(guest,'history');assert.equal(await guest.locator('#programPage').isVisible(),true);
    guest.once('dialog',d=>d.accept());await go(guest,'history');await guest.locator('#historyPage').waitFor();pass('Unsaved page form warns before navigation');
    await guest.locator('[data-history-view="completed"]').click();
    assert.ok(await guest.locator('#completedHistory .history-item').count()>0);
    await guest.selectOption('#historyWeekFilter','original');assert.equal(await guest.locator('#completedHistory .history-item').count(),1);
    await guest.locator('[data-history-view="records"]').click();assert.equal(await guest.locator('#historyList .history-item').count(),1);pass('History records and completed tasks have independent preserved filters');
    await guest.evaluate(()=>window.DersUI.clearDirty(document.getElementById('questForm')));
    await guest.evaluate(()=>{document.getElementById('manualTitle').value='';});
    const after = await guest.evaluate(()=>JSON.stringify(window.DersBoard.state));
    assert.deepEqual(JSON.parse(after),JSON.parse(before));pass('Navigation, themes and filters do not rewrite board or history');
    await go(guest,'account');await guest.click('#syncNowButton');await guest.getByText('Eşitlendi',{exact:true}).waitFor();pass('Account sync control remains functional');
    await guest.click('#signOutButton');await guest.waitForFunction(()=>!window.DersBoard.user);await go(guest,'history');
    assert.equal(await guest.locator('#accountPage').isVisible(),true);pass('Sign-out hides private pages and account data');

    const blank = await newPage();await login(blank,4);await go(blank,'program');
    assert.equal(await blank.locator('#addProgramButton').isVisible(),true);
    await blank.click('#openCategoryEditor');await blank.fill('#categoryNameInput','Biyoloji');await blank.click('#addCategoryButton');
    assert.equal(await blank.evaluate(()=>window.DersBoard.state.categories[0].name),'Biyoloji');
    await blank.click('#openQuestEditor');await blank.fill('#manualTitle','Canlıların ortak özellikleri');await blank.click('#addQuestButton');
    assert.equal(await blank.locator('#addProgramButton').isVisible(),false);assert.equal(await blank.locator('#editModeButton').isVisible(),true);pass('Empty account can add a lesson and quest, then shows Edit instead of Add Program');

    const student = await newPage();await login(student,1);await go(student,'program');
    assert.equal(await student.locator('#editModeButton').innerText(),'Düzenle');
    await student.click('#editModeButton');await student.click('#openQuestEditor');await student.fill('#manualTitle','UI task');await student.fill('#manualDetail','30 soru ve analiz');
    await student.click('#addQuestButton');await student.locator('.quest-title').getByText('UI task',{exact:true}).waitFor();
    await student.locator('.quest').filter({hasText:'UI task'}).locator('.check').click();await student.evaluate(()=>window.DersBoard.flush());
    await go(student,'home');assert.ok((await student.locator('#totalXp').innerText()).includes('680'));pass('Existing quest completion updates XP and home metrics');
    await go(student,'program');
    const longName = 'Çok uzun bir matematik dersi ve çalışma konusu '.repeat(4);
    await student.click('#openCategoryEditor');await student.fill('#categoryNameInput',longName);await student.click('#addCategoryButton');
    const longCategory = await student.evaluate(name=>window.DersBoard.state.categories.find(c=>c.name===name)?.id,longName.trim());
    assert.ok(longCategory,'Long category name was not preserved');
    await student.selectOption('#manualSubject',longCategory);await student.fill('#manualTitle',longName);await student.click('#addQuestButton');
    await student.click('#editModeButton');pass('Lesson and quest creation remain available with long names');
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
    for (const width of [360,390,430,1280]) {
      await student.setViewportSize({width,height:900});
      if(width<=720) assert.ok(await student.locator('#sidebar').evaluate(e=>e.getBoundingClientRect().right<=1),'Closed mobile drawer must not cover content during resize');
      for (const theme of ['light','dark']) {
        await student.evaluate(t=>window.DersTheme.set(t),theme);
        assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width}/${theme} overflow`);
        const overlaps = await student.locator('.quest').evaluateAll(rows=>rows.some(row=>{const a=row.querySelector('.check').getBoundingClientRect(),b=row.querySelector('.quest-main').getBoundingClientRect();return b.left<a.right-1;}));
        assert.equal(overlaps,false);assert.ok(await student.locator('.quest-main').first().evaluate(e=>e.getBoundingClientRect().width)>150);
        const version = await student.locator('.app-version').evaluate(el=>{const box=el.getBoundingClientRect();return {text:el.textContent,left:box.left,right:box.right,top:box.top,bottom:box.bottom,pointerEvents:getComputedStyle(el).pointerEvents};});
        assert.equal(version.text,'v1.0');assert.equal(version.pointerEvents,'none');
        assert.ok(version.left>=0 && version.right<=width && version.top>=0 && version.bottom<=900,`${width}/${theme} version bounds`);
        for (const selector of ['#pageTitle','.app-version']) {
        const contrast = await student.locator(selector).evaluate(el=>{
          const rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
          const lum=c=>{const a=rgb(c);return .2126*a[0]+.7152*a[1]+.0722*a[2];};
          const a=lum(getComputedStyle(el).color),b=lum(getComputedStyle(document.body).backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        });assert.ok(contrast>=4.5,`${theme} ${selector} contrast ${contrast}`);
        }
        await student.screenshot({path:path.join(root,'test-results',`ui-program-${theme}-${width}.png`),fullPage:true});
      }
      pass(`Responsive light/dark layout and long names ${width}px`);
    }
    await student.setViewportSize({width:1280,height:900});await go(student,'home');await student.evaluate(()=>window.DersTheme.set('light'));
    await student.screenshot({path:path.join(root,'test-results','ui-home-desktop.png'),fullPage:true});
    await student.click('#toggleNavigation');assert.equal(await student.evaluate(()=>document.body.classList.contains('nav-compact')),true);
    await student.reload();assert.equal(await student.evaluate(()=>document.body.classList.contains('nav-compact')),true);pass('Desktop sidebar collapse preference persists');
    await student.click('#toggleNavigation');
    await student.locator('.main-nav [data-route="history"]').focus();await student.locator('.main-nav [data-route="history"]').press('Enter');await student.locator('#historyPage').waitFor();
    await student.goBack();await student.locator('#homePage').waitFor();pass('Keyboard navigation and visible focus targets work');
    await student.setViewportSize({width:390,height:844});await student.screenshot({path:path.join(root,'test-results','ui-home-mobile.png'),fullPage:true});
    await student.click('#toggleNavigation');await student.locator('.main-nav [data-route="history"]').click();await student.locator('#historyPage').waitFor();
    await student.reload();await student.locator('#historyPage').waitFor();pass('Direct deep page refresh and mobile navigation stay consistent');

    const invite=(await action(ids[0],'create_invite')).code;await action(ids[1],'request_connection',{code:invite});
    const link=(await action(ids[0],'overview')).connections.find(c=>c.status==='pending');await action(ids[0],'respond_connection',{id:link.id,status:'approved'});
    const teacher = await newPage();await login(teacher,0);await go(teacher,'teacher');
    await teacher.fill('#assignmentName','Retained draft');await teacher.fill('#assignmentRange','14-21 Ekim');await teacher.locator('#assignmentDraft [data-key="title"]').fill('Retained quest');
    const assigned=(await action(ids[1],'overview')).assignments.find(a=>a.status==='accepted').quests[0];
    await action(ids[1],'request_change',{quest_id:assigned.id,changes:{title:'Pending UI change',detail:'30 soru ve analiz',xp:100}});
    await teacher.evaluate(()=>window.DersTeacher.refresh());
    assert.equal(await teacher.inputValue('#assignmentName'),'Retained draft');assert.equal(await teacher.locator('#assignmentDraft [data-key="title"]').inputValue(),'Retained quest');
    assert.ok(Number(await teacher.locator('.main-nav [data-teacher-count]').innerText())>0);pass('Pending badge updates without erasing teacher draft');
    teacher.once('dialog',d=>d.dismiss());await go(teacher,'home');assert.equal(await teacher.locator('#teacherPage').isVisible(),true);pass('Teacher program draft is guarded on navigation');
    await teacher.evaluate(()=>window.DersUI.clearDirty(document.getElementById('assignmentForm')));
    await teacher.locator('#teacherPanel [data-action="student"]').click();await teacher.locator('#studentSummary').waitFor();
    await teacher.goBack();await teacher.locator('dialog').waitFor({state:'hidden'});assert.equal(await teacher.locator('#teacherPage').isVisible(),true);pass('Teacher progress modal participates in browser back');
    await teacher.screenshot({path:path.join(root,'test-results','ui-teacher-desktop.png'),fullPage:true});
    let releaseResponse, received;
    const responseReady = new Promise(resolve=>received=resolve), responseGate = new Promise(resolve=>releaseResponse=resolve);
    await teacher.context().route(apiUrl+'/rest/v1/rpc/ders_action',async route=>{
      if(route.request().postDataJSON().p_action!=='student_board'){await route.continue();return;}
      const response=await route.fetch();received();await responseGate;await route.fulfill({response});
    });
    await teacher.locator('#teacherPanel [data-action="student"]').click();await responseReady;
    await teacher.evaluate(()=>window.DersBoard.client.auth.signOut());await teacher.waitForFunction(()=>!window.DersBoard.user);
    assert.equal(await teacher.locator('#teacherPanel [data-action="student"]').count(),0);pass('Account switch immediately clears teacher cache and controls');
    releaseResponse();await teacher.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Oturum değişti'));
    assert.equal(await teacher.locator('dialog').isVisible(),false);assert.equal(await teacher.locator('#studentSummary').count(),0);pass('Late student response cannot reveal progress after sign-out');
    assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
    fs.writeFileSync(path.join(root,'test-results','ui-result.json'),JSON.stringify({checks,productionTouched:false},null,2));
    console.log(`RESULT: ${checks} interface/navigation/theme scenarios passed`);
  } finally { for(const c of contexts) await c.close(); }
};
