const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
module.exports=async({root,browser,apiUrl,siteUrl,users,action,ids})=>{
  let checks=0;const pass=m=>{checks++;console.log('PASS catalog UI',m);};
  const ctx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
  try {
    await ctx.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.YKS_CONFIG={supabaseUrl:'${apiUrl}',supabaseAnonKey:'local-public-fixture'};`}));
    const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto(siteUrl+'/#/account');await p.fill('#authEmail',users[0].email);await p.fill('#authPassword','test-password');await p.click('#signInButton');await p.waitForFunction(()=>Boolean(window.DersBoard.user));
    await p.evaluate(()=>window.DersUI.navigate('teacher'));await p.locator('#teacherPanel [data-action="student"]').first().click();
    const f=k=>p.locator(`#assignmentDraft [data-index="0"] [data-key="${k}"]`);
    const choose=async(key,value)=>{const control=f(key).locator('..');await control.locator('.select-trigger').click();const label=await f(key).locator('option').evaluateAll((options,value)=>options.find(o=>o.value===value).label,value);await control.getByRole('option',{name:label,exact:true}).click();assert.equal(await f(key).inputValue(),value);};
    assert.equal(await f('topic_category').isDisabled(),true);
    await choose('category','Matematik');assert.equal(await f('topic').locator('option').count(),1);assert.equal(await f('topic').isDisabled(),true);
    await f('detail').fill('50 soru ve analiz');await f('xp').fill('235');await choose('repeat_kind','weekly');await f('repeat_target').fill('7');
    await choose('topic_category','Problemler');await choose('topic','Yaş Problemleri');
    await choose('topic_category','Geometri');assert.equal(await f('topic').inputValue(),'');assert.equal(await f('topic').locator('option[value="Yaş Problemleri"]').count(),0);
    await choose('topic','Katı Cisimler (Prizma, Piramit, Silindir, Koni, Küre)');
    assert.equal(await f('detail').inputValue(),'50 soru ve analiz');assert.equal(await f('xp').inputValue(),'235');assert.equal(await f('repeat_target').inputValue(),'7');
    pass('Category filters subtopics; changing it preserves description, XP and repeats');
    await choose('exam_type','AYT');assert.equal(await f('category').inputValue(),'');assert.equal(await f('topic_category').inputValue(),'');assert.equal(await f('topic').inputValue(),'');
    await choose('category','Biyoloji');await choose('topic_category','İnsan Fizyolojisi');await choose('topic','Sinir Sistemi');
    await choose('category','Matematik');assert.equal(await f('topic_category').inputValue(),'');assert.equal(await f('topic').inputValue(),'');
    const search=async(key,text,value)=>{const control=f(key).locator('..');await control.locator('.select-trigger').click();await control.locator('.select-search').fill(text);await control.locator('.select-search').press('ArrowDown');await control.locator('.select-search').press('Enter');assert.equal(await f(key).inputValue(),value);};
    await search('topic_category','Analiz','Analiz (LTI)');await search('topic','Türev','Türev (Türev Alma Kuralları, Teğet-Normal, Ekstremum Noktalar)');
    pass('Exam/lesson reset dependencies; category and subtopic support search and keyboard');
    assert.equal(await f('xp').inputValue(),'235');assert.equal(await f('repeat_kind').inputValue(),'weekly');assert.equal(await f('repeat_target').inputValue(),'7');
    await choose('topic','__category');assert.equal(await p.locator('#assignmentDraft [data-index="0"] [data-role="derived-title"]').innerText(),'Analiz (LTI)');assert.equal(await f('title').count(),0);await f('detail').fill('Açıklama korunmalı');
    await p.locator('[data-action="draft-add"]').click();assert.equal(await p.locator('#assignmentDraft [data-index="0"] [data-role="derived-title"]').innerText(),'Analiz (LTI)');
    pass('General scope derives category title without a manual name field and survives draft re-render');
    await choose('exam_type','KPSS');await choose('category','Tarih');await choose('topic_category','Genel Konular');await choose('topic','Osmanlı Tarihi');
    assert.equal(await f('topic').locator('option[value="Milli Mücadele Dönemi"]').count(),0);pass('KPSS remains separate and selectable');
    await choose('exam_type','TYT');await choose('category','Türkçe');await choose('topic_category','Dil Bilgisi');await choose('topic','Sözcük Türleri (İsim, Sıfat, Zamir, Zarf, Edat, Bağlaç, Ünlem)');
    for(const width of [360,390,430,1280]) for(const theme of ['light','dark']) {
      await p.setViewportSize({width,height:900});await p.evaluate(theme=>{window.DersTheme.setStyle('glass');window.DersTheme.set(theme);},theme);
      const control=f('topic').locator('..');await control.locator('.select-trigger').click();
      assert.equal(await control.locator('.select-popup').evaluate(e=>e.matches(':popover-open')),true);
      const bounds=await control.locator('.select-popup').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
      assert.equal(await p.locator('#questDialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
      await p.screenshot({path:path.join(root,'test-results',`catalog-${theme}-${width}.png`),fullPage:true});
      await control.locator('.select-search').press('Escape');assert.equal(await p.locator('#questDialog').isVisible(),true);
    }
    pass('Long parenthetical titles and dropdowns fit 360/390/430/1280px in both themes');
    await p.evaluate(()=>window.DersUI.clearDirty(document.getElementById('questDialog')));await p.click('#dismissDialog');
    const assignment=await action(ids[0],'assign_program',{student_id:ids[1],week_name:'Legacy catalog copy',quests:[{exam_type:'TYT',category:'Fizik',title:'Basınç',detail:'Önceki açıklama',xp:175,repeat_kind:'weekly',repeat_target:4}]});
    await p.evaluate(()=>window.DersTeacher.refresh());await p.locator(`#teacherPanel [data-action="student"][data-id="${ids[1]}"]`).click();await p.selectOption('#assignmentTemplate',assignment.assignment_id);await p.locator('[data-action="draft-copy"]').click();
    assert.equal(await f('topic').inputValue(),'__legacy');assert.equal(await p.locator('#assignmentDraft [data-index="0"] [data-role="derived-title"]').innerText(),'Basınç');assert.equal(await f('detail').inputValue(),'Önceki açıklama');assert.equal(await f('xp').inputValue(),'175');assert.equal(await f('repeat_target').inputValue(),'4');
    pass('Legacy titles outside new catalog copy unchanged as read-only legacy options');
    assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
    fs.writeFileSync(path.join(root,'test-results/catalog-ui-result.json'),JSON.stringify({checks,productionTouched:false},null,2));
  } finally { await ctx.close(); }
};
