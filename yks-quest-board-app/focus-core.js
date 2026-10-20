(function(root){
 'use strict';
 const copy=x=>structuredClone(x),limit=8*3600000;
 function validate(settings){
  const s={workMs:Number(settings.workMs),breakMs:Number(settings.breakMs||0),repeat:!!settings.repeat,auto:!!settings.auto,sound:settings.sound!==false,tone:settings.tone==='soft'?'soft':'bell',task:settings.task||null,contextWeekId:settings.contextWeekId||null};
  if(!Number.isInteger(s.workMs)||s.workMs<60000||s.workMs>limit||!Number.isInteger(s.breakMs)||s.breakMs<0||s.breakMs>limit||(s.repeat&&s.breakMs<60000))throw Error('Çalışma 1 dakika–8 saat olmalı. Tekrarlı modda en az 1 dakika mola seç.');
  return s;
 }
 function create(settings,now,id){return {version:1,id,settings:validate(settings),phase:'work',status:'running',cycle:1,deadline:now+Number(settings.workMs),activeSince:now,remainingMs:Number(settings.workMs),segments:[],sequence:0,events:[]};}
 function record(s,end){
  if(s.phase==='work'&&s.activeSince!=null&&end>s.activeSince){
   s.segments.push({id:s.id+':'+(++s.sequence),session_id:s.id,started_at:new Date(s.activeSince).toISOString(),ended_at:new Date(end).toISOString(),week_id:s.settings.task?.weekId||s.settings.contextWeekId||null,quest_id:s.settings.task?.questId||null});
  }
  s.activeSince=null;
 }
 function advance(s,at){s.phase=s.phase==='work'?'break':'work';if(s.phase==='work')s.cycle++;s.status='running';s.remainingMs=s.phase==='work'?s.settings.workMs:s.settings.breakMs;s.deadline=at+s.remainingMs;s.activeSince=s.phase==='work'?at:null;}
 function tick(state,now){
  if(!state)return null;const s=copy(state);let guard=0;
  while(s.status==='running'&&now>=s.deadline&&guard++<10000){
   record(s,s.deadline);s.events.push(s.phase==='work'?'work-ended':'break-ended');s.remainingMs=0;
   if(!s.settings.repeat){s.status='completed';s.events.push('finished');break;}
   if(!s.settings.auto){s.status='waiting';break;}
   advance(s,s.deadline);
  }
  if(guard>=10000){s.status='waiting';s.remainingMs=0;}
  s.events=s.events.slice(-8);return s;
 }
 function act(state,action,now){
  let s=tick(state,now);if(!s)return null;
  if(action==='pause'&&s.status==='running'){record(s,now);s.remainingMs=Math.max(0,s.deadline-now);s.status='paused';}
  else if(action==='resume'&&s.status==='paused'){s.deadline=now+s.remainingMs;s.activeSince=s.phase==='work'?now:null;s.status='running';}
  else if(action==='next'&&s.status==='waiting')advance(s,now);
  else if(action==='skip'&&['running','paused','waiting'].includes(s.status)){
   if(s.status==='running')record(s,now);
   if(!s.settings.repeat){s.status='completed';s.remainingMs=0;s.events.push('finished');}else advance(s,now);
  }else if(action==='finish'&&!['completed','ended'].includes(s.status)){if(s.status==='running')record(s,now);s.status='ended';s.remainingMs=0;s.events.push('finished');}
  return s;
 }
 function remaining(s,now){return s?.status==='running'?Math.max(0,s.deadline-now):s?.remainingMs||0;}
 function dayKey(value){const d=new Date(value);return Number.isFinite(+d)?new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'';}
 function summary(segments,history,day){
  const from=Date.parse(day+'T00:00:00+03:00'),to=from+86400000,byLesson={};let totalMs=0;
  const spans=new Set();for(const s of segments){if(spans.has(s.id))continue;spans.add(s.id);const ms=Math.max(0,Math.min(Date.parse(s.ended_at),to)-Math.max(Date.parse(s.started_at),from));if(!Number.isFinite(ms)||!ms)continue;const name=s.category_name||'Serbest Çalışma';byLesson[name]=(byLesson[name]||0)+ms;totalMs+=ms;}
  const seen=new Set();for(const h of history||[])if(dayKey(h.completedAt)===day)seen.add(h.id||h.questId+'|'+h.completedAt);
  return {totalMs,completed:seen.size,byLesson,top:Object.entries(byLesson).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'};
 }
 const api={validate,create,tick,act,remaining,summary,dayKey};if(typeof module!=='undefined')module.exports=api;else root.DersFocusCore=api;
})(typeof window==='undefined'?globalThis:window);
