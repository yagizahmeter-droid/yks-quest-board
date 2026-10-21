# v1.1.4 Katalog Doğrulaması

İnceleme: 21 Ekim 2026. Katalog öğrenci ve öğretmenin kullandığı aynı
`curriculum.js` dosyasındadır. Veritabanında katalog tablosu veya seed çalıştırılmadı.

## Kaynaklar

- MEBİ Konu Özeti Kitapları: https://ogmmateryal.eba.gov.tr/mebi-konu-ozetleri
- MEBİ Tarama Testleri: https://ogmmateryal.eba.gov.tr/mebi-tarama-testi-kitaplari
- ÖSYM 2026 YKS Kılavuzu: https://www.osym.gov.tr/2026yuksekogretim-kurumlari-sinavi-yks-kilavuzu

MEB'in herkese açık kitap kataloğundan 20 konu özeti ve 18 tarama kitabının
içindekiler ve ön sayfaları incelendi. Tarama kitaplarındaki soruların tamamı
tek tek denetlenmedi; numaralı test içindekileri konu listesi gibi kullanılmadı.
Konu özeti kitaplarının içindekileri, kitap kimlikleri, PDF adresleri, SHA-256
özetleri `catalog-v114-provenance.json` dizininde; başlıklar ve fiziksel
içindekiler sayfaları onun işaret ettiği `catalog-v114/` ders dosyalarında
tutulur. PDF'ler ve ön sayfa metinleri uygulamaya dağıtılmaz.
Tarama kitapları test kapsamını karşılaştırmak için kullanıldı; test numaraları
ve soru sayıları konu, XP veya tekrar sayısına dönüştürülmedi.

## Yapılanlar

- Hidrokarbonlardaki hatalı “Aritmetik” kaldırıldı; Aromatik Hidrokarbonlar,
  alkan, alken, alkin ve fonksiyonel grup başlıkları kaynaklarına ayrıldı.
- Bağıl hareket, manyetizma, indüksiyon, alternatif akım ve transformatörler;
  endokrin sistem, bağışıklık, biyoteknoloji ve bitki başlıkları tamamlandı.
- Türkçede sözcük türleri ve fiil başlıkları ayrıldı. Matematikte işçi,
  periyodik ve rutin olmayan problemler; fonksiyon ve polinom alt başlıkları eklendi.
- AYT Felsefe Grubu, Felsefe / Psikoloji / Sosyoloji / Mantık olarak ayrıldı.
- Virgüllü alt başlıklar parantezleri bozmadan ayrıldı; bölüm numarasıyla
  yinelenen aynı başlıklar birleştirildi. Kaynaktaki belirgin yazım hataları düzeltildi.
- İnsan ve bitki üremesindeki “Döllenme” başlıkları aynı başlığa indirgenmedi.
  Bitki bağlamı “Bitkilerde Döllenme” etiketiyle doğru ebeveyninde korunur.

Son sayım: TYT 9 ders / 74 kategori / 550 alt konu; AYT 11 ders / 111 kategori /
870 alt konu. KPSS 6 ders / 6 nötr grup / 16 başlık, değişmedi. Sayımlar katalog
yollarını içerir; Tarih-1/2 ve Coğrafya-1/2 ortak başlıkları her testte sayılır.

## Sınırlar ve Belirsizlikler

- Bu, ÖSYM'nin yayımladığı “eksiksiz 2027 konu listesi” değildir. 2026 kılavuzu
  test yapısını gösterir; kitapların her ayrıntısının 2027'de sorulacağını garanti etmez.
- MEB kitapları Tarih-1/Tarih-2 ve Coğrafya-1/Coğrafya-2 için ayrı, birbirini dışlayan
  içerik listeleri vermiyor. Uygulama iki testi ayrı tutar ve doğrulanmış ortak
  içeriği ikisinde de sunar; uydurma özel kapsam ayrımı yapmaz.
- AYT matematikte önceki sınıfların fonksiyon/polinom/denklem/geometri temelleri
  TYT kitabındaki gerçek başlıklara referansla korunur. Bazı başlıkların iki sınavda
  bulunması hata sayılmadı. Geometri, Matematik testi içinde kalır.
- TYT tarih özeti ilk çağ/orta çağ ayrıntılarını dar tutar. Ortak temel başlıklar
  AYT tarih kaynağıyla işaretlenmiştir; kitap etiketi tek başına sınav dışılık kanıtı değildir.
- Ana konu grupları uygulamanın editoryal gezinme düzenidir; resmî kitap ünite adı
  olmayan gruplar ÖSYM'nin resmî sınıflandırması gibi sunulmaz.
- Kaynaktaki TYT matematik 63/64 aynı sayfadaki tek açıklamayı iki satıra ayırıyor;
  “Fonksiyon Sorularında Dikkat Edilmesi Gerekenler” olarak birleştirildi.
- Edebiyat kaynağının basılı sayfa numaraları ile PDF sayfa adedi tam örtüşmüyor;
  doğrulamada içindekilerin fiziksel PDF sayfaları kullanıldı.

## Veri Koruma

Eski 199 katalog yolunun durumu kaynak dosyasında retained/regrouped/legacy_only
olarak kayıtlıdır. Bunlar veri taşıma talimatı değildir: görev başlığı, ders kimliği,
atanmış görev, eski taslak ve tamamlanma kayıtları otomatik yeniden yazılmaz.
Eski başlıklar mevcut formların eski-kayıt seçeneğiyle gösterilir. Katalog dışı
Özel Konu seçeneği korunur. KPSS girdileri eski sürümle birebir karşılaştırılır.
Veritabanı migration'ı, tablo veya RLS değişikliği gerekmez.
