const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
module.exports=async({root,browser,siteUrl})=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',hasTouch:true});
  let checks=0;const pass=m=>{checks++;console.log('PASS dropdown layers',m);};
  try {
    await ctx.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.YKS_CONFIG={};'}));
    const p=await ctx.newPage();await p.goto(siteUrl);await p.waitForFunction(()=>window.DersSelect&&window.DersBoard);
    await p.evaluate(()=>{
      const fixture=document.createElement('div');fixture.id='layerFixture';fixture.style='position:fixed;inset:90px 20px auto auto;width:280px;z-index:100;background:var(--panel);padding:16px';
      fixture.innerHTML='<label class="field">Page choice<select data-searchable><option value="a">First option</option><option value="b">Second option</option></select></label>';
      document.body.append(fixture);
      const d=document.createElement('dialog');d.id='layerDialog';d.className='ders-dialog';d.innerHTML='<label class="field">Dialog choice<select data-searchable><option value="a">First option</option><option value="b">Second option</option></select></label><input id="outsideSelect" aria-label="Outside select" style="display:block;margin-top:220px"><button type="button" id="afterSelect">After select</button>';document.body.append(d);
      window.layerTrace=[];window.layerChanges={input:0,change:0};for(const type of ['input','change'])document.addEventListener(type,e=>{if(e.target.matches('#layerFixture select,#layerDialog select'))window.layerChanges[type]++;});
      for(const type of ['pointerdown','mousedown','focusin','focusout','pointerup','mouseup','click'])document.addEventListener(type,e=>window.layerTrace.push([type,e.target.tagName,e.target.className]),true);
    });
    const choose=async(container,method)=>{
      const counts=await p.evaluate(()=>({...window.layerChanges}));
      const wrap=p.locator(container+' .select-control');await wrap.locator('.select-trigger').click();
      await wrap.locator('[role="option"]').filter({hasText:'Second option'})[method]();
      const value=await wrap.locator('select').inputValue();
      if(value!=='b')console.log('REPRO pointer event trace',JSON.stringify(await p.evaluate(()=>window.layerTrace)));
      assert.equal(value,'b',`${container}: ${method} must commit the selected option`);
      assert.equal(await wrap.locator('.select-trigger').getAttribute('aria-expanded'),'false');
      assert.deepEqual(await p.evaluate(()=>window.layerChanges),{input:counts.input+1,change:counts.change+1},'One click must produce exactly one input and change event');
    };
    await choose('#layerFixture','click');pass('Mouse selection in a labeled page control');
    await p.evaluate(()=>document.getElementById('layerDialog').showModal());
    for(const style of ['classic','glass'])for(const theme of ['light','dark']){
      await p.evaluate(({style,theme})=>{window.DersTheme.setStyle(style);window.DersTheme.set(theme);document.querySelector('#layerDialog select').value='a';document.querySelector('#layerDialog select').dispatchEvent(new Event('change',{bubbles:true}));},{style,theme});
      await choose('#layerDialog','click');pass(`Mouse selection in modal: ${style}/${theme}`);
      const wrap=p.locator('#layerDialog .select-control');await wrap.locator('.select-trigger').click();await wrap.locator('.select-search').fill('First');await wrap.locator('.select-search').press('Enter');assert.equal(await wrap.locator('select').inputValue(),'a');
      await wrap.locator('.select-trigger').click();await wrap.locator('.select-search').press('Escape');assert.equal(await p.locator('#layerDialog').isVisible(),true);
      await p.evaluate(()=>window.DersBoard.toast('Program gönderildi'));
      assert.equal(await p.locator('#toast').evaluate(e=>e.matches(':popover-open')),true,'Toast must be in the top layer above modal dialogs');
      assert.equal(await p.locator('#layerDialog').evaluate(e=>e.open),true);
      assert.equal(await p.evaluate(()=>document.activeElement?.id==='toast'),false);
    }
    pass('Keyboard search/selection, Escape and non-focus-stealing toast across themes');
    await p.setViewportSize({width:390,height:844});await p.locator('#layerDialog select').evaluate(e=>{e.value='a';e.dispatchEvent(new Event('change',{bubbles:true}));});
    await choose('#layerDialog','tap');pass('Touch selection in modal');
    const wrap=p.locator('#layerDialog .select-control');await wrap.locator('.select-trigger').click();await p.locator('#outsideSelect').click();assert.equal(await wrap.locator('.select-trigger').getAttribute('aria-expanded'),'false');pass('Outside pointer closes dropdown');
    await wrap.locator('.select-trigger').click();await wrap.locator('.select-search').press('Tab');assert.equal(await wrap.locator('.select-trigger').getAttribute('aria-expanded'),'false');pass('Tab dismisses popup without selecting');
    await p.evaluate(()=>{window.DersBoard.toast('Önceki bildirim');document.getElementById('layerDialog').close();document.getElementById('layerDialog').showModal();window.DersBoard.toast('Yeni bildirim');});
    assert.equal(await p.locator('#toast').innerText(),'Yeni bildirim');assert.equal(await p.locator('#toast').evaluate(e=>e.matches(':popover-open')),true);
    await p.screenshot({path:path.join(root,'test-results','dropdown-toast-mobile.png')});
    await p.evaluate(()=>document.getElementById('layerDialog').close());
    await p.click('#toggleNavigation');await p.evaluate(()=>window.DersBoard.toast('Drawer bildirimi'));assert.equal(await p.locator('#toast').evaluate(e=>e.matches(':popover-open')),true);
    await p.screenshot({path:path.join(root,'test-results','dropdown-toast-drawer.png')});pass('Repeated notifications remain above newly opened modal and mobile drawer');
    await p.waitForFunction(()=>!document.querySelector('#toast').matches(':popover-open'));pass('Toast leaves top layer after timeout');
    fs.writeFileSync(path.join(root,'test-results/dropdown-layer-result.json'),JSON.stringify({checks,productionTouched:false},null,2));
  } finally {await ctx.close();}
};
if(require.main===module){
  const root=path.resolve(__dirname,'..');process.env.PORT='0';const server=require('../scripts/server.cjs');
  (async()=>{let browser;try{await new Promise(r=>server.listening?r():server.once('listening',r));browser=await require('playwright').chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});await module.exports({root,browser,siteUrl:`http://127.0.0.1:${server.address().port}`});}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
}
