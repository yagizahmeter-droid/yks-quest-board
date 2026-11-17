(() => {
 function finishVisualClose(root,done){if(window.DersUI?.finishModal)return window.DersUI.finishModal(root,done);done();return true;}

  const board = window.DersBoard, trigger = document.getElementById('adminButton');
  if (!board || !trigger) return;
  let owner = null, generation = 0, allowed = false, checking = null, subscribed = false, previewToken = 0;
  let noteId = null, noteSnapshot = '', notes = [];
  const dialog = document.createElement('dialog');
  dialog.className = 'ders-dialog admin-dialog'; dialog.id = 'adminDialog';
  dialog.setAttribute('aria-labelledby', 'adminTitle');
  dialog.innerHTML = `<header class="admin-heading"><h2 id="adminTitle">Yönetici Paneli</h2><button type="button" class="icon-button" id="adminClose" aria-label="Yönetici panelini kapat" title="Kapat"><i data-lucide="x"></i></button></header>
    <p class="admin-status" id="adminStatus" role="status"></p>
    <div class="admin-toolbar"><div class="segmented" role="group" aria-label="Rol önizleme">
    <div class="admin-preview-option"><button type="button" class="button" data-preview-role="student"><i data-lucide="circle-user-round"></i>Öğrenci</button><button type="button" class="button" data-preview-tab="student" aria-label="Öğrenci · Yeni Sekmede Aç"><i data-lucide="arrow-up-right"></i>Yeni Sekmede Aç</button></div>
    <div class="admin-preview-option"><button type="button" class="button" data-preview-role="teacher"><i data-lucide="graduation-cap"></i>Öğretmen</button><button type="button" class="button" data-preview-tab="teacher" aria-label="Öğretmen · Yeni Sekmede Aç"><i data-lucide="arrow-up-right"></i>Yeni Sekmede Aç</button></div></div>
    <button type="button" class="button" id="adminReturn" hidden><i data-lucide="arrow-left"></i>Admin Paneline Dön</button>
    <button type="button" class="button" id="adminReset" hidden><i data-lucide="rotate-ccw"></i>Örnek Verileri Sıfırla</button></div>
    <div id="adminPreview" hidden></div>
    <section id="adminNotesSection"><h3>Test Notlarım</h3>
    <form id="adminNoteForm" class="admin-note-form">
      <div class="admin-note-fields"><label class="field">Not Türü<select class="select" id="adminNoteKind"><option value="bug">Hata</option><option value="suggestion">Öneri</option><option value="test">Test</option></select></label>
      <label class="field">İlgili Görünüm<select class="select" id="adminNoteContext"><option value="student">Öğrenci</option><option value="teacher">Öğretmen</option><option value="appearance">Görünüm</option></select></label></div>
      <label class="field">Ekran<input class="input" id="adminNoteScreen" maxlength="120" value="Programım" required></label>
      <label class="field">Not<textarea class="textarea" id="adminNoteBody" maxlength="4000" required rows="4"></textarea></label>
      <div><button class="button primary" type="submit" id="adminSaveNote"><i data-lucide="check"></i>Notu Kaydet</button></div>
      <p id="adminNoteStatus" role="status" class="admin-status"></p>
    </form><ul class="admin-notes" id="adminNoteList"></ul>
    <h3>İşlem Geçmişim</h3><ul class="admin-notes" id="adminEventList"></ul></section>`;
  document.body.append(dialog);
  const $ = id => dialog.querySelector('#' + id);
  let currentRole = null;
  const publicAssets = new Map();
  const appBase = new URL('./',location.href);
  const scripts = ['theme.js','sync.js','vendor/lucide.js','password-policy.js','week-dates.js','motion-ledger.js','motion.js','motion-ui.js','quest-system.js','curriculum.js','personal-catalog.js','program-import.js','history-groups.js','focus-core.js','study.js','learning-ui.js','teacher-drafts.js','program-composer.js','teacher.js','select-controls.js','ui.js','appearance.js','backgrounds.js','release-history.js'];
  const styles = ['ui.css','appearance.css','quest-ui.css','v111.css','admin.css','v113.css','v114.css','motion.css','motion-widgets.css','motion-ui.css'];
  scripts.push('exams-core.js','exams.js','experience.js','class-model.js','class-dom.js','classes.js','teacher-workspace.js','program-tools.js','teacher-insights.js','program-schedules.js','teacher-actions.js');styles.push('exams.css','v121.css','classes.css','teacher-workspace.css');
  const assetPaths = new Map([...scripts,...styles,'admin-preview.js','admin-preview-classes.js','admin-preview-workspace.js','assets/background-light.webp','assets/background-dark.webp','assets/brand-mark.svg','assets/theme-vine.svg','assets/theme-cloud-light.svg','assets/theme-cloud-dark.svg'].map(name=>[new URL(name,appBase).pathname,name]));
  const failure = (code,details = {}) => Object.assign(new Error(code),{code,...details});
  let cancelFrame = null;
  const previewTabs = new Set();
  const tabCurrent = task => previewTabs.has(task) && !task.tab.closed && allowed && task.uid === board.user?.id && task.generation === generation;
  function disposeTab(task,closeTab=true) {
    previewTabs.delete(task); clearTimeout(task.timer);
    // With opener severed, browsers disallow cross-origin window.close(). Ask
    // the isolated page to close itself instead; the channel carries no data.
    if(closeTab)try{if(task.prepared){task.port?.postMessage({type:'ders-demo-revoke'});task.tab.postMessage({type:'ders-demo-revoke',channel:task.channel},'*');}else task.tab.close();}catch{}
    const port=task.port;if(port)setTimeout(()=>port.close(),1000);
    task.reject?.(failure('cancelled')); task.reject=null;
  }
  function workerPolicy(controller) {
    if(!controller)return Promise.resolve(true);
    return new Promise(resolve=>{
      const channel=new MessageChannel();
      const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value);};
      const timer=setTimeout(()=>finish(false),700);
      channel.port1.onmessage=e=>finish(e.data?.type==='ders-demo-navigation-policy'&&e.data.excluded===true);
      try{controller.postMessage({type:'ders-demo-navigation-policy'},[channel.port2]);}catch{finish(false);}
    });
  }
  async function safeDemoNavigation() {
    // Older offline workers fall back to the real index.html. Fail closed until
    // the active worker confirms that both demo navigation paths are excluded.
    const sw=navigator.serviceWorker;
    if(sw?.controller && !await workerPolicy(sw.controller)){
      try{const registration=await sw.getRegistration();await registration?.update();}catch{}
      const deadline=Date.now()+8000;let safe=false;
      while(Date.now()<deadline){if(await workerPolicy(sw.controller)){safe=true;break;}await new Promise(r=>setTimeout(r,300));}
      if(!safe)throw failure('worker');
    }
    const response=await fetch(new URL('admin-preview.html',appBase),{cache:'no-store'});
    const csp=response.headers.get('content-security-policy')||'',sandbox=csp.split(';').map(s=>s.trim()).find(s=>s.startsWith('sandbox '));
    if(!response.ok||new URL(response.url).origin!==location.origin||!sandbox||sandbox!=='sandbox allow-scripts allow-forms')throw failure('isolation');
  }
  function probeTab(task) {
    if(!tabCurrent(task)){disposeTab(task);return;}
    if(task.prepared)try{task.tab.postMessage({type:'ders-demo-probe',channel:task.channel},'*');}catch{}
  }
  window.addEventListener('message',async event=>{
    if(event.origin!=='null'||event.data?.type!=='ders-demo-shell-ready')return;
    const task=[...previewTabs].find(t=>event.source===t.tab&&event.data.channel===t.channel);
    if(!task||task.booting||!task.prepared||!tabCurrent(task))return;
    task.booting=true;
    try{
      if(!await authorize()||!tabCurrent(task)){disposeTab(task);return;}
      task.port?.close();const bridge=new MessageChannel();task.port=bridge.port1;
      bridge.port1.onmessage=e=>{
        if(!tabCurrent(task)||e.data?.type!=='ders-admin-preview'||e.data.channel!==task.channel)return;
        if(e.data.state==='ready'){clearTimeout(task.timer);task.booting=false;task.resolve?.();task.resolve=null;task.reject=null;}
        if(e.data.state==='error'){task.reject?.(failure('start'));disposeTab(task);}
      };
      task.tab.postMessage({type:'ders-demo-render',channel:task.channel,html:task.html},'*',[bridge.port2]);
    }catch{task.reject?.(failure('start'));disposeTab(task);}
  });
  async function previewTab(role) {
    if(!['student','teacher'].includes(role)||!allowed||!dialog.open)return;
    if(!['http:','https:'].includes(location.protocol)){$('adminStatus').textContent='Yeni sekme için uygulamayı HTTPS web adresinden veya yerel geliştirme sunucusundan aç.';return;}
    // Open during the trusted click, before authorization/asset awaits, so the
    // browser creates a genuine tab. Sever opener before any demo code runs.
    const tab=window.open('about:blank','_blank');
    if(!tab){$('adminStatus').textContent='Tarayıcı yeni sekmeyi engelledi. Bu site için açılır pencerelere izin verip yeniden dene.';return;}
    const task={tab,role,uid:board.user?.id,generation,channel:crypto.randomUUID()};previewTabs.add(task);
    try{
      tab.opener=null;tab.document.title='D.E.R.S. · Örnek Görünüm';tab.document.body.textContent='Güvenli örnek görünüm hazırlanıyor…';
      if(!await authorize()||!tabCurrent(task))throw failure('authorization');
      $('adminStatus').textContent='Yeni sekmede örnek görünüm hazırlanıyor…';
      await recordEvent('preview_open',role);
      const html=await previewDocument(role,task.channel,true);
      await safeDemoNavigation();
      if(!tabCurrent(task))throw failure('cancelled');
      task.html=html;
      const started=new Promise((resolve,reject)=>{task.resolve=resolve;task.reject=reject;task.timer=setTimeout(()=>reject(failure('start')),15000);});
      tab.location.replace(new URL('admin-preview.html#demo='+task.channel,appBase).href);task.prepared=true;
      probeTab(task);await started;
      if(tabCurrent(task))$('adminStatus').textContent=(role==='teacher'?'Öğretmen':'Öğrenci')+' örnek görünümü yeni sekmede açıldı. Değişiklikler yalnızca o sekmede kalır.';
    }catch(error){
      disposeTab(task);publicAssets.clear();
      if(task.uid!==board.user?.id)return;
      const messages={authorization:'Yönetici yetkisi doğrulanamadı. Yeniden giriş yapıp dene.',worker:'Güvenli önizleme için uygulamanın çevrimdışı sürümü güncellenmeli. Sayfayı yenileyip yeniden dene.',isolation:'Örnek sekmenin güvenli yalıtımı doğrulanamadı. Panel içindeki önizlemeyi kullanabilir veya yeniden deneyebilirsin.',assets:'Önizleme dosyaları yüklenemedi. Bağlantını kontrol edip yeniden dene.',cancelled:'Örnek sekme kapatıldı veya oturum değişti.',start:'Yeni sekme başlatılamadı. Sayfayı yenileyip yeniden dene.'};
      $('adminStatus').textContent=messages[error.code]||messages.start;
      console.warn('D.E.R.S. demo tab failed',{role,code:error.code||'start'});
    }
  }
  function ownedAsset(value) {
    try { const url = new URL(value,appBase); return url.origin === appBase.origin ? assetPaths.get(url.pathname) : null; }
    catch { return null; }
  }
  function asset(path, image = false) {
    const name = ownedAsset(path);
    if (!name) throw failure('template');
    const url = new URL(name,appBase);
    if (!publicAssets.has(url.href)) publicAssets.set(url.href,(async()=>{
      const response = await fetch(url);
      const mime = response.headers.get('content-type') || '';
      const validType = name.endsWith('.js') ? /javascript|ecmascript/.test(mime) : name.endsWith('.css') ? /text\/css/.test(mime) : name.endsWith('.svg') ? /image\/svg[+]xml/.test(mime) : /image\/webp/.test(mime);
      if (!response.ok || new URL(response.url).origin !== location.origin || !validType) throw failure('assets',{resource:name,status:response.status});
      if (!image) return response.text();
      const blob = await response.blob();
      return new Promise((resolve,reject)=>{
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
      });
    })().catch(error=>{publicAssets.delete(url.href);throw error.code ? error : failure('assets',{resource:name});}));
    return publicAssets.get(url.href);
  }
  function ready(frame,channel) {
    return new Promise((resolve,reject)=>{
      const finish = error => {
        clearTimeout(timer); window.removeEventListener('message',receive);
        if (cancelFrame === cancel) cancelFrame = null;
        error ? reject(error) : resolve();
      };
      const cancel = () => finish(failure('cancelled'));
      const receive = event => {
        if (event.source !== frame.contentWindow || event.origin !== 'null' || event.data?.type !== 'ders-admin-preview' || event.data.channel !== channel) return;
        if (event.data.state === 'ready') finish();
        if (event.data.state === 'error') finish(failure('start'));
      };
      const timer = setTimeout(()=>finish(failure('start')),12000);
      cancelFrame = cancel; window.addEventListener('message',receive);
    });
  }
  function stopPreview() {
    previewToken++; cancelFrame?.(); $('adminPreview').replaceChildren(); $('adminPreview').hidden = true;
    $('adminReturn').hidden = true; $('adminReset').hidden = true; $('adminNotesSection').hidden = false;
    currentRole = null;
    dialog.querySelectorAll('[data-preview-role]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  }
  function close(force = false) {
    if (!force && !window.DersUI.canLeave(dialog)) return;
    stopPreview();return finishVisualClose(dialog,()=>{dialog.close();window.DersUI.modalClosed('admin');});
    if (!trigger.hidden) trigger.focus({preventScroll:true});
  }
  function revoke(clearDraft = true) {
    [...previewTabs].forEach(task=>disposeTab(task));
    allowed = false; trigger.hidden = true; stopPreview();
    if (dialog.open) close(true);
    $('adminNoteList').replaceChildren(); $('adminEventList').replaceChildren(); notes = [];
    if (clearDraft) { $('adminNoteBody').value = ''; noteId = null; noteSnapshot = ''; window.DersUI.clearDirty(dialog); }
  }
  async function authorize() {
    const uid = board.user?.id;
    if (!uid) { generation++; checking = null; revoke(); return false; }
    if (!navigator.onLine) { generation++; checking = null; revoke(false); return false; }
    if (uid !== owner) { generation++; owner = uid; checking = null; revoke(); }
    if (checking) return checking;
    const token = generation;
    const job = (async () => {
      try {
        const result = await board.client.rpc('ders_admin_status');
        if (token !== generation || uid !== board.user?.id) return false;
        if (result.error) { revoke(false); return false; }
        allowed = result.data === true;
        trigger.hidden = !allowed;
        if (!allowed) revoke();
        return allowed;
      } catch { if (token === generation) revoke(false); return false; }
    })();
    checking = job;
    try { return await job; } finally { if (checking === job) checking = null; }
  }
  function renderNotes() {
    const list = $('adminNoteList'); list.replaceChildren();
    if (!notes.length) { list.textContent = 'Henüz test notu yok.'; return; }
    const labels = {bug:'Hata',suggestion:'Öneri',test:'Test',student:'Öğrenci',teacher:'Öğretmen',appearance:'Görünüm'};
    for (const note of notes) {
      const li = document.createElement('li'), heading = document.createElement('strong');
      heading.textContent = labels[note.kind] + ' · ' + labels[note.context] + ' · ' + note.screen;
      const body = document.createElement('p'); body.textContent = note.body;
      const time = document.createElement('time'); time.dateTime = note.created_at;
      time.textContent = new Date(note.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'});
      li.append(heading, body, time); list.append(li);
    }
  }
  async function loadNotes() {
    const uid = owner, token = generation;
    const result = await board.client.from('ders_admin_notes').select('id,kind,context,screen,body,created_at').order('created_at',{ascending:false}).limit(100);
    if (uid !== board.user?.id || token !== generation || !allowed) return;
    if (result.error) { $('adminNoteStatus').textContent = 'Notlar yüklenemedi. Paneli yeniden açarak tekrar deneyebilirsin.'; return; }
    notes = result.data; renderNotes();
  }
  async function recordEvent(action, context = 'admin') {
    const uid = owner;
    const result = await board.client.rpc('ders_admin_record_event',{p_id:crypto.randomUUID(),p_action:action,p_context:context});
    if (result.error || uid !== board.user?.id || !allowed) throw new Error('İşlem geçmişi kaydedilemedi. Yeniden dene.');
  }
  async function loadEvents() {
    const uid = owner, token = generation;
    const result = await board.client.from('ders_admin_events').select('action,context,created_at').order('created_at',{ascending:false}).limit(100);
    if (uid !== board.user?.id || token !== generation || !allowed) return;
    const list = $('adminEventList'); list.replaceChildren();
    if (result.error) { list.textContent = 'İşlem geçmişi yüklenemedi.'; return; }
    const labels = {panel_open:'Panel açıldı',preview_open:'Rol önizlemesi açıldı',preview_return:'Admin paneline dönüldü',sample_reset:'Örnek veriler sıfırlandı',note_saved:'Test notu kaydedildi',student:'Öğrenci',teacher:'Öğretmen',appearance:'Görünüm',admin:'Yönetici'};
    for (const event of result.data) {
      const item = document.createElement('li'), title = document.createElement('strong'), time = document.createElement('time');
      title.textContent = labels[event.action] + ' · ' + labels[event.context];
      time.dateTime = event.created_at; time.textContent = new Date(event.created_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'});
      item.append(title,document.createElement('br'),time); list.append(item);
    }
    if (!result.data.length) list.textContent = 'Henüz işlem yok.';
  }
  async function open() {
    if (!await authorize()) { board.toast('Yönetici yetkisi doğrulanamadı.'); return; }
    window.DersUI.closeNavigationForModal();
    $('adminStatus').textContent = 'Rol önizlemeleri örnek veriler kullanır. Test notlarını yalnızca sen görebilirsin.';
    dialog.showModal(); window.DersUI.openModal('admin', dialog, close);
    window.DersUI.clearDirty(dialog); $('adminClose').focus();
    try { await recordEvent('panel_open'); } catch (error) { $('adminStatus').textContent = error.message; }
    await Promise.all([loadNotes(),loadEvents()]);
  }
  async function previewDocument(role,channel,standalone=false){
      const [response,brand] = await Promise.all([fetch(new URL('index.html',appBase), {cache:'no-store'}).catch(()=>{throw failure('assets',{resource:'index.html'});}),asset('./assets/brand-mark.svg')]);
      if (!response.ok || new URL(response.url).origin !== location.origin || !(response.headers.get('content-type') || '').includes('text/html')) throw failure('assets',{resource:'index.html',status:response.status});
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const mark = new DOMParser().parseFromString(brand,'image/svg+xml').getElementById('ders-mark');
      if (mark) doc.querySelectorAll('.brand-mark use').forEach(use => use.replaceWith(...[...mark.childNodes].map(node=>doc.importNode(node,true))));
      // Opaque-origin sandbox plus CSP: no cookies/storage, parent access, API calls or form navigation.
      const found = new Set();
      doc.querySelectorAll('script[src]').forEach(script=>{
        const name = ownedAsset(script.getAttribute('src'));
        if (!scripts.includes(name) || found.has(name)) script.remove();
        else { found.add(name); script.setAttribute('src',new URL(name,appBase).href); }
      });
      const core = [...doc.querySelectorAll('script:not([src])')].filter(script=>script.textContent.includes('const STORAGE_KEY = "yksQuestBoard.v1"') && script.textContent.includes('window.DersBoard ='));
      if (core.length !== 1 || scripts.some(name=>!found.has(name))) throw failure('template');
      doc.querySelectorAll('script:not([src])').forEach(script=>{if (script !== core[0]) script.remove();});
      doc.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
        const name = ownedAsset(link.getAttribute('href'));
        if (!styles.includes(name)) link.remove();
        else link.setAttribute('href',new URL(name,appBase).href);
      });
      doc.querySelectorAll('link[rel="manifest"],link[rel="icon"],link[rel="apple-touch-icon"]').forEach(el=>el.remove());
      const base = doc.createElement('base'); base.href = new URL('./', location.href).href;
      const csp = doc.createElement('meta'); csp.httpEquiv = 'Content-Security-Policy';
      csp.content = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; frame-src 'none'; worker-src 'none'; form-action 'none'; base-uri ${location.origin}`;
      const runtime = doc.createElement('script'); runtime.src = new URL('./admin-preview.js', location.href).href;
      runtime.dataset.role = role;
      runtime.dataset.previewChannel = channel; runtime.dataset.parentOrigin = location.origin;
      runtime.dataset.appearance = JSON.stringify({choice:window.DersTheme.choice,style:window.DersTheme.style,accent:window.DersTheme.accent,monochrome:window.DersTheme.monochrome,background:window.DersBackgrounds.selected});
      const classRuntime=doc.createElement('script');classRuntime.src=new URL('./admin-preview-classes.js',location.href).href;
      const workspaceRuntime=doc.createElement('script');workspaceRuntime.src=new URL('./admin-preview-workspace.js',location.href).href;
      if(standalone){base.remove();csp.content=csp.content.replace(`base-uri ${location.origin}`,"base-uri 'none'");runtime.dataset.previewTarget='tab';doc.head.prepend(csp,classRuntime,workspaceRuntime,runtime);}
      else doc.head.prepend(csp,base,classRuntime,workspaceRuntime,runtime);
      // The opaque sandbox has no Vercel cookie. Inline only public static assets
      // fetched by the parent; never pass authentication or account state into it.
      const [light,dark] = await Promise.all([asset('./assets/background-light.webp',true),asset('./assets/background-dark.webp',true)]);
      const decorations=await Promise.all(['theme-vine.svg','theme-cloud-light.svg','theme-cloud-dark.svg'].map(async name=>[name,await asset('./assets/'+name,true)]));
      await Promise.all([...doc.querySelectorAll('script[src]')].map(async script => {
        const source = await asset(script.getAttribute('src'));
        script.removeAttribute('src'); script.textContent = source.replace(/<[/]script/gi,'<' + String.fromCharCode(92) + '/script');
      }));
      await Promise.all([...doc.querySelectorAll('link[rel="stylesheet"]')].map(async link => {
        const style = doc.createElement('style');
        style.textContent = (await asset(link.getAttribute('href'))).split('./assets/background-light.webp').join(light).split('./assets/background-dark.webp').join(dark);
        for(const [name,data] of decorations)style.textContent=style.textContent.split('./assets/'+name).join(data);
        link.replaceWith(style);
      }));
      doc.querySelectorAll('script:not([src])').forEach(script => {
        script.textContent = script.textContent.replace('if ("serviceWorker" in navigator)', 'if (false)');
      });
      return '<!doctype html>' + doc.documentElement.outerHTML;
  }
  async function preview(role, resetting = false) {
    if (!['student','teacher'].includes(role) || !await authorize() || !dialog.open) return;
    if (!['http:','https:'].includes(location.protocol)) {
      stopPreview();
      $('adminStatus').textContent = 'Rol önizlemesi dosyadan açılamaz. Uygulamayı HTTPS web adresinden veya yerel geliştirme sunucusundan açıp yönetici hesabınla giriş yap.';
      return;
    }
    try { await recordEvent(resetting ? 'sample_reset' : 'preview_open',role); }
    catch (error) { $('adminStatus').textContent = error.message; return; }
    stopPreview(); const token = previewToken, uid = owner;
    $('adminStatus').textContent = 'Örnek görünüm hazırlanıyor…';
    try {
      const channel=crypto.randomUUID(),html=await previewDocument(role,channel);
      if (token !== previewToken || uid !== board.user?.id || !allowed || !dialog.open) return;
      const frame = document.createElement('iframe'); frame.className = 'admin-frame';
      frame.title = (role === 'student' ? 'Öğrenci' : 'Öğretmen') + ' örnek görünümü';
      frame.setAttribute('sandbox','allow-scripts allow-forms'); frame.referrerPolicy = 'no-referrer';
      frame.style.visibility = 'hidden'; frame.inert = true;
      const started = ready(frame,channel);
      frame.srcdoc = html;
      $('adminPreview').replaceChildren(frame); $('adminPreview').hidden = false;
      await started;
      if (token !== previewToken || uid !== board.user?.id || !allowed || !dialog.open) return;
      frame.style.removeProperty('visibility'); frame.inert = false;
      $('adminReturn').hidden = false; $('adminNotesSection').hidden = true;
      $('adminReset').hidden = false; currentRole = role;
      if (!$('adminNoteBody').value.trim()) { $('adminNoteContext').value = role; $('adminNoteScreen').value = role === 'teacher' ? 'Öğretmen' : 'Programım'; }
      dialog.querySelectorAll('[data-preview-role]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.previewRole === role)));
      $('adminStatus').textContent = 'Örnek veriler · Değişiklikler bu önizlemede kalır. Görünüm değişince sıfırlanır.';
    } catch (error) {
      if (token !== previewToken || uid !== board.user?.id || !dialog.open || error.code === 'cancelled') return;
      publicAssets.clear(); stopPreview();
      const messages = {
        assets:'Önizleme dosyaları yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.',
        template:'Sayfa önizleme için hazırlanamadı. Sayfayı yenileyip tekrar dene.',
        start:'Önizleme başlatılamadı. Sayfayı yenileyip tekrar dene.'
      };
      $('adminStatus').textContent = messages[error.code] || messages.start;
      console.warn('D.E.R.S. admin preview failed',{role,code:error.code || 'start',resource:error.resource,status:error.status});
    }
  }
  $('adminNoteForm').onsubmit = async event => {
    event.preventDefault();
    const body = $('adminNoteBody').value.trim();
    if (!body || body.length > 4000) return;
    const draft = {kind:$('adminNoteKind').value,context:$('adminNoteContext').value,screen:$('adminNoteScreen').value.trim(),body};
    if (!draft.screen) return;
    const snapshot = JSON.stringify(draft);
    if (snapshot !== noteSnapshot) { noteId = crypto.randomUUID(); noteSnapshot = snapshot; }
    const id = noteId, uid = board.user?.id;
    $('adminSaveNote').disabled = true;
    try {
      if (!await authorize()) throw new Error('Yönetici yetkisi doğrulanamadı.');
      const result = await board.client.from('ders_admin_notes').insert({id,user_id:uid,...draft});
      if (uid !== board.user?.id) return;
      if (result.error && result.error.code !== '23505') throw result.error;
      // Same id on retry prevents duplicate notes after a lost response.
      if (result.error) {
        const saved = await board.client.from('ders_admin_notes').select('body,kind,context,screen').eq('id',id).single();
        if (saved.error || Object.keys(draft).some(key => saved.data[key] !== draft[key])) throw result.error;
      }
      if ($('adminNoteBody').value.trim() === body) $('adminNoteBody').value = '';
      noteId = null; noteSnapshot = ''; $('adminNoteStatus').textContent = 'Not kaydedildi.';
      window.DersUI.clearDirty($('adminNoteForm')); await Promise.all([loadNotes(),loadEvents()]);
    } catch { if (uid === board.user?.id) $('adminNoteStatus').textContent = 'Not kaydedilemedi. Metnin korundu; yeniden deneyebilirsin.'; }
    finally { $('adminSaveNote').disabled = false; }
  };
  trigger.onclick = open;
  $('adminClose').onclick = () => close();
  $('adminReturn').onclick = async () => {
    const role=currentRole,token=previewToken,uid=owner;
    if(!role||!await authorize()||uid!==owner||token!==previewToken||!dialog.open)return;
    try { await recordEvent('preview_return',role);if(uid!==owner||token!==previewToken||!dialog.open)return;stopPreview();$('adminStatus').textContent='Test notlarını kaydedebilirsin.';await loadEvents(); }
    catch (error) { $('adminStatus').textContent = error.message; }
  };
  $('adminReset').onclick = () => {
    if (currentRole && confirm('Yalnızca açık örnek görünüm sıfırlansın mı? Test notların ve hesabın korunur.')) preview(currentRole,true);
  };
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dialog.querySelectorAll('[data-preview-role]').forEach(b => b.onclick = () => preview(b.dataset.previewRole));
  dialog.querySelectorAll('[data-preview-tab]').forEach(b => b.onclick = () => previewTab(b.dataset.previewTab));
  function observeSession() {
    for(const task of previewTabs){if(task.tab.closed)disposeTab(task,false);else probeTab(task);}
    const uid = board.user?.id || null;
    if (uid !== owner) { generation++; owner = uid; checking = null; revoke(); if (uid) authorize(); }
    if (!subscribed && board.client) {
      subscribed = true;
      board.client.auth.onAuthStateChange(() => setTimeout(() => { observeSession(); authorize(); },0));
    }
  }
  setInterval(observeSession, 1000);
  setInterval(() => { if ((dialog.open || previewTabs.size) && !document.hidden) authorize(); },15000);
  window.addEventListener('focus', authorize);
  window.addEventListener('offline', () => { generation++; checking = null; revoke(false); });
  window.addEventListener('online', authorize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) authorize(); });
  observeSession();
})();
