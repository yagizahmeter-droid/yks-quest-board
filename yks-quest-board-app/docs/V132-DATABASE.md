# v1.3.2 Veritabanı ve Yayın Planı

12 Kasım 2026. Canlı temel: c77d028e444e285b831d51b1dd5c42d90a674b53 / v1.3.1. Canlı Supabase jswgagzbetwviamiwcck, staging hswipswqulolcwqvcjvi. Bu çalışma sırasında production veritabanı ve production dalı değiştirilmedi.

## Migration kapsamı

- 20261112192235_v132_performance.sql: class_contributions.class_id, class_events.actor_id, class_program_recipients.class_id, class_xp_ledger.student_id ve class_xp_ledger.task_id için beş normal B-tree indeks. Üç quest_board_states policy'sinde yalnızca auth.uid() → (select auth.uid()) eşdeğerliği; rol, komut ve sahiplik koşulu korunur.
- 20261112192236_v132_history_restore.sql: public.ders_history invoker kapısı ve ders_control_private.history_v132 kontrollü uygulaması. Yalnızca JWT'deki öğrenci kendi gizleme maskelerini listeleyip geri alabilir. 1–100 kayıt doğrulaması, sahte kullanıcı reddi, idempotent yeniden deneme ve mevcut hesap kilitleri kullanılır. Asıl history/segment/task/XP verilerine yazmaz.
- Yeni tablo, silinen indeks, değişen mevcut özel şema erişimi veya XP kuralı yok.

## Kapalı yedek ve koruma

`scripts/v132-migration.cjs` iki dosyayı tek işlemde sarar. Mevcut kapalı ders_release_private.app_snapshots alanında `v1.3.2-pre` yedeği oluşturur; yedekler istemciye indirilmez. Authenticated/anon okuması kapalı değilse, önceki yedek varsa veya policy koşulu beklenmedikse işlem durur. Kilit bekleme sınırı 5 saniye, toplam SQL sınırı 45 saniyedir.

Bütün public tablolar ve auth.users sunucuda saklanır; migration sonrası JSON hash'leri birebir karşılaştırılır. Hedef üç policy dışındaki RLS politikaları da birebir karşılaştırılır. Uyuşmazlıkta tamamı geri alınır. Canlıda yoğun bir anda kilit alınamazsa süre dolumu güvenli duruştur; zorlayarak tekrar denenmez.

Staging'de korumalı migration başarıyla uygulandı: 26 public tablo, 5 hesap; veri koruma hash'leri eşleşti. Yedek kapalı. Testler daha sonra yalnızca örnek hesaplarda çalıştı.

## Planlar ve Advisor

Ön kontrolde 5 eksik FK indeksi ve production'da 3 Auth RLS InitPlan uyarısı doğrulandı. Staging'de üç policy önceden SELECT sarmalayıcısına sahipti; migration iki güvenli biçimi de tanır.

Son staging Advisor: eksik FK indeksi ve Auth RLS InitPlan uyarısı yok. Kullanılmayan indeksler korunur. 7 özel tablo için RLS/no-policy uyarısı kasıtlı kapalı erişimdir; policy eklenmedi. Ücretli leaked-password koruması etkinleştirilmedi.

EXPLAIN ile yeni indeksin kullanılabildiği ve authenticated quest_board_states sorgusunda InitPlan + mevcut primary-key indeksinin bulunduğu doğrulandı. Küçük tablolar doğal olarak Seq Scan seçebilir; enable_seqscan=off yalnızca geri alınan tanılama işlemi için kullanıldı. Gerçek trafik yük testi yapılmadı; ölçülmemiş hız kazanımı iddia edilmiyor.

## Şifre ayarı

Kullanıcı staging Email ayarında minimum uzunluğu 10 yaptı; gerçek Auth 9 karakteri weak_password ile reddetti. Yeni kayıt UI doğrulaması da 10'dur. Login formunda alt uzunluk sınırı yoktur; 6 karakterli eski şifrenin Auth'a iletildiği Chromium ve WebKit testlerinde doğrulandı. Gerçek eski 6 karakterli hesap bu test setinde yoktur. Supabase belgelerine göre mevcut şifreler girişte geçerliliğini korur: https://supabase.com/docs/guides/auth/password-security .

Production yayını onaylandığında yalnızca mevcut Email minimum uzunluğunu 10 yap; diğer Auth/plan/billing ayarlarını değiştirme. Bu çalışma production Auth ayarına dokunmadı.

## Geri dönüş

Uygulama geri dönüşü: mevcut Vercel projesinde c77d028 veya dpl_Be21RNigyTTukKptF7rvP7BpEphb. İlk seçenek yalnızca uygulamayı geri almaktır; eklenen indeksler ve güvenli restore RPC eski uygulamayı bozmaz.

Veritabanı geri dönüşü ayrıca gerekirse, bağımlılıkları kontrol ettikten sonra `scripts/v132-rollback.sql` kullanılır. Üç policy yedekteki gerçek ifadelerine döner, yalnızca bu sürümün yeni indeks/fonksiyonları kaldırılır. Mevcut kullanıcı verileri geri sarılmaz; yayın sonrasında eklenmiş çalışmalar korunur. Geri dönüş SQL'i üretimde çalıştırılmadı; staging üzerinde de çalışan sürümü bozacak kalıcı rollback yapılmadı.

## Yayın kapısı

Önce preview ve ilgili test raporunu incele. Ana site için onaydan sonra tekrar doğru proje, main başı, canlı config, şema/policy ön koşulları ve kapalı yedek kontrol edilir. Önce korumalı migration, sonra uygulama, sonra READY ve PWA doğrulaması yapılır. Test fixture'ları, SQL, yedekler ve kimlik bilgileri statik yayına girmez. Herhangi bir belirsizlikte yayın durur.
