const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dates = require('../week-dates.js');
const history = require('../history-groups.js');
const quests = require('../quest-system.js');
let checks = 0;
const pass = message => { checks++; console.log('PASS v132 weeks',message); };
const ids = weeks => Array.from(weeks,week=>week.id);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

for (const [value,expected] of [
  ['2027-01-04','2027-01-04'],['4.1.2027','2027-01-04'],
  ['2028-02-29T23:00:00+03:00','2028-02-29'],['2026-02-29',''],
  ['2026-02-30T10:00:00Z',''],['2026-13-01',''],['04/01/27',''],
  ['4 Ocak',''],['2027-01-04T10:00:00',''],['',''],[null,'']
]) assert.equal(dates.dateKey(value),expected,String(value));
pass('Explicit years, leap days, invalid dates and timezone-free timestamps');

for (const week of [
  {startDate:'2026-12-28',endDate:'2027-01-03'},
  {start:'2026-12-28',end:'2027-01-03'},
  {starts_on:'2026-12-28',ends_on:'2027-01-03'},
  {meta:{startDate:'2026-12-28',endDate:'2027-01-03'}},
  {weekMeta:{start:'2026-12-28',end:'2027-01-03'}},
  {week_meta:{start_date:'2026-12-28',end_date:'2027-01-03'}},
  {range:'28.12.2026 – 03.01.2027'},
  {range:'2026-12-28 — 2027-01-03'},
  {meta:{week_range:'28.12.2026 - 03.01.2027'}}
]) assert.deepEqual(dates.dates(week),{start:'2026-12-28',end:'2027-01-03'});
assert.deepEqual(dates.dates({startDate:'2027-01-04',range:'28.12.2026 – 03.01.2027'}),{start:'2027-01-04',end:''});
assert.deepEqual(dates.dates({endDate:'2027-01-03'}),{start:'',end:'2027-01-03'});
pass('Year-crossing root/teacher metadata, qualified teacher ranges and single endpoints');

for (const range of ['28 Aralık – 3 Ocak','28.12 – 03.01','28.12.2026 – 03.01','28–31 Aralık 2026','2027-01-04 – 2026-12-28','2026-02-30 – 2026-03-05']) {
  assert.deepEqual(dates.dates({name:'2099-01-01',customTitle:'2099-01-01',range}),{start:'',end:''});
}
assert.deepEqual(dates.dates({start:'2027-01-04',end:'2027-01-03'}),{start:'',end:''});
assert.deepEqual(dates.dates({name:'4 Ocak 2027',customTitle:'2027-01-04'}),{start:'',end:''});
pass('Ambiguous/reversed ranges and editable names never supply inferred dates');

const weeks = freeze([
  {id:'legacy-first',name:'2099-01-01',range:'28 Aralık – 3 Ocak'},
  {id:'old',name:'Yeni ad',startDate:'2026-12-28',endDate:'2027-01-03'},
  {id:'created',name:'1900-01-01',createdAt:'2027-01-02T10:00:00Z'},
  {id:'new',name:'Eski ad',meta:{starts_on:'2027-01-04',ends_on:'2027-01-10'},createdAt:'2026-12-01T10:00:00Z'},
  {id:'legacy-second',name:'1900-01-01',range:'1–7 Ocak'},
  {id:'end-only',end:'2027-01-01'}
]);
const snapshot = structuredClone(weeks);
assert.deepEqual(ids(dates.order(weeks)),['new','created','end-only','old','legacy-first','legacy-second']);
assert.deepEqual(ids(dates.order(weeks.map(w=>({...w,name:'1800-01-01',customTitle:'2200-01-01'})))),ids(dates.order(weeks)));
assert.deepEqual(weeks,snapshot);
assert.strictEqual(dates.order(weeks)[0],weeks[3]);
assert.deepEqual(ids(dates.order(dates.order(weeks))),ids(dates.order(weeks)));
pass('Newest-first dates, createdAt fallback, rename independence and immutable source objects');

const ties = freeze([
  {id:'b',start:'2027-01-04',createdAt:'2027-01-01T10:00:00Z'},
  {id:'a',start:'2027-01-04',createdAt:'2027-01-01T10:00:00Z'},
  {id:'c',start:'2027-01-04',created_at:'2027-01-02T10:00:00Z'},
  {id:'z',createdAt:'nonsense'}, {id:'y',createdAt:'4 Ocak'}
]);
assert.deepEqual(ids(dates.order(ties)),['c','b','a','z','y']);
assert.ok(dates.compare({id:'a'},{id:'b'}) < 0);
assert.deepEqual(ids(dates.order(ties.slice(3))),['z','y']);
assert.deepEqual(dates.order([]),[]);
pass('Same-date createdAt ties, stable original-index/id fallback and empty lists');

const browser = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../week-dates.js'),'utf8'),browser);
assert.deepEqual(ids(browser.window.DersWeekDates.order(weeks)),ids(dates.order(weeks)));
assert.equal(browser.window.DersWeekDates.dateKey('2027-01-04'),'2027-01-04');
pass('Browser and CommonJS expose the same helper API');

const records = freeze([
  {id:'late-old',weekId:'old',weekName:'Ancien nom',completedAt:'2027-02-01T12:00:00Z',xp:40},
  {id:'new-1',weekId:'new',weekName:'Même nom',completedAt:'2027-01-04T22:30:00Z',xp:50},
  {id:'new-2',weekId:'new',weekName:'Encore renommé',completedAt:'2027-01-05T12:00:00Z',xp:60},
  {id:'legacy',weekName:'Même nom',completedAt:'2027-01-05T12:00:00Z',xp:10},
  {id:'removed',weekId:'removed-week',weekName:'Même nom',completedAt:'invalid',xp:20}
]);
const historyWeeks = freeze(weeks.map(w=>({...w,name:'Même nom',...(w.id==='new'?{customTitle:'Mon programme',quests:[{lockedForStudent:true,assignedQuestId:'assigned'}]}:{})})));
const result = history.group(records,historyWeeks);
assert.deepEqual(ids(result),['new','old','legacy:Même nom','removed-week']);
assert.equal(result[0].customTitle,'Mon programme');
assert.equal(result[0].quests[0].assignedQuestId,'assigned');
assert.deepEqual(result[0].days.map(d=>d.date),['2027-01-05']);
assert.deepEqual(result[0].days[0].records.map(r=>r.id),['new-2','new-1']);
assert.equal(result.flatMap(w=>w.days.flatMap(d=>d.records)).reduce((sum,r)=>sum+r.xp,0),180);
assert.equal(result.flatMap(w=>w.days.flatMap(d=>d.records)).length,records.length);
assert.strictEqual(result[0].days[0].records[0],records[2]);
assert.deepEqual(history.group([],weeks),[]);
assert.deepEqual(weeks,snapshot);
pass('History uses week IDs/dates across renames, preserves missing weeks, record identities and XP');

// Run the complete learning UI with an in-memory DOM and shared-API spies.
// This checks the consumer contracts without using accounts or a database.
class Element {
  constructor() { this.dataset={}; this.isConnected=true; this.classList={toggle(){}}; this._html=''; this.open=false; }
  set innerHTML(value) { this._html=value; if (this.onHTML) this.onHTML(value); }
  get innerHTML() { return this._html; }
  addEventListener() {} append() {} prepend() {} setAttribute() {}
  querySelector() { return null; } querySelectorAll() { return []; }
}
class Select extends Element {
  constructor() { super(); this.options=[]; this._value=''; }
  set innerHTML(value) {
    this._html=value;
    this.options=Array.from(value.matchAll(/<option value="([^"]*)"/g),m=>m[1]);
    this._value=this.options[0]||'';
  }
  get innerHTML() { return this._html; }
  set value(value) { this._value=this.options.includes(value)?value:''; }
  get value() { return this._value; }
}

async function ui() {
  const partial = {id:'same-task',title:'Aynı görev',xp:100,repeat:{kind:'weekly',target:4},completions:[{id:'one',xp:25},{id:'two',xp:25}]};
  const uiWeeks = freeze([
    {id:'legacy',name:'2099-01-01',range:'1–7 Ocak',quests:[{id:'legacy-task',title:'Eski görev'}]},
    {id:'old',name:'Aynı hafta',startDate:'2026-12-28',endDate:'2027-01-03',quests:[{id:'same-task',title:'Aynı görev'}]},
    {id:'new',name:'Aynı hafta',start:'2027-01-04',end:'2027-01-10',quests:[partial]},
    {id:'archived',name:'Arşiv',start:'2027-02-01',archived:true,quests:[{id:'archive-task'}]},
    {id:'done',name:'Biten hafta',start:'2027-01-11',quests:[{id:'done-task',done:true}]}
  ]);
  const state = {weeks:uiWeeks,activeWeekId:'old',studyHistory:records,categories:[]};
  const elements = new Map(['focusMiniOpen','focusMiniPause','focusMiniReset','notificationsButton','signedInPanel','notificationBadge','dailyStudySummary','studyDay'].map(id=>[id,new Element()]));
  elements.get('signedInPanel').querySelector=()=>new Element();
  const focusTask = new Select(); elements.set('focusTask',focusTask);
  focusTask.innerHTML='<option value=""></option><option value="old|same-task"></option>';
  focusTask.value='old|same-task';
  const events = new Map(), metricCalls = [], summaryCalls = [];
  const reportData = freeze({state,segments:[],reviews:[]});
  const sharedMetrics = freeze({total:1,done:0,units:2,targets:4,percent:50,completionPercent:0});
  const win = {
    DersWeekDates:dates,
    DersBoard:{state,user:{id:'student'},escape:x=>x,weekTitle:w=>w.customTitle||w.name,category:()=>({name:'Matematik'})},
    DersQuests:{...quests,metrics:qs=>{metricCalls.push(qs); return sharedMetrics;}},
    DersFocusCore:{dayKey:()=> '2027-01-05',summary:(...args)=>{summaryCalls.push(args); return {totalMs:0,completed:0,top:'—',byLesson:{}};}},
    DersStudy:{data:{notifications:[]},segments:()=>[],visibleHistory:history=>history,rpc:async action=>{assert.equal(action,'report'); return reportData;}},
    DersUI:{route:'home',canLeave:()=>true,clearDirty(){}},
    DersSelect:{refresh(){}},lucide:{createIcons(){}},addEventListener(){}
  };
  const doc = {
    body:new Element(),createElement:()=>new Element(),getElementById:id=>elements.get(id),
    querySelector:()=>new Element(),addEventListener:(name,fn)=>{const list=events.get(name)||[];list.push(fn);events.set(name,list);}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../learning-ui.js'),'utf8'),{
    window:win,document:doc,crypto:require('node:crypto').webcrypto,
    MutationObserver:class { observe(){} }
  },{filename:'learning-ui.js'});
  assert.deepEqual(focusTask.options,['','new|same-task','old|same-task','legacy|legacy-task']);
  assert.equal(focusTask.value,'old|same-task');
  assert.equal(summaryCalls.length,1);
  assert.strictEqual(summaryCalls[0][1],records);
  assert.strictEqual(summaryCalls[0][3],uiWeeks);
  assert.match(elements.get('dailyStudySummary').innerHTML,/<strong>0 görev<\/strong>/);
  win.DersBoard.state={...state,weeks:freeze(uiWeeks.map(w=>({...w,name:w.id==='old'?'2200-01-01':'1800-01-01'})))};
  for (const render of events.get('ders:render')||[]) render();
  assert.deepEqual(focusTask.options,['','new|same-task','old|same-task','legacy|legacy-task']);
  assert.equal(focusTask.value,'old|same-task');
  pass('Full Focus UI sorts active/incomplete weeks and retains exact week/task selector IDs');
  pass('Daily summary receives the exact current weeks as the fourth argument');

  const wrap = new Element(), reportWeek = new Select(), content = new Element();
  wrap.onHTML=html=>{reportWeek.innerHTML=html;};
  wrap.querySelector=selector=>selector==='#reportWeek'?reportWeek:selector==='#reportContent'?content:null;
  await win.DersLearningUI.report(wrap,'student','new');
  assert.deepEqual(reportWeek.options,['archived','done','new','old','legacy']);
  assert.equal(reportWeek.value,'new');
  assert.equal(metricCalls.length,1);
  assert.deepEqual(Array.from(metricCalls[0]),[partial]);
  assert.match(content.innerHTML,/<strong>0\/1<\/strong>Tamamlanan görev/);
  assert.match(content.innerHTML,/<strong>2\/4 \(%50\)<\/strong>Tekrar İlerlemesi/);
  assert.match(content.innerHTML,/<strong>0%<\/strong>Görev Tamamlanması/);
  assert.equal(state.activeWeekId,'old');
  assert.equal(partial.xp,100);
  assert.equal(partial.completions.reduce((sum,e)=>sum+e.xp,0),50);
  pass('Report uses shared week ordering and metrics, keeping 2/4 separate from completed tasks');
}

ui().then(()=>console.log('RESULT '+checks+' focused v1.3.2 week/date/UI checks passed'))
  .catch(error=>{console.error(error);process.exitCode=1;});
