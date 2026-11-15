# Anlık görev tepkisi — v1.4.0 önizlemesi

15 Kasım 2026. Kullanıcının yeni talimatı önceki «XP efekti sunucu onayını beklesin» davranışını değiştirir. Production yayını yapılmaz.

## Ölçülen neden

Önceki kodda `xpFloat()` ve tamamlama spring'i `confirmed()` / `repeatConfirmed()` akışından çağrılıyordu. Normal görevde 700 ms eşitleme geciktirmesi ve ardından ağ, öğretmen tekrarında board okuma → RPC → board doğrulama zinciri bekleniyordu. CSS süresini değiştirmek bu çağrı kapısını açmıyordu.

Tarayıcıda RPC yanıtına 2000 ms eklendiğinde ilk görünür XP normal görevde **2097 ms**, öğretmen tekrarında **2070,8 ms** sonra geldi. Bekleyen tik zaten daha erken görünüyordu, ancak ödül ve belirgin tamamlama spring'i anlık değildi. XP'nin ilk CSS karesi ayrıca tamamen saydamdı. Tam board/ikon/menü yeniden çizimi de ilk boyamaya fazladan iş ekliyordu.

## Değişiklik

- Normal görev ve kişisel tekrar için tamamlama kimliği, öğretmen tekrarı için mevcut request_id tıklama akışında önce oluşturulur. Doğrulama/kaydetme/yeniden çizimden önce ortak `beginCompletion` / `beginTeacher` çağrılır. Efekti başlatan yolda await, ağ, zaman aşımı veya geciktirme yoktur.
- Tik, 500 ms'lik küçük spring, 1250 ms'lik görünür +XP ve destekleniyorsa hafif titreşim aynı tıklama olayı içindedir. Başlangıç XP karesi görünürdür. Mevcut animasyon/titreşim ayarları ve Hareketi Azalt tercihi korunur.
- İlk geri bildirim boyanmadan tam board yeniden kurulmaz. Model ve yerel güvenli kayıt hemen güncellenir; yalnızca pahalı çizim iki RAF ile birleştirilir. Güncel veri zaten başka bir çizimde gösterildiyse bekleyen çizim tekrarlanmaz.
- XP tutarı mevcut görev kuralından alınır: normal görev ve kişisel tekrarın son adımı tek ödül; öğretmen tekrarında mevcut adım ödülü. Ödülsüz kişisel ara adım için sahte +XP yoktur. Sunucu farklı bir tutar doğrularsa hesap onun değerine döner ve anlaşılır bilgi gösterilir.
- Toplam/Kişisel/Rekabet XP sayacı tahmine çevrilmez. Hesap ve seviye yalnızca mevcut kanonik sunucu sonucuyla güncellenir; görsel +XP geçici bir ödül önizlemesidir.
- Doğum noktası tıklanan kutucuğun gerçek belge koordinatıdır. Parçacık checkbox DOM düğümünün içinde değildir. Yeniden render, kısa süreli DOM kaldırılması veya satırın yer değiştirmesi parçacığı yeniden başlatmaz ya da başka göreve taşımaz. Scroll delta'sı uygulanır; sayfa/hafta/hesap değişiminde eski efekt taşınmaz.
- Yeni bir kullanıcı etkileşimi ayrı spring başlatabilir; aynı etkileşimin sonraki DOM düğümleri negatif animasyon gecikmesiyle kaldığı fazı sürdürür. Böylece hızlı geçerli tekrarlar çalışır, otomatik render replay üretmez.
- Var olan hesaba/sekmesine bağlı efekt defterinde `optimistic:<işlem kimliği>` kaydı tutulur. Asıl işlem onayı ayrı kimlikle yalnızca bir kez sonuçlandırılır. Onay, duplicate yanıtı, offline retry ve reload ikinci tik/pop/XP/titreşim oynatmaz. Geciken onaydaki ikinci +XP toast'ı da nötr doğrulama metnine dönüştürülür.
- Kesin sunucu reddi veya yerel kayıt hatasında geçici parçacık/spring iptal edilir; önceki güvenli görev telafisi gerçek durumu geri getirir. Belirsiz ağ/yanıt kaybında başarı varsayılmaz ve mevcut idempotent kuyruk korunur. Aynı kuyruk işleminin yeniden denenmesi önizlemeyi tekrarlamaz.
- Tik kaldırma pozitif efekt başlatmaz. Hızlı çift tıklama tek önizleme üretir, kaldırma bunu iptal eder; gerçek XP mevcut sunucu kurallarını izler.

## Tarayıcı ölçümü ve test

`tests/optimistic-feedback.cjs` gerçek Chrome'da güvenli bellek SDK'sıyla hem normal göreve hem öğretmen tekrarına 2000 ms gecikme uygular. Gerçek click event'inin dispatch aşamasında önizlemenin oluştuğunu, ilk görünür tik/spring/XP karesini ve yanıt saatini ayrı kaydeder.

Son yerel ölçümde başlangıç çağrısı aynı click içinde yaklaşık **7,2–8,1 ms**, ilk görünür kare **26,4–30,2 ms** idi; sunucu gecikmesi yaklaşık **2005 ms** kaldı. Bunlar test makinesindeki ölçümlerdir; «0 ms» yapay bekleme olmadığı anlamına gelir, donanımdan bağımsız sıfır boyama süresi iddiası değildir.

- 7 grup: iki görev tipinde 2 s gecikme; aynı click'te önizleme; bir titreşim; onayda replay olmaması; parçacık/animasyon kimliğinin tekrar render ve geçici DOM kaldırılmasında korunması; kesin ret ve güvenli retry; undo/hızlı çift tıklama.
- 16 görev/XP/PWA regresyonu: kişisel ara tekrar 0 XP, son adım tek ödül, offline/reload, kalıcı efekt deduplikasyonu, doğrulanmış hesap sayacı, tercihler ve sınıf XP ayrımı.
- 13 Motion System 2.0 ve 12 etkileşim grubu; dört tema, masaüstü, 360/390/430 px, Chrome/WebKit dokunmatik emülasyonu ve klavye.
- Gerçek Supabase test projesinde 5 Auth/RLS ve iki cihaz kontrolü: kaybolan yanıt, aynı request_id ile duplicate onay, iki kayıt/+50 Rekabet XP, değişmeyen Kişisel XP, yetkisiz öğrenci reddi. Production isteği sıfır.
- 21 efekt defteri kontrolü, JavaScript/HTML lint, 7 güvenli yayın paketi kontrolü ve production build.

Fiziksel telefon titreşimi test edilmedi; destek, tercih ve API çağrısı sınırları otomatik test edildi. Veritabanı, Auth, RLS, XP formülü ve kullanıcı kayıtlarının yapısı değişmedi. PWA kabuk önbelleği r5; uygulama sürümü v1.4.0 olarak kalır.

Bu belge önceki `MOTION-INTERACTIONS.md` ve `MOTION2.md` içindeki onay sonrası XP görseli davranışının yerine geçer. Production v1.3.2 / `2ea1d7a7013b32921f48852845b2bcfe06b70044` aynı kalır. Önizleme geri dönüş noktası `ff1119b876fedeab1bce3f775b5b3c1c17cdede7`.
