(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DersClassModel=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const target=q=>Math.max(1,Number(q.repeat_target)||1);
 const count=q=>Math.min(target(q),Math.max(0,Number(q.count)||0));
 function progress(quests=[]){const active=quests.filter(q=>!q.archived_at),targets=active.reduce((n,q)=>n+target(q),0),units=active.reduce((n,q)=>n+count(q),0),done=active.filter(q=>count(q)>=target(q)).length;return {total:active.length,done,partial:active.filter(q=>count(q)>0&&count(q)<target(q)).length,started:units>0,targets,units,percent:targets?Math.round(units/targets*100):null,completionPercent:active.length?Math.round(done/active.length*100):null};}
 function homework(programs=[],range={}){
  const rows=programs.filter(p=>(!range.starts_on||p.ends_on>=range.starts_on)&&(!range.ends_on||p.starts_on<=range.ends_on));
  const states=Object.fromEntries(['sent','accepted','pending','rejected','withdrawn','cancelled','started','completed'].map(k=>[k,new Set()])),assignments={accepted:0,pending:0,rejected:0,withdrawn:0,cancelled:0},studentQuests=new Map(),quests=[];
  for(const p of rows)for(const r of p.recipients||[]){const id=r.student_id||r.assignment_id;states.sent.add(id);const state=p.cancelled_at?'cancelled':r.status;if(states[state])states[state].add(id);if(state in assignments)assignments[state]++;
   if(state!=='accepted'||r.archived_at)continue;
   const qs=(r.quests||[]).filter(q=>!q.archived_at);quests.push(...qs);if(!studentQuests.has(id))studentQuests.set(id,[]);studentQuests.get(id).push(...qs);
  }
  for(const [id,qs]of studentQuests){const s=progress(qs);if(s.started)states.started.add(id);if(s.total&&s.done===s.total)states.completed.add(id);}
  return {...progress(quests),students:Object.fromEntries(Object.entries(states).map(([k,v])=>[k,v.size])),assignments};
 }
 return {progress,homework,target,count};
});
