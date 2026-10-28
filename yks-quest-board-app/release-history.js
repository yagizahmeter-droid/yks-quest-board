(function(root){
 const compare=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(y[i]||0)-(x[i]||0);if(d)return d;}return 0;};
 const formatDate=date=>new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
 const releases=[
  {version:'1.2.1',name:'Experience & Theme Update',date:'2026-10-28',dateKind:'release',sections:[
   {title:'Güvenilir Tekrar İlerlemesi',items:['Haftalık tekrarlar tek tamamlama kaynağıyla 1/3, 2/3, 3/3 — Tamamlandı olarak öğrenci ve öğretmene yansır.','Tamamlananlar, sayaçlar ve cihazlar arası eşitleme tutarlı; yinelenen işlemler XP üretmez. Eski durumlar kayıt defterinden güvenli biçimde onarılabilir.']},
   {title:'Öğretmen Atama Yönetimi',items:['Bekleyen program isteğini geri çekme; kabul edilmiş programı veya tek görevi açıklamalı onayla kaldırma.','Arşivlenen atamalarda önceki çalışmalar ve kazanılmış XP korunur; öğrenciye bildirim gider, yalnızca gönderen yetkili öğretmen işlem yapabilir.']},
   {title:'Temiz İstek Listesi',items:['Sonuçlanan değişiklik istekleri aktif listeden ve bekleyen sayacından çıkar; denetim geçmişinde korunur.']},
   {title:'Kontrollü Çalışma Geçmişi',items:['Kendi çalışma kaydını, bir görevin veya bir haftanın geçmişini kayıt sayısı ve onayla listelerden kaldırma; görev, program ve kazanılmış XP korunur.','Öğretmende Pazartesi–Pazar takvimi, hafta/gün seçimi, net süre ve oturumlar; yalnızca bağlı öğrenciye erişim.']},
   {title:'Günlük Çalışma Özeti',items:['Tarih seçimi korunan bağımsız panel; net süre, tamamlanan görevler ve en çok çalışılan ders için düzenli mobil/masaüstü yerleşimi.']},
   {title:'Natural ve Cloud',items:['Natural için kâğıt, adaçayı, kömür ve toprak tonlarıyla farklılaşan katmanlar; sade, hareketsiz botanik detaylar.','Cloud için kompakt, hafif bulut kenarları ve güvenli içerik alanı; hizalı ders kartları. Görünen adlar Natural ve Cloud oldu; kayıtlı tercihler korunur.']}
  ]},
  {version:'1.2.0',name:'Deneme Takip Sistemi',date:'2026-10-28',dateKind:'release',sections:[
   {title:'TYT ve AYT Denemeleri',items:['Doğru, yanlış ve boş girişleri; anlık net hesabı; TYT alt dersleri ve AYT seçili testleri.','Kısmi kayıtlar, aynı gün birden fazla deneme, düzenleme ve onaylı silme.']},
   {title:'Gelişim ve İstatistikler',items:['Sınav ve test kapsamına göre ayrı net grafikleri, ders analizi, en yüksek net ve tam kayıt ortalamaları.','Kısmi kayıtlar ve eksik netler ayrı işaretlenir; farklı test kapsamları birbirine karıştırılmaz.']},
   {title:'Öğretmen Görünümü',items:['Deneme Sonuçları sekmesinde yalnızca bağlı öğrencilerin netleri ve gelişimi; salt okunur erişim.']},
   {title:'Güvenli Hesap Kayıtları',items:['Hesaba bağlı sonuçlar, sunucuda hesaplama ve RLS ile sahiplik kontrolü.','Yinelenen kayıtlara ve farklı cihazlardaki düzenleme çakışmalarına karşı koruma; mevcut XP ve görev kayıtları korunur.']}
  ]},
  {version:'1.1.4.1',name:'Usability & Bugfix Patch',date:'2026-10-22',dateKind:'release',sections:[
   {title:'Kişisel Program Adı',items:['Kabul edilen öğretmen programına yalnızca öğrencinin hesabında görünen ad verme ve orijinal ada dönme; cihazlar arası senkronizasyon.']},
   {title:'Program Tarihleri',items:['Öğretmen formundaki yinelenen serbest tarih alanı kaldırıldı; program aralığı başlangıç ve bitiş seçicilerinden oluşturulur. Eski kayıtlar korunur.']},
   {title:'Açılır Menü Yerleşimi',items:['Arama kutusu kaydırılan seçenek listesinden ayrıldı; ilk seçenekle çakışması giderildi.']},
   {title:'Menü Kaydırma',items:['Liste ve kaydırma çubuğu etkileşimi, etiketin gizli seçiciyi tetiklemesinden ayrıldı; fare, klavye ve dokunmatik kullanım korundu.']},
   {title:'Ferah Bulut Kartları',items:['Cloud UI silüetinin gerçek yerleşim alanı, içerik payları ve kart aralıkları büyütüldü; uzun görevler ve eylemler için alan açıldı.']},
   {title:'Tutarlı Vurgu Renkleri',items:['Tema yüzeyleri korunarak yerel seçim kontrolleri de seçilen vurgu rengine bağlandı; Natural UI orman yeşili kimliğini korur.']},
   {title:'Hizalı Ders Kartları',items:['Programım dersleri satır bazlı Grid ile hizalanır; kısa kartlar uzatılmaz, mobilde tek sütun ve bulutlara özel boşluklar korunur.']},
   {title:'Konu Adı Değişiklik Talebi',items:['Öğrenci gerekçesiyle konu adı önerebilir; öğretmen onayı yalnızca ilgili görevi günceller. Sonuç mevcut bildirim merkezinde gösterilir; katalog değişmez.']},
   {title:'Haftalara Göre Görev Seçimi',items:['Odak Modu görevleri kapalı açılan hafta gruplarında gösterilir; yalnızca tamamlanmamış görevler listelenir. Hafta, ders ve görev araması ile Serbest Çalışma korunur.']},
   {title:'Sade Çalışma Ekranı',items:['Aktif çalışmada yalnızca büyük saat ve Duraklat kontrolü; duraklatınca diğer kontrollerin yumuşak geçişle görünmesi. Süre ve görev kimlikleri korunur.']}
  ]},
  {version:'1.1.4',name:'Catalog & Usability Update',date:'2026-10-21',dateKind:'release',sections:[
   {title:'TYT–AYT Konu Kataloğu',items:['MEBİ kaynaklarına bağlı konu doğrulaması, eksik başlıklar ve yanlış konu eşleşmelerinin onarılması.','Felsefe alanlarının ayrılması; öğrenci ve öğretmende aynı katalog. KPSS ve eski görev kayıtları korunur.']},
   {title:'Mobil Yönetici Paneli',items:['Mobil menüden yönetici paneline geçişte pencerenin kapanmasına neden olan geri dönüş çakışması düzeltildi.','Güvenli öğrenci / öğretmen önizlemeleri ve mobil panel kontrolleri korundu.']},
   {title:'Kaydırma ve Performans',items:['Sayaç güncellemeleri yalnızca değişen süreyi çizer; gereksiz ekran ve form taramaları azaltıldı.','Uzun listelerde cam katmanları ve kaydırma sınırları sadeleştirildi.']},
   {title:'Mobil Yerleşim ve Etiketler',items:['Odak Modu ayarları kompaktlaştırıldı; Programım eylemleri okunaklı satırlara taşındı.','Başlık ve buton adları düzenlendi; marka açılımı kaldırıldı.']},
   {title:'Natural UI ve Cloud UI',items:['Hareketsiz sarmaşıklarla organik Natural UI ve bulut hatlı Cloud UI eklendi.','Klasik, Saydam, vurgu rengi ve kişisel arka plan tercihleri korunur.']},
   {title:'Form ve Renk Düzeltmeleri',items:['E-posta → Tab → şifre → Enter ile giriş ve çok satırlı alanlar kontrol edildi.','Kırmızı vurgu rengi belirgin kırmızı olarak düzeltildi; mini sayaç ve mevcut XP mantığı korundu.']}
  ]},
  {version:'1.1.3',name:'Focus & Learning Update',date:'2026-10-20',dateKind:'release',sections:[
   {title:'Odak ve Çalışma Süreleri',items:['Özelleştirilebilir çalışma / mola süreleri, tekrarlı oturum, otomatik geçiş ve mini sayaç.','Göreve bağlı veya serbest net çalışma kayıtları ve günlük ders dağılımı; süre tutmak XP üretmez.']},
   {title:'Öğrenci Karnesi',items:['Yetkili öğretmene haftalık görev ilerlemesi, çalışma süreleri ve geçmiş hafta değerlendirmeleri.','Görev altında öğrenci soruları ve öğretmen yorum / yanıtları.']},
   {title:'Bildirim Merkezi',items:['Programa, yorumlara, sorulara ve haftalık değerlendirmelere bağlı hesap bazlı bildirimler.','Okundu / okunmadı ve ayrı bildirim tercihleri.']},
   {title:'Düzen ve Güvenlik',items:['Daha okunabilir masaüstü ölçeği, hizalı kartlar ve sade bölüm başlıkları.','Mevcut görev, XP ve yetkiler korunarak ayrı erişim kontrollü çalışma kayıtları.']}
  ]},
  {version:'1.1.2',name:'Control & Polish Update',date:'2026-10-18',dateKind:'release',sections:[
   {title:'Saydam Görünüm',items:['Bulanık görünümün adı Saydam olarak sadeleştirildi; arka planlarla uyumlu yarı saydam ve hafif buzlu cam yüzeyler iyileştirildi.','Mevcut tema ve renk tercihleri ile Klasik görünüm korundu.']},
   {title:'Yönetici Paneli',items:['Yalnızca yetkili yöneticiye açık panel ve gerçek öğrenci / öğretmen arayüzlerinde izole örnek veri önizlemeleri eklendi.','Roller arasında geçiş, admin paneline dönüş ve yalnızca önizleme verilerini sıfırlama sağlandı.']},
   {title:'Test Notları ve İşlem Geçmişi',items:['Hata, Öneri ve Test türlerinde ekran ve tarih bilgisiyle kişisel yönetici notları eklendi.','Önemli yönetici işlemleri, gizli bilgi içermeyen tarihli bir geçmişte tutuluyor.']},
   {title:'Çalışma Geçmişi',items:['Görev geçmişi hafta ve gün gruplarına ayrıldı; mevcut filtreler ve XP kayıtları korundu.']},
   {title:'Hata Düzeltmeleri',items:['Güvenli rol önizlemelerinin dosya yükleme, başlatma ve yeniden deneme akışları düzeltildi; dosyadan açılış için anlaşılır uyarı eklendi.','Çalışma alanım üst çubuğu içerikle birlikte kaydırılarak başlıkların üstüne binmesi giderildi.','Mevcut görevler, XP, haftalar, öğretmen bağlantıları ve hesap yetkileri korunuyor.']}
  ]},
  {version:'1.1.1',name:'Background Expansion & Bug Fixes',date:'2026-10-16',dateKind:'release',features:['Siyah, beyaz, gri ve pembe arka planlar; cihazda saklanan kişisel fotoğraf yükleme ve kaldırma','Program fotoğrafında hücre bazlı görev çıkarma, sürükle-bırak ve döndürme','Gereksiz kaydedilmemiş değişiklik uyarılarının düzeltilmesi','Öğretmen taslağını koruyan hafta kopyalama; cihazda taslak saklama ve yeniden açma','Başarısız kayıtta form ve taslağın korunması','Manuel dersler için Belirtilmemiş grubu','Tarihli sürüm geçmişi; sağ alt köşede imza ve tıklanabilir sürüm göstergesi','Favicon / PWA ikonları, mobil görünüm ve çevrimdışı kullanım iyileştirmeleri']},
  {version:'1.1',name:'Teacher Experience Update',date:'2026-10-16',dateKind:'release',features:['Öğrenciye özel yönetim paneli, program hazırlama ve ilerleme takibi','Sınav, ders, kategori ve alt konu seçimi; açıklama ve XP belirleme','Haftalık tekrar sayacı ve günde bir kez tamamlanabilen günlük görevler','Bekleyen programı geri çekme ve onaylı hafta silme','Rekabet XP / Kişisel XP ayrımı ve sadeleştirilmiş öğrenci görev formu','Açılır menü, bildirim katmanı ve PWA ikon iyileştirmeleri']},
  {version:'1.0.1',name:'Visualization Update',date:'2026-10-14',dateKind:'archive',features:['Floating sol navigasyon, bağımsız üst çubuk ve yuvarlatılmış paneller','Klasik ve Bulanık görünümü; yarı saydam cam yüzeyler','Açık, koyu ve sistem temasıyla uyumlu endüstriyel arka planlar','Bağımsız vurgu rengi, renksiz mod ve görünüm seçimi']},
  {version:'1.0',name:'Teacher & New Look',date:'2026-10-14',dateKind:'archive',features:['D.E.R.S. markasına geçiş','Öğretmen–öğrenci daveti, bağlantı onayı ve program kabul / ret akışı','Ana sayfa, Programım, Öğretmen ve Çalışma geçmişi ekranları','Supabase hesabı, cihazlar arası senkronizasyon ve PWA kurulumu','Mobil / masaüstü düzeni; açık, koyu ve sistem teması']},
  {version:'0',name:'YKS Quest Board',date:'2026-10-10',dateKind:'archive',features:['Günlere kilitlenmeyen haftalık görev havuzu ve hafta seçimi','Ders kategorileri, filtreleme ve manuel görev oluşturma','Görev tamamlama, XP, seviye ve haftalık ilerleme takibi']}
 ].sort((a,b)=>compare(a.version,b.version));
 root.DersReleases={releases,compare,formatDate};if(typeof document==='undefined'){module.exports=root.DersReleases;return;}
 const dialog=document.createElement('dialog');dialog.id='releaseHistoryDialog';dialog.className='ders-dialog release-history';dialog.dataset.autoSave='';dialog.setAttribute('aria-labelledby','releaseHistoryTitle');
 dialog.innerHTML='<header class="appearance-heading"><h2 id="releaseHistoryTitle">Sürüm Geçmişi</h2><button type="button" class="icon-button" aria-label="Sürüm geçmişini kapat" title="Kapat"><i data-lucide="x"></i></button></header>'+releases.map(r=>`<section><h3>${r.version==='0'?'Beta':'v'+r.version} · ${r.name}</h3>${r.date?`<p><span>${r.dateKind==='archive'?'Arşiv tarihi':r.dateKind==='preview'?'Önizleme tarihi':'Çıkış tarihi'}: </span><time datetime="${r.date}">${formatDate(r.date)}</time></p>`:''}${(r.sections||[{items:r.features}]).map(s=>`${s.title?`<h4>${s.title}</h4>`:''}<ul>${s.items.map(f=>`<li>${f}</li>`).join('')}</ul>`).join('')}</section>`).join('');document.body.append(dialog);
 const trigger=document.getElementById('versionHistoryButton');function close(){dialog.close();window.DersUI.modalClosed('release-history');trigger.focus({preventScroll:true});}trigger.onclick=()=>{dialog.showModal();window.DersUI.openModal('release-history',dialog,close);};dialog.querySelector('button').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};
 const footer=trigger.closest('.app-footer'),mobile=matchMedia('(max-width:720px)');let frame;
 // Keep the fixed mobile signature out of the way of scrolling page content.
 function positionFooter(){frame=null;const box=footer.getBoundingClientRect();footer.classList.toggle('footer-obscured',mobile.matches&&[...document.querySelectorAll('.page-header,.page-view:not([hidden]) > *')].some(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.left<box.right&&r.right>box.left&&r.top<box.bottom&&r.bottom>box.top;}));}
 function scheduleFooter(){if(frame==null)frame=requestAnimationFrame(positionFooter);}
 window.addEventListener('scroll',scheduleFooter,{passive:true});window.addEventListener('resize',scheduleFooter);window.addEventListener('popstate',scheduleFooter);window.addEventListener('hashchange',scheduleFooter);
 const layoutObserver=new ResizeObserver(scheduleFooter);layoutObserver.observe(document.querySelector('.workspace'));layoutObserver.observe(footer);scheduleFooter();
})(typeof window==='undefined'?globalThis:window);
