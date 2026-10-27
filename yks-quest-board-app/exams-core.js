(function(root){
 'use strict';
 const part=(id,label,max)=>({id,label,max});
 const catalog={
  TYT:[
   {id:'turkish',label:'Türkçe',parts:[part('turkish','Türkçe',40)]},
   {id:'social',label:'Sosyal Bilimler',parts:[part('history','Tarih',5),part('geography','Coğrafya',5),part('philosophy','Felsefe',5),part('religion','Din Kültürü / Alternatif Felsefe',5)]},
   {id:'math',label:'Temel Matematik',parts:[part('math','Temel Matematik',40)]},
   {id:'science',label:'Fen Bilimleri',parts:[part('physics','Fizik',7),part('chemistry','Kimya',7),part('biology','Biyoloji',6)]}
  ],
  AYT:[
   {id:'math',label:'Matematik',parts:[part('math','Matematik',40)]},
   {id:'science',label:'Fen Bilimleri',parts:[part('physics','Fizik',14),part('chemistry','Kimya',13),part('biology','Biyoloji',13)]},
   {id:'literature',label:'Edebiyat–Sosyal Bilimler-1',parts:[part('literature','Türk Dili ve Edebiyatı',24),part('history1','Tarih-1',10),part('geography1','Coğrafya-1',6)]},
   {id:'social2',label:'Sosyal Bilimler-2',parts:[part('history2','Tarih-2',11),part('geography2','Coğrafya-2',11),part('philosophy','Felsefe Grubu',12),part('religion','Din Kültürü / Alternatif Felsefe Grubu',6)]}
  ]
 };
 function tests(exam,groups){
  if(!catalog[exam]||!Array.isArray(groups)||!groups.length||groups.length>4)throw Error('TYT veya AYT testlerini seç.');
  const seen=new Set();
  return groups.flatMap(selected=>{
   const group=catalog[exam].find(g=>g.id===selected.id);
   if(!group||seen.has(group.id)||!['total','detail'].includes(selected.mode)||exam==='AYT'&&selected.mode!=='detail')throw Error('Geçersiz veya yinelenen test seçimi.');
   seen.add(group.id);
   return selected.mode==='total'?[part(group.id,group.label,group.parts.reduce((n,p)=>n+p.max,0))]:group.parts;
  });
 }
 function evaluate(record){
  const expected=tests(record.exam_type,record.groups),results=record.results;
  if(!results||typeof results!=='object'||Array.isArray(results)||Object.keys(results).some(id=>!expected.some(t=>t.id===id)))throw Error('Sonuçlar seçili testlerle uyuşmuyor.');
  let entered=0;
  const rows=expected.map(test=>{
   const values=results[test.id]||{},counts=['correct','wrong','blank'].map(key=>values[key]??null);
   if(counts.some(n=>n!==null&&(!Number.isInteger(n)||n<0||n>test.max)))throw Error(test.label+': soru sayıları 0–'+test.max+' arasında tam sayı olmalı.');
   const sum=counts.reduce((n,v)=>n+(v??0),0),filled=counts.filter(n=>n!==null).length;
   if(sum>test.max||filled===3&&sum!==test.max)throw Error(test.label+': doğru, yanlış ve boş toplamı '+test.max+' olmalı.');
   if(filled)entered++;
   return {...test,counts,net:counts[0]!==null&&counts[1]!==null?counts[0]-counts[1]/4:null,complete:filled===3&&sum===test.max};
  });
  const scored=rows.filter(t=>t.net!==null);
  return {tests:rows,entered,totalNet:scored.length?scored.reduce((n,t)=>n+t.net,0):null,complete:rows.every(t=>t.complete),maximum:rows.reduce((n,t)=>n+t.max,0)};
 }
 function validate(record){
  if(typeof record.name!=='string'||!record.name.trim()||record.name.trim().length>160)throw Error('1–160 karakterlik deneme adı gir.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(record.exam_date||'')||!Number.isFinite(Date.parse(record.exam_date+'T12:00:00Z'))||new Date(record.exam_date+'T12:00:00Z').toISOString().slice(0,10)!==record.exam_date)throw Error('Geçerli bir deneme tarihi seç.');
  if((record.publisher||'').length>160||(record.note||'').length>2000)throw Error('Yayın adı en fazla 160, not en fazla 2000 karakter olabilir.');
  const result=evaluate(record);if(!result.entered)throw Error('En az bir test için soru adedi gir.');return result;
 }
 const order=rows=>[...rows].sort((a,b)=>a.exam_date.localeCompare(b.exam_date)||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
 const scope=record=>record.exam_type+':'+record.groups.map(g=>g.id).sort().join('+');
 function stats(rows){
  const sorted=order(rows),comparable=sorted.filter(r=>evaluate(r).complete&&evaluate(r).totalNet!==null),values=comparable.map(r=>evaluate(r).totalNet);
  if(new Set(comparable.map(scope)).size>1)throw Error('Farklı test kapsamları birlikte karşılaştırılamaz.');
  const average=values=>values.length?values.reduce((n,v)=>n+v,0)/values.length:null;
  return {count:sorted.length,completeCount:values.length,last:sorted.at(-1)||null,best:values.length?Math.max(...values):null,average:average(values),change:values.length>=2?values.at(-1)-values[0]:null,lastFive:average(values.slice(-5))};
 }
 const format=value=>value===null||value===undefined?'—':new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(value);
 const date=value=>new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Istanbul'}).format(new Date(value+'T12:00:00Z'));
 const today=()=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Istanbul'}).format(new Date());
 const api={catalog,tests,evaluate,validate,stats,scope,order,format,date,today};
 if(typeof module!=='undefined')module.exports=api;else root.DersExamsCore=api;
})(typeof window==='undefined'?globalThis:window);
