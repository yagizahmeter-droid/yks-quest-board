(() => {
 'use strict';
 // Presentation only. Canonical board acknowledgements, never optimistic XP, drive rewards.
 const PREF='ders-motion.preferences.v1', $=id=>document.getElementById(id);
 const defaults={animations:true,haptics:true,confetti:true};
 let prefs={...defaults},owner=null,lastTotal=null,lastBuzz=-Infinity,gesture=-Infinity;
 const media=matchMedia('(prefers-reduced-motion: reduce)'), supported=typeof navigator.vibrate==='function';
 const animations=new Set(), jobs=new Map(),numbers=new Map(),charts=new Map(),classStates=new Map(),contributions=new Map(),particles=new Set(),timers=new Set(),observers=new Set();
 let tabId,ledger,routeAnimation,boardAnimation,boardKeys=null;
 try {prefs={...defaults,...JSON.parse(localStorage.getItem(PREF)||'{}')};}catch{}
 for(const key of Object.keys(defaults))if(typeof prefs[key]!=='boolean')prefs[key]=defaults[key];
 try {tabId=sessionStorage.getItem('ders-motion.tab')||crypto.randomUUID();sessionStorage.setItem('ders-motion.tab',tabId);}catch{tabId=crypto.randomUUID();}
 let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error('Storage unavailable');}};}
 ledger=window.DersMotionLedger.create({storage,tabId});
 const enabled=()=>prefs.animations&&!media.matches&&!document.hidden;
 const delay=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
 const bounded=(map,key,value)=>{if(map.size>=256&&!map.has(key))map.delete(map.keys().next().value);map.set(key,value);};
 function animate(el,frames,options={}){
  if(!el?.isConnected||!enabled()||typeof el.animate!=='function')return null;
  const a=el.animate(frames,{duration:240,easing:'cubic-bezier(.2,.7,.2,1)',...options});animations.add(a);
  a.finished.then(()=>{animations.delete(a);a.cancel();},()=>animations.delete(a));return a;
 }
 function stop(){
  for(const a of animations)a.cancel();animations.clear();
  for(const job of jobs.values()){cancelAnimationFrame(job.frame);job.finish();}jobs.clear();
  for(const id of timers)clearTimeout(id);timers.clear();
  for(const el of particles)el.remove();particles.clear();
  for(const observer of observers)observer.disconnect();observers.clear();
  const fill=$('levelXpFill');if(fill&&fill.dataset.target){fill.style.transition='';fill.style.width=fill.dataset.target;}const level=$('level');if(level?.dataset.finalText)level.textContent=level.dataset.finalText;
 }
 function own(){const id=window.DersBoard?.user?.id||null;if(id===owner)return;stop();owner=id;ledger.setOwner(id);lastTotal=null;numbers.clear();charts.clear();classStates.clear();contributions.clear();boardKeys=null;}
 function pulse(el,complete=false){
  if(!el)return;animate(el,[{outline:'2px solid transparent',outlineOffset:'0px'},{outline:'2px solid var(--accent)',outlineOffset:'3px'},{outline:'2px solid transparent',outlineOffset:'0px'}],{duration:complete?620:360});
 }
 function vibrate(kind,allowTimer=false){
  if(!supported||!prefs.haptics||document.hidden||!navigator.userActivation?.hasBeenActive)return false;
  const now=performance.now();if(now-lastBuzz<250||(!allowTimer&&now-gesture>30000))return false;
  const pattern={task:15,repeat:10,level:[20,60,30],shared:[25,70,25],error:20,focus:30}[kind];if(!pattern)return false;
  try{const result=navigator.vibrate(pattern);lastBuzz=now;return result!==false;}catch{return false;}
 }
 function number(el,value,{key,format=n=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(n)}={}){
  value=Number(value);if(!el||!Number.isFinite(value))return;
  key ||= el.id;if(!key){el.textContent=format(value);return;}
  const old=numbers.get(key);bounded(numbers,key,value);
  el.setAttribute('aria-label',format(value));
  const prior=jobs.get(key);if(prior){cancelAnimationFrame(prior.frame);prior.finish();jobs.delete(key);}
  const finish=()=>{if(el.isConnected)el.textContent=format(value);};
  if(old===undefined||old===value||!enabled()){finish();return;}
  // The accessible value is final; intermediate frames are purely visual, not live announcements.
  el.setAttribute('aria-label',format(value));const start=performance.now(),job={frame:0,finish};
  const tick=now=>{if(!el.isConnected||!enabled()){finish();jobs.delete(key);return;}const t=Math.min(1,(now-start)/320);el.textContent=format(old+(value-old)*(1-(1-t)**3));if(t<1)job.frame=requestAnimationFrame(tick);else{finish();jobs.delete(key);}};
  jobs.set(key,job);job.frame=requestAnimationFrame(tick);
 }
 function progressValue(el,from,to,key){
  if(!el||!enabled()||from===to)return;
  const previous=jobs.get(key);if(previous){cancelAnimationFrame(previous.frame);previous.finish();}
  const start=performance.now(),job={frame:0,finish:()=>{el.value=to;}};
  const tick=now=>{if(!el.isConnected||!enabled()){job.finish();jobs.delete(key);return;}const t=Math.min(1,(now-start)/320);el.value=from+(to-from)*(1-(1-t)**3);if(t<1)job.frame=requestAnimationFrame(tick);else{job.finish();jobs.delete(key);}};
  jobs.set(key,job);job.frame=requestAnimationFrame(tick);
 }
 function account(xp){
  own();if(!xp)return;
  number($('totalXp'),xp.total,{key:'general',format:n=>Math.round(n).toLocaleString('tr-TR')+' XP'});
  number($('competitiveXp'),xp.competitive,{key:'competitive',format:n=>Math.round(n).toLocaleString('tr-TR')});
  number($('personalXp'),xp.personal,{key:'personal',format:n=>Math.round(n).toLocaleString('tr-TR')});
  const total=Number(xp.total)||0,level=Math.floor(total/500)+1,ratio=total%500/5,fill=$('levelXpFill');
  if($('level')){$('level').textContent='Level '+level;$('level').dataset.finalText='Level '+level;}
  if(fill){fill.dataset.target=ratio+'%';fill.style.width=((lastTotal!==null&&total>lastTotal&&ledger.pending().length)?lastTotal%500/5:ratio)+'%';fill.parentElement.setAttribute('aria-valuenow',String(total%500));}
  if($('levelXpCaption'))$('levelXpCaption').textContent=(total%500)+' / 500 XP';
 }
 function confetti(){
  if(!enabled()||!prefs.confetti||document.querySelector('.motion-confetti'))return;
  const host=document.createElement('div');host.className='motion-confetti';host.setAttribute('aria-hidden','true');document.body.append(host);particles.add(host);
  for(let i=0;i<16;i++){const p=document.createElement('i');p.style.setProperty('--x',((i-7.5)*19)+'px');p.style.setProperty('--r',(i%2?180:-150)+'deg');p.style.left=(40+i%5*5)+'%';host.append(p);}
  delay(()=>{particles.delete(host);host.remove();},950);
 }
 function xpFloat(value,el){
  if(!(value>0)||!enabled())return;const r=el?.getBoundingClientRect(),pop=document.createElement('span');pop.className='motion-xp';pop.textContent='+'+value.toLocaleString('tr-TR')+' XP';pop.setAttribute('aria-hidden','true');
  if(r&&r.width&&r.bottom>0&&r.top<innerHeight){pop.style.left=Math.min(innerWidth-100,Math.max(12,r.right-100))+'px';pop.style.top=Math.max(20,r.top)+'px';}
  document.body.append(pop);particles.add(pop);delay(()=>{particles.delete(pop);pop.remove();},850);
 }
 const questElement=id=>[...document.querySelectorAll('[data-motion-quest]')].find(el=>el.dataset.motionQuest===id);
 function success(intent,q,xp,week,total){
  const el=questElement(q.id),done=window.DersQuests.isDone(q);
  pulse(el,done);
  if(done){animate(el?.querySelector('.check'),[{transform:'scale(1)'},{transform:'scale(.82)'},{transform:'scale(1)'}],{duration:260});animate(el?.querySelector('.motion-tick'),[{strokeDashoffset:24},{strokeDashoffset:0}],{duration:280});}
  else {const count=window.DersQuests.progress(q).count,progress=el?.querySelector('.repeat-meter-fill'),key='repeat:'+q.id;numbers.set(key,Number(intent.beforeCount));number(el?.querySelector('.motion-repeat-count'),count,{key,format:n=>String(Math.round(n))});if(progress&&enabled()){progress.style.width=(Number(intent.beforeCount)/intent.target*100)+'%';requestAnimationFrame(()=>{progress.style.width=(count/intent.target*100)+'%';});}}
  xpFloat(xp,el);
  const previous=lastTotal??Number(intent.beforeTotalXp),leveled=xp>0&&Number.isFinite(previous)&&Math.floor(total/500)>Math.floor(previous/500);
  if(leveled){
   const fill=$('levelXpFill'),target=fill?.dataset.target;
   if(fill&&enabled()){if($('level'))$('level').textContent='Level '+(Math.floor(previous/500)+1);fill.style.width='100%';delay(()=>{if($('level'))$('level').textContent=$('level').dataset.finalText;fill.style.transition='none';fill.style.width='0%';requestAnimationFrame(()=>{fill.style.transition='';fill.style.width=target;});},280);}
   animate($('level'),[{transform:'scale(1)',opacity:1},{transform:'scale(1.07)',opacity:.7},{transform:'scale(1)',opacity:1}],{duration:760});pulse($('level')?.closest('.stat-metric'),true);confetti();
  }
  const active=(week?.quests||[]).filter(window.DersQuests.active);
  if(done&&active.length&&active.every(window.DersQuests.isDone)&&ledger.once('week:'+week.id+':'+intent.id))confetti();
  lastTotal=total;
  document.dispatchEvent(new CustomEvent('ders:motion-success',{detail:{id:intent.id,questId:q.id,complete:done,xp,leveled}}));
  return leveled?'level':done?'task':'repeat';
 }
 function expectCompletion(intent){own();if(!owner)return false;return ledger.expect({...intent,id:'history:'+intent.historyId});}
 function expectTeacher(intent){own();if(!owner)return false;return ledger.expect({...intent,id:'repeat:'+intent.requestId});}
 function confirmed({userId,state,xpBreakdown}){
  own();if(!owner||owner!==userId||!state||!xpBreakdown)return;
  const total=Number(xpBreakdown.total)||0,feedback=[];
  for(const intent of ledger.pending()){
   if(!intent.historyId)continue;
   const h=(state.studyHistory||[]).find(h=>h.id===intent.historyId&&h.questId===intent.questId&&h.weekId===intent.weekId);
   const week=state.weeks?.find(w=>w.id===intent.weekId),q=week?.quests?.find(q=>q.id===intent.questId);
   if(!h||!q||q.archived||!ledger.once(intent.id))continue;
   feedback.push(success(intent,q,Math.max(0,Number(h.xp)||0),week,total));
  }
  if(feedback.length)vibrate(feedback.includes('level')?'level':feedback.includes('task')?'task':'repeat');
  lastTotal=total;
 }
 function repeatConfirmed(op,result){
  own();const intent=ledger.pending().find(i=>i.requestId===op.request_id);if(!intent)return;
  if(result?.status!=='completed'){ledger.forget(intent.id);return;}
  const b=window.DersBoard,week=b.state.weeks.find(w=>w.id===intent.weekId),q=week?.quests.find(q=>q.id===intent.questId);
  if(!q||q.assignedQuestId!==op.quest_id||window.DersQuests.progress(q).count<=Number(intent.beforeCount)||!ledger.once(intent.id))return;
  // RPC success proves this request_id; the subsequent canonical flush proves its board projection.
  const total=Number(b.verifiedXp?.total)||0,previous=lastTotal;lastTotal=Number(intent.beforeTotalXp);
  vibrate(success(intent,q,Math.max(0,Number(result.xp)||0),week,total));lastTotal=Number.isFinite(total)?total:previous;
 }
 function capture(host,selector,attr){return [...host.querySelectorAll(selector)].map(el=>({id:el.getAttribute(attr),rect:el.getBoundingClientRect()}));}
 function reorder(before,host,selector,attr){
  if(!before?.length||!enabled())return;const after=capture(host,selector,attr);if(before.length!==after.length||before.some(x=>!after.some(y=>y.id===x.id))||before.every((x,i)=>x.id===after[i].id))return;
  for(const el of host.querySelectorAll(selector)){const r=before.find(x=>x.id===el.getAttribute(attr))?.rect,n=el.getBoundingClientRect();if(r&&(r.y!==n.y||r.x!==n.x))animate(el,[{transform:`translate(${r.x-n.x}px,${r.y-n.y}px)`},{transform:'none'}],{duration:300});}
 }
 function chart(host,{key,fingerprint}){
  if(!host||charts.get(key)===fingerprint)return;
  const show=()=>{if(!host.isConnected)return;bounded(charts,key,fingerprint);if(!enabled())return;
   host.querySelectorAll('polyline').forEach(line=>{if(line.classList.contains('partial')){animate(line,[{opacity:.2},{opacity:1}],{duration:380});return;}let len;try{len=line.getTotalLength();}catch{}if(len)animate(line,[{strokeDasharray:len+' '+len,strokeDashoffset:len},{strokeDasharray:len+' '+len,strokeDashoffset:0}],{duration:420});});
   host.querySelectorAll('circle').forEach((dot,i)=>animate(dot,[{opacity:0},{opacity:1}],{duration:180,delay:Math.min(i,10)*20}));
  };
  if(host.getBoundingClientRect().width&&host.getBoundingClientRect().top<innerHeight&&host.getBoundingClientRect().bottom>0)show();
  else if(typeof IntersectionObserver==='function'){if(observers.size>=32){const first=observers.values().next().value;first.disconnect();observers.delete(first);}const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();observers.delete(observer);show();}else if(!host.isConnected){observer.disconnect();observers.delete(observer);}});observers.add(observer);observer.observe(host);delay(()=>{observer.disconnect();observers.delete(observer);},30000);}
 }
 function actionConfirmed(kind,action,payload,result){
  own();if(kind!=='class'||!owner||result?.ok!==true||!payload.request_id||!ledger.once('class-action:'+payload.request_id))return;
  if(action==='send_program'){pulse($('classContent'));return;}
  if(['contribute_questions','contribute_segments','correct_contribution'].includes(action))bounded(contributions,payload.class_id,{id:payload.request_id,taskId:payload.task_id});
 }
 function classState(detail){
  own();if(!owner||!detail?.class?.id)return;const cid=detail.class.id,prev=classStates.get(cid),pending=contributions.get(cid),ownXp=detail.leaderboard?.find(r=>r.own)?.xp;
  const host=$('classesPage');if(!host)return;
  if(Number.isFinite(Number(ownXp)))host.querySelectorAll('[data-motion-class-xp]').forEach(el=>number(el,ownXp,{key:'class:'+cid}));
  for(const task of detail.shared_tasks||[]){
   const old=prev?.find(t=>t.id===task.id),el=[...host.querySelectorAll('[data-motion-shared]')].find(el=>el.dataset.motionShared===task.id);
   if(old&&Number(task.total)!==old.total){const bar=el?.querySelector('progress');if(bar&&task.target)progressValue(bar,Math.min(old.total,task.target),Math.min(Number(task.total),task.target),'shared-progress:'+cid+':'+task.id);}
   if(pending&&(!pending.taskId||pending.taskId===task.id))pulse(el?.querySelector('[data-motion-contribution]'));
   if(old&&!old.settled&&task.status==='completed'&&task.settled_at&&ledger.once('class-settled:'+cid+':'+task.id+':'+task.settled_at)){pulse(el,true);confetti();vibrate('shared');}
  }
  bounded(classStates,cid,(detail.shared_tasks||[]).map(t=>({id:t.id,total:Number(t.total),settled:!!t.settled_at})));contributions.delete(cid);
 }
 function focusEvent(session,events){
  own();if(!owner||!session||!events?.length||session.status==='ended')return;
  const completed=events.includes('finished')&&session.status==='completed';if(!completed&&!events.includes('work-ended')&&!events.includes('break-ended'))return;
  const id='focus:'+session.id+':'+session.sequence+':'+session.cycle+':'+session.phase+':'+session.status;
  if(!ledger.once(id))return;pulse($('focusDial'),true);if(completed)animate($('focusClock'),[{opacity:.6},{opacity:1}],{duration:400});vibrate('focus',true);
 }
 function feedback(kind,{id,element}={}){own();if(kind==='error'&&id&&ledger.once('error:'+id)){pulse(element);vibrate('error');}}
 function render(){
  own();const els=[...document.querySelectorAll('[data-motion-quest]')],keys=(window.DersBoard?.state?.weeks||[]).flatMap(w=>(w.quests||[]).map(q=>q.id)),week=window.DersBoard?.week()?.id;
  if(boardKeys?.week===week)for(const el of els)if(!boardKeys.keys.includes(el.dataset.motionQuest))animate(el,[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'none'}]);
  boardKeys={week,keys};
 }
 function transition(element){boardAnimation?.cancel();boardAnimation=animate(element,[{opacity:.45},{opacity:1}],{duration:190});}
 function settings(){
  const dialog=$('appearanceDialog');if(!dialog||$('motionSettings'))return;
  const box=document.createElement('fieldset');box.id='motionSettings';box.className='appearance-field motion-settings';box.dataset.autoSave='';
  box.innerHTML='<legend>Etkileşim Efektleri</legend>'+[['animations','Animasyonlar'],['haptics','Dokunsal Geri Bildirim'],['confetti','Konfeti Efektleri']].map(([key,label])=>`<label><span>${label}</span><input type="checkbox" id="motion-${key}" data-motion-pref="${key}" aria-describedby="motionSupport"></label>`).join('')+'<p id="motionSupport">'+(supported?'Tercihler bu cihazda saklanır. Titreşim cihaz ve tarayıcı desteğine bağlıdır.':'Bu tarayıcı titreşimi desteklemiyor. Görsel geri bildirimler kullanılabilir.')+'</p>';
  dialog.insertBefore(box,dialog.querySelector('.appearance-footer'));box.querySelectorAll('input').forEach(input=>{const key=input.dataset.motionPref;input.checked=prefs[key];input.disabled=key==='haptics'&&!supported;input.onchange=()=>{prefs[key]=input.checked;try{localStorage.setItem(PREF,JSON.stringify(prefs));}catch{}apply();};});
 }
 function apply(){document.documentElement.dataset.motion=enabled()?'on':'off';if(!enabled())stop();if(!prefs.confetti)for(const el of particles)if(el.classList.contains('motion-confetti')){el.remove();particles.delete(el);}}
 const safe=fn=>(...args)=>{try{return fn(...args);}catch{return undefined;}};
 window.DersMotion=Object.fromEntries(Object.entries({expectCompletion,expectTeacher,confirmed,repeatConfirmed,account,capture,reorder,number,chart,classState,actionConfirmed,focusEvent,feedback,transition,cancel:id=>ledger.forget(id)}).map(([key,fn])=>[key,safe(fn)]));
 document.addEventListener('pointerdown',()=>{gesture=performance.now();},{passive:true});document.addEventListener('keydown',()=>{gesture=performance.now();},{passive:true});
 document.addEventListener('ders:render',safe(render));
 document.addEventListener('ders:route',()=>{routeAnimation?.cancel();routeAnimation=animate(document.querySelector('.page-view:not([hidden])'),[{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:210});});
 document.addEventListener('visibilitychange',apply);media.addEventListener?.('change',apply);window.addEventListener('pagehide',stop);
 window.addEventListener('storage',e=>{if(e.key===PREF){try{const value=JSON.parse(e.newValue);for(const key of Object.keys(defaults))if(typeof value?.[key]==='boolean')prefs[key]=value[key];}catch{}for(const input of document.querySelectorAll('[data-motion-pref]'))input.checked=prefs[input.dataset.motionPref];apply();}});
 settings();apply();
})();
