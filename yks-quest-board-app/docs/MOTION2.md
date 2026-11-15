# Motion System 2.0 — v1.4.0 önizlemesi

Güncel kutucuk/XP, kalıcı TYT/AYT ve kontrol davranışı için `MOTION-INTERACTIONS.md` ek düzeltmelerine bak. Aşağıdaki metin ilk Motion System 2.0 uygulamasının tarihli kaydıdır.

15 Kasım 2026. Mevcut v1.4.0 ve titreme düzeltmelerinin üzerine eklenmiştir. Production yayını yapılmaz; Teacher Workspace, öğrenci dock'u ve çoklu pencere kapsam dışıdır.

## Neden ve uygulama

- Eski basma tepkisi yalnızca CSS `:active` süresince ve sınırlı düğmelerde çalışıyordu. Kısa tıklamada efekt fark edilmeden sona eriyordu. `motion-ui.js` artık pointerdown/keydown anında iç yüzeyi hareket ettirir; tıklanabilir sınırı yerinden oynatmaz. İşlemlerin click, yetki veya kaydetme işleyicilerine gecikme eklenmez.
- Eski navigasyon yeni sayfada kısa bir fade kullanıyor, çıkış yönünü göstermiyordu. Ortak yönlü geçiş mevcut hash/history akışını korur. Çıkan görünümün etkisiz, erişilebilirlik ağacından çıkarılmış kopyası geçici kullanılır; kimlikler, form adları, hassas işaretler, dialog ve iframe'ler kopyadan çıkarılır. Asıl form/görev DOM'u ve event işleyicileri klon üzerinden çalıştırılmaz.
- Program, deneme, sınıf, öğretmen öğrenci sekmeleri, talepler ve geçmiş ortak sekme yardımcısını kullanır. Hareketli seçim çizgisi ve içerik yüksekliği geçişi vardır. Yenilemeler aynı seçimi tekrar oynatmaz; geç gelen sonuç için eski animasyon token'ı uygulanmaz.
- Önceki modal kapatma kodları dialog'u kapatıp içeriği hemen temizliyordu. Mevcut dirty/busy/rol kontrollerinden sonra kapanış ortak yardımcıya bırakılır; native close, içerik temizliği ve focus/history işlemleri çıkış bittiğinde çalışır. Yeniden açmak eski kapanış callback'ini geçersiz kılar. Animasyon kapalıysa kapanış hemen tamamlanır.
- Görev görünmüyorsa XP etiketi eskiden ekran ortasına düşüyordu. Artık görev/XP/üst çubuk kenarına bağlanır; artı, tutar ve XP ayrı öğelerdir. Pop efekti ölçümü ölçeklenmiş boyutla yapılmaz; sabit layout ölçüsü ve ayrılmış şeritler büyüyen etiketlerin çakışmasını önler. Efekt sayısı sınırlı ve geçicidir. Sunucu onayı, tutar ve tekrar defteri kuralları değiştirilmez.
- Açıklama balonları fare/klavye ile açılır, ekran sınırına yerleşir ve çıkış ortasında geri gelindiğinde görünen kareden devam eder. Native title kapanınca geri yüklenir. Rol bazlı etkileşim ve erişilebilir adlar korunur.
- Sürüm Geçmişi sabit başlık/kapatma ve tek kaydırılan içerik alanı kullanır. İnce tema scrollbar'ı, klavye odağı ve doğal tarayıcı yedeği vardır. Görünüm ayarları da tek içerik alanında kayar.

## Ortak süreler

`motion.js` süre/easing ve retarget yordamlarını; `motion-ui.js` etkileşim yaşam döngüsünü; `motion-ui.css` geçici katmanları, içerik kaydırmayı ve XP görünümünü içerir. Yeni bağımlılık yoktur.

| Etki | Süre |
| --- | --- |
| Basma / geri dönüş | 100 / 180 ms |
| Hover / açıklama | 200 ms |
| Sekme / sayfa | 360 / 390 ms |
| Modal giriş / çıkış | 430 / 300 ms |
| Görev / XP / seviye | 500 / 1250 / 950 ms |

## Bu değişikliğin doğrulaması

- `tests/motion2-browser.cjs`: anlık press, ileri/geri sayfa yönü, program filtreleri, hızlı seçimler, tooltip/focus, tek scroll ve sabit başlık, değerlendirme çıkışında içerik koruma, geciken onay, birden fazla XP etiketi, deneme/sınıf sekmeleri, yarım kapanıştan dönüş, Escape ve browser Back, tercihler ve dokunmatik modal akışları.
- `tests/motion-stability.cjs`: önceki 13 titreme regresyon grubu. Aynı ekranda refresh, sabit hover alanı, yarıda yön değiştirme, sayı/seviye devamlılığı, iki örnek öğrenci, ayrı taslaklar, geçmiş navigasyonu ve mobil dokunma.
- `tests/v140-browser.cjs`: 16 görev/XP, tekrar, çevrimdışı PWA, replay, grafik/sınıf ve erişilebilir tercih regresyon grubu.
- 21 ledger, 11 yüzey bağlantısı, 10 Odak Modu grubu (40 görünüm birleşimi), 7 yayın paketi kontrolü; JavaScript/HTML lint ve production yapılandırmasıyla build.
- Masaüstü 1440 px ve 360/390/430 px; Classic/Saydam/Natural/Cloud, açık/koyu. Chrome ve WebKit dokunmatik emülasyonu. Fiziksel telefon/titreşim testi yapılmış sayılmaz.

Bu çalışmanın tarayıcı testleri SDK'yı örnek bellek verileriyle değiştirir ve bütün Supabase ağ isteklerini engeller. Gerçek kullanıcı hesabı veya verisine yazılmaz. Önceki v1.4.0 gerçek staging testleri kendi tarihli raporlarında kalır; bu yama için yeniden çalıştırılmış gibi sunulmaz.

## Paket ve geri dönüş

Build/server/PWA ve izole admin önizlemesinin kaynak izin listelerine iki yeni dosya eklendi. PWA kabuk önbelleği `ders-pwa-v1-4-0-release-r3`; kullanıcı verileri bu kabukta saklanmaz. Sürüm v1.4.0 olarak kalır, önizleme notları güncellenir.

Auth, RLS, sorgu/RPC, görev modeli, hesaplamalar veya migration değiştirilmedi. Mevcut production `2ea1d7a7013b32921f48852845b2bcfe06b70044` üzerinde kalır. Önizleme geri dönüş noktası `036ad46957f8c13a47c5c087b0682a5f7928fae7`; yalnızca önizleme uygulama kodu değiştirilir.
