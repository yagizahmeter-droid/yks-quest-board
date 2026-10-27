(() => {
 'use strict';
 const core=window.DersExamsCore,board=window.DersBoard,esc=value=>board.escape(String(value??'')),icons=()=>window.lucide.createIcons();
 const mounts=new Map(),cache=new Map();
 let owner=null,loading=new Map(),editor=null,busy=false;
 const dialog=document.createElement('dialog');dialog.className='ders-dialog exam-dialog';dialog.id='examDialog';document.body.append(dialog);
 const message=error=>/does not exist|schema cache|PGRST202/.test(error?.message||'')?'Deneme sistemi henüz sunucuda hazır değil. Biraz sonra tekrar dene.':error?.message||'İşlem tamamlanamadı. Girdiğin bilgiler korunuyor.';
 async function rpc(action,payload={}){
  const uid=board.user?.id;
  if(!uid||!navigator.onLine)throw Error('Denemeleri kaydetmek için giriş ve internet bağlantısı gerekli.');
  const result=await board.client.rpc('ders_exams',{p_action:action,p_payload:{...payload,request_user_id:uid}});
  if(uid!==board.user?.id)throw Error('Oturum değişti.');
  if(result.error)throw Error(message(result.error));return result.data;
 }
 function syncOwner(){
  const uid=board.user?.id||null;if(uid===owner)return;
  for(const host of mounts.keys())host.replaceChildren();
  owner=uid;cache.clear();loading.clear();mounts.clear();close(true);
 }
 function close(force=false){
  if(!force&&(busy||!window.DersUI.canLeave(dialog)))return false;
  dialog.close();dialog.replaceChildren();editor=null;window.DersUI?.modalClosed('exam-dialog');return true;
 }
 function show(title,html){
  if(dialog.open&&!close())return false;
  dialog.innerHTML='<header class="modal-head"><h2>'+esc(title)+'</h2><button class="icon-button" id="closeExam" type="button" aria-label="Kapat" title="Kapat"><i data-lucide="x"></i></button></header><div class="modal-body">'+html+'</div>';
  dialog.querySelector('#closeExam').onclick=()=>close();dialog.showModal();window.DersUI.openModal('exam-dialog',dialog,close);window.DersUI.clearDirty(dialog);icons();return true;
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 async function load(sid,force=false){
  syncOwner();if(!owner)return;
  if(loading.has(sid))return loading.get(sid);
  if(!force&&cache.get(sid)&&Date.now()-cache.get(sid).time<30000)return;
  const uid=owner;
  const promise=(async()=>{try{const rows=await rpc('list',{student_id:sid});if(uid!==owner)return;cache.set(sid,{rows,time:Date.now(),error:''});}
   catch(error){if(uid===owner)cache.set(sid,{rows:sid===owner?cache.get(sid)?.rows||[]:[],time:0,error:message(error)});}
   finally{if(uid===owner){loading.delete(sid);for(const [host,view] of mounts)if(view.sid===sid&&host.isConnected)render(host,view);}}
  })();loading.set(sid,promise);return promise;
 }
 function scopeLabel(row){return row.groups.map(g=>core.catalog[row.exam_type].find(c=>c.id===g.id)?.label).join(' + ');}
 function button(icon,label,action,id=''){return '<button class="icon-button" type="button" data-exam-action="'+action+'" data-id="'+esc(id)+'" title="'+label+'" aria-label="'+label+'"><i data-lucide="'+icon+'"></i></button>';}
 function render(host,view){
  if(!host.isConnected||board.user?.id!==owner)return;
  const stored=cache.get(view.sid),all=(stored?.rows||[]).filter(row=>row.exam_type===view.exam);
  const scopes=[...new Map(all.map(row=>[core.scope(row),scopeLabel(row)])).entries()];
  if(!scopes.some(([key])=>key===view.scope))view.scope=all.length?core.scope(core.order(all).at(-1)):null;
  const rows=core.order(all.filter(row=>!view.scope||core.scope(row)===view.scope)),stats=core.stats(rows),latest=stats.last&&core.evaluate(stats.last);
  const writable=view.sid===owner&&board.state.profile?.role==='student';
  host.innerHTML='<div class="exam-toolbar"><div class="segmented" role="group" aria-label="Deneme sınavı">'+['TYT','AYT'].map(exam=>'<button type="button" class="button '+(view.exam===exam?'is-active':'')+'" data-exam-filter="'+exam+'" aria-pressed="'+(view.exam===exam)+'">'+exam+'</button>').join('')+'</div><div class="signed-in-actions">'+(writable?'<button class="button primary" data-exam-action="new" type="button"><i data-lucide="plus"></i>Yeni Deneme Ekle</button>':'')+button('refresh-cw','Yenile','refresh')+'</div></div>'+
   (scopes.length>1?'<label class="field exam-scope">Test Kapsamı<select class="select" data-exam-scope data-ui-transient="true">'+scopes.map(([key,label])=>'<option value="'+esc(key)+'" '+(key===view.scope?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>':'')+
   (stored?.error?'<div class="exam-error" role="alert">'+esc(stored.error)+'</div>':'')+
   (!stored?'<p role="status">Denemeler yükleniyor…</p>':!all.length?'<div class="empty-state"><i data-lucide="chart-no-axes-combined"></i><h2>Henüz '+view.exam+' denemesi yok</h2></div>':
   '<div class="exam-stats">'+[
    ['Deneme Sayısı',stats.count,stats.completeCount+' tam · '+(stats.count-stats.completeCount)+' kısmi'],
    ['Son Deneme',core.format(latest?.totalNet),stats.last?core.date(stats.last.exam_date)+(latest.complete?'':' · Kısmi'):''],
    ['En Yüksek Net',core.format(stats.best),'Tam kayıtlar'],
    ['Ortalama Net',core.format(stats.average),'Tam kayıtlar']
   ].map(([label,value,detail])=>'<article class="stat"><span>'+label+'</span><strong>'+value+'</strong><small>'+detail+'</small></article>').join('')+'</div>'+
   '<div class="exam-trends"><span>İlk → Son <strong>'+core.format(stats.change)+'</strong></span><span>Son '+Math.min(5,stats.completeCount)+' Tam Deneme <strong>'+core.format(stats.lastFive)+'</strong></span></div>'+
   '<section class="exam-chart-section"><h2>Net Gelişimi</h2><div data-exam-chart="total"></div></section>'+
   '<section class="exam-chart-section"><div class="exam-toolbar"><h2>Ders Performansı</h2><label class="field">Ders<select class="select" data-exam-lesson data-ui-transient="true"></select></label></div><div data-exam-chart="lesson"></div><div class="exam-performance"></div></section>'+
   '<section class="exam-history"><h2>Deneme Geçmişi</h2>'+[...rows].reverse().map(row=>{const score=core.evaluate(row);return '<article class="card exam-entry"><div class="exam-entry-heading"><div><span class="chip">'+esc(row.exam_type)+(score.complete?'':' · Kısmi')+'</span><h3>'+esc(row.name)+'</h3><p>'+esc(row.publisher)+(row.publisher?' · ':'')+core.date(row.exam_date)+'</p></div><strong class="exam-total">'+core.format(score.totalNet)+' <small>/ '+score.maximum+' net</small></strong></div><div class="exam-entry-tests">'+score.tests.filter(t=>t.counts.some(v=>v!==null)).map(t=>'<span>'+esc(t.label)+' <b>'+core.format(t.net)+'</b></span>').join('')+'</div><div class="exam-entry-actions"><button class="button" data-exam-action="detail" data-id="'+row.id+'" type="button"><i data-lucide="notebook-tabs"></i>Detayları Gör</button>'+(writable?button('pencil','Düzenle','edit',row.id)+button('trash-2','Sil','delete',row.id):'')+'</div></article>';}).join('')+'</section>');
  host.onclick=event=>{const filter=event.target.closest('[data-exam-filter]');if(filter){view.exam=filter.dataset.examFilter;view.scope=null;render(host,view);return;}const control=event.target.closest('[data-exam-action]');if(control)act(control.dataset.examAction,control.dataset.id,view);};
  const scopeSelect=host.querySelector('[data-exam-scope]');if(scopeSelect)scopeSelect.onchange=()=>{view.scope=scopeSelect.value;render(host,view);};
  if(rows.length){
   chart(host.querySelector('[data-exam-chart="total"]'),rows.map(row=>({row,value:core.evaluate(row).totalNet,partial:!core.evaluate(row).complete})),core.evaluate(rows[0]).maximum);
   const lessons=new Map();for(const row of rows)for(const test of core.evaluate(row).tests)if(!lessons.has(test.id))lessons.set(test.id,test);
   const select=host.querySelector('[data-exam-lesson]');if(!lessons.has(view.lesson))view.lesson=lessons.keys().next().value;
   select.innerHTML=[...lessons.values()].map(test=>'<option value="'+test.id+'" '+(view.lesson===test.id?'selected':'')+'>'+esc(test.label)+'</option>').join('');
   const lessonChart=()=>{view.lesson=select.value;const points=rows.map(row=>{const test=core.evaluate(row).tests.find(test=>test.id===view.lesson);return {row,value:test?.net??null,partial:!test?.complete};});chart(host.querySelector('[data-exam-chart="lesson"]'),points,lessons.get(view.lesson).max);};
   select.onchange=lessonChart;lessonChart();
   host.querySelector('.exam-performance').innerHTML=[...lessons.values()].map(test=>{const values=rows.flatMap(row=>core.evaluate(row).tests.filter(t=>t.id===test.id&&t.complete&&t.net!==null).map(t=>t.net));return '<div><span>'+esc(test.label)+'</span><strong>'+core.format(values.length?values.reduce((n,v)=>n+v,0)/values.length:null)+'</strong><small>'+values.length+' tam test ortalaması</small></div>';}).join('');
  }
  window.DersUI.clearDirty(host);window.DersSelect?.refresh();icons();
 }
 function chart(host,entries,maximum){
  const points=entries.filter(point=>point.value!==null);
  if(!points.length){host.innerHTML='<p class="sync-status">Henüz hesaplanabilir net yok.</p>';return;}
  const width=640,height=220,left=42,right=18,top=22,bottom=40,min=Math.min(0,...points.map(p=>p.value)),max=Math.max(maximum,...points.map(p=>p.value)),range=Math.max(1,max-min);
  const x=i=>left+(points.length===1?.5:i/(points.length-1))*(width-left-right),y=value=>top+(max-value)/range*(height-top-bottom);
  const paths=[];let line=[];points.forEach((point,i)=>{if(point.partial){if(line.length)paths.push(line);line=[];}else line.push(x(i)+','+y(point.value));});if(line.length)paths.push(line);
  host.innerHTML='<svg class="exam-chart" viewBox="0 0 640 220" role="group" aria-label="Deneme net gelişimi">'+[min,(max+min)/2,max].map(n=>'<line class="exam-gridline" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(n)+'" y2="'+y(n)+'"/><text x="4" y="'+(y(n)+4)+'">'+core.format(n)+'</text>').join('')+paths.map(line=>'<polyline class="exam-chart-line" points="'+line.join(' ')+'"/>').join('')+points.map((point,i)=>'<circle class="exam-chart-point '+(point.partial?'partial':'')+'" cx="'+x(i)+'" cy="'+y(point.value)+'" r="6" tabindex="0" role="button" data-chart-point="'+i+'" aria-label="'+esc(point.row.name+' · '+core.date(point.row.exam_date)+' · '+core.format(point.value)+' net'+(point.partial?' · Kısmi':''))+'"><title>'+esc(point.row.name+' · '+core.format(point.value)+' net')+'</title></circle>').join('')+'<text x="'+left+'" y="210">'+esc(core.date(points[0].row.exam_date))+'</text><text text-anchor="end" x="622" y="210">'+esc(core.date(points.at(-1).row.exam_date))+'</text></svg><output class="exam-chart-caption" aria-live="polite"></output>';
  const caption=host.querySelector('output');const info=i=>{const p=points[i];caption.textContent=p.row.name+' · '+core.date(p.row.exam_date)+' · '+core.format(p.value)+' net'+(p.partial?' · Kısmi':'');};
  for(const dot of host.querySelectorAll('[data-chart-point]')){const reveal=()=>info(Number(dot.dataset.chartPoint));dot.onmouseenter=reveal;dot.onfocus=reveal;dot.onclick=reveal;dot.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();reveal();}};}info(points.length-1);
 }
 function mount(host,sid=board.user?.id){
  syncOwner();if(!host||!owner)return;const existing=mounts.get(host),view=existing?.sid===sid?existing:{sid,exam:'TYT',scope:null,lesson:null};mounts.set(host,view);render(host,view);return load(sid);
 }
 function create(row=null,exam='TYT'){
  if(board.state.profile?.role!=='student')return board.toast('Denemeleri öğrenci hesabından ekleyebilirsin.');
  const draft=row?structuredClone(row):{id:crypto.randomUUID(),revision:0,exam_type:exam,name:'',exam_date:core.today(),publisher:'',note:'',groups:core.catalog[exam].filter(g=>exam==='TYT'||['math','science'].includes(g.id)).map(g=>({id:g.id,mode:exam==='TYT'?'total':'detail'})),results:{}};
  if(!show(row?'Denemeyi Düzenle':'Yeni Deneme','<form id="examForm" novalidate><div class="exam-meta-fields"><label class="field">Deneme Adı<input class="input" name="name" maxlength="160" required></label><label class="field">Sınav<select class="select" name="exam_type"><option>TYT</option><option>AYT</option></select></label><label class="field">Tarih<input class="input" type="date" name="exam_date" min="1900-01-01" max="2200-12-31" required></label><label class="field">Yayın / Kurum (isteğe bağlı)<input class="input" name="publisher" maxlength="160"></label></div><div id="examGroups"></div><div id="examQuestions"></div><label class="field">Not (isteğe bağlı)<textarea class="textarea" name="note" maxlength="2000" rows="3"></textarea></label><div class="exam-save-row"><output id="examLiveTotal"></output><button class="button primary" type="submit"><i data-lucide="check"></i>Kaydet</button></div><p id="examFormError" class="exam-error" role="alert"></p></form>'))return;
  editor={draft,uid:owner};const form=dialog.querySelector('form');
  for(const name of ['name','exam_type','exam_date','publisher','note'])form.elements[name].value=draft[name];
  form.oninput=event=>{const input=event.target;if(input.dataset.result){const id=input.dataset.result,key=input.dataset.count;draft.results[id]||={correct:null,wrong:null,blank:null};draft.results[id][key]=input.value===''?null:Number(input.value);updateLive();}else if(['name','exam_date','publisher','note'].includes(input.name))draft[input.name]=input.value;};
  form.elements.exam_type.onchange=()=>{
   if(Object.values(draft.results).some(v=>Object.values(v).some(n=>n!==null))&&!confirm('Sınav türünü değiştirirsen formdaki soru sayıları temizlenecek. Devam edilsin mi?')){form.elements.exam_type.value=draft.exam_type;window.DersSelect?.refresh();return;}
   draft.exam_type=form.elements.exam_type.value;draft.groups=core.catalog[draft.exam_type].filter(g=>draft.exam_type==='TYT'||['math','science'].includes(g.id)).map(g=>({id:g.id,mode:draft.exam_type==='TYT'?'total':'detail'}));draft.results={};drawFields();
  };
  form.onsubmit=async event=>{
   event.preventDefault();if(busy)return;const uid=owner,error=dialog.querySelector('#examFormError');
   try{core.validate(draft);}catch(e){error.textContent=e.message;return;}
   busy=true;form.querySelector('button[type=submit]').disabled=true;error.textContent='Kaydediliyor…';
   try{await rpc('save',draft);if(uid!==owner)return;window.DersUI.clearDirty(dialog);busy=false;close(true);board.toast('Deneme kaydedildi');await load(uid,true);}
   catch(e){if(uid===owner&&error.isConnected)error.textContent=message(e);}
   finally{busy=false;if(form.isConnected)form.querySelector('button[type=submit]').disabled=false;}
  };
  drawFields();window.DersUI.clearDirty(dialog);
 }
 function drawFields(){
  const draft=editor.draft,host=dialog.querySelector('#examGroups');
  host.innerHTML='<fieldset class="exam-test-options"><legend>Testler</legend>'+core.catalog[draft.exam_type].map(g=>{const selected=draft.groups.find(s=>s.id===g.id);return '<div><label>'+(draft.exam_type==='AYT'?'<input type="checkbox" data-group="'+g.id+'" '+(selected?'checked':'')+'>':'')+esc(g.label)+'</label>'+(draft.exam_type==='TYT'&&g.parts.length>1?'<select class="select" data-mode="'+g.id+'" aria-label="'+esc(g.label)+' ayrıntısı"><option value="total">Test Toplamı</option><option value="detail" '+(selected?.mode==='detail'?'selected':'')+'>Alt Dersler</option></select>':'')+'</div>';}).join('')+'</fieldset>';
  host.onchange=event=>{
   const target=event.target,id=target.dataset.group||target.dataset.mode,g=core.catalog[draft.exam_type].find(g=>g.id===id),existing=draft.groups.find(s=>s.id===id);
   const keys=[id,...g.parts.map(p=>p.id)],hasValues=keys.some(key=>Object.values(draft.results[key]||{}).some(n=>n!==null));
   if(hasValues&&!confirm('Bu test seçimi değişince ilgili soru sayıları temizlenecek. Devam edilsin mi?')){drawFields();return;}
   for(const key of keys)delete draft.results[key];
   if(target.dataset.group){draft.groups=draft.groups.filter(s=>s.id!==id);if(target.checked)draft.groups.push({id,mode:'detail'});}
   else existing.mode=target.value;
   drawFields();dialog.querySelector('form').dataset.dirty='true';
  };
  const tests=draft.groups.length?core.tests(draft.exam_type,draft.groups):[];
  dialog.querySelector('#examQuestions').innerHTML='<div class="exam-score-head" aria-hidden="true"><span>Test / Ders</span><span>Doğru</span><span>Yanlış</span><span>Boş</span><span>Net</span></div>'+tests.map(test=>'<fieldset class="exam-score-row"><legend>'+esc(test.label)+' <small>('+test.max+' soru)</small></legend>'+['correct','wrong','blank'].map((key,i)=>'<label><span>'+['Doğru','Yanlış','Boş'][i]+'</span><input class="input" type="number" inputmode="numeric" step="1" min="0" max="'+test.max+'" data-result="'+test.id+'" data-count="'+key+'" aria-label="'+esc(test.label)+' '+['Doğru','Yanlış','Boş'][i]+'" value="'+(draft.results[test.id]?.[key]??'')+'"></label>').join('')+'<output data-net="'+test.id+'" aria-label="'+esc(test.label)+' net"></output></fieldset>').join('');
  updateLive();window.DersSelect?.refresh();
 }
 function updateLive(){
  try{const score=core.evaluate(editor.draft);for(const test of score.tests)dialog.querySelector('[data-net="'+test.id+'"]').textContent=core.format(test.net);dialog.querySelector('#examLiveTotal').textContent=core.format(score.totalNet)+' / '+score.maximum+' net'+(score.complete?'':' · Kısmi');dialog.querySelector('#examFormError').textContent='';}
  catch(e){dialog.querySelector('#examLiveTotal').textContent='—';dialog.querySelector('#examFormError').textContent=e.message;}
 }
 async function act(action,id,view){
  const row=cache.get(view.sid)?.rows.find(row=>row.id===id);
  if(action==='new')return create(null,view.exam);
  if(action==='refresh')return load(view.sid,true);
  if(!row)return;
  if(action==='edit'&&view.sid===owner)return create(row);
  if(action==='detail'){const score=core.evaluate(row);show(row.name,'<p>'+esc(row.exam_type)+' · '+core.date(row.exam_date)+' · '+esc(row.publisher)+'</p><p>'+esc(row.note)+'</p><strong>'+core.format(score.totalNet)+' / '+score.maximum+' net'+(score.complete?'':' · Kısmi')+'</strong><div class="exam-detail-list">'+score.tests.map(t=>'<div><strong>'+esc(t.label)+'</strong><span>Doğru: '+core.format(t.counts[0])+' · Yanlış: '+core.format(t.counts[1])+' · Boş: '+core.format(t.counts[2])+'</span><b>'+core.format(t.net)+' net</b></div>').join('')+'</div>');}
  if(action==='delete'&&view.sid===owner){if(busy||!confirm('“'+row.name+'” denemesi silinsin mi? Diğer kayıtların değişmeyecek.'))return;busy=true;try{await rpc('delete',{id:row.id,revision:row.revision});board.toast('Deneme silindi');await load(view.sid,true);}catch(e){board.toast(message(e));}finally{busy=false;}}
 }
 function route(){
  syncOwner();for(const host of mounts.keys())if(!host.isConnected)mounts.delete(host);
  if(window.DersUI?.route==='exams'&&owner)mount(document.getElementById('examsPage'));
 }
 document.addEventListener('ders:render',()=>{const previous=owner;syncOwner();if(previous!==owner)route();});
 document.addEventListener('ders:route',route);
 window.addEventListener('online',route);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){route();for(const [host,view] of mounts)if(host.isConnected)load(view.sid);}});
 window.DersExams={mount,unmount:host=>mounts.delete(host),refresh:()=>load(owner,true),create,rpc};
 route();
})();
