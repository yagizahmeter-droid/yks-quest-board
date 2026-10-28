const assert=require('node:assert/strict'),q=require('../quest-system.js'),sync=require('../sync.js');
const task={id:'repeat',xp:100,done:false,lockedForStudent:true,assignedQuestId:'uuid',repeat:{kind:'weekly',target:3},completions:[]};
for(let i=0;i<=3;i++){const current={...task,completions:Array.from({length:i},(_,j)=>({id:'e'+j,xp:100,date:'2026-10-28'}))};assert.equal(q.progress(current).count,i);assert.equal(q.isDone(current),i===3);assert.equal(q.earned(current),i*100);if(i===3)assert.match(q.describe(current),/Tamamlandı/);}
const personal={...task,lockedForStudent:false,completions:[{id:'a'},{id:'b'},{id:'c'}]};assert.equal(q.isDone(personal),true);assert.equal(q.earned(personal),100);assert.equal(q.possible(personal),100);assert.equal(q.progress({...personal,archived:true}).blocked,true);
const base={categories:[],weeks:[{id:'w',quests:[{...personal,completions:[{id:'a',historyId:'h1'}]}]}],studyHistory:[]},local=structuredClone(base),remote=structuredClone(base);
local.weeks[0].quests[0].completions.push({id:'b',historyId:'h2'});remote.weeks[0].quests[0].completions.push({id:'c',historyId:'h3'});
const merged=sync.mergeState(base,local,remote);assert.equal(merged.weeks[0].quests[0].completions.length,3);assert.equal(merged.weeks[0].quests[0].done,true);
assert.equal(q.isDone({done:true}),true);assert.equal(q.earned({done:false,xp:100}),0);
const daily=q.normalize({...personal,repeat:{kind:'daily',target:3},completions:[{id:'day-a',date:'2026-10-28'},{id:'day-b',date:'2026-10-28'}]});assert.equal(daily.completions.length,1);assert.equal(q.isDone(daily),false);
const dailyBase={categories:[],weeks:[{id:'dw',quests:[{...daily,completions:[]}]}],studyHistory:[]},dl=structuredClone(dailyBase),dr=structuredClone(dailyBase);dl.weeks[0].quests[0].completions=[{id:'a',date:'2026-10-28'}];dr.weeks[0].quests[0].completions=[{id:'b',date:'2026-10-28'}];assert.equal(sync.mergeState(dailyBase,dl,dr).weeks[0].quests[0].completions.length,1);
console.log('PASS v121 canonical completion, 0/3 to 3/3, personal XP once, archive and concurrent merge');
