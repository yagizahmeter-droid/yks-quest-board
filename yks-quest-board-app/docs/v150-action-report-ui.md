# v1.5.0 — Aksiyon Merkezi ve Öğrenci Karnesi arayüz düzeltmesi

## Kök neden

Aksiyon Merkezi, `auto-fit/minmax(190px,1fr)` ile 1600 px ekranda altı kartı aynı satıra yerleştiriyordu. Kart ve iç butonun ayrı padding değerleri yazı alanını daraltıyordu. Ayrıca `>[data-teacher-action]>span` seçicisi Motion'ın eklediği `.motion-face` sarmalayıcısını sayaç sanıyor; başlığı da 22 px yapıp başlık/sayıyı yatay olarak sıkıştırıyordu. `overflow-wrap:anywhere` kelimelerin ortadan bölünmesine yol açıyordu. Rapor kartı sayısal değer yerine uzun bir eylem metnini aynı dar alana koyuyordu.

## Yapılanlar

- Kartın başlığı, sayısal değeri ve tek **İncele** eylemi ayrı semantik öğelere taşındı. Artık Motion'ın buton içeriğini sarmalaması kart yerleşimini değiştirmiyor.
- Bölüm genişliğine göre CSS Grid: geniş alanda en fazla dört kolon, tablette iki, telefonda tek kolon. Eşit genişlik/yükseklik, 20 px iç boşluk ve 16 px grid aralığı kullanıldı. Yalnızca bu bölümün stilleri değişti.
- Sıfır değerler ve açıklamaları gösteriliyor; anlamlı hedef bulunmadığında İncele düğmesi gösterilmiyor.
- İki okun gerçek işlevi **kart sıralamasıydı**. Korundu; varsayılan görünümden çıkarılıp **Kart sırasını düzenle** moduna taşındı. Önceye/Sonraya taşı kontrolleri klavyeyle kullanılabilir; sınırdaki geçersiz hareketler kapalıdır. Mevcut cihazdaki sıralama tercihi korunur.
- Mevcut yedi hedef akışı ve filtreleri değişmedi. Yenileme verisi aynıysa DOM güncellenmiyor. Değişen sayaçlar mevcut Motion sayı animasyonunu kullanıyor; kart/ızgara kimlikleri korunuyor. Hover boyut veya konum değiştirmiyor.
- Öğrenci Karnesi konu satırında sol tarafta tek açılır ok ve konu adı, sağ tarafta küçük/ikincil durum ve süre var. Esnek satır `space-between` kullanır; dar alanda durum alttaki satıra sağa hizalanır. Native details/summary klavye ve dokunma davranışı korunur.

## Tarayıcı doğrulaması

Chrome/Chromium ve WebKit'te gerçek uygulama bileşenleri, yalnızca mevcut bellek içi örnek servislerle çalıştırıldı. Supabase ağ istekleri engellendi ve gerçekleşen istek sayısı sıfırdı. Veritabanı, kullanıcı hesabı, görev, XP veya yetkilendirme değişikliği yapılmadı.

| Ekran genişliği | Aksiyon Merkezi | Karne durum/süre |
| --- | --- | --- |
| 1440, 1600, 1920 px | 4+3 | Aynı satırda sağda |
| 1024, 768 px | İki kolon | Aynı satırda sağda |
| 430, 390, 360 px | Tek kolon | Ayrı satırda sağda |

Her iki tarayıcıda Aksiyon Merkezi için 10 kontrol grubu geçti: yedi başlık/değer, sekiz genişlik, 20 değişmeyen yenilemede DOM kimliği, değişen sayaç, hover/tıklama/klavye, sıralama, sıfır değerler, yedi gerçek hedef akışı, dört görünüm ve azaltılmış hareket.

Karne için her iki tarayıcıda sekiz genişlik, uzun konu başlığı, Tamamlandı/Bekliyor durumları, sıfır süre, Enter ile açma/kapatma, dokunma ve Klasik/Saydam/Natural/Cloud görünümleri geçti. Bu testler fiziksel cihaz testi değildir.

İlgili ek kontroller: mevcut DOM koruma testleri, JavaScript/ikon/yapılandırma kontrolü ve production hedef doğrulamalı build başarılı. Production yayını yapılmadı.

Test dosyaları: `tests/v150-action-center-ui.cjs`, `tests/v150-report-row-ui.cjs`, `tests/v150-dom.cjs`. Mevcut `tests/v150-actions-browser.cjs` sıralama testinin görünür düzenleme modunu açması sağlandı. Kaynak veya önceki işlevler sıfırlanmadı.
