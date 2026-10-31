# v1.3.0 kapsam ve erişim denetimi

Denetim: 31 Ekim 2026. Bu belge production'a yayımlandığı anlamına gelmez. Kanıtlar yalnızca yerel PostgreSQL ve ayrılmış Supabase test ortamına aittir. Gerçek kullanıcılar test verisi olarak kullanılmaz.

Durumlar: **Tamamlandı ve çalışıyor**, **Kodlandı ama bağlantısı eksik**, **Kısmen tamamlandı**, **Hiç geliştirilmedi**. Son durumlar yerel ve ayrılmış Supabase test ortamında doğrulanmıştır; production yayın durumu ayrıca belirtilmiştir.

## Bildirilen eksikliğin gerçek nedeni

- Gerçek öğretmen hesabında ayrı Sınıflar navigasyonu ve çalışan sınıf modülü vardı. Ancak Öğretmen sayfasından belirgin geçiş yoktu: **Kodlandı ama bağlantısı eksik**.
- Yönetici önizlemesinin güvenli dosya listesinde `classes.js` ve `classes.css` yoktu; çerçeve bu dosyaları çıkarıyordu: **Kodlandı ama bağlantısı eksik**.
- Önizlemenin örnek veri katmanında `ders_classes` işlemleri yoktu: **Hiç geliştirilmedi**. Gerçek Supabase çağrısına düşürmek yerine çerçeve belleğine ayrılmış örnek bağdaştırıcı eklendi.
- Sınıf sayfası ana içerik kabının dışına eklenmişti; ana kabın minimum yüksekliği ilk ekranda boş alan bırakıyordu: **Kodlandı ama bağlantısı eksik**. Sayfa diğer görünümlerle aynı ana kaba taşındı; testler ilk ekranda görünürlüğü de denetler.
- Sınıf özetinde sabit programların listesi ve istatistiklerde haftalık çalışma/ödev grupları eksikti: **Kısmen tamamlandı**.
- Test Supabase'inde dört migration zaten kuruluydu. Production'da sınıf sistemi kurulmadı; production yayını yapılmadı.

## Özellikler

| Özellik | Düzeltme sonrası durum | Doğrulama / uygulama |
|---|---|---|
| Öğretmen ve öğrencide Sınıflarım'a erişim | Tamamlandı ve çalışıyor | Sol navigasyon + Öğretmen sayfası geçişi; gerçek rol ile tarayıcı testi |
| Yönetici Öğrenci/Öğretmen sınıf önizlemesi ve geri dönüş | Tamamlandı ve çalışıyor | Gerçek arayüz modülleri, opaque sandbox, yalnızca çerçeve belleği; `admin-classes.cjs` |
| Sınıf oluşturma, ad/açıklama düzenleme, birden fazla sınıf | Tamamlandı ve çalışıyor | `classes-db.cjs`, `classes-browser.cjs` |
| Boş sınıfta sahte veri göstermeme | Tamamlandı ve çalışıyor | Gerçek RPC boş dizileri; örnek veri yalnızca yönetici çerçevesinde |
| Sınıf özeti, dönem programları, sabit ödevler, ilk sıralar | Tamamlandı ve çalışıyor | `classes.js` özet görünümü; sabitleme ilerleme/XP değiştirmez |
| Bağlı öğrenci daveti, bağımsız kabul/ret | Tamamlandı ve çalışıyor | Gerçek Supabase Auth ve RPC; ikinci kod istenmez |
| Güvenli bağlantı oluşturma, kopyalama, yenileme/iptal | Tamamlandı ve çalışıyor | Rastgele 32 bayt token, eski token geçersiz; backend ve tarayıcı testleri |
| Bağlantıdan giriş sonrası katılım, öğretmen onayı, mevcut bağlantı entegrasyonu | Tamamlandı ve çalışıyor | Gerçek üç test hesabıyla bağlantıdan katılım |
| Bekleyen isteklerin tekilleştirilmesi, toplu kabul, geçmiş | Tamamlandı ve çalışıyor | Benzersiz indeks, işlem anahtarı, üyeler/istekler sekmesi |
| Üyelikten ayrılma/çıkarma, bağlantı iptalinde erişimin kesilmesi | Tamamlandı ve çalışıyor | Yetkisiz RPC reddi; kişisel veriler ve bireysel bağlantı korunur |
| Arşivleme ve geçmişi koruma | Tamamlandı ve çalışıyor | Yeni etkinlik engellenir; eski raporlar okunur |
| Sınıfın tümüne/seçili üyelere tek hazırlayıcıyla program gönderme | Tamamlandı ve çalışıyor | Mevcut öğretmen katalog, taslak ve görev hazırlayıcısı yeniden kullanılır |
| Bağımsız program kabul/ret, normal/haftalık/günlük ilerleme | Tamamlandı ve çalışıyor | Kanonik atamalar ve tekrar olayları; diğer öğrencinin durumu değişmez |
| Öğrencinin kişisel program adını değiştirmesi ve değişiklik talepleri | Tamamlandı ve çalışıyor | Mevcut öğrenci programı ve yetkili talep RPC'si korunur; talep onay/ret tarayıcı testi |
| Değişiklik Taleplerim sekmeleri ve doğru işlem sayacı | Tamamlandı ve çalışıyor | Bekleyen/Kabul Edilen/Reddedilen; öğrencinin giden isteği kırmızı sayılmaz |
| Sınıfa özel XP, Genel/Rekabet XP ayrımı | Tamamlandı ve çalışıyor | Ayrı ledger; normal/tekrar sınıf ataması tetikleyicileri; kişisel/bireysel görevler hariç |
| Tekrarlı istek, eşzamanlılık, tekrar katılımda çift XP koruması | Tamamlandı ve çalışıyor | Benzersiz kaynaklar, sunucu kilitleri ve gerçek PostgreSQL testleri |
| Haftalık/aylık/tüm zamanlar sıralaması ve isim gizliliği | Tamamlandı ve çalışıyor | RPC dönem filtresi, varsayılan anonim ad, sınıflar arasında XP aktarılmaz |
| Soru ve süre hedefli Ortak Görevler | Tamamlandı ve çalışıyor | Ders/tarih/hedef/havuz; başlamadı/devam/tamam/sona erdi/iptal durumları |
| Beyana dayalı soru katkısı, geçmiş, gerekçeli düzeltme | Tamamlandı ve çalışıyor | Pozitif tam sayı, idempotent kayıt; doğrulanmış soru çözümü iddiası yok |
| Odak kayıtlarından net süre katkısı | Tamamlandı ve çalışıyor | Kendi doğrulanmış ders/tarih/üyelik kaydı; seçili segment, duraklama hariç |
| Segmentin görevler arasında yeniden kullanılmasının engellenmesi | Tamamlandı ve çalışıyor | Veritabanı benzersizliği ve eşzamanlı istek testleri |
| Katkıya oranlı, atomik, tek seferlik ortak ödül | Tamamlandı ve çalışıyor | Deterministik en büyük kalan; havuz aşılmaz, sıfır katkıya ödül yok |
| Dağıtılmış ödüllerde denetlenebilir düzeltme | Tamamlandı ve çalışıyor | Ayrı fark hareketleri; hedef altına düşerse iptal/geri alma, otomatik yeniden dağıtım yok |
| TYT/AYT, ayrı test kapsamları, öğrenci başına son tam deneme, net gelişimi | Tamamlandı ve çalışıyor | Denemesiz öğrenci sıfır sayılmaz, kısmi denemeler ayrı, SQL hesaplama testleri |
| Net çalışma toplamı, günlük/haftalık ortalamalar ve ders dağılımı | Tamamlandı ve çalışıyor | Çalışmayan aktif üyeler paydada; mevcut yetkili günlük veriden haftalık gruplama |
| Tamamlanan/devam/başlamayan görevler ve haftalık kısmi ilerleme | Tamamlandı ve çalışıyor | Program haftasına göre güncel durum; geçmiş tarihteki anlık görüntü gibi sunulmaz |
| Sınıfa özel, varsayılan kapalı isim/deneme/çalışma paylaşımı | Tamamlandı ve çalışıyor | Sunucu/RLS/RPC; küçük grup ve seyrek günlük kovalar gizlenir, kapatma yeniden uygulanır |
| Duyuru oluşturma/düzenleme/silme/sabitleme | Tamamlandı ve çalışıyor | Yetkili öğretmen RPC'si ve öğrenci okuma; mevcut bildirim altyapısı |
| Üye adı/etkinlik/tamamlama/üyelik filtreleri ve Öğrenci Karnesi | Tamamlandı ve çalışıyor | Mevcut yetkili bireysel rapora bağlantı; filtreler ek sorgu gerektirmez |
| Geçmiş program haftaları, öğrenci ilerlemesi, dönem süresi/XP geçmişi | Tamamlandı ve çalışıyor | Program haftası ve dönem seçicisi; arşiv ve eski veriler korunur |
| Rol bazlı davet/katılım/program/duyuru/ödül bildirimleri | Tamamlandı ve çalışıyor | Mevcut bildirim tercihleri/anahtarları; giden isteğe işlem sayacı verilmez |
| Classic/Saydam/Natural/Cloud, açık/koyu, mobil/masaüstü | Tamamlandı ve çalışıyor | 360/390/430/1440 genişlikte 32 görünüm; yönetici önizlemesinde dokunma testi |
| Yeni ilişkisel tablolar, indeksler, özel token ve helper alanı | Tamamlandı ve çalışıyor | Test Supabase'inde 10 yeni public tablo, tamamı RLS; istemcide gizli anahtar yok |
| Geriye uyumlu migration, kapalı sunucu yedeği ve koruma kontrolleri | Tamamlandı ve çalışıyor | Test ortamında dört migration ve önce/sonra mevcut veri/RLS karşılaştırması |
| Lint, ilgili testler, production build | Tamamlandı ve çalışıyor | 220 PostgreSQL/güvenlik/senkronizasyon kontrolü; 6 gerçek Supabase akışı, 32 görünüm; 6 yönetici sınıf akışı; önizleme hata/yeniden deneme regresyonları; 7 yayın koruması; lint ve production build geçti. Ayrı TypeScript projesi yok. |
| Production migration ve yayın | Kodlandı ama bağlantısı eksik — production onayı bekleniyor | Hazır migration dosyaları vardır; otomatik onay denetimi açık production DB onayı eksikliğinden uygulamayı reddetti |

## Önemli sınırlar

- Yönetici çerçevesinin sınıf verileri gerçek Supabase kayıtları değildir; açıkça örnek olarak etiketlenir, ağ erişimi CSP ile kapalıdır. Gerçek rol testleri ayrılmış Supabase test projesinde ayrıca yapılır.
- Çalışma ve görev gelişim grafikleri mevcut kayıtlardan hesaplanır. Eski tarihte kaydedilmemiş anlık durumlar uydurulmaz.
- Production'da gerçek kullanıcı hesabına test daveti, görev, XP veya örnek sınıf yazılmaz.
- Yeni erişim düzeltmeleri ilave migration gerektirmez. Önceden hazırlanan dört sınıf migration'ı production'a ancak ayrıca yetkilendirildiğinde uygulanacaktır.
