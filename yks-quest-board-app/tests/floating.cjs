const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({root,browser,apiUrl,siteUrl})=>{
  const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'}),page=await context.newPage();
  const errors=[],measurements=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.YKS_CONFIG={supabaseUrl:'${apiUrl}',supabaseAnonKey:'fixture'};`}));
  try{
    await page.goto(siteUrl);await page.waitForFunction(()=>window.DersUI&&window.DersBoard.authReady);
    await page.click('#appearanceButton');await page.getByRole('radio',{name:'Saydam',exact:true}).check();
    assert.equal(await page.getByRole('radio',{name:'Liquid Glass',exact:true}).count(),0);
    await page.click('#closeAppearance');await page.waitForFunction(()=>history.state?.modal!=='appearance');
    await page.reload();await page.waitForFunction(()=>window.DersUI&&window.DersBoard.authReady);
    assert.equal(await page.evaluate(()=>window.DersTheme.style),'glass');
    for(const width of [360,390,430,768,1280,1920]){
      await page.setViewportSize({width,height:900});
      await page.evaluate(async()=>{await new Promise(requestAnimationFrame);for(const e of document.querySelectorAll('.sidebar,.workspace'))for(const animation of e.getAnimations())await animation.finished;});
      for(const style of ['classic','glass'])for(const theme of ['light','dark']){
        await page.evaluate(({style,theme})=>{DersTheme.setStyle(style);DersTheme.set(theme);},{style,theme});
        await page.waitForFunction(width=>{const a=document.querySelector('.sidebar').getBoundingClientRect(),b=document.querySelector('.workspace-header').getBoundingClientRect(),expected=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'));return width>720?Math.abs(a.width-expected)<.1&&b.left-a.right>=19:a.right<=0&&b.left>=7;},width,{timeout:5000});
        const layout=await page.evaluate(()=>{
          const box=selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,radii:[s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomLeftRadius,s.borderBottomRightRadius],blur:s.backdropFilter,fill:s.backgroundColor};};
          return {sidebar:box('.sidebar'),header:box('.workspace-header'),stat:box('.stat'),destination:box('.destination'),overview:box('.overview'),title:box('.page-header'),button:box('#appearanceButton'),overflow:document.documentElement.scrollWidth>innerWidth+1};
        });
        assert.equal(layout.overflow,false,`${width}/${style}/${theme} overflow`);
        assert.ok(layout.header.top>=8&&width-layout.header.right>=7,`${width} floating header`);
        for(const name of ['header','title','stat','destination'])assert.ok(layout[name].radii.every(v=>v===layout[name].radii[0]&&parseFloat(v)>=10),`${name} inconsistent corners`);
        assert.equal(layout.overview.blur,'none');assert.equal(layout.overview.fill,'rgba(0, 0, 0, 0)');
        assert.equal(layout.button.blur,'none','Header button must not stack a second blur');
        if(width>720){
          assert.ok(layout.sidebar.left>=20&&layout.sidebar.top>=20&&900-layout.sidebar.bottom>=20);
          assert.ok(layout.header.left-layout.sidebar.right>=16,`${width}/${style}/${theme} header ${layout.header.left}, sidebar ${layout.sidebar.right}`);
          assert.ok(layout.sidebar.radii.every(v=>v==='24px'));
        }else assert.ok(layout.sidebar.right<=0,'Hidden drawer must stay outside the viewport');
        if(style==='glass'){
          assert.ok(layout.stat.blur.includes('blur'));
          const opacity=Number(layout.stat.fill.match(/[\d.]+/g)[3]);assert.ok(opacity>=.35&&opacity<=.75,'Approved frosted card alpha must stay translucent: '+layout.stat.fill);
        }else {assert.equal(layout.stat.blur,'none');assert.ok(layout.stat.fill.startsWith('rgb('));}
        await page.screenshot({path:path.join(root,'test-results',`floating-${style}-${theme}-${width}.png`),fullPage:true});
        measurements.push({width,style,theme,layout});
      }
    }
    await page.setViewportSize({width:390,height:700});await page.click('#toggleNavigation');
    await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().left>=7.9);
    assert.ok(await page.locator('.sidebar').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=8&&r.top>=8&&r.bottom<=692;}));
    await page.press('#closeNavigation','Tab');assert.equal(await page.evaluate(()=>document.querySelector('#sidebar').contains(document.activeElement)),true);
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.body.classList.contains('drawer-open'));
    assert.equal(await page.evaluate(()=>document.activeElement.id),'toggleNavigation');
    await page.setViewportSize({width:1280,height:560});await page.click('#toggleNavigation');
    await page.waitForFunction(()=>document.body.classList.contains('nav-compact'));
    assert.ok(await page.locator('.workspace-header').evaluate(e=>e.getBoundingClientRect().left)>100);
    await page.click('#toggleNavigation');await page.waitForFunction(()=>!document.body.classList.contains('nav-compact'));
    const scroll=await page.evaluate(async()=>{
      const height=document.querySelector('.workspace').style.minHeight;document.querySelector('.workspace').style.minHeight='3000px';window.scrollTo(0,700);
      await new Promise(requestAnimationFrame);const top=document.querySelector('.workspace-header').getBoundingClientRect().top;
      document.querySelector('.workspace').style.minHeight=height;window.scrollTo(0,0);return top;
    });assert.ok(scroll>=-677&&scroll<=-675,'Workspace header must scroll with page content');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(root,'test-results','floating-result.json'),JSON.stringify({combinations:measurements.length,renamedStyle:true,persistedGlassPreference:true,drawerKeyboard:true,compactNavigation:true,scrollingHeader:true,measurements},null,2));
    console.log('PASS floating 24 responsive style/theme combinations, consistent corners, single blur layers, Saydam preference, keyboard drawer and scrolling header');
  }finally{await context.close();}
};
