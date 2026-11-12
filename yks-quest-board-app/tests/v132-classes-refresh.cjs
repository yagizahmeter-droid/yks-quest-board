'use strict';
// Offline VM tests: execute the complete production script with a small DOM,
// manually settled RPC replies, and a clock that never contacts a real service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '..', 'classes.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const camel = key => key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const voidTags = new Set(['input', 'br', 'hr', 'img', 'meta', 'link']);

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, []); this.listeners.get(name).push(fn); }
  fire(name, extra = {}) { return (this.listeners.get(name) || []).map(fn => fn({ type: name, ...extra })); }
}
class Element extends Events {
  constructor(tag, attrs = {}) {
    super(); this.tag = tag; this.attrs = {}; this.dataset = {}; this.children = []; this.parent = null;
    this.hidden = false; this.disabled = false; this.checked = false; this.open = false;
    for (const [key, value] of Object.entries(attrs)) this.setAttribute(key, value);
  }
  setAttribute(key, value) {
    this.attrs[key] = String(value);
    if (key.startsWith('data-')) this.dataset[camel(key.slice(5))] = String(value);
    if (['hidden', 'checked', 'disabled'].includes(key)) this[key] = true;
  }
  get id() { return this.attrs.id; }
  set id(value) { this.setAttribute('id', value); }
  get name() { return this.attrs.name; }
  get value() {
    if (this._value !== undefined) return this._value;
    if (this.tag === 'select') { const options = this.querySelectorAll('option'); return (options.find(o => 'selected' in o.attrs) || options[0])?.value || ''; }
    return this.attrs.value ?? (this.tag === 'textarea' ? this.textContent : '');
  }
  set value(value) { this._value = value; }
  get isConnected() { return this.tag === 'body' || Boolean(this.parent?.isConnected); }
  get elements() { return Object.fromEntries(this.querySelectorAll('input,select,textarea').map(el => [el.name, el])); }
  append(...nodes) { for (const node of nodes) { if (node instanceof Element) node.parent = this; this.children.push(node); } }
  insertBefore(node, before) { const at = this.children.indexOf(before); node.parent = this; this.children.splice(at < 0 ? this.children.length : at, 0, node); }
  replaceChildren(...nodes) { for (const child of this.children) if (child instanceof Element) child.parent = null; this.children = []; this.append(...nodes); }
  set innerHTML(html) { this.replaceChildren(); this.insertAdjacentHTML('beforeend', html); }
  get innerHTML() { return this.children.map(child => child instanceof Element ? child.outerHTML : child).join(''); }
  get outerHTML() { return '<' + this.tag + Object.entries(this.attrs).map(([k, v]) => ' ' + k + '="' + v + '"').join('') + '>' + (voidTags.has(this.tag) ? '' : this.innerHTML + '</' + this.tag + '>'); }
  get textContent() { return this.children.map(child => child instanceof Element ? child.textContent : child).join(''); }
  set textContent(value) { this.replaceChildren(String(value)); }
  insertAdjacentHTML(where, html) {
    assert.equal(where, 'beforeend'); const stack = [this];
    for (const token of String(html).match(/<[^>]+>|[^<]+/g) || []) {
      if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      if (!token.startsWith('<')) { stack.at(-1).append(token); continue; }
      const tag = token.match(/^<([\w-]+)/)?.[1]; if (!tag) continue;
      const attrs = {}; const rest = token.slice(tag.length + 1, -1);
      for (const match of rest.matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g)) attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
      const child = new Element(tag, attrs); stack.at(-1).append(child); if (!voidTags.has(tag)) stack.push(child);
    }
  }
  matches(selector) {
    return selector.split(',').some(part => {
      const value = part.trim();
      if (value.includes(' ')) { const at = value.lastIndexOf(' '); return this.matches(value.slice(at + 1)) && Boolean(this.parent?.closest(value.slice(0, at))); }
      const tag = value.match(/^[\w-]+/)?.[0]; if (tag && tag !== this.tag) return false;
      const id = value.match(/#([\w-]+)/)?.[1]; if (id && id !== this.id) return false;
      for (const match of value.matchAll(/\.([\w-]+)/g)) if (!(this.attrs.class || '').split(' ').includes(match[1])) return false;
      for (const match of value.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) if (!(match[1] in this.attrs) || (match[2] !== undefined && this.attrs[match[1]] !== match[2])) return false;
      return true;
    });
  }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
  querySelectorAll(selector) { const out = []; for (const child of this.children) if (child instanceof Element) { if (child.matches(selector)) out.push(child); out.push(...child.querySelectorAll(selector)); } return out; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

function harness(options = {}) {
  const document = new Events(); document.hidden = Boolean(options.hidden);
  document.body = new Element('body'); document.body.innerHTML = '<nav class="main-nav"><a data-route="teacher"></a></nav><main id="pageContent"></main>';
  document.createElement = tag => new Element(tag);
  document.querySelector = selector => document.body.querySelector(selector);
  document.getElementById = id => document.querySelector('#' + id);
  const timers = new Map(), calls = [], toasts = [], storage = new Map(); let timerId = 0, teacherRefreshes = 0, studyRefreshes = 0;
  const board = { user: options.user === null ? null : { id: options.user || 'owner-A' }, escape: value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), toast: value => toasts.push(value) };
  board.client = { rpc(name, args) {
    assert.equal(name, 'ders_classes'); const reply = deferred();
    const call = { owner: board.user?.id, action: args.p_action, payload: JSON.parse(JSON.stringify(args.p_payload)), settled: false,
      respond(data) { assert.equal(this.settled, false); this.settled = true; reply.resolve({ data, error: null }); },
      error(message) { assert.equal(this.settled, false); this.settled = true; reply.resolve({ error: { message } }); },
      reject(message) { assert.equal(this.settled, false); this.settled = true; reply.reject(Error(message)); }
    }; calls.push(call); return reply.promise;
  } };
  const window = new Events();
  const ui = { route: options.route || 'home', blocked: false,
    refresh() { document.getElementById('classesPage').hidden = this.route !== 'classes' || options.loading === true; document.fire('ders:route'); },
    navigate(route) { if (this.blocked || route === this.route) return; this.route = route; this.refresh(); },
    canLeave: () => true, openModal() {}, modalClosed() {}, clearDirty(root) { delete root.dataset.dirty; }
  };
  const sandbox = {
    document, navigator: { onLine: options.online !== false, clipboard: { writeText: async () => {} } },
    location: { href: 'https://classes.test/?' + (options.token ? 'class_invite=' + options.token : '') + '#/' + ui.route },
    history: { state: {}, replaceState(state, _, url) { sandbox.location.href = String(url); } },
    URL, crypto: { randomUUID }, confirm: () => true,
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setInterval(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearInterval: id => timers.delete(id),
    FormData: class { constructor(form) { this.rows = form.querySelectorAll('input,select,textarea').filter(el => el.attrs.type !== 'checkbox' || el.checked).map(el => [el.name, el.value]); } get(key) { return this.rows.find(([k]) => k === key)?.[1] ?? null; } getAll(key) { return this.rows.filter(([k]) => k === key).map(([, v]) => v); } has(key) { return this.rows.some(([k]) => k === key); } },
    DersBoard: board, DersUI: ui, DersQuests: { today: () => '2026-11-12' },
    DersTeacher: { info: { connections: [] }, refresh: async () => { teacherRefreshes++; } },
    DersStudy: { refresh: () => { studyRefreshes++; } }, DersSelect: { refresh() {} }, lucide: { createIcons() {} },
    DersCurriculum: { exams: ['TYT'], lessons: () => ['Matematik'] }, YKS_CONFIG: { supabaseUrl: 'https://preview.invalid' },
    addEventListener: window.addEventListener.bind(window)
  };
  sandbox.window = sandbox; vm.runInNewContext(source, sandbox, { filename: 'classes.js', timeout: 1000 });
  const page = document.getElementById('classesPage');
  return { document, page, board, ui, sandbox, timers, calls, storage, toasts, api: sandbox.DersClasses,
    get teacherRefreshes() { return teacherRefreshes; }, get studyRefreshes() { return studyRefreshes; },
    pending(action, match = () => true) { const call = calls.find(c => !c.settled && c.action === action && match(c)); assert.ok(call, 'Missing pending ' + action); return call; },
    count: action => calls.filter(c => c.action === action).length,
    async route(route) { ui.route = route; ui.refresh(); await flush(); },
    async hidden(hidden) { document.hidden = hidden; document.fire('visibilitychange'); await flush(); },
    async online(online) { sandbox.navigator.onLine = online; window.fire(online ? 'online' : 'offline'); await flush(); },
    async owner(id) { board.user = id ? { id } : null; document.fire('ders:render'); await flush(); },
    async tick() { for (const { fn, ms } of [...timers.values()]) { assert.equal(ms, 15000); fn(); } await flush(); },
    click(action, id = '', extra = {}) {
      const b = new Element('button', { 'data-class-action': action, 'data-id': id }); Object.assign(b.dataset, extra);
      return page.onclick({ target: { closest: () => b } });
    },
    async settleOverview(data = overview()) { const call = calls.findLast(c => !c.settled && c.action === 'overview'); assert.ok(call, 'Missing current overview'); call.respond(data); await flush(); },
    async open(id, data = classDetail(id)) {
      const promise = this.api.open(id); await flush(); await this.settleOverview(); this.pending('detail', c => c.payload.class_id === id).respond(data); await promise; await flush();
    },
    async tab(tab) { await this.click('tab', tab); await flush(); },
    submit() { const form = document.getElementById('classDialog').querySelector('form'); assert.ok(form?.onsubmit); return form.onsubmit({ preventDefault() {} }); }
  };
}

function overview(role = 'teacher', label = 'current', action_count = 0) {
  return { role, action_count, classes: ['A', 'B', 'C'].map(id => ({ id, name: label + '-' + id, description: '', teacher_name: 'Teacher', active_members: 0 })), requests: [] };
}
function classDetail(id, label = id, teacher = true) {
  return { class: { id, name: label, teacher_name: 'Teacher', description: '', archived_at: null }, teacher,
    members: [], requests: [], programs: [], shared_tasks: [], leaderboard: [], xp_history: [], announcements: [], events: [], shared_profiles: [], preferences: {},
    statistics: { active_members: 0, starts_on: '2026-11-09', ends_on: '2026-11-15', study: null, exams: [], exam_trend: [] } };
}
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('polling is absent off route; visible entry, redraw coalescing and exit', async () => {
  const h = harness(); assert.equal(h.calls.length, 0); assert.equal(h.timers.size, 0);
  await h.hidden(true); await h.hidden(false); await h.online(true); await h.tick(); assert.equal(h.calls.length, 0);
  await h.route('classes'); assert.equal(h.timers.size, 1); assert.equal(h.count('overview'), 1);
  h.ui.refresh(); h.document.fire('ders:render'); await h.tick(); assert.equal(h.count('overview'), 1);
  const first = h.api.refresh(); assert.equal(first, h.api.refresh());
  await h.settleOverview(); await first;
  h.ui.refresh(); h.document.fire('ders:render'); await flush(); assert.equal(h.count('overview'), 1);
  await h.tick(); assert.equal(h.count('overview'), 2); const late = h.pending('overview'); const html = h.page.innerHTML;
  await h.route('home'); assert.equal(h.timers.size, 0); late.respond(overview('teacher', 'obsolete', 99)); await flush();
  assert.equal(h.page.innerHTML, html); assert.equal(h.document.getElementById('classActionBadge').hidden, true);
  await h.api.refresh(); await h.tick(); assert.equal(h.count('overview'), 2);
});

test('hidden, offline, auth loading and signed-out pages never start reads', async () => {
  for (const opts of [{ hidden: true }, { online: false }, { loading: true }, { user: null }]) {
    const h = harness({ route: 'classes', ...opts }); await flush(); await h.api.refresh(); await h.tick();
    assert.equal(h.calls.length, 0); assert.equal(h.timers.size, 0);
  }
});

test('hide/show and offline/online discard the old overview and resume immediately', async () => {
  for (const mode of ['hidden', 'online']) {
    const h = harness({ route: 'classes' }); const old = h.pending('overview');
    await h[mode](mode === 'hidden'); assert.equal(h.timers.size, 0);
    await h.api.refresh(); assert.equal(h.count('overview'), 1);
    await h[mode](mode !== 'hidden'); assert.equal(h.timers.size, 1); assert.equal(h.count('overview'), 2);
    await h.settleOverview(overview('teacher', 'new', 2));
    const html = h.page.innerHTML; old.respond(overview('teacher', 'old', 90)); await flush();
    assert.equal(h.page.innerHTML, html); assert.equal(h.document.getElementById('classActionBadge').textContent, '2');
  }
});

test('overview selection changes coalesce reads and only request the latest detail', async () => {
  const h = harness({ route: 'classes' });
  const a = h.api.open('A'), b = h.api.open('B'); await flush(); assert.equal(h.count('overview'), 1);
  await h.settleOverview(); assert.equal(h.count('detail'), 1); const req = h.pending('detail'); assert.equal(req.payload.class_id, 'B');
  req.respond(classDetail('B', 'selected-B')); await Promise.all([a, b]);
  assert.match(h.page.textContent, /selected-B/); assert.doesNotMatch(h.page.textContent, /selected-A/);
});

test('out-of-order detail successes and failures cannot overwrite a newer class', async () => {
  for (const fail of [false, true]) {
    const h = harness({ route: 'classes' }); const a = h.api.open('A'); await h.settleOverview(); const old = h.pending('detail');
    const b = h.api.open('B'); await h.settleOverview(); h.pending('detail', c => c.payload.class_id === 'B').respond(classDetail('B', 'selected-B')); await b;
    const html = h.page.innerHTML; if (fail) old.error('old class access denied'); else old.respond(classDetail('A', 'obsolete-A'));
    await a; assert.equal(h.page.innerHTML, html); assert.match(h.page.textContent, /selected-B/);
  }
});

test('back during detail loading retains the overview and invalidates the old selection', async () => {
  const h = harness({ route: 'classes' }); const open = h.api.open('A'); await h.settleOverview(); const old = h.pending('detail');
  await h.click('back'); const html = h.page.innerHTML; old.respond(classDetail('A', 'obsolete-detail')); await open;
  assert.equal(h.page.innerHTML, html); assert.doesNotMatch(h.page.textContent, /obsolete-detail/);
});

test('route exit during overview prevents detail; route reentry rejects old detail', async () => {
  const h = harness({ route: 'classes' }); const open = h.api.open('A'); const oldOverview = h.pending('overview');
  await h.route('program'); oldOverview.respond(overview()); await open; assert.equal(h.count('detail'), 0);
  await h.route('classes'); await h.settleOverview(); const oldDetail = h.pending('detail');
  await h.route('home'); await h.route('classes'); await h.settleOverview(); h.pending('detail', c => c !== oldDetail).respond(classDetail('A', 'reentered'));
  await flush(); const html = h.page.innerHTML; oldDetail.error('obsolete denial'); await flush(); assert.equal(h.page.innerHTML, html);
});

test('hidden/offline selected detail stops immediately and refreshes on resume', async () => {
  for (const mode of ['hidden', 'online']) {
    const h = harness({ route: 'classes' }); await h.open('A');
    const refreshing = h.api.refresh(); await h.settleOverview(); const old = h.pending('detail');
    await h[mode](mode === 'hidden'); const html = h.page.innerHTML;
    old.respond(classDetail('A', 'hidden-result')); await refreshing; assert.equal(h.page.innerHTML, html);
    const count = h.calls.length; await h.tick(); await h.api.refresh(); assert.equal(h.calls.length, count);
    await h[mode](mode !== 'hidden'); await h.settleOverview(); h.pending('detail').respond(classDetail('A', 'resumed')); await flush();
    assert.match(h.page.textContent, /resumed/); assert.equal(h.timers.size, 1);
  }
});

test('owner switches start independently and old finally cannot clear the new load', async () => {
  const h = harness({ route: 'classes' }); const old = h.pending('overview');
  await h.owner('owner-B'); const latest = h.pending('overview', c => c.owner === 'owner-B'); assert.equal(h.count('overview'), 2);
  old.respond(overview('teacher', 'private-A', 50)); await flush();
  const promise = h.api.refresh(); assert.equal(promise, h.api.refresh()); assert.equal(h.count('overview'), 2);
  latest.respond(overview('student', 'private-B', 3)); await promise; assert.match(h.page.textContent, /private-B/); assert.doesNotMatch(h.page.textContent, /private-A/);
  await h.owner(null); assert.equal(h.timers.size, 0); assert.match(h.page.textContent, /giriş yap/);
});

test('owner A to B to A still rejects the original A session', async () => {
  const h = harness({ route: 'classes' }); const original = h.pending('overview');
  await h.owner('owner-B'); const middle = h.pending('overview', c => c.owner === 'owner-B'); await h.owner('owner-A');
  h.pending('overview', c => c !== original && c.owner === 'owner-A').respond(overview('teacher', 'new-session')); await flush();
  const html = h.page.innerHTML; original.respond(overview('teacher', 'original-session')); middle.error('old B failure'); await flush(); assert.equal(h.page.innerHTML, html);
});

test('period and week races use captured parameters and cannot display old totals', async () => {
  const h = harness({ route: 'classes' }); await h.open('A');
  const period = h.page.querySelector('[name="period"]'); period.onchange({ target: { value: 'month' } }); await h.settleOverview(); const oldMonth = h.pending('detail'); assert.equal(oldMonth.payload.period, 'month');
  period.onchange({ target: { value: 'all' } }); await h.settleOverview(); h.pending('detail', c => c !== oldMonth).respond(classDetail('A', 'all-period')); await flush();
  oldMonth.respond(classDetail('A', 'obsolete-month')); await flush(); assert.match(h.page.textContent, /all-period/);
  h.page.querySelector('[name="period"]').onchange({ target: { value: 'week' } }); await h.settleOverview(); h.pending('detail').respond(classDetail('A')); await flush();
  const week = h.page.querySelector('[name="week"]'); week.fire('change', { target: { value: '2026-11-05' } }); await h.settleOverview(); const oldWeek = h.pending('detail'); assert.equal(oldWeek.payload.week_start, '2026-11-02');
  week.fire('change', { target: { value: '2026-11-12' } }); await h.settleOverview(); h.pending('detail', c => c !== oldWeek).respond(classDetail('A', 'new-week')); await flush();
  const html = h.page.innerHTML; oldWeek.error('obsolete-week-failure'); await flush(); assert.equal(h.page.innerHTML, html); assert.match(h.page.textContent, /new-week/);
});

test('successful own action bypasses a pending poll and keeps the newer result', async () => {
  const h = harness({ route: 'classes' }); await h.open('A');
  await h.tick(); const old = h.pending('overview'); const action = h.click('pin-program', 'program-1', { pinned: 'true' });
  const write = h.pending('pin_program'); assert.equal(write.payload.class_id, 'A'); assert.equal(write.payload.pinned, true); assert.ok(write.payload.request_id);
  // Navigation and refresh clicks must not unlock a mutation that is still busy.
  await h.click('tab', 'programs'); const coalesced = h.click('refresh'); await h.click('pin-program', 'program-2'); assert.equal(h.count('pin_program'), 1);
  write.respond({ ok: true }); await flush(); assert.equal(h.count('overview'), 3);
  h.pending('overview', c => c !== old).respond(overview('teacher', 'after-action')); await flush(); h.pending('detail').respond(classDetail('A', 'after-action-detail')); await action;
  const html = h.page.innerHTML; old.respond(overview('teacher', 'before-action')); await coalesced;
  assert.equal(h.page.innerHTML, html); assert.ok(h.teacherRefreshes > 0); assert.ok(h.studyRefreshes > 0); assert.equal(h.toasts.length, 1);
});

test('post-action detail bypasses the same class read and ignores its late failure', async () => {
  const h = harness({ route: 'classes' }); await h.open('A');
  const oldRefresh = h.api.refresh(); await h.settleOverview(); const old = h.pending('detail');
  const action = h.click('pin-program', 'program-1'); h.pending('pin_program').respond({ ok: true }); await flush();
  await h.settleOverview(); const latest = h.pending('detail', c => c !== old); latest.respond(classDetail('A', 'after-write')); await action;
  const html = h.page.innerHTML; old.error('obsolete detail denied'); await oldRefresh;
  assert.equal(h.page.innerHTML, html); assert.match(h.page.textContent, /after-write/);
});

test('action success after changing class never clears the newer selection', async () => {
  const h = harness({ route: 'classes' }); await h.open('A', classDetail('A', 'A', false));
  const leaving = h.click('leave'); const write = h.pending('leave');
  await h.open('B'); write.respond({ ok: true }); await flush(); await h.settleOverview(); h.pending('detail').respond(classDetail('B', 'still-B')); await leaving;
  assert.match(h.page.textContent, /still-B/); assert.equal(write.payload.class_id, 'A');
});

test('action completion after route exit defers reads until visible again', async () => {
  const h = harness({ route: 'classes' }); await h.open('A'); const action = h.click('archive'); const write = h.pending('archive_class');
  await h.route('home'); const count = h.calls.length; write.respond({ ok: true }); await action;
  assert.equal(h.calls.length, count); assert.equal(h.timers.size, 0);
  await h.route('classes'); await h.settleOverview(); h.pending('detail').respond(classDetail('A', 'archived-fresh')); await flush(); assert.match(h.page.textContent, /archived-fresh/);
});

test('old owner action completion cannot refresh, toast or overwrite a new owner', async () => {
  const h = harness({ route: 'classes' }); await h.open('A'); const action = h.click('archive'); const write = h.pending('archive_class');
  await h.owner('owner-B'); await h.settleOverview(overview('student', 'owner-B')); const html = h.page.innerHTML, count = h.calls.length;
  write.respond({ ok: true }); await action; assert.equal(h.calls.length, count); assert.equal(h.page.innerHTML, html); assert.equal(h.toasts.length, 0);
});

test('old action finally cannot unlock an action for the new owner', async () => {
  const h = harness({ route: 'classes' }); await h.open('A'); const oldAction = h.click('archive'); const oldWrite = h.pending('archive_class');
  await h.owner('owner-B'); await h.settleOverview(); await h.open('B');
  const newAction = h.click('archive'); const newWrite = h.pending('archive_class', c => c !== oldWrite);
  oldWrite.respond({ ok: true }); await oldAction; await h.click('pin-program', 'program-1'); assert.equal(h.count('pin_program'), 0);
  newWrite.respond({ ok: true }); await flush(); await h.settleOverview(); h.pending('detail').respond(classDetail('B')); await newAction;
});

test('sendProgram awaits a post-write refresh independently of an older read', async () => {
  const h = harness({ route: 'classes' }); const old = h.pending('overview');
  const sent = h.api.sendProgram({ id: 'program-1', class_id: 'A', quests: [{ xp: 100, repeat_target: 2 }] }); const write = h.pending('send_program');
  assert.equal(write.payload.request_id, 'program-1'); assert.deepEqual(write.payload.quests, [{ xp: 100, repeat_target: 2 }]); write.respond({ ok: true }); await flush();
  assert.equal(h.count('overview'), 2); h.pending('overview', c => c !== old).respond(overview('teacher', 'sent')); await sent;
  const html = h.page.innerHTML; old.respond(overview('teacher', 'old')); await flush(); assert.equal(h.page.innerHTML, html); assert.match(h.page.textContent, /sent-A/);
});

test('modal creation refreshes immediately and retains the normal class selection', async () => {
  const h = harness({ route: 'classes' }); await h.settleOverview(); await h.click('create'); const dialog = h.document.getElementById('classDialog');
  dialog.querySelector('[name="name"]').value = 'Created'; const saving = h.submit(); const write = h.pending('create_class'); assert.equal(write.payload.name, 'Created');
  write.respond({ id: 'C' }); await flush(); assert.equal(dialog.open, false); await h.settleOverview(); h.pending('detail').respond(classDetail('C', 'created-C')); await saving;
  assert.match(h.page.textContent, /created-C/);
});

test('delayed modal save cannot restore the previously selected class', async () => {
  const h = harness({ route: 'classes' }); await h.open('A'); await h.click('edit'); const saving = h.submit(); const write = h.pending('update_class');
  await h.open('B'); write.respond({ id: 'A' }); await flush(); await h.settleOverview(); const detail = h.pending('detail'); assert.equal(detail.payload.class_id, 'B'); detail.respond(classDetail('B', 'newer-B')); await saving;
  assert.match(h.page.textContent, /newer-B/); assert.equal(write.payload.class_id, 'A');
});

test('privacy save refreshes beyond a pending read and retains preference payload', async () => {
  const h = harness({ route: 'classes' }); await h.open('A', classDetail('A', 'A', false)); await h.tab('settings');
  const form = h.document.getElementById('classPrivacyForm'); form.elements.share_name.checked = true; form.dataset.dirty = 'true';
  await h.tick(); const old = h.pending('overview'); const saving = form.onsubmit({ preventDefault() {} }); const write = h.pending('preferences');
  assert.deepEqual([write.payload.class_id, write.payload.share_name, write.payload.share_exams, write.payload.share_study], ['A', true, false, false]);
  write.respond({ ok: true }); await flush(); h.pending('overview', c => c !== old).respond(overview('student')); await flush();
  const detail = classDetail('A', 'A', false); detail.preferences.share_name = true; h.pending('detail').respond(detail); await saving;
  assert.equal(h.document.getElementById('classPrivacyForm').elements.share_name.checked, true);
  const html = h.page.innerHTML; old.respond(overview('student', 'stale')); await flush(); assert.equal(h.page.innerHTML, html);
});

test('dirty privacy edits survive normal polling', async () => {
  const h = harness({ route: 'classes' }); await h.open('A', classDetail('A', 'A', false)); await h.tab('settings');
  const form = h.document.getElementById('classPrivacyForm'); form.dataset.dirty = 'true'; form.elements.share_name.checked = true;
  await h.tick(); await h.settleOverview(overview('student')); h.pending('detail').respond(classDetail('A', 'new-server-name', false)); await flush();
  assert.equal(h.document.getElementById('classPrivacyForm'), form); assert.equal(form.elements.share_name.checked, true);
});

test('hidden/offline dialogs retain their draft and can submit after resuming', async () => {
  for (const mode of ['hidden', 'online']) {
    const h = harness({ route: 'classes' }); await h.settleOverview(); await h.click('create');
    const dialog = h.document.getElementById('classDialog'), form = dialog.querySelector('form'); form.querySelector('[name="name"]').value = 'Retained draft';
    await h[mode](mode === 'hidden'); await h[mode](mode !== 'hidden'); await h.settleOverview();
    assert.equal(dialog.querySelector('form'), form); const saving = h.submit(); const write = h.pending('create_class'); assert.equal(write.payload.name, 'Retained draft');
    write.respond({ id: 'C' }); await flush(); await h.settleOverview(); h.pending('detail').respond(classDetail('C', 'saved-draft')); await saving;
    assert.equal(dialog.open, false); assert.match(h.page.textContent, /saved-draft/);
  }
});

test('dirty privacy draft can save after hide and resume; hidden completion clears dirty', async () => {
  const h = harness({ route: 'classes' }); await h.open('A', classDetail('A', 'A', false)); await h.tab('settings');
  const form = h.document.getElementById('classPrivacyForm'); form.dataset.dirty = 'true'; form.elements.share_name.checked = true;
  await h.hidden(true); await h.hidden(false); await h.settleOverview(overview('student')); h.pending('detail').respond(classDetail('A', 'A', false)); await flush();
  assert.equal(h.document.getElementById('classPrivacyForm'), form); const saving = form.onsubmit({ preventDefault() {} }); const write = h.pending('preferences');
  await h.hidden(true); const count = h.calls.length; write.respond({ ok: true }); await saving;
  assert.equal(form.dataset.dirty, undefined); assert.equal(h.calls.length, count);
  await h.hidden(false); await h.settleOverview(overview('student')); const data = classDetail('A', 'fresh-A', false); data.preferences.share_name = true; h.pending('detail').respond(data); await flush();
  assert.equal(h.document.getElementById('classPrivacyForm').elements.share_name.checked, true); assert.match(h.page.textContent, /fresh-A/);
});

test('eligible-segment reads coalesce and late results cannot reopen a hidden modal', async () => {
  const h = harness({ route: 'classes' }), data = classDetail('A', 'A', false);
  data.shared_tasks = [{ id: 'task-1', kind: 'duration', name: 'Shared', subject: 'Matematik', total: 0, target: 3600000, own_total: 0, own_xp: 0, xp_pool: 100, starts_on: '2026-11-01', ends_on: '2026-11-30', display_status: 'in_progress', contributions: [] }];
  await h.open('A', data); const first = h.click('contribute', 'task-1'), second = h.click('contribute', 'task-1'); assert.equal(h.count('eligible_segments'), 1);
  await h.route('home'); h.pending('eligible_segments').respond([]); await Promise.all([first, second]);
  assert.equal(h.document.getElementById('classDialog').open, false);
});

test('invite acceptance is deduplicated across selections and refreshes after joining', async () => {
  const h = harness({ route: 'classes', token: 'mock-invite' }); await h.settleOverview(overview('student')); const join = h.pending('join_link');
  const open = h.api.open('B'); await h.settleOverview(overview('student')); assert.equal(h.count('join_link'), 1);
  join.respond({ status: 'active', class_id: 'A' }); await flush();
  assert.equal(h.storage.has('ders-class-invite'), false); assert.equal(new URL(h.sandbox.location.href).searchParams.has('class_invite'), false);
  await h.settleOverview(overview('student', 'joined')); const detail = h.pending('detail'); assert.equal(detail.payload.class_id, 'B'); detail.respond(classDetail('B', 'selected-B', false)); await open; await flush();
  assert.match(h.page.textContent, /selected-B/); assert.equal(h.count('join_link'), 1);
});

test('joining cannot start hidden detail or publish into another owner', async () => {
  const h = harness({ route: 'classes', token: 'mock-invite' }); await h.settleOverview(overview('student')); const old = h.pending('join_link');
  await h.hidden(true); old.respond({ status: 'active', class_id: 'A' }); await flush(); assert.equal(h.count('detail'), 0); assert.equal(h.count('overview'), 1);
  await h.hidden(false); await h.settleOverview(overview('student')); assert.equal(h.count('detail'), 0);
  const other = harness({ route: 'classes', token: 'mock-invite' }); await other.settleOverview(overview('student')); const join = other.pending('join_link');
  await other.owner('owner-B'); await other.settleOverview(overview('teacher', 'new-owner')); const html = other.page.innerHTML;
  join.respond({ status: 'active', class_id: 'A' }); await flush(); assert.equal(other.page.innerHTML, html); assert.equal(other.count('detail'), 0); assert.equal(other.storage.has('ders-class-invite'), true);
});

test('current errors are retryable; stale errors stay silent', async () => {
  const h = harness({ route: 'classes' }); h.pending('overview').reject('temporary network failure'); await flush(); assert.match(h.page.textContent, /temporary network failure/);
  const retry = h.api.refresh(); assert.equal(h.count('overview'), 2); await h.settleOverview(overview('teacher', 'recovered')); await retry; assert.doesNotMatch(h.page.textContent, /temporary network failure/);
  const old = h.api.refresh(); const failed = h.pending('overview'); await h.route('home'); await h.route('classes'); await h.settleOverview(overview('teacher', 'new-route')); const html = h.page.innerHTML;
  failed.reject('obsolete network failure'); await old; assert.equal(h.page.innerHTML, html);
});

test('current detail denial returns to overview; failed writes release busy without fake refresh', async () => {
  const h = harness({ route: 'classes' }); const open = h.api.open('A'); await h.settleOverview(); h.pending('detail').error('access denied'); await open;
  assert.match(h.page.textContent, /access denied/); assert.match(h.page.textContent, /current-B/);
  await h.open('A'); const count = h.count('overview'); const failed = h.click('archive'); h.pending('archive_class').error('write rejected'); await failed; assert.equal(h.count('overview'), count);
  const retry = h.click('archive'); assert.equal(h.count('archive_class'), 2); h.pending('archive_class').respond({ ok: true }); await flush(); await h.settleOverview(); h.pending('detail').respond(classDetail('A')); await retry;
});

test('opening a class resets owner before selection and respects blocked navigation', async () => {
  const h = harness(); h.board.user = { id: 'owner-B' }; const open = h.api.open('B'); await h.settleOverview(overview('student')); const detail = h.pending('detail'); assert.equal(detail.payload.class_id, 'B'); detail.respond(classDetail('B', 'owner-B-class', false)); await open;
  const blocked = harness(); blocked.ui.blocked = true; await blocked.api.open('A'); assert.equal(blocked.calls.length, 0); assert.equal(blocked.timers.size, 0);
});

(async () => {
  let passed = 0;
  for (const { name, run } of tests) {
    let timer;
    try { await Promise.race([run(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Timed out: ' + name)), 5000); })]); }
    finally { clearTimeout(timer); }
    passed++; console.log('PASS v132 classes: ' + name);
  }
  console.log('RESULT ' + passed + ' focused Classes refresh checks passed (mocked RPC only; no database access).');
})().catch(error => { console.error(error); process.exitCode = 1; });
