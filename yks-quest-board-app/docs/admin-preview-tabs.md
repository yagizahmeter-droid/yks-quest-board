# Yönetici rol önizlemeleri: bağımsız sekme

Öğretmen ve Öğrenci seçeneklerinin her birinde **Yeni Sekmede Aç** bulunur. Mevcut rol düğmeleri panel içindeki önizlemeyi açmaya devam eder. Yeni seçenek gerçek bir tarayıcı sekmesi açar; içinde iframe veya yönetici paneli bulunmaz. Ana yönetici sekmesi ve açık panel önizlemesi korunur.

## Güvenlik sınırı

- Açılışta mevcut `ders_admin_status` sunucu kontrolü kullanılır. Rol atama, yeni yetki, migration veya RLS değişikliği yoktur.
- `admin-preview.html` ve temiz URL karşılığı, HTTP yanıtındaki `Content-Security-Policy: sandbox allow-scripts allow-forms` ile benzersiz kökene sahiptir. `allow-same-origin` verilmez. Ağ, alt çerçeve, worker ve form gönderimi engellenir. Bu HTTP başlığı olmadan açılış reddedilir; meta etiketi sandbox yerine kullanılmaz.
- Yeni sekmenin `opener` bağlantısı içerik yüklenmeden kesilir. Kaynak pencere ve rastgele kanal doğrulanır; yükleme ve hazır bilgisi `MessageChannel` üzerinden geçer.
- Panel içi ve tam sayfa sürümü aynı izinli kaynaklardan hazırlanan arayüzü, aynı bellek içi demo servislerini kullanır. Gerçek Supabase SDK, bağlantı ayarları, kullanıcı durumu ve oturum anahtarları aktarılmaz. CSS, simgeler ve arka planlar satır içinde paketlenir.
- Her sekmenin örnek verisi ayrıdır. Yönetici penceresi açıkken önizlemeyi yenilemek örnek veriyi yeniden başlatır. Paneli kapatmak sekmeleri kapatmaz. Hesaptan çıkış veya yetki kaybı açık örnekleri sonlandırır.
- Yeni sekme rotası çevrimdışı önbelleğe alınmaz; başarısız istekte gerçek `index.html` ile değiştirilmez. Eski service worker bu ayrımı doğrulayamıyorsa açılış durdurulup yenileme istenir.
- Sayfa, normal tarayıcı boyutu ve kaydırması kullanır; ekran görüntüsü engeli veya yakınlaştırma/F11 yakalayan olay dinleyicisi eklenmez.

Sandbox yönergesinin HTTP başlığında bulunma gereği: [MDN CSP sandbox](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox). Yeni pencere tıklama içinde, asenkron işlemlerden önce açılır: [MDN window.open](https://developer.mozilla.org/en-US/docs/Web/API/Window/open).

## Doğrulama

`tests/admin-preview-tabs.cjs`, gerçek staging Auth ve yalnızca önceden ayrılmış sentetik yönetici hesabıyla çalışır. Production istekleri engellenir. Not: demo işlem geçmişi mevcut staging yönetici günlüğüne yazılır; gerçek kullanıcı kayıtlarında test yapılmaz.

Yerel Chrome/Chromium ve WebKit'te 13'er kontrol grubu geçti:

- İki URL'de gerçek HTTP sandbox başlıkları.
- Bağımsız üst pencere, boş opener, opak köken, iframe bulunmaması.
- Gerçek Teacher Workspace, üç örnek öğrenci ve örnek taslak kaydı.
- Klasik/Saydam/Natural/Cloud, 1920/1440/430/390/360 px.
- Normal kaydırma ve tam sayfa ekran görüntüsü.
- Öğrenci örnek görevi, sekmelerin ve ana hesap verisinin ayrılığı.
- Yenileme sonrası güvenli yeniden açılış ve mobil dokunma.
- Mevcut panel içi iki rol ve geri dönüş.
- Açılır pencere engeli, eksik güvenlik başlığı ve eski worker için anlaşılır hatalar.
- Panel kapanınca bağımsız kullanım, oturum kapanınca önizlemenin sonlandırılması.

`tests/v150-pwa.cjs`: yeni worker'ın güvenli rota bildirimi, demo rotasının önbelleğe alınmaması, çevrimdışıyken gerçek uygulamaya düşmemesi ve normal PWA çevrimdışı açılışı geçti. JavaScript/ikon/yapılandırma kontrolleri ve production hedefini doğrulayan statik build geçti. Build çalıştırılması production yayını değildir.

Fiziksel telefon, işletim sistemi F11 tuşu ve tarayıcı menüsündeki gerçek yakınlaştırma bu otomatik testlerle sınanmadı. Boyut değiştirme ve dokunma tarayıcıda taklit edildi; WebKit sonucu fiziksel iPhone testi olarak sunulmaz.
