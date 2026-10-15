# Kişisel quest konu kataloğu

Programım > Yeni quest alanı, öğretmen formuyla aynı `DersCurriculum`
kaynağını kullanır: Sınav > Ders > Kategori > Alt konu. TYT, AYT ve KPSS
ayrıdır. Kategori/alt konu menüleri aranabilir; mouse, klavye ve dokunma
ortak `select-controls.js` bileşeninden gelir.

Öğrencinin oluşturma formunda görev adı alanı yoktur. Katalog konusu seçilirse
başlık konudan otomatik üretilir. Özel konu veya kişisel ders için açıklamanın
ilk satırının ilk 120 karakteri uyumlu başlık olarak kullanılır; açıklamanın
tamamı ayrıca saklanır. Bu akışta boş açıklama kaydedilmez. Katalog konusu
seçiliyken açıklama boş kalabilir. Açıklama ve XP seçimlerden etkilenmez.
Öğretmen formu ve eski görevlerin düzenlenmesi bu değişikliğin kapsamı dışındadır.
Seçimleri gezmek board verisine yazmaz. Eksik bir katalog dersi yalnızca
Quest ekle sırasında mevcut `ensureCategoryForHint` üzerinden oluşturulur;
var olan ders kimlikleri, renkleri ve görevleri korunur. Aynı adlı birden
çok eski ders kaydı silinmez; seçenekleri numaralı etiketle ayırt edilir.

Yeni görev `source: Manuel`, `lockedForStudent: false` olarak oluşturulur;
öğretmen ataması kimliği almaz. `examType` ve katalogdan seçildiyse
`topicCategory` metadata'sı JSON içinde saklanır. Mevcut görevler dönüştürülmez.
Kişisel katalog görevi tamamlandığında yalnızca kişisel XP artar. Rekabet XP
ve öğretmen görevlerinin sunucu taraflı güvenlik kuralları değişmez.

`personal-catalog.js` sadece form seçimlerini yönetir; asıl ekleme, kayıt ve
senkronizasyon mevcut board yolunu kullanır. Yeni dosya build ve yerel sunucu
izin listelerine, sözdizimi kontrolüne ve PWA önbelleğine eklenmiştir. Veritabanı
migration'ı gerekmez. Önizleme test Supabase projesine bağlı kalır.

Testler: `tests/personal-catalog.cjs`, mevcut tam regresyon paketi ve
`tests/staging.cjs`. Kapsam: TYT/AYT/KPSS, özel ders/konu, yeni dersi ilk kayıtta
oluşturma, eski ders ID'sini kullanma, aynı adlı kayıtlar, hesap değişimi,
telefon-PC/offline senkronizasyonu, yalnızca kişisel XP, açıklama ve eski
görevlerin korunması; 360/390/430/1280px, Classic/Bulanık ve açık/koyu temalar.
