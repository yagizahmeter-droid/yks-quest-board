# Animasyon ve arayüz etkileşim düzeltmeleri

15 Kasım 2026 — mevcut v1.4.0 Motion System 2.0 önizlemesi üzerine. Production yayını veya migration yoktur.

## Yeniden üretilen nedenler

| Sorun | Ölçülen neden | Düzeltme |
| --- | --- | --- |
| TYT/AYT sayfa yenilenmesi hissi | `render(host,view)` bütün panelin `innerHTML` değerini değiştiriyordu. Dönüşte başlık ve SVG referansları farklıydı; ek ağ okuması yoktu. | Başlık, TYT/AYT düğmeleri ve filtre kabuğu kalıcı. İki sınavın içerik düğümleri ayrı önbellekte tutulur; aynı veri ve genişlikte SVG yeniden kurulmaz. 360 ms yönlü geçiş yalnızca içerikte çalışır. |
| Geciken tik | Öğretmen tekrarları sunucu işlemi ve ardından board doğrulaması bekliyordu. Kanonik tik animasyonu ancak bu akıştan sonra başlıyordu. | Mevcut işlem niyeti oluşur oluşmaz `onay bekliyor` tiki çizilir; tamamlama sayacı ve XP'nin gerçek kuralları değişmez. Yeniden render, devam eden çizimi başlangıca sıçratmaz. |
| Yanlış XP konumu | Satırın sağ kenarı esas alınıyordu; testte kutucuk merkezinden 454 px uzaklık ölçüldü. Gizli görevde HUD yedeği kullanılıyordu. | Hesap + hafta + görev kimliğiyle yeniden bulunan `.check` ekran koordinatları kullanılır. Efekt aynı kutucuğu scroll/render boyunca izler; gizlenirse başka yere taşınmadan kaldırılır. Artı, gerçek tutar ve XP ayrı; 1250 ms pop/parlama/yükselme korunur. |
| Köşeli kontrol vurgusu | Inline editor `summary` öğelerinde yarıçap 0 ve tam satır genişliği vardı; press gölgesi aynı sınırı izliyordu. | Summary'nin kendi yuvarlatılmış, içeriğe uygun alanı kullanılır. Düğmeler kendi tema yarıçapını korur. Klavye `focus-visible` çizgisi görünürdür. |
| Mavi metin seçimi | Başlık ve kontrol metinleri varsayılan `user-select:auto` kullanıyordu; gerçek çift tıklama `Programım` metnini seçiyordu. | Yalnızca arayüz başlıkları, düğmeler, sekmeler, navigasyon ve kutucuklar seçime kapalı. Paragraf, açıklama, sonuçlar, input/textarea ve düzenlenen içerik seçilebilir. |

## Bekleme, ret ve veri güvenliği

- Bekleyen görsel tik, tamamlandı anlamına gelmez. Öğretmen görevinde `aria-pressed` ve görev sayıları kanonik kalır; `aria-busy` ve kısa durum metni beklemeyi açıklar. XP kutlaması aynı sunucu kanıtı ve idempotency defterini kullanır.
- Öğretmen isteği reddedildiğinde boş kutucuk ve anlaşılır hata gösterilir. Mevcut sabit istek kimliği/kuyruk korunur; yeniden deneme yeni XP işlemi üretmez. Başka cihazdan kanonik tamamlanma geldiyse hata görünümü bu gerçek durumu gizlemez.
- Kişisel tamamlama için yalnızca kesin sunucu yazma reddi (`42501`, `23514`, `22023`, `P0001` veya açık RPC hata sonucu) telafi edilir. İlgili gönderimdeki, henüz kanonik geçmişte bulunmayan kendi tamamlama kimliği eşleştirilir; yalnızca o tamamlanma/tekrar ve ona ait yerel yeni kayıt geri alınır. Başka düzenlemeler, öğretmen görevleri, eski geçmiş ve doğrulanmış XP değiştirilmez.
- Offline, zaman aşımı, kayıp yanıt, oturum yenileme ve version conflict durumları telafi edilmez; önceki eşitleme ve çevrimdışı kuyruk davranışı korunur. Depolama başarısızlığında mevcut güvenli geri dönüş kullanılır.
- Bir görev başka sayfada veya ekran dışında kaldıysa XP başka karttan, sayfa ortasından veya köşeden çıkmaz. Onaylanmış kazanım hesap göstergesine yine işlenir; efekt daha sonra tekrar oynatılmaz.
- Parçacıklar ayrı ve sınırlıdır. Aynı kutucuktan ardışık etkiler doğum noktasını paylaşır, sonrasında küçük ayrışma kullanır. Kenara yakın etikette metin doğumdan sonra okunabilir ekran alanına hafifçe kayar.

## Dosyalar

- `exams.js`, `exams.css`: kalıcı kabuk, iki içerik önbelleği, SVG kimliği ve içerik geçişi.
- `motion.js`, `motion-ui.css`: bekleyen/hatalı tik, kutucuk referansı, XP takibi, kontrol şekli ve dar kapsamlı metin seçimi.
- `index.html`: hafta kimliği işareti ve yalnızca kesin reddedilen kişisel tamamlama için güvenli telafi.
- `quest-system.js`: mevcut tekrar kuyruğuna yeniden deneme/hata görsel bildirimi; tekrar/ödül/RPC kuralları aynı.
- `service-worker.js`: kabuk önbelleği r4. `release-history.js`: aynı v1.4.0 önizlemesinin güncel notları.

## Doğrulama

- `motion-interactions`: 12 gerçek tarayıcı grubu; TYT→AYT→TYT, başlık/SVG kimliği, sıfır ek liste isteği, ilk bekleyen tik, kesin ret/telafi, çift tıklama, aynı istekle tekrar, doğru XP kaynağı, eşzamanlı iki bağımsız etiket, scroll, hızlı ters seçim, klavye, seçilebilir kullanıcı içeriği, dört tema ve 360/390/430 px.
- Chromium ve WebKit dokunmatik emülasyonu; gerçek fiziksel telefon/haptics testi değildir. Tarayıcı fixture'ları güvenli bellek verileri kullanır ve Supabase ağ isteklerini engeller.
- `v140-staging`: ayrı `hswipswqulolcwqvcjvi` test projesinde gerçek öğretmen/öğrenci girişleriyle 5 grup. Sunucu kaydından sonra yanıt kaybı, aynı request_id ile duplicate onay, ara/son tekrar, ikinci cihaz/reload ve yetkisiz öğrenci reddi. Sonuç: tam iki kayıt ve +50 Rekabet XP; Kişisel XP aynı. Production istekleri sıfır.
- 16 görev/XP/PWA, 13 Motion System 2.0, 13 titreme, 11 yüzey bağlantısı, 21 ledger, 12 deneme ve 16 v1.3.1 hesaplama kontrolü; lint, 7 yayın paketi kontrolü ve production build.

Önceki `MOTION2.md` tarihli ilk uygulamayı anlatır; buradaki kutucuk ve bekleme davranışı onun XP yedeği ve yalnızca onaylı tik davranışını günceller. Hesaplama, yetki, RLS, Auth, tablo veya migration değişikliği yapılmadı. Gerçek kullanıcı verisi test amacıyla değiştirilmedi.

Production geri dönüş noktası halen v1.3.2 `2ea1d7a7013b32921f48852845b2bcfe06b70044`; bu çalışma yalnızca önizleme dalına gider. Önizleme öncesi geri dönüş commit'i `efc4c8b1d34825ab4992061fe9cb813586211578`.
