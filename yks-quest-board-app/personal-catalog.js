(() => {
  const catalog = window.DersCurriculum;
  const exam = document.getElementById('manualExam');
  const lesson = document.getElementById('manualSubject');
  const group = document.getElementById('manualTopicCategory');
  const topic = document.getElementById('manualTopic');
  const detail = document.getElementById('manualDetail');
  let subjects = new Map(), categories = [], initialized = false;
  const key = text => text.normalize('NFC').trim().toLocaleLowerCase('tr-TR');
  const knownLessons = new Set(catalog.exams.flatMap(e => catalog.lessons(e)).map(key));
  function fill(select, entries, value) {
    select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
    select.value = entries.some(([v]) => v === value) ? value : '';
  }
  fill(exam, catalog.exams.map(e => [e,e]), 'TYT');
  function drawTopics() {
    const entry = subjects.get(lesson.value);
    const groups = entry ? catalog.categories(exam.value, entry.lesson) : [];
    fill(group, [['','Kategori seç'], ...groups.map(g => [g,g])], group.value);
    group.disabled = !groups.length;
    const topics = entry ? catalog.topics(exam.value, entry.lesson, group.value) : [];
    fill(topic, [['','Alt konu seç'], ...topics.map(t => [t,t]), ['__manual','Özel konu']], topic.value || '__manual');
    topic.disabled = !entry;
    window.DersSelect?.refresh();
  }
  function render(nextCategories) {
    categories = nextCategories;
    const previous = subjects.get(lesson.value), current = lesson.value;
    subjects = new Map();
    for (const name of catalog.lessons(exam.value)) {
      const existing = categories.find(c => key(c.name) === key(name));
      const value = existing?.id || 'catalog:' + encodeURIComponent(name);
      subjects.set(value, { lesson: name, label: name, categoryId: existing?.id || null });
    }
    // Preserve personal lessons, including duplicate names, without mixing another exam's catalog lessons.
    for (const c of categories) if (!subjects.has(c.id) && (!knownLessons.has(key(c.name)) || catalog.lessons(exam.value).some(l => key(l) === key(c.name)))) {
      const name = catalog.lessons(exam.value).find(l => key(l) === key(c.name)) || c.name;
      const duplicates = [...subjects.values()].filter(s => key(s.lesson) === key(name)).length;
      subjects.set(c.id, { lesson: name, label: duplicates ? `${c.name} (${duplicates + 1})` : c.name, categoryId: c.id });
    }
    let value = subjects.has(current) ? current : [...subjects].find(([,s]) => s.lesson === previous?.lesson)?.[0] || '';
    if (!initialized) value = subjects.has(categories[0]?.id) ? categories[0].id : subjects.keys().next().value || '';
    initialized = true;
    fill(lesson, [['','Ders seç'], ...[...subjects].map(([v,s]) => [v,s.label])], value);
    document.getElementById('addQuestButton').disabled = !value;
    drawTopics();
  }
  function clearTopic() {
    topic.value = '__manual';
    window.DersSelect?.refresh();
  }
  exam.addEventListener('change', () => {
    lesson.value = ''; group.value = ''; clearTopic(); subjects.clear(); render(categories);
  });
  lesson.addEventListener('change', () => {
    group.value = ''; clearTopic(); drawTopics();
    document.getElementById('addQuestButton').disabled = !subjects.has(lesson.value);
  });
  group.addEventListener('change', () => { clearTopic(); drawTopics(); });
  topic.addEventListener('change', () => {
    if (topic.value === '__manual') detail.focus();
  });
  window.DersPersonalCatalog = {
    render, clearTopic,
    selection(description = '') {
      const entry = subjects.get(lesson.value);
      if (!entry) return null;
      const selectedTopic = catalog.topics(exam.value, entry.lesson, group.value).includes(topic.value);
      // Custom quests still need a legacy-compatible title, but never a second text field.
      const title = selectedTopic ? topic.value : Array.from(description.trim().split(/\r?\n/, 1)[0]).slice(0, 120).join('');
      return { ...entry, title, examType: exam.value, topicCategory: selectedTopic ? group.value : '' };
    },
    reset() {
      initialized = false; subjects.clear(); exam.value = 'TYT'; lesson.value = ''; group.value = '';
      clearTopic(); document.getElementById('manualDetail').value = ''; document.getElementById('manualXp').value = '100';
    }
  };
})();
