(() => {
  const panel = document.getElementById('teacherPanel');
  const roleSelect = document.getElementById('roleSelect');
  let overview = null, owner = null, snapshot = '', busy = false;
  let draft = [{ category: '', title: '', detail: '', xp: 100 }];
  let shownStudent = null, studentData = null;
  const esc = value => window.DersBoard.escape(String(value ?? ''));
  const labels = { pending: 'Onay bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi', revoked: 'Bağlantı kaldırıldı', accepted: 'Kabul edildi' };
  const button = (text, action, id = '', extra = '') => `<button class="button" type="button" data-action="${action}" data-id="${esc(id)}" ${extra}>${text}</button>`;
  const input = (label, id, type = 'text', value = '') => `<label class="field">${label}<input class="input" id="${id}" type="${type}" value="${esc(value)}" ${type === 'number' ? 'min="5" max="10000" step="5"' : ''}></label>`;
  const row = (title, detail, controls = '') => `<div class="teacher-item"><strong>${esc(title)}</strong><span class="sync-status">${esc(detail)}</span><div class="signed-in-actions">${controls}</div></div>`;
  async function rpc(action, payload = {}) {
    if (!window.DersBoard.user || !navigator.onLine) throw new Error('Bu işlem için internet bağlantısı ve giriş gerekli.');
    const { data, error } = await window.DersBoard.client.rpc('ders_action', { p_action: action, p_payload: payload });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data;
  }
  async function refresh() {
    const uid = window.DersBoard.user?.id || null;
    if (owner !== uid) { overview = null; snapshot = ''; closeDialog(); owner = uid; }
    if (!uid) { render(); return; }
    try {
      const data = await rpc('overview');
      if (owner !== uid) return;
      overview = data;
      if (shownStudent && !overview.connections.some(c => c.student_id === shownStudent && c.status === 'approved')) closeDialog();
      render();
    } catch (error) {
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
    const next = JSON.stringify([uid, overview]);
    if (snapshot === next && !force) return;
    snapshot = next;
    roleSelect.disabled = Boolean(overview?.profile);
    if (!uid) { roleSelect.disabled = true; panel.textContent = 'Öğretmen bağlantıları için giriş yap.'; return; }
    if (!overview) { panel.textContent = 'Hesap bilgileri yükleniyor.'; return; }
    if (!overview.profile) {
      roleSelect.disabled = false;
      panel.innerHTML = input('Adın', 'profileName') + button('Hesabımı hazırla', 'init');
      return;
    }
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
    for (const c of connections.filter(c => c.status === 'pending' || c.status === 'approved')) {
      const controls = teacher && c.status === 'pending'
        ? button('Onayla', 'connection-approve', c.id) + button('Reddet', 'connection-reject', c.id)
        : c.status === 'approved' ? (teacher ? button('İlerlemeyi gör', 'student', c.student_id) : '') + button('Bağlantıyı kaldır', 'disconnect', c.id) : '';
      panel.insertAdjacentHTML('beforeend', row(c.name, labels[c.status], controls));
    }
    if (!connections.some(c => c.status === 'approved' || c.status === 'pending')) panel.insertAdjacentHTML('beforeend', '<p class="sync-status">Henüz öğretmen-öğrenci bağlantısı yok.</p>');
    if (teacher && approved.length) {
      panel.insertAdjacentHTML('beforeend', `<form id="assignmentForm" class="program-composer">
        <h3>Haftalık program gönder</h3><label class="field">Öğrenci<select class="select" id="assignmentStudent">${approved.map(c => `<option value="${esc(c.student_id)}">${esc(c.name)}</option>`).join('')}</select></label>
        <div class="modal-grid">${input('Hafta adı', 'assignmentName')}${input('Tarih aralığı', 'assignmentRange')}</div>
        <div id="assignmentDraft"></div><div class="signed-in-actions">${button('Quest ekle', 'draft-add')}${button('Bu haftayı kopyala', 'draft-copy')}<button class="button primary" type="submit">Programı gönder</button></div>
      </form>`);
      renderDraft();
      document.getElementById('assignmentForm').onsubmit = event => { event.preventDefault(); run('send'); };
    }
    for (const a of overview.assignments) {
      const detail = `${a.name} · ${a.week_range || a.week_name} · ${labels[a.status]} · ${a.quests?.length || 0} quest`;
      const controls = !teacher && a.status === 'pending' ? button('Programı kontrol et', 'review', a.id) : button('Görevleri gör', 'review', a.id);
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
    wrap.innerHTML = draft.map((q, i) => `<div class="draft-row" data-index="${i}">
      <input class="input" aria-label="Kategori" data-key="category" value="${esc(q.category)}" placeholder="Ders">
      <input class="input" aria-label="Görev adı" data-key="title" value="${esc(q.title)}" placeholder="Görev adı">
      <input class="input" aria-label="Açıklama" data-key="detail" value="${esc(q.detail)}" placeholder="Örn. 30 soru ve analiz">
      <input class="input" aria-label="XP" type="number" min="5" max="10000" data-key="xp" value="${q.xp}">
      ${button('Sil', 'draft-delete', i)}</div>`).join('');
    wrap.oninput = event => { const field = event.target.dataset.key, i = event.target.closest('[data-index]')?.dataset.index;
      if (field && i !== undefined) draft[i][field] = field === 'xp' ? Number(event.target.value) : event.target.value; };
  }
  const dialog = document.createElement('dialog'); dialog.className = 'ders-dialog'; document.body.append(dialog);
  function closeDialog() { dialog.close(); shownStudent = null; studentData = null; }
  function showDialog(title, body) {
    closeDialog(); dialog.innerHTML = `<div class="modal-head"><h2>${esc(title)}</h2><button class="button" type="button" id="dismissDialog" aria-label="Kapat">Kapat</button></div><div class="modal-body">${body}</div>`;
    dialog.querySelector('#dismissDialog').onclick = closeDialog; dialog.showModal();
  }
  dialog.addEventListener('cancel', closeDialog);
  function review(a) {
    const quests = a.quests || [];
    showDialog(a.week_name, `<p>${esc(a.week_range)} · ${labels[a.status]}</p>${quests.map(q => row(`${q.category_name} · ${q.title}`, `${q.detail} · ${q.xp} XP`)).join('')}
      <div class="signed-in-actions">${overview.profile.role === 'student' && a.status === 'pending' ? button('Programı kabul et', 'program-accept', a.id) + button('Programı reddet', 'program-reject', a.id) : ''}</div>`);
  }
  function studentView(data, id) {
    const s = data.state || { weeks: [], studyHistory: [] };
    showDialog(`${data.name} · İlerleme`, '<div id="studentSummary"></div>'); shownStudent = id; studentData = s;
    const wrap = dialog.querySelector('#studentSummary');
    const all = s.weeks.flatMap(w => w.quests || []); const xp = all.reduce((n,q) => n+(q.done ? q.xp : 0),0);
    wrap.innerHTML = `<strong>${xp} XP · ${all.filter(q => q.done).length}/${all.length} görev</strong><label class="field">Hafta<select id="studentWeek" class="select">${s.weeks.map(w => `<option value="${esc(w.id)}">${esc(w.range || w.name)}</option>`).join('')}</select></label><div id="studentQuests"></div><h3>Çalışma geçmişi</h3>${(s.studyHistory || []).slice(-30).reverse().map(h => row(`${h.categoryName} · ${h.title}`, `${h.detail} · ${h.xp} XP · ${new Date(h.completedAt).toLocaleString('tr-TR')}`)).join('')}`;
    const select = wrap.querySelector('#studentWeek');
    const draw = () => { const w = s.weeks.find(w => w.id === select.value); wrap.querySelector('#studentQuests').innerHTML = (w?.quests || []).map(q => row(q.title, `${q.detail} · ${q.done ? 'Tamamlandı' : 'Bekliyor'} · ${q.xp} XP`)).join(''); };
    select.onchange = draw; draw();
  }
  function editQuest(q, w, change = false) {
    showDialog(change ? 'Değişiklik iste' : 'Quest düzenle', `<form id="questEditForm">${input('Görev adı','editTitle','text',q.title)}${input('Açıklama','editDetail','text',q.detail)}${input('XP','editXp','number',q.xp)}<p id="editError" role="alert"></p><button class="button primary" type="submit">${change ? 'İsteği gönder' : 'Kaydet'}</button></form>`);
    dialog.querySelector('#questEditForm').onsubmit = async event => {
      event.preventDefault(); const changes = { title: dialog.querySelector('#editTitle').value.trim(), detail: dialog.querySelector('#editDetail').value.trim(), xp: Number(dialog.querySelector('#editXp').value) };
      if (!changes.title || !Number.isInteger(changes.xp) || changes.xp < 5 || changes.xp > 10000) { dialog.querySelector('#editError').textContent = 'Görev adı ve 5–10000 XP gerekli.'; return; }
      try {
        if (change) await rpc('request_change', { quest_id: q.assignedQuestId, changes });
        else window.DersBoard.editQuest(q.id, w.id, changes);
        closeDialog(); await refresh(); window.DersBoard.toast(change ? 'Değişiklik isteği gönderildi' : 'Quest güncellendi');
      } catch (error) { dialog.querySelector('#editError').textContent = error.message; }
    };
  }
  async function run(action, id) {
    if (busy) return; busy = true;
    try {
      if (action === 'init') await rpc('init_profile', { role: roleSelect.value, name: document.getElementById('profileName').value.trim() });
      else if (action === 'invite') {
        const data = await rpc('create_invite');
        const output = document.getElementById('inviteResult'); output.textContent = `${data.code} · 7 gün geçerli`; output.dataset.code = data.code; return;
      } else if (action === 'join') await rpc('request_connection', { code: document.getElementById('inviteInput').value });
      else if (action === 'connection-approve' || action === 'connection-reject') await rpc('respond_connection', { id, status: action.endsWith('approve') ? 'approved' : 'rejected' });
      else if (action === 'disconnect') { if (!confirm('Bağlantı kaldırılsın mı? Öğretmenin bu öğrenciye erişimi sona erecek.')) return; await rpc('remove_connection', { id }); closeDialog(); }
      else if (action === 'student') { studentView(await rpc('student_board', { student_id: id }), id); return; }
      else if (action === 'draft-add') { draft.push({ category:'',title:'',detail:'',xp:100 }); renderDraft(); return; }
      else if (action === 'draft-delete') { draft.splice(Number(id),1); renderDraft(); return; }
      else if (action === 'draft-copy') { draft = window.DersBoard.week().quests.map(q => ({ category: window.DersBoard.category(q.categoryId || q.subject).name, title:q.title,detail:q.detail,xp:q.xp })); renderDraft(); return; }
      else if (action === 'send') {
        await rpc('assign_program', { student_id: document.getElementById('assignmentStudent').value, week_name: document.getElementById('assignmentName').value.trim(), week_range: document.getElementById('assignmentRange').value.trim(), quests:draft });
        draft = [{ category:'',title:'',detail:'',xp:100 }]; snapshot = '';
      } else if (action === 'review') { review(overview.assignments.find(a => a.id === id)); return; }
      else if (action === 'program-accept' || action === 'program-reject') {
        await window.DersBoard.flush(); await rpc('respond_assignment', { id,status:action.endsWith('accept') ? 'accepted' : 'rejected' });
        closeDialog(); await window.DersBoard.flush();
      } else if (action === 'change-approve' || action === 'change-reject') await rpc('resolve_change', { id,status:action.endsWith('approve') ? 'approved' : 'rejected' });
      await refresh(); window.DersBoard.toast(action === 'refresh' ? 'Güncellendi' : 'İşlem tamamlandı');
    } catch (error) { window.DersBoard.toast(error.message || 'İşlem tamamlanamadı.'); }
    finally { busy = false; }
  }
  function onAction(event) { const target = event.target.closest('[data-action]'); if (target) { event.preventDefault(); run(target.dataset.action,target.dataset.id); } }
  panel.addEventListener('click', onAction); dialog.addEventListener('click', onAction);
  window.DersTeacher = { refresh, render, editQuest, requestChange: (q,w) => editQuest(q,w,true) };
  refresh();
})();
