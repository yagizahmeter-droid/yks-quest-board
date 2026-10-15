(function (root) {
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function fields(base = {}, local = {}, remote = {}) {
    const result = { ...remote };
    for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
      if (!equal(base[key], local[key])) {
        if (key in local) result[key] = local[key]; else delete result[key];
      }
    }
    return result;
  }
  function entities(base = [], local = [], remote = [], merge = fields) {
    const bm = new Map(base.map(x => [x.id, x])), lm = new Map(local.map(x => [x.id, x]));
    const result = remote.filter(x => !bm.has(x.id) || lm.has(x.id) || x.archived || x.lockedForStudent || x.quests?.some(q => q.lockedForStudent))
      .map(x => lm.has(x.id) ? merge(bm.get(x.id) || {}, lm.get(x.id), x) : x);
    const ids = new Set(result.map(x => x.id));
    for (const x of local) if (!ids.has(x.id) && !bm.has(x.id)) result.push(x);
    return result;
  }
  function quest(base, local, remote) {
    const result = fields(base, local, remote);
    if (remote.lockedForStudent) {
      for (const key of ['title', 'detail', 'xp', 'categoryId', 'subject', 'source', 'sourceDay', 'lockedForStudent', 'assignedQuestId', 'assignedByTeacherId','examType','topicCategory','topicName','topicScope']) result[key] = remote[key];
      if(remote.repeat){for(const key of ['repeat','completions','done','completionId','examType'])result[key]=remote[key];}
    }
    return result;
  }
  function mergeState(base, local, remote) {
    const result = fields(base, local, remote);
    result.categories = entities(base.categories, local.categories, remote.categories);
    result.weeks = entities(base.weeks, local.weeks, remote.weeks, (b, l, r) => r.archived?r:({
      ...fields(b, l, r), quests: entities(b.quests, l.quests, r.quests, quest)
    }));
    result.studyHistory = entities(base.studyHistory, local.studyHistory, remote.studyHistory,(b,l,r)=>r.repeatKind?r:fields(b,l,r));
    const completed = new Set(result.weeks.flatMap(w => w.quests.filter(q => q.done).map(q => q.completionId)).filter(Boolean));
    result.weeks.flatMap(w=>w.quests).forEach(q=>(q.completions||[]).forEach(e=>completed.add('repeat-event-'+e.id)));
    result.studyHistory = result.studyHistory.filter(h => completed.has(h.id));
    return result;
  }
  root.DersSync = { mergeState, equal };
  if (typeof module !== 'undefined') module.exports = root.DersSync;
})(typeof window === 'undefined' ? globalThis : window);

