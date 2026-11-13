'use strict';
// Offline only: production scripts run in a VM with manually answered RPCs.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const core=require(path.join(root,'exams-core.js'));
const plain=value=>JSON.parse(JSON.stringify(value));
const tests=[];
const test=(name,run)=>tests.push({name,run});

// Reuse the existing offline DOM/RPC fixture without executing its test suite.
const fixtureFile=path.join(root,'tests','v132-classes-refresh.cjs');
const fixtureSource=fs.readFileSync(fixtureFile,'utf8').split('const tests = [];')[0]
 .replace('sandbox.window = sandbox;','sandbox.DersMotion = options.motion; sandbox.window = sandbox;');
const fixtureContext={require,URL,__dirname:path.dirname(fixtureFile)};
vm.runInNewContext(fixtureSource+'\nglobalThis.fixture={harness,classDetail,overview,Element,Events,flush};',fixtureContext,{filename:fixtureFile});
const {harness:classHarness,classDetail,overview,Element,Events,flush}=fixtureContext.fixture;
Element.prototype.getBoundingClientRect=function(){return {x:0,y:0,left:0,top:0,width:this.width??640,height:250};};
Element.prototype.getAttribute=function(key){return this.attrs[key]??null;};

function recorder(){
 const events=[];
 const motion={
  number(element,value,options){events.push({type:'number',element,value,...options});},
  chart(host,options){assert.ok(host.querySelector('svg'),'chart hook runs after SVG insertion');events.push({type:'chart',host,...options});},
  capture(host,selector,keyAttr){const keys=host.querySelectorAll(selector).map(e=>e.getAttribute(keyAttr));events.push({type:'capture',host,selector,keyAttr,keys});return {keys};},
  reorder(snapshot,host,selector,keyAttr){events.push({type:'reorder',snapshot,host,selector,keyAttr,keys:host.querySelectorAll(selector).map(e=>e.getAttribute(keyAttr))});},
  actionConfirmed(kind,action,payload,result){events.push({type:'action',kind,action,payload,result});},
  classState(detail){events.push({type:'state',detail});}
 };
 return {motion,events,of:type=>events.filter(e=>e.type===type),clear:()=>{events.length=0;}};
}
function examHarness(motion){
 const document=new Events();document.hidden=false;document.body=new Element('body');
 document.createElement=tag=>new Element(tag);document.getElementById=id=>document.body.querySelector('#'+id);
 const host=new Element('section',{id:'examsPage'});document.body.append(host);
 const calls=[],observers=[];
 const board={user:{id:'student-A'},state:{profile:{role:'student'}},escape:value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),toast(){},
  client:{rpc(name,args){assert.equal(name,'ders_exams');let respond;const promise=new Promise(resolve=>{respond=rows=>resolve({data:rows,error:null});});calls.push({action:args.p_action,payload:args.p_payload,respond});return promise;}}};
 const windowEvents=new Events();
 const sandbox={document,navigator:{onLine:true},DersBoard:board,DersMotion:motion,DersExamsCore:core,
  DersUI:{route:'home',clearDirty(){},modalClosed(){},canLeave:()=>true},DersSelect:{refresh(){}},lucide:{createIcons(){}},
  ResizeObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){}},
  addEventListener:windowEvents.addEventListener.bind(windowEvents)};
 sandbox.window=sandbox;
 vm.runInNewContext(fs.readFileSync(path.join(root,'exams.js'),'utf8'),sandbox,{filename:'exams.js'});
 return {host,board,sandbox,observers,api:sandbox.DersExams,calls,
  async mount(rows,sid=board.user.id,target=host){const mounted=this.api.mount(target,sid);calls.at(-1).respond(rows);await mounted;await flush();},
  async refresh(rows){const refreshed=this.api.refresh();calls.at(-1).respond(rows);await refreshed;await flush();},
  change(selector,value){const element=host.querySelector(selector);assert.ok(element,selector);element.value=value;element.onchange();},
  exam(type){host.onclick({target:host.querySelector('[data-exam-filter="'+type+'"]')});},
  extraHost(){const element=new Element('section');document.body.append(element);return element;}
 };
}
function exam(id,date,net=30,{partial=false,type='TYT',lessons=['turkish']}={}){
 const results={};for(const lesson of lessons){const max=40;results[lesson]={correct:net,wrong:0,blank:partial?null:max-net};}
 return {id,name:id,exam_type:type,exam_date:date,created_at:date+'T12:00:00Z',publisher:'',note:'',groups:lessons.map(id=>({id,mode:type==='TYT'?'total':'detail'})),results};
}
const rank=(key,xp,own=false)=>({key,name:key,rank:1,xp,total_xp:xp,own});
function detail(id='A',teacher=false){
 const value=classDetail(id,id,teacher);value.leaderboard=[rank('private-key-A',10,true),rank('private-key-B',5)];
 value.shared_tasks=[{id:'task-A',name:'Task',subject:'Matematik',description:'',kind:'questions',starts_on:'2026-11-09',ends_on:'2026-11-15',status:'open',display_status:'in_progress',settled_at:null,total:20,target:100,own_total:10,own_xp:0,xp_pool:100,contributions:[{id:'entry-A',name:'Student',amount:10,contribution_date:'2026-11-12',note:''}]}];
 return value;
}
async function refreshClass(h,value){const refreshed=h.api.refresh({fresh:true});await h.settleOverview(overview(value.teacher?'teacher':'student'));h.pending('detail').respond(value);await refreshed;await flush();}
async function classRPC(h,action,payload,result={ok:true,class_id:payload.class_id}){const pending=h.api.rpc(action,payload);h.pending(action).respond(result);return pending;}

test('both production surfaces parse and stay usable without the optional manager',async()=>{
 for(const file of ['classes.js','exams.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
 const e=examHarness();await e.mount([exam('e1','2026-11-10')]);assert.ok(e.host.querySelector('svg'));
 const h=classHarness();await h.open('A',detail());for(const tab of ['ranking','shared','summary','statistics'])await h.tab(tab);
 await classRPC(h,'contribute_questions',{class_id:'A',task_id:'task-A',request_id:'request-A'},{ok:true,class_id:'A'});
});

test('exam numbers receive raw scores, Turkish formatting and stable context keys',async()=>{
 const r=recorder(),h=examHarness(r.motion),rows=[exam('first','2026-11-09',20),exam('last','2026-11-10',30)];await h.mount(rows);
 const numbers=r.of('number');assert.equal(numbers.length,6);assert.equal(new Set(numbers.map(n=>n.key)).size,6);
 const average=numbers.find(n=>JSON.parse(n.key).at(-1)==='average');assert.equal(average.value,25);assert.equal(average.format(29.75),'29,75');assert.equal(average.element.textContent,'25');
 for(const n of numbers){const key=JSON.parse(n.key);assert.deepEqual(key.slice(0,5),['exams','student-A','student-A','TYT','TYT:turkish']);assert.equal(n.format,core.format);}
 r.clear();await h.refresh([rows[0],exam('last','2026-11-10',32)]);
 const next=r.of('number').find(n=>n.key===average.key);assert.equal(next.value,26);
 const expected=core.stats([rows[0],exam('last','2026-11-10',32)]);assert.equal(next.value,expected.average);
 const partial=exam('partial','2026-11-11',20,{partial:true});r.clear();await h.refresh([partial]);
 assert.equal(r.of('number').find(n=>JSON.parse(n.key).at(-1)==='best'),undefined);
 assert.equal(h.host.querySelector('[data-exam-stat="best"] strong').textContent,'—');
});

test('exam fingerprints follow IDs, dates, nets and partial status; redraws remain identical',async()=>{
 const r=recorder(),h=examHarness(r.motion),first=exam('e1','2026-11-09',20),last=exam('e2','2026-11-10',30);
 await h.mount([last,first]);let previous=r.of('chart').find(c=>JSON.parse(c.key).at(-1)[1]==='total');
 assert.deepEqual(JSON.parse(previous.fingerprint),[40,[['e1','2026-11-09',20,false],['e2','2026-11-10',30,false]]]);
 r.clear();h.observers[0].callback();assert.equal(r.of('chart')[0].fingerprint,previous.fingerprint);assert.equal(r.of('chart')[0].key,previous.key);
 r.clear();await h.refresh([first,last]);assert.equal(r.of('chart')[0].fingerprint,previous.fingerprint);
 for(const row of [{...last,id:'replacement'},{...last,exam_date:'2026-11-11'},exam('e2','2026-11-10',31),exam('e2','2026-11-10',30,{partial:true})]){
  r.clear();await h.refresh([first,row]);const next=r.of('chart')[0];assert.equal(next.key,previous.key);assert.notEqual(next.fingerprint,previous.fingerprint);
 }
 r.clear();h.change('[data-exam-sort]','asc');assert.equal(r.of('chart')[0].fingerprint,JSON.stringify([40,[['e1','2026-11-09',20,false],['e2','2026-11-10',30,true]]]));
});

test('exam chart and metric identities isolate student, exam, scope, lesson and filter',async()=>{
 const r=recorder(),h=examHarness(r.motion),rows=[exam('single','2026-11-09'),exam('both','2026-11-10',30,{lessons:['turkish','math']}),exam('ayt','2026-11-10',20,{type:'AYT',lessons:['math']})];
 await h.mount(rows);const total=r.of('chart')[0],lesson=r.of('chart')[1],metric=r.of('number')[0];
 r.clear();h.change('[data-exam-lesson]','math');assert.equal(r.of('chart')[0].key,total.key);assert.notEqual(r.of('chart')[1].key,lesson.key);
 r.clear();h.change('[data-exam-completeness]','complete');assert.notEqual(r.of('chart')[0].key,total.key);
 r.clear();h.change('[data-exam-scope]','TYT:turkish');assert.notEqual(r.of('chart')[0].key,total.key);assert.notEqual(r.of('number')[0].key,metric.key);
 r.clear();h.exam('AYT');assert.notEqual(r.of('chart')[0].key,total.key);assert.notEqual(r.of('number')[0].key,metric.key);
 r.clear();await h.mount(rows,'student-B',h.extraHost());assert.ok(r.of('chart').every(c=>JSON.parse(c.key)[2]==='student-B'));assert.ok(r.of('number').every(n=>JSON.parse(n.key)[2]==='student-B'));
});

test('hidden exam charts wait for a visible SVG draw; empty series do not animate',async()=>{
 const r=recorder(),h=examHarness(r.motion);h.host.width=0;await h.mount([exam('e1','2026-11-10')]);assert.equal(r.of('chart').length,0);
 h.host.width=640;h.observers[0].callback();assert.equal(r.of('chart').length,2);
 r.clear();const unscored=exam('unknown','2026-11-10');unscored.results.turkish={correct:20,wrong:null,blank:null};await h.refresh([unscored]);assert.equal(r.of('chart').length,0);
});

test('class hooks preserve native progress and expose canonical reward state after rendering',async()=>{
 const r=recorder(),h=classHarness({motion:r.motion}),value=detail();
 const original=r.motion.classState;r.motion.classState=data=>{assert.ok(h.page.querySelector('[data-motion-shared="task-A"]'));original(data);};
 await h.open('A',value);assert.equal(r.of('action').length,0);assert.equal(r.of('state').length,1);assert.equal(r.of('state')[0].detail,value);
 const progress=h.page.querySelector('progress[data-motion-shared-fill]');assert.ok(progress);assert.equal(progress.value,'20');assert.equal(progress.getAttribute('max'),'100');assert.equal(progress.getAttribute('aria-label'),'Ortak görev ilerlemesi');
 assert.ok(h.page.querySelector('[data-motion-contribution="task-A"]'));assert.equal(h.page.querySelector('[data-motion-class-xp]').textContent,'10');
 assert.equal(r.of('number').length,4);assert.ok(r.of('number').every(n=>JSON.parse(n.key).slice(0,4).join('/')==='classes/owner-A/A/summary'));
 await h.tab('shared');assert.equal(h.page.querySelectorAll('[data-motion-contribution="task-A"]').length,2);assert.equal(r.of('state').length,1);
 const settled=detail();Object.assign(settled.shared_tasks[0],{status:'completed',display_status:'completed',settled_at:'2026-11-12T12:00:00Z',own_xp:40,total:100});
 await refreshClass(h,settled);assert.equal(r.of('state').at(-1).detail,settled);assert.equal(r.of('action').length,0);
 const corrected=structuredClone(settled);Object.assign(corrected.shared_tasks[0],{status:'cancelled',display_status:'cancelled',own_xp:0,total:50});await refreshClass(h,corrected);
 assert.deepEqual(plain(r.of('state').at(-1).detail.shared_tasks[0]),corrected.shared_tasks[0]);
 const stateCount=r.of('state').length;await refreshClass(h,corrected);assert.equal(r.of('state').length,stateCount+1,'identical canonical reads still reach the central deduplicator');
});

test('class ranking captures only within the same class, tab, period and visible session',async()=>{
 const r=recorder(),h=classHarness({motion:r.motion});await h.open('A',detail());assert.equal(r.of('capture').length,0);
 await h.tab('ranking');assert.equal(r.of('capture').length,0);r.clear();
 const reordered=detail();reordered.leaderboard.reverse();await refreshClass(h,reordered);
 assert.equal(r.of('capture').length,1);assert.equal(r.of('reorder').length,1);const before=r.of('capture')[0],after=r.of('reorder')[0];
 assert.deepEqual(plain(before.keys),['private-key-A','private-key-B']);assert.deepEqual(plain(after.keys),['private-key-B','private-key-A']);assert.deepEqual(plain(after.snapshot.keys),plain(before.keys));assert.equal(before.keyAttr,'data-motion-rank');
 r.clear();await h.tab('summary');await h.tab('ranking');assert.equal(r.of('capture').length,0);
 const period=h.page.querySelector('[name="period"]');period.onchange({target:{value:'all'}});await h.settleOverview(overview());h.pending('detail').respond(detail());await flush();assert.equal(r.of('capture').length,0);
 r.clear();await h.open('B',detail('B'));assert.equal(r.of('capture').length,0);await h.tab('ranking');assert.equal(r.of('capture').length,0);
 await h.route('home');await h.route('classes');await h.settleOverview();h.pending('detail').respond(detail('B'));await flush();assert.equal(r.of('capture').length,0);
});

test('class aggregate charts use stable scope identities and actual returned dates and averages',async()=>{
 const r=recorder(),h=classHarness({motion:r.motion}),value=detail();value.statistics.exam_trend=[{exam_type:'TYT',scope:'turkish',day:'2026-11-10',average:24.75,participants:3},{exam_type:'TYT',scope:'turkish',day:'2026-11-11',average:30,participants:4}];
 await h.open('A',value);await h.tab('statistics');const first=r.of('chart')[0];assert.ok(first);assert.deepEqual(JSON.parse(first.fingerprint),[['2026-11-10',24.75,3],['2026-11-11',30,4]]);
 r.clear();await refreshClass(h,value);assert.ok(r.of('chart').every(x=>x.key===first.key&&x.fingerprint===first.fingerprint),'unchanged refresh keeps the same deduplication identity');
 const next=structuredClone(value);next.statistics.exam_trend[1].average=31;r.clear();await refreshClass(h,next);assert.equal(r.of('chart')[0].key,first.key);assert.notEqual(r.of('chart')[0].fingerprint,first.fingerprint);
});

test('only whitelisted successful own class actions with request IDs reach the manager',async()=>{
 const r=recorder(),h=classHarness({motion:r.motion});
 for(const action of ['contribute_questions','contribute_segments','correct_contribution','send_program']){
  const payload={class_id:'A',task_id:'task-A',request_id:'request-'+action},result={ok:true,class_id:'A'};await classRPC(h,action,payload,result);
  const event=r.of('action').at(-1);assert.equal(event.kind,'class');assert.equal(event.action,action);assert.equal(event.payload,payload);assert.equal(event.result,result);
 }
 assert.equal(r.of('action').length,4);assert.equal(r.of('state').length,0);
 const invalid=[['create_shared',{class_id:'A',request_id:'x'},{ok:true}],['overview',{class_id:'A',request_id:'x'},{ok:true}],['contribute_questions',{class_id:'A'},{ok:true}],['send_program',{class_id:'A',request_id:' '},{ok:true}],['send_program',{request_id:'x'},{ok:true}],['send_program',{class_id:'A',request_id:'x'},{ok:false}],['send_program',{class_id:'A',request_id:'x'},{ok:true,class_id:'B'}],['send_program',{class_id:'A',request_id:'x'},{}]];
 for(const [action,payload,result] of invalid)await classRPC(h,action,payload,result);
 assert.equal(r.of('action').length,4);
 await classRPC(h,'send_program',{class_id:'A',request_id:'retry'},{ok:true,idempotent:true});assert.equal(r.of('action').length,5,'retry identity is left to the central deduplicator');
});

test('RPC errors, rejection, payload errors and obsolete owners cannot confirm actions',async()=>{
 for(const failure of ['error','reject','payload','owner','session']){
  const r=recorder(),h=classHarness({motion:r.motion});const pending=h.api.rpc('contribute_questions',{class_id:'A',task_id:'task-A',request_id:'x'});const failed=assert.rejects(pending);const call=h.pending('contribute_questions');
  if(failure==='error')call.error('denied');else if(failure==='reject')call.reject('disconnected');else if(failure==='payload')call.respond({ok:true,error:'denied'});else{await h.owner('owner-B');if(failure==='session')await h.owner('owner-A');call.respond({ok:true,class_id:'A'});}
  await failed;assert.equal(r.of('action').length,0,failure);
 }
});

test('stale detail replies and failed refreshes never publish class state',async()=>{
 const r=recorder(),h=classHarness({motion:r.motion});await h.open('A',detail());r.clear();
 const old=h.api.refresh({fresh:true});await h.settleOverview();const stale=h.pending('detail');await h.open('B',detail('B'));const count=r.of('state').length;
 stale.respond(detail('A'));await old;assert.equal(r.of('state').length,count);assert.equal(r.of('state').at(-1).detail.class.id,'B');
 const failing=h.api.refresh({fresh:true});await h.settleOverview();h.pending('detail').error('access denied');await failing;assert.equal(r.of('state').length,count);
});

(async()=>{
 for(const {name,run} of tests){let timer;try{await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timed out: '+name)),5000);})]);}finally{clearTimeout(timer);}console.log('PASS v140 surfaces: '+name);}
 console.log('RESULT '+tests.length+' focused surface hook checks passed; mocked RPCs only, no database or staging access.');
})().catch(error=>{console.error(error);process.exitCode=1;});
