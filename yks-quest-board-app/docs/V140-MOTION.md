# D.E.R.S. v1.4.0 — Motion & Haptics

13 Kasım 2026. v1.3.2 temelinden hazırlanmış önizleme; production yayını ayrıca onay gerektirir.

## Değişiklikler

1. `motion.js` / `motion.css`: küçük tik, kart vurgusu, gerçek XP etiketi, tekrar sayacı/çubuğu, seviye çubuğu ve sınırlı başarı konfetisi. Normal görevde konfeti yok; haftanın bitişi, seviye ve sunucuda dağıtılmış ortak hedef ödülü ayrı değerlendirilir.
2. `motion-ledger.js`: hesaba ve sekmeye bağlı işlem niyetleri; kalıcı görülen kimlikler; tekrar yanıtı, sayfa yenileme ve çevrimdışı onayda yeniden oynatma koruması. Yalnızca efekt metaverisi saklanır; board, görev veya XP kayıtlarına yazılmaz. Görülen kimlikler 1024, bekleyen niyetler 128 ve yedi günle sınırlıdır. Depolama hatasında kutlama yapılmaz.
3. Görev efektleri `sync_board` / `read_board` kanonik onayı veya `complete_repeat` idempotent sunucu sonucu ardından çalışır. Ara kişisel tekrar XP üretmez; öğretmen tekrarının mevcut sunucu XP kuralı aynen kullanılır. Toplam, Rekabet, Kişisel ve Sınıf göstergeleri karışmaz.
4. Görünüm → Etkileşim Efektleri: animasyon, dokunsal geri bildirim ve konfeti tercihleri cihazda saklanır. Desteklenmeyen titreşim seçeneği pasiftir. Titreşim görünür sayfa, kullanıcı etkileşimi, API desteği ve kısa aralık korumasına bağlıdır; XP için ikinci titreşim yoktur.
5. Sayfalar, filtreler, butonlar, yeni görevler ve gerçek sıralama değişimleri için kısa geçişler. Etkiler bittiğinde geçici DOM/animasyonlar kaldırılır. Tercih değişimi, sayfa gizlenmesi ve hesap değişimi efektleri durdurur. Natural/Cloud arka plan dekorları hareket ettirilmez.
6. Odak Modu halkası mevcut zamanlayıcı tikinden hesaplanır; çalışma/mola ayrılır. Sayaç motoru, ses, kaydetme ve mini HUD kayıt kuralları değiştirilmez.
7. Net grafiklerinde ilk görünür açılış/filtre değişimi ve değişen sayılarda geçişler. Aynı veri parmak izi otomatik yenilemede tekrar oynatılmaz. Negatif/ondalıklı değerler, tarih sırası ve kesikli kısmi çizgiler korunur.
8. Sınıf sıralamasında aynı üyelerin gerçek sıra değişimi için FLIP; ortak hedef ilerlemesi ve kişinin katkısı için geri bildirim. Ödül yalnızca `status=completed` ve dolu `settled_at` kanonik kaydıyla kutlanır. Toplu program gönderimi tek geri bildirim üretir.
9. `prefers-reduced-motion` ve uygulama animasyon kapatma tercihi desteklenir. İşlevsel metinler, klavye odağı ve son erişilebilir sayısal değerler korunur. Yeni bağımlılık veya migration yoktur. PWA kabuğu ve yayın dosya listeleri v1.4.0 için yenilenmiştir.

## Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| v140-ledger | 21 depolama, niyet, tekrar, hesap/sekme, kota ve bozuk kayıt kontrolü |
| v140-surface-hooks | 11 grafik/sınıf bağlantısı, parmak izi, eski yanıt ve yetkisiz sonuç kontrolü |
| v140-browser | 16 gerçek tarayıcı grubu: geciken onay, normal/ara/son tekrar, seviye, yenileme, kurulu PWA çevrimdışı yeniden açma, tercihler, azaltılmış hareket, grafik, sınıf XP ayrımı, FLIP ve API hata davranışı |
| v140-focus | 10 grup; 40 telefon/tablet/masaüstü açık-koyu görünüm birleşimi; süre, halka, mola, duraklatma, kayıt hatası, mini sayaç, ses çağrı sırası |
| v140-staging | 5 gerçek Auth/RLS grubu; sunucu işlemi tamamladıktan sonra yanıt kaybı, aynı request_id ile duplicate onayı, ara/son öğretmen tekrarı, iki cihaz ve reload; +50 Rekabet / değişmeyen Kişisel XP |
| personal-repeat-staging | 8 akış + 32 görünüm; günlük/haftalık, hızlı çift tıklama, eşzamanlı son tekrar, tek kişisel XP, RLS ve mevcut öğretmen kayıtları |
| classes-staging | 6 akış + 32 görünüm; davet, katılım, program, öğretmen tekrarı, değişiklik isteği, ortak hedef, duyuru ve gizlilik |
| v131-staging | 19 deneme akışı + 32 görünüm; gerçek tarih/net/kısmi kayıt, düzenleme, silme, eski yanıt, ikinci cihaz ve yetkili öğretmen okuması |
| v132-staging | 9 grup; gerçek PWA offline/reload, sabit süre kimlikleri, çakışma reddi, iki cihaz, geçmişi gizleme/geri getirme ve aynı board/XP |
| v132-mobile | 30 Chromium/Android ve WebKit/iPhone emülasyonu kontrolü; 360/390/430px, dört tema, kaydırma, modal ve klavye |
| mini-focus | 16 ana/mini sayaç, sıfırlama, yenileme, çevrimdışı tekrar ve değişmeyen XP/geçmiş kontrolü |
| Hesaplama regresyonları | 12 exams + 16 v131-core; focus-core, 6 study-sync, 10 week-dates ve tekrar ilerlemesi kontrolleri |
| Yayın paketi | JavaScript/HTML lint, 7 güvenli yayın kontrolü ve production build |

Regresyon testleri sayı geçişinin ara karesini nihai veri sanmaz; son erişilebilir değerle eşleşmesini bekler. Hızlı çift tıklama testi gerçek 40 ms aralıklı çift tıklama kullanır. Görsel/sunucu testleri ayrılmıştır; tüm dış veri yazmaları yalnızca `hswipswqulolcwqvcjvi` örnek hesaplarındadır. Production istekleri testte engellenir. Gerçek kullanıcı verisi veya production şeması değiştirilmedi.

## Sınırlar ve geri dönüş

- Fiziksel Android titreşimi ve gerçek iPhone kurulumu test edilmedi. Çağrı desenleri/kapalı ayar/hata ve desteksiz tarayıcı davranışı otomatik test edildi; donanım titreşimi iddiası yoktur. WebKit/iPhone ve Chromium/Android emülasyonu ayrı olarak raporlanır.
- Titreşim arka planda veya cihazın sessiz/rahatsız etme koşullarında garanti edilmez. Efekt defteri yerel sunum korumasıdır; sunucu idempotency veya yetkilendirmesinin yerine geçmez.
- Önizleme ayrı test Supabase projesine bağlıdır. Production adayı mevcut canlı bağlantıyı korur; bu görev production dalına yazmaz.
- Veritabanı değişmediğinden migration/yedek geri yükleme işlemi gerekmez. Onaylı bir sonraki yayında geri dönüş noktası canlı v1.3.2 `2ea1d7a7013b32921f48852845b2bcfe06b70044`; yalnızca önceki uygulama dağıtımı seçilir. Efekt tercihleri/defteri eski uygulama için etkisiz yerel anahtarlardır.
