const assert = require('node:assert/strict');
const c = require('../curriculum.js');
const expected = {
  TYT: [[3,14],[4,32],[3,10],[3,11],[2,7],[2,8],[2,8],[1,8],[1,5]],
  AYT: [[4,16],[3,14],[3,12],[2,13],[3,14],[1,5],[1,4],[1,5],[1,5],[1,3],[1,5]]
};
const kpss = {
  'Türkçe': ['Sözel Akıl Yürütme', 'Dil Bilgisi', 'Yazım Kuralları'],
  'Matematik': ['Sayısal Akıl Yürütme', 'Mantıksal Akıl Yürütme'],
  'Tarih': ['Osmanlı Öncesi Türk Devletleri Tarihi', 'Osmanlı Tarihi', 'Atatürk İlkeleri ve İnkılap Tarihi', 'Çağdaş Türk ve Dünya Tarihi'],
  'Türkiye Coğrafyası': ['Türkiye’nin Fiziki Özellikleri', 'Türkiye’nin Beşerî Özellikleri', 'Türkiye’nin Ekonomik Özellikleri'],
  'Temel Yurttaşlık Bilgisi': ['Hukuk Başlangıcı', 'Anayasa ve İnsan Hakları Hukuku', 'İdare'],
  'Güncel Bilgiler': ['Türkiye ve Dünya ile İlgili Genel, Kültürel ve Sosyoekonomik Konular']
};
for (const exam of c.exams) {
  const lessons = c.lessons(exam);
  if (expected[exam]) assert.deepEqual(lessons.map(l => [c.categories(exam,l).length,c.topics(exam,l).length]),expected[exam]);
  for (const lesson of lessons) {
    assert.ok(c.supports(exam,lesson));
    const topics = c.topics(exam,lesson);
    assert.equal(new Set(topics).size,topics.length);
    for (const group of c.categories(exam,lesson)) {
      for (const topic of c.topics(exam,lesson,group)) {
        assert.ok(topic.trim()); assert.ok(topic.length<=200);
        assert.equal(c.categoryFor(exam,lesson,topic),group);
        assert.equal([...topic].filter(x=>x==='(').length,[...topic].filter(x=>x===')').length);
      }
    }
    const copy=c.topics(exam,lesson);copy.push('Mutated');assert.ok(!c.topics(exam,lesson).includes('Mutated'));
    assert.deepEqual(c.topics(exam,lesson,'not-a-category'),[]);
  }
  console.log('PASS catalog',exam,JSON.stringify({lessons:lessons.length,categories:lessons.reduce((n,l)=>n+c.categories(exam,l).length,0),topics:lessons.reduce((n,l)=>n+c.topics(exam,l).length,0)}));
}
assert.deepEqual(Object.fromEntries(c.lessons('KPSS').map(l=>[l,c.topics('KPSS',l)])),kpss);
for (const [e,l,g,t] of [
  ['TYT','Türkçe','Anlam Bilgisi','Paragrafta Anlam'],
  ['TYT','Matematik','Problemler','Yaş Problemleri'],
  ['TYT','Fizik','Elektrik ve Dalgalar','Optik'],
  ['AYT','Matematik','Analiz (LTI)','Türev (Türev Alma Kuralları, Teğet-Normal, Ekstremum Noktalar)'],
  ['AYT','Biyoloji','İnsan Fizyolojisi','Sinir Sistemi'],
  ['AYT','Türk Dili ve Edebiyatı','Modern Türk Edebiyatı','Cumhuriyet Dönemi Edebiyatı']
]) assert.ok(c.topics(e,l,g).includes(t));
assert.ok(!c.topics('TYT','Matematik').some(t=>t.startsWith('Türev')));
assert.ok(!c.supports('TYT','Tarih-2'));assert.ok(!c.supports('AYT','Türkçe'));
assert.deepEqual(c.topics('Unknown','Fizik'),[]);
assert.deepEqual(c.topics('TYT','Unknown'),[]);
assert.equal(c.taskTitle('Problemler',null,'category'),'Problemler');
assert.equal(c.taskTitle('Problemler','Yaş Problemleri','topic'),'Yaş Problemleri');
assert.equal(c.taskTitle('Problemler',null,''),'');
assert.ok(!c.topics('TYT','Matematik','Problemler').includes('Genel'));
console.log('PASS source hierarchy, parenthetical qualifiers, exam boundaries, immutable reads and unchanged KPSS');
