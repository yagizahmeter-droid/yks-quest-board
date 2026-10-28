(() => {
 const board=window.DersBoard,study=window.DersStudy,core=window.DersFocusCore,$=id=>document.getElementById(id),esc=v=>board.escape(String(v??''));
 const views=new Map();let owner=null,busy=false;
 const dialog=document.createElement('dialog');dialog.id='historyCleanupDialog';dialog.className='ders-dialog';document.body.append(dialog);
 const day=core.dayKey,date=d=>new Date(d+'T12:00:00Z').toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul',day:'numeric',month:'short',year:'numeric'});
 const shift=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 const monday=d=>shift(d,-((new Date(d+'T12:00:00Z').getUTCDay()+6)%7));
 const duration=ms=>{const seconds=Math.floor(ms/1000),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);return hours?hours+' sa '+minutes%60+' dk':minutes?minutes+' dk '+seconds%60+' sn':seconds+' sn';};
 async function rpc(action,payload={}){
  const uid=board.user?.id;if(!uid||!navigator.onLine)throw Error('Giriş ve internet bağlantısı gerekli.');
  const r=await board.client.rpc('ders_control',{p_action:action,p_payload:{...payload,request_user_id:uid}});
  if(uid!==board.user?.id)throw Error('Oturum değişti.');if(r.error)throw Error(r.error.message);return r.data;
 }
 function close(force=false){if(!force&&busy)return false;dialog.close();dialog.replaceChildren();window.DersUI.modalClosed('history-cleanup');return true;}
 dialog.oncancel=e=>{e.preventDefault();close();};
 async function cleanup(scope={scope:'week',week_id:board.week().id}){
  if(board.state.profile?.role!=='student')return;
  const uid=board.user?.id;if(!uid)return board.toast('Önce hesabına giriş yap.');
  await study.flush();if(study.pending)throw Error('Önce bekleyen çalışma sürelerini eşitle.');
  const weeks=new Map(board.state.weeks.map(w=>[w.id,board.weekTitle(w)]));for(const h of board.state.studyHistory||[])if(h.weekId&&!weeks.has(h.weekId))weeks.set(h.weekId,h.weekName||'Eski hafta');
  dialog.innerHTML='<header class="modal-head"><h2>Çalışma Geçmişini Temizle</h2><button class="icon-button" type="button" aria-label="Kapat" title="Kapat"><i data-lucide="x"></i></button></header><div class="modal-body"><label class="field">Hafta<select id="cleanupWeek" class="select" data-ui-transient="true">'+[...weeks].map(([id,name])=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join('')+'</select></label><p id="cleanupScope"></p><strong id="cleanupCount" role="status">Kayıt sayısı kontrol ediliyor…</strong><p>Görevler, programlar, tamamlanma durumları ve kazanılmış XP korunur. Seçilen geçmiş kayıtları listelerden ve çalışma özetlerinden kaldırılır.</p><p id="cleanupError" role="alert"></p><div class="signed-in-actions"><button id="confirmCleanup" class="button danger" type="button" disabled><i data-lucide="trash-2"></i>Geçmişten Kaldır</button><button id="cancelCleanup" class="button" type="button">Vazgeç</button></div></div>';
  dialog.querySelector('.modal-head button').onclick=()=>close();$('cancelCleanup').onclick=()=>close();
  const select=$('cleanupWeek');select.value=scope.week_id||board.week().id;select.disabled=scope.scope!=='week';$('cleanupScope').textContent=scope.scope==='quest'?'Seçili görevin çalışma kayıtları':scope.scope==='week'?'Seçili haftanın bütün çalışma kayıtları':'Seçili çalışma kaydı';
  dialog.showModal();window.DersUI.openModal('history-cleanup',dialog,close);window.DersUI.clearDirty(dialog);window.DersSelect?.refresh();window.lucide.createIcons();
  let preview=null,generation=0;
  const count=async()=>{const token=++generation;preview=null;$('confirmCleanup').disabled=true;try{if(scope.scope==='week')scope.week_id=select.value;const result=await rpc('preview_history_delete',scope);if(token!==generation||!dialog.open||uid!==board.user?.id)return;preview=result;$('cleanupCount').textContent=result.count+' kayıt etkilenecek';$('confirmCleanup').disabled=!result.count;$('cleanupError').textContent='';}catch(e){if(dialog.open&&uid===board.user?.id)$('cleanupError').textContent=e.message;}};
  select.onchange=count;$('confirmCleanup').onclick=async()=>{if(busy||!preview)return;busy=true;$('confirmCleanup').disabled=true;try{await rpc('delete_history',{...scope,signature:preview.signature});if(uid!==board.user?.id)return;await study.refresh();await board.flush();board.render();busy=false;close(true);board.toast(preview.count+' geçmiş kaydı kaldırıldı; XP korundu.');}catch(e){if(dialog.open&&uid===board.user?.id){$('cleanupError').textContent=e.message;$('confirmCleanup').disabled=false;}}finally{busy=false;}};
  await count();
 }
 async function archive(action,id){
  const prompt=action==='archive_assignment'?'Bu program ataması kaldırılsın mı? Bekleyen istek iptal edilir; kabul edilmiş hafta arşivlenir. Öğrencinin çalışmaları ve kazanılmış XP korunur.':'Bu görev ataması kaldırılsın mı? Önceki çalışma kayıtları ve kazanılmış XP korunur; görev yeniden tamamlanamaz.';
  if(!confirm(prompt))return false;await rpc(action,action==='archive_assignment'?{assignment_id:id}:{quest_id:id});return true;
 }
 function clipped(s,d){const start=Date.parse(d+'T00:00:00+03:00');return Math.max(0,Math.min(Date.parse(s.ended_at),start+86400000)-Math.max(Date.parse(s.started_at),start));}
 function renderHistory(host,view){
  if(!host.isConnected||view.uid!==board.user?.id||views.get(host)!==view)return;
  const data=view.data,s=data.state||board.state,segments=data.segments||[],records=study.visibleHistory(s.studyHistory,data.hidden_history||[]);
  const starts=[...new Set([monday(day(Date.now())),view.week,...segments.flatMap(s=>[monday(day(s.started_at)),monday(day(s.ended_at))]),...records.map(h=>monday(day(h.completedAt))).filter(Boolean)])].filter(Boolean).sort().reverse();
  const days=Array.from({length:7},(_,i)=>shift(view.week,i)),summaries=days.map(d=>core.summary(segments,records,d)),total=summaries.reduce((n,s)=>n+s.totalMs,0),own=view.sid===view.uid&&board.state.profile?.role==='student';
  host.innerHTML='<div class="section-heading"><h3>Çalışma Oturumları</h3><button class="icon-button" data-calendar-refresh type="button" aria-label="Geçmişi yenile" title="Yenile"><i data-lucide="refresh-cw"></i></button></div><div class="history-calendar-toolbar"><button class="icon-button" type="button" data-week-step="-7" title="Önceki hafta" aria-label="Önceki hafta"><i data-lucide="arrow-left"></i></button><label class="field">Hafta<select class="select" data-calendar-week data-ui-transient="true">'+starts.map(d=>'<option value="'+d+'" '+(d===view.week?'selected':'')+'>'+date(d)+' – '+date(shift(d,6))+'</option>').join('')+'</select></label><button class="icon-button" type="button" data-week-step="7" title="Sonraki hafta" aria-label="Sonraki hafta"><i data-lucide="arrow-right"></i></button></div><p class="history-week-total">Haftalık toplam <strong>'+duration(total)+'</strong></p><div class="history-day-tabs" role="group" aria-label="Haftanın günleri"><button class="button '+(!view.selected?'is-active':'')+'" type="button" data-calendar-day="" aria-pressed="'+!view.selected+'">Tüm Hafta</button>'+days.map((d,i)=>'<button class="button '+(view.selected===d?'is-active':'')+'" type="button" data-calendar-day="'+d+'" aria-pressed="'+(view.selected===d)+'"><span>'+['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'][i]+'</span><small>'+d.slice(8)+'.'+d.slice(5,7)+'</small></button>').join('')+'</div><div class="history-calendar-days">'+days.filter(d=>!view.selected||d===view.selected).map(d=>{
   const summary=summaries[days.indexOf(d)],sessions=segments.filter(s=>clipped(s,d)>0),completed=records.filter(h=>day(h.completedAt)===d);
   return '<section class="history-calendar-day"><div class="daily-heading"><h4>'+date(d)+'</h4><span>'+duration(summary.totalMs)+' · '+summary.completed+' görev</span></div>'+(!sessions.length&&!completed.length?'<p class="sync-status">Bu gün çalışma kaydı yok.</p>':'')+sessions.map(entry=>{
    const w=s.weeks?.find(w=>w.id===entry.week_id),q=w?.quests.find(q=>q.id===entry.quest_id);
    return '<div class="history-session"><div><strong>'+esc(entry.category_name)+'</strong><p>'+esc(q?.title||'Serbest Çalışma')+'</p><small>'+new Date(entry.started_at).toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'})+' · '+esc(w?board.weekTitle(w):'')+'</small>'+(own&&entry.quest_id?'<button class="button history-quest-cleanup" type="button" data-remove-quest-history="'+esc(entry.quest_id)+'" data-week-id="'+esc(entry.week_id||'')+'">Görev Geçmişini Temizle</button>':'')+'</div><strong>'+duration(clipped(entry,d))+'</strong>'+(own?'<button class="icon-button" type="button" data-remove-segment="'+esc(entry.id)+'" data-week-id="'+esc(entry.week_id||'')+'" aria-label="Süre kaydını kaldır" title="Süre kaydını kaldır"><i data-lucide="trash-2"></i></button>':'')+'</div>';
   }).join('')+(view.sid!==view.uid?completed.map(h=>'<div class="history-session"><div><strong>'+esc(h.title)+'</strong><small>'+esc(h.categoryName)+' · Tamamlanan çalışma</small></div></div>').join(''):'')+'</section>';
  }).join('')+'</div>';
  host.querySelector('[data-calendar-week]').onchange=e=>{view.week=e.target.value;view.selected='';renderHistory(host,view);};
  host.querySelector('[data-calendar-refresh]').onclick=()=>history(host,view.sid,true);
  host.onclick=e=>{
   const step=e.target.closest('[data-week-step]');if(step){view.week=shift(view.week,Number(step.dataset.weekStep));view.selected='';renderHistory(host,view);}
   const button=e.target.closest('[data-calendar-day]');if(button){view.selected=button.dataset.calendarDay;renderHistory(host,view);}
   const remove=e.target.closest('[data-remove-segment]');if(remove)cleanup({scope:'segment',record_id:remove.dataset.removeSegment,week_id:remove.dataset.weekId}).catch(e=>board.toast(e.message));
   const quest=e.target.closest('[data-remove-quest-history]');if(quest)cleanup({scope:'quest',quest_id:quest.dataset.removeQuestHistory,week_id:quest.dataset.weekId}).catch(e=>board.toast(e.message));
  };
  window.DersSelect?.refresh();window.DersUI.clearDirty(host);window.lucide.createIcons();
 }
 async function history(host,sid,force=false){
  const uid=board.user?.id;if(!uid)return;const old=views.get(host),view=old?.sid===sid&&old.uid===uid?old:{sid,uid,week:monday(day(Date.now())),selected:''};views.set(host,view);
  if(sid===uid){if(force)await study.refresh();view.data={state:board.state,segments:study.segments(),hidden_history:study.data.hidden_history||[]};renderHistory(host,view);return;}
  host.innerHTML='<p role="status">Çalışma geçmişi yükleniyor…</p>';
  try{view.data=await study.rpc('report',{student_id:sid});renderHistory(host,view);}catch(e){if(host.isConnected&&views.get(host)===view&&uid===board.user?.id)host.textContent=e.message;}
 }
 const clean=document.createElement('button');clean.type='button';clean.id='cleanupWeekHistory';clean.className='button';clean.innerHTML='<i data-lucide="trash-2"></i>Hafta Geçmişini Temizle';clean.onclick=()=>cleanup({scope:'week',week_id:$('historyWeekFilter').value||board.week().id}).catch(e=>board.toast(e.message));$('historyPage').querySelector('.history-filters').after(clean);
 function refresh(){
  const uid=board.user?.id||null;
  if(uid!==owner){owner=uid;close(true);for(const host of views.keys())if(host.isConnected)host.replaceChildren();views.clear();}
  clean.hidden=!uid||board.state.profile?.role!=='student';
  if(window.DersUI.route==='history'&&uid)history($('studyDurationHistory'),uid);
  $('studyDurationHistory').hidden=$('historyList').hidden;
 }
 document.addEventListener('ders:route',refresh);document.addEventListener('ders:study',()=>{refresh();if(window.DersUI.route==='history')board.render();});
 document.addEventListener('ders:render',refresh);
 document.addEventListener('click',e=>{if(e.target.closest('[data-history-view]'))queueMicrotask(refresh);});
 window.DersExperience={rpc,cleanup,archive,history,unmount:host=>views.delete(host),monday,shift,clipped};
 refresh();
})();
