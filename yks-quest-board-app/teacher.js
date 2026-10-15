(() => {
  const panel = document.getElementById('teacherPanel');
  const roleSelect = document.getElementById('roleSelect');
  let overview = null, owner = null, snapshot = '', busy = false;
  const freshQuest = () => ({ exam_type: 'TYT', category: '', topic_category: '', topic_name: '', topic_scope: '', title: '', detail: '', xp: 100, repeat_kind: 'none', repeat_target: 1 });
  let draft = [freshQuest()];
  let viewToken = 0;
  const drafts = new Map();
  let shownStudent = null, studentData = null;
  let composer = null, sendAfter=0;
  const esc = value => window.DersBoard.escape(String(value ?? ''));
  const labels = { pending: 'Onay bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi', revoked: 'Bağlantı kaldırıldı', accepted: 'Kabul edildi', withdrawn: 'Geri çekildi' };
  const button = (text, action, id = '', extra = '') => `<button class="button" type="button" data-action="${action}" data-id="${esc(id)}" ${extra}>${text}</button>`;
  const input = (label, id, type = 'text', value = '') => `<label class="field">${label}<input class="input" id="${id}" type="${type}" value="${esc(value)}" ${type === 'number' ? 'min="5" max="10000" step="5"' : ''}></label>`;
  const row = (title, detail, controls = '') => `<div class="teacher-item"><strong>${esc(title)}</strong><span class="sync-status">${esc(detail)}</span><div class="signed-in-actions">${controls}</div></div>`;
  function resetOwner(uid) {
    if (owner === uid) return;
    overview = null; snapshot = ''; closeDialog(true); owner = uid;
    composer = null; draft = [freshQuest()]; drafts.clear();
  }
  async function rpc(action, payload = {}) {
    if (!window.DersBoard.user || !navigator.onLine) throw new Error('Bu işlem için internet bağlantısı ve giriş gerekli.');
    const uid = window.DersBoard.user.id;
    const { data, error } = await window.DersBoard.client.rpc('ders_action', { p_action: action, p_payload: payload });
    if (window.DersBoard.user?.id !== uid) throw new Error('Oturum değişti. İşlemi yeniden başlat.');
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data;
  }
  async function refresh() {
    const uid = window.DersBoard.user?.id || null;
    resetOwner(uid);
    if (!uid) { render(); return; }
    try {
      const data = await rpc('overview');
      if (owner !== uid) return;
      overview = data;
      window.DersQuests.setServerTime(data.server_now);
      if (shownStudent && !overview.connections.some(c => c.student_id === shownStudent && c.status === 'approved')) { const id = shownStudent; closeDialog(true); drafts.delete(id); }
      render();
    } catch (error) {
      if (owner !== uid) return;
      if (!overview) {
        panel.textContent = 'Öğretmen sistemi yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.';
        panel.append(makeButton('Yeniden dene', refresh));
      }
      console.error(error);
    }
  }
  function makeButton(text, handler) {
    const b = document.createElement('button'); b.className = 'button'; b.type = 'button'; b.textContent = text; b.onclick = handler; return b;
  }
  function render(force = false) {
    const uid = window.DersBoard.user?.id;
    resetOwner(uid || null);
    const next = JSON.stringify([uid, overview]);
    window.DersUI?.setTeacherInfo(uid ? overview : null);
    if (snapshot === next && !force) return;
    snapshot = next;
    roleSelect.disabled = Boolean(overview?.profile);
    if (!uid) { roleSelect.disabled = true; panel.textContent = 'Öğretmen bağlantıları için giriş yap.'; return; }
    if (!overview) { panel.textContent = 'Hesap bilgileri yükleniyor.'; return; }
    if (!overview.profile) {
      roleSelect.disabled = false;
      roleSelect.dataset.draft = '';
      panel.innerHTML = '<div class="profile-init" data-draft>' + input('Adın', 'profileName') + button('Hesabımı hazırla', 'init') + '</div>';
      return;
    }
    window.DersUI?.clearDirty(roleSelect);
    const teacher = overview.profile.role === 'teacher';
    roleSelect.value = overview.profile.role;
    window.DersBoard.setProfile(overview.profile);
    const connections = overview.connections;
    const approved = connections.filter(c => c.status === 'approved');
    panel.innerHTML = `<div class="sync-head"><strong>${esc(overview.profile.display_name)} · ${teacher ? 'Öğretmen' : 'Öğrenci'}</strong>${button('Yenile', 'refresh')}</div>`;
    if (teacher) {
      panel.insertAdjacentHTML('beforeend', `<div class="teacher-tools">${button('Davet kodu oluştur', 'invite')}<output id="inviteResult" class="invite-result"></output></div>`);
    } else {
      panel.insertAdjacentHTML('beforeend', `<div class="teacher-tools">${input('Öğretmen davet kodu', 'inviteInput')}${button('Bağlantı iste', 'join')}</div>`);
    }
    if (teacher) panel.insertAdjacentHTML('beforeend', `<div class="student-grid">${approved.map(c => `<button class="student-card" type="button" data-action="student" data-id="${esc(c.student_id)}"><span class="avatar" aria-hidden="true">${esc(c.name.slice(0,1))}</span><span><strong>${esc(c.name)}</strong><small>Bağlı öğrenci</small></span><i data-lucide="chevron-right"></i></button>`).join('')}</div>`);
    for (const c of connections.filter(c => c.status === 'pending' || (!teacher && c.status === 'approved'))) {
      const controls = teacher && c.status === 'pending'
        ? button('Onayla', 'connection-approve', c.id) + button('Reddet', 'connection-reject', c.id)
        : c.status === 'approved' ? (teacher ? button('İlerlemeyi gör', 'student', c.student_id) : '') + button('Bağlantıyı kaldır', 'disconnect', c.id) : '';
      panel.insertAdjacentHTML('beforeend', row(c.name, labels[c.status], controls));
    }
    if (!connections.some(c => c.status === 'approved' || c.status === 'pending')) panel.insertAdjacentHTML('beforeend', '<p class="sync-status">Henüz öğretmen-öğrenci bağlantısı yok.</p>');
    for (const a of overview.assignments) {
      const detail = `${a.name} · ${a.week_range || a.week_name} · ${labels[a.status]} · ${a.quests?.length || 0} quest`;
      const controls = (!teacher && a.status === 'pending' ? button('Programı kontrol et', 'review', a.id) : button('Görevleri gör', 'review', a.id)) + (teacher && a.status === 'pending' ? button('İsteği geri çek', 'withdraw', a.id) : '');
      panel.insertAdjacentHTML('beforeend', row(a.week_name, detail, controls));
    }
    for (const r of overview.requests) {
      const proposal = r.requested_changes;
      panel.insertAdjacentHTML('beforeend', row(`${r.name} · ${r.title}`, `${labels[r.status]} · Öneri: ${proposal.title} — ${proposal.detail} · ${proposal.xp} XP`,
        teacher && r.status === 'pending' ? button('Değişikliği onayla', 'change-approve', r.id) + button('Reddet', 'change-reject', r.id) : ''));
    }
  }
  function renderDraft() {
    const wrap = document.getElementById('assignmentDraft'); if (!wrap) return;
    const options = (values, selected, placeholder) => `<option value="">${placeholder}</option>${values.map(v => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join('')}`;
    wrap.innerHTML = draft.map((q, i) => {
      // `category` is the persisted lesson; topic_category is only catalog navigation.
      const catalog = window.DersCurriculum;
      const group = q.topic_category || catalog.categoryFor(q.exam_type, q.category, q.title);
      const topics = catalog.topics(q.exam_type, q.category, group);
      const legacy = q.title && !q.topic_scope && !topics.includes(q.title);
      if (!legacy && q.title && !q.topic_scope) { q.topic_scope = 'topic'; q.topic_name = q.title; q.topic_category = group; }
      const selected = legacy ? '__legacy' : q.topic_scope === 'category' ? '__category' : q.topic_name;
      if (!legacy) q.title = catalog.taskTitle(group, q.topic_name, q.topic_scope);
      return `<fieldset class="teacher-quest-draft" data-index="${i}"><legend>Quest ${i+1}</legend><div class="builder-grid">
      <label class="field">Sınav<select class="select" aria-label="Sınav türü" data-key="exam_type">${window.DersCurriculum.exams.map(v => `<option ${v === q.exam_type ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field">Ders<select class="select" aria-label="Ders" data-key="category" data-searchable>${options(window.DersCurriculum.lessons(q.exam_type), q.category, 'Ders seç')}</select></label>
      <label class="field">Kategori<select class="select" aria-label="Konu kategorisi" data-key="topic_category" data-searchable ${!q.category ? 'disabled' : ''}>${options(catalog.categories(q.exam_type, q.category), group, 'Kategori seç')}</select></label>
      <label class="field">Alt konu<select class="select" aria-label="Konu" data-key="topic" data-searchable ${!group && !legacy ? 'disabled' : ''}>${options(topics, selected, 'Alt konu seç')}${group ? `<option value="__category" ${selected === '__category' ? 'selected' : ''}>Genel</option>` : ''}${legacy ? `<option value="__legacy" selected>Eski görev · ${esc(q.title)}</option>` : ''}</select></label>
      <div class="field builder-title"><span>Görev</span><output data-role="derived-title">${esc(q.title) || '—'}</output></div>
      <label class="field builder-detail">Açıklama<textarea class="textarea" data-key="detail" aria-label="Açıklama" maxlength="500">${esc(q.detail)}</textarea></label>
      <label class="field">XP<input class="input" aria-label="XP" type="number" min="5" max="10000" data-key="xp" value="${q.xp}" required></label>
      <label class="field">Tekrar<select class="select" data-key="repeat_kind" aria-label="Tekrar türü">${[['none','Tek sefer'],['weekly','Haftalık tekrar'],['daily','Günlük görev']].map(([v,l]) => `<option value="${v}" ${q.repeat_kind === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${q.repeat_kind === 'weekly' ? `<label class="field">Tekrar sayısı<input class="input" type="number" min="1" max="100" data-key="repeat_target" aria-label="Tekrar sayısı" value="${q.repeat_target}" required></label>` : ''}
      ${q.repeat_kind==='daily'&&q.starts_on?`<label class="field">Görevin başlangıcı<input class="input" type="date" data-key="starts_on" value="${esc(q.starts_on)}" required></label><label class="field">Görevin bitişi<input class="input" type="date" data-key="ends_on" value="${esc(q.ends_on)}" required></label>`:''}</div>
      <button class="icon-button" type="button" data-action="draft-delete" data-id="${i}" title="Quest sil" aria-label="Quest ${i+1} sil"><i data-lucide="trash-2"></i></button></fieldset>`;
    }).join('');
    wrap.oninput = event => { const field = event.target.dataset.key, i = event.target.closest('[data-index]')?.dataset.index;
      if (field && i !== undefined && !['exam_type','category','topic_category','topic','repeat_kind'].includes(field)) draft[i][field] = ['xp','repeat_target'].includes(field) ? Number(event.target.value) : event.target.value; };
    wrap.onchange = event => {
      const field = event.target.dataset.key, i = event.target.closest('[data-index]')?.dataset.index; if (i === undefined) return;
      const q = draft[i], value = event.target.value;
      if (field === 'exam_type') { q.exam_type = value; q.category = ''; q.topic_category = ''; q.topic_name = ''; q.topic_scope = ''; q.title = ''; }
      else if (field === 'category') { q.category = value; q.topic_category = ''; q.topic_name = ''; q.topic_scope = ''; q.title = ''; }
      else if (field === 'topic_category') { q.topic_category = value; q.topic_name = ''; q.topic_scope = ''; q.title = ''; }
      else if (field === 'topic' && value !== '__legacy') { q.topic_scope = value === '__category' ? 'category' : value ? 'topic' : ''; q.topic_name = value === '__category' ? null : value; q.title = window.DersCurriculum.taskTitle(q.topic_category, q.topic_name, q.topic_scope); }
      else if (field === 'repeat_kind') { q.repeat_kind = value; q.repeat_target = value === 'weekly' ? 5 : 1;delete q.starts_on;delete q.ends_on; }
      else return;
      renderDraft(); wrap.querySelector(`[data-index="${i}"] [data-key="${field}"]`)?.focus();
    };
  }
  const dialog = document.createElement('dialog'); dialog.id = 'questDialog'; dialog.className = 'ders-dialog'; document.body.append(dialog);
  function closeDialog(force = false, nextRoute) {
    if (!force && busy) { window.DersBoard.toast('İşlem sürüyor. Biraz bekle.'); return false; }
    if (!force && window.DersUI && !window.DersUI.canLeave(dialog)) return false;
    try{rememberComposer();}catch(error){if(!force){window.DersBoard.toast(error.message);return false;}}
    viewToken++; dialog.close(); dialog.replaceChildren(); shownStudent = null; studentData = null;
    window.DersUI?.clearDirty(dialog); window.DersUI?.modalClosed('teacher-dialog', nextRoute); return true;
  }
  function showDialog(title, body) {
    if (dialog.open && window.DersUI && !window.DersUI.canLeave(dialog)) return false;
    viewToken++; rememberComposer(); dialog.close(); shownStudent = null; studentData = null; window.DersUI?.clearDirty(dialog);
    dialog.innerHTML = `<div class="modal-head"><h2>${esc(title)}</h2><button class="icon-button" type="button" id="dismissDialog" aria-label="Kapat" title="Kapat"><i data-lucide="x"></i></button></div><div class="modal-body">${body}</div>`;
    dialog.querySelector('#dismissDialog').onclick = () => closeDialog(); dialog.showModal();
    window.DersUI?.openModal('teacher-dialog', dialog, closeDialog);
    return true;
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  function rememberComposer() {
    const form = document.getElementById('assignmentForm'); if (!form || !shownStudent) return;
    const entry = { id:composer.id, quests:structuredClone(draft), name:document.getElementById('assignmentName').value, range:document.getElementById('assignmentRange').value, start:document.getElementById('assignmentStart').value, end:document.getElementById('assignmentEnd').value };
    window.DersTeacherDrafts.save(owner,shownStudent,entry); drafts.set(shownStudent,entry); return entry;
  }
  function programForm() {
    const day = window.DersQuests.today();
    const book = window.DersTeacherDrafts.load(owner,shownStudent);
    composer = structuredClone(drafts.get(shownStudent) || book.entries.find(d=>d.id===book.active) || { id:crypto.randomUUID(), quests:[freshQuest()], name:'',range:'',start:day,end:new Date(Date.parse(day+'T12:00:00Z')+6*86400000).toISOString().slice(0,10) });
    draft = structuredClone(composer.quests);
    document.getElementById('studentWorkspace').innerHTML = `<form id="assignmentForm" class="program-composer"><input type="hidden" id="assignmentStudent" value="${esc(shownStudent)}"><div class="modal-grid">${input('Hafta adı','assignmentName','text',composer.name)}${input('Tarih aralığı','assignmentRange','text',composer.range)}</div><div class="modal-grid">${input('Günlük görev başlangıcı','assignmentStart','date',composer.start)}${input('Günlük görev bitişi','assignmentEnd','date',composer.end)}</div><div id="assignmentDraft"></div><p id="assignmentError" role="alert"></p><div class="signed-in-actions">${button('<i data-lucide="plus"></i>Quest ekle','draft-add')}${button('<i data-lucide="copy"></i>Bu haftayı kopyala','draft-copy')}<button class="button primary" type="submit"><i data-lucide="send"></i>Programı gönder</button></div></form>`;
    const templates = overview.assignments.filter(a => a.student_id === shownStudent && ['accepted','pending'].includes(a.status));
    document.getElementById('assignmentDraft').insertAdjacentHTML('beforebegin', `<div class="modal-grid"><label class="field">Taslak<select class="select" id="assignmentDraftSelect" data-ui-transient="true">${[...book.entries.filter(d=>d.id!==composer.id),composer].map(d=>`<option value="${esc(d.id)}" ${d.id===composer.id?'selected':''}>${esc(d.name || 'Adsız taslak')}</option>`).join('')}</select></label>${button('<i data-lucide="trash-2"></i>Taslağı sil','draft-remove')}</div><label class="field">Kopyalanacak hafta<select class="select" id="assignmentTemplate" data-ui-transient="true"><option value="current">Açık taslak</option><option value="own">Kişisel haftam · ${esc(window.DersBoard.week().name)}</option>${templates.map(a => `<option value="${esc(a.id)}">${esc(a.week_name)} · ${labels[a.status]}</option>`).join('')}</select></label>`);
    document.getElementById('assignmentDraftSelect').onchange = event => { rememberComposer();const selected=window.DersTeacherDrafts.load(owner,shownStudent).entries.find(d=>d.id===event.target.value);if(selected){drafts.set(shownStudent,selected);programForm();} };
    const form=document.getElementById('assignmentForm');form.onsubmit = e => { e.preventDefault(); run('send'); };
    form.addEventListener('input',()=>queueMicrotask(()=>{if(form.isConnected)try{rememberComposer();}catch(error){document.getElementById('assignmentError').textContent=error.message;}}));
    form.addEventListener('change',event=>{if(['assignmentStart','assignmentEnd'].includes(event.target.id)){draft.forEach(q=>{delete q.starts_on;delete q.ends_on;});renderDraft();}if(form.isConnected)try{rememberComposer();}catch(error){document.getElementById('assignmentError').textContent=error.message;}});
    renderDraft(); window.DersUI?.clearDirty(dialog);
  }
  function openStudent(id) {
    const c = overview.connections.find(c => c.student_id === id && c.status === 'approved');
    if (!c || !showDialog(c.name, `<div class="segmented student-tabs" role="tablist" aria-label="Öğrenci yönetimi">${[['Program hazırla','student-program'],['İlerlemeyi gör','student-progress'],['Deneme sonuçları','student-results']].map(([label,action]) => button(label,action,'',`role="tab" aria-selected="${action==='student-program'}"`)).join('')}</div><div id="studentWorkspace" role="tabpanel"></div><div class="student-disconnect">${button('Bağlantıyı kaldır','disconnect',c.id)}</div>`)) return;
    shownStudent = id;
    const tabs = [...dialog.querySelectorAll('[role="tab"]')];
    tabs.forEach((tab, i) => { tab.id = 'student-tab-'+i; tab.tabIndex = i===0 ? 0 : -1; tab.setAttribute('aria-controls','studentWorkspace'); tab.onkeydown = event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key==='Home' ? 0 : event.key==='End' ? tabs.length-1 : (i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length; tabs[next].focus(); tabs[next].click();
    }; });
    document.getElementById('studentWorkspace').setAttribute('aria-labelledby',tabs[0].id); programForm();
  }
  async function studentTab(action) {
    const wrap = document.getElementById('studentWorkspace'); if (!wrap || !shownStudent || !window.DersUI?.canLeave(wrap)) return;
    rememberComposer(); window.DersUI?.clearDirty(wrap);
    const token = ++viewToken, uid = owner, id = shownStudent;
    dialog.querySelectorAll('[role="tab"]').forEach(b => { const selected = b.dataset.action === action; b.tabIndex = selected ? 0 : -1; b.setAttribute('aria-selected',String(selected)); b.classList.toggle('is-active',selected); if(selected)wrap.setAttribute('aria-labelledby',b.id); });
    if (action === 'student-program') { programForm(); return; }
    if (action === 'student-results') { wrap.innerHTML = '<div class="empty-state"><i data-lucide="chart-no-axes-combined"></i><h3>Coming Soon — Yakında!</h3></div>'; return; }
    wrap.innerHTML = '<p role="status">İlerleme yükleniyor…</p>';
    const data = await rpc('student_board',{student_id:id});
    if (token !== viewToken || uid !== owner || id !== shownStudent || !dialog.open || !overview.connections.some(c => c.student_id === id && c.status === 'approved')) return;
    studentView(data,id);
  }
  function review(a) {
    const quests = a.quests || [];
    showDialog(a.week_name, `<p>${esc(a.week_range)} · ${labels[a.status]}</p>${quests.map(q => row(`${q.exam_type ? q.exam_type + ' · ' : ''}${q.category_name} · ${q.title}`, `${q.detail} · ${q.xp} XP${q.repeat_kind === 'weekly' ? ' / tekrar · '+q.repeat_target+' tekrar' : q.repeat_kind === 'daily' ? ' / gün · '+q.starts_on+' – '+q.ends_on : ''}`)).join('')}
      <div class="signed-in-actions">${overview.profile.role === 'student' && a.status === 'pending' ? button('Programı kabul et', 'program-accept', a.id) + button('Programı reddet', 'program-reject', a.id) : ''}</div>`);
  }
  function studentView(data, id) {
    const s = data.state || { weeks: [], studyHistory: [] };
    document.getElementById('studentWorkspace').innerHTML = '<div id="studentSummary"></div>'; studentData = s;
    const wrap = dialog.querySelector('#studentSummary');
    const all = s.weeks.flatMap(w => w.quests || []); const xp = all.reduce((n,q) => n+window.DersQuests.earned(q),0);
    wrap.innerHTML = `<strong>${xp} XP · ${all.filter(q => q.done).length}/${all.length} görev</strong><label class="field">Hafta<select id="studentWeek" class="select" data-ui-transient="true">${s.weeks.map(w => `<option value="${esc(w.id)}">${esc(w.range || w.name)}${w.archived ? ' · Arşiv' : ''}</option>`).join('')}</select></label><div id="studentQuests"></div><h3>Çalışma geçmişi</h3>${(s.studyHistory || []).slice(-60).reverse().map(h => row(`${h.categoryName} · ${h.title}`, `${h.detail} · ${h.xp} XP · ${h.occurrenceDate || new Date(h.completedAt).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })} · ${new Date(h.completedAt).toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' })}`)).join('')}`;
    if (data.xpBreakdown) { const p = document.createElement('p'); p.className = 'sync-status'; p.textContent = `Rekabet ${data.xpBreakdown.competitive} XP · Kişisel ${data.xpBreakdown.personal} XP`; wrap.prepend(p); }
    const select = wrap.querySelector('#studentWeek');
    const draw = () => { const w = s.weeks.find(w => w.id === select.value); wrap.querySelector('#studentQuests').innerHTML = (w?.quests || []).map(q => row(q.title, `${q.detail} · ${window.DersQuests.describe(q)} · ${window.DersQuests.earned(q)} XP kazanıldı${window.DersQuests.recurring(q) ? ' · '+window.DersQuests.completions(q).map(e => e.date).join(', ') : ''}`)).join(''); };
    select.onchange = draw; draw();
  }
  function editQuest(q, w, change = false) {
    if (!showDialog(change ? 'Değişiklik iste' : 'Quest düzenle', `<form id="questEditForm">${input('Görev adı','editTitle','text',q.title)}${input('Açıklama','editDetail','text',q.detail)}${input('XP','editXp','number',q.xp)}<p id="editError" role="alert"></p><button class="button primary" type="submit">${change ? 'İsteği gönder' : 'Kaydet'}</button></form>`)) return;
    if (q.lockedForStudent && q.topicScope) dialog.querySelector('#editTitle').readOnly = true;
    dialog.querySelector('#questEditForm').onsubmit = async event => {
      event.preventDefault(); const changes = { title: dialog.querySelector('#editTitle').value.trim(), detail: dialog.querySelector('#editDetail').value.trim(), xp: Number(dialog.querySelector('#editXp').value) };
      if (!changes.title || !Number.isInteger(changes.xp) || changes.xp < 5 || changes.xp > 10000) { dialog.querySelector('#editError').textContent = 'Görev adı ve 5–10000 XP gerekli.'; return; }
      try {
        if (change) await rpc('request_change', { quest_id: q.assignedQuestId, changes });
        else window.DersBoard.editQuest(q.id, w.id, changes);
        closeDialog(true); await refresh(); window.DersBoard.toast(change ? 'Değişiklik isteği gönderildi' : 'Quest güncellendi');
      } catch (error) { const output = dialog.querySelector('#editError'); if (output) output.textContent = error.message; else window.DersBoard.toast(error.message); }
    };
  }
  function copyDraft() {
    const selected=document.getElementById('assignmentTemplate').value, source=rememberComposer();
    const template=overview.assignments.find(a=>a.id===selected&&a.student_id===shownStudent);
    let quests, name=source.name,range=source.range,start=source.start,end=source.end;
    if(selected==='current') quests=structuredClone(source.quests);
    else if(template){
      quests=template.quests.map(q=>({...freshQuest(),exam_type:q.exam_type||'TYT',category:q.category_name,topic_category:q.topic_category||'',topic_name:q.topic_scope==='category'?null:q.topic_name||'',topic_scope:q.topic_scope||'',title:q.title,detail:q.detail,xp:q.xp,repeat_kind:q.repeat_kind||'none',repeat_target:q.repeat_target||1,...(q.repeat_kind==='daily'?{starts_on:q.starts_on,ends_on:q.ends_on}:{})}));
      name=template.week_name;range=template.week_range;
      const daily=template.quests.filter(q=>q.repeat_kind==='daily');if(daily.length){start=daily.map(q=>q.starts_on).sort()[0];end=daily.map(q=>q.ends_on).sort().at(-1);}
    } else if(selected==='own'){
      const week=window.DersBoard.week();quests=week.quests.map(q=>({...freshQuest(),exam_type:q.examType||'TYT',category:window.DersBoard.category(q.categoryId||q.subject).name,topic_category:q.topicCategory||'',topic_name:q.topicScope==='category'?null:q.topicName||'',topic_scope:q.topicScope||'',title:q.title,detail:q.detail,xp:q.xp,repeat_kind:q.repeat?.kind||'none',repeat_target:q.repeat?.target||1}));name=week.name;range=week.range;
    } else throw new Error('Kopyalanacak hafta bulunamadı. Açık taslak korundu.');
    const copy={id:crypto.randomUUID(),quests,name:(name||'Hafta')+' — Kopya',range,start,end};
    window.DersTeacherDrafts.save(owner,shownStudent,copy);drafts.set(shownStudent,copy);programForm();window.DersBoard.toast('Bağımsız taslak oluşturuldu');
  }
  async function run(action, id) {
    if(action==='send'&&Date.now()<sendAfter)return;
    if (busy) return; busy = true;
    try {
      if (action === 'init') await rpc('init_profile', { role: roleSelect.value, name: document.getElementById('profileName').value.trim() });
      else if (action === 'invite') {
        const data = await rpc('create_invite');
        const output = document.getElementById('inviteResult'); output.textContent = `${data.code} · 7 gün geçerli`; output.dataset.code = data.code; return;
      } else if (action === 'join') await rpc('request_connection', { code: document.getElementById('inviteInput').value });
      else if (action === 'connection-approve' || action === 'connection-reject') await rpc('respond_connection', { id, status: action.endsWith('approve') ? 'approved' : 'rejected' });
      else if (action === 'disconnect') { if (!confirm('Bağlantı kaldırılsın mı? Öğretmenin bu öğrenciye erişimi sona erecek.')) return; await rpc('remove_connection', { id }); closeDialog(true); drafts.clear(); }
      else if (action === 'student') { openStudent(id); return; }
      else if (action.startsWith('student-')) { await studentTab(action); return; }
      else if (action === 'draft-add') { document.getElementById('assignmentForm').dataset.dirty='true';draft.push(freshQuest()); renderDraft(); rememberComposer(); return; }
      else if (action === 'draft-delete') { document.getElementById('assignmentForm').dataset.dirty='true';draft.splice(Number(id),1); renderDraft(); rememberComposer(); return; }
      else if (action === 'draft-copy') { copyDraft(); return; }
      else if (action === 'draft-remove') { if(!confirm('Yalnızca bu cihazdaki açık taslak silinsin mi? Gönderilmiş programlar değişmez.'))return;const book=window.DersTeacherDrafts.remove(owner,shownStudent,composer.id);drafts.delete(shownStudent);if(book.active)drafts.set(shownStudent,book.entries.find(d=>d.id===book.active));programForm();return; }
      else if (action === 'send') {
        if (draft.some(q => q.topic_scope) && !overview.capabilities?.topicCatalog) throw new Error('Konu alanlarını kaydetmek için sunucu güncellemesi gerekli. Program gönderilmedi.');
        if (draft.some(q => q.repeat_kind !== 'none') && !overview.capabilities?.repeatQuests) throw new Error('Tekrarlı görevler için sunucu güncellemesi gerekli. Program gönderilmedi.');
        const start = document.getElementById('assignmentStart').value, end = document.getElementById('assignmentEnd').value;
        const quests = draft.map(q => {const first=q.starts_on||start,last=q.ends_on||end,target=q.repeat_kind==='daily'?Math.round((Date.parse(last+'T12:00:00Z')-Date.parse(first+'T12:00:00Z'))/86400000)+1:q.repeat_kind==='weekly'?q.repeat_target:1;return { exam_type:q.exam_type, category:q.category, title:q.title.trim(), detail:q.detail.trim(), xp:q.xp, repeat_kind:q.repeat_kind, repeat_target:target, ...(q.topic_scope ? {topic_category:q.topic_category,topic_name:q.topic_name,topic_scope:q.topic_scope} : {}), ...(q.repeat_kind==='daily' ? {starts_on:first,ends_on:last} : {}) };});
        if (!document.getElementById('assignmentName').value.trim() || !quests.length || quests.some(q => !window.DersCurriculum.supports(q.exam_type,q.category) || !q.title || !Number.isInteger(q.xp) || q.xp<5 || q.xp>10000 || !Number.isInteger(q.repeat_target) || q.repeat_target<1 || q.repeat_target>100 || (q.repeat_kind==='daily' && q.repeat_target>31))) throw new Error('Hafta adı, ders, konu, geçerli XP ve tekrar hedefi gerekli. Günlük aralık 1–31 gün olabilir.');
        await rpc('assign_program', { student_id: shownStudent, week_name: document.getElementById('assignmentName').value.trim(), week_range: document.getElementById('assignmentRange').value.trim(), quests });
        sendAfter=Date.now()+500;
        window.DersUI?.clearDirty(document.getElementById('assignmentForm'));
        window.DersUI?.clearDirty(dialog); window.DersTeacherDrafts.remove(owner,shownStudent,composer.id);drafts.delete(shownStudent); programForm(); snapshot = '';
      } else if (action === 'review') { review(overview.assignments.find(a => a.id === id)); return; }
      else if (action === 'withdraw') { if (!overview.capabilities?.withdrawProgram) throw new Error('İsteği geri çekmek için sunucu güncellemesi gerekli.'); if (!confirm('Öğrencinin henüz kabul etmediği bu program isteği geri çekilsin mi?')) return; await rpc('withdraw_assignment',{id}); }
      else if (action === 'program-accept' || action === 'program-reject') {
        await window.DersBoard.flush(); await rpc('respond_assignment', { id,status:action.endsWith('accept') ? 'accepted' : 'rejected' });
        closeDialog(true, action === 'program-accept' ? 'program' : undefined); await window.DersBoard.flush();
      } else if (action === 'change-approve' || action === 'change-reject') await rpc('resolve_change', { id,status:action.endsWith('approve') ? 'approved' : 'rejected' });
      await refresh(); window.DersBoard.toast(action === 'refresh' ? 'Güncellendi' : 'İşlem tamamlandı');
    } catch (error) { const output = document.getElementById('assignmentError'); if (action === 'send' && output) output.textContent = error.message; else window.DersBoard.toast(error.message || 'İşlem tamamlanamadı.'); }
    finally { busy = false; }
  }
  function onAction(event) { const target = event.target.closest('[data-action]'); if (target) { event.preventDefault(); run(target.dataset.action,target.dataset.id); } }
  panel.addEventListener('click', onAction); dialog.addEventListener('click', onAction);
  window.DersTeacher = { refresh, render, editQuest, requestChange: (q,w) => editQuest(q,w,true) };
  refresh();
})();
