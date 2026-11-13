'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {create} = require('../motion-ledger.js');
const PREFIX = 'ders-motion.events.v140:';
const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026,10,12);
let checks = 0;

function test(name,run) {
  run();
  checks++;
  console.log('PASS v140 ledger',name);
}

// Every write in this suite targets this synthetic Map, never user storage.
function memoryStorage() {
  const data = new Map();
  const calls = [];
  return {
    data,calls,failRead:false,failWrite:false,discardWrite:false,onWrite:null,
    getItem(key) {
      calls.push({type:'get',key});
      if (this.failRead) throw new Error('Storage access denied');
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key,value) {
      calls.push({type:'set',key,value});
      if (this.failWrite) throw new Error('Quota exceeded');
      if (!this.discardWrite) data.set(key,String(value));
      if (this.onWrite) this.onWrite(key,value);
    }
  };
}

function fixture(overrides = {}) {
  const storage = memoryStorage();
  let time = START;
  const ledger = create({storage,owner:'alice',tabId:'tab-a',now:() => time,...overrides});
  return {storage,ledger,advance:ms => { time += ms; },at:value => { time = value; }};
}

test('anonymous operations and owner changes never touch storage',() => {
  const {storage,ledger} = fixture({owner:null});
  const intent = Object.freeze({id:'anonymous',createdAt:START});
  assert.equal(ledger.expect(intent),false);
  assert.equal(ledger.once('anonymous'),false);
  assert.equal(ledger.has('anonymous'),false);
  assert.equal(ledger.forget('anonymous'),false);
  assert.deepEqual(ledger.pending(),[]);
  ledger.setOwner('alice');
  ledger.setOwner(null);
  assert.deepEqual(storage.calls,[]);
  assert.deepEqual(intent,{id:'anonymous',createdAt:START});
});

test('metadata is detached, timestamps are explicit, and tab IDs cannot be spoofed',() => {
  const {storage,ledger} = fixture();
  const intent = {
    id:'quest:q1:completion:h1',weekId:'w1',questId:'q1',historyId:'h1',requestId:'r1',
    beforeCount:0,target:3,complete:false,xp:0,tabId:'tab-spoof',ignored:'not persisted'
  };
  const snapshot = structuredClone(intent);
  assert.equal(ledger.expect(intent),true);
  assert.deepEqual(intent,snapshot);
  assert.deepEqual(ledger.pending(),[{
    id:intent.id,tabId:'tab-a',createdAt:START,weekId:'w1',questId:'q1',historyId:'h1',requestId:'r1',
    beforeCount:0,target:3,complete:false,xp:0
  }]);
  intent.questId = 'caller mutation';
  const copy = ledger.pending();
  copy[0].questId = 'returned mutation';
  copy.push({id:'injected'});
  assert.equal(ledger.pending()[0].questId,'q1');
  assert.equal(ledger.pending().length,1);
  assert.equal(ledger.expect({id:'explicit-time',createdAt:START - 1}),true);
  assert.equal(ledger.pending()[1].createdAt,START - 1);
  assert.ok(storage.calls.every(call => call.key === PREFIX + 'alice'));
});

test('returned arrays are deeply cloned and intent snapshots survive reload',() => {
  const {storage,ledger} = fixture();
  const target = {count:3,parts:[1,2]};
  assert.equal(ledger.expect({id:'nested',target}),true);
  target.parts.push(9);
  const first = ledger.pending();
  first[0].target.parts.push(8);
  const reloaded = create({storage,owner:'alice',tabId:'tab-a',now:() => START});
  assert.deepEqual(reloaded.pending()[0].target,{count:3,parts:[1,2]});
  assert.notStrictEqual(first,reloaded.pending());
});

test('duplicate intents and offline retries produce one effect',() => {
  const {ledger} = fixture();
  assert.equal(ledger.expect({id:'offline-request',requestId:'stable-request'}),true);
  assert.equal(ledger.has('offline-request'),false);
  assert.equal(ledger.expect({id:'offline-request',xp:999}),false);
  assert.equal(ledger.pending().length,1);
  let effects = 0;
  for (let attempt = 0; attempt < 20; attempt++) if (ledger.once('offline-request')) effects++;
  assert.equal(effects,1);
  assert.equal(ledger.has('offline-request'),true);
  assert.deepEqual(ledger.pending(),[]);
  assert.equal(ledger.expect('offline-request'),false);
});

test('once persists both the seen ID and pending removal before effects',() => {
  const {storage,ledger} = fixture();
  const id = 'persist-before-effect';
  assert.equal(ledger.expect({id}),true);
  let persistedBeforeReturn = false;
  storage.onWrite = (key,value) => {
    const state = JSON.parse(value);
    persistedBeforeReturn = key === PREFIX + 'alice' && state.seen.includes(id) &&
      !state.pending.some(item => item.id === id);
  };
  assert.equal(ledger.once(id),true);
  assert.equal(persistedBeforeReturn,true);
  const duringEffect = create({storage,owner:'alice',tabId:'tab-a',now:() => START});
  assert.equal(duringEffect.once(id),false);
  assert.deepEqual(duringEffect.pending(),[]);
});

test('same-tab reload recovers offline pending work and remembers consumed work',() => {
  const {storage,ledger,advance} = fixture();
  assert.equal(ledger.expect({id:'offline',xp:25}),true);
  advance(DAY);
  const reload = () => create({storage,owner:'alice',tabId:'tab-a',now:() => START + DAY});
  const next = reload();
  assert.equal(next.pending()[0].xp,25);
  assert.equal(next.once('offline'),true);
  assert.equal(reload().has('offline'),true);
  assert.equal(reload().once('offline'),false);
  assert.deepEqual(reload().pending(),[]);
});

test('owners isolate IDs and pending intents; signing out preserves both owners',() => {
  const {storage,ledger} = fixture();
  assert.equal(ledger.expect('same-id'),true);
  ledger.setOwner('bob');
  assert.deepEqual(ledger.pending(),[]);
  assert.equal(ledger.once('same-id'),true);
  assert.equal(ledger.expect('bob-pending'),true);
  ledger.setOwner(null);
  const signedOut = new Map(storage.data);
  assert.equal(ledger.once('same-id'),false);
  assert.equal(ledger.expect('signed-out'),false);
  assert.equal(ledger.forget('bob-pending'),false);
  assert.deepEqual(ledger.pending(),[]);
  assert.deepEqual(storage.data,signedOut);
  ledger.setOwner('alice');
  assert.equal(ledger.has('same-id'),false);
  assert.deepEqual(ledger.pending().map(item => item.id),['same-id']);
  assert.equal(ledger.once('same-id'),true);
  ledger.setOwner('bob');
  assert.equal(ledger.has('same-id'),true);
  assert.deepEqual(ledger.pending().map(item => item.id),['bob-pending']);
  assert.deepEqual([...storage.data.keys()].sort(),[PREFIX + 'alice',PREFIX + 'bob']);
});

test('tabs cannot list, cancel, duplicate, or consume another tab intent',() => {
  const {storage,ledger:a} = fixture();
  const b = create({storage,owner:'alice',tabId:'tab-b',now:() => START});
  assert.equal(a.expect('a-intent'),true);
  assert.equal(b.expect('b-intent'),true);
  assert.deepEqual(a.pending().map(item => item.id),['a-intent']);
  assert.deepEqual(b.pending().map(item => item.id),['b-intent']);
  const before = storage.data.get(PREFIX + 'alice');
  assert.equal(b.expect('a-intent'),false);
  assert.equal(b.forget('a-intent'),false);
  assert.equal(b.once('a-intent'),false);
  assert.equal(storage.data.get(PREFIX + 'alice'),before);
  assert.equal(a.once('a-intent'),true);
  assert.equal(b.has('a-intent'),true);
  assert.equal(b.once('a-intent'),false);
  assert.deepEqual(b.pending().map(item => item.id),['b-intent']);
  assert.equal(b.once('b-intent'),true);
  assert.deepEqual(a.pending(),[]);
});

test('each call uses latest storage and preserves interleaved tab changes',() => {
  const {storage,ledger:a} = fixture();
  const b = create({storage,owner:'alice',tabId:'tab-b',now:() => START});
  a.pending(); // Deliberately prime an earlier empty snapshot.
  b.pending();
  assert.equal(b.expect('b-queued'),true);
  assert.equal(b.once('shared-event'),true);
  assert.equal(a.once('shared-event'),false);
  assert.equal(a.expect('a-queued'),true);
  assert.equal(a.once('a-queued'),true);
  assert.equal(b.has('a-queued'),true);
  assert.deepEqual(b.pending().map(item => item.id),['b-queued']);
  assert.equal(b.once('b-queued'),true);
  assert.equal(a.has('b-queued'),true);
  assert.equal(a.has('shared-event'),true);
});

test('forget cancels an own intent without reopening consumed IDs',() => {
  const {ledger} = fixture();
  assert.equal(ledger.expect('cancel'),true);
  assert.equal(ledger.forget('cancel'),true);
  assert.deepEqual(ledger.pending(),[]);
  assert.equal(ledger.forget('cancel'),false);
  assert.equal(ledger.expect('cancel'),true);
  assert.equal(ledger.once('cancel'),true);
  assert.equal(ledger.forget('cancel'),false);
  assert.equal(ledger.has('cancel'),true);
  assert.equal(ledger.once('cancel'),false);
});

test('quota failures do not consume pending work or permit effects, and can recover',() => {
  const {storage,ledger} = fixture();
  assert.equal(ledger.expect('retry'),true);
  const before = storage.data.get(PREFIX + 'alice');
  storage.failWrite = true;
  let effects = 0;
  if (ledger.once('retry')) effects++;
  assert.equal(effects,0);
  assert.equal(ledger.expect('new'),false);
  assert.equal(ledger.forget('retry'),false);
  assert.equal(ledger.has('retry'),false);
  assert.deepEqual(ledger.pending().map(item => item.id),['retry']);
  assert.equal(storage.data.get(PREFIX + 'alice'),before);
  storage.failWrite = false;
  if (ledger.once('retry')) effects++;
  assert.equal(effects,1);
  assert.equal(ledger.once('retry'),false);
});

test('denied or absent storage and silent write loss fail closed',() => {
  const {storage,ledger} = fixture();
  storage.failRead = true;
  assert.equal(ledger.expect('denied'),false);
  assert.equal(ledger.once('denied'),false);
  assert.equal(ledger.has('denied'),false);
  assert.equal(ledger.forget('denied'),false);
  assert.deepEqual(ledger.pending(),[]);
  assert.equal(storage.calls.some(call => call.type === 'set'),false);
  storage.failRead = false;
  storage.discardWrite = true;
  assert.equal(ledger.expect('lost'),false);
  assert.equal(ledger.once('lost'),false);
  assert.equal(ledger.has('lost'),false);
  const absent = create({owner:'alice',tabId:'tab-a',now:() => START});
  assert.equal(absent.expect('absent'),false);
  assert.equal(absent.once('absent'),false);
  assert.deepEqual(absent.pending(),[]);
  storage.discardWrite = false;
  assert.equal(ledger.once('recovered'),true);
});

test('write verification failure cannot permit an effect or replay persisted work',() => {
  const {storage,ledger} = fixture();
  assert.equal(ledger.expect('uncertain'),true);
  storage.onWrite = () => { storage.failRead = true; };
  assert.equal(ledger.once('uncertain'),false);
  storage.onWrite = null;
  storage.failRead = false;
  assert.equal(ledger.has('uncertain'),true);
  assert.equal(ledger.once('uncertain'),false);
  assert.deepEqual(ledger.pending(),[]);
});

test('corrupt or unknown schemas remain untouched without throwing',() => {
  for (const raw of [
    '{broken','', 'null','[]','{}',
    JSON.stringify({version:2,seen:[],pending:[]}),
    JSON.stringify({version:1,seen:'wrong',pending:[]}),
    JSON.stringify({version:1,seen:[null],pending:[]}),
    JSON.stringify({version:1,seen:[],pending:{}}),
    JSON.stringify({version:1,seen:[],pending:[{id:'bad',tabId:'tab-a'}]}),
    JSON.stringify({version:1,seen:[],pending:[{id:'bad',tabId:'tab-a',createdAt:'yesterday'}]})
  ]) {
    const {storage,ledger} = fixture();
    storage.data.set(PREFIX + 'alice',raw);
    assert.equal(ledger.expect('corrupt'),false,raw);
    assert.equal(ledger.once('corrupt'),false,raw);
    assert.equal(ledger.forget('corrupt'),false,raw);
    assert.equal(ledger.has('corrupt'),false,raw);
    assert.deepEqual(ledger.pending(),[],raw);
    assert.equal(storage.data.get(PREFIX + 'alice'),raw);
    assert.equal(storage.calls.some(call => call.type === 'set'),false);
  }
});

test('pending expires at seven days, survives just before expiry, and is pruned on save',() => {
  const {storage,ledger,advance} = fixture();
  assert.equal(ledger.expect('old'),true);
  advance(7 * DAY - 1);
  assert.deepEqual(ledger.pending().map(item => item.id),['old']);
  assert.equal(ledger.expect('fresh'),true);
  advance(1);
  assert.deepEqual(ledger.pending().map(item => item.id),['fresh']);
  const reload = create({storage,owner:'alice',tabId:'tab-a',now:() => START + 7 * DAY});
  assert.deepEqual(reload.pending().map(item => item.id),['fresh']);
  assert.equal(ledger.expect({id:'already-expired',createdAt:START}),false);
  assert.equal(ledger.once('prune'),true);
  assert.deepEqual(JSON.parse(storage.data.get(PREFIX + 'alice')).pending.map(item => item.id),['fresh']);
  advance(20 * DAY);
  assert.equal(ledger.has('prune'),true); // Seen IDs have a count bound, not a time limit.
  assert.deepEqual(ledger.pending(),[]);
});

test('small maxSeen uses FIFO eviction and duplicates do not refresh order',() => {
  const {storage,ledger} = fixture({maxSeen:2});
  assert.equal(ledger.once('first'),true);
  assert.equal(ledger.once('second'),true);
  assert.equal(ledger.once('first'),false);
  assert.equal(ledger.once('third'),true);
  assert.equal(ledger.has('first'),false);
  assert.equal(ledger.has('second'),true);
  assert.equal(ledger.has('third'),true);
  const reload = create({storage,owner:'alice',tabId:'tab-a',now:() => START,maxSeen:2});
  assert.equal(reload.once('second'),false);
  assert.equal(reload.once('first'),true);
  assert.equal(reload.has('second'),false);
});

test('default and oversized bounds never persist more than 1024 seen IDs',() => {
  for (const maxSeen of [undefined,4096]) {
    const {storage,ledger} = fixture({maxSeen});
    for (let i = 0; i < 1030; i++) assert.equal(ledger.once('event:' + i),true);
    assert.equal(ledger.has('event:5'),false);
    assert.equal(ledger.has('event:6'),true);
    assert.equal(ledger.has('event:1029'),true);
    assert.equal(JSON.parse(storage.data.get(PREFIX + 'alice')).seen.length,1024);
  }
});

test('invalid IDs, clocks, tab IDs, and unserializable metadata never break callers',() => {
  const {ledger} = fixture();
  for (const id of ['', '   ',null,undefined,1,{},Symbol('id')]) {
    assert.equal(ledger.expect({id}),false);
    assert.equal(ledger.once(id),false);
    assert.equal(ledger.has(id),false);
    assert.equal(ledger.forget(id),false);
  }
  for (const createdAt of [null,'now',-1,NaN,Infinity]) assert.equal(ledger.expect({id:'bad-time',createdAt}),false);
  const circular = {}; circular.self = circular;
  assert.equal(ledger.expect({id:'circular',target:circular}),false);
  assert.equal(ledger.expect({id:'bigint',target:1n}),false);
  assert.deepEqual(ledger.pending(),[]);
  for (const now of [() => NaN,() => { throw new Error('Clock unavailable'); }]) {
    const invalid = fixture({now}).ledger;
    assert.equal(invalid.expect('bad-clock'),false);
    assert.equal(invalid.once('bad-clock'),false);
    assert.deepEqual(invalid.pending(),[]);
  }
  const missingTab = fixture({tabId:null});
  assert.equal(missingTab.ledger.expect('no-tab'),false);
  assert.equal(missingTab.ledger.once('no-tab'),false);
  assert.deepEqual(missingTab.storage.calls,[]);
});

test('only owner ledger keys change; board data and preferences remain byte-identical',() => {
  const {storage,ledger} = fixture();
  const unrelated = new Map([
    ['ders-board.alice','{"xp":77,"quests":["q1"]}'],
    ['ders-motion.preferences','{"haptics":true}'],
    [PREFIX + 'bob','do not read or repair another owner']
  ]);
  for (const [key,value] of unrelated) storage.data.set(key,value);
  assert.equal(ledger.expect('one'),true);
  assert.equal(ledger.expect('two'),true);
  assert.equal(ledger.once('one'),true);
  assert.equal(ledger.forget('two'),true);
  ledger.pending();
  ledger.has('one');
  for (const [key,value] of unrelated) assert.equal(storage.data.get(key),value);
  assert.ok(storage.calls.every(call => call.key === PREFIX + 'alice'));
});

test('stable event IDs remain distinct even when they resemble object property names',() => {
  const {ledger} = fixture();
  for (const id of ['__proto__','constructor','toString','quest:q1:1','quest:q1:2']) {
    assert.equal(ledger.expect({id}),true);
    assert.equal(ledger.once(id),true);
    assert.equal(ledger.once(id),false);
    assert.equal(ledger.has(id),true);
  }
});

test('browser and CommonJS API work without DOM, network, or implicit global storage',() => {
  const source = fs.readFileSync(path.join(__dirname,'../motion-ledger.js'),'utf8');
  const win = {};
  Object.defineProperty(win,'localStorage',{get() { throw new Error('Implicit storage access'); }});
  vm.runInNewContext(source,{window:win},{filename:'motion-ledger.js'});
  assert.equal(typeof win.DersMotionLedger.create,'function');
  const storage = memoryStorage();
  const browser = win.DersMotionLedger.create({storage,owner:'browser',tabId:'tab-b',now:() => START});
  assert.deepEqual(Object.keys(browser).sort(),['expect','forget','has','once','pending','setOwner']);
  assert.equal(browser.expect({id:'browser-event',xp:25}),true);
  assert.equal(browser.pending()[0].xp,25);
  assert.equal(browser.once('browser-event'),true);
  assert.equal(browser.once('browser-event'),false);
  const commonjs = {module:{exports:{}}};
  vm.runInNewContext(source,commonjs,{filename:'motion-ledger.js'});
  assert.strictEqual(commonjs.module.exports,commonjs.DersMotionLedger);
  assert.equal(typeof commonjs.module.exports.create,'function');
});

console.log(`v140 ledger: ${checks} checks passed (synthetic storage only).`);
