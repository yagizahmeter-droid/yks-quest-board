const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async({root,browser,apiUrl,siteUrl,users})=>{
  const context=await browser.newContext({viewport:{width:1280,height:900},colorScheme:'light',serviceWorkers:'block'});
  const errors=[];let checks=0;
  const pass=text=>{checks++;console.log('PASS appearance',text);};
  await context.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.YKS_CONFIG={supabaseUrl:'${apiUrl}',supabaseAnonKey:'fixture'};`}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(siteUrl);await page.waitForFunction(()=>window.DersUI&&window.DersBoard.authReady);
  const snapshot=()=>page.evaluate(()=>JSON.stringify(window.DersBoard.state));
  try{
    assert.equal(await page.evaluate(()=>window.DersTheme.style),'classic');
    assert.equal(await page.evaluate(()=>window.DersTheme.accent),'green');
    assert.equal(await page.evaluate(()=>window.DersTheme.monochrome),false);pass('Existing defaults remain classic with the original green palette');
    await page.click('#appearanceButton');await page.getByRole('radio',{name:'Liquid Glass',exact:true}).check();
    await page.getByRole('radio',{name:'Koyu',exact:true}).check();await page.getByRole('radio',{name:'Kırmızı',exact:true}).check();
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.DersBoard.authReady&&window.DersUI);
    assert.deepEqual(await page.evaluate(()=>[window.DersTheme.style,window.DersTheme.choice,window.DersTheme.accent]),['glass','dark','red']);
    await page.click('#appearanceButton');assert.equal(await page.getByRole('radio',{name:'Kırmızı',exact:true}).isChecked(),true);pass('Style, theme and accent persist independently across reload');
    await page.getByRole('switch',{name:'Renksiz mod'}).check();assert.equal(await page.getByRole('radio',{name:'Kırmızı',exact:true}).isDisabled(),true);
    await page.getByRole('switch',{name:'Renksiz mod'}).uncheck();assert.equal(await page.getByRole('radio',{name:'Kırmızı',exact:true}).isChecked(),true);pass('Monochrome preserves the chosen accent and exposes an accessible switch');
    await page.getByRole('radio',{name:'Sistem',exact:true}).check();await page.emulateMedia({colorScheme:'light'});
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
    await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');pass('System theme updates glass background and color tokens');
    await page.press('#resetAppearance','Escape');await page.locator('#appearanceDialog').waitFor({state:'hidden'});
    await page.click('#appearanceButton');await page.getByRole('radio',{name:'Klasik',exact:true}).check();
    await page.goBack();await page.locator('#appearanceDialog').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>document.querySelector('#appearanceDialog').dataset.dirty),undefined);pass('Appearance saves immediately and closes through browser back or Escape without draft warnings');
    for(const width of [360,390,430,1280]){
      await page.setViewportSize({width,height:900});
      for(const style of ['classic','glass'])for(const theme of ['light','dark']){
        await page.evaluate(({style,theme})=>{window.DersTheme.setStyle(style);window.DersTheme.set(theme);window.DersTheme.setMonochrome(false);},{style,theme});
        for(const accent of Object.keys(await page.evaluate(()=>window.DersTheme.palettes))){
          await page.evaluate(accent=>window.DersTheme.setAccent(accent),accent);
          const contrast=await page.evaluate(()=>{
            const rgb=hex=>hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
            const lum=hex=>{const a=rgb(hex.replace('#',''));return .2126*a[0]+.7152*a[1]+.0722*a[2];};
            const s=document.documentElement.style,a=lum(s.getPropertyValue('--accent').trim()),b=lum(s.getPropertyValue('--accent-ink').trim());return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
          });assert.ok(contrast>=4.5,`${width}/${style}/${theme}/${accent} button contrast ${contrast}`);
          assert.equal(await page.locator('.brand-mark').first().evaluate(el=>getComputedStyle(el).color),await page.locator('.main-nav a[aria-current="page"]').evaluate(el=>getComputedStyle(el).color));
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        }
        await page.evaluate(()=>window.DersTheme.setAccent('copper'));
        const background=await page.evaluate(()=>getComputedStyle(document.body,'::before').backgroundImage);
        assert.ok(background.includes(`background-${theme}.webp`));
        assert.equal(await page.evaluate(()=>getComputedStyle(document.body,'::before').filter),'none');
        if(style==='glass'){
          assert.ok(await page.locator('.destination').first().evaluate(el=>getComputedStyle(el).backdropFilter.includes('blur')));
        }else assert.equal(await page.locator('.destination').first().evaluate(el=>getComputedStyle(el).backdropFilter),'none');
        await page.screenshot({path:path.join(root,'test-results',`appearance-${style}-${theme}-${width}.png`),fullPage:true});
        await page.click('#appearanceButton');
        assert.equal(await page.locator('#appearanceDialog').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
        assert.ok(await page.locator('#appearanceDialog').evaluate(el=>el.getBoundingClientRect().width)<=width);
        await page.click('#closeAppearance');await page.locator('#appearanceDialog').waitFor({state:'hidden'});
        await page.waitForFunction(()=>history.state?.modal!== 'appearance');
      }
      pass(`Twelve accents, contrast, both styles/themes and settings layout ${width}px`);
    }
    await page.evaluate(()=>{window.DersTheme.setStyle('glass');window.DersTheme.set('dark');window.DersTheme.setMonochrome(true);});
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.DersUI&&window.DersBoard.authReady);
    assert.equal(await page.evaluate(()=>window.DersTheme.monochrome),true);pass('Monochrome survives reopening');
    const beforeReset=await snapshot();await page.click('#appearanceButton');await page.click('#resetAppearance');
    assert.deepEqual(await page.evaluate(()=>[window.DersTheme.style,window.DersTheme.choice,window.DersTheme.accent,window.DersTheme.monochrome]),['classic','system','green',false]);
    await page.click('#closeAppearance');assert.equal(await snapshot(),beforeReset);pass('Reset restores defaults and leaves the current board JSON untouched');
    await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.DersTheme.setStyle('glass'));
    const reducedDuration=await page.locator('.switch-track').evaluate(el=>getComputedStyle(el,'::after').transitionDuration);
    assert.ok(parseFloat(reducedDuration)<=0.00001,`Reduced-motion transition is too long: ${reducedDuration}`);pass('Reduced-motion reduces settings animation to at most 0.01ms');
    for(const name of ['light','dark'])assert.equal((await context.request.get(`${siteUrl}/assets/background-${name}.webp`)).status(),200);
    await page.evaluate(()=>window.DersUI.navigate('account'));await page.fill('#authEmail',users[1].email);await page.fill('#authPassword','test-password');await page.click('#signInButton');
    await page.waitForFunction(()=>Boolean(window.DersBoard.user));await page.evaluate(()=>window.DersBoard.flush());await page.evaluate(()=>window.DersUI.navigate('program'));
    await page.waitForFunction(()=>document.querySelector('#programPage').hidden===false);
    const before=await snapshot();await page.click('#appearanceButton');await page.getByRole('radio',{name:'Mavi',exact:true}).check();await page.click('#closeAppearance');
    assert.equal(await snapshot(),before);pass('Signed-in program data and session are preserved when changing appearance');
    const scrolling=await page.evaluate(async()=>{
      const row=document.querySelector('.quest'),card=row?.parentElement;if(!row)return null;
      const copies=Array.from({length:300},()=>row.cloneNode(true));card.append(...copies);
      const start=performance.now();for(let i=0;i<12;i++){window.scrollTo(0,(i+1)*500);await new Promise(requestAnimationFrame);}
      const result={scroll:scrollY,elapsed:performance.now()-start,questBlur:getComputedStyle(row).backdropFilter};copies.forEach(el=>el.remove());window.scrollTo(0,0);return result;
    });assert.ok(scrolling?.scroll>0);assert.equal(scrolling.questBlur,'none');assert.equal(await snapshot(),before);pass('Long-list scrolling uses one frosted lesson surface rather than per-quest blur');
    assert.deepEqual(errors,[]);pass('No appearance JavaScript errors');
    fs.writeFileSync(path.join(root,'test-results','appearance-result.json'),JSON.stringify({passed:checks,paletteCombinations:192,completedAt:new Date().toISOString()},null,2));
    console.log(`RESULT: ${checks} appearance scenarios passed`);
  }finally{await context.close();}
};
