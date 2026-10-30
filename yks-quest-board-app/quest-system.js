(function(root){
  const key=id=>'ders-repeat-pending.v1:'+id;
  let draining=false,clockOffset=0,lastDay='';const recentClicks=new Map();
  const repeatKinds=Object.freeze([{value:'none',label:'Tek Sefer'},{value:'weekly',label:'Haftalık Tekrar'},{value:'daily',label:'Günlük Görev'}]);
  function repeatSettings({kind,target,startDate,endDate}){
    const fail=(message,field)=>{const error=new Error(message);error.field=field;throw error;};
    if(!repeatKinds.some(option=>option.value===kind))fail('Geçerli bir tekrar türü seç.','kind');
    if(kind==='none')return {kind,target:1};
    if(kind==='weekly'){
      target=Number(target);if(!Number.isInteger(target)||target<1||target>100)fail('Haftalık tekrar hedefi 1–100 arasında tam sayı olmalı.','target');
      return {kind,target};
    }
    const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
    if(!valid(startDate))fail('Geçerli bir başlangıç tarihi seç.','startDate');
    if(!valid(endDate)||endDate<startDate)fail('Bitiş tarihi başlangıçtan önce olamaz.','endDate');
    target=Math.round((Date.parse(endDate+'T12:00:00Z')-Date.parse(startDate+'T12:00:00Z'))/86400000)+1;
    if(target>31)fail('Günlük görev aralığı en fazla 31 gün olabilir.','endDate');
    return {kind,target,startDate,endDate};
  }
  function timestamp(){return new Date(Date.now()+clockOffset).toISOString();}
  function today(at=Date.now()+clockOffset){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));}
  function recurring(q){return ['weekly','daily'].includes(q?.repeat?.kind)&&Number.isInteger(Number(q.repeat.target))&&Number(q.repeat.target)>0;}
  function isDone(q){return recurring(q)?(q.lockedForStudent?completions(q):normalize(q).completions).length>=Number(q.repeat.target):Boolean(q?.done);}
  function active(q){return !q.archived;}
  function completions(q){const seen=new Set();return (q.completions||[]).filter(e=>{if(!e.id||seen.has(e.id))return false;seen.add(e.id);return true;});}
  function earned(q){return recurring(q)&&q.lockedForStudent?completions(q).reduce((n,e)=>n+Number(e.xp||0),0):isDone(q)?Number(q.xp||0):0;}
  function possible(q){const p=progress(q);return recurring(q)&&q.lockedForStudent?earned(q)+(p.target-p.count)*q.xp:Number(q.xp||0);}
  function normalize(q){
    if(!recurring(q)||q.lockedForStudent)return q;
    const dates=new Set();
    const events=completions(q).sort((a,b)=>String(a.completedAt||'').localeCompare(String(b.completedAt||''))||a.id.localeCompare(b.id)).filter(e=>q.repeat.kind!=='daily'||e.date&&!dates.has(e.date)&&dates.add(e.date)).slice(0,Number(q.repeat.target));
    return {...q,completions:events,done:events.length>=Number(q.repeat.target),completionId:events.length>=Number(q.repeat.target)?events.at(-1)?.historyId||q.completionId:null};
  }
  function queue(id=root.DersBoard?.user?.id){if(!id)return [];try{const value=JSON.parse(localStorage.getItem(key(id)));return Array.isArray(value)?value:[];}catch{return [];}}
  function save(id,items){localStorage.setItem(key(id),JSON.stringify(items));}
  function progress(q){
    if(!recurring(q))return {count:q.done?1:0,target:1,blocked:Boolean(q.done)};
    const target=Number(q.repeat.target),events=q.lockedForStudent?completions(q):normalize(q).completions,day=today();
    const pending=queue().filter(o=>o.quest_id===q.assignedQuestId);
    const daily=q.repeat.kind==='daily',todayDone=events.some(e=>e.date===day);
    const pendingToday=pending.some(o=>!daily||o.expected_date===day);
    const outside=daily&&(day<q.repeat.startDate||day>q.repeat.endDate);
    return {count:events.length,target,pending:pending.length,daily,todayDone,outside,
      blocked:Boolean(q.archived)||events.length>=target||outside||(daily?(todayDone||pendingToday):pending.length>0)};
  }
  function describe(q){const p=progress(q);if(!recurring(q))return q.done?'Tamamlandı':'Bekliyor';
    if(q.archived)return `${p.count}/${p.target} · Atama kaldırıldı`;
    if(isDone(q))return `${p.count}/${p.target} — Tamamlandı`;
    if(p.outside)return `${p.count}/${p.target} · Bu tarih aralığında aktif değil`;
    if(p.todayDone)return `${p.count}/${p.target} · Bugün tamamlandı! Yarın tekrar gel.`;
    return `${p.count}/${p.target}${p.pending?' · '+p.pending+' onay bekliyor':''} · ${p.daily?'Günlük':'Haftalık tekrar'}`;
  }
  function render(){root.DersBoard?.render();}
  async function drain(){
    const b=root.DersBoard,id=b?.user?.id;if(draining||!id||!navigator.onLine||!queue(id).length)return;
    draining=true;
    try{
      await b.flush();
      for(const op of queue(id)){
        if(root.DersBoard.user?.id!==id||!navigator.onLine)break;
        const {data,error}=await b.client.rpc('ders_action',{p_action:'complete_repeat',p_payload:op});
        if(root.DersBoard.user?.id!==id)break;
        if(error)throw error;if(data?.error)throw new Error(data.error);
        if(!['completed','already_completed','expired','outside_window','target_reached','archived'].includes(data?.status))throw new Error('Görev sonucu doğrulanamadı.');
        await b.flush();
        if(root.DersBoard.user?.id!==id||!navigator.onLine)break;
        // Keep the same idempotency key until the canonical board has been received.
        save(id,queue(id).filter(item=>item.request_id!==op.request_id));
        if(data.status==='completed'&&!data.duplicate)b.toast(`+${data.xp} XP kazandın`);
        else if(data.status==='expired')b.toast('Bekleyen günlük görev geçmiş güne ait; güvenli olarak onaylanamadı.');
        else if(data.status!=='completed')b.toast(data.status==='already_completed'?'Bugün zaten tamamlandı.':'Görev şu anda tamamlanamaz.');
      }
    }catch(error){if(root.DersBoard.user?.id===id)b.toast(error.message||'Görev onayı bekliyor. İnternet bağlantını kontrol et.');}
    finally{draining=false;render();}
  }
  function complete(q){const id=root.DersBoard?.user?.id;if(!id||!recurring(q)||progress(q).blocked)return;
    const stamp=performance.now(),clickKey=id+':'+q.id;if(stamp-(recentClicks.get(clickKey)||-Infinity)<400)return;recentClicks.set(clickKey,stamp);
    if(!q.lockedForStudent){root.DersBoard.completePersonalRepeat(q.id);return;}
    const op={quest_id:q.assignedQuestId,request_id:crypto.randomUUID()};
    if(q.repeat.kind==='daily')op.expected_date=today();
    try { save(id,[...queue(id),op]);render();drain(); }
    catch { root.DersBoard.toast('Görev kaydı bu cihazda saklanamadı. Depolama alanını kontrol et.'); }
  }
  async function archiveWeek(week){
    const b=root.DersBoard;if(!b?.user||!navigator.onLine)throw new Error('Haftayı güvenli arşivlemek için giriş ve internet bağlantısı gerekli.');
    await b.flush();const {data,error}=await b.client.rpc('ders_action',{p_action:'archive_week',p_payload:{week_id:week.id}});
    if(error)throw error;if(data?.error)throw new Error(data.error);await b.flush();
  }
  function setServerTime(value){const n=Date.parse(value);if(Number.isFinite(n))clockOffset=n-Date.now();}
  root.DersQuests={repeatKinds,repeatSettings,timestamp,today,recurring,isDone,active,completions,earned,possible,normalize,progress,describe,complete,drain,archiveWeek,setServerTime};
  if(typeof module!=='undefined')module.exports=root.DersQuests;
  if(typeof window!=='undefined'){
    window.addEventListener('online',drain);
    setInterval(()=>{const day=today();if(lastDay&&lastDay!==day)render();lastDay=day;drain();},15000);
    document.addEventListener('DOMContentLoaded',render,{once:true});
  }
})(typeof window==='undefined'?globalThis:window);
