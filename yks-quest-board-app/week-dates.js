(function(root){
  const startFields = ['startDate','start','starts_on','start_date'];
  const endFields = ['endDate','end','ends_on','end_date'];

  // Require a complete, valid calendar date; never let Date.parse supply a year.
  function dateKey(value) {
    if (typeof value !== 'string') return '';
    const text = value.trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/);
    const numeric = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!iso && !numeric) return '';
    const year = Number(iso ? iso[1] : numeric[3]);
    const month = Number(iso ? iso[2] : numeric[2]);
    const day = Number(iso ? iso[3] : numeric[1]);
    const key = `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const stamp = Date.parse(key + 'T00:00:00Z');
    if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0,10) !== key) return '';
    if (iso && text.includes('T') && !Number.isFinite(Date.parse(text))) return '';
    return key;
  }

  function rangeDates(value) {
    if (typeof value !== 'string') return null;
    // Existing teacher weeks store these two fully qualified dates in range.
    // Both endpoints must carry their own year, including across New Year.
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})\s*[-–—]\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})$/);
    if (!match) return null;
    const start = dateKey(match[1]), end = dateKey(match[2]);
    return start && end && start <= end ? {start,end} : null;
  }

  function dates(week) {
    const sources = [week,week?.meta,week?.weekMeta,week?.week_meta].filter(source=>source && typeof source === 'object');
    for (const source of sources) {
      const start = startFields.map(field=>dateKey(source[field])).find(Boolean) || '';
      const end = endFields.map(field=>dateKey(source[field])).find(Boolean) || '';
      if ((start || end) && !(start && end && end < start)) return {start,end};
    }
    for (const source of sources) {
      const range = rangeDates(source.range) || rangeDates(source.week_range);
      if (range) return range;
    }
    return {start:'',end:''};
  }

  function createdAt(week) {
    for (const value of [week?.createdAt,week?.created_at,week?.meta?.createdAt,week?.meta?.created_at]) {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (dateKey(value)) return Date.parse(value.includes('T') ? value : dateKey(value) + 'T00:00:00Z');
    }
    return null;
  }

  function key(week,index) {
    const period = dates(week), date = period.start || period.end, created = createdAt(week);
    return {date:date ? Date.parse(date + 'T00:00:00Z') : created,created,index,id:String(week?.id ?? '')};
  }

  function compareKeys(a,b) {
    for (const field of ['date','created']) {
      if (a[field] !== b[field]) {
        if (a[field] === null) return 1;
        if (b[field] === null) return -1;
        return b[field] - a[field];
      }
    }
    return a.index - b.index || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }

  // Newest first, without sorting or annotating the stored array or its weeks.
  // Undated legacy weeks retain source order; IDs break any remaining tie.
  function compare(a,b,indexA=0,indexB=0) { return compareKeys(key(a,indexA),key(b,indexB)); }
  function order(weeks=[]) {
    return weeks.map((week,index)=>({week,key:key(week,index)}))
      .sort((a,b)=>compareKeys(a.key,b.key)).map(item=>item.week);
  }

  const api = {dateKey,dates,compare,order};
  root.DersWeekDates = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
