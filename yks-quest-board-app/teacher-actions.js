(() => {
 'use strict';
 const board=window.DersBoard,esc=v=>board.escape(String(v??'')),cache=new Map(),requests=new Map();let owner=board.user?.id,revision=0;
 const kinds=[['joins','Bekleyen Katılımlar'],['pending','Kabul Bekleyen Programlar'],['changes','Değişiklik Talepleri'],['schedules','Yaklaşan Gönderimler'],['not_started','Henüz Başlanmayan Programlar'],['shared_due','Yaklaşan Ortak Hedefler'],['reports','Son Haftanın Raporu']];
 const hints={joins:'bekleyen istek',pending:'onay bekleyen program',changes:'bekleyen talep',schedules:'planlı gönderim',not_started:'başlanmamış program',shared_due:'yaklaşan ortak hedef',reports:'sınıf raporu'};
 const views=new WeakMap();let arranging=false;
 function order(){try{const saved=JSON.parse(localStorage.getItem('ders.teacher-action-order:'+owner)||'[]');return [...new Set([...saved,...kinds.map(k=>k[0])])].filter(k=>kinds.some(x=>x[0]===k));}catch{return kinds.map(k=>k[0]);}}
 function move(kind,delta){const ids=order(),at=ids.indexOf(kind),next=at+delta;if(at<0||next<0||next>=ids.length)return;[ids[at],ids[next]]=[ids[next],ids[at]];try{localStorage.setItem('ders.teacher-action-order:'+owner,JSON.stringify(ids));}catch{board.toast('Kart sırası bu cihazda saklanamadı.');}mountAll();}
 async function target(kind,cid,reportWeek){if(kind==='pending')return window.DersProgramTools.openAcceptances({classId:cid,status:'pending'});if(kind==='changes')return window.DersTeacher.openRequests();if(kind==='schedules')return window.DersSchedules.open({classId:cid});if(kind==='reports')return window.DersTeacherInsights.open({classId:cid,weekStart:reportWeek});if(kind==='not_started')return window.DersTeacherInsights.open({classId:cid});return window.DersClasses.openSection(cid,kind==='joins'?'members':'shared');}
 async function choose(kind,data){const matches=data.classes.filter(c=>c[kind]>0);if(!matches.length){board.toast('Şu anda bu başlıkta bekleyen kayıt yok.');return;}if(matches.length===1)return target(kind,matches[0].id,data.report_week);const dialog=document.createElement('dialog');dialog.className='ders-dialog';dialog.dataset.autoSave='true';dialog.innerHTML='<div class="modal-head"><h2>Sınıf Seç</h2><button type="button" class="button" data-action-center-close>Kapat</button></div><div class="modal-body">'+matches.map(c=>'<button type="button" class="button" data-action-center-class="'+c.id+'">'+esc(c.name)+' · '+c[kind]+'</button>').join('')+'</div>';document.body.append(dialog);let closed=false;const close=(force=false,after)=>{if(closed)return;closed=true;window.DersUI.finishModal(dialog,()=>{dialog.close();dialog.remove();window.DersUI.modalClosed('teacher-actions',after?window.DersUI.route:undefined);after?.();});};dialog.querySelector('[data-action-center-close]').onclick=()=>close();dialog.oncancel=e=>{e.preventDefault();close();};dialog.addEventListener('click',e=>{const b=e.target.closest('[data-action-center-class]');if(b)close(true,()=>target(kind,b.dataset.actionCenterClass,data.report_week).catch(e=>board.toast(e.message)));});dialog.showModal();window.DersUI.openModal('teacher-actions',dialog,close);}
 function card(kind,index,ids,counts,gridId){
  const label=kinds.find(x=>x[0]===kind)[1],count=counts[kind],heading=gridId+'-'+kind;
  return '<article class="class-card teacher-action-card" data-class-key="teacher-action:'+kind+'" data-empty="'+(count===0)+'" aria-labelledby="'+heading+'">'
   +'<h4 id="'+heading+'">'+esc(label)+'</h4>'
   +'<p class="teacher-action-metric"><strong class="teacher-action-value" data-action-value="'+kind+'" data-persist-content="true">'+count+'</strong><span class="teacher-action-hint">'+esc(kind==='reports'&&!count?'Henüz tamamlanan hafta yok':hints[kind])+'</span></p>'
   +'<div class="teacher-action-footer">'+(count?'<button type="button" class="button teacher-action-link" data-teacher-action="'+kind+'" aria-label="'+esc(label)+' · İncele">İncele<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>':'')+'</div>'
   +'<div class="teacher-action-order"'+(arranging?'':' hidden')+'><button class="button" type="button" data-action-order="'+kind+'" data-delta="-1" aria-label="'+esc(label)+' kartını önceye taşı"'+(index===0?' disabled':'')+'>Önceye taşı</button><button class="button" type="button" data-action-order="'+kind+'" data-delta="1" aria-label="'+esc(label)+' kartını sonraya taşı"'+(index===ids.length-1?' disabled':'')+'>Sonraya taşı</button></div></article>';
 }
 async function mount(host){
  const version=revision,uid=board.user?.id,cid=host.dataset.classId||'',key=uid+':'+cid;
  if(!uid||document.hidden||window.DersUI.route!=='classes'||window.DersTeacher.info?.profile?.role!=='teacher')return;
  const valid=()=>host.isConnected&&version===revision&&uid===board.user?.id&&window.DersUI.route==='classes'&&host.dataset.classId===cid;
  try{
   let data=cache.get(key);
   if(!data||Date.now()-data.at>60000){
    if(!requests.has(key)){
     const job=window.DersProgramTools.rpc('action_center',{class_id:cid||null}).then(value=>{if(uid===board.user?.id&&version===revision)cache.set(key,{at:Date.now(),value});return value;}).finally(()=>{if(requests.get(key)===job)requests.delete(key);});requests.set(key,job);
    }
    data={value:await requests.get(key)};
   }
   if(!valid())return;
   const ids=order(),signature=JSON.stringify([uid,cid,data.value.classes,data.value.report_week,ids,arranging]);
   // Unchanged refreshes do not patch DOM or restart in-flight count/press motion.
   if(views.get(host)===signature)return;
   const counts=Object.fromEntries(kinds.map(([k])=>[k,data.value.classes.reduce((n,c)=>n+Number(c[k]||0),0)])),gridId='teacher-action-grid-'+(cid||'all');
   window.DersClassDOM.patch(host,'<header class="teacher-action-heading"><h3>Öğretmen Aksiyon Merkezi</h3><button type="button" class="button" data-action-arrange aria-pressed="'+arranging+'" aria-controls="'+gridId+'">'+(arranging?'Sıralamayı bitir':'Kart sırasını düzenle')+'</button></header><div class="teacher-action-grid" id="'+gridId+'">'+ids.map((k,i)=>card(k,i,ids,counts,gridId)).join('')+'</div>');
   views.set(host,signature);
   host.querySelectorAll('[data-action-value]').forEach(el=>{
    const count=counts[el.dataset.actionValue];
    if(window.DersMotion?.number)window.DersMotion.number(el,count,{key:'teacher-action:'+key+':'+el.dataset.actionValue,format:n=>Math.round(n).toLocaleString('tr-TR')});
    else el.textContent=count.toLocaleString('tr-TR');
   });
   host.onclick=e=>{
    if(e.target.closest('[data-action-arrange]')){arranging=!arranging;mountAll();return;}
    const sort=e.target.closest('[data-action-order]');if(sort&&!sort.disabled)return move(sort.dataset.actionOrder,Number(sort.dataset.delta));
    const b=e.target.closest('[data-teacher-action]');if(b)choose(b.dataset.teacherAction,data.value).catch(e=>board.toast(e.message));
   };
  }catch(e){if(valid()){views.delete(host);host.textContent='Aksiyon merkezi yüklenemedi: '+e.message;}}
 }
 function mountAll(){const uid=board.user?.id;if(owner!==uid){owner=uid;revision++;cache.clear();requests.clear();arranging=false;}document.querySelectorAll('[data-teacher-action-center]').forEach(mount);}
 function invalidate(cid){revision++;requests.clear();for(const key of cache.keys())if(!cid||key===owner+':'+cid||key===owner+':')cache.delete(key);mountAll();}
 document.addEventListener('ders:render',mountAll);document.addEventListener('ders:route',()=>{if(window.DersUI.route==='classes'){revision++;requests.clear();cache.clear();}mountAll();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)mountAll();});
 window.DersTeacherActionCenter={mount,mountAll,invalidate};mountAll();
})();
