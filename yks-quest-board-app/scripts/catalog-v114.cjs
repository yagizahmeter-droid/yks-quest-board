const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'test-results/mebi');
const books=fs.readdirSync(folder).filter(f=>f.startsWith('13-')&&f.endsWith('.pdf.json')).map(f=>JSON.parse(fs.readFileSync(path.join(folder,f),'utf8')));
const baseline=cp.execFileSync('C:/Program Files/Git/cmd/git.exe',['show','f15e57802ac1c5f04ca3994344b52ff805766251:yks-quest-board-app/curriculum.js'],{encoding:'utf8'}),sandbox={module:{exports:{}}};vm.runInNewContext(baseline,sandbox);const old=sandbox.module.exports;
const catalog={TYT:{},AYT:{},KPSS:Object.fromEntries(old.lessons('KPSS').map(l=>[l,old.topics('KPSS',l)]))},proof={};
const groupSpecs={
 'TYT|Türkçe':[[11,'Anlam Bilgisi'],[13,'Dil Bilgisi'],[19,'Yazım ve Noktalama'],[36,'Dil Bilgisi']],
 'TYT|Matematik':[[13,'Temel Matematik'],[14,'Problemler'],[29,'Temel Matematik'],[39,'Problemler'],[45,'Mantık'],[51,'Kümeler'],[61,'Sayma ve Olasılık'],[73,'Fonksiyonlar'],[82,'Polinomlar ve Çarpanlara Ayırma'],[87,'İkinci Dereceden Denklemler'],[91,'Veri ve İstatistik'],[129,'Geometri']],
 'TYT|Fizik':[[1,'Fizik Bilimine Giriş'],[5,'Madde ve Özellikleri'],[10,'Hareket ve Kuvvet'],[14,'İş, Güç ve Enerji'],[20,'Isı ve Sıcaklık'],[23,'Elektrostatik'],[29,'Elektrik ve Manyetizma'],[34,'Basınç ve Kaldırma Kuvveti'],[41,'Dalgalar'],[52,'Optik']],
 'TYT|Kimya':[[4,'Kimya Bilimi'],[9,'Atom ve Periyodik Sistem'],[13,'Kimyasal Türler Arası Etkileşimler'],[16,'Maddenin Hâlleri'],[18,'Doğa ve Kimya'],[22,'Kimyanın Temel Kanunları ve Hesaplamalar'],[25,'Karışımlar'],[28,'Asitler, Bazlar ve Tuzlar'],[30,'Kimya Her Yerde']],
 'TYT|Tarih':[[2,'Tarih ve Zaman'],[6,'İlk Türk Devletleri'],[9,'İslam Medeniyeti'],[12,'Türk İslam Devletleri'],[16,'Anadolu Tarihi'],[21,'Beylikten Devlete Osmanlı'],[25,'Dünya Gücü Osmanlı'],[28,'Osmanlı Kültür ve Medeniyeti'],[34,'Değişen Dünya ve Osmanlı'],[43,'Değişim Çağında Avrupa ve Osmanlı'],[47,'20. Yüzyıl Başlarında Osmanlı'],[52,'Millî Mücadele'],[54,'Türk İnkılabı ve Atatürkçülük']],
 'TYT|Coğrafya':[[4,'Doğa ve Dünya'],[7,'Coğrafi Konum'],[10,'Harita Bilgisi'],[16,'İklim Bilgisi'],[18,'Yerleşme ve Bölgeler'],[19,'İnsan ve Doğa'],[29,'Yer Şekilleri, Su, Toprak ve Bitkiler'],[33,'Nüfus ve Göç'],[35,'Ekonomik Faaliyetler'],[38,'Doğal Afetler']],
 'TYT|Din Kültürü ve Ahlak Bilgisi':[[3,'Bilgi ve İnanç'],[8,'Din ve İslam'],[14,'İslam ve İbadet'],[18,'Gençlik ve Değerler'],[21,'İslam Medeniyeti'],[27,'Allah İnsan İlişkisi'],[32,'Hz. Muhammed ve Gençlik'],[39,'Din ve Hayat'],[44,'Ahlaki Tutum ve Davranışlar'],[49,'İslam Düşüncesinde Yorumlar']],
 'AYT|Matematik':[[15,'İleri Cebir'],[19,'Olasılık'],[37,'Trigonometri'],[39,'Logaritma'],[45,'Diziler'],[61,'Analiz (LTI)'],[78,'İleri Geometri']],
 'AYT|Fizik':[[19,'Mekanik'],[32,'Elektrik ve Manyetizma'],[40,'Çembersel Hareket ve Kütle Çekimi'],[42,'Basit Harmonik Hareket'],[47,'Dalga Mekaniği'],[50,'Atom Fiziği ve Radyoaktivite'],[55,'Modern Fizik'],[60,'Modern Fiziğin Teknolojideki Uygulamaları']],
 'AYT|Kimya':[[5,'Modern Atom Teorisi'],[9,'Gazlar'],[13,'Sıvı Çözeltiler ve Çözünürlük'],[15,'Kimyasal Tepkimelerde Enerji'],[17,'Kimyasal Tepkimelerde Hız'],[21,'Kimyasal Tepkimelerde Denge'],[27,'Kimya ve Elektrik'],[30,'Karbon Kimyasına Giriş'],[41,'Organik Kimya'],[43,'Enerji Kaynakları ve Bilimsel Gelişmeler']],
 'AYT|Tarih':[[2,'Tarih ve Zaman'],[7,'İnsanlığın İlk Dönemleri'],[11,'Orta Çağ Dünyası'],[15,'İlk Türk Devletleri'],[18,'İslam Medeniyeti'],[21,'Türk İslam Devletleri'],[25,'Anadolu Tarihi'],[30,'Beylikten Devlete Osmanlı'],[34,'Dünya Gücü Osmanlı'],[37,'Osmanlı Kültür ve Medeniyeti'],[43,'Değişen Dünya ve Osmanlı'],[52,'Değişim Çağında Avrupa ve Osmanlı'],[56,'20. Yüzyıl Başlarında Osmanlı'],[61,'Millî Mücadele'],[64,'Türk İnkılabı ve Atatürkçülük'],[66,'İki Savaş Arası Dönem'],[68,'İkinci Dünya Savaşı ve Sonrası'],[73,'Çağdaş Türk ve Dünya Tarihi']],
 'AYT|Coğrafya':[[2,'Ekosistemler'],[4,'Nüfus ve Yerleşme'],[11,'Ekonomik Faaliyetler'],[13,'Kültür Bölgeleri'],[17,'Küresel Ortam ve Bölgeler'],[20,'Çevre ve Toplum'],[24,'Doğa ve Gelecek'],[29,'Türkiye Ekonomisi ve Bölgesel Kalkınma'],[33,'Jeopolitik ve Küresel İlişkiler'],[34,'Çevre Politikaları']],
 'AYT|Türk Dili ve Edebiyatı':[[4,'Giriş ve Şiir Bilgisi'],[12,'Geleneksel Türk Edebiyatı'],[25,'Modern Türk Edebiyatı'],[26,'Edebî Türler'],[27,'Geleneksel Türk Edebiyatı'],[31,'Modern Türk Edebiyatı'],[32,'Edebî Türler'],[38,'Modern Türk Edebiyatı'],[39,'Edebî Türler'],[40,'Geleneksel Türk Edebiyatı'],[43,'Modern Türk Edebiyatı'],[47,'Edebî Türler'],[48,'Geleneksel Türk Edebiyatı'],[49,'Edebî Akımlar']],
 'AYT|Din Kültürü ve Ahlak Bilgisi':[[4,'Dünya ve Ahiret'],[8,'Hz. Muhammed'],[11,'Kur’an Kavramları'],[14,'İnançla İlgili Meseleler'],[16,'Yahudilik ve Hristiyanlık'],[21,'İslam ve Bilim'],[24,'Anadolu İslam Medeniyeti'],[28,'Tasavvufi Yorumlar'],[33,'Güncel Dinî Meseleler'],[37,'Hint ve Çin Dinleri']]
};
const corrections={'Mutlak Değeri Denklemler ve Eşitsizlikler':'Mutlak Değerli Denklemler ve Eşitsizlikler','Fonksiyonun Artan veya Azaln Olduğu Aralıklar':'Fonksiyonun Artan veya Azalan Olduğu Aralıklar','Periyot ve Periyodik Fonksiyonla':'Periyot ve Periyodik Fonksiyonlar','Difransiyel Kavramı ve Değişken Değiştirme (İkame) Yöntemi':'Diferansiyel Kavramı ve Değişken Değiştirme (İkame) Yöntemi','Türkiye Turizmii':'Türkiye Turizmi'};
function clean(s){s=s.replace(/\s*\n\s*/g,' ').replace(/\s+/g,' ').trim().replace(/\s+\d+$/,'');return corrections[s]||s;}
function splitTopics(text){const out=[];let depth=0,start=0;for(let i=0;i<text.length;i++){if(text[i]==='(')depth++;if(text[i]===')')depth--;if(text[i]===','&&!depth){out.push(text.slice(start,i).trim());start=i+1;}}out.push(text.slice(start).trim());return out.filter(Boolean);}
function detailedSections(book,sections,onTopic){
 let section='',buffer='';
 for(const page of book.frontmatter.filter(p=>p.page>=9&&p.text.includes('...')))for(const raw of page.text.split('\n')){
  const line=raw.trim();if(!line||line==='İÇİNDEKİLER')continue;
  if(sections.includes(line)){section=line;buffer='';continue;}
  if(!section)throw Error('Unknown section: '+book.lesson+': '+line);
  buffer+=(buffer?'\n':'')+line;
  if(!/(?:\.\s*){2,}\s*[\d ]+$/.test(buffer))continue;
  const title=buffer.replace(/(?:\.\s*){2,}\s*[\d ]+$/,'').replace(/(\p{Ll})\s*-\s*\n\s*(\p{Ll})/gu,'$1$2').replace(/\s+/g,' ').trim().replace('Sinir Sinir Sistemi','Sinir Sistemi').replace('ve ve Sağlıklı','ve Sağlıklı');
  for(const leaf of splitTopics(title))onTopic(section,book.exam==='AYT'&&book.lesson==='Biyoloji'&&section==='Bitkilerde Eşeyli Üreme'&&leaf==='Döllenme'?'Bitkilerde Döllenme':leaf,page.page,title);
  buffer='';
 }
 if(buffer)throw Error('Unparsed section tail: '+buffer);
}
function add(exam,lesson,group,title,book,sourceTitle,tocPage){
 title=clean(title);if(!title||title.length>200)throw Error('Review title: '+title);
 const groups=catalog[exam][lesson]||=( {} );const topics=groups[group]||=[];if(!topics.includes(title))topics.push(title);
 const key=[exam,lesson,group,title].join('|');const list=proof[key]||=[];list.push({url:book.url,sha256:book.sha256,tocPage,sourceTitle:sourceTitle.trim()});
}
for(const b of books){
 if(['Biyoloji','Felsefe','Psikoloji','Sosyoloji','Mantık'].includes(b.lesson))continue;
 const spec=groupSpecs[b.exam+'|'+b.lesson];if(!spec)throw Error('Missing recipe: '+b.lesson);
 for(const page of b.frontmatter.filter(p=>p.page>=9&&/\.{2,}/.test(p.text))){
  const starts=[...page.text.matchAll(/(?:^|\n)\s*(\d+)\.\s+/g)];
  for(const [n,m] of starts.entries()){const index=Number(m[1]),block=page.text.slice(m.index+m[0].length,starts[n+1]?.index).replace(/İÇİNDEKİLER/g,'').trim();
   const parsed=block.match(/^([\s\S]+?)(?:\.\s*){2,}\s*[\d ]+$/)||block.match(/^([\s\S]+?)\s+\d+$/);if(!parsed)throw Error('Review TOC line: '+block);
   if(b.exam==='TYT'&&b.lesson==='Matematik'&&index===64)continue;const title=index===63&&b.exam==='TYT'&&b.lesson==='Matematik'?'Fonksiyon Sorularında Dikkat Edilmesi Gerekenler':parsed[1];const group=spec.find(([last])=>index<=last)?.[1];if(!group)throw Error('Unmapped topic '+b.lesson+': '+index);
   const lessons=b.exam==='AYT'&&['Tarih','Coğrafya'].includes(b.lesson)?[b.lesson+'-1',b.lesson+'-2']:[b.lesson];for(const lesson of lessons)add(b.exam,lesson,group,title,b,parsed[1],page.page);
  }
 }
}
const headers={
 'TYT|Biyoloji':{
  'Canlıların Yapısı':['Canlıların Ortak Özellikleri','Canlıların Yapısında Bulunan İnorganik Bileşikler','Canlıların Yapısında Bulunan Organik Bileşikler'],
  'Hücre':['Hücresel Yapılar ve Görevleri','Hücre Zarından Madde Geçişleri'],
  'Sınıflandırma':['Canlıların Sınıflandırılması','Canlı Âlemleri'],
  'Hücre Bölünmeleri ve Üreme':['Hücre Döngüsü ve Mitoz','Eşeysiz Üreme','Mayoz','Eşeyli Üreme'],
  'Kalıtım':['Kalıtım','Genetik Varyasyonlar'],
  'Ekoloji ve Çevre':['Ekosistem Ekolojisi','Güncel Çevre Sorunları','Doğal Kaynakların Sürdürülebilirliği','Biyolojik Çeşitliliğin Korunması']},
 'AYT|Biyoloji':{
  'İnsan Fizyolojisi':['Sinir Sistemi','Endokrin Sistem','Duyu Organları','İskelet Sistemi','Kas Sistemi','Sindirim Sistemi','Kan Dolaşımı','Lenf Dolaşımı','Bağışıklık Sistemi','Solunum Sistemi','Üriner Sistem','Üreme Sistemi','Embriyonik Gelişim'],
  'Ekoloji':['Komünite Ekolojisi','Popülasyon Ekolojisi'],
  'Genden Proteine':['Nükleik Asitler','Genetik Şifre ve Protein Sentezi','Genetik Mühendisliği ve Biyoteknoloji'],
  'Canlılarda Enerji Dönüşümleri':['Canlılık ve Enerji','Fotosentez','Kemosentez','Hücresel Solunum','Fermantasyon'],
  'Bitki Biyolojisi':['Bitkisel Dokular','Bitkisel Organlar','Bitki Hormonları','Bitkilerde Hareket','Bitkilerde Madde Taşınması','Bitkilerde Eşeyli Üreme'],
  'Canlılar ve Çevre':['Canlılar ve Çevre']}
};
for(const [key,groups] of Object.entries(headers)){
 const [exam,lesson]=key.split('|'),b=books.find(b=>b.exam===exam&&b.lesson===lesson),toc=b.frontmatter.filter(p=>p.page>=9).map(p=>p.text).join('\n');
 for(const [group,topics] of Object.entries(groups))for(const title of topics){if(!toc.includes(title))throw Error('Unverified heading: '+title);add(exam,lesson,group,title,b,title,b.frontmatter.find(p=>p.page>=9&&p.text.includes(title)).page);}
 detailedSections(b,Object.values(groups).flat(),(section,title,page,source)=>{const group=Object.keys(groups).find(g=>groups[g].includes(section));add(exam,lesson,group,title,b,source,page);});
}
for(const b of books.filter(b=>['Felsefe','Psikoloji','Sosyoloji','Mantık'].includes(b.lesson))){
 const toc=b.frontmatter.filter(p=>p.page>=9&&p.text.includes('...'));
 // Use the actual printed section headings, not comma-separated mixtures of subject areas.
 const sectionNames=b.lesson==='Felsefe'?['Felsefeyi Tanıma','Felsefe ile Düşünme','Varlık Felsefesi','Bilgi Felsefesi','Bilim Felsefesi','Ahlak Felsefesi','Din Felsefesi','Siyaset Felsefesi','Sanat Felsefesi','Felsefi Okuma ve Yazma','MÖ 6. Yüzyıl-MS 2. Yüzyıl Felsefesi','MS 2. Yüzyıl - MS 15. Yüzyıl Felsefesi','15. Yüzyıl - 17. Yüzyıl Felsefesi','18. Yüzyıl - 19. Yüzyıl Felsefesi','20. Yüzyıl Felsefesi']:
 b.lesson==='Psikoloji'?['Psikoloji Bilimini Tanıyalım','Psikolojinin Temel Süreçleri','Öğrenme, Bellek, Düşünme','Ruh Sağlığının Temelleri']:
 b.lesson==='Sosyoloji'?['Sosyolojiye Giriş','Birey ve Toplum','Toplumsal Yapı','Toplumsal Değişme ve Gelişme','Toplum ve Kültür','Toplumsal Kurumlar']:['Mantığa Giriş','Klasik Mantık','Mantık ve Dil','Sembolik Mantık'];
 for(const title of sectionNames){const page=toc.find(p=>p.text.includes(title));if(!page)throw Error('Unverified philosophy section '+title);
  if(b.lesson==='Felsefe')add('TYT','Felsefe','Felsefi Alanlar',title,b,title,page.page);
  add('AYT','Felsefe Grubu',b.lesson,title,b,title,page.page);
 }
 detailedSections(b,sectionNames,(section,title,page,source)=>{if(b.lesson==='Felsefe')add('TYT','Felsefe','Felsefi Alanlar',title,b,source,page);add('AYT','Felsefe Grubu',b.lesson,title,b,source,page);});
}
// Earlier-grade algebra/geometry remain legitimate AYT prerequisites; their provenance stays TYT.
for(const group of ['Fonksiyonlar','Polinomlar ve Çarpanlara Ayırma','İkinci Dereceden Denklemler','Sayma ve Olasılık','Geometri'])for(const title of catalog.TYT.Matematik[group]){
 if(Object.values(catalog.AYT.Matematik).flat().includes(title))continue;
 const p=proof[['TYT','Matematik',group,title].join('|')][0],b=books.find(b=>b.url===p.url);add('AYT','Matematik',group,title,b,p.sourceTitle,p.tocPage);
}
// Same source covers shared early history; do not claim TYT/AYT exclusivity from a book title.
for(const group of ['İnsanlığın İlk Dönemleri','Orta Çağ Dünyası'])for(const title of catalog.AYT['Tarih-1'][group]){const p=proof[['AYT','Tarih-1',group,title].join('|')][0],b=books.find(b=>b.url===p.url);add('TYT','Tarih',group,title,b,p.sourceTitle,p.tocPage);}
const preferred=['Türkçe','Matematik','Fizik','Kimya','Biyoloji','Tarih','Coğrafya','Felsefe','Din Kültürü ve Ahlak Bilgisi'];catalog.TYT=Object.fromEntries(preferred.map(l=>[l,catalog.TYT[l]]));
const ayt=['Matematik','Fizik','Kimya','Biyoloji','Türk Dili ve Edebiyatı','Tarih-1','Coğrafya-1','Tarih-2','Coğrafya-2','Felsefe Grubu','Din Kültürü ve Ahlak Bilgisi'];catalog.AYT=Object.fromEntries(ayt.map(l=>[l,catalog.AYT[l]]));
const marker='  // KPSS keeps its existing flat entries;',tail=baseline.slice(baseline.indexOf(marker));
fs.writeFileSync(path.join(root,'curriculum.js'),'(function(root) {\n  // Reviewed MEBI book headings; grouping is editorial, not an exhaustive OSYM syllabus.\n  const catalog = '+JSON.stringify(catalog,null,2)+';\n'+tail);
const changes=[];for(const exam of ['TYT','AYT'])for(const lesson of old.lessons(exam))for(const group of old.categories(exam,lesson))for(const title of old.topics(exam,lesson,group)){
 const next=Object.entries(catalog[exam][lesson]).find(([,list])=>list.includes(title));changes.push({exam,lesson,oldCategory:group,oldTitle:title,newCategory:next?.[0]||null,status:next?(next[0]===group?'retained':'regrouped'):'legacy_only',policy:'Existing stored records and draft titles are never rewritten'});
}
const topicFiles=[];fs.mkdirSync(path.join(root,'docs/catalog-v114'),{recursive:true});
for(const exam of ['TYT','AYT'])for(const [index,lesson] of Object.keys(catalog[exam]).entries()){
 const file='catalog-v114/'+exam.toLowerCase()+'-'+String(index+1).padStart(2,'0')+'.json';topicFiles.push(file);
 const topics=Object.fromEntries(Object.entries(proof).filter(([key])=>key.startsWith(exam+'|'+lesson+'|')));
 fs.writeFileSync(path.join(root,'docs',file),JSON.stringify({exam,lesson,topics},null,2));
}
fs.writeFileSync(path.join(root,'docs/catalog-v114-provenance.json'),JSON.stringify({reviewedOn:'2026-10-21',sources:books.map(({exam,lesson,url,sha256})=>({exam,lesson,url,sha256})),topicFiles,legacy:changes},null,2));
console.log('CATALOG',JSON.stringify(Object.fromEntries(['TYT','AYT'].map(e=>[e,{lessons:Object.keys(catalog[e]).length,categories:Object.values(catalog[e]).reduce((n,g)=>n+Object.keys(g).length,0),topics:Object.values(catalog[e]).reduce((n,g)=>n+Object.values(g).flat().length,0)}]))));
