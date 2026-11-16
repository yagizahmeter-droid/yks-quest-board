const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),core=require('../focus-core.js'),source=fs.readFileSync(path.join(root,'study.js'),'utf8');
const startTime=Date.parse('2026-11-12T10:00:00Z'),settings={workMs:60000,breakMs:60000,repeat:true,auto:true,sound:true};
let checks=0;
function pass(message){checks++;console.log('PASS v140 focus',message);}

function harness(motion='spy'){
 let now=startTime,failWrite=false,serial=0;
 const values=new Map(),intervals=new Map(),listeners=new Map(),calls=[],log=[];
 const storage={getItem:key=>values.get(key)||null,setItem(key,value){if(failWrite)throw Error('Synthetic storage failure');values.set(key,value);log.push('persist');}};
 const document={hidden:false,addEventListener(name,fn){listeners.set(name,fn);},dispatchEvent(event){log.push(event.type);}};
 class Audio {constructor(){this.state='running';this.currentTime=0;}resume(){return Promise.resolve();}createOscillator(){return {frequency:{},connect(){},start(){log.push('audio');},stop(){}};}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}}
 const window={DersFocusCore:core,DersBoard:{user:{id:'synthetic-focus-user'},toast(){}},AudioContext:Audio,addEventListener(){}};
 if(motion!=='absent')window.DersMotion=motion==='partial'?{}:{focusEvent(session,events){log.push('focusEvent');calls.push({session:structuredClone(session),events:structuredClone(events),saved:JSON.parse(storage.getItem('ders-learning.v113:synthetic-focus-user'))});if(motion==='throws')throw Error('Synthetic optional feedback failure');},feedback(){throw Error('Background errors must not request error feedback');}};
 vm.runInNewContext(source,{window,document,localStorage:storage,navigator:{onLine:false},Date:class extends Date{static now(){return now;}},crypto:{randomUUID:()=>`synthetic-session-${++serial}`},setInterval:(fn,ms)=>intervals.set(ms,fn),CustomEvent:class{constructor(type){this.type=type;}}},{filename:'study.js'});
 return {study:window.DersStudy,calls,log,setTime(value){now=value;},fail(value){failWrite=value;},tick(){intervals.get(500)();},visibility(){listeners.get('visibilitychange')();}};
}
function unit(){
 const h=harness();h.study.start(settings);h.log.length=0;h.setTime(startTime+60000);h.tick();
 assert.equal(h.study.session.phase,'break');assert.deepEqual(h.calls[0].events,['work-ended']);assert.deepEqual(h.calls[0].session.events,[]);assert.deepEqual(h.calls[0].saved.session,h.calls[0].session);
 assert.ok(h.log.indexOf('persist')<h.log.indexOf('audio'));assert.ok(h.log.indexOf('audio')<h.log.indexOf('focusEvent'));assert.ok(h.log.indexOf('focusEvent')<h.log.indexOf('ders:study'));
 h.tick();h.visibility();assert.equal(h.calls.length,1,'Unchanged ticks cannot replay captured events');
 h.setTime(startTime+120000);h.tick();assert.equal(h.study.session.cycle,2);assert.deepEqual(h.calls[1].events,['break-ended']);
 h.setTime(startTime+300000);h.tick();assert.deepEqual(h.calls[2].events,['work-ended','break-ended','work-ended']);
 pass('Committed tick events survive event clearing; audio, emit and timestamp recovery retain their order');

 const a=harness();a.study.start({...settings,auto:false});a.setTime(startTime+60000);a.study.act('next');
 assert.equal(a.study.session.phase,'break');assert.deepEqual(a.calls[0].events,['work-ended']);assert.deepEqual(a.calls[0].saved.session.events,[]);
 a.study.act('finish');assert.deepEqual(a.calls[1].events,['finished']);assert.equal(a.calls[1].saved.session.status,'ended');
 const single=harness();single.study.start({...settings,repeat:false});single.setTime(startTime+60000);single.tick();assert.deepEqual(single.calls[0].events,['work-ended','finished']);
 pass('Manual actions and one-shot completion forward the original events after persistence');

 for(const method of ['tick','act']){
  const f=harness();f.study.start(settings);const before=structuredClone(f.study.session);f.log.length=0;f.fail(true);f.setTime(startTime+(method==='tick'?60000:10000));
  if(method==='tick'){f.tick();assert.match(f.study.status,/kaydedilemedi/);}else{assert.throws(()=>f.study.act('finish'),/kaydedilemedi/);assert.deepEqual(f.study.session,before);}
  assert.equal(f.calls.length,0);assert.equal(f.log.includes('audio'),false);assert.equal(f.log.includes('focusEvent'),false);
 }
 pass('Failed tick/action commits do not dispatch feedback or audio; action rollback is unchanged');

 for(const mode of ['absent','partial','throws']){
  const optional=harness(mode);optional.study.start({...settings,repeat:false});optional.setTime(startTime+60000);assert.doesNotThrow(()=>optional.tick());
  assert.equal(optional.study.session.status,'completed');assert.ok(optional.log.includes('audio'));assert.equal(optional.log.at(-1),'ders:study');
  const action=harness(mode);action.study.start(settings);assert.doesNotThrow(()=>action.study.act('finish'));assert.equal(action.study.session.status,'ended');assert.equal(action.log.at(-1),'ders:study');
 }
 pass('Missing, partial or throwing optional APIs cannot disrupt timer state, sound or study events');
}

async function browserTest(){
 const {chromium}=require('playwright'),out=path.join(root,'test-results/v140-focus');fs.mkdirSync(out,{recursive:true});
 // The class adapter must exist before the preview SDK initializes.
 const fixture=fs.readFileSync(path.join(root,'admin-preview-classes.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'admin-preview.js'),'utf8');
 let server,browser;const errors=[],remote=[],screenshots=[];
 try{
  process.env.PORT='0';server=require('../scripts/server.cjs');if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({executablePath:process.env.DERS_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',hasTouch:true});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin)return route.continue();remote.push(url.href);return route.abort();});
  await context.route('**/vendor/supabase.js',route=>route.fulfill({contentType:'text/javascript',body:"document.currentScript.dataset.role='student';\n"+fixture}));
  const p=await context.newPage();p.on('pageerror',error=>errors.push(error.message));
  await p.clock.install({time:new Date(startTime)});await p.clock.pauseAt(new Date(startTime+60000));
  await p.goto(origin);await p.waitForFunction(()=>window.DersStudy?.loaded&&window.DersBoard?.user);
  // Main owns stylesheet wiring. Inject this assigned stylesheet for isolated coverage.
  await p.addStyleTag({content:fs.readFileSync(path.join(root,'motion-widgets.css'),'utf8')});
  const before=await p.evaluate(()=>JSON.stringify(DersBoard.state));
  await p.evaluate(()=>{
   if(document.getElementById('motion-animations')?.checked)document.getElementById('motion-animations').click();document.documentElement.dataset.motion='off';window.__focusEvents=[];window.__focusErrors=[];
   window.DersMotion={focusEvent(session,events){__focusEvents.push({id:session?.id,phase:session?.phase,cycle:session?.cycle,status:session?.status,events:[...events],saved:JSON.parse(localStorage.getItem('ders-learning.v113:'+DersBoard.user.id))?.session});},feedback(kind,{id,element}){__focusErrors.push({kind,id,element:element?.id});}};
   DersUI.navigate('focus');
  });
  const state=()=>p.evaluate(()=>structuredClone(DersStudy.session));
  const progress=()=>p.locator('#focusDial').evaluate(el=>Number(el.style.getPropertyValue('--focus-progress')));
  const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.00001,`${actual} != ${expected}`);
  const jump=async ms=>{await p.clock.fastForward(ms);await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));};
  const shot=async name=>{const file=path.join(out,name+'.png');await p.screenshot({path:file});screenshots.push(file);};
  assert.equal(await p.locator('.focus-ring').getAttribute('aria-hidden'),'true');assert.equal(await p.locator('.focus-ring').getAttribute('focusable'),'false');assert.equal(await p.locator('#focusClock').getAttribute('aria-label'),'Kalan Süre');near(await progress(),1);
  await p.fill('#workMinutes','0');await p.click('#focusStart');await p.click('#focusStart');
  const validation=await p.evaluate(()=>__focusErrors);assert.equal(validation.length,2);assert.equal(validation[0].kind,'error');assert.equal(validation[0].element,'focusSettings');assert.notEqual(validation[0].id,validation[1].id);assert.equal(await state(),null);
  // Valid input with a failed commit is an operational error, not validation feedback.
  await p.fill('#workMinutes','2');await p.evaluate(()=>{window.__originalFocusWrite=localStorage.setItem;localStorage.setItem=(key,value)=>{if(key.startsWith('ders-learning.v113:'))throw Error('Synthetic full storage');return __originalFocusWrite(key,value);};});
  await p.click('#focusStart');assert.match(await p.locator('#focusError').textContent(),/kaydedilemedi/);assert.equal(await p.evaluate(()=>__focusErrors.length),2);assert.equal(await p.evaluate(()=>__focusEvents.length),0);assert.equal(await state(),null);
  await p.evaluate(()=>{localStorage.setItem=__originalFocusWrite;});
  pass('Actual browser uses only fake SDK data; manual validation has unique IDs and failed storage stays silent');

  await p.fill('#breakMinutes','1');await p.locator('#focusRepeat').check();await p.locator('#focusAuto').check();await p.locator('#focusSound').uncheck();await p.click('#focusStart');
  const geometry=async()=>({clock:await p.locator('#focusClock').boundingBox(),dial:await p.locator('#focusDial').boundingBox(),controls:await p.locator('#focusControls').boundingBox()});
  const initial=await geometry();await p.evaluate(()=>{window.__focusClockNode=document.getElementById('focusClock');});
  await jump(30000);near(await progress(),.75);assert.equal(await p.locator('#focusClock').textContent(),'00:01:30');
  near(await p.locator('.focus-ring-progress').evaluate(el=>parseFloat(getComputedStyle(el).strokeDashoffset)),25);
  const workColor=await p.locator('.focus-ring-progress').evaluate(el=>getComputedStyle(el).stroke);
  await p.click('#focusPause');const paused=await geometry();near(paused.clock.y,initial.clock.y);near(paused.controls.y,initial.controls.y);await jump(60000);near(await progress(),.75);
  await p.click('#focusResume');near((await geometry()).clock.y,initial.clock.y);await jump(90000);assert.equal((await state()).phase,'break');near(await progress(),1);
  const breakColor=await p.locator('.focus-ring-progress').evaluate(el=>getComputedStyle(el).stroke);assert.notEqual(workColor,breakColor);
  await jump(30000);near(await progress(),.5);assert.equal(await p.locator('#focusClock').textContent(),'00:00:30');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{DersTheme.setStyle('glass');DersTheme.set('dark');});await shot('focus-mobile-break');
  await jump(30000);assert.equal((await state()).phase,'work');assert.equal((await state()).cycle,2);near(await progress(),1);assert.equal(await p.evaluate(()=>__focusClockNode===document.getElementById('focusClock')),true);
  pass('Tick-driven work/break ratios, phase colors, cycle rollover and paused geometry are correct');

  await p.evaluate(()=>DersUI.navigate('home'));await p.click('#focusMiniReset');const reset=await state();assert.equal(reset.status,'paused');assert.equal(reset.phase,'work');assert.equal(reset.cycle,1);assert.equal(reset.remainingMs,120000);
  const segments=await p.evaluate(()=>JSON.stringify(DersStudy.segments()));await p.click('#focusMiniReset');await jump(10000);assert.equal(await p.evaluate(()=>JSON.stringify(DersStudy.segments())),segments);
  await p.click('#focusMiniOpen');near(await progress(),1);assert.equal(await p.locator('#focusClock').textContent(),'00:02:00');
  pass('Mini reset restores the full work ring and first cycle without adding recorded time');

  let combinations=0;
  for(const width of [360,390,430,768,1440])for(const style of ['classic','glass','natural','cloud'])for(const theme of ['light','dark']){
   await p.setViewportSize({width,height:900});await p.evaluate(({style,theme})=>{DersTheme.setStyle(style);DersTheme.set(theme);},{style,theme});
   const pausedGeometry=await geometry();assert.ok(pausedGeometry.dial.x>=0&&pausedGeometry.dial.x+pausedGeometry.dial.width<=width+1);assert.ok(pausedGeometry.clock.x>=pausedGeometry.dial.x&&pausedGeometry.clock.x+pausedGeometry.clock.width<=pausedGeometry.dial.x+pausedGeometry.dial.width);assert.ok(pausedGeometry.controls.y>=pausedGeometry.dial.y+pausedGeometry.dial.height-1);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.ok(await p.locator('#focusClock').evaluate(el=>getComputedStyle(el).fontVariantNumeric.includes('tabular-nums')));
   if(width===1440&&style==='classic'&&theme==='light')await shot('focus-desktop-paused');
   await p.click('#focusResume');const running=await geometry();near(running.clock.y,pausedGeometry.clock.y);near(running.controls.y,pausedGeometry.controls.y);
   if(width===390&&style==='classic'&&theme==='light')await shot('focus-mobile-running');
   if(width===1440&&style==='glass'&&theme==='dark')await shot('focus-desktop-running');
   await p.click('#focusPause');combinations++;
  }
  pass(`${combinations} phone/tablet/desktop appearance combinations retain aligned numbers and controls`);

  await p.click('#focusResume');await jump(500);await p.evaluate(()=>{document.documentElement.dataset.motion='on';});
  const durations=()=>p.locator('.focus-ring-progress').evaluate(el=>getComputedStyle(el).transitionDuration.split(',').map(Number.parseFloat));
  assert.ok((await durations()).some(ms=>ms>0));await p.evaluate(()=>{document.documentElement.dataset.motion='off';});assert.ok((await durations()).every(ms=>ms<=.001));
  await p.evaluate(()=>{document.documentElement.dataset.motion='on';});await p.emulateMedia({reducedMotion:'reduce'});assert.ok((await durations()).every(ms=>ms<=.001));
  assert.ok(await p.locator('#focusSecondary').evaluate(el=>getComputedStyle(el).transitionDuration.split(',').every(ms=>parseFloat(ms)<=.001)));
  await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>{document.documentElement.dataset.motion='off';DersStudy.act('finish');});near(await progress(),0);
  pass('App motion off and system reduced motion disable ring and secondary-control transitions');

  await p.fill('#workMinutes','1');await p.locator('#focusAuto').uncheck();await p.click('#focusStart');await jump(60000);assert.equal((await state()).status,'waiting');near(await progress(),0);assert.ok(await p.locator('#focusNext').isVisible());
  await p.click('#focusNext');assert.equal((await state()).phase,'break');near(await progress(),1);assert.equal(await p.locator('#focusDial').getAttribute('data-progress-motion'),'false');
  await p.evaluate(()=>{DersStudy.act('pause');DersStudy.act('skip');});assert.equal((await state()).phase,'work');assert.equal((await state()).cycle,2);near(await progress(),1);
  await p.evaluate(()=>DersStudy.act('finish'));await p.locator('#focusRepeat').uncheck();await p.fill('#breakMinutes','0');await p.click('#focusStart');await jump(60000);assert.equal((await state()).status,'completed');near(await progress(),0);
  const eventCount=await p.evaluate(()=>__focusEvents.length);await jump(1000);assert.equal(await p.evaluate(()=>__focusEvents.length),eventCount);
  const events=await p.evaluate(()=>__focusEvents);assert.ok(events.some(call=>call.events.join(',')==='work-ended,finished'));assert.ok(events.some(call=>call.events.includes('break-ended')));for(const call of events){assert.equal(call.saved.id,call.id);assert.equal(call.saved.status,call.status);assert.deepEqual(call.saved.events,[]);}
  assert.equal(await p.evaluate(()=>__focusErrors.length),2);assert.equal(await p.evaluate(()=>JSON.stringify(DersBoard.state)),before);
  pass('Manual next/skip and completion update the ring without replay, quest/XP mutation or background error feedback');

  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  const result={passed:true,checks,appearanceCombinations:combinations,screenshots,realUserWrites:false,externalRequests:remote.length};
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log('RESULT',JSON.stringify(result));
 }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
}

(async()=>{unit();if(!process.argv.includes('--unit'))await browserTest();})().catch(error=>{console.error(error);process.exitCode=1;});
