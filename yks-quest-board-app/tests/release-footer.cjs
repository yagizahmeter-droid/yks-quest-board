const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');

async function verify(browser,url){
 let checks=0;const pass=message=>{checks++;console.log('PASS release footer',message);};
 const context=await browser.newContext({viewport:{width:1280,height:900},hasTouch:true,serviceWorkers:'block'});
 try{
  // Layout verification uses an isolated guest browser without contacting either database.
  await context.route('**/config.js',route=>route.fulfill({contentType:'text/javascript',body:'window.YKS_CONFIG={};'}));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);await page.waitForFunction(()=>window.DersBoard?.authReady&&window.DersReleases);
  const original=await page.evaluate(()=>structuredClone(DersBoard.state));
  assert.equal(await page.locator('.app-footer').evaluate(el=>el.parentElement===document.body),true);
  const footer=page.locator('.app-footer'),button=page.locator('#versionHistoryButton');
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  for(const [width,height] of [[360,640],[390,844],[430,932],[844,390],[1280,900],[1920,1080],[2560,1080]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await footer.waitFor({state:'visible'});
   for(const style of ['classic','glass'])for(const theme of ['light','dark']){
    await page.evaluate(({style,theme})=>{DersTheme.setStyle(style);DersTheme.set(theme);},{style,theme});
    const box=await footer.boundingBox();assert.ok(box);
    const geometry=await footer.evaluate(el=>{const r=el.getBoundingClientRect(),a=el.firstElementChild.getBoundingClientRect(),b=el.lastElementChild.getBoundingClientRect();return {position:getComputedStyle(el).position,right:document.documentElement.clientWidth-r.right,bottom:innerHeight-r.bottom,sideBySide:a.right<=b.left+1&&Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<1,overflow:document.documentElement.scrollWidth>innerWidth+1};});
    assert.equal(geometry.position,'fixed');assert.equal(geometry.sideBySide,true);assert.equal(geometry.overflow,false);
    assert.ok(geometry.right>=12&&geometry.right<=24);assert.ok(geometry.bottom>=12&&geometry.bottom<=24);
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height);
    if(width<=720)assert.ok((await button.boundingBox()).height>=44);
    const contrast=await footer.evaluate(el=>{const luminance=color=>{const channels=color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};return [...el.children].map(child=>{const css=getComputedStyle(child),a=luminance(css.color),b=luminance(css.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});});
    assert.ok(contrast.every(value=>value>=4.5));
   }
   await page.screenshot({path:path.join(root,'test-results',`release-footer-${width}.png`)});
   pass(`Viewport corner, side-by-side text and contrast in four styles/themes at ${width}x${height}`);
  }
  await page.setViewportSize({width:1280,height:900});
  const initial=await footer.boundingBox();await page.click('#toggleNavigation');
  await page.waitForFunction(()=>document.body.classList.contains('nav-compact'));assert.deepEqual(await footer.boundingBox(),initial);
  await page.click('#toggleNavigation');pass('Footer position is independent of sidebar width');
  await page.evaluate(()=>{document.getElementById('homePage').style.minHeight='1800px';});
  await page.evaluate(()=>scrollTo(0,600));assert.deepEqual(await footer.boundingBox(),initial);
  await page.evaluate(()=>{document.getElementById('homePage').style.minHeight='';scrollTo(0,0);});pass('Scrolling does not move the viewport footer');
  await button.click();await page.locator('#releaseHistoryDialog').waitFor();assert.equal(await footer.isVisible(),false);
  const dates=await page.locator('#releaseHistoryDialog time').evaluateAll(nodes=>nodes.map(el=>[el.dateTime,el.textContent]));
  const releases=require('../release-history.js');assert.deepEqual(dates,releases.releases.map(r=>[r.date,releases.formatDate(r.date)]));
  assert.equal(await page.locator('#releaseHistoryDialog section').count(),releases.releases.length);
  assert.equal(await page.locator('#releaseHistoryDialog section').first().locator('h4').count(),releases.releases[0].sections.length);
  assert.equal(await button.textContent(),'v'+require('../package.json').version);
  assert.equal(await page.locator('#releaseHistoryDialog section').filter({hasText:'Coming Soon'}).count(),0);
  await page.keyboard.press('Escape');await footer.waitFor({state:'visible'});await button.focus();await page.keyboard.press('Enter');await page.locator('#releaseHistoryDialog').waitFor();
  await page.goBack();await page.locator('#releaseHistoryDialog').waitFor({state:'hidden'});await footer.waitFor({state:'visible'});
  assert.equal(await button.evaluate(el=>el===document.activeElement),true);pass('Changelog dates, mouse/keyboard activation, Escape, Back and focus restoration work');
  await page.click('#appearanceButton');assert.equal(await footer.isVisible(),false);await page.click('#closeAppearance');await footer.waitFor({state:'visible'});
  await page.waitForFunction(()=>!history.state.modal);
  await page.evaluate(()=>document.getElementById('newWeekButton').click());await page.locator('#weekModalBackdrop').waitFor();assert.equal(await footer.isVisible(),false);
  await page.click('#closeWeekModal');await footer.waitFor({state:'visible'});await page.waitForFunction(()=>!history.state.modal);pass('Native dialogs and the week overlay never expose a clickable background footer');
  await page.setViewportSize({width:390,height:844});await page.click('#toggleNavigation');assert.equal(await footer.isVisible(),false);
  await page.click('#closeNavigation');await page.waitForFunction(()=>!history.state.modal);await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await footer.waitFor({state:'visible'});pass('Mobile drawer hides the independent footer and restores it on close');
  await page.setViewportSize({width:360,height:640});await page.evaluate(()=>scrollTo(0,0));await footer.waitFor({state:'hidden'});
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await footer.waitFor({state:'visible'});pass('Short mobile viewports hide the footer while page content crosses its corner');
  await page.evaluate(()=>{DersUI.navigate('account');document.getElementById('signedOutPanel').style.display='grid';});await page.locator('#authEmail').focus();assert.equal(await footer.isVisible(),false);
  await page.locator('#authEmail').blur();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await footer.waitFor({state:'visible'});
  const last=await page.locator('#authSwitch').boundingBox(),bottom=await footer.boundingBox();assert.ok(last.y+last.height<=bottom.y);
  await button.tap();await page.locator('#releaseHistoryDialog').waitFor();await page.locator('#releaseHistoryDialog button').tap();await footer.waitFor({state:'visible'});pass('Touch target, mobile text input and bottom content clearance work');
  assert.deepEqual(await page.evaluate(()=>DersBoard.state),original);assert.deepEqual(errors,[]);pass('Guest board, quests, XP and history remain unchanged; no JavaScript errors');
  const result={checks,databaseRequests:0,productionTouched:false};fs.writeFileSync(path.join(root,'test-results/release-footer-result.json'),JSON.stringify(result,null,2));return result;
 }finally{await context.close();}
}

if(require.main===module)(async()=>{
 let server,browser;
 try{
  let url=process.env.FOOTER_TEST_URL;
  if(!url){process.env.PORT='0';server=require('../scripts/server.cjs');await new Promise(resolve=>server.listening?resolve():server.once('listening',resolve));url=`http://127.0.0.1:${server.address().port}/`;}
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const result=await verify(browser,url);console.log('RESULT',JSON.stringify(result));
 }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
module.exports=verify;
