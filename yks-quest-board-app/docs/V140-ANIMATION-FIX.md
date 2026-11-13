# v1.4.0 animasyon kararlılığı düzeltmesi

13 Kasım 2026. Mevcut v1.4.0 üzerine dar kapsamlı arayüz düzeltmesi. Planlama aşamasındaki Teacher Workspace, öğrenci dock'u ve küçük/ana pencere değiştirme sistemi bu çalışmaya dahil değildir.

## Yeniden üretilen nedenler

1. `DersUI.refresh()` ve öğretmen verisi yenilemesi `draw()` üzerinden aynı `ders:route` bildirimini tekrar gönderiyordu. Efekt katmanı her bildirimi yeni navigasyon sanıyordu: tek sayfada 14 yenilemelik deney, öğretmen yenilemeleriyle birlikte **22 giriş animasyonu** oluşturdu. Opaklık 0,4'e ve konum +5 px'e tekrar dönüyordu. Tıklamanın iki kez işlenmesi bu durumun nedeni değildi.
2. `.destination:hover` bağlantı kartının tamamını 3 px yukarı taşıyordu. İmleç kartın alt kenarındayken küçük fare hareketleri kartı hedef alanının dışına çıkarıp tekrar geri getiriyordu. Deneyde 7–8 gereksiz çıkış/giriş görüldü.
3. Yeni bir içerik geçişi eskisini iptal edip sabit ilk kareden başlatıyordu. Kesintide ölçülen opaklık yaklaşık **0,913 → 0,45** oldu. Sayı geçişi de eski işi son hedefe zorlayıp yeni sayıya oradan başlıyordu.
4. XP/seviye HUD'u veri yenilemesinde doğrudan yeniden yazılıyordu. Devam eden seviye geçişinde çubuğun `%100` değerini erken `%10` yapmak, ardından eski zamanlayıcının çubuğu yeniden sıfırlaması mümkündü.

## Düzeltmeler ve dosyalar

- `motion.js`: giriş efektini gerçek rota ve görünür sayfa kimliği değişimine bağlar. Mevcut `ders:route` abonelerinin veri/görünürlük bildirimleri korunur. Aynı elemanın aynı görsel özelliğini etkileyen eski animasyon, görünen kare okunarak değiştirilir; başlangıç karesine dönülmez. Sayı/ilerleme işleri güncel değerinden devam eder, aynı hedefin kalan süresini korur. Seviye geçişinin aşamaları veri yenilemelerinden ayrılır ve iptal edilmiş aşama geri çalışmaz.
- `index.html`: çalışan efekt yöneticisi varken XP metnini onun dışında tekrar yazmaz; yöneticinin bulunmadığı durum için mevcut düz metin yedeği kalır.
- `ui.css` / `motion.css`: kartın tıklanabilir sınırı sabittir. Hafif hover hareketi kartın içeriğinde sürer; kenarlık ve vurgu korunur. Dokunmatik cihazlara hover hareketi uygulanmaz.
- `service-worker.js`: v1.4.0 önbelleği `r2` olarak yenilenir. Uygulama sürümü değişmez.
- `release-history.js`: mevcut v1.4.0 notlarına kısa titreme düzeltmesi özeti eklenir.
- `tests/motion-stability.cjs`: yeniden üretme (`--repro`) ve düzeltme regresyon testi; yalnızca güvenli örnek öğretmen/öğrenci verileri kullanır, tüm Supabase çağrılarını engeller.

Animasyonlar kaldırılmadı; süre veya gecikme artırılarak sorun gizlenmedi. Auth, RLS, sorgular, görev verisi, XP hesaplaması ve veritabanı değişmedi.

## Doğrulama

- Aynı yenileme deneyinde **22 bildirim / 0 yeni giriş animasyonu**; opaklık ve konum sabit.
- Kart kenarında **1 giriş / 0 çıkış**, kartın kendisi sabitken iç hover hareketi korunur.
- Yarım kalan fade ve sayı geçişi güncel karesinden devam eder; seviye çubuğu aynı veri tekrar geldiğinde sıfırlanmaz.
- 13 odaklı tarayıcı grubu: tek aktivasyon, hızlı 12 aç/kapa, animasyon ortasında ters yön, hover, iki örnek öğrenci ve ayrı taslaklar, öğretmen sekmeleri, geri/ileri navigasyon, dokunmatik, tercihler ve azaltılmış hareket.
- Classic, Saydam, Natural ve Cloud; açık/koyu; 360, 390, 430 ve 1440 px (32 birleşim).
- Chrome ve WebKit dokunmatik emülasyonu. Fiziksel telefon testi iddiası yoktur.
- v1.4.0'ın görev/XP, çevrimdışı PWA, deduplikasyon ve sınıf ayrımı için 16 tarayıcı regresyon grubu; 11 yüzey bağlantısı kontrolü.
- Odak Modu süre/halkası, kayıt ve mini sayaç kontrolleri; lint, 7 güvenli yayın kontrolü ve production build.

Pencere açıp kapama ve taslaklar mevcut öğretmen panelinde test edildi. Yeni dock veya öğrenci penceresi sistemi eklenmedi. Testler görev/XP JSON'unun aynı kaldığını ve dış Supabase çağrısı yapılmadığını doğrular. Production'a yayın için ayrı onay gerekir.
