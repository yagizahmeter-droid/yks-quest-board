(() => {
 const core=window.DersFocusCore,board=window.DersBoard;
 let owner=null,session=null,queue=[],data={segments:[],reviews:[],teachers:[],notifications:[],preferences:{program:true,feedback:true,question:true,review:true}},syncing=null,loaded=false,status='',audio=null;
 const key=()=> 'ders-learning.v113:'+owner;
 const emit=()=>document.dispatchEvent(new CustomEvent('ders:study'));
 function persist(){if(!owner)return;localStorage.setItem(key(),JSON.stringify({session,queue,segments:data.segments}));}
 async function rpc(action,payload={}){
  const uid=board.user?.id;if(!uid||!navigator.onLine)throw Error('Giriş ve internet bağlantısı gerekli.');
  const r=await board.client.rpc('ders_learning',{p_action:action,p_payload:{...payload,request_user_id:uid}});
  if(uid!==board.user?.id)throw Error('Oturum değişti.');if(r.error)throw Error(r.error.message||'Çalışma verileri yüklenemedi.');return r.data;
 }
 function own(){
  const uid=board.user?.id||null;if(uid===owner)return;
  if(owner&&session&&session.status==='running')try{commit(core.act(session,'pause',Date.now()));}catch(e){board.toast(e.message);}
  owner=uid;session=null;queue=[];loaded=false;status='';data={segments:[],reviews:[],teachers:[],notifications:[],preferences:{program:true,feedback:true,question:true,review:true}};
  if(uid)try{const saved=JSON.parse(localStorage.getItem(key())||'{}');session=saved.session||null;queue=saved.queue||[];data.segments=saved.segments||[];}catch{status='Cihazdaki odak kaydı okunamadı; depolama kaydı korunuyor.';}
  emit();if(uid)refresh();
 }
 function commit(next){
  const previous={session,queue};
  const ids=new Set([...data.segments,...queue].map(s=>s.id));const pending=(next?.segments||[]).filter(s=>!ids.has(s.id)).map(s=>({...s,duration_ms:Date.parse(s.ended_at)-Date.parse(s.started_at),category_name:next.settings.task?.categoryName||'Serbest Çalışma'}));
  session=next;queue=[...queue,...pending];
  try{persist();}catch{session=previous.session;queue=previous.queue;throw Error('Oturum cihazda kaydedilemedi. Depolama alanını kontrol et.');}
  if(pending.length)flush();
 }
 function sound(event){
  if(!session?.settings.sound||!audio)return;
  try{if(audio.state!=='running')return;const frequencies=event==='work-ended'?[660,880]:event==='break-ended'?[440,660]:[880,660,440];frequencies.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.17;o.type=session.settings.tone==='soft'?'sine':'triangle';o.frequency.value=f;g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.16);});}catch{}
 }
 function unlock(){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}}
 function tick(){
  own();if(!session)return;
  const next=core.tick(session,Date.now());
  if(JSON.stringify(next)!==JSON.stringify(session)){const events=next.events;next.events=[];try{commit(next);if(events.length)sound(events.at(-1));}catch(e){status=e.message;session=core.act(session,'pause',Date.now());} }
  emit();
 }
 async function refresh(){
  const uid=owner;if(!uid||!navigator.onLine)return;
  try{const incoming=await rpc('overview');if(uid!==owner)return;data=incoming;loaded=true;status='';persist();emit();await flush();}catch(e){if(uid===owner){status=e.message;emit();}}
 }
 async function flush(){
  if(syncing||!owner||board.user?.id!==owner||!queue.length||!navigator.onLine)return syncing;
  const uid=owner,batch=queue.slice(0,100);
  syncing=(async()=>{try{await rpc('save_segments',{segments:batch});if(uid!==owner)return;const ids=new Set(batch.map(s=>s.id));queue=queue.filter(s=>!ids.has(s.id));const existing=new Set(data.segments.map(s=>s.id));data.segments.push(...batch.filter(s=>!existing.has(s.id)));status='';persist();emit();}catch(e){if(uid===owner){status='Süreler cihazda korunuyor: '+e.message;emit();}}finally{syncing=null;}})();
  return syncing;
 }
 const api={rpc,refresh,flush,get soundReady(){return audio?.state==='running';},get session(){return session;},get data(){return data;},get loaded(){return loaded;},get status(){return status;},get pending(){return queue.length;},
  segments(){const m=new Map();for(const s of [...data.segments,...queue])m.set(s.id,s);return [...m.values()];},
  start(settings){own();if(!owner)throw Error('Önce hesabına giriş yap.');if(session&&!['ended','completed'].includes(session.status))throw Error('Önce açık oturumu bitir.');unlock();const next=core.create(settings,Date.now(),crypto.randomUUID());commit(next);emit();},
  act(action){unlock();const next=core.act(session,action,Date.now());const events=next?.events||[];if(next)next.events=[];commit(next);if(events.length)sound(events.at(-1));emit();},
  setSound(value,tone){if(session){commit({...session,settings:{...session.settings,sound:value,tone}});emit();}unlock();}
 };
 window.DersStudy=api;setInterval(tick,500);setInterval(()=>{if(!document.hidden)refresh();},30000);
 window.addEventListener('online',()=>{flush();refresh();});document.addEventListener('visibilitychange',()=>{tick();if(!document.hidden)refresh();});
 window.addEventListener('storage',e=>{if(e.key===key()){try{const saved=JSON.parse(e.newValue||'{}');session=saved.session||null;queue=saved.queue||[];data.segments=saved.segments||data.segments;tick();}catch{}}});
 document.addEventListener('ders:render',own);own();
})();
