(() => {
 const study=window.DersStudy,core=window.DersFocusCore,board=window.DersBoard,$=id=>document.getElementById(id),esc=x=>board.escape(String(x??''));
 const icon=(name,label,id='')=>`<button type="button" class="icon-button" ${id?`id="${id}"`:''} title="${label}" aria-label="${label}"><i data-lucide="${name}"></i></button>`;
 const duration=ms=>{const seconds=Math.floor((ms||0)/1000),m=Math.floor(seconds/60);return m>=60?`${Math.floor(m/60)} sa ${m%60} dk`:m?`${m} dk ${seconds%60} sn`:`${seconds} sn`;};
 const clock=ms=>{const s=Math.ceil(ms/1000);return `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor(s/60)%60<10?'0':''}${Math.floor(s/60)%60}:${(s%60).toString().padStart(2,'0')}`;};
 let settingsOwner,renderedSession='',date=core.dayKey(Date.now());
 const dialog=document.createElement('dialog');dialog.id='learningDialog';dialog.className='ders-dialog learning-dialog';document.body.append(dialog);
 const mini=document.createElement('aside');mini.className='focus-mini';mini.id='focusMini';mini.hidden=true;mini.innerHTML='<button type="button" id="focusMiniOpen"><i data-lucide="timer"></i><span><small id="miniPhase"></small><strong id="miniClock"></strong></span></button>'+icon('pause','Duraklat / Devam et','focusMiniPause');document.body.append(mini);
 function close(force=false,nextRoute){if(!force&&!window.DersUI.canLeave(dialog))return;dialog.close();dialog.replaceChildren();window.DersUI.modalClosed('learning',nextRoute);}
 function show(title,body){if(dialog.open&&!window.DersUI.canLeave(dialog))return false;dialog.innerHTML=`<header class="modal-head"><h2>${esc(title)}</h2>${icon('x','Kapat','closeLearning')}</header><div class="modal-body">${body}</div>`;if(!dialog.open)dialog.showModal();window.DersUI.openModal('learning',dialog,close);$('closeLearning').onclick=()=>close();window.DersUI.clearDirty(dialog);return true;}
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 function error(e){board.toast(e.message||'İşlem tamamlanamadı.');}
 function tasks(){return board.state.weeks.flatMap(w=>(w.quests||[]).map(q=>({weekId:w.id,questId:q.id,title:q.title,week:w.name,categoryName:board.category(q.categoryId||q.subject).name})));}
 function initFocus(){
  const wrap=$('focusPage');if(!wrap||settingsOwner===board.user?.id&&wrap.childElementCount)return;
  settingsOwner=board.user?.id;wrap.innerHTML=`<div class="focus-shell"><header class="focus-heading"><a href="#/home" data-route="home" class="button"><i data-lucide="arrow-left"></i>Çalışma Alanım</a><h2>Odak Modu</h2>${icon('settings-2','Süre ve ses ayarları','focusSettingsToggle')}</header>
  <form id="focusSettings" class="focus-settings" data-auto-save><div class="focus-durations"><fieldset><legend>Çalışma</legend><label>Saat<input class="input" id="workHours" type="number" min="0" max="8" value="0" required></label><label>Dakika<input class="input" id="workMinutes" type="number" min="0" max="59" value="25" required></label></fieldset><fieldset><legend>Mola</legend><label>Saat<input class="input" id="breakHours" type="number" min="0" max="8" value="0" required></label><label>Dakika<input class="input" id="breakMinutes" type="number" min="0" max="59" value="5" required></label></fieldset></div>
  <label class="field">Görev<select class="select" id="focusTask" data-searchable><option value="">Serbest Çalışma</option></select></label>
  <div class="focus-options"><div class="focus-behavior"><label><input type="checkbox" id="focusRepeat">Tekrarlı oturum</label><label><input type="checkbox" id="focusAuto">Otomatik aşama geçişi</label></div><div class="focus-audio"><label class="focus-sound"><input type="checkbox" id="focusSound" checked>Sesli bildirim</label><label class="focus-tone">Ses<select class="select" id="focusTone"><option value="bell">Çan</option><option value="soft">Yumuşak</option></select></label></div></div><button class="button primary" id="focusStart" type="submit"><i data-lucide="play"></i>Başlat</button><p role="alert" id="focusError"></p></form>
  <section class="focus-face" aria-label="Zamanlayıcı"><h3 id="focusPhase">Çalışma Zamanı</h3><output id="focusClock" aria-label="Kalan süre">00:25:00</output><p id="focusInfo"></p><div id="focusControls" class="focus-controls" hidden>${icon('pause','Duraklat','focusPause')}${icon('play','Devam et','focusResume')}${icon('skip-forward','Geçerli aşamayı atla','focusSkip')}${icon('square','Oturumu bitir','focusFinish')}<button class="button primary" id="focusNext" type="button">Sonraki aşama</button></div><p id="focusStatus" role="status"></p></section></div>`;
  let pref;try{pref=JSON.parse(localStorage.getItem('ders-focus-settings:'+settingsOwner)||'null');}catch{}
  if(pref){for(const id of ['workHours','workMinutes','breakHours','breakMinutes','focusTone'])if(pref[id]!=null)$(id).value=pref[id];for(const id of ['focusRepeat','focusAuto','focusSound'])if(pref[id]!=null)$(id).checked=pref[id];}
  $('focusSettings').onsubmit=e=>{e.preventDefault();try{const task=tasks().find(t=>t.weekId+'|'+t.questId===$('focusTask').value);const values={};for(const id of ['workHours','workMinutes','breakHours','breakMinutes','focusTone'])values[id]=$(id).value;for(const id of ['focusRepeat','focusAuto','focusSound'])values[id]=$(id).checked;
   study.start({workMs:(Number(values.workHours)*60+Number(values.workMinutes))*60000,breakMs:(Number(values.breakHours)*60+Number(values.breakMinutes))*60000,repeat:values.focusRepeat,auto:values.focusAuto,sound:values.focusSound,tone:values.focusTone,task,contextWeekId:board.week().id});
   localStorage.setItem('ders-focus-settings:'+settingsOwner,JSON.stringify(values));$('focusSettings').hidden=true;$('focusError').textContent='';
  }catch(e){$('focusError').textContent=e.message;}};
  for(const [id,action] of [['focusPause','pause'],['focusResume','resume'],['focusSkip','skip'],['focusFinish','finish'],['focusNext','next']])$(id).onclick=()=>{if(action==='finish'&&!confirm('Odak oturumu bitirilsin mi? Net çalışma süren korunacak.'))return;try{study.act(action);}catch(e){error(e);}};
  $('focusSettingsToggle').onclick=()=>{$('focusSettings').hidden=!$('focusSettings').hidden;};
  for(const id of ['focusSound','focusTone'])$(id).onchange=()=>study.setSound($('focusSound').checked,$('focusTone').value);
  updateTasks();renderFocus();
 }
 function updateTasks(){const select=$('focusTask');if(!select)return;const signature=JSON.stringify(tasks());if(select.dataset.items===signature)return;select.dataset.items=signature;const value=select.value;select.innerHTML='<option value="">Serbest Çalışma</option>'+tasks().map(t=>`<option value="${esc(t.weekId+'|'+t.questId)}">${esc(t.week+' · '+t.categoryName+' · '+t.title)}</option>`).join('');select.value=value;window.DersSelect?.refresh();}
 function renderFocus(){
  const s=study.session,active=s&&!['completed','ended'].includes(s.status),inFocus=window.DersUI.route==='focus';
  mini.hidden=!active||inFocus||!board.user;document.body.classList.toggle('has-focus-mini',!mini.hidden);
  if(s){$('miniPhase').textContent=s.phase==='work'?'Çalışma':'Mola';$('miniClock').textContent=clock(core.remaining(s,Date.now()));}
  if(!$('focusClock'))return;
  const signature=s?.id+':'+s?.status;
  if(signature!==renderedSession){renderedSession=signature;$('focusSettings').hidden=!!active;}
  $('focusClock').textContent=clock(s?core.remaining(s,Date.now()):25*60000);
  $('focusPhase').textContent=!s||s.phase==='work'?'Çalışma Zamanı':'Mola Zamanı';
  $('focusInfo').textContent=s?`${s.settings.task?.title||'Serbest Çalışma'} · ${s.cycle}. çalışma${s.status==='paused'?' · Duraklatıldı':s.status==='completed'?' · Tamamlandı':s.status==='ended'?' · Bitirildi':s.status==='waiting'?' · Geçiş bekliyor':''}`:'';
  $('focusControls').hidden=!active;$('focusPause').hidden=s?.status!=='running';$('focusResume').hidden=s?.status!=='paused';$('focusNext').hidden=s?.status!=='waiting';
  $('focusStart').disabled=!!active;for(const id of ['workHours','workMinutes','breakHours','breakMinutes','focusTask','focusRepeat','focusAuto'])$(id).disabled=!!active;
  if($('focusTask').dataset.active!==String(!!active)){$('focusTask').dataset.active=String(!!active);window.DersSelect?.refresh();}
  $('focusStatus').textContent=study.status|| (study.pending?'Süre kayıtları eşitlenmeyi bekliyor.':s?.settings.sound?(study.soundReady?'Ses açık':'Sesi etkinleştirmek için Devam et veya ses ayarına dokun.'):'');
 }
 $('focusMiniOpen').onclick=()=>window.DersUI.navigate('focus');$('focusMiniPause').onclick=()=>{try{study.act(study.session?.status==='paused'?'resume':'pause');}catch(e){error(e);}};
 function daily(){
  const wrap=$('dailyStudySummary');if(!wrap)return;if(!board.user){wrap.replaceChildren();return;}
  const segments=study.segments().map(s=>({...s,category_name:s.category_name||tasks().find(t=>t.questId===s.quest_id&&t.weekId===s.week_id)?.categoryName||'Serbest Çalışma'}));
  const s=core.summary(segments,board.state.studyHistory,date);
  const html=`<div class="daily-heading"><h2>Günlük Çalışma Özeti</h2><input class="input" type="date" id="studyDay" aria-label="Özet günü" value="${date}"></div><div class="daily-numbers"><span><strong>${duration(s.totalMs)}</strong>Net çalışma</span><span><strong>${s.completed}</strong>Tamamlanan görev</span><span><strong>${esc(s.top)}</strong>En çok çalışılan ders</span></div>${Object.entries(s.byLesson).map(([name,ms])=>`<div class="lesson-duration"><span>${esc(name)}</span><meter min="0" max="${s.totalMs||1}" value="${ms}"></meter><span>${duration(ms)}</span></div>`).join('')}`;
  if(wrap.dataset.render===html)return;wrap.dataset.render=html;wrap.innerHTML=html;$('studyDay').onchange=e=>{if(e.target.value){date=e.target.value;daily();}};
 }
 async function thread(wrap,sid,week,qid){
  const uid=board.user?.id,token=crypto.randomUUID();wrap.dataset.request=token;wrap.innerHTML='<p role="status">Yorumlar yükleniyor…</p>';
  try{
   const [messages,overview]=await Promise.all([study.rpc('messages',{student_id:sid,week_id:week,quest_id:qid}),study.rpc('overview',{student_id:sid})]);
   if(!wrap.isConnected||wrap.dataset.request!==token||board.user?.id!==uid)return;const own=sid===uid;
   wrap.innerHTML=`<h3>Soru ve Yorumlar</h3><ol class="task-thread">${messages.map(m=>`<li><strong>${esc(m.author_name)} · ${m.kind==='question'?'Öğrenci sorusu':m.kind==='answer'?'Öğretmen yanıtı':'Öğretmen yorumu'}</strong><p>${esc(m.body)}</p><time>${new Date(m.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}</time></li>`).join('')}</ol>${messages.length?'':'<p class="sync-status">Henüz yorum yok.</p>'}<form class="thread-form" data-draft>${own?`<label class="field">Öğretmen<select class="select" name="teacher" required>${overview.teachers.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></label>`:`<label class="field">Tür<select class="select" name="kind"><option value="feedback">Yorum</option><option value="answer">Yanıt</option></select></label>`}<label class="field">${own?'Sorun veya açıklaman':'Geri bildirimin'}<textarea class="textarea" name="body" maxlength="4000" required rows="3"></textarea></label><button class="button primary" type="submit" ${own&&!overview.teachers.length?'disabled':''}><i data-lucide="send"></i>Gönder</button><p class="form-status" role="status"></p></form>`;
   const form=wrap.querySelector('form');let retry={};
   form.onsubmit=async e=>{e.preventDefault();const controls=form.elements,output=form.querySelector('.form-status'),button=form.querySelector('button');const payload={student_id:sid,week_id:week,quest_id:qid,teacher_id:controls.teacher?.value,kind:controls.kind?.value,body:controls.body.value.trim()};const signature=JSON.stringify(payload);if(retry.signature!==signature)retry={signature,id:crypto.randomUUID()};button.disabled=true;
    try{await study.rpc('message',{...payload,id:retry.id});if(board.user?.id!==uid)return;window.DersUI.clearDirty(form);await thread(wrap,sid,week,qid);study.refresh();}catch(e){output.textContent=e.message;}finally{if(button.isConnected)button.disabled=false;}};
   window.DersUI.clearDirty(form);window.DersSelect?.refresh();
  }catch(e){if(wrap.isConnected&&wrap.dataset.request===token&&uid===board.user?.id)wrap.textContent=e.message;}
 }
 async function task(sid,week,qid){
  const w=board.state.weeks.find(w=>w.id===week),q=w?.quests.find(q=>q.id===qid);if(!q)return error(Error('Görev bulunamadı.'));
  const total=study.segments().filter(s=>s.week_id===week&&s.quest_id===qid).reduce((n,s)=>n+Date.parse(s.ended_at)-Date.parse(s.started_at),0);
  if(!show(q.title,`<p>${esc(q.detail)}</p><strong>Net çalışma: ${duration(total)}</strong><button class="button" id="focusThisTask" type="button"><i data-lucide="timer"></i>Bu göreve odaklan</button><div id="taskThread"></div>`))return;
  $('focusThisTask').onclick=()=>{close(true,'focus');initFocus();$('focusTask').value=week+'|'+qid;window.DersSelect?.refresh();};await thread($('taskThread'),sid,week,qid);
 }
 async function report(wrap,sid,selectedWeek,selectedQuest){
  const uid=board.user?.id,token=crypto.randomUUID();wrap.dataset.request=token;wrap.innerHTML='<p role="status">Karne yükleniyor…</p>';
  try{
   const data=await study.rpc('report',{student_id:sid});if(!wrap.isConnected||wrap.dataset.request!==token||uid!==board.user?.id)return;
   const state=data.state||{weeks:[],categories:[]},weeks=state.weeks||[],own=uid===sid;
   wrap.innerHTML=`<div class="report-heading"><h3>Öğrenci Karnesi</h3><label class="field">Hafta<select class="select" id="reportWeek" data-ui-transient="true">${weeks.map(w=>`<option value="${esc(w.id)}">${esc(w.name)}${w.archived?' · Arşiv':''}</option>`).join('')}</select></label></div><div id="reportContent"></div>`;
   const select=wrap.querySelector('#reportWeek');select.value=selectedWeek||state.activeWeekId||weeks[0]?.id;
   const draw=()=>{
    const w=weeks.find(w=>w.id===select.value),host=wrap.querySelector('#reportContent');if(!w){host.textContent='Henüz hafta yok.';return;}
    const qs=w.quests||[],complete=q=>{const p=window.DersQuests.progress(q);return p.count>=p.target;},done=qs.filter(complete).length,late=qs.filter(q=>!complete(q)&&/^\d{4}-\d{2}-\d{2}$/.test(q.repeat?.endDate||w.endDate||w.end||'')&&(q.repeat?.endDate||w.endDate||w.end)<core.dayKey(Date.now())).length;
    const segments=data.segments.filter(s=>s.week_id===w.id),time=segments.reduce((n,s)=>n+s.duration_ms,0),lessons=[...new Set(qs.map(q=>q.categoryId||q.subject))];
    host.innerHTML=`<div class="report-stats"><span><strong>${done}/${qs.length}</strong>Tamamlanan görev</span><span><strong>${qs.length-done}</strong>Bekleyen</span><span><strong>${late}</strong>Süresi geçen (tarihli)</span><span><strong>${qs.length?Math.round(done/qs.length*100):0}%</strong>Tamamlama</span><span><strong>${duration(time)}</strong>Toplam net çalışma</span><span><strong>${duration(segments.filter(s=>!s.quest_id).reduce((n,s)=>n+s.duration_ms,0))}</strong>Serbest çalışma · bu hafta</span></div>
    <div class="report-lessons">${lessons.map(id=>{const a=qs.filter(q=>(q.categoryId||q.subject)===id),name=(state.categories||[]).find(c=>c.id===id)?.name||'Belirtilmemiş';return `<div><span>${esc(name)}</span><progress max="${a.length||1}" value="${a.filter(complete).length}"></progress><span>${a.filter(complete).length}/${a.length}</span></div>`;}).join('')}</div>
    <div class="report-tasks">${qs.map(q=>`<details data-report-quest="${esc(q.id)}"><summary>${esc(q.title)} <small>${window.DersQuests.describe(q)} · ${duration(segments.filter(s=>s.quest_id===q.id).reduce((n,s)=>n+s.duration_ms,0))}</small></summary><p>${esc(q.detail)}</p><div class="report-thread"></div></details>`).join('')}</div>
    <h3>Haftalık Öğretmen Değerlendirmesi</h3>${data.reviews.filter(r=>r.week_id===w.id).map(r=>`<div class="week-review"><strong>${esc(r.teacher_name)}</strong><p>${esc(r.body)}</p><time>${new Date(r.updated_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}</time></div>`).join('')||'<p class="sync-status">Henüz değerlendirme yok.</p>'}
    ${own?'':`<form id="weekReviewForm" data-draft><label class="field">Değerlendirmen<textarea class="textarea" name="body" rows="4" maxlength="8000" required>${esc(data.reviews.find(r=>r.week_id===w.id&&r.teacher_id===uid)?.body||'')}</textarea></label><button class="button primary" type="submit">Değerlendirmeyi kaydet</button><p role="status"></p></form>`}`;
    for(const detail of host.querySelectorAll('details'))detail.addEventListener('toggle',()=>{if(detail.open&&!detail.dataset.loaded){detail.dataset.loaded='true';thread(detail.querySelector('.report-thread'),sid,w.id,detail.dataset.reportQuest);}});
    const form=host.querySelector('form');if(form){form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('button');b.disabled=true;try{const body=form.elements.body.value.trim();await study.rpc('review',{student_id:sid,week_id:w.id,body});const old=data.reviews.find(r=>r.week_id===w.id&&r.teacher_id===uid);if(old){old.body=body;old.updated_at=new Date().toISOString();}else data.reviews.push({teacher_id:uid,teacher_name:board.state.profile?.displayName||'Öğretmen',week_id:w.id,body,updated_at:new Date().toISOString()});window.DersUI.clearDirty(form);form.querySelector('[role="status"]').textContent='Değerlendirme kaydedildi.';study.refresh();}catch(e){form.querySelector('[role="status"]').textContent=e.message;}finally{b.disabled=false;}};window.DersUI.clearDirty(form);}
    if(selectedQuest){const target=[...host.querySelectorAll('details')].find(d=>d.dataset.reportQuest===selectedQuest);if(target){target.open=true;target.scrollIntoView({block:'nearest'});}selectedQuest=null;}
   };let previous=select.value;select.onchange=()=>{if(window.DersUI.canLeave(wrap)){previous=select.value;draw();}else{select.value=previous;window.DersSelect?.refresh();}};draw();window.DersSelect?.refresh();
  }catch(e){if(wrap.isConnected&&wrap.dataset.request===token&&uid===board.user?.id)wrap.textContent=e.message;}
 }
 async function openOwnReport(week,quest){if(show('Haftalık Değerlendirmeler','<div id="ownReport"></div>'))await report($('ownReport'),board.user.id,week,quest);}
 async function notifications(){
  if(!board.user)return window.DersUI.navigate('account');if(!show('Bildirimler','<div id="notificationPanel" role="status">Yükleniyor…</div>'))return;
  await study.refresh();const host=$('notificationPanel');if(!host)return;const kinds={program:'Yeni program',feedback:'Görev yorumu veya yanıtı',question:'Soru ve yanıtlar',review:'Haftalık değerlendirme'};
  host.innerHTML=`<details><summary>Bildirim Tercihleri</summary><form id="notificationPrefs" data-draft>${Object.entries(kinds).map(([key,label])=>`<label class="notification-pref"><input type="checkbox" name="${key}" ${study.data.preferences[key]?'checked':''}>${label}</label>`).join('')}<button class="button" type="submit">Tercihleri kaydet</button><p role="status"></p></form></details><p id="notificationError" role="status">${esc(study.status)}</p><ul class="notification-list">${study.data.notifications.map(n=>`<li data-notice="${n.id}" class="${n.read_at?'read':'unread'}"><button type="button" class="notification-open"><strong>${n.kind==='answer'?'Öğretmen yanıtı':kinds[n.kind]}</strong><time>${new Date(n.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}</time><span>${n.read_at?'Okundu':'Okunmadı'}</span></button><button type="button" class="button notification-read">${n.read_at?'Okunmadı yap':'Okundu yap'}</button></li>`).join('')}</ul>${study.data.notifications.length?'':'<p>Henüz bildirim yok.</p>'}`;
  const form=$('notificationPrefs');form.onsubmit=async e=>{e.preventDefault();try{await study.rpc('preferences',Object.fromEntries(Object.keys(kinds).map(k=>[k,form.elements[k].checked])));window.DersUI.clearDirty(form);await study.refresh();form.querySelector('[role="status"]').textContent='Tercihler kaydedildi.';}catch(e){form.querySelector('[role="status"]').textContent=e.message;}};window.DersUI.clearDirty(form);
  for(const li of host.querySelectorAll('[data-notice]')){const n=study.data.notifications.find(n=>n.id===li.dataset.notice);
   li.querySelector('.notification-read').onclick=async()=>{try{await study.rpc('read_notification',{id:n.id,read:!n.read_at});await notifications();}catch(e){$('notificationError').textContent=e.message;}};
   li.querySelector('.notification-open').onclick=async()=>{try{await study.rpc('read_notification',{id:n.id,read:true});close(true,n.kind==='program'||n.student_id!==board.user.id?'teacher':'program');if(n.kind==='program'){await window.DersTeacher.openAssignment(n.assignment_id);}else if(n.student_id===board.user.id){await openOwnReport(n.week_id,n.quest_id);}else{await window.DersTeacher.openReport(n.student_id,n.week_id,n.quest_id);}study.refresh();}catch(e){error(e);}};
  }
 }
 $('notificationsButton').onclick=notifications;
 const accountPrefs=document.createElement('button');accountPrefs.type='button';accountPrefs.className='button';accountPrefs.innerHTML='<i data-lucide="bell"></i>Bildirim Tercihleri';accountPrefs.onclick=async()=>{await notifications();const section=$('notificationPanel')?.querySelector('details');if(section)section.open=true;};$('signedInPanel').querySelector('.signed-in-actions').prepend(accountPrefs);
 const reviews=document.createElement('button');reviews.className='button';reviews.type='button';reviews.id='openWeekReport';reviews.innerHTML='<i data-lucide="clipboard-check"></i>Değerlendirmeler';reviews.onclick=()=>openOwnReport(board.week().id);document.querySelector('.program-actions').prepend(reviews);
 function refresh(){initFocus();updateTasks();renderFocus();daily();const count=study.data.notifications.filter(n=>!n.read_at).length;$('notificationBadge').hidden=!count;$('notificationBadge').textContent=count;$('notificationsButton').setAttribute('aria-label',`Bildirimler${count?' · '+count+' okunmamış':''}`);if(!board.user&&dialog.open)close(true);window.lucide.createIcons();}
 document.addEventListener('ders:study',refresh);document.addEventListener('ders:route',refresh);window.addEventListener('online',refresh);
 window.DersLearningUI={task,report,openOwnReport,notifications};new MutationObserver(()=>window.lucide.createIcons(dialog)).observe(dialog,{childList:true,subtree:true});refresh();window.lucide.createIcons();
})();
