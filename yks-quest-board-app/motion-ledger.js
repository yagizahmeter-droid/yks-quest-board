(function(root){
  'use strict';

  const PREFIX = 'ders-motion.events.v140:';
  const SEEN_LIMIT = 1024;
  const PENDING_TTL = 7 * 24 * 60 * 60 * 1000;
  const metadata = ['weekId','questId','historyId','requestId','beforeCount','target','complete','xp','beforeTotalXp','assignedQuestId'];
  const isId = value => typeof value === 'string' && value.trim().length > 0;
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isTime = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const clone = value => JSON.parse(JSON.stringify(value));

  // Inject synchronous localStorage-like storage and an epoch-millisecond clock.
  // No storage is accessed until an owned operation; setOwner never clears data.
  function create(options = {}) {
    const {storage,tabId} = options;
    const clock = typeof options.now === 'function' ? options.now : Date.now;
    const limit = Number.isFinite(options.maxSeen) && options.maxSeen >= 1
      ? Math.min(SEEN_LIMIT,Math.floor(options.maxSeen)) : SEEN_LIMIT;
    let owner = isId(options.owner) ? options.owner : null;

    function read() {
      if (!owner || !isId(tabId)) return null;
      try {
        const key = PREFIX + owner;
        const time = clock();
        if (!isTime(time)) return null;
        const raw = storage.getItem(key);
        if (raw === null) return {key,time,state:{version:1,seen:[],pending:[]}};
        const state = JSON.parse(raw);
        if (!isRecord(state) || state.version !== 1 || !Array.isArray(state.seen) ||
            !Array.isArray(state.pending) || !state.seen.every(isId) ||
            !state.pending.every(item => isRecord(item) && isId(item.id) &&
              isId(item.tabId) && isTime(item.createdAt))) return null;
        // Keep the most recent occurrence if an otherwise valid record repeats an ID.
        const seen = Array.from(new Set(state.seen.slice().reverse())).reverse().slice(-limit);
        const known = new Set(seen);
        const pending = state.pending.filter(item => item.createdAt > time - PENDING_TTL && !known.has(item.id));
        return {key,time,state:{version:1,seen,pending}};
      } catch (_) {
        // Unreadable/corrupt state is never replaced with an empty ledger.
        return null;
      }
    }

    function persist(record) {
      try {
        record.state.seen = record.state.seen.slice(-limit);
        const raw = JSON.stringify(record.state);
        storage.setItem(record.key,raw);
        // Also fail closed for adapters which silently discard a write.
        return storage.getItem(record.key) === raw;
      } catch (_) {
        return false;
      }
    }

    function setOwner(id) {
      owner = isId(id) ? id : null;
    }

    // Accept {id, ...metadata}, or a string ID. Never retain caller-owned objects.
    // createdAt defaults to now(); caller-supplied tabId is always ignored.
    function expect(intent) {
      try {
        const source = typeof intent === 'string' ? {id:intent} : intent;
        if (!isRecord(source) || !isId(source.id)) return false;
        const record = read();
        if (!record) return false;
        const {state,time} = record;
        if (state.seen.includes(source.id) || state.pending.some(item => item.id === source.id)) return false;
        const createdAt = source.createdAt === undefined ? time : source.createdAt;
        if (!isTime(createdAt) || createdAt <= time - PENDING_TTL) return false;
        const item = {id:source.id,tabId,createdAt};
        for (const field of metadata) {
          if (Object.prototype.hasOwnProperty.call(source,field) && source[field] !== undefined) item[field] = source[field];
        }
        state.pending.push(clone(item));
        state.pending=state.pending.slice(-128);
        return persist(record);
      } catch (_) {
        return false;
      }
    }

    function pending() {
      const record = read();
      return record ? clone(record.state.pending.filter(item => item.tabId === tabId)) : [];
    }

    // Call effects only after true. IDs without an intent can also be deduplicated,
    // but another tab's pending intent cannot be claimed or removed by this tab.
    // Each call re-reads storage; localStorage does not provide cross-tab CAS.
    function once(eventId) {
      if (!isId(eventId)) return false;
      const record = read();
      if (!record || record.state.seen.includes(eventId)) return false;
      if (record.state.pending.some(item => item.id === eventId && item.tabId !== tabId)) return false;
      record.state.seen.push(eventId);
      record.state.pending = record.state.pending.filter(item => item.id !== eventId || item.tabId !== tabId);
      return persist(record);
    }

    // Cancel only this tab's pending intent. Seen IDs remain consumed.
    function forget(eventId) {
      if (!isId(eventId)) return false;
      const record = read();
      if (!record) return false;
      const pending = record.state.pending.filter(item => item.id !== eventId || item.tabId !== tabId);
      if (pending.length === record.state.pending.length) return false;
      record.state.pending = pending;
      return persist(record);
    }

    // has() reports a consumed (seen) ID, rather than a queued intent.
    function has(eventId) {
      if (!isId(eventId)) return false;
      const record = read();
      return !!record && record.state.seen.includes(eventId);
    }

    return {setOwner,expect,pending,once,forget,has};
  }

  const api = {create};
  root.DersMotionLedger = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
