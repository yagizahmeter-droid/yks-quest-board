# TYT / AYT konu kataloğu aktarım notları

## Kaynak ve kapsam

Kullanıcının sağladığı `2026-2027 YKS Konu Dağılım Rehberi` PDF'sinin dört
sayfası görsel olarak kontrol edilerek `curriculum.js` içine aktarılmıştır.
Belgenin ÖSYM/MEB uyumu iddiası bağımsız olarak doğrulanmamıştır. Bu katalog
resmen yayımlanmış veya eksiksiz bir ÖSYM konu listesi olarak sunulmaz.
Belgede bulunmayan konular tahmin edilerek eklenmemiştir.

| Sınav | Ders | Kategori | Seçilebilir alt konu |
| --- | ---: | ---: | ---: |
| TYT | 9 | 21 | 103 |
| AYT | 11 | 21 | 96 |
| KPSS (korunan) | 6 | 6 teknik grup | 16 |

### TYT

| Ders | Kategori | Alt konu |
| --- | ---: | ---: |
| Türkçe | 3 | 14 |
| Matematik | 4 | 32 |
| Fizik | 3 | 10 |
| Kimya | 3 | 11 |
| Biyoloji | 2 | 7 |
| Tarih | 2 | 8 |
| Coğrafya | 2 | 8 |
| Felsefe | 1 | 8 |
| Din Kültürü ve Ahlak Bilgisi | 1 | 5 |

### AYT

| Ders | Kategori | Alt konu |
| --- | ---: | ---: |
| Matematik | 4 | 16 |
| Fizik | 3 | 14 |
| Kimya | 3 | 12 |
| Biyoloji | 2 | 13 |
| Türk Dili ve Edebiyatı | 3 | 14 |
| Tarih-1 | 1 | 5 |
| Coğrafya-1 | 1 | 4 |
| Tarih-2 | 1 | 5 |
| Coğrafya-2 | 1 | 5 |
| Felsefe Grubu | 1 | 3 |
| Din Kültürü ve Ahlak Bilgisi | 1 | 5 |

## Adlandırma ve ayrıştırma kararları

- Kaynaktaki `Matematik ve Geometri`, mevcut `Matematik` dersinin altında
  tutulur; `Geometri` / `İleri Geometri` kategorileri ayrıdır. Ayrı bir ders
  oluşturulmadığı için mevcut programların ders kimlikleri değişmez.
- Kaynaktaki `Din Kültürü`, mevcut `Din Kültürü ve Ahlak Bilgisi` dersine
  karşılık gelir. `AYT Fizik/Kimya/Biyoloji` ön ekleri sınav alanında taşınır.
- Üst düzey virgüller ayrı konulara ayrılır; parantez içi virgüller açıklamanın
  parçasıdır. Örneğin Türev, İntegral, Sözcük Türleri, Özel Üçgenler, Katı
  Cisimler, Trigonometri ve Felsefe Grubu başlıklarının açıklamaları korunur.
- TYT kimyadaki `Asitler, Bazlar ve Tuzlar` üç seçenek olur.
- TYT felsefedeki ortak `Felsefesi` eki ilgili konu adlarına dağıtılır:
  Bilgi, Varlık, Ahlak, Sanat, Din, Siyaset ve Bilim Felsefesi.
- AYT biyolojide ortak `Sistemleri` eki Sinir, Destek-Hareket, Sindirim,
  Solunum, Boşaltım ve Üreme başlıklarına taşınır. Boşaltım ve Üreme ayrı
  seçenektir; Duyu Organları ve Dolaşım-Bağışıklık birleşikliği korunur.
- `Psikoloji, Sosyoloji, Mantık` kaynakta tek kategori hücresidir; üç yeni
  kategori icat edilmez. Üç disiplin ayrı, açıklamalı alt konulardır.
- KPSS'nin eski ders/konu adları ve sıralaması aynen korunur; yalnızca seçim
  zinciri için her dersin altında `Genel Konular` teknik grubu gösterilir.

## Belirsiz / birleşik / kaynakta bulunmayan başlıklar

- AYT Kimya, Organik Kimya hücresinde gerçekten `Hidrokarbonlar (Alkan,
  Alken, Alkin, Aritmetik)` yazmaktadır. `Aritmetik` muhtemel bir kaynak
  hatasıdır; doğrulanmadan `Aromatik` yapılmamıştır. Öğretmen Özel konu
  seçeneği ile istediği adlandırmayı kullanabilir.
- `Elektrik ve Magnetizma`, `Ekstremum Noktalar`, `Çözünürlük Dengesi (KÇÇ)`
  kaynak yazımıyla korunmuştur.
- `Basınç ve Kaldırma Kuvveti`, `Fiiller ve Fiilimsiler`, `Limit ve Süreklilik`,
  `Diziler ve Seriler`, `Dolaşım-Bağışıklık Sistemleri`,
  `Komünite/Popülasyon Ekolojisi`, `Orta/Yeni Çağ Avrupa Tarihi` gibi kaynakta
  birlikte verilmiş başlıklar birlikte tutulur. Parantez içleri ayrı bir
  beşinci hiyerarşi düzeyine çevrilmez.
- Eski kısa kataloğun `Basınç`, `Paragraf`, `Canlıların Ortak Özellikleri`,
  `Atomun Yapısı` gibi bazı adları kaynakta aynı adla bulunmaz. Eski görevler
  yeniden adlandırılmaz veya silinmez. Kopyalanınca Özel konu olarak gelir.
- Soru sayıları yalnızca kaynak bilgisidir; katalogda XP, soru adedi veya
  tekrar varsayılanı bulunmaz. Bunlar öğretmenin mevcut form ayarlarıdır.

## Veri ve yayın güvenliği

Katalog ve kategori seçimi istemci tarafındadır. `category` alanının eskiden
olduğu gibi ders anlamında kalması sağlanır; yeni `topic_category` yalnızca
taslak gezinmesidir. Program gönderim sözleşmesi, kanonik öğretmen görevi
kilitleri, kişisel/Rekabet XP ayrımı, tekrar kayıtları, RLS ve hesaplar değişmez.
Migration gerekmez. Mevcut kayıtlar üzerinde toplu dönüşüm yapılmaz.
Bu çalışma yalnızca test/preview dalına hazırlanır; production yayını ayrıca
onay gerektirir.
