const assert = require('node:assert/strict');
const c = require('../curriculum.js');
const expected = {
  TYT: 9,
  AYT: 11
};
const provenance=require('../docs/catalog-v114-provenance.json');
assert.equal(provenance.topicFiles.length,20);
for(const file of provenance.topicFiles)assert.match(file,/^catalog-v114\/(tyt|ayt)-\d{2}\.json$/);
provenance.topics=Object.assign({},...provenance.topicFiles.map(file=>require('../docs/'+file).topics));
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
  if (expected[exam]) assert.equal(lessons.length,expected[exam]);
  for (const lesson of lessons) {
    assert.ok(c.supports(exam,lesson));
    const topics = c.topics(exam,lesson);
    assert.equal(new Set(topics).size,topics.length);
    for (const group of c.categories(exam,lesson)) {
      for (const topic of c.topics(exam,lesson,group)) {
        assert.ok(topic.trim()); assert.ok(topic.length<=200);
        assert.equal(c.categoryFor(exam,lesson,topic),group);
        if(expected[exam]){const sources=provenance.topics[[exam,lesson,group,topic].join('|')];assert.ok(sources?.length,'Every new title needs source evidence: '+topic);for(const source of sources){assert.ok(source.url.startsWith('https://ogm-large-cdn.eba.gov.tr/'));assert.match(source.sha256,/^[a-f0-9]{64}$/);assert.ok(source.tocPage>=9);assert.ok(source.sourceTitle);}}
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
  ['TYT','Fizik','Optik','Işığın Kırılması'],
  ['AYT','Matematik','Analiz (LTI)','Türev'],
  ['AYT','Biyoloji','İnsan Fizyolojisi','Sinir Sistemi'],
  ['AYT','Türk Dili ve Edebiyatı','Modern Türk Edebiyatı','Cumhuriyet Dönemi Türk Şiiri']
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
assert.ok(c.topics('AYT','Kimya','Organik Kimya').includes('Aromatik Hidrokarbonlar'));
assert.ok(!c.topics('AYT','Kimya').some(x=>x.includes('Aritmetik')));
assert.ok(c.topics('AYT','Fizik','Elektrik ve Manyetizma').includes('Transformatörler'));
assert.ok(c.topics('AYT','Biyoloji','İnsan Fizyolojisi').includes('Endokrin Sistem'));
assert.ok(c.topics('AYT','Biyoloji','İnsan Fizyolojisi').includes('Döllenme'));
assert.ok(c.topics('AYT','Biyoloji','Bitki Biyolojisi').includes('Bitkilerde Döllenme'));
assert.deepEqual(c.categories('AYT','Felsefe Grubu').sort(),['Felsefe','Mantık','Psikoloji','Sosyoloji']);
assert.ok(c.topics('TYT','Matematik','Problemler').includes('İşçi Problemleri'));
assert.ok(provenance.legacy.length===199);
console.log('PASS reviewed chemistry/physics/biology gaps, separate philosophy fields and 199 non-destructive legacy mappings');
