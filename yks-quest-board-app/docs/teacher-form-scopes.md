# Öğretmen görev formu: otomatik ad ve Genel kapsamı

## Davranış

Öğretmenin yeni görev oluşturma alanında manuel görev adı girişi yoktur.
Sınav, ders, kategori ve alt konu seçilir. Gerçek alt konu seçildiğinde onun
adı, Genel seçildiğinde kategori adı görev başlığı olur. Görev çıktısı formda
salt okunur önizlenir. Açıklama boş bırakılabilir; XP ve tekrar ayarları aynen
korunur. Kişisel quest formundaki özel ders/konu ve serbest ad girişi etkilenmez.

Genel, `DersCurriculum.topics` listesine eklenmemiştir; konu sayıları değişmez.
Öğretmen seçicisinde yalnızca bir UI komut değeridir (`__category`). Sunucuya
`topic_scope: category`, `topic_name: null`, `topic_category: seçili kategori`
gider. Normal alt konu için `topic_scope: topic` ve gerçek `topic_name` gider.

## Kalıcı alanlar ve güvenlik

Mevcut `exam_type` ve `category_name` (ders) korunur. Ek alanlar:
`topic_category`, `topic_name`, `topic_scope`. Eski görevlerde üçü de NULL
kalır. Eski başlıklar, JSON board'lar, XP olayları ve geçmiş kayıtları topluca
dönüştürülmez. Aynı program kopyalanırken eski katalog dışı başlıklar salt
okunur Eski görev seçeneği olarak, özgün adlarıyla korunur.

`title`, eski API ve görüntüleme uyumluluğu için tutulmuş türetilmiş bir
kopyadır. Yeni alanlarla görev gönderildiğinde istemcinin verdiği başlık
dikkate alınmaz; sunucu alt konu/kategori üzerinden hesaplar ve trigger ile
aynı kuralı uygular. Genel için gerçek bir alt konu kaydı oluşturulmaz.
Metadata kabul edilen öğrenci board'una kanonik görevden aktarılır; öğrencinin
konu/kapsam veya ad üzerinde doğrudan oynaması sunucu tarafından reddedilir.

Yeni türetilmiş başlıklar değişiklik isteğinde serbestçe yeniden adlandırılamaz;
açıklama/XP talepleri çalışır. Eski görevlerdeki ad değiştirme akışı korunur.
Tekrar sayacı ve XP defteri mevcut sunucu kurallarını kullanır. RLS politikası
ve kullanıcı rolleri değiştirilmez. Önceki özel action fonksiyonu dış istemciye
açılmaz. Yeni metadata desteği olmayan sunucuda form, sessiz veri kaybı yerine
program göndermeyi durdurur.

## Migration, yedek ve geri dönüş

`migrations/20261015180312_teacher_topic_fields.sql` yalnızca
`hswipswqulolcwqvcjvi` test projesinde uygulanmıştır. Sürüm, Supabase migration
servisinin ürettiği gerçek sürümdür; Windows CLI'nin ayar klasörü erişim sorunu
nedeniyle uzak migration aracı kullanılmıştır.

İşlem öncesi board, öğretmen görevleri, bağlantılar, programlar, profiller,
değişiklik talepleri, davetler, XP olayları ve önceki action/projection
tanımları `ders_private.teacher_update_backups` içinde saklanır. Tek transaction
içindeki koruma kontrolleri, eski board JSON/version veya eski görev sütunları
değişirse işlemi geri alır.

Test projesinde işlem öncesi/sonrası: 5 hesap, 4 board, 54 öğretmen görevi.
Board parmak izi iki tarafta da `20270f2c688e1652b1363f5a8be7f40d`;
eski görevlere konu metadata'sı yazılan kayıt sayısı 0.

Canlı projeye uygulanmamıştır. Production yayını ayrıca onay gerektirir.
Geri dönüşte önce önceki uygulama deployment'ına dönülür; yeni nullable
sütunlar ve yedekler silinmez. Veritabanı işlevlerini geri almak gerekiyorsa
yazma işlemleri durdurularak saklanan tanımlar incelenir ve ayrı transaction
ile geri yüklenir; mevcut görev/XP satırları yedekle topluca ezilmez. Yeni
scope'lu görevler oluşturulduktan sonra sütun silmek bir geri dönüş yöntemi
değildir. Otomatik veya yıkıcı rollback script'i çalıştırılmaz.

## Kontroller

Gerçek fare/touch seçimleri, arama, Genel ve normal alt konu adları, boş
açıklama, öğrenci önizleme/kabul/tamamlama, kaydetme/reload, tekrar XP'si,
kişisel XP ayrımı, eski görev kopyalama ve 360/390/430/1280px boyutları
test edilir. Backend testleri ayrıca sahte başlığın yok sayılmasını, hatalı
kapsamların reddini ve metadata değiştirme girişimlerinin engellenmesini
doğrular.

Supabase güvenlik taramasında yeni bir RLS/grant uyarısı yoktur. Özel deny-by-
default tablolardaki policy yok bilgileri ve önceden mevcut
[sızmış parola koruması uyarısı](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
değiştirilmemiştir.
