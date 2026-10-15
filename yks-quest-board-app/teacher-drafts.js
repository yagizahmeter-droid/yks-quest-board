(() => {
  const key = (owner,student) => `ders.teacher-drafts.v1:${owner}:${student}`;
  function load(owner,student) {
    const saved = JSON.parse(localStorage.getItem(key(owner,student)) || '{"active":null,"entries":[]}');
    if (!Array.isArray(saved.entries) || saved.entries.some(d => !d.id || !Array.isArray(d.quests))) throw new Error('Taslak kaydı okunamadı. Mevcut kayıt korunuyor.');
    return saved;
  }
  function write(owner,student,book) {
    try { localStorage.setItem(key(owner,student),JSON.stringify(book)); }
    catch { throw new Error('Taslak cihazda saklanamadı. Açık taslak korundu; depolama alanını kontrol et.'); }
  }
  window.DersTeacherDrafts = {
    load,
    save(owner,student,draft) { const book=load(owner,student), entry=structuredClone(draft), i=book.entries.findIndex(d=>d.id===entry.id);if(i<0)book.entries.push(entry);else book.entries[i]=entry;book.active=entry.id;write(owner,student,book);return entry; },
    remove(owner,student,id) { const book=load(owner,student);book.entries=book.entries.filter(d=>d.id!==id);book.active=book.entries.at(-1)?.id || null;write(owner,student,book);return book; }
  };
})();
