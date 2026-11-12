# D.E.R.S.

D.E.R.S.; öğrencinin görevlerini, çalışma sürelerini ve deneme sonuçlarını takip ettiği, öğretmenlerin program ve sınıflarını yönettiği web uygulamasıdır.

## Kullanım

- PC ve telefonda https://dershub.vercel.app adresine aynı hesapla giriş yap. Yeni hesap için en az 10 karakterli, benzersiz bir parola kullan. Mevcut hesapların girişinde yeni kayıt sınırı uygulanmaz.
- **Programım:** Kendi haftalık tekrar veya günlük görevlerini ekle. Ders filtreleri ve Tamamlananlar bölümü görevleri düzenler. Görev sayacı yalnızca hedefi biten görevleri sayar; **Tekrar İlerlemesi** tamamlanan çalışma adımlarını gösterir. Örneğin 2/4 tekrar, %50 ilerleme ve 0 tamamlanan görevdir.
- **Öğretmen:** Davet koduyla bağlantı isteği gönder; gelen programı inceleyip kabul veya reddet. Öğretmen görevlerinde değişiklik isteme akışı korunur.
- **Sınıflar:** Öğretmenin oluşturduğu sınıflara davet veya bağlantıyla katıl. Programlar, ortak görevler ve sınıf gizlilik tercihleri burada yönetilir. Deneme ve çalışma süresi paylaşımı isteğe bağlıdır.
- **Denemelerim:** TYT/AYT için doğru ve yanlış sayılarını gir; boş ve net otomatik hesaplanır. Eksik testler sıfır sayılmaz. Grafik ve geçmiş, gerçek sınav tarihini kullanır.
- **Odak Modu:** Görev seçerek veya serbest çalış. Geçici çevrimdışı süreler bu cihazda tutulur ve bağlantı geri gelince eşitlenir. Çakışma olursa kayıt korunur ve hata gösterilir.
- **Çalışma Geçmişi:** Gün/hafta ve kategori filtrelerini kullan. Temizle işlemi kayıtları silmez; görünüm ve çalışma özetlerinden gizler. **Gizlenen Kayıtlar** ile geri getir. Gizleme/geri getirme görevleri ve XP'yi yeniden ödüllendirmez.

Chrome'da Ana ekrana ekle / Uygulamayı yükle; iPhone Safari'de Paylaş > Ana Ekrana Ekle kullanılabilir. PWA çevrimdışı kabuğu saklar; ilk giriş, davetler ve sunucu işlemleri internet gerektirir. Classic, Saydam, Natural ve Cloud görünümleri ile açık/koyu/sistem teması korunur.

## Mimari ve veriler

Statik JavaScript PWA, Supabase Auth/Postgres ve yalnızca açık publishable anahtar kullanır. Kullanıcı panosu `quest_board_states` içinde kalır; öğretmen görevleri, tekrarlar, çalışma süreleri, sınıflar ve denemeler mevcut RPC/RLS kurallarıyla yetkilendirilir. Tarayıcı rolü sunucu yetkisi oluşturmaz.

Hesaba özel yerel önbellek ve üç yönlü board birleştirmesi bağımsız cihaz değişikliklerini korur. Öğretmenin kontrolündeki alanlarda sunucu geçerlidir. Çalışma süresi kuyruğu sabit kayıt kimlikleriyle yeniden denenir. PWA Supabase yanıtlarını veya kullanıcı ilerlemesini ortak statik önbelleğe koymaz.

`week-dates.js`, gerçek tarih alanlarını ve açık yıllı eski aralıkları kullanır. Adı değişmiş bir haftanın kimliği/tarihi değişmez. Tarihi bilinmeyen eski haftalara varsayımsal yıl atanmaz; kararlı eski sıra korunur.

## Geliştirme ve test

```sh
npm start
npm run lint
npm run build
npm test
```

Yerel adres: http://127.0.0.1:4173. Dosyayı `file://` üzerinden açma; manifest, servis çalışanı ve önizleme izolasyonu HTTP(S) gerektirir. Bağımlılıklar paket dosyalarıyla sabitlenmiştir; yerel vendor SDK'ları yayın paketindedir.

`tests/integration.cjs`, ayrı yerel PostgreSQL ve örnek hesaplar kullanır. Staging testleri yalnızca `hswipswqulolcwqvcjvi` test projesine ve yok sayılan `.env.staging-test.json` dosyasındaki örnek hesaplara izin verir; kimlik bilgilerini depoya ekleme. Windows testleri kurulu Chrome'u kullanır. Çalışma ortamının yolu gerekiyorsa Node'u `-r ./scripts/windows-realpath.cjs` ile başlat.

v1.3.2 odaklı kontroller: `tests/v132-*.cjs`. v1.3.1 deneme regresyonu: `tests/exams.cjs`, `tests/v131-core.cjs`, `tests/v131-staging.cjs`. Sonuçların kapsamı ve doğrulanamayan cihazlar sürüm raporunda belirtilir; emülasyon gerçek cihaz testi sayılmaz.

## Güvenli yayın

Mevcut Vercel projesi `yks-quest-board-yks-quest-board-app`, GitHub deposu `yagizahmeter-droid/yks-quest-board`, canlı dal `main` ve ana adres `dershub.vercel.app` olarak korunur. `config.js` yalnızca açık bağlantı bilgisi içerir. Production build, canlı Supabase `jswgagzbetwviamiwcck` ve doğru Vercel projesini doğrular.

Önce ayrı staging ve Vercel Preview üzerinde test et. `node scripts/build.cjs --production` ve `node tests/release.cjs` kontrollerini çalıştır. `scripts/build.cjs` yalnızca uygulama varlıklarını yayınlar; testler, SQL, yedekler ve yerel kimlik bilgileri dağıtıma girmez.

Canlı migration veya Auth ayarından önce şema/politika önkontrolü, sunucuda kapalı yedek ve geri dönüş planını doğrula. Mevcut veriyi yeniden oluşturma/sıfırlama. Yeni production yetkileri ve dağıtım için kullanıcının ilgili sürüme verdiği yayın onayı gerekir. v1.3.2 veritabanı planı: `docs/V132-DATABASE.md`. Önceki `V1*`/`TEST_REPORT` belgeleri kendi sürümlerinin arşividir; güncel yapılandırma yerine kullanılmamalıdır.
