# v1.5.0 production release — 16 Kasım 2026

Bu yayının açık onayı, son arayüz düzeltmeleri dahil v1.5.0 için verildi. Önceki belgelerdeki “production için onay yok” ifadeleri geçmiş staging çalışmalarını anlatır; staging SQL'i canlıya olduğu gibi çalıştırılmaz.

## Sabit hedefler

- Repository: `yagizahmeter-droid/yks-quest-board`.
- Onaylı arayüz: `7d2b406b80e3a10b6988e77217acd963bb7e8082`, `ders-v1-5-0-workspace-preview`.
- Önceki production/geri dönüş kodu: `2ea1d7a7013b32921f48852845b2bcfe06b70044`.
- Mevcut proje: `prj_x2vIkhipW3ZaACfDAiOld1mXKZ4T`, `yagizahmeter-9033`.
- Canlı adres: `https://dershub.vercel.app`; canlı Supabase `jswgagzbetwviamiwcck`.
- Test Supabase: `hswipswqulolcwqvcjvi`. Bu yapılandırmalı preview production'a yükseltilmez; canlı için mevcut public yapılandırma kullanılır.
- Vercel proje ortam değişkeni listesi boş; bağlantı `config.js` üzerinden sağlanır. Üretim build koruması canlı proje/bağlantı ve yalnızca public publishable anahtar gerektirir.

## Şema ve yedek

Canlıda M1–M7 yoktu; eski sınıf `action`, `detail`, `stats` tanımları staging M1 öncesi yedeğin tanımlarıyla birebir aynıydı. İncelenen canlı public şema özeti `3b60197bfcac264d5aa3535abb627976`.

`scripts/v150-production-release.cjs`, tüm yedi adımı **tek transaction** içinde üretir. İncelenen şema ve üç eski fonksiyonun hash'i uyuşmazsa işlem başlamaz. `REPEATABLE READ` tutarlı karşılaştırma sağlar; kilit bekleme sınırı 5 saniyedir. Eski public/auth kullanıcı kayıtları değiştirilmez.

Önce mevcut sunucu içi `ders_release_private.app_snapshots` alanına `1.5.0-pre` yedeği alınır. Bu tablo RLS ile kapalıdır; anon/authenticated okuma hakkı yoktur. Uygulama satırları, fonksiyon tanımları/ACL'leri, indeksler ve tablo izinleri sunucuda tutulur. Ham kullanıcı verisi yerel dosyaya veya build'e çıkarılmaz.

Her adım kendi kapalı yedeğini ve doğrulamasını taşır. Son kontrol, başlangıçta var olan tabloların tüm satırları ve RLS politikalarının aynı kaldığını, eski indekslerin korunduğunu, yedi adımın doğrulandığını, native zamanlayıcının etkin olduğunu ve worker'ın istemciye kapalı olduğunu kontrol eder. Herhangi bir fark tüm işlemi geri alır.

Adımlar: M1 üyelik/bağlantı dönemleri ve sınıf doğruluğu; M2 sayfalı sınıf bölümleri; M3 öğretmen taslakları; M4 şablon ve idempotent gönderim makbuzları; M5 yetkili raporlar; M6 native zamanlanmış gönderim; M7 öğretmen aksiyon merkezi ve ilgili indeksler.

## Test kapıları

Genel entegrasyon testi güncel Teacher Workspace ve yedi adımlı korumalı kurulumla çalışır. Bireysel eski formun yerini çalışma alanı aldığı için test akışı yeni gerçek arayüze uyarlandı; özellik kapatılmadı veya iş kuralları testleri geçirmek için değiştirilmedi. Hareketli XP için nihai değer beklenir, geçici animasyon kopyaları yerine gerçek `#board` kapsamı doğrulanır. Ay seçeneği görünür native etiketten bulunur; yalnızca test sırasında kullanılan onay dinleyicisi temizlenir.

Bireysel öğretmen akışı artık `input[name="name"]` kullanan gerçek çalışma alanıyla sınanır: öğrenci seçimi, bağımsız sunucu taslakları, önceki program, şablondan bağımsız kopya, gönderim incelemesi, kabul, günlük/haftalık tekrar, iki cihaz ve kayıp yanıt tekrarı. `#assignmentName` yalnızca hâlen kullanılan sınıfa toplu program formunda korunur; bu testler gerçek yerel PostgreSQL/RLS davet ve üyelik akışından oluşturulan sınıfı kullanır. Hiçbir assertion veya XP/gizlilik senaryosu başarısızlığı gizlemek için kaldırılmaz.

İki gerçek erişilebilirlik sorunu dar kapsamda onarılır: tamamlanmış tekrarlı görevin altındaki bağımsız düzenle/detay kontrollerine `aria-disabled=false` verilir; tamamlamanın engeli korunur. Öğrenci formu açılırken native `::details-content` hâlâ `content-visibility:hidden` olabildiğinden odak, gerçek görünürlük durumuna göre bir sonraki çizim döngüsünde uygulanır. Sabit gecikme eklenmez, animasyon kapatılmaz; başka alana taşınmış odak veya kapanmış/gizlenmiş form geri çekilmez. Chrome ve WebKit üzerinde açık/kapalı hareket ve masaüstü/mobil odak-yazma regresyonu vardır.

Önceki `Bad Request`, bu sohbetin çalışma turundaki üst seviye hata kaydıdır (`{"detail":"Bad Request"}`). Son komut kayıtları tamamlanmıştı; hata Supabase migration veya Vercel deployment yanıtına bağlanmıyordu. Bu noktada production değişikliği başlamamıştı. Devam ederken branch, şema ve migration durumları yeniden okunur; uygulanmış olabilecek bir işlem körlemesine tekrarlanmaz.

Yeni çalışma alanındaki geçmiş program → şablon → bağımsız kopya regresyonu ayrıca gerçek bir alan eşleme hatasını yakaladı: kaynak öğrenci JSON'u `topicScope/topicCategory/topicName`, kopyalayıcı yalnızca `topic_scope/topic_category/topic_name` okuyordu. Böylece Genel, eski konu gibi görünüyordu. Kopyalayıcı artık iki biçimi de okur; kategori kapsamı ve null alt konu korunur. Mevcut öğrenci kayıtları ve XP değiştirilmez; yalnızca yeni kopyanın tanımı doğru oluşturulur.

Yerel PostgreSQL/RLS ile v1.5.0 güvenlik, zamanlama, taslak ve tarayıcı testleri; staging'de gerçek öğretmen/öğrenci Auth ve tarayıcı kapalı native Cron gönderimi; son kart/karne arayüzleri ve admin rol önizlemeleri yayın öncesinde çalıştırılır. Bir hata varsa main güncellenmez.

Sürüm etiketi ve sürüm geçmişi `v1.5.0` yayın durumuna geçer. PWA cache'i `ders-pwa-v1-5-0-r1`; izole admin sekmeleri önbellek/navigation fallback dışında kalır. Statik build'e SQL, test, `.env` ve yedekler dahil edilmez.

## Geri dönüş

İşlem başarısızsa transaction geri alınır ve eski production kodu kalır. Başarılı migration'dan sonra kod sorunu çıkarsa önce mevcut projeyi yukarıdaki eski production commit/tree'ye döndür. Gerekirse **yalnızca** `ders-v150-program-dispatch` Cron işini durdur; diğer Cron işlerine dokunma.

Yeni tabloları, taslakları, gönderim makbuzlarını veya kullanıcı satırlarını silme. Eski yedeği güncel kullanıcı kayıtlarının üstüne geri yükleme. Backend geriye uyumludur; kod geri dönüşünde ek tablolar pasif kalabilir. Fonksiyon geri dönüşü gerekiyorsa kapalı yedekteki tanım/izinler ayrı incelemeyle kullanılır. Gönderilmiş bir programı iptal etmek mevcut öğrenci görevini silmez.

## Canlı doğrulama sınırı

Gerçek kullanıcı parolaları veya oturum anahtarları alınmaz, test için canlı kullanıcı oluşturulmaz. Canlıda misafir sayfaları, Auth servis erişimi, yayınlanan kaynaklar, production yapılandırması ve PWA eski→yeni cache geçişi veri yazmadan kontrol edilir. Yetkili öğretmen/öğrenci RPC'leri sunucu içinde read-only işlemle ve yalnızca sonuç sayısı/başarı bayraklarıyla sınanabilir. Gerçek kullanıcıyla tarayıcıdan parola girişi test edilmediyse sonuç raporunda açıkça belirtilir.
