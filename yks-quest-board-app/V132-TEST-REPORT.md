# D.E.R.S. v1.3.2 — Doğrulama Raporu

12 Kasım 2026. Yalnızca v1.3.1 temeli üzerinde sağlamlaştırma. Production main ve canlı kullanıcı verileri değiştirilmedi; staging projesi hswipswqulolcwqvcjvi.

## Yapılanlar

1. Yeni hesap şifre doğrulaması 10 karakter. Giriş formunda eski şifreler için alt sınır yok. Staging Auth ayarı kullanıcı tarafından 10 yapıldı; gerçek sunucu 9 karakteri weak_password ile reddetti. Ücretli özellik zorunlu değil.
2. Sınıf sorguları yalnızca açık/görünür/çevrimiçi Classes ekranında. Ortak okuma kuyrukları, hesap/görünüm/değişiklik nesilleri ve işlem sonrası taze yükleme; eski yanıtların veya finally bloklarının yeni ekranı bozması engellendi.
3. Study overview okumaları birleştirildi. Yazmadan önce başlamış yanıt uygulanmaz; hesap değişimi yanıtları ayrılır. Süre kuyruğu seri 100'lük paketlerle boşalır ve kayıt kimlikleri korunur. Arka planda 30 saniye sorgusu yok.
4. Ortak week-dates.js; gerçek tarih alanları ve tam yıllı eski aralıklar. Düzenlenebilir adlar/yılsız aralıklar tarih kaynağı değil. Kimlikler ve kayıt dizileri değişmez. Programım/Focus/geçmiş/öğretmen raporu aynı sıralamayı kullanır.
5. Ortak DersQuests.metrics; 2/4 tekrar = %50 ilerleme ve 0 tamamlanan görev. Öğrenci ve öğretmen raporlarında ayrım açık. Ara tekrarlar günlük tamamlanan görev sayılmaz. XP hesapları değiştirilmedi.
6. Temizle'nin gizleme olduğu açık. Gizlenen Kayıtlar'dan seçileni geri getiren gerçek own-only RPC ve arayüz. Kaynak kayıtlar/XP değişmez; yalnızca gizleme maskesi kalkar. Hatalı form ve başarısız kaydetme seçimleri korunur.
7. Beş FK indeksi ve eşdeğer üç RLS InitPlan düzenlemesi için geriye uyumlu migration; kapalı yedek, veri/policy koruma kontrolü ve geri dönüş SQL'i. Eski indeksler ve 7 özel tablonun kapalı RLS kısıtları korundu.
8. README güncel gerçek özelliklere göre yenilendi. Kullanılmayan isim açılımı kaldırıldı. v1.3.2 sürüm notları, public asset/PWA/dev-server listeleri güncellendi.

## Geçen kontroller

| Test | Sonuç |
|---|---|
| v132-classes-refresh | 30 odaklı yarış/görünürlük/işlem-sonrası yenileme kontrolü |
| v132-study-sync | 6 eşzamanlı okuma, hesap değişimi, offline paket ve hata koruma kontrolü |
| v132-week-dates | 10 tarih/yıl geçişi/yeniden adlandırma/kimlik/rapor testi |
| v132-progress | 2/4 ve 4/4, kişisel/öğretmen XP, görünür geçmiş ve şifre sınırı |
| focus-core, history-groups | Zamanlayıcı/sıfırlama ve İstanbul tarih gruplaması regresyonu |
| mini-focus | 16 mini/ana sayaç, reset, offline tekrar ve korunmuş board kontrolü |
| classes-staging | Gerçek Auth/RLS; davet, katılım, program, tekrar, değişiklik, ortak görev ve gizlilik; 32 tema/ekran birleşimi |
| personal-repeat-staging | 8 iş akışı; iki cihaz, eşzamanlı son tıklama, günlük/haftalık hedef ve tek XP; 32 tema/ekran birleşimi |
| v131-staging | 19 gerçek deneme iş akışı; çizgiler, tarih, kısmi/negatif sonuç, düzenleme/silme ve yetkili öğretmen; 32 tema/ekran birleşimi |
| exams + v131-core | Mevcut 12 + yeni 16 hesaplama testi |
| v132-mobile | 30 kontrol; Chromium/Android ve WebKit/iPhone emülasyonu, 360/390/430px, dört görünüm; uzun geri-getirme modalı, kaydırma, klavye, otomatik net |
| v132-staging | 9 gerçek sunucu/PWA/restore/yetki grubu: offline reload, sabit ID ile replay, çakışma hatası, iki cihaz, source JSON ve XP birebir korunması |
| lint / release / build | JavaScript/HTML/public config kontrolü, 7 güvenli yayın kontrolü ve production build |

Tarayıcı testlerinde production Supabase istekleri engellendi ve sıfır olduğu doğrulandı. V131 deneme kodları değiştirilmedi. Eski mini-focus fixture'ının eksik sınıf adaptörü testte tamamlandı; bu bir ürün hatası değildi.

## Veritabanı doğrulaması

Korumalı staging migration'ı uygulandı. 26 public tablo ve 5 Auth hesabı kapalı sunucu yedeğinde; migration içindeki hash karşılaştırmaları eşleşti. Son Advisor'da eksik FK ve Auth RLS InitPlan uyarıları yok. Beş yeni indeksin seçilebilir planları; authenticated board sorgusunda InitPlan + Index Only Scan görüldü. İndeks seçiminde seqscan kapatma yalnızca geri alınan tanılama işleminde kullanıldı. Yük testi/hız kazanımı iddiası yok.

Yetkisiz öğrenci board, report ve gizli deneme sonucunu alamaz. Öğretmen yeni restore RPC'siyle öğrenci gibi davranamaz. Başkasının record_id'siyle restore onun kaydını değiştirmez; student_id/request_user_id sahteciliği reddedilir. İstemci doğrudan history maskesi silemez. Ücretli leaked-password uyarısı ve özel şemalar için kasıtlı RLS/no-policy bilgilendirmeleri korunur.

## Sınırlar ve yayın

- Fiziksel iPhone/Android, gerçek Safari ana-ekrana-ekleme ve Apple ana ekran PWA kurulum döngüsü test edilmedi. WebKit/iPhone emülasyonu ile Chromium PWA offline testi ayrı kanıtlardır.
- Gerçek 6 karakterli eski Auth hesabı test setinde yoktu. Böyle bir şifrenin girişte API'ye iletilmesi iki motorda doğrulandı; server davranışı Supabase'in mevcut hesap uyumluluğuna dayanır.
- Production Auth/DB ve main değiştirilmedi. Preview ayrı staging'e bağlanır. Canlıya geçişte auth minimumu 10 ve korumalı migration için sürüme özel onay, güncel şema/branch kontrolü gerekir.
- Ayrıntılı yedek ve geri dönüş: docs/V132-DATABASE.md; scripts/v132-rollback.sql. Kalıcı rollback çalıştırılmadı.
