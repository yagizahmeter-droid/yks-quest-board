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
  for(const [host,view] of mounts){view.observer?.disconnect();host.replaceChildren();}
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
  syncOwner();if(!owner)return;const uidBefore=owner;
  if(loading.has(sid)){const current=loading.get(sid);if(force){await current;if(uidBefore===board.user?.id)return load(sid,true);}return current;}
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
  view.completeness ||= 'all';view.sort ||= 'desc';
  const stored=cache.get(view.sid),all=(stored?.rows||[]).filter(row=>row.exam_type===view.exam),scopes=[...new Map(all.map(row=>[core.scope(row),scopeLabel(row)])).entries()];
  if(!scopes.some(([key])=>key===view.scope))view.scope=all.length?core.scope(core.order(all).at(-1)):null;
  const records=core.order(all.filter(row=>!view.scope||core.scope(row)===view.scope)),rows=records.filter(row=>view.completeness==='all'||core.evaluate(row).complete),stats=core.stats(records),latest=stats.last&&core.evaluate(stats.last),writable=view.sid===owner&&board.state.profile?.role==='student';
  const field=(label,attribute,options,value)=>'<label class="field">'+label+'<select class="select" '+attribute+' data-ui-transient="true">'+options.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>';
  const metrics=[['count','Kayıtlı Deneme',stats.count,stats.completeCount+' tam · '+stats.partialCount+' kısmi'],['last','Son Deneme',core.format(latest?.totalNet),stats.last?core.date(stats.last.exam_date)+(latest.complete?' · Tam':' · Kısmi'):'Henüz veri yok'],['best','En Yüksek Net',core.format(stats.best),'Tam denemeler'],['average','Ortalama Net',core.format(stats.average),'Tam denemeler'],['lastFive','Son 5 Deneme Ortalaması',core.format(stats.lastFive),stats.completeCount?Math.min(5,stats.completeCount)+' son tam deneme':'Henüz tam deneme yok'],['change','İlk → Son Gelişim',core.format(stats.change),'Sınav tarihine göre tam denemeler']];
  host.innerHTML='<section class="exam-panel exam-overview"><div class="exam-toolbar"><div><h2>Denemelerim</h2><p>Gerçek sınav tarihine göre ilerlemen. Kısmi kayıtlar ayrıca işaretlenir.</p></div><div class="signed-in-actions">'+(writable?'<button class="button primary" data-exam-action="new" type="button"><i data-lucide="plus"></i>Yeni Deneme Ekle</button>':'')+button('refresh-cw','Yenile','refresh')+'</div></div><div class="exam-filters"><div class="segmented" role="group" aria-label="Deneme sınavı">'+['TYT','AYT'].map(exam=>'<button type="button" class="button '+(view.exam===exam?'is-active':'')+'" data-exam-filter="'+exam+'" aria-pressed="'+(view.exam===exam)+'">'+exam+'</button>').join('')+'</div>'+(scopes.length>1?field('Test Kapsamı','data-exam-scope',scopes,view.scope):'')+field('Grafikler ve Geçmiş','data-exam-completeness',[['all','Tüm Denemeler'],['complete','Tam Denemeler']],view.completeness)+'</div>'+(stored?.error?'<div class="exam-error" role="alert">'+esc(stored.error)+'</div>':'')+'</section>'+
   (!stored?'<p role="status">Denemeler yükleniyor…</p>':!all.length?'<section class="exam-panel empty-state"><i data-lucide="chart-no-axes-combined"></i><h2>Henüz '+view.exam+' denemesi yok</h2><p>İlk kaydından sonra netlerini ve gelişimini burada görebilirsin.</p></section>':
   '<section class="exam-panel"><h2>Genel Performans</h2><p class="exam-note">Seçili sınav ve test kapsamındaki tüm kayıtlar. Tam deneme ortalamalarına kısmi kayıtlar katılmaz.</p><div class="exam-stats">'+metrics.map(([key,label,value,note])=>'<article class="exam-metric" data-exam-stat="'+key+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+note+'</small></article>').join('')+'</div></section>'+
   '<section class="exam-panel exam-chart-section"><h2>Net Gelişimi</h2><p class="exam-note">Sınav tarihine göre sıralıdır. Kesikli çizgi ve içi boş noktalar kısmi kaydı gösterir.</p><div data-exam-chart="total"></div></section>'+
   '<section class="exam-panel exam-chart-section"><div class="exam-toolbar"><h2>Ders Performansı</h2><label class="field">Ders<select class="select" data-exam-lesson data-ui-transient="true"></select></label></div><p class="exam-note">Yalnızca bu derste doğru ve yanlış bilgisi bulunan sonuçlar kullanılır.</p><div data-exam-chart="lesson"></div></section>'+
   '<section class="exam-panel"><h2>Ders Bazlı Özet</h2><p class="exam-note">Grafik filtresindeki geçerli ders sonuçları; girilmemiş dersler sıfır net sayılmaz.</p><div class="exam-performance"></div></section>'+
   '<section class="exam-panel exam-history"><div class="exam-toolbar"><h2>Deneme Geçmişi</h2>'+field('Deneme Tarihi','data-exam-sort',[['desc','Yeniden Eskiye'],['asc','Eskiden Yeniye']],view.sort)+'</div><div class="exam-history-list">'+(rows.length?(view.sort==='desc'?[...rows].reverse():rows).map(row=>{const score=core.evaluate(row);return '<article class="exam-entry" data-exam-id="'+esc(row.id)+'"><div class="exam-entry-heading"><div><span class="chip">'+esc(row.exam_type)+(score.complete?' · Tam':' · Kısmi')+'</span><h3>'+esc(row.name)+'</h3><p>'+esc(row.publisher)+(row.publisher?' · ':'')+'<time datetime="'+row.exam_date+'">'+core.date(row.exam_date)+'</time></p></div><strong class="exam-total">'+core.format(score.totalNet)+' <small>/ '+score.maximum+' net</small></strong></div><div class="exam-entry-tests">'+score.tests.filter(t=>t.counts.some(v=>v!==null)).map(t=>'<span>'+esc(t.label)+' <b>'+core.format(t.net)+'</b></span>').join('')+'</div><div class="exam-entry-actions"><button class="button" data-exam-action="detail" data-id="'+row.id+'" type="button"><i data-lucide="notebook-tabs"></i>Detayları Gör</button>'+(writable?button('pencil','Düzenle','edit',row.id)+button('trash-2','Sil','delete',row.id):'')+'</div></article>';}).join(''):'<p class="exam-empty">Bu filtreye uygun deneme yok.</p>')+'</div></section>');
  host.onclick=event=>{const filter=event.target.closest('[data-exam-filter]');if(filter){view.exam=filter.dataset.examFilter;view.scope=null;render(host,view);return;}const control=event.target.closest('[data-exam-action]');if(control)act(control.dataset.examAction,control.dataset.id,view);};
  const scopeSelect=host.querySelector('[data-exam-scope]');if(scopeSelect)scopeSelect.onchange=()=>{view.scope=scopeSelect.value;render(host,view);};
  const mode=host.querySelector('[data-exam-completeness]');mode.onchange=()=>{view.completeness=mode.value;render(host,view);};
  const sort=host.querySelector('[data-exam-sort]');if(sort)sort.onchange=()=>{view.sort=sort.value;render(host,view);};
  view.drawCharts=null;
  if(records.length){
   const lessons=new Map();for(const row of records)for(const test of core.evaluate(row).tests)if(!lessons.has(test.id))lessons.set(test.id,test);
   const select=host.querySelector('[data-exam-lesson]');if(!lessons.has(view.lesson))view.lesson=lessons.keys().next().value;
   select.innerHTML=[...lessons.values()].map(test=>'<option value="'+test.id+'" '+(view.lesson===test.id?'selected':'')+'>'+esc(test.label)+'</option>').join('');
   view.drawCharts=()=>{if(!host.isConnected||!host.getBoundingClientRect().width)return;chart(host.querySelector('[data-exam-chart="total"]'),core.series(rows),core.evaluate(records[0]).maximum,'Net Gelişimi');chart(host.querySelector('[data-exam-chart="lesson"]'),core.series(rows,view.lesson),lessons.get(view.lesson).max,'Ders Performansı · '+lessons.get(view.lesson).label);};
   select.onchange=()=>{view.lesson=select.value;view.drawCharts();};view.drawCharts();
   host.querySelector('.exam-performance').innerHTML='<div class="exam-table-scroll"><table><thead><tr><th>Ders</th><th>Ortalama Net</th><th>En Yüksek</th><th>Son Net</th><th>Deneme</th></tr></thead><tbody>'+[...lessons.values()].map(test=>{const s=core.lessonStats(rows,test.id);return '<tr data-exam-summary="'+test.id+'"><th scope="row">'+esc(test.label)+'</th><td>'+core.format(s.average)+'</td><td>'+core.format(s.best)+'</td><td>'+core.format(s.last)+'</td><td>'+s.count+'</td></tr>';}).join('')+'</tbody></table></div>';
  }
  window.DersUI.clearDirty(host);window.DersSelect?.refresh();icons();
 }
 function chart(host,points,maximum,label){
  if(!points.length){host.innerHTML='<p class="exam-empty">Henüz bu filtrede hesaplanabilir net yok.</p>';return;}
  const width=Math.max(320,Math.round(host.getBoundingClientRect().width)||640),height=250,left=46,right=20,top=22,bottom=48,min=-maximum/4,max=maximum,range=Math.max(1,max-min),days=points.map(p=>Date.parse(p.row.exam_date+'T12:00:00Z')),gaps=days.slice(1).map((d,i)=>d-days[i]).filter(d=>d>0),step=gaps.length?Math.min(...gaps):86400000;
  const positions=points.map((p,i)=>{const same=days.filter(d=>d===days[i]).length,rank=days.slice(0,i).filter(d=>d===days[i]).length;return days[i]+rank/same*step*.25;}),first=positions[0],last=positions.at(-1);
  const x=i=>left+(first===last?.5:(positions[i]-first)/(last-first))*(width-left-right),y=n=>top+(max-n)/range*(height-top-bottom),ticks=[min,0,max/2,max];
  const lines=points.slice(1).map((p,j)=>'<polyline class="exam-chart-line '+(p.partial||points[j].partial?'partial':'')+'" points="'+x(j)+','+y(points[j].value)+' '+x(j+1)+','+y(p.value)+'"/>').join('');
  host.innerHTML='<svg class="exam-chart" viewBox="0 0 '+width+' '+height+'" role="group" aria-label="'+esc(label)+'">'+ticks.map(n=>'<line class="exam-gridline" x1="'+left+'" x2="'+(width-right)+'" y1="'+y(n)+'" y2="'+y(n)+'"/><text x="2" y="'+(y(n)+4)+'">'+core.format(n)+'</text>').join('')+lines+points.map((p,i)=>'<circle class="exam-chart-point '+(p.partial?'partial':'')+'" cx="'+x(i)+'" cy="'+y(p.value)+'" r="6" tabindex="0" role="button" data-chart-point="'+i+'" aria-label="'+esc(p.row.name+' · '+core.date(p.row.exam_date)+' · '+core.format(p.value)+' net'+(p.partial?' · Kısmi':''))+'"><title>'+esc(p.row.name+' · '+core.date(p.row.exam_date)+' · '+core.format(p.value)+' net')+'</title></circle>').join('')+'<text x="'+left+'" y="239">'+esc(core.date(points[0].row.exam_date))+'</text>'+(points.length>1?'<text text-anchor="end" x="'+(width-right)+'" y="239">'+esc(core.date(points.at(-1).row.exam_date))+'</text>':'')+'</svg>'+(points.length===1?'<p class="exam-note">Gelişim çizgisi için en az iki geçerli deneme gerekli.</p>':'')+'<output class="exam-chart-caption" aria-live="polite"></output>';
  const caption=host.querySelector('output'),info=i=>{const p=points[i];caption.textContent=p.row.name+' · '+core.date(p.row.exam_date)+' · '+core.format(p.value)+' net'+(p.partial?' · Kısmi':'');};
  for(const dot of host.querySelectorAll('[data-chart-point]')){const reveal=()=>info(Number(dot.dataset.chartPoint));dot.onpointerenter=e=>{if(e.pointerType!=='touch')reveal();};dot.onfocus=reveal;dot.onclick=reveal;dot.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();reveal();}};}info(points.length-1);
 }
 function mount(host,sid=board.user?.id){
  syncOwner();if(!host||!owner)return;const existing=mounts.get(host),view=existing?.sid===sid?existing:{sid,exam:'TYT',scope:null,lesson:null};if(existing?.sid!==sid)existing?.observer?.disconnect();mounts.set(host,view);render(host,view);if(!view.observer&&window.ResizeObserver){let width=-1;view.observer=new ResizeObserver(()=>{const next=Math.round(host.getBoundingClientRect().width);if(next!==width){width=next;view.drawCharts?.();}});view.observer.observe(host);}return load(sid);
 }
 function create(row=null,exam='TYT'){
  if(board.state.profile?.role!=='student')return board.toast('Denemeleri öğrenci hesabından ekleyebilirsin.');
  const draft=row?structuredClone(row):{id:crypto.randomUUID(),revision:0,exam_type:exam,name:'',exam_date:core.today(),publisher:'',note:'',groups:core.catalog[exam].filter(g=>exam==='TYT'||['math','science'].includes(g.id)).map(g=>({id:g.id,mode:exam==='TYT'?'total':'detail'})),results:{}};
  if(!show(row?'Denemeyi Düzenle':'Yeni Deneme','<form id="examForm" novalidate><div class="exam-meta-fields"><label class="field">Deneme Adı<input class="input" name="name" maxlength="160" required></label><label class="field">Sınav<select class="select" name="exam_type"><option>TYT</option><option>AYT</option></select></label><label class="field">Tarih<input class="input" type="date" name="exam_date" min="1900-01-01" max="2200-12-31" required></label><label class="field">Yayın / Kurum (isteğe bağlı)<input class="input" name="publisher" maxlength="160"></label></div><div id="examGroups"></div><div id="examQuestions"></div><label class="field">Not (isteğe bağlı)<textarea class="textarea" name="note" maxlength="2000" rows="3"></textarea></label><div class="exam-save-row"><output id="examLiveTotal"></output><button class="button primary" type="submit"><i data-lucide="check"></i>Kaydet</button></div><p id="examFormError" class="exam-error" role="alert"></p></form>'))return;
  editor={draft,uid:owner};const form=dialog.querySelector('form');
  for(const name of ['name','exam_type','exam_date','publisher','note'])form.elements[name].value=draft[name];
  form.oninput=event=>{const input=event.target;if(input.dataset.result){const id=input.dataset.result,key=input.dataset.count;draft.results[id]||={correct:null,wrong:null,blank:null};draft.results[id][key]=input.value===''?null:Number(input.value);draft.results[id].blank=null;updateLive();}else if(['name','exam_date','publisher','note'].includes(input.name))draft[input.name]=input.value;};
  form.elements.exam_type.onchange=()=>{
   if(Object.values(draft.results).some(v=>Object.values(v).some(n=>n!==null))&&!confirm('Sınav türünü değiştirirsen formdaki soru sayıları temizlenecek. Devam edilsin mi?')){form.elements.exam_type.value=draft.exam_type;window.DersSelect?.refresh();return;}
   draft.exam_type=form.elements.exam_type.value;draft.groups=core.catalog[draft.exam_type].filter(g=>draft.exam_type==='TYT'||['math','science'].includes(g.id)).map(g=>({id:g.id,mode:draft.exam_type==='TYT'?'total':'detail'}));draft.results={};drawFields();
  };
  form.onsubmit=async event=>{
   event.preventDefault();if(busy)return;const uid=owner,error=dialog.querySelector('#examFormError');
   try{const prepared=core.prepare(draft);core.validate(prepared);draft.results=prepared.results;}catch(e){error.textContent=e.message;return;}
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
  dialog.querySelector('#examQuestions').innerHTML='<p class="exam-entry-help">Yalnızca doğru ve yanlış sayılarını gir. İki alan da boşsa test “Girilmedi” kalır. Testin tamamı boşsa doğru ve yanlışa 0 yaz. Boş ve net otomatik hesaplanır.</p><div class="exam-score-head" aria-hidden="true"><span>Test / Ders</span><span>Doğru</span><span>Yanlış</span><span>Boş (Otomatik)</span><span>Net (Otomatik)</span></div>'+tests.map(test=>'<fieldset class="exam-score-row" data-test="'+test.id+'"><legend>'+esc(test.label)+' <small>'+test.max+' soru · <span data-score-state="'+test.id+'">Girilmedi</span></small></legend>'+['correct','wrong'].map((key,i)=>'<label><span>'+['Doğru','Yanlış'][i]+'</span><input class="input" type="number" inputmode="numeric" step="1" min="0" max="'+test.max+'" data-result="'+test.id+'" data-count="'+key+'" aria-label="'+esc(test.label)+' '+['Doğru','Yanlış'][i]+'" aria-describedby="exam-error-'+test.id+'" value="'+(draft.results[test.id]?.[key]??'')+'"></label>').join('')+'<div class="exam-derived"><span>Boş (Otomatik)</span><output data-blank="'+test.id+'" aria-label="'+esc(test.label)+' otomatik boş">—</output></div><div class="exam-derived"><span>Net (Otomatik)</span><output data-net="'+test.id+'" aria-label="'+esc(test.label)+' net">—</output></div><small id="exam-error-'+test.id+'" class="exam-row-error" data-score-error="'+test.id+'" hidden></small></fieldset>').join('');
  updateLive();window.DersSelect?.refresh();
 }
 function updateLive(){
  const draft=editor.draft,issues=[];
  for(const test of draft.groups.length?core.tests(draft.exam_type,draft.groups):[]){
   const row=dialog.querySelector('[data-test="'+test.id+'"]'),error=row.querySelector('[data-score-error]');let counts;
   try{counts=core.automaticCounts(test,draft.results[test.id]||{});if(Object.values(counts).some(n=>n!==null))draft.results[test.id]=counts;error.hidden=true;error.textContent='';row.classList.remove('has-error');row.querySelectorAll('input').forEach(e=>e.removeAttribute('aria-invalid'));}
   catch(e){issues.push(e.message);error.textContent=e.message;error.hidden=false;row.classList.add('has-error');row.querySelectorAll('input').forEach(e=>e.setAttribute('aria-invalid','true'));}
   row.querySelector('[data-blank]').textContent=counts?core.format(counts.blank):'—';row.querySelector('[data-net]').textContent=counts&&counts.correct!==null&&counts.wrong!==null?core.format(counts.correct-counts.wrong/4):'—';
   row.querySelector('[data-score-state]').textContent=!counts?'Kontrol et':Object.values(counts).every(n=>n===null)?'Girilmedi':counts.correct!==null&&counts.wrong!==null?'Girildi':'Doğru / yanlış eksik';
  }
  if(!issues.length)try{const score=core.evaluate(draft);dialog.querySelector('#examLiveTotal').textContent=core.format(score.totalNet)+' / '+score.maximum+' net'+(score.complete?' · Tam':' · Kısmi');}catch(e){issues.push(e.message);}
  if(issues.length)dialog.querySelector('#examLiveTotal').textContent='Girdileri kontrol et';dialog.querySelector('#examFormError').textContent=issues[0]||'';
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
  syncOwner();for(const host of mounts.keys())if(!host.isConnected){mounts.get(host)?.observer?.disconnect();mounts.delete(host);}
  if(window.DersUI?.route==='exams'&&owner)mount(document.getElementById('examsPage'));
 }
 document.addEventListener('ders:render',()=>{const previous=owner;syncOwner();if(previous!==owner)route();});
 document.addEventListener('ders:route',route);
 window.addEventListener('online',route);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){route();for(const [host,view] of mounts)if(host.isConnected)load(view.sid);}});
 window.DersExams={mount,unmount:host=>{mounts.get(host)?.observer?.disconnect();mounts.delete(host);},refresh:()=>load(owner,true),create,rpc};
 route();
})();
