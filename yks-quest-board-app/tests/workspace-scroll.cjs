const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async({root,browser,siteUrl,apiUrl,key='fixture',users,password='test-password'})=>{
 const context=await browser.newContext({viewport:{width:1280,height:560},serviceWorkers:'block'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:`window.YKS_CONFIG={supabaseUrl:'${apiUrl}',supabaseAnonKey:'${key}'};`}));
 try{
  await page.goto(siteUrl+'/#/account');
  await page.fill('#authEmail',users[0].email);await page.fill('#authPassword',password);await page.click('#signInButton');
  await page.locator('#adminButton').waitFor({state:'visible'});
  await page.evaluate(async()=>{await DersBoard.flush();await DersTeacher.refresh();});
  const original=await page.evaluate(()=>structuredClone(DersBoard.state));
  let checks=0;
  for(const width of [390,1280])for(const style of ['classic','glass'])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:560});
   await page.evaluate(({style,theme})=>{DersTheme.setStyle(style);DersTheme.set(theme);},{style,theme});
   for(const route of ['home','program','teacher','history','account']){
    await page.evaluate(route=>{DersUI.navigate(route);window.scrollTo(0,0);const spacer=document.createElement('div');spacer.dataset.scrollFixture='';spacer.style.height='1500px';document.querySelector('.page-view:not([hidden])').append(spacer);},route);
    const before=await page.evaluate(()=>({header:document.querySelector('.workspace-header').getBoundingClientRect().top,sidebar:document.querySelector('.sidebar').getBoundingClientRect().top,content:document.querySelector('.page-view:not([hidden])').getBoundingClientRect().top}));
    await page.mouse.move(width-60,360);await page.mouse.wheel(0,400);
    await page.waitForFunction(()=>scrollY>=300);
    const after=await page.evaluate(()=>({y:scrollY,header:document.querySelector('.workspace-header').getBoundingClientRect().top,sidebar:document.querySelector('.sidebar').getBoundingClientRect().top,content:document.querySelector('.page-view:not([hidden])').getBoundingClientRect().top}));
    assert.ok(Math.abs(before.header-after.header-after.y)<2,`${route}/${width}/${style}/${theme}: header obstructs page content`);
    assert.ok(Math.abs(before.content-after.content-after.y)<2);
    assert.ok(Math.abs(before.sidebar-after.sidebar)<2,'Sidebar should retain its existing position');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.evaluate(()=>{document.querySelector('[data-scroll-fixture]').remove();window.scrollTo(0,0);});checks++;
   }
  }
  await page.click('#appearanceButton');await page.click('#closeAppearance');
  await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
  await page.evaluate(()=>DersUI.navigate('program'));
  await page.setViewportSize({width:1280,height:560});
  await page.mouse.move(1100,380);await page.mouse.wheel(0,200);await page.waitForTimeout(200);
  await page.screenshot({path:path.join(root,'test-results/workspace-scroll-desktop.png')});
  await page.setViewportSize({width:390,height:560});
  await page.screenshot({path:path.join(root,'test-results/workspace-scroll-mobile.png')});
  assert.deepEqual(await page.evaluate(()=>structuredClone(DersBoard.state)),original);assert.deepEqual(errors,[]);
  console.log(`PASS workspace scroll ${checks} real-wheel page/style/theme/viewport checks; header follows content, sidebar and account state unchanged`);
 }finally{await context.close();}
};
