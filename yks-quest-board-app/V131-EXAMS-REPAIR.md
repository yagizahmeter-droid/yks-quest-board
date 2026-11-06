# D.E.R.S. v1.3.1 — Deneme Takip Sistemi Onarımı

Tarih: 7 Kasım 2026. Temel: production d85e6f63d5167f29348ffc431e58a5bc65613153.

## Kök nedenler ve değişiklikler

- Eski grafik kodu her kısmi kayıtta çizgiyi kesiyordu. İki kısmi deneme gerçek staging hesabıyla yeniden üretildi: iki nokta, sıfır çizgi. Artık geçerli noktalar sınav tarihine göre bağlanır; kısmi parçalar kesiklidir.
- Boş sayısı elle isteniyordu. Yeni form doğru/yanlış çiftinden boş ve net türetir. İki boş giriş girilmemiştir; açık 0/0 tamamı boştur. Eski bilinmeyen değerler okunurken değiştirilmez.
- Tarih karşılaştırıcısı zaten exam_date kullanıyordu. Varsayılan azalan sıra korundu, yön seçimi eklendi. Gerçek eşzamanlı yenileme testinde eski yanıtın düzenlenen kaydı geri getirmesini önlemek için zorunlu yenileme sıraya alındı.
- Dokunma sonrası uyumluluk mouseenter olayı önceki noktayı yeniden seçebiliyordu. Yakalanan olay sırası bunu doğruladı; hover artık pointer türüne göre çalışır.
- Genel performans, toplam/ders grafikleri, ders özeti ve geçmiş ayrı tema panelleridir. Eksik dersler sıfır ortalamaya katılmaz; tam deneme istatistikleri kısmi kayıtları dışlar.

## Doğrulama

- Mevcut 12 hesaplama testi ve yeni 16 odaklı hesaplama testi.
- Gerçek staging Auth/RPC/RLS ile 19 uçtan uca kontrol; istenen 17 kabul senaryosunun tamamını kapsar.
- 360 / 390 / 430 / 1440 px, Classic / Saydam / Natural / Cloud, açık/koyu: 32 görünüm birleşimi.
- Gerçek SVG çizgisi, hover/dokunma/klavye, negatif net, aynı gün ayrı kayıtlar, geçmiş tarih, düzenleme/silme, kayıt hatası ve tek kimlikle yeniden deneme.
- Fareyle gerçek kaydırma çubuğu sürükleme, form odağı, kaydetme/kapatma erişimi.
- İkinci bağımsız cihaz ve yeniden yükleme, yetkili öğretmen salt okunur görünümü, yabancı öğrenci RLS engeli, öğretmen yazma engeli.
- Test öncesi mevcut staging denemeleri karşılaştırılarak korunur. Yalnızca benzersiz test önekiyle oluşturulan kayıtlar temizlenir. Production Supabase istekleri testte engellenir ve sıfır olduğu doğrulanır.
- JavaScript sözdizimi/HTML kimliği/açık yapılandırma kontrolleri, 7 yayın güvenliği testi ve production build.

## Veri ve yayın sınırları

SQL, migration, RLS, öğretmen/sınıf sistemi, görev ve XP kodları değiştirilmedi. Aynı practice_exams ve ders_exams API sözleşmesi kullanılır. Production yapılandırması mevcut jswgagzbetwviamiwcck projesine kilitlidir. Önizleme ayrı staging veritabanına bağlanır. Gerçek kullanıcı hesabında yazma testi yapılmaz.

Üretim öncesi geri dönüş noktası: d85e6f63d5167f29348ffc431e58a5bc65613153; önceki Vercel deployment dpl_BeJFNW7hnRXmgiLp8fu8kd5bYSLo. Veritabanı değişmediği için geri dönüş yalnızca uygulama dağıtımıdır.
