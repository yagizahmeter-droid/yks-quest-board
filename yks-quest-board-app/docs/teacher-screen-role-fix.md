# v1.5.0 — Öğretmen ekranı, rol önizlemesi ve yerleşim düzeltmesi

## Gerçek neden ve sınırlar

Gerçek staging öğretmen ve öğrenci hesaplarında Auth, profil ve `ders_action/overview` rolü doğruydu. Yönetici önizlemesinde de hem iframe hem bağımsız sekme doğru örnek öğretmen rolünü taşıyordu. Gerçek öğrenci rolünün öğretmene dönüştürülmesi gerekmiyor; öğrencinin Öğretmenim ekranında davet kodu ve bağlı öğretmen kartı görmesi beklenen davranış.

Eksik bağlantı navigasyondaydı: v1.5.0 Teacher Workspace yüklenmesine rağmen ana menüde doğrudan giriş bulunmuyordu. Öğretmen ana sayfa kısayolu ve yönetici öğretmen önizlemesi hâlâ eski `#/teacher` bağlantılar sayfasını açıyordu. Yeni yönlendirme öğretmeni `#/workspace` ekranına götürür; bağlantılar sayfası ayrı kalır. Menü, düzenlenebilir board JSON yerine sunucunun döndürdüğü profil rolünü kullanır. Öğrenci doğrudan Workspace rotası isterse kendi bağlantı ekranına döner; gerçek öğretmen RPC yetkilendirmesi ayrıca korunur.

Önizleme, örnek kullanıcı kimliği, board profili ve örnek RPC profili aynı rolü doğrulamadan görünür olmaz. Eksik/geçersiz rol sessizce öğrenciye çevrilmez. Gerçek token, Supabase yapılandırması ve kullanıcı durumu demo sekmesine aktarılmaz; mevcut opak köken/CSP ve bellek içi servis sınırı korunur.

Test sırasında ikinci bir hata yeniden üretildi: Admin Paneline Dön yetki kontrolünü beklerken panel kapatılırsa değişken `currentRole` temizleniyor, işlem geçmişine null bağlam gönderilip HTTP 400 oluşuyordu. Geri dönüş artık başladığı rolü, kullanıcıyı ve önizleme neslini korur; geçersizleşmiş callback yeni önizlemeyi kapatamaz.

Production kapısının tekrarında öğretmen panelinde Yenile sürerken etkin görünen Onayla düğmesine basılmasının `busy` kontrolünde sessizce yutulduğu da kaydedildi. Bekleyen işlem boyunca ilgili eylem düğmeleri artık native disabled durumunu taşır; render ile yeniden oluşturulsalar da bu durum korunur ve işlem bitince eski kullanılabilirlikleri geri gelir. Entegrasyon testi gerçek yenileme yanıtını kontrollü bekleterek bu aralığı, erişilebilir bekleme durumunu ve sonrasında değişiklik onayının gerçekten gönderilip öğrenciye ulaşmasını doğrular. Mevcut davranış assertion'ları korunur.

Uzun önizleme testinde 15 saniyelik normal board eşitlemesinin eski JSON profil etiketini yeniden yükleyebildiği görüldü. Bu, Auth veya sunucudaki kullanıcı rolünün değişmesi değildir. Hesap başlığı ve başlangıç ekranı kararı artık navigasyonla aynı doğrulanmış sunucu profilini kullanır. Öğrenci/öğretmen testi, yerel JSON'a ters rol etiketi koyarak gerçek sunucu rolünün ekranda korunmasını ayrıca sınar; bu değişiklik yalnızca test penceresinin belleğinde tutulup geri alınır. Önizleme izolasyonu testinde karşılaştırmalar normal eşitleme tamamlandıktan sonra yapılır ve canonical sunucu board/sürüm/XP eşitliği de ayrıca aranır.

Test yardımcılarında ayrıca render sırasında kopabilen option/satır referansları vardı: `evaluateAll` ile önceden alınan çocuklar, callback çalışana kadar yenilenebiliyordu. Seçenek ve grup bilgisi, satır geometrisiyle aynı şekilde tek tarayıcı görevi içinde güncel kökten okunur. Gerçek fare seçimi, değer eşitliği, tüm satırların geometri ve veri koruma assertion'ları korunur; eksik seçenek/satır açık test hatasıdır.

Başlık düzenindeki kök neden, ders kartlarına ait genel `.card-head` sınıfının bağlantılar başlığında da kullanılmasıydı. Natural/Cloud tema kuralları bu alanı etkiliyordu. Başlık artık ortak temalı kart yüzeyini ve kendine ait sınıfları kullanır. Açıklamadaki gereksiz `62ch` sınırı, tekrarlanan boşluklar ve davet alanındaki sabit genişlik etkisi giderildi. Öğrencinin davet alanı ile bağlı öğretmenleri uyarlanabilir grid içindedir; mobilde tek sütundur.

## Değişen uygulama dosyaları

- `index.html`, `ui.js`: role uygun Workspace/bağlantılar navigasyonu ve başlık.
- `teacher.js`, `ui.css`: bağlantılar başlığı, davet/kart yerleşimi ve sınıf açıklaması.
- `admin-preview.js`: doğrulanmış örnek rolle doğrudan gerçek Workspace açılışı; yükleme/hata görünümü.
- `admin.js`: önizlemeden dönüşte asenkron rol/oturum yarışı.
- `service-worker.js`: yalnızca statik önbellek r2; uygulama sürümü v1.5.0 kalır.

Veritabanı migration'ı, RLS değişikliği, gerçek rol ataması ve production veri yazımı yoktur. Teacher Workspace iş mantığı değiştirilmedi.

## Doğrulama

- Gerçek Supabase staging Auth ile sentetik öğretmen/öğrenci: 8 rol/önizleme grubu, 64 yerleşim kombinasyonu. Dört görünüm, açık/koyu ve 1440/1920/768/390 px. Menü, ana sayfa, iframe, bağımsız sekme, üç örnek öğrenci, rol değişimi, geri dönüş ve yenileme.
- Önce/sonra canonical board, sürüm ve XP karşılaştırması aynı. Demo ağ isteği, production Supabase isteği ve beklenmeyen konsol/ağ hatası yok. Öğrencinin öğretmen RPC reddi beklenen ve ayrıca doğrulanan sonuçtur.
- Ayrı yerel PostgreSQL/RLS: öğrenci+admin hesabından öğretmen iframe/sekmesine geçiş ve dönüşte 5 grup. Gerçek öğrenci rolü ve öğretmen API reddi korunur. Genel entegrasyonun 220 veritabanı/güvenlik/senkronizasyon kontrolü geçti.
- Workspace regresyonu: 81 veritabanı/güvenlik grubu ve 42 gerçek tarayıcı grubu. Çoklu pencereler, dock, üçlü düzen, taslaklar, şablonlar, zamanlama, raporlar, XP ve bağlantı iptali sınırları. Android Chromium ve iPhone WebKit emülasyonu dâhil; fiziksel cihaz testi değildir.
- Yavaş örnek profil yanıtında yanlış öğrenci ekranının görünmediği ve geçersiz rolün anlaşılır hatayla kapalı kaldığı iki tarayıcı kontrolü.
- Bağımsız yönetici önizlemesinin 13 Chrome grubu: CSP, ağ/depolama ayrımı, yeniden açılış, mobil dokunma, kaydırma, eksik koruma/eski worker ve oturum sonlandırma.
- PWA r2 statik kabuk, ikonlar, çevrimdışı açılış ve özel yanıtları önbelleğe almama kontrolü geçti. Sözdizimi, HTML kimlikleri, simgeler, public yapılandırma ve production build geçti.

Production'ın altı ilgili public dosyası salt okunur karşılaştırmada yayımlanan `cbf9561c1b49b24160eff585b5fd5f6e2941d385` commit'i ile birebir aynıydı. Service worker kapalı staging testinde de eski yönlendirme yeniden üretildi. Kullanıcının kendi tarayıcısında eski önbellek bulunduğu iddia edilmiyor.

Bu düzeltme yalnızca test/önizleme içindir. Production yayını kullanıcı onayı bekler.
