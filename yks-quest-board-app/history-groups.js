(function(root){
  const weekDates = root.DersWeekDates || (typeof module !== 'undefined' && module.exports ? require('./week-dates.js') : null);
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
      if (!groups.has(key)) {
        const knownWeek = known.get(record.weekId);
        groups.set(key,{...knownWeek,id:key,name:knownWeek?.name || record.weekName || 'Bilinmeyen hafta',days:new Map()});
      }
      const week = groups.get(key), day = dayKey(record);
      if (!week.days.has(day)) week.days.set(day,{date:day,records:[]});
      week.days.get(day).records.push(record);
    }
    const missing = [...groups.values()].filter(week=>!known.has(week.id));
    return weekDates.order([...weeks,...missing]).filter(week=>groups.has(week.id)).map(week=>groups.get(week.id))
      .map(week=>({...week,days:[...week.days.values()].sort((a,b)=>b.date.localeCompare(a.date)).map(day=>({...day,records:[...day.records].sort((a,b)=>(Date.parse(b.completedAt)||0)-(Date.parse(a.completedAt)||0))}))}));
  }
  root.DersHistory={dayKey,group};
  if(typeof module!=='undefined')module.exports=root.DersHistory;
})(typeof window==='undefined'?globalThis:window);
