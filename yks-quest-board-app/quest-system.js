(function(root){
  const key=id=>'ders-repeat-pending.v1:'+id;
  let draining=false,clockOffset=0,lastDay='';const recentClicks=new Map();
  function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+clockOffset));}
  function recurring(q){return q?.lockedForStudent&&['weekly','daily'].includes(q.repeat?.kind);}
  function completions(q){const seen=new Set();return (q.completions||[]).filter(e=>{if(!e.id||seen.has(e.id))return false;seen.add(e.id);return true;});}
  function earned(q){return recurring(q)?completions(q).reduce((n,e)=>n+Number(e.xp||0),0):q.done?Number(q.xp||0):0;}
  function queue(id=root.DersBoard?.user?.id){if(!id)return [];try{const value=JSON.parse(localStorage.getItem(key(id)));return Array.isArray(value)?value:[];}catch{return [];}}
  function save(id,items){localStorage.setItem(key(id),JSON.stringify(items));}
  function progress(q){
    if(!recurring(q))return {count:q.done?1:0,target:1,blocked:Boolean(q.done)};
    const target=Number(q.repeat.target),events=completions(q),day=today();
    const pending=queue().filter(o=>o.quest_id===q.assignedQuestId);
    const daily=q.repeat.kind==='daily',todayDone=events.some(e=>e.date===day);
    const pendingToday=pending.some(o=>!daily||o.expected_date===day);
    const outside=daily&&(day<q.repeat.startDate||day>q.repeat.endDate);
    return {count:events.length,target,pending:pending.length,daily,todayDone,outside,
      blocked:outside||(daily?(todayDone||pendingToday):pending.length>0||events.length>=target)};
  }
  function describe(q){const p=progress(q);if(!recurring(q))return q.done?'Tamamlandı':'Bekliyor';
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
  root.DersQuests={today,recurring,completions,earned,progress,describe,complete,drain,archiveWeek,setServerTime};
  if(typeof module!=='undefined')module.exports=root.DersQuests;
  if(typeof window!=='undefined'){
    window.addEventListener('online',drain);
    setInterval(()=>{const day=today();if(lastDay&&lastDay!==day)render();lastDay=day;drain();},15000);
    document.addEventListener('DOMContentLoaded',render,{once:true});
  }
})(typeof window==='undefined'?globalThis:window);
