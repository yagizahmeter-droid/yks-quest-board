const assert=require('node:assert/strict'),{dayKey,group}=require('../history-groups.js');
const records=[
 {id:'a',weekId:'w1',weekName:'Eski ad',completedAt:'2026-10-17T22:30:00Z',xp:100},
 {id:'b',weekId:'w1',completedAt:'2026-10-17T18:30:00Z',xp:75},
 {id:'c',weekId:'w2',weekName:'Arşiv haftası',completedAt:'2026-10-18T10:00:00Z',xp:50},
 {id:'d',weekId:'w1',completedAt:'2026-10-18T10:00:00Z',occurrenceDate:'2026-10-16',xp:25},
 {id:'e',weekId:'removed',weekName:'Silinmiş hafta',completedAt:'invalid',xp:10}
];
const original=structuredClone(records),result=group(records,[{id:'w1',name:'Güncel ad'},{id:'w2',name:'Arşiv haftası'}]);
assert.equal(dayKey(records[0]),'2026-10-18');
assert.equal(dayKey(records[3]),'2026-10-16');
assert.equal(dayKey(records[4]),'');
assert.equal(result.length,3);assert.equal(result.find(w=>w.id==='w1').name,'Güncel ad');
assert.deepEqual(result.find(w=>w.id==='w1').days.map(d=>d.date),['2026-10-18','2026-10-17','2026-10-16']);
assert.equal(result.flatMap(w=>w.days.flatMap(d=>d.records)).reduce((n,r)=>n+r.xp,0),260);
assert.deepEqual(records,original);assert.deepEqual(group([],[]),[]);
console.log('PASS history: Istanbul dates, occurrence dates, separate weeks, legacy records, unchanged XP/data');
