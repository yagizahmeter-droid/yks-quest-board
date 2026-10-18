(function(root){
  const formatter = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'});
  function dayKey(record) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(record.occurrenceDate || '')) return record.occurrenceDate;
    const date = new Date(record.completedAt);
    return Number.isFinite(date.getTime()) ? formatter.format(date) : '';
  }
  function group(records,weeks) {
    const known = new Map(weeks.map(w=>[w.id,w])), groups = new Map();
    for (const record of records) {
      const key = record.weekId || 'legacy:' + (record.weekName || 'Bilinmeyen hafta');
      if (!groups.has(key)) groups.set(key,{id:key,name:known.get(record.weekId)?.name || record.weekName || 'Bilinmeyen hafta',days:new Map()});
      const week = groups.get(key), day = dayKey(record);
      if (!week.days.has(day)) week.days.set(day,{date:day,records:[]});
      week.days.get(day).records.push(record);
    }
    return [...groups.values()].map(week=>({...week,days:[...week.days.values()].sort((a,b)=>b.date.localeCompare(a.date)).map(day=>({...day,records:[...day.records].sort((a,b)=>(Date.parse(b.completedAt)||0)-(Date.parse(a.completedAt)||0))}))}))
      .sort((a,b)=>b.days[0].date.localeCompare(a.days[0].date));
  }
  root.DersHistory={dayKey,group};
  if(typeof module!=='undefined')module.exports=root.DersHistory;
})(typeof window==='undefined'?globalThis:window);
