const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),changes=new Map([
 ['Ana sayfa','Ana Sayfa'],['Yönetici paneli','Yönetici Paneli'],['Çıkış yap','Çıkış Yap'],['Giriş yap','Giriş Yap'],['Kayıt ol','Kayıt Ol'],['Yeni hesap','Yeni Hesap'],['Hesap senkronizasyonu','Hesap Senkronizasyonu'],['Hesabını tamamla','Hesabını Tamamla'],['Tekrar hoş geldin','Tekrar Hoş Geldin'],['Özel konu','Özel Konu'],['Genel konular','Genel Konular'],['Değişiklik iste','Değişiklik İste'],['İsteği gönder','İsteği Gönder'],['Görev düzenle','Görev Düzenle'],['Görev adı','Görev Adı'],['Öğretmen davet kodu','Öğretmen Davet Kodu'],['Günlük görev başlangıcı','Günlük Görev Başlangıcı'],['Günlük görev bitişi','Günlük Görev Bitişi'],['Kopyalanacak hafta','Kopyalanacak Hafta'],['Devam et','Devam Et'],['Geçerli aşamayı atla','Geçerli Aşamayı Atla'],['Oturumu bitir','Oturumu Bitir'],['Öğretmen yanıtı','Öğretmen Yanıtı'],['Okunmadı yap','Okunmadı Yap'],['Okundu yap','Okundu Yap']]);
const title=text=>text.replace(/\p{L}[\p{L}\p{M}]*/gu,word=>word.length<=5&&word===word.toLocaleUpperCase('tr-TR')?word:word[0].toLocaleUpperCase('tr-TR')+word.slice(1).toLocaleLowerCase('tr-TR'));
for(const label of ['Program hazırla','Deneme sonuçları','Tekrar sayısı','Görevin başlangıcı','Görevin bitişi','Tek sefer','Haftalık tekrar','Günlük görev','Süre ve ses ayarları','Kalan süre','Öğrenci yönetimi','Görev sil','Yukarı taşı','Aşağı taşı','Açık tema','Koyu tema','Menüyü aç','Menüyü kapat','Önceki sayfa','Görünüm ayarları','Yeniden dene'])changes.set(label,title(label));
for(const label of ['Bu haftayı kopyala','Taslağı sil'])changes.set(label,title(label));
const files=['index.html','ui.js','teacher.js','admin.js','learning-ui.js','appearance.js','personal-catalog.js'];
for(const file of files){let source=fs.readFileSync(path.join(root,file),'utf8');for(const match of source.matchAll(/\b(?:button|makeButton)\(\s*'([^']+)'/g))changes.set(match[1],match[1].split(/(<[^>]+>)/).map(part=>part.startsWith('<')?part:title(part)).join(''));source=source.replace(/<(button|h[1-4]|summary|legend|label)\b([^>]*)>([\s\S]*?)<\/\1>/g,(all,tag,attrs,body)=>{
 if(body.includes('${')||body.includes('`')||attrs.includes('versionHistoryButton'))return all;
 const fixed=body.replace(/(^|>)([^<>]+)(?=<|$)/g,(part,prefix,text)=>{const value=text.trim();if(!value||value.length>90||!/[\p{L}]/u.test(value))return part;const next=title(value);if(next!==value)changes.set(value,next);return prefix+text.replace(value,next);});return `<${tag}${attrs}>${fixed}</${tag}>`;
 });fs.writeFileSync(path.join(root,file),source);}
// Replace only complete literal labels and static text nodes, never dynamic user values.
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
for(const file of [...files,...fs.readdirSync(path.join(root,'tests')).filter(x=>x.endsWith('.cjs')).map(x=>'tests/'+x)]){
 let source=fs.readFileSync(path.join(root,file),'utf8');for(const [before,after] of changes){source=source.replace(new RegExp('([\'\"])'+escape(before)+'\\1','g'),(_,quote)=>quote+after+quote);source=source.replaceAll('>'+before+'<','>'+after+'<');}fs.writeFileSync(path.join(root,file),source);
}
console.log('Static UI labels normalized:',changes.size);
