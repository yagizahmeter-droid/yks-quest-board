(() => {
  const routes = ['home', 'program', 'teacher', 'history', 'account', 'account/signup', 'focus', 'exams'];
  const titles = { home: 'Genel Bakış', program: 'Programım', teacher: 'Öğretmen', history: 'Çalışma Geçmişi', account: 'Hesabım', 'account/signup': 'Kayıt Ol',focus:'Odak Modu',exams:'Denemelerim' };
  const privateRoutes = new Set(['program', 'teacher', 'history','focus','exams']);
  const $ = id => document.getElementById(id);
  const mobile = matchMedia('(max-width: 720px)');
  const overlays = new Map();
  let current, seenUser, intended = null, teacherInfo = null, restoring = false, popping = false, historyView = 'records';
  let callbackPending = /(?:^#|&)(?:access_token|error|error_description)=/.test(location.hash) || new URL(location.href).searchParams.has('code');
  const parse = () => { const value = location.hash.replace(/^#\/?/, ''); return routes.includes(value) ? value : 'home'; };
  const stateFor = (route, depth, modal = null) => ({ dersNav: true, route, depth, modal });
  const initial = parse();
  // Supabase must consume its callback before the router replaces the fragment.
  if (callbackPending && !window.DersBoard.authReady) current = stateFor('home', 0);
  else if (!history.state?.dersNav && initial !== 'home') {
    history.replaceState(stateFor('home', 0), '', '#/home');
    history.pushState(stateFor(initial, 1), '', '#/' + initial);
  } else history.replaceState(stateFor(initial, history.state?.depth || 0), '', '#/' + initial);
  current ||= history.state;
  try { document.body.classList.toggle('nav-compact', localStorage.getItem('ders-navigation-compact') === 'true'); } catch {}

  const baselines = new WeakMap();
  const draftSelector = '[data-draft], form, .modal-backdrop, dialog:not([data-auto-save])';
  let closedModalBack = false;
  function values(root) {
    return JSON.stringify([...root.querySelectorAll('input,select,textarea')].filter(el => !el.closest('[data-auto-save]') && el.dataset.uiTransient !== 'true').map((el,i) => [el.id || `${el.name}:${el.dataset.key || ''}:${i}`, el.type === 'file' ? [...el.files].map(f => [f.name,f.size,f.lastModified]) : ['checkbox','radio'].includes(el.type) ? el.checked : el.value]));
  }
  function scopes(root) { return root ? [...(root.matches?.(draftSelector) ? [root] : []), ...root.querySelectorAll(draftSelector)].filter(el => !el.closest('[data-auto-save]')) : []; }
  function dirty(root) { return scopes(root).some(el => el.dataset.dirty==='true' && baselines.has(el) && baselines.get(el) !== values(el)); }
  function canLeave(root) { return !dirty(root) || confirm('Kaydedilmemiş değişiklikler var. Yine de ayrılmak istiyor musun?'); }
  function activeRoot() { return overlays.get(current.modal)?.root || document.querySelector('.page-view:not([hidden])'); }
  function clearDirty(root) {
    if (!root) return;
    delete root.dataset.dirty;
    root.querySelectorAll('[data-dirty]').forEach(el => delete el.dataset.dirty);
    scopes(root).forEach(el => baselines.set(el, values(el)));
  }
  function navigate(route, options = {}) {
    if (!routes.includes(route)) route = 'home';
    if (route === current.route && !current.modal) return;
    if (!options.force && !canLeave(activeRoot())) return;
    if (privateRoutes.has(route) && window.DersBoard.authReady && !window.DersBoard.user) { intended = route; route = 'account'; }
    if (current.modal) {
      const modal = overlays.get(current.modal);
      popping = true; modal?.close(true); popping = false; overlays.delete(current.modal);
      options.replace = true;
    }
    current = stateFor(route, options.replace ? current.depth : current.depth + 1);
    history[options.replace ? 'replaceState' : 'pushState'](current, '', '#/' + route);
    draw();
    $('pageTitle').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function openModal(id, root, close) {
    overlays.set(id, { root, close });
    if (current.modal === id) return;
    const replace = Boolean(current.modal);
    current = stateFor(current.route, replace ? current.depth : current.depth + 1, id);
    history[replace ? 'replaceState' : 'pushState'](current, '', '#/' + current.route);
  }
  function modalClosed(id, nextRoute) {
    overlays.delete(id);
    if (popping || current.modal !== id) return;
    if (nextRoute) {
      current = stateFor(nextRoute, current.depth);
      history.replaceState(current, '', '#/' + nextRoute); draw();
    } else { closedModalBack = true; history.back(); }
  }
  window.addEventListener('popstate', event => {
    if (restoring) { restoring = false; return; }
    const next = event.state?.dersNav ? event.state : stateFor(parse(), 0);
    const alreadyClosed = closedModalBack; closedModalBack = false;
    if (!alreadyClosed && !canLeave(activeRoot())) {
      restoring = true;
      const delta = current.depth - next.depth;
      if (delta) history.go(delta);
      else { history.replaceState(current, '', '#/' + current.route); restoring = false; }
      return;
    }
    if (current.modal !== next.modal) {
      popping = true;
      overlays.get(current.modal)?.close(true);
      overlays.delete(current.modal);
      popping = false;
    }
    current = next;
    // Modal content is not reconstructed after it has been dismissed.
    if (current.modal && !overlays.has(current.modal)) { current = stateFor(current.route, current.depth); history.replaceState(current, '', '#/' + current.route); }
    draw();
  });
  window.addEventListener('hashchange', () => {
    if (parse() === current.route) return;
    if (!canLeave(activeRoot())) { history.replaceState(current, '', '#/' + current.route); return; }
    current = stateFor(parse(), current.depth + 1); history.replaceState(current, '', '#/' + current.route); draw();
  });
  window.addEventListener('beforeunload', event => { if (dirty(document.body)) { event.preventDefault(); event.returnValue = ''; } });

  function draw() {
    let route = current.route;
    const loading = privateRoutes.has(route) && !window.DersBoard.authReady;
    if (!loading && privateRoutes.has(route) && !window.DersBoard.user) {
      intended = route; route = 'account'; current = stateFor(route, current.depth); history.replaceState(current, '', '#/account');
    }
    document.querySelectorAll('[data-page]').forEach(el => el.hidden = loading || el.dataset.page !== route.split('/')[0]);
    $('routeLoading').hidden = !loading;
    $('pageTitle').textContent = route.startsWith('account') && !window.DersBoard.user ? (route === 'account/signup' ? 'Kayıt Ol' : 'Giriş Yap') : titles[route];
    $('pageTitle').tabIndex = -1;
    document.title = `D.E.R.S. · ${$('pageTitle').textContent}`;
    $('pageBack').hidden = route === 'home';
    document.querySelectorAll('.main-nav [data-route], .account-nav [data-route]').forEach(a => {
      if (a.dataset.route === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const signup = route === 'account/signup';
    $('signUpButton').hidden = !signup;
    $('signInButton').hidden = signup;
    $('authHeading').textContent = window.DersBoard.user ? 'Hesap Senkronizasyonu' : signup ? 'Yeni Hesap' : 'Tekrar Hoş Geldin';
    $('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
    $('authSwitch').textContent = signup ? 'Zaten hesabım var' : 'Kayıt Ol';
    $('authSwitch').dataset.route = signup ? 'account' : 'account/signup';
    $('authSwitch').href = '#/' + $('authSwitch').dataset.route;
    drawCompleted();
    icons();
    document.body.classList.toggle('focus-view',route==='focus');
    document.dispatchEvent(new CustomEvent('ders:route',{detail:route}));
  }
  function refresh() {
    const board = window.DersBoard;
    if (!board) return;
    if (callbackPending && board.authReady) {
      callbackPending = false; current = stateFor('home', 0);
      const clean = new URL(location.href); clean.searchParams.delete('code'); clean.hash = '/home';
      history.replaceState(current, '', clean.href);
    }
    const uid = board.user?.id || null;
    if (uid !== seenUser) {
      const previous = seenUser; seenUser = uid; teacherInfo = null;
      if (previous !== undefined) {
        ['manualDetail','categoryNameInput','weekNameInput','weekRangeInput','modalWeekName','modalWeekRange'].forEach(id => $(id).value = '');
        clearDirty(document.body);
        if (!uid) $('authEmail').value = '';
      }
      clearDirty($('signedOutPanel'));
      $('authPassword').value = '';
      if (uid && previous === null && current.route.startsWith('account')) navigate(intended || 'home', { replace: true, force: true });
      if (!uid && previous) navigate('account', { replace: true, force: true });
      if (uid) intended = null;
    }
    const s = board.state, week = board.week();
    const hasProgram = Boolean(week.quests.length);
    $('programEmpty').hidden = hasProgram;
    $('board').hidden = !hasProgram;
    $('subjectNav').hidden = !hasProgram;
    $('editModeButton').hidden = !hasProgram && !document.body.classList.contains('edit-mode');
    $('editModeButton').innerHTML = `<i data-lucide="${document.body.classList.contains('edit-mode') ? 'check' : 'pencil'}"></i>${document.body.classList.contains('edit-mode') ? 'Bitir' : 'Düzenle'}`;
    $('homeWeekLabel').textContent = week.customTitle ? board.weekTitle(week) : week.range || week.name;
    $('homeProgramSummary').textContent = week.quests.length ? `${week.quests.filter(q => !q.done).length} bekleyen görev` : 'Henüz program yok';
    $('homeHistorySummary').textContent = s.studyHistory.length ? `${s.studyHistory.length} çalışma kaydı` : 'Henüz kayıt yok';
    $('guestNavigation').hidden = Boolean(uid); $('memberNavigation').hidden = !uid; $('accountProfile').hidden = !uid;
    const name = s.profile?.displayName || board.user?.email?.split('@')[0] || 'Hesabım';
    const initials = name.trim().split(/\s+/).slice(0,2).map(n => n[0]).join('').toLocaleUpperCase('tr-TR');
    $('userInitials').textContent = initials; $('profileAvatar').textContent = initials; $('navigationUser').textContent = name;
    $('profileDisplayName').textContent = name;
    $('profileRole').textContent = s.profile?.displayName ? (s.profile.role === 'teacher' ? 'Öğretmen' : 'Öğrenci') : 'Hesap türü seçilmedi';
    $('accountOnboarding').hidden = !uid || Boolean(s.profile?.displayName);
    const status = $('syncStatus').textContent;
    $('navigationSync').dataset.status = uid ? (/eşitlendi/i.test(status) ? 'synced' : 'pending') : 'signed-out';
    $('navigationSync').querySelector('small').textContent = uid ? (/eşitlendi/i.test(status) ? 'Bulutla eşitlendi' : navigator.onLine ? 'Eşitleme bekliyor' : 'Çevrimdışı') : 'Oturum kapalı';
    const count = teacherInfo ? teacherInfo.connections.filter(c => c.status === 'pending').length + teacherInfo.requests.filter(r => r.status === 'pending').length + (teacherInfo.profile?.role === 'student' ? teacherInfo.assignments.filter(a => a.status === 'pending').length : 0) : 0;
    document.querySelectorAll('[data-teacher-count]').forEach(el => { el.hidden = !count; el.textContent = count; el.setAttribute('aria-label', `${count} bekleyen işlem`); });
    $('homeTeacherSummary').textContent = !uid ? 'Bağlantılar ve talepler' : count ? `${count} bekleyen işlem` : teacherInfo?.connections.some(c => c.status === 'approved') ? `${teacherInfo.connections.filter(c => c.status === 'approved').length} aktif bağlantı` : 'Henüz bağlantı yok';
    draw();
  }
  function drawCompleted() {
    $('historyList').hidden = historyView !== 'records'; $('completedHistory').hidden = historyView !== 'completed';
    if (historyView !== 'completed') return;
    const s = window.DersBoard.state, esc = window.DersBoard.escape;
    const weekFilter = $('historyWeekFilter').value, categoryFilter = $('historyCategoryFilter').value, dateFilter = $('historyDateFilter').value;
    const groups = s.weeks.filter(w => !weekFilter || w.id === weekFilter).map(w => ({ week: w, quests: w.quests.filter(q => {
      if (!q.done || (categoryFilter && (q.categoryId || q.subject) !== categoryFilter)) return false;
      if (!dateFilter) return true;
      if (window.DersQuests.recurring(q)) return window.DersQuests.completions(q).some(e => e.date === dateFilter);
      const h = s.studyHistory.find(h => h.id === q.completionId);
      if (!h) return false;
      const key = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(h.completedAt));
      return key === dateFilter;
    }) })).filter(g => g.quests.length);
    $('completedHistory').innerHTML = groups.length ? groups.map(g => `<h2 class="history-week-label">${esc(g.week.name)}</h2>${g.quests.map(q => `<article class="history-item"><strong>${esc(window.DersBoard.category(q.categoryId || q.subject).name)} · ${esc(q.title)}</strong><span class="sync-status">${esc(q.detail)} · ${window.DersQuests.earned(q)} XP</span><span class="chip completed-badge">${q.lockedForStudent ? 'Öğretmen atadı · ' : ''}Tamamlandı</span></article>`).join('')}`).join('') : '<div class="empty-state"><i data-lucide="circle-check"></i><h2>Henüz Tamamlanan Görev Yok</h2></div>';
  }
  function icons() {
    document.querySelectorAll('.edit-tools button[data-action]').forEach(b => {
      const map = { up:['arrow-up','Yukarı Taşı'], down:['arrow-down','Aşağı Taşı'], edit:['pencil','Düzenle'], delete:['trash-2','Sil'] }, v = map[b.dataset.action];
      if (v && !b.querySelector('svg, i')) { b.innerHTML = `<i data-lucide="${v[0]}"></i>`; b.title = v[1]; b.setAttribute('aria-label',v[1]); }
    });
    if (!window.lucide || !document.querySelector('i[data-lucide]')) return;
    window.lucide.createIcons();
    document.querySelectorAll('svg[data-lucide]').forEach(svg => { svg.removeAttribute('data-lucide'); svg.setAttribute('aria-hidden','true'); });
  }
  function closeSidebar(force = false, handoff = false) {
    document.body.classList.remove('drawer-open'); $('navigationBackdrop').hidden = true;
    $('sidebar').removeAttribute('role'); $('sidebar').removeAttribute('aria-modal'); $('sidebar').inert = mobile.matches;
    document.querySelector('.workspace').inert = false;
    $('toggleNavigation').setAttribute('aria-expanded', String(!mobile.matches && !document.body.classList.contains('nav-compact')));
    if (handoff) overlays.delete('navigation'); else modalClosed('navigation');
    if (force) $('toggleNavigation').focus({ preventScroll: true });
  }
  function toggleSidebar() {
    if (!mobile.matches) {
      document.body.classList.toggle('nav-compact');
      try { localStorage.setItem('ders-navigation-compact', String(document.body.classList.contains('nav-compact'))); } catch {}
      $('toggleNavigation').setAttribute('aria-expanded', String(!document.body.classList.contains('nav-compact'))); return;
    }
    if (document.body.classList.contains('drawer-open')) { closeSidebar(true); return; }
    $('sidebar').inert = false; $('sidebar').setAttribute('role','dialog'); $('sidebar').setAttribute('aria-modal','true');
    document.body.classList.add('drawer-open'); $('navigationBackdrop').hidden = false;
    document.querySelector('.workspace').inert = true; $('toggleNavigation').setAttribute('aria-expanded','true');
    openModal('navigation', $('sidebar'), closeSidebar);
    $('closeNavigation').focus();
  }
  $('toggleNavigation').onclick = toggleSidebar;
  $('closeNavigation').onclick = () => closeSidebar(true);
  $('navigationBackdrop').onclick = () => closeSidebar(true);
  mobile.addEventListener('change', () => closeSidebar(true));
  $('sidebar').inert = mobile.matches;
  $('pageBack').onclick = () => { if (current.depth > 0) history.back(); else navigate('home'); };
  $('addProgramButton').onclick = () => $('newWeekButton').click();
  $('openCategoryEditor').onclick = () => { $('categoryEditor').open = true; $('categoryNameInput').focus(); $('categoryEditor').scrollIntoView({block:'nearest'}); };
  $('openQuestEditor').onclick = () => { $('questEditor').open = true; $('manualDetail').focus(); $('questEditor').scrollIntoView({block:'nearest'}); };
  document.querySelector('[data-go-teacher]').onclick = () => navigate('teacher');
  document.querySelector('[data-account-logout]').onclick = () => { if (canLeave(activeRoot())) $('signOutButton').click(); };
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-route]');
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); navigate(link.dataset.route); }
    const historyTab = event.target.closest('[data-history-view]');
    if (historyTab) {
      historyView = historyTab.dataset.historyView;
      document.querySelectorAll('[data-history-view]').forEach(b => { b.classList.toggle('is-active', b === historyTab); b.setAttribute('aria-pressed', String(b === historyTab)); });
      drawCompleted(); icons();
    }
  });
  document.addEventListener('input', event => {
    if (event.target.dataset.uiTransient === 'true') return;
    const scope = event.target.closest('[data-draft], form, .modal-backdrop, dialog');
    if (scope && !scope.hasAttribute('data-auto-save')) scope.dataset.dirty = 'true';
  });
  document.addEventListener('keydown', event => {
    const overlay = overlays.get(current.modal);
    if (!overlay) return;
    if (event.key === 'Escape' && overlay.root.tagName !== 'DIALOG') { event.preventDefault(); if (canLeave(overlay.root)) overlay.close(true); }
    if (event.key === 'Tab') {
      const items = [...overlay.root.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(el => !el.disabled && !el.hidden && el.tabIndex >= 0 && el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  document.addEventListener('focusin', event => {
    const root = event.target.closest(draftSelector);
    if (root && root.dataset.dirty!=='true') baselines.set(root, values(root));
  });
  scopes(document.body).forEach(el => baselines.set(el,values(el)));
  new MutationObserver(records => {
    const added = new Set();
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) {
      const scope=node.closest(draftSelector);if(scope)added.add(scope);
      for(const child of scopes(node))added.add(child);
    }
    for(const el of added)if(!baselines.has(el))baselines.set(el,values(el));
  }).observe(document.body,{childList:true,subtree:true});
  document.querySelectorAll('input[name="theme"]').forEach(input => {
    input.checked = input.value === window.DersTheme.choice;
    input.onchange = () => window.DersTheme.set(input.value);
  });
  window.addEventListener('dersappearancechange', () => document.querySelectorAll('input[name="theme"]').forEach(i => i.checked = i.value === window.DersTheme.choice));
  ['historyDateFilter','historyWeekFilter','historyCategoryFilter'].forEach(id => $(id).addEventListener('change', () => { drawCompleted(); icons(); }));
  const observer = new MutationObserver(records => { if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches('i[data-lucide]') || n.querySelector('i[data-lucide]'))))) queueMicrotask(icons); });
  observer.observe(document.body, { childList:true, subtree:true });
  function authError(error) {
    if (!navigator.onLine || error.name === 'AuthRetryableFetchError') return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.';
    const messages = { invalid_credentials:'E-posta veya şifre hatalı.', email_not_confirmed:'Giriş yapmadan önce e-postanı doğrula.', user_already_exists:'Bu e-posta için zaten bir hesap var.', email_address_invalid:'Geçerli bir e-posta adresi gir.', weak_password:'Daha güçlü bir şifre seç.', over_request_rate_limit:'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.', over_email_send_rate_limit:'E-posta gönderim sınırına ulaşıldı. Biraz sonra tekrar dene.' };
    return messages[error.code] || 'İşlem tamamlanamadı. Bilgilerini kontrol edip tekrar dene.';
  }
  window.DersUI = { refresh, navigate, openModal, modalClosed, clearDirty, canLeave, authError, closeNavigationForModal(){if(document.body.classList.contains('drawer-open'))closeSidebar(false,true);}, get route() { return current.route; }, setTeacherInfo(data) { teacherInfo = data; refresh(); } };
  refresh();
})();
