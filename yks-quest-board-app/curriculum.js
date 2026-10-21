(function(root) {
  // Reviewed MEBI book headings; grouping is editorial, not an exhaustive OSYM syllabus.
  const catalog = {
  "TYT": {
    "Türkçe": {
      "Anlam Bilgisi": [
        "Sözcükte Anlam",
        "Cümlede Anlam",
        "Paragrafta Anlam",
        "Paragrafın Yapısı"
      ],
      "Dil Bilgisi": [
        "Ses Bilgisi",
        "Biçim Bilgisi",
        "İsim",
        "Sıfat",
        "Zamir",
        "İsim ve Sıfat Tamlamaları",
        "Zarf",
        "Edat, Bağlaç, Ünlem",
        "Fiilde Kip",
        "Ek-Fiil",
        "Fiilde Yapı",
        "Fiilimsiler",
        "Fiilde Çatı",
        "Cümlenin Ögeleri",
        "Cümle Türleri",
        "Anlatım Bozuklukları"
      ],
      "Yazım ve Noktalama": [
        "Yazım Kuralları",
        "Noktalama İşaretleri"
      ]
    },
    "Matematik": {
      "Temel Matematik": [
        "Sayı Kümeleri",
        "Temel İşlemler",
        "Tek ve Çift Sayılar",
        "Pozitif ve Negatif Sayılar",
        "Ardışık Sayılar",
        "Sayı Basamakları",
        "Asal ve Aralarında Asal Sayılar",
        "Tam Sayılarda Kalanlı Bölme İşlemi",
        "Bölünebilme Kuralları",
        "Asal Çarpanlar",
        "Ebob-Ekok Kavramları ve Özellikleri",
        "Ebob Ekok Problemleri",
        "Rasyonel Sayılarda İşlemler",
        "Ondalıklı ve Devirli Ondalıklı Sayılar",
        "Gerçek Sayılar Kümesinde Aralık Kavramı",
        "Birinci Dereceden Bir Bilinmeyenli Denklemler",
        "Basit Eşitsizlikler",
        "Birinci Dereceden İki Bilinmeyenli Denklemler",
        "Birinci Dereceden İki Bilinmeyenli Eşitsizlikler",
        "Birinci Dereceden İki Bilinmeyenli Eşitsizlik Sistemleri",
        "Mutlak Değer Kavramı ve Özellikleri",
        "Mutlak Değerli Denklemler ve Eşitsizlikler",
        "Üslü İfadeler ve Özellikleri",
        "Üslü İfade İçeren Denklemler ve Eşitsizlikler",
        "Köklü İfadeler ve Özellikleri",
        "Köklü İfadeleri İçeren Denklemler ve Eşitsizlikler",
        "Oran - Orantı Kavramı ve Özellikleri"
      ],
      "Problemler": [
        "Periyodik Problemler",
        "Oran - Orantı Problemleri",
        "Sayı Problemleri",
        "Kesir Problemleri",
        "Yaş Problemleri",
        "İşçi Problemleri",
        "Yüzde Problemleri",
        "Kâr – Zarar Problemleri",
        "Karışım Problemleri",
        "Hareket Problemleri",
        "Rutin Olmayan Problemler"
      ],
      "Mantık": [
        "Önermeler",
        "Bileşik Önermeler",
        "Koşullu Önerme",
        "İki Yönlü Koşullu Önerme",
        "Niceleyiciler",
        "Tanım, Aksiyom, Teorem ve İspat"
      ],
      "Kümeler": [
        "Kümelerde Temel Kavramlar",
        "Alt Küme",
        "Kümelerde Kesişim ve Birleşim İşlemi",
        "Kümelerde Fark ve Tümleme İşlemleri",
        "Küme Problemleri",
        "Sıralı İkililer ve Kartezyen Çarpım"
      ],
      "Sayma ve Olasılık": [
        "Saymanın Temel İlkesi",
        "Faktöriyel Kavramı",
        "Permütasyon",
        "Tekrarlı Permütasyon",
        "Kombinasyon Kavramı ve Özellikleri",
        "Kombinasyon Problemleri",
        "Kombinasyon ve Geometri",
        "Binom Açılımı",
        "Olasılıkta Temel Kavramlar",
        "Basit Olayların Olasılıkları"
      ],
      "Fonksiyonlar": [
        "Fonksiyon Kavramı ve Gösterimi",
        "Fonksiyon Sorularında Dikkat Edilmesi Gerekenler",
        "İçine, Örten, Birebir ve Eşit Fonksiyonlar",
        "Birim ve Sabit Fonksiyon",
        "Doğrusal ve Parçalı Fonksiyon",
        "Çift ve Tek Fonksiyon",
        "Fonksiyonlarda Dört İşlem",
        "Fonksiyon Grafiklerini Çizme",
        "İki Fonksiyonun Bileşkesi",
        "Bir Fonksiyonun Tersi",
        "Fonksiyon Grafikleri ile İlgili Uygulamalar"
      ],
      "Polinomlar ve Çarpanlara Ayırma": [
        "Polinom Kavramı",
        "Polinomlarda Toplama, Çıkarma ve Çarpma İşlemleri",
        "Polinomlarda Bölme İşlemi",
        "Polinomlarda Bölme İşlemi Yapmadan Kalan Bulma",
        "Ortak Çarpan Parantezine Alma",
        "Tam Kare ve İki Kare Farkı Özdeşlikler",
        "Tam Küp, İki Küp Farkı ve Toplamı Özdeşlikler",
        "Üç Terimli İfadelerin Çarpanlara Ayrılması",
        "Rasyonel İfadelerin Sadeleştirilmesi"
      ],
      "İkinci Dereceden Denklemler": [
        "İkinci Dereceden Bir Bilinmeyenli Denklemler",
        "İkinci Dereceden Bir Bilinmeyenli Denklemlerin Çözüm Kümesi",
        "Diskriminant Kavramı ve Diskriminantın Kullanılması",
        "Karmaşık Sayılar",
        "İkinci Dereceden Bir Bilinmeyenli Denklemlerde Kök Katsayı İlişkisi"
      ],
      "Veri ve İstatistik": [
        "Veri",
        "Merkezi Yayılım Ölçüleri",
        "Histogram",
        "Grafik Çeşitleri"
      ],
      "Geometri": [
        "Açı Kavramı ve Çeşitleri",
        "Paralel İki Doğrunun Bir Kesenle Yaptığı Açılar",
        "Üçgende Açılar",
        "İkizkenar ve Eşkenar Üçgende Açı Özellikleri",
        "Üçgende Açı Kenar Bağıntıları",
        "Üçgen Eşitsizliği",
        "Üçgenlerde Eşlik",
        "Üçgenlerde Benzerlik",
        "Üçgenlerde Temel Benzerlik",
        "Üçgenlerde Benzerlik Uygulamaları",
        "Üçgende Açıortay",
        "Üçgende Kenarortay",
        "Üçgende Yükseklik",
        "Üçgende Kenar Orta Dikme",
        "Dik Üçgende Pisagor Teoremi",
        "Öklid’in Çalışmaları",
        "Trigonometrik Oranlar",
        "30°, 45°, 60° Nin Trigonometrik Oranları",
        "Birim Çember",
        "Üçgende Alan",
        "Üçgende Alan Uygulamaları",
        "Çokgenler",
        "Dörtgenler ve Özellikleri",
        "Özel Dörtgenler",
        "Yamuğun Alanı",
        "İkizkenar ve Dik Yamuk",
        "Paralelkenarda Açı ve Uzunluk",
        "Paralelkenarda Alan",
        "Eşkenar Dörtgen",
        "Dikdörtgende Açı ve Uzunluk",
        "Dikdörtgende Alan",
        "Kare",
        "Deltoid",
        "Dik Prizmalar",
        "Küp",
        "Dik Piramit",
        "Düzgün Dört Yüzlü"
      ]
    },
    "Fizik": {
      "Fizik Bilimine Giriş": [
        "Fizik Bilimine Giriş"
      ],
      "Madde ve Özellikleri": [
        "Madde",
        "Özkütle",
        "Dayanıklılık",
        "Adezyon, Kohezyon, Yüzey Gerilim ve Kılcallık"
      ],
      "Hareket ve Kuvvet": [
        "Hareket Kavramları",
        "İvme Kavramı",
        "Kuvvet Kavramı",
        "Newton’ın Hareket Yasaları",
        "Sürtünme Kuvveti"
      ],
      "İş, Güç ve Enerji": [
        "İş, Enerji ve Güç Kavramları",
        "Enerji Çeşitleri ve Mekanik Enerji",
        "Enerji Korunumu",
        "Verim ve Enerji Kaynakları"
      ],
      "Isı ve Sıcaklık": [
        "Isı ve Sıcaklık",
        "Isı Alış Verişi",
        "Hâl Değişimi ve Çeşitleri",
        "Isıl Denge",
        "Enerji Yayılma Yolları ve Enerji İletim Hızı",
        "Genleşme"
      ],
      "Elektrostatik": [
        "Elektrik Yüklerinin Özellikleri ve Elektrikle Yüklenme Çeşitleri",
        "İletken ve Yalıtkanlarda Yük Dağılımı",
        "Elektriksel Kuvvet ve Elektrik Alan"
      ],
      "Elektrik ve Manyetizma": [
        "Elektrik Akımı ve Direnç",
        "Ohm Yasası ve Dirençlerin Bağlanması",
        "Üreteçler",
        "Elektrik Enerjisi, Elektriksel Güç ve Lamba Parlaklıkları",
        "Mıknatıs ve Manyetik Alan",
        "Akım ve Manyetik Alan"
      ],
      "Basınç ve Kaldırma Kuvveti": [
        "Basınç Kavramı, Katılarda Basınç ve Basınç Kuvveti",
        "Durgun Sıvılarda Basınç ve Basınç Kuvveti, Pascal Prensibi",
        "Gaz Basıncı, Atmosfer Basıncı ve Basınç Ölçen Aletler",
        "Akışkan Basıncı (Bernoulli İlkesi)",
        "Kaldırma Kuvveti"
      ],
      "Dalgalar": [
        "Dalgalarda Temel Kavramlar ve Özellikleri",
        "Yay Dalgalarının Hızı ve Yansıması",
        "Yay Dalgalarının Farklı Ortamlara Geçişi ve Yay Dalgalarının Girişimi",
        "Su Dalgalarının Özellikleri ve Yansıması",
        "Su Dalgalarının Hızı ve Kırılması",
        "Ses Dalgaları",
        "Deprem Dalgaları"
      ],
      "Optik": [
        "Işık, Işık Şiddeti, Işık Akısı ve Aydınlanma Şiddeti",
        "Gölge",
        "Işığın Yansıması ve Düzlem Aynalar",
        "Küresel Aynaların Özellikleri ve Küresel Aynalarda Özel Işınlar",
        "Küresel Aynalarda Görüntü Oluşumu",
        "Işığın Kırılması",
        "Tam Yansıma, Sınır Açısı ve Görünür Uzaklık",
        "Merceklerin Özellikleri ve Merceklerde Özel Işınlar",
        "Merceklerde Görüntü Oluşumu",
        "Işık Prizmaları",
        "Renk"
      ]
    },
    "Kimya": {
      "Kimya Bilimi": [
        "Simyadan Kimyaya",
        "Kimya Disiplinleri ve Kimyacıların Çalışma Alanları",
        "Kimyanın Sembolik Dili",
        "Kimya Uygulamalarında İş Sağlığı ve Güvenliği"
      ],
      "Atom ve Periyodik Sistem": [
        "Atom Modelleri",
        "Atomun Yapısı",
        "Elementlerin Periyodik Sistemdeki Yerleşim Esasları",
        "Elementlerin Sınıflandırılması",
        "Periyodik Özelliklerin Değişme Eğilimleri"
      ],
      "Kimyasal Türler Arası Etkileşimler": [
        "Kimyasal Tür ve Kimyasal Türler Arası Etkileşimlerin Sınıflandırılması",
        "Güçlü Etkileşimler",
        "Zayıf Etkileşimler",
        "Fiziksel ve Kimyasal Değişimler"
      ],
      "Maddenin Hâlleri": [
        "Maddenin Fiziksel Hâlleri",
        "Katılar - Sıvılar",
        "Gazlar - Plazma"
      ],
      "Doğa ve Kimya": [
        "Su ve Hayat",
        "Çevre Kimyası"
      ],
      "Kimyanın Temel Kanunları ve Hesaplamalar": [
        "Kimyanın Temel Kanunları",
        "Mol Kavramı",
        "Kimyasal Tepkimeler ve Denklemler",
        "Kimyasal Tepkimelerde Hesaplamalar"
      ],
      "Karışımlar": [
        "Homojen ve Heterojen Karışımlar - I",
        "Homojen ve Heterojen Karışımlar - II",
        "Ayırma ve Saflaştırma Teknikleri"
      ],
      "Asitler, Bazlar ve Tuzlar": [
        "Asitlerin ve Bazların Özellikleri",
        "Asitlerin ve Bazların Tepkimeleri",
        "Asitler ve Bazlar - Tuzlar"
      ],
      "Kimya Her Yerde": [
        "Yaygın Günlük Hayat Kimyasalları",
        "Kozmetikler - İlaçlar - Gıdalar"
      ]
    },
    "Biyoloji": {
      "Canlıların Yapısı": [
        "Canlıların Ortak Özellikleri",
        "Canlıların Yapısında Bulunan İnorganik Bileşikler",
        "Canlıların Yapısında Bulunan Organik Bileşikler",
        "İnorganik Bileşiklerin Genel Özellikleri ve Canlılar İçin Önemi",
        "Organik Bileşiklerin Genel Özellikleri",
        "Karbonhidratlar",
        "Lipitler",
        "Proteinler",
        "Enzimler",
        "Vitaminler ve Hormonlar",
        "Nükleik Asitler",
        "ATP (Adenozin trifosfat)",
        "Sağlıklı Beslenme"
      ],
      "Hücre": [
        "Hücresel Yapılar ve Görevleri",
        "Hücre Zarından Madde Geçişleri",
        "Hücre Teorisi",
        "Prokaryot ve Ökaryot Hücre Yapısı",
        "Hücre Zarı",
        "Hücre Duvarı",
        "Sitoplazma",
        "Çekirdek",
        "Ribozom",
        "Endoplazmik Retikulum",
        "Golgi Aygıtı",
        "Lizozom",
        "Koful",
        "Peroksizom",
        "Sentrozom",
        "Hücre İskeleti",
        "Mitokondri ve Plastitler",
        "Basit Difüzyon",
        "Kolaylaştırılmış Difüzyon",
        "Osmoz",
        "Aktif Taşıma",
        "Endositoz",
        "Ekzositoz",
        "Bilimsel Yöntem ve Basamakları"
      ],
      "Sınıflandırma": [
        "Canlıların Sınıflandırılması",
        "Canlı Âlemleri",
        "Canlıların Sınıflandırılmasının Amacı ve Önemi",
        "Sınıflandırılmada Kullanılan Kategoriler",
        "Bakteriler Âlemi",
        "Arkeler Âlemi",
        "Protista Âlemi",
        "Bitkiler Âlemi",
        "Mantarlar Âlemi",
        "Hayvanlar Âlemi-Omurgasız Hayvanlar",
        "Hayvanlar Âlemi-Omurgalı Hayvanlar",
        "Virüsler"
      ],
      "Hücre Bölünmeleri ve Üreme": [
        "Hücre Döngüsü ve Mitoz",
        "Eşeysiz Üreme",
        "Mayoz",
        "Eşeyli Üreme",
        "Hücre Bölünmesinin Gerekliliği",
        "Hücre Döngüsü ve İnterfaz",
        "Mitozun Genel Özellikleri ve Evreleri",
        "Hücre Döngüsünün Kontrolü",
        "Eşeysiz Üremenin Genel Özellikleri ve Çeşitleri",
        "Mayozun Genel Özellikleri ve Evreleri",
        "Eşeyli Üremenin Genel Özellikleri ve Örnekleri"
      ],
      "Kalıtım": [
        "Kalıtım",
        "Genetik Varyasyonlar",
        "Kalıtımla İlgili Kavramlar",
        "Olasılık İlkeleri ve Gamet Çeşitlerinin Bulunması",
        "Mendel İlkeleri ve Çaprazlamalar",
        "Eş Baskınlık",
        "Çok Alellilik",
        "Kan Gruplarının Kalıtımı",
        "Eşeye Bağlı Kalıtım",
        "Akraba Evliliği",
        "Soyağacı Analizi ve Örnekleri",
        "Genetik Varyasyonların Kaynakları ve Biyolojik Çeşitlilik"
      ],
      "Ekoloji ve Çevre": [
        "Ekosistem Ekolojisi",
        "Güncel Çevre Sorunları",
        "Doğal Kaynakların Sürdürülebilirliği",
        "Biyolojik Çeşitliliğin Korunması",
        "Ekolojik Kavramlar",
        "Ekosistemin Canlı ve Cansız Bileşenleri",
        "Canlılardaki Beslenme Şekilleri",
        "Ekosistemde Madde ve Enerji Akışı",
        "Madde Döngüleri",
        "Güncel Çevre Sorunlarının Sebepleri",
        "Hava Kirliliği",
        "Asit Yağmurları",
        "Küresel İklim Değişikliği",
        "Su Kirliliği",
        "Toprak Kirliliği",
        "Radyoaktif Kirlilik",
        "Ses Kirliliği",
        "Erozyon",
        "Doğal Hayat Alanlarının Tahribi ve Orman Yangınları",
        "Biyolojik Çeşitliliğin Azalması",
        "Çevre Sorunlarının Ortaya Çıkmasında Bireylerin Rolü ve Çözüm Önerileri",
        "Doğal Kaynakların Sürdürülebilirliğinin Önemi",
        "Biyolojik Çeşitliliğin Yaşam İçin Önemi ve Korunması"
      ]
    },
    "Tarih": {
      "Tarih ve Zaman": [
        "İnsanlığın Hafızası Tarih",
        "Zamanın Taksimi"
      ],
      "İlk Türk Devletleri": [
        "Avrasya’da İlk Türk İzleri - Coğrafya ile Oluşan Yaşam Tarzı",
        "Boylardan Devlete-I",
        "Boylardan Devlete-II",
        "Kavimler Göçü"
      ],
      "İslam Medeniyeti": [
        "İslamiyet’in Doğduğu Dönemde Dünya - İslamiyet Yayılıyor",
        "Emeviler (661-750)",
        "Abbasi Devleti ve Türkler - Bilim Medeniyeti"
      ],
      "Türk İslam Devletleri": [
        "Türklerin İslamiyet’i Kabulü",
        "İslamiyet’in Türk Devlet ve Toplum Yapısına Etkisi",
        "Büyük Selçuklu Devleti"
      ],
      "Anadolu Tarihi": [
        "Türklerin Anadolu’ya Yerleşme Süreci - Anadolu’ya Türk Göçleri ve Bu Göçlerin Sosyokültürel Etkileri",
        "Anadolu’nun İlk Siyasi Teşekkülleri",
        "Hilal ve Haç Mücadelesi",
        "Moğol İstilası ve Anadolu"
      ],
      "Beylikten Devlete Osmanlı": [
        "Osmanlı Beyliği’nin Kuruluşu ve İlk Fetihleri",
        "Osmanlı Devleti’nin Rumeli’deki İskân ve İstimâlet Politikası",
        "Anadolu’da Türk Siyasi Birliğini Sağlama Çabaları",
        "Devletleşme Sürecinde Savaşçılar ve Askerler",
        "Anadolu’nun Mutasavvıfları - Yönetici Sınıf - Sosyal ve Kültürel Faaliyetler"
      ],
      "Dünya Gücü Osmanlı": [
        "İstanbul’un Fethi ve Fethin Sonuçları",
        "Türk İslam Dünyasında Birliği Sağlama Çabaları",
        "Dünyanın Muhteşem Gücü Osmanlı",
        "Stratejik Siyaset ve Dünya Gücü Olan Osmanlı Devleti"
      ],
      "Osmanlı Kültür ve Medeniyeti": [
        "Saray ve Şehir Kültürü - Gelenekler Işığında Devlet İdaresi",
        "Osmanlı Devleti’nde Millet Sistemi - Fethettiği Yerlerdeki Kültürel Değişim",
        "Osmanlı Toprak Sistemi - Lonca Teşkilatı-Vakıflar"
      ],
      "Değişen Dünya ve Osmanlı": [
        "Uzun Savaşlardan Diplomasiye",
        "Okyanusların Önem Kazanması",
        "Fetihlerden Savunmaya",
        "Avrupa’da Değişim Çağı",
        "Osmanlı Devleti’nde Değişim",
        "Osmanlı Devleti’nde İsyanlar ve Düzeni Koruma Çalışmaları"
      ],
      "Değişim Çağında Avrupa ve Osmanlı": [
        "İhtilaller Çağı-Sömürgeciliğin Küresel Etkileri",
        "Osmanlı Devleti’nde Modern Orduya Geçiş",
        "XIX. Yüzyılda Sosyal Hayattaki Değişimler",
        "Osmanlı Devleti’ne Yönelik Tehditler-I",
        "Osmanlı Devleti’nde Demokratikleşme Hareketleri",
        "Osmanlı Devleti’nde Darbeler",
        "Osmanlı Devleti’ne Yönelik Tehditler-II",
        "Osmanlıda Sanayileşme Çabaları",
        "XIX ve XX. Yüzyılda Osmanlı Nüfusu-Metropoller Salgınlar ve Kamuoyu"
      ],
      "20. Yüzyıl Başlarında Osmanlı": [
        "Mustafa Kemal’in Lider Olarak Yetişmesinde Etkili Koşullar",
        "20. Yüzyıl Başlarında Osmanlı Devleti",
        "I. Dünya Savaşı Sürecinde Osmanlı Devleti",
        "I. Dünya Savaşı’nın Sonuçları"
      ],
      "Millî Mücadele": [
        "Millî Mücadele’ye Hazırlık Dönemi-I",
        "Millî Mücadele’ye Hazırlık Dönemi-II",
        "Büyük Millet Meclisi’nin Açılması - Sevr Antlaşması",
        "Doğu, Güney ve Batı Cepheleri",
        "Millî Mücadele’nin Sona Ermesi ve Lozan Barış Antlaşması"
      ],
      "Türk İnkılabı ve Atatürkçülük": [
        "Atatürk İlkeleri-Siyasi ve Hukuk Alanındaki Gelişmeler",
        "Atatürk Dönemi’nde Yapılan İnkılaplar"
      ],
      "İnsanlığın İlk Dönemleri": [
        "İnsanlığın İlk İzleri - Yazının İcadı",
        "İlk Çağ’da Başlıca Medeniyet Havzaları",
        "İnsan ve Göç",
        "Kabileden Devlete",
        "Kanunlar Doğuyor"
      ],
      "Orta Çağ Dünyası": [
        "Orta Çağ’da Siyasi Yapılar",
        "Tarımdan Ticarete Ekonomi",
        "Orta Çağ’da Ordu",
        "Kanunlar Gelişiyor"
      ]
    },
    "Coğrafya": {
      "Doğa ve Dünya": [
        "Doğa ve İnsan Etkileşimi",
        "Coğrafyanın Konusu ve Bölümleri",
        "Dünya’nın Şekli ve Günlük Hareketi",
        "Dünya’nın Yıllık Hareketi ve Eksen Eğikliği"
      ],
      "Coğrafi Konum": [
        "Koordinat Sistemi",
        "Yerel Saat ve Ulusal Saat",
        "Türkiye’nin Konumu"
      ],
      "Harita Bilgisi": [
        "Harita Unsurları ve Harita Çeşitleri",
        "Haritalarda Hesaplamalar",
        "Yeryüzü Şekillerinin Haritalara Aktarılması"
      ],
      "İklim Bilgisi": [
        "Atmosfer, Hava Durumu ve İklim",
        "Sıcaklık",
        "Basınç ve Rüzgârlar",
        "Nem ve Yağış",
        "İklim Tipleri",
        "Türkiye İklimi"
      ],
      "Yerleşme ve Bölgeler": [
        "Yerleşme ve Türkiye’de Yerleşmeler",
        "Bölge Sınıflandırılması ve Türleri"
      ],
      "İnsan ve Doğa": [
        "Doğal Çevrenin Kullanımı"
      ],
      "Yer Şekilleri, Su, Toprak ve Bitkiler": [
        "Dünya’nın Tektonik Oluşumu ve Jeolojik Zaman - lar",
        "İç Kuvvetler ve Kayaçlar",
        "Dış Kuvvetler (Çözülme, Kütle Hareketleri, Rüzgârlar, Buzullar)",
        "Dış Kuvvetler (Akarsular)",
        "Dış Kuvvetler (Karstik Şekiller, Dalgalar, Akıntılar).",
        "Türkiye’de Ana Yer Şekilleri, İç ve Dış Kuvvetler",
        "Dünyada Su Kaynakları",
        "Türkiye’de Su Kaynakları",
        "Dünyada ve Türkiye’de Topraklar",
        "Dünyada ve Türkiye’de Bitkiler"
      ],
      "Nüfus ve Göç": [
        "Nüfusun Özellikleri ve Gelişimi",
        "Nüfusun Dağılışı ve Nüfus Piramitleri",
        "Türkiye Nüfusu",
        "Göçler"
      ],
      "Ekonomik Faaliyetler": [
        "Ekonomik Faaliyetler",
        "Uluslararası Ulaşım Hatları"
      ],
      "Doğal Afetler": [
        "Afetlerin Genel Özellikleri ve Sınıflandırılması",
        "Deprem, Tsunami ve Volkanik Faaliyetler, Kütle Hare- ketleri, Erozyon",
        "Şiddetli Rüzgârlar, Sel ve Taşkın, Çığ, Orman Yangın- ları, Salgın Hastalıklar"
      ]
    },
    "Felsefe": {
      "Felsefi Alanlar": [
        "Felsefeyi Tanıma",
        "Felsefe ile Düşünme",
        "Varlık Felsefesi",
        "Bilgi Felsefesi",
        "Bilim Felsefesi",
        "Ahlak Felsefesi",
        "Din Felsefesi",
        "Siyaset Felsefesi",
        "Sanat Felsefesi",
        "Felsefi Okuma ve Yazma",
        "MÖ 6. Yüzyıl-MS 2. Yüzyıl Felsefesi",
        "MS 2. Yüzyıl - MS 15. Yüzyıl Felsefesi",
        "15. Yüzyıl - 17. Yüzyıl Felsefesi",
        "18. Yüzyıl - 19. Yüzyıl Felsefesi",
        "20. Yüzyıl Felsefesi",
        "Felsefenin Anlamı",
        "Felsefi Düşüncenin Ortaya Çıkışı ve Özellikleri - Felsefe Sorusu Nedir?",
        "Felsefenin İnsan ve Toplum Hayatı Üzerindeki Rolü",
        "Düşünme ve Akıl Yürütmeye İlişkin Kavramlar",
        "Düşünme ve Dil İlişkisi - Felsefi Bir Görüşü veya Argümanı Sorgulama",
        "Varlık Felsefesinin Konusu ve Problemleri",
        "Varlık Felsefesi Alanındaki Çağdaş Yaklaşımlar",
        "Evrende Amaçlılık ve Düzenlilik - Varlık Türlerinin Sınıflandırılması - Bir Konunun Varlık Felsefesi Açısından Değerlendirilmesi",
        "Bilgi Felsefesinin Konusu ve Bilginin İmkânı Problemi",
        "Bilginin Kaynağı ile İlgili Görüşler",
        "Bilginin Sınırları - Doğru Bilginin Ölçütü - Doğruluk ve Gerçeklik - Bilginin Değeri ve Güvenirliği",
        "Bilim Felsefesinin Konusu ve Problemleri",
        "Bilimin Değeri - Bilim Felsefe İlişkisi - Bilim ve Hayat İlişkisi",
        "Ahlak Felsefesinin Konusu ve Problemleri - İyi ve Kötünün Ölçütü",
        "Özgürlük ve Sorumluluk",
        "Evrensel Bir Ahlak Yasasını Kabul Eden Görüşler ve Filozoflar",
        "Evrensel Bir Ahlak Yasasını Reddeden Görüşler ve Filozoflar",
        "İyilik ve Mutluluk İlişkisi - Özgürlük",
        "Sorumluluk ve Kural İlişkisi",
        "Din Felsefesinin Konusu ve Soruları - Tanrı’nın Varlığı ile İlgili Görüşler",
        "Din Felsefesinin Soruları - Teoloji ve Din Felsefesi - Felsefe",
        "Bilim ve Din Açısından Ben Kimim?",
        "Siyaset Felsefesinin Konusu ve Problemleri - Hak",
        "Adalet",
        "Özgürlük - İktidarın Kaynağı",
        "İdeal Devlet Düzenine Yönelik Görüşler - Ütopya",
        "Egemenlik Sorunu - Toplumsal Sorunlara Felsefi Bakış",
        "Sanat Felsefesinin Konusu ve Problemleri - Güzellik - Sanat Nedir?",
        "Sanat Kuramları - Sanat Eserinin Özellikleri - Sanat ve Duyarlılık - Şehir",
        "İnsan ve Sanat",
        "İlk Medeniyetlerin Felsefenin Doğuşuna Etkisi - Anadolu’da Yaşamış Filozoflar",
        "İlk Neden(Arkhe) ve Değişim Problemi",
        "Sofistler ile Sokrates’in Bilgi ve Değer Anlayışları",
        "Platon’un Varlık",
        "Bilgi ve Değer Anlayışı",
        "Aristoteles’in Varlık",
        "Görüş Analizi: Konfüçyüs",
        "Sokrates",
        "Platon ve Aristoteles",
        "MS 2.Yüzyıl - MS 15.Yüzyıl Felsefesinin Ortaya Çıkışı - Hristiyan Felsefesinin Özellikleri ve Problemleri",
        "İslam Felsefesinin Özellikleri ve Problemleri",
        "İnanç - Akıl İlişkisi - Çeviri Faaliyetleri",
        "Görüş Analizi (Augustinus, Fârâbî, İbn Sîna, Gâzâlî ve İbn Rüşd) - Tasavvuf Düşüncesi",
        "15. Yüzyıl - 17. Yüzyıl Felsefesinin Ortaya Çıkışı",
        "15. Yüzyıl - 17. Yüzyıl Felsefesinde Öne Çıkan Görüşler",
        "Bilimsel Çalışmaların 15. Yüzyıl - 17. Yüzyıl Felsefesine Etkisi",
        "Görüş Analizi: R. Descartes",
        "B. Spinoza ve T. Hobbes",
        "18. Yüzyıl - 19. Yüzyıl Felsefesinin Ortaya Çıkışı - Genel Özellikleri - Dil ve Edebiyatla İlişkisi",
        "18. Yüzyıl - 19. Yüzyıl Felsefesinin Öne Çıkan Problemleri -",
        "Görüş Analizi: J. Locke",
        "I. Kant ve F. Hegel",
        "20. Yüzyıl Felsefesinin Ortaya Çıkışı",
        "20. Yüzyıl Felsefesinin Öne Çıkan Özellikleri ve Temel Problemleri -",
        "Türkiye’de Felsefi Düşünceye Katkıda Bulunan Felsefeciler - Çağımızın Felsefecileri - Yaşadıkları Yerler",
        "Görüş Analizi: F. Nietzsche",
        "H. Bergson",
        "J. P. Sartre ve T. Kuhn",
        "N. Topçu",
        "T. Mengüşoğlu ve K. Popper’ın Görüşlerinin Tartışılması"
      ]
    },
    "Din Kültürü ve Ahlak Bilgisi": {
      "Bilgi ve İnanç": [
        "İslam’da Bilgi Kaynakları",
        "İslam İnancında İmanın Mahiyeti",
        "Kur’an’dan Mesajlar: İsra Suresi 36. Ayet ve Mülk Suresi 23. Ayet"
      ],
      "Din ve İslam": [
        "Dinin Tanımı ve Kaynağı",
        "İnsanın Doğası ve Din",
        "İman ve İslam İlişkisi",
        "İslam İnanç Esaslarının Özellikleri",
        "Kur’an’dan Mesajlar: Nisa Suresi 136. Ayet"
      ],
      "İslam ve İbadet": [
        "İslam’da İbadet ve Kapsamı",
        "İslam’da İbadetin Amacı ve Önemi",
        "İslam’da İbadet Yükümlülüğü",
        "İslam’da İbadetlerde Temel İlkeler",
        "İslam’da İbadet Ahlak İlişkisi",
        "Kur’an’dan Mesajlar: Bakara Suresi 177. Ayet"
      ],
      "Gençlik ve Değerler": [
        "Değerler Ve Değerlerin Kaynağı",
        "Gençlerin Kişilik Gelişiminde Değerlerin Yeri Ve Önemi",
        "Temel Değerler",
        "Kur’an’dan Mesajlar: İsra Suresi 23-29. Ayetler"
      ],
      "İslam Medeniyeti": [
        "İslam Medeniyeti ve Özellikleri",
        "İslam Medeniyetinin Farklı Coğrafyalardaki İzleri",
        "Kur’an’dan Mesajlar: Hucurat Suresi 13. Ayet"
      ],
      "Allah İnsan İlişkisi": [
        "Allah İnancı ve İnsan",
        "Allah’ın Varlığı ve Birliği",
        "Allah’ın İsim ve Sıfatları",
        "Kur’an-ı Kerim’de İnsan ve Özellikleri",
        "İnsanın Allah ile İrtibatı",
        "Kur’an’dan Mesajlar: Rum Suresi 18-27. Ayetler"
      ],
      "Hz. Muhammed ve Gençlik": [
        "Kur’an-ı Kerim’de Gençler",
        "Bir Genç Olarak Hz. Muhammed",
        "Hz. Muhammed ve Gençler",
        "Bazı Genç Sahabiler",
        "Kur’an’dan Mesajlar: Al-i İmran Suresi 159. Ayet"
      ],
      "Din ve Hayat": [
        "Din ve Aile",
        "Din, Kültür ve Sanat",
        "Din ve Çevre",
        "Din ve Sosyal Değişim",
        "Din ve Ekonomi",
        "Din ve Sosyal Adalet",
        "Kur’an’dan Mesajlar Al-i İmran Suresi 103-105. Ayetler"
      ],
      "Ahlaki Tutum ve Davranışlar": [
        "İslam Ahlakının Konusu ve Gayesi",
        "Ahlak ve Terbiye İlişkisi",
        "İslam Ahlakında Yerilen Bazı Davranışlar",
        "Tutum Ve Davranışlarda Ölçülü Olmak",
        "Kur’an’dan Mesajlar: Hucurat Suresi 11-12. Ayetler"
      ],
      "İslam Düşüncesinde Yorumlar": [
        "Dinî Yorum Farklılıklarının Sebepleri",
        "Dinî Yorumlarla İlgili Bazı Kavramlar",
        "İslam Düşüncesinde İtikadi Ve Siyasi Yorumlar",
        "İslam Düşüncesınde Fıkhi Yorumlar",
        "Kur’an’dan Mesajlar: Nisa Suresi 59. Ayet"
      ]
    }
  },
  "AYT": {
    "Matematik": {
      "İleri Cebir": [
        "Fonksiyonun Grafikleri İle İlgili Uygulamalar",
        "Fonksiyonun Eksenleri Kestiği Noktalar",
        "Fonksiyonun Artan veya Azalan Olduğu Aralıklar",
        "Ortalama Değişim Hızı",
        "İkinci Dereceden Bir Değişkenli Fonksiyonun Grafiği",
        "Tepe Noktası, Simetri Ekseni ve Görüntü Kümesi",
        "Parabolün Grafik Çizimi",
        "Bazı Elemanları Verilen Parabol Denklemini Yazma",
        "Parabol İle Doğrunun Birbirine Göre Durumları",
        "İkinci Dereceden Fonksiyonlarla Modellenen Problemler",
        "Fonksiyonda Uygulamalar",
        "İkinci Dereceden İki Bilinmeyenli Denklem Sistemi",
        "İkinci Dereceden Denklem ve Eşitsizlik Sistemleri",
        "İki İfadenin Çarpımı veya Bölümü Şeklinde Verilen Eşitsizliklerin Çözüm Kümesi",
        "İkinci Dereceden Bir Bilinmeyenli Eşitsizlik Sistemi"
      ],
      "Olasılık": [
        "Koşullu Olasılık",
        "Bağımsız Olaylar",
        "Bileşik Olayların Olasılığı",
        "Deneysel Olasılık"
      ],
      "Trigonometri": [
        "Yönlü Açılar",
        "Birim Çember",
        "Sinüs ve Kosinüs Fonksiyonları",
        "Tanjant ve Kotanjant Fonksiyonları",
        "Sekant ve Kosekant Fonksiyonu",
        "Bir Açının Trigonometrik Değerlerinin Dar Açı Cinsinden Yazılması",
        "Trigonometrik Fonksiyonların İşaretleri",
        "Kosinüs Teoremi",
        "Sinüs Teoremi",
        "Periyot ve Periyodik Fonksiyonlar",
        "Trigonometrik Fonksiyonların Grafikleri",
        "Ters Trigonometrik Fonksiyonlar",
        "Sinüs ve Kosinüs Fonksiyonlarının Toplam-Fark Formülleri",
        "Tanjant ve Kotanjant Fonksiyonlarının Toplam-Fark Formülleri",
        "Sinüs ve Kosinüs Fonksiyonlarının İki Kat Açı Formülleri",
        "Tanjant ve Kotanjant Fonksiyonlarının İki Kat Açı Formülleri",
        "Sinx = a, Cosx = a, Tanx = a ve Cotx = a Denklemlerinin Çözüm Kümesi",
        "Sinx ve Cosx’e Göre Lineer (Doğrusal) ve Homojen Denklemlerin Çözüm Kümesi"
      ],
      "Logaritma": [
        "Üstel ve Logaritmik Fonksiyonlar",
        "Gerçek Hayat Durumları İle İlgili Üstel ve Logaritmik Fonksiyon Problemleri"
      ],
      "Diziler": [
        "Dizi Kavramı ve Dizinin Terimleri",
        "Dizi Çeşitleri ve İndirgeme Bağıntısı",
        "Aritmetik Dizi ve Özellikleri",
        "Geometrik Dizi ve Özellikleri",
        "Aritmetik ve Geometrik Dizide İlk N Terim Toplamları",
        "Gerçek Hayat Durumları İle İlgili Dizi Problemleri"
      ],
      "Analiz (LTI)": [
        "Limit ve Süreklilik",
        "Türev",
        "Türev Alma Kuralları",
        "Türevlenebilen İki Fonksiyonun Toplamının, Farkının, Çarpımının ve Bölümünün Türevi",
        "İki Fonksiyonun Bileşkesinin Türevi",
        "Bir Fonksiyonun Artan ve Azalan Olduğu Aralıklar",
        "Bir Fonksiyonun Ekstremum Noktaları",
        "Türev Yardımıyla Bir Fonksiyonun Grafiğinin Çizimi",
        "Maksimum Minimum Problemleri",
        "Belirsiz İntegral",
        "Diferansiyel Kavramı ve Değişken Değiştirme (İkame) Yöntemi",
        "Riemann Toplamı",
        "Belirli İntegral",
        "Belirli İntegralin Özellikleri",
        "Belirli İntegral İle Alan Hesaplama",
        "İki Fonksiyon Grafiği Arasında Kalan Sınırlı Bölgenin Alanı"
      ],
      "İleri Geometri": [
        "Analitik Düzlem",
        "Analitik Geometri",
        "Dönüşümler",
        "Çember ve Daire",
        "Çemberde Teğet Kiriş Açı ve İç-Dış Açı",
        "Çemberde Teğet",
        "Dairenin ve Daire Diliminin Çevresi",
        "Dairenin Alanı ve Daire Diliminin Alanı",
        "Çemberin Standart Denklemi",
        "Çemberin Analitik İncelenmesi",
        "Çemberin Genel Denklemi",
        "Çember İle Doğrunun Bİrbirine Göre Durumları",
        "Dik Dairesel Silindirde Uzunluk ve Alan",
        "Silindirin Hacmi",
        "Dik Dairesel Konide Uzunluk ve Alan",
        "Dik Dairesel Konide Hacim",
        "Kürede Uzunluk, Alan ve Hacim"
      ],
      "Fonksiyonlar": [
        "Fonksiyon Kavramı ve Gösterimi",
        "Fonksiyon Sorularında Dikkat Edilmesi Gerekenler",
        "İçine, Örten, Birebir ve Eşit Fonksiyonlar",
        "Birim ve Sabit Fonksiyon",
        "Doğrusal ve Parçalı Fonksiyon",
        "Çift ve Tek Fonksiyon",
        "Fonksiyonlarda Dört İşlem",
        "Fonksiyon Grafiklerini Çizme",
        "İki Fonksiyonun Bileşkesi",
        "Bir Fonksiyonun Tersi",
        "Fonksiyon Grafikleri ile İlgili Uygulamalar"
      ],
      "Polinomlar ve Çarpanlara Ayırma": [
        "Polinom Kavramı",
        "Polinomlarda Toplama, Çıkarma ve Çarpma İşlemleri",
        "Polinomlarda Bölme İşlemi",
        "Polinomlarda Bölme İşlemi Yapmadan Kalan Bulma",
        "Ortak Çarpan Parantezine Alma",
        "Tam Kare ve İki Kare Farkı Özdeşlikler",
        "Tam Küp, İki Küp Farkı ve Toplamı Özdeşlikler",
        "Üç Terimli İfadelerin Çarpanlara Ayrılması",
        "Rasyonel İfadelerin Sadeleştirilmesi"
      ],
      "İkinci Dereceden Denklemler": [
        "İkinci Dereceden Bir Bilinmeyenli Denklemler",
        "İkinci Dereceden Bir Bilinmeyenli Denklemlerin Çözüm Kümesi",
        "Diskriminant Kavramı ve Diskriminantın Kullanılması",
        "Karmaşık Sayılar",
        "İkinci Dereceden Bir Bilinmeyenli Denklemlerde Kök Katsayı İlişkisi"
      ],
      "Sayma ve Olasılık": [
        "Saymanın Temel İlkesi",
        "Faktöriyel Kavramı",
        "Permütasyon",
        "Tekrarlı Permütasyon",
        "Kombinasyon Kavramı ve Özellikleri",
        "Kombinasyon Problemleri",
        "Kombinasyon ve Geometri",
        "Binom Açılımı",
        "Olasılıkta Temel Kavramlar",
        "Basit Olayların Olasılıkları"
      ],
      "Geometri": [
        "Açı Kavramı ve Çeşitleri",
        "Paralel İki Doğrunun Bir Kesenle Yaptığı Açılar",
        "Üçgende Açılar",
        "İkizkenar ve Eşkenar Üçgende Açı Özellikleri",
        "Üçgende Açı Kenar Bağıntıları",
        "Üçgen Eşitsizliği",
        "Üçgenlerde Eşlik",
        "Üçgenlerde Benzerlik",
        "Üçgenlerde Temel Benzerlik",
        "Üçgenlerde Benzerlik Uygulamaları",
        "Üçgende Açıortay",
        "Üçgende Kenarortay",
        "Üçgende Yükseklik",
        "Üçgende Kenar Orta Dikme",
        "Dik Üçgende Pisagor Teoremi",
        "Öklid’in Çalışmaları",
        "Trigonometrik Oranlar",
        "30°, 45°, 60° Nin Trigonometrik Oranları",
        "Üçgende Alan",
        "Üçgende Alan Uygulamaları",
        "Çokgenler",
        "Dörtgenler ve Özellikleri",
        "Özel Dörtgenler",
        "Yamuğun Alanı",
        "İkizkenar ve Dik Yamuk",
        "Paralelkenarda Açı ve Uzunluk",
        "Paralelkenarda Alan",
        "Eşkenar Dörtgen",
        "Dikdörtgende Açı ve Uzunluk",
        "Dikdörtgende Alan",
        "Kare",
        "Deltoid",
        "Dik Prizmalar",
        "Küp",
        "Dik Piramit",
        "Düzgün Dört Yüzlü"
      ]
    },
    "Fizik": {
      "Mekanik": [
        "Vektörler",
        "Bağıl Hareket",
        "Newton’ın Hareket Yasaları (Net Kuvvetin Hesaplanması)",
        "Newton’ın Hareket Yasaları (Net Kuvvet Etkisindeki Cismin Hareketi)",
        "Bir Boyutta Sabit İvmeli Hareket",
        "Serbest Düşme ve Hava Direnç Kuvveti",
        "Bir Boyutta Yukarı veya Aşağı Atılan Cisimlerin Hareketi",
        "Yatay Atış",
        "Eğik Atış",
        "İş Kavramı ve Enerji Türleri",
        "Enerji Korunumu",
        "İtme ve Çizgisel Momentum Arasındaki İlişki",
        "Çizgisel Momentumun Korunumu (Bir Boyutta Çarpışmalar)",
        "Çizgisel Momentumun Korunumu (İki Boyutta Çarpışmalar ve Patlamalar)",
        "Tork",
        "Denge ve Denge Şartları",
        "Kütle ve Ağırlık Merkezi",
        "Basit Makineler (Basit Makinelerin Özellikleri, Kaldıraçlar, Makaralar)",
        "Basit Makineler (Palanga, Eğik Düzlem, Vida, Çıkrık, Çark, Kasnaklar ve Basit Makinelerde Verim)"
      ],
      "Elektrik ve Manyetizma": [
        "Elektriksel Kuvvet",
        "Elektrik Alan",
        "Elektriksel Potansiyel Enerji ve Elektriksel Potansiyel",
        "Elektriksel Potansiyel Fark ve Elektriksel İş",
        "Düzgün Elektrik Alan",
        "Sığa Kavramı ve Sığaçlar",
        "Manyetik Alan",
        "Düz Tele Etki Eden Manyetik Kuvvet ve Manyetik Kuvvetin Döndürme Etkisi",
        "Yüklü Parçacıkların Manyetik Alan İçindeki Hareketi",
        "Manyetik Akı ve İndüksiyon Akımı",
        "Öz İndüksiyon Akımı, Lorentz Kuvveti ve Elektromotor Kuvveti",
        "Alternatif Akım",
        "Transformatörler"
      ],
      "Çembersel Hareket ve Kütle Çekimi": [
        "Düzgün Çembersel Hareket Kavramları",
        "Merkezcil Kuvvet",
        "Virajlarda Emniyetli Dönüş Şartları",
        "Öteleme ve Dönme Hareketi",
        "Eylemsizlik Momenti ve Dönme Kinetik Enerjisi",
        "Açısal Momentum",
        "Kütle Çekim Kuvveti",
        "Kepler Kanunları"
      ],
      "Basit Harmonik Hareket": [
        "Basit Harmonik Hareket Kavramları",
        "Basit Sarkaç ve Yay Sarkacı"
      ],
      "Dalga Mekaniği": [
        "Su Dalgalarında Kırınım ve Girişim",
        "Işığın Çift Yarıkta Girişimi",
        "Işığın Tek Yarıkta Kırınımı",
        "Işığın Dalga Doğası ve Doppler Olayı",
        "Elektromanyetik Dalgalar"
      ],
      "Atom Fiziği ve Radyoaktivite": [
        "Atomun Tarihsel Gelişimi ve Bohr Atom Teorisi",
        "Büyük Patlama Teorisi",
        "Kararlı ve Kararsız Atomlar, Radyoaktif Işımalar"
      ],
      "Modern Fizik": [
        "Özel Görelilik (Einstein’in Temel Postülaları)",
        "Özel Görelilik (Göreli Zaman, Göreli Uzunluk ve Kütle Enerji Eşdeğerliği)",
        "Fotoelektrik Olay",
        "Fotoelektrik Olay Uygulamaları ve Kesme Gerilimi",
        "Compton Saçılması ve De Broglie Dalga Boyu"
      ],
      "Modern Fiziğin Teknolojideki Uygulamaları": [
        "Görüntüleme Cihazları, LCD ve Plazma",
        "Yarı İletken Teknolojisi",
        "Süper İletkenler",
        "Nanoteknoloji",
        "LASER Işınları"
      ]
    },
    "Kimya": {
      "Modern Atom Teorisi": [
        "Atomun Kuantum Modeli",
        "Periyodik Sistem ve Elektron Dizilimleri",
        "Periyodik Özellikler",
        "Elementleri Tanıyalım",
        "Yükseltgenme Basamakları"
      ],
      "Gazlar": [
        "Gazların Özellikleri ve Gaz Yasaları",
        "İdeal Gaz Yasası",
        "Gazlarda Kinetik Teori - Gaz Karışımları",
        "Gerçek Gazlar"
      ],
      "Sıvı Çözeltiler ve Çözünürlük": [
        "Çözücü - Çözünen Etkileşimleri",
        "Derişim Birimleri",
        "Koligatif Özellikler",
        "Çözünürlük ve Çözünürlüğe Etki Eden Faktörler"
      ],
      "Kimyasal Tepkimelerde Enerji": [
        "Tepkimelerde Isı Değişimi - Oluşum Entalpisi",
        "Bağ Enerjileri - Tepkime Isılarının Toplanabilirliği"
      ],
      "Kimyasal Tepkimelerde Hız": [
        "Tepkime Hızları",
        "Tepkime Hızını Etkileyen Faktörler"
      ],
      "Kimyasal Tepkimelerde Denge": [
        "Kimyasal Denge - Dengeyi Etkileyen Faktörler",
        "Sulu Çözelti Dengeleri",
        "Tampon Çözeltiler - Tuzlar - Titrasyon",
        "Çözünme - Çökelme Tepkimeleri"
      ],
      "Kimya ve Elektrik": [
        "İndirgenme - Yükseltgenme Tepkimelerinde Elektrik Akımı",
        "Elektrotlar, Elektrolit Ve Yarı Hücreler",
        "Elektrot Potansiyelleri",
        "Kimyasallardan Elektrik Üretimi",
        "Elektroliz",
        "Korozyon"
      ],
      "Karbon Kimyasına Giriş": [
        "Anorganik ve Organik Bileşikler - Basit Formül ve Molekül Formülü",
        "Doğada Karbon",
        "Lewis Formülleri - Hibritleşme - Molekül Geometrileri"
      ],
      "Organik Kimya": [
        "Hidrokarbonlar ve Fonksiyonel Gruplar",
        "Alkanlar",
        "Alkenler",
        "Alkinler",
        "Aromatik Hidrokarbonlar",
        "Alkoller",
        "Eterler",
        "Aldehitler",
        "Ketonlar",
        "Karboksilik Asitler",
        "Esterler"
      ],
      "Enerji Kaynakları ve Bilimsel Gelişmeler": [
        "Fosil Yakıtlar - Alternatif Enerji Kaynakları",
        "Sürdürülebilirlik - Nanoteknoloji"
      ]
    },
    "Biyoloji": {
      "İnsan Fizyolojisi": [
        "Sinir Sistemi",
        "Endokrin Sistem",
        "Duyu Organları",
        "İskelet Sistemi",
        "Kas Sistemi",
        "Sindirim Sistemi",
        "Kan Dolaşımı",
        "Lenf Dolaşımı",
        "Bağışıklık Sistemi",
        "Solunum Sistemi",
        "Üriner Sistem",
        "Üreme Sistemi",
        "Embriyonik Gelişim",
        "Sinir Doku",
        "İmpuls Oluşumu ve Etkileri",
        "Sinir Sisteminin Bölümleri",
        "Merkezi Sinir Sistemi-Ön Beyin",
        "Merkezi Sinir Sistemi-Orta Beyin",
        "Arka Beyin",
        "Omurilik",
        "Çevresel Sinir Sistemi",
        "Sinir Sistemi Rahatsızlıkları ve Sağlıklı Yapısının Korunması",
        "Salgı Bezleri",
        "Hormonların Genel Özellikleri ve Etkileri",
        "Epifiz Bezi",
        "Hipofiz Bezi",
        "Tiroit Bezi",
        "Paratiroit Bezi",
        "Timüs Bezi",
        "Böbrek Üstü Bezleri",
        "Pankreas",
        "Eşeysel Bezler",
        "Duyu Reseptörleri",
        "Deri",
        "Burun",
        "Dil",
        "Kulak",
        "Göz",
        "Destek ve Hareket Sisteminin Genel Yapısı",
        "Kemik Doku ve Kemik Çeşitleri",
        "Kıkırdak Doku ve Kıkırdak Çeşitleri",
        "Eklemler",
        "Kas Doku ve Kas Çeşitleri",
        "İskelet Kasının Kasılma Mekanizması",
        "Kasılmanın Kontrolü",
        "Enerji Metabolizması",
        "Kas-İskelet İlişkisi",
        "Destek ve Hareket Sistemi Rahatsızlıkları ve Sağlıklı Yapısının Korunması",
        "Sindirim Çeşitleri",
        "Sindirim Sisteminin Genel Yapısı",
        "Ağız",
        "Yutak",
        "Yemek Borusu",
        "Mide",
        "İnce Bağırsak",
        "Kalınbağırsak",
        "Sindirime Yardımcı Yapı ve Organlar-Tükürük Bezleri",
        "Karaciğer",
        "Besinlerin Sindirimi ve Emilimi",
        "Sindirim Sistemi Rahatsızlıkları ve Sağlıklı Yapısının Korunması",
        "Dolaşım Sisteminin Genel Yapısı ve Görevleri",
        "Kalbin Yapısı",
        "Kanın Kalpteki Hareketi",
        "Kalp Ritminin Kontrolü",
        "Kanın Vücuttaki Dolaşımı",
        "Kan Damarları",
        "Kılcal Damarlar ve Doku Sıvısı Arasındaki Madde Alışverişi",
        "Kan Doku",
        "Dolaşım Sistemi Rahatsızlıkları ve Sağlıklı Yapısının Korunması",
        "Bağışıklık Sisteminin Genel Özellikleri",
        "Doğal Bağışıklık",
        "Kazanılmış Bağışıklık",
        "Solunum Sisteminin Organları",
        "Soluk Alıp Verme Mekanizması ve Kontrolü",
        "Solunum Gazlarının Taşınması",
        "Solunum Sistemi Hastalıkları ve Sağlıklı Yapısının Korunması",
        "Üriner Sisteminin Genel Yapısı",
        "Görevleri ve Organları",
        "Nefronun Yapısı ve İdrar Oluşumu",
        "Homeostaside Böbreklerin Rolü",
        "Üriner Sistem Rahatsızlıkları ve Sağlıklı Yapısının Korunması",
        "Üreme Sisteminin Genel Yapısı",
        "Erkek Üreme Sistemi",
        "Dişi Üreme Sistemi",
        "Menstrual Döngü",
        "Döllenme",
        "Üreme Sisteminin Sağlıklı Yapısının Korunması",
        "Embriyonik Gelişim Süreci"
      ],
      "Ekoloji": [
        "Komünite Ekolojisi",
        "Popülasyon Ekolojisi",
        "Komünitenin Yapısına Etki Eden Faktörler",
        "Komünitede Rekabet",
        "Av-Avcı İlişkisi",
        "Komünitede Simbiyotik İlişkiler",
        "Komünitelerdeki Süksesyon",
        "Popülasyon Dinamiğine Etki Eden Faktörler"
      ],
      "Genden Proteine": [
        "Nükleik Asitler",
        "Genetik Şifre ve Protein Sentezi",
        "Genetik Mühendisliği ve Biyoteknoloji",
        "Nükleik Asitlerin Keşif Süreci",
        "Nükleotitlerin Yapısı . 149 Nükleik Asitlerin Çeşitleri ve Görevleri",
        "Genetik Materyalin Organizasyonu",
        "DNA’ nın Kendini Eşlemesi",
        "Genetik Şifre ve Protein Sentezinde Genetik Bilgi Akışı",
        "Protein Sentezinin Mekanizması",
        "Genetik Mühendisliği-Biyoteknoloji Kavramları ve Uygulamaları",
        "Genetik Mühendisliği ve Biyoteknoloji Uygulamalarının İnsan Hayatına Etkisi"
      ],
      "Canlılarda Enerji Dönüşümleri": [
        "Canlılık ve Enerji",
        "Fotosentez",
        "Kemosentez",
        "Hücresel Solunum",
        "Fermantasyon",
        "ATP Molekülü ve Fosforilasyon Çeşitleri",
        "Fotosentezin Canlılar Açısından Önemi",
        "Fotosentezde Rol Oynayan Ögeler",
        "Fotosentez Reaksiyonları",
        "Fotosentez Hızını Etkileyen Faktörler",
        "Hücresel Solunumun Önemi",
        "Oksijenli Solunumun Genel Özellikleri ve Mitokondri",
        "Oksijenli Solunumun Evreleri"
      ],
      "Bitki Biyolojisi": [
        "Bitkisel Dokular",
        "Bitkisel Organlar",
        "Bitki Hormonları",
        "Bitkilerde Hareket",
        "Bitkilerde Madde Taşınması",
        "Bitkilerde Eşeyli Üreme",
        "Meristem Doku",
        "Temel Doku",
        "İletim Doku",
        "Örtü Doku",
        "Kök",
        "Gövde",
        "Yaprak",
        "Bitki Gelişiminde Hormonların Etkisi",
        "Bitki Hareketleri ve Fotoperiyodizm",
        "Köklerde Su ve Mineral Emilimi",
        "Ksilemde Su ve Minerallerin Taşınması",
        "Suyun Taşınmasında Stomaların Rolü",
        "Floemde Fotosentez Ürünlerinin Taşınması",
        "Çiçeğin Kısımları ve Görevleri",
        "Tozlaşma",
        "Bitkilerde Döllenme",
        "Tohum ve Meyve Oluşumu 235 Tohum Çimlenmesi",
        "Dormansi ve Çimlenme Arasındaki İlişki"
      ],
      "Canlılar ve Çevre": [
        "Canlılar ve Çevre"
      ]
    },
    "Türk Dili ve Edebiyatı": {
      "Giriş ve Şiir Bilgisi": [
        "Edebiyata Giriş",
        "Şiir Bilgisi",
        "Edebî Sanatlar"
      ],
      "Geleneksel Türk Edebiyatı": [
        "İslamiyet Öncesi Türk Şiiri",
        "Geçiş Dönemi Türk Şiiri",
        "Halk Şiiri",
        "Divan Şiiri",
        "Tanzimat Dönemi’ne Kadar Halk Hikâyeleri ve Mesneviler",
        "Geleneksel Türk Tiyatrosu",
        "Divan Edebiyatı Nesir Türleri"
      ],
      "Modern Türk Edebiyatı": [
        "Tanzimat Dönemi Türk Şiiri",
        "Servetifünun Dönemi Türk Şiiri",
        "Fecriati Dönemi Türk Şiiri",
        "Millî Edebiyat Dönemi Türk Şiiri",
        "Cumhuriyet Dönemi Türk Şiiri",
        "Tanzimat ve Servetifünun Dönemi Türk Hikâyesi",
        "Millî Edebiyat Dönemi Türk Hikâyesi",
        "Cumhuriyet Dönemi Türk Hikâyesi",
        "Tanzimat Dönemi Türk Romanı",
        "Servetifünun Dönemi Türk Romanı",
        "Millî Edebiyat Dönemi Türk Romanı",
        "Cumhuriyet Dönemi Roman",
        "Dünya Edebiyatında Roman",
        "Tanzimat, Servetifünun, Millî Edebiyat Dönemi Türk Tiyatrosu",
        "Cumhuriyet Dönemi Türk Tiyatrosu"
      ],
      "Edebî Türler": [
        "Hikâye Türleri ve Hikâyenin Yapı Unsurları",
        "Roman Türü ve Yapı Unsurları",
        "Tiyatro Türü ve Yapı Unsurları",
        "Masal/Fabl",
        "Destan/Efsane",
        "Öğretici Metinler"
      ],
      "Edebî Akımlar": [
        "Edebi Akımlar"
      ]
    },
    "Tarih-1": {
      "Tarih ve Zaman": [
        "İnsanlığın Hafızası Tarih",
        "Zamanın Taksimi"
      ],
      "İnsanlığın İlk Dönemleri": [
        "İnsanlığın İlk İzleri - Yazının İcadı",
        "İlk Çağ’da Başlıca Medeniyet Havzaları",
        "İnsan ve Göç",
        "Kabileden Devlete",
        "Kanunlar Doğuyor"
      ],
      "Orta Çağ Dünyası": [
        "Orta Çağ’da Siyasi Yapılar",
        "Tarımdan Ticarete Ekonomi",
        "Orta Çağ’da Ordu",
        "Kanunlar Gelişiyor"
      ],
      "İlk Türk Devletleri": [
        "Avrasya’da İlk Türk İzleri-Coğrafya ile Oluşan Yaşam Tarzı",
        "Boylardan Devlete-I",
        "Boylardan Devlete-II",
        "Kavimler Göçü"
      ],
      "İslam Medeniyeti": [
        "İslamiyet’in Doğduğu Dönemde Dünya - İslamiyet Yayılıyor",
        "Emeviler (661-750)",
        "Abbasi Devleti ve Türkler - Bilim Medeniyeti"
      ],
      "Türk İslam Devletleri": [
        "Türklerin İslamiyet’i Kabulü",
        "İslamiyet’in Türk Devlet ve Toplum Yapısına Etkisi",
        "Büyük Selçuklu Devleti"
      ],
      "Anadolu Tarihi": [
        "Türklerin Anadolu’ya Yerleşme Süreci Anadolu’ya Türk Göçleri ve Bu Göçlerin Sosyokültürel Etkileri",
        "Anadolu’nun İlk Siyasi Teşekkülleri",
        "Hilal ve Haç Mücadelesi",
        "Moğol İstilası ve Anadolu"
      ],
      "Beylikten Devlete Osmanlı": [
        "Osmanlı Beyliği’nin Kuruluşu ve İlk Fetihleri",
        "Osmanlı Devleti’nin Rumeli’deki İskân ve İstimâlet Politikası",
        "Anadolu’da Türk Siyasi Birliğini Sağlama Çabaları",
        "Devletleşme Sürecinde Savaşçılar ve Askerler",
        "Anadolu’nun Mutasavvıfları-Yönetici Sınıf-Sosyal ve Kültürel Faaliyetler"
      ],
      "Dünya Gücü Osmanlı": [
        "İstanbul’un Fethi ve Fethin Sonuçları",
        "Türk İslam Dünyasında Birliği Sağlama Çabaları",
        "Dünyanın Muhteşem Gücü Osmanlı",
        "Stratejik Siyaset ve Dünya Gücü Olan Osmanlı Devleti"
      ],
      "Osmanlı Kültür ve Medeniyeti": [
        "Saray ve Şehir Kültürü - Gelenekler Işığında Devlet İdaresi",
        "Osmanlı Devleti’nde Millet Sistemi - Fethettiği Yerlerdeki Kültürel Değişim",
        "Osmanlı Toprak Sistemi - Lonca Teşkilatı - Vakıflar"
      ],
      "Değişen Dünya ve Osmanlı": [
        "Uzun Savaşlardan Diplomasiye",
        "Okyanusların Önem Kazanması",
        "Fetihlerden Savunmaya",
        "Avrupa’da Değişim Çağı",
        "Osmanlı Devleti’nde Değişim",
        "Osmanlı Devleti’nde İsyanlar ve Düzeni Koruma Çalışmaları"
      ],
      "Değişim Çağında Avrupa ve Osmanlı": [
        "İhtilaller Çağı - Sömürgeciliğin Küresel Etkileri",
        "Osmanlı Devleti’nde Modern Orduya Geçiş",
        "XIX. Yüzyılda Sosyal Hayattaki Değişimler",
        "Osmanlı Devleti’ne Yönelik Tehditler-I",
        "Osmanlı Devleti’nde Demokratikleşme Hareketleri",
        "Osmanlı Devleti’nde Darbeler",
        "Osmanlı Devleti’ne Yönelik Tehditler-II",
        "Osmanlıda Sanayileşme Çabaları",
        "XIX ve XX. Yüzyılda Osmanlı Nüfusu - Metropoller Salgınlar ve Kamuoyu"
      ],
      "20. Yüzyıl Başlarında Osmanlı": [
        "Mustafa Kemal’in Lider Olarak Yetişmesinde Etkili Koşullar",
        "20. Yüzyıl Başlarında Osmanlı Devleti",
        "I. Dünya Savaşı Sürecinde Osmanlı Devleti",
        "I. Dünya Savaşı’nın Sonuçları"
      ],
      "Millî Mücadele": [
        "Millî Mücadele’ye Hazırlık Dönemi-I",
        "Millî Mücadele’ye Hazırlık Dönemi-II",
        "Büyük Millet Meclisi’nin Açılması - Sevr Antlaşması",
        "Doğu, Güney ve Batı Cepheleri",
        "Millî Mücadele’nin Sona Ermesi ve Lozan Barış Antlaşması"
      ],
      "Türk İnkılabı ve Atatürkçülük": [
        "Atatürk İlkeleri-Siyasi ve Hukuk Alanındaki Gelişmeler",
        "Atatürk Dönemi’nde Yapılan İnkılaplar",
        "Atatürk Dönemi İç Politikadaki Gelişmeler"
      ],
      "İki Savaş Arası Dönem": [
        "İki Dünya Savaşı Arasındaki Dönemde Dünya",
        "Atatürk Dönemi Türk Dış Politikası"
      ],
      "İkinci Dünya Savaşı ve Sonrası": [
        "II. Dünya Savaşı Sürecinde Türkiye ve Savaşın Sonuçları",
        "II. Dünya Savaşı Sonrası Gelişmeler"
      ],
      "Çağdaş Türk ve Dünya Tarihi": [
        "1960 Sonrasında Türk Dış Politikası",
        "1960 Sonrası Dünyadaki Yaşanan Siyasi Gelişmeler",
        "Türkiye’deki Siyasi, Ekonomik, Sosyokültürel Hayat",
        "1990 Sonrasında Türkiye",
        "1990 Sonrasında Meydana Gelen Siyasi Gelişmelerin Türkiye’ye Etkileri"
      ]
    },
    "Coğrafya-1": {
      "Ekosistemler": [
        "Biyoçeşitlilik ve Biyomlar",
        "Ekosistemler ve Madde Döngüleri"
      ],
      "Nüfus ve Yerleşme": [
        "Nüfus Politikaları ve Türkiye Nüfusunun Geleceği",
        "Yerleşme Özellikleri ve Şehirler"
      ],
      "Ekonomik Faaliyetler": [
        "Üretim, Dağıtım ve Tüketim",
        "Doğal Kaynaklar ve Ekonomi",
        "Türkiye’nin Ekonomi Politikaları ve Tarımı Etkileyen Faktörler",
        "Türkiye’de Tarım Ürünleri",
        "Türkiye’de Ormancılık ve Hayvancılık",
        "Türkiye’de Madencilik ve Enerji Kaynakları",
        "Türkiye’de Sanayi"
      ],
      "Kültür Bölgeleri": [
        "İlk Kültür Merkezleri ve Kültür Bölgeleri",
        "Türk Kültürü ve Anadolu’nun Kültürel Özellikleri"
      ],
      "Küresel Ortam ve Bölgeler": [
        "Küresel Ticaret",
        "Turizm",
        "Ülkelerin Sanayileşme Süreci ve Tarım-Ekonomi İlişki- si",
        "Uluslararası Örgütler"
      ],
      "Çevre ve Toplum": [
        "Çevre Sorunları ve Türleri",
        "Doğal Kaynaklar, Madenler ve Enerji Kaynakları Kulla- nımının Çevresel Etkileri",
        "Arazi Kullanımı, Küresel Çevre Sorunları ve Geri Dö - nüşüm"
      ],
      "Doğa ve Gelecek": [
        "Ekstrem Doğa Olayları",
        "Doğa Olaylarının Geleceği",
        "Geçmişten Geleceğe Şehir ve Ekonomi",
        "Geleceğin Dünyası"
      ],
      "Türkiye Ekonomisi ve Bölgesel Kalkınma": [
        "Türkiye’nin İşlevsel Bölgeleri",
        "Türkiye’nin Bölgesel Kalkınma Projeleri",
        "Hizmet Sektörü ve Ulaşım",
        "Dünyada ve Türkiye’de Ticaret",
        "Türkiye Turizmi"
      ],
      "Jeopolitik ve Küresel İlişkiler": [
        "Ülkelerin Konumunun Etkileri ve Türkiye’nin Jeopolitik Konumu",
        "Ülkelerin Gelişmişliği",
        "Enerji Nakil Hatları",
        "Çatışma Bölgeleri"
      ],
      "Çevre Politikaları": [
        "Doğal Çevrenin Sınırlılığı, Çevresel Örgüt ve Anlaş - malar"
      ]
    },
    "Tarih-2": {
      "Tarih ve Zaman": [
        "İnsanlığın Hafızası Tarih",
        "Zamanın Taksimi"
      ],
      "İnsanlığın İlk Dönemleri": [
        "İnsanlığın İlk İzleri - Yazının İcadı",
        "İlk Çağ’da Başlıca Medeniyet Havzaları",
        "İnsan ve Göç",
        "Kabileden Devlete",
        "Kanunlar Doğuyor"
      ],
      "Orta Çağ Dünyası": [
        "Orta Çağ’da Siyasi Yapılar",
        "Tarımdan Ticarete Ekonomi",
        "Orta Çağ’da Ordu",
        "Kanunlar Gelişiyor"
      ],
      "İlk Türk Devletleri": [
        "Avrasya’da İlk Türk İzleri-Coğrafya ile Oluşan Yaşam Tarzı",
        "Boylardan Devlete-I",
        "Boylardan Devlete-II",
        "Kavimler Göçü"
      ],
      "İslam Medeniyeti": [
        "İslamiyet’in Doğduğu Dönemde Dünya - İslamiyet Yayılıyor",
        "Emeviler (661-750)",
        "Abbasi Devleti ve Türkler - Bilim Medeniyeti"
      ],
      "Türk İslam Devletleri": [
        "Türklerin İslamiyet’i Kabulü",
        "İslamiyet’in Türk Devlet ve Toplum Yapısına Etkisi",
        "Büyük Selçuklu Devleti"
      ],
      "Anadolu Tarihi": [
        "Türklerin Anadolu’ya Yerleşme Süreci Anadolu’ya Türk Göçleri ve Bu Göçlerin Sosyokültürel Etkileri",
        "Anadolu’nun İlk Siyasi Teşekkülleri",
        "Hilal ve Haç Mücadelesi",
        "Moğol İstilası ve Anadolu"
      ],
      "Beylikten Devlete Osmanlı": [
        "Osmanlı Beyliği’nin Kuruluşu ve İlk Fetihleri",
        "Osmanlı Devleti’nin Rumeli’deki İskân ve İstimâlet Politikası",
        "Anadolu’da Türk Siyasi Birliğini Sağlama Çabaları",
        "Devletleşme Sürecinde Savaşçılar ve Askerler",
        "Anadolu’nun Mutasavvıfları-Yönetici Sınıf-Sosyal ve Kültürel Faaliyetler"
      ],
      "Dünya Gücü Osmanlı": [
        "İstanbul’un Fethi ve Fethin Sonuçları",
        "Türk İslam Dünyasında Birliği Sağlama Çabaları",
        "Dünyanın Muhteşem Gücü Osmanlı",
        "Stratejik Siyaset ve Dünya Gücü Olan Osmanlı Devleti"
      ],
      "Osmanlı Kültür ve Medeniyeti": [
        "Saray ve Şehir Kültürü - Gelenekler Işığında Devlet İdaresi",
        "Osmanlı Devleti’nde Millet Sistemi - Fethettiği Yerlerdeki Kültürel Değişim",
        "Osmanlı Toprak Sistemi - Lonca Teşkilatı - Vakıflar"
      ],
      "Değişen Dünya ve Osmanlı": [
        "Uzun Savaşlardan Diplomasiye",
        "Okyanusların Önem Kazanması",
        "Fetihlerden Savunmaya",
        "Avrupa’da Değişim Çağı",
        "Osmanlı Devleti’nde Değişim",
        "Osmanlı Devleti’nde İsyanlar ve Düzeni Koruma Çalışmaları"
      ],
      "Değişim Çağında Avrupa ve Osmanlı": [
        "İhtilaller Çağı - Sömürgeciliğin Küresel Etkileri",
        "Osmanlı Devleti’nde Modern Orduya Geçiş",
        "XIX. Yüzyılda Sosyal Hayattaki Değişimler",
        "Osmanlı Devleti’ne Yönelik Tehditler-I",
        "Osmanlı Devleti’nde Demokratikleşme Hareketleri",
        "Osmanlı Devleti’nde Darbeler",
        "Osmanlı Devleti’ne Yönelik Tehditler-II",
        "Osmanlıda Sanayileşme Çabaları",
        "XIX ve XX. Yüzyılda Osmanlı Nüfusu - Metropoller Salgınlar ve Kamuoyu"
      ],
      "20. Yüzyıl Başlarında Osmanlı": [
        "Mustafa Kemal’in Lider Olarak Yetişmesinde Etkili Koşullar",
        "20. Yüzyıl Başlarında Osmanlı Devleti",
        "I. Dünya Savaşı Sürecinde Osmanlı Devleti",
        "I. Dünya Savaşı’nın Sonuçları"
      ],
      "Millî Mücadele": [
        "Millî Mücadele’ye Hazırlık Dönemi-I",
        "Millî Mücadele’ye Hazırlık Dönemi-II",
        "Büyük Millet Meclisi’nin Açılması - Sevr Antlaşması",
        "Doğu, Güney ve Batı Cepheleri",
        "Millî Mücadele’nin Sona Ermesi ve Lozan Barış Antlaşması"
      ],
      "Türk İnkılabı ve Atatürkçülük": [
        "Atatürk İlkeleri-Siyasi ve Hukuk Alanındaki Gelişmeler",
        "Atatürk Dönemi’nde Yapılan İnkılaplar",
        "Atatürk Dönemi İç Politikadaki Gelişmeler"
      ],
      "İki Savaş Arası Dönem": [
        "İki Dünya Savaşı Arasındaki Dönemde Dünya",
        "Atatürk Dönemi Türk Dış Politikası"
      ],
      "İkinci Dünya Savaşı ve Sonrası": [
        "II. Dünya Savaşı Sürecinde Türkiye ve Savaşın Sonuçları",
        "II. Dünya Savaşı Sonrası Gelişmeler"
      ],
      "Çağdaş Türk ve Dünya Tarihi": [
        "1960 Sonrasında Türk Dış Politikası",
        "1960 Sonrası Dünyadaki Yaşanan Siyasi Gelişmeler",
        "Türkiye’deki Siyasi, Ekonomik, Sosyokültürel Hayat",
        "1990 Sonrasında Türkiye",
        "1990 Sonrasında Meydana Gelen Siyasi Gelişmelerin Türkiye’ye Etkileri"
      ]
    },
    "Coğrafya-2": {
      "Ekosistemler": [
        "Biyoçeşitlilik ve Biyomlar",
        "Ekosistemler ve Madde Döngüleri"
      ],
      "Nüfus ve Yerleşme": [
        "Nüfus Politikaları ve Türkiye Nüfusunun Geleceği",
        "Yerleşme Özellikleri ve Şehirler"
      ],
      "Ekonomik Faaliyetler": [
        "Üretim, Dağıtım ve Tüketim",
        "Doğal Kaynaklar ve Ekonomi",
        "Türkiye’nin Ekonomi Politikaları ve Tarımı Etkileyen Faktörler",
        "Türkiye’de Tarım Ürünleri",
        "Türkiye’de Ormancılık ve Hayvancılık",
        "Türkiye’de Madencilik ve Enerji Kaynakları",
        "Türkiye’de Sanayi"
      ],
      "Kültür Bölgeleri": [
        "İlk Kültür Merkezleri ve Kültür Bölgeleri",
        "Türk Kültürü ve Anadolu’nun Kültürel Özellikleri"
      ],
      "Küresel Ortam ve Bölgeler": [
        "Küresel Ticaret",
        "Turizm",
        "Ülkelerin Sanayileşme Süreci ve Tarım-Ekonomi İlişki- si",
        "Uluslararası Örgütler"
      ],
      "Çevre ve Toplum": [
        "Çevre Sorunları ve Türleri",
        "Doğal Kaynaklar, Madenler ve Enerji Kaynakları Kulla- nımının Çevresel Etkileri",
        "Arazi Kullanımı, Küresel Çevre Sorunları ve Geri Dö - nüşüm"
      ],
      "Doğa ve Gelecek": [
        "Ekstrem Doğa Olayları",
        "Doğa Olaylarının Geleceği",
        "Geçmişten Geleceğe Şehir ve Ekonomi",
        "Geleceğin Dünyası"
      ],
      "Türkiye Ekonomisi ve Bölgesel Kalkınma": [
        "Türkiye’nin İşlevsel Bölgeleri",
        "Türkiye’nin Bölgesel Kalkınma Projeleri",
        "Hizmet Sektörü ve Ulaşım",
        "Dünyada ve Türkiye’de Ticaret",
        "Türkiye Turizmi"
      ],
      "Jeopolitik ve Küresel İlişkiler": [
        "Ülkelerin Konumunun Etkileri ve Türkiye’nin Jeopolitik Konumu",
        "Ülkelerin Gelişmişliği",
        "Enerji Nakil Hatları",
        "Çatışma Bölgeleri"
      ],
      "Çevre Politikaları": [
        "Doğal Çevrenin Sınırlılığı, Çevresel Örgüt ve Anlaş - malar"
      ]
    },
    "Felsefe Grubu": {
      "Psikoloji": [
        "Psikoloji Bilimini Tanıyalım",
        "Psikolojinin Temel Süreçleri",
        "Öğrenme, Bellek, Düşünme",
        "Ruh Sağlığının Temelleri",
        "Psikolojinin Konusu - Bir Bilim Dalı Olma Süreci",
        "Psikolojide Yaklaşımlar -",
        "Psikolojinin Bilim Dalı Olarak Ölçütleri - Amaçları - Araştırmalarda Uyulması Gereken Etik Kurallar",
        "Psikoloji Araştırmalarında Uygulanan Yöntem ve Teknikler",
        "Psikolojinin Alt Dalları - İş Alanları - Diğer Bilim Dallarıyla İlişkisi",
        "Davranışın Oluşum Süreci - Psikolojik Süreçler ve Biyolojik Süreçlerin İlişkisi - Kalıtım ve Çevrenin Davranışa Etkisi 2 4 Yaşam Boyu Gelişim - Gelişim Dönemleri ve Temel Özellikleri",
        "Gelişim Kuramları",
        "Ergenlik Dönemi",
        "Ergenlik Döneminin Temel Özellikleri ve Bu Dönemi Etkileyen Faktörler",
        "Duyumun Özellikleri ve Temel Duyum Bilgileri",
        "Uyarılmanın Davranışlara Etkisi - Alışma ve Duyarlılaşma",
        "Algılama - Algı Yanılmaları",
        "Algıyı Etkileyen Faktörler - Duyum ve Algı Arasındaki Farklar",
        "Güdülenmeyi Ortaya Çıkaran Faktörler - Güdülenmiş Davranışın Özellikleri - İhtiyaçlar Hiyerarşisi",
        "Duygu ve Duygu Türleri - Duyguların Davranışlara Etkisi",
        "Bilinç - Dikkat - Bilinçlilik Türleri",
        "Sosyoloji ve Sosyal Psikoloji - Sosyal Biliş ve Sosyal Etki Türleri - Davranış ve Sosyal Etkenler",
        "Öğrenme ve Öğrenme Türleri - Koşullanma Yoluyla Öğrenme",
        "Bilişsel Öğrenme",
        "Öğrenmeyi Etkileyen Faktörler",
        "Öğrenme Stratejileri ve Görevleri - Hayat Boyu Öğrenme",
        "Bellek ve Bellek Türleri",
        "Belleğin Temel İşlevleri - Unutmaya Sebep Olan Faktörler - Bellek Geliştirme Teknikleri",
        "Düşünmenin Yapı Taşları - Dilin Düşünmedeki Rolü - Doğru Karar Vermede İrdelemenin Önemi",
        "Zekâ - Kalıtım ve Çevrenin Zekâ Üzerindeki Etkileri - Zekâ Testleri",
        "Zekâ Türleri - Zekâ ve Yaratıcılık",
        "Kişilik ve Kişiliğin Gelişimi - Kişilik Kuramları",
        "Bireysel Farklılıklar - Kişiliğin Ölçülmesi",
        "Stres ve Stresin Nedenleri - Stresin Günlük Yaşama Etkileri",
        "Stresle Başa Çıkma Yolları - Savunma Mekanizmaları",
        "Ruh Sağlığının Önemi ve Ölçütleri - Ruh Sağlığını Korumada Denge",
        "Empati ve Hobiler",
        "Ruh Sağlığı Açısından Normal ve Normal Dışı Kavramları",
        "Normal Dışı Davranışlar - Kişilik Bozuklukları - Şizofreni",
        "Psikolojik Destek"
      ],
      "Mantık": [
        "Mantığa Giriş",
        "Klasik Mantık",
        "Mantık ve Dil",
        "Sembolik Mantık",
        "Doğru Düşünme - Temel Kavramlar",
        "Akıl İlkeleri",
        "Akıl Yürütme Yöntemleri",
        "Mantığın Uygulama Alanları",
        "Aristoteles ve Mantık - Kavram ve Terim",
        "Nelik",
        "Gerçeklik",
        "Kimlik - İçlem ve Kaplam",
        "Kavram Çeşitleri",
        "Beş Tümel",
        "Kavramlar Arası İlişkiler - Tanım",
        "Önerme ve Önerme Çeşitleri",
        "Çıkarım - Karşı Olum Çıkarımları",
        "Eşdeğerlik Çıkarımları",
        "Dolaylı Çıkarım - Kıyas",
        "Kıyas Çeşitleri",
        "Dil ve Düşünme İlişkisi - Dilin Görevleri",
        "Bilgi Aktarma ve Dil - Anlama ve Tanımlama",
        "Sembolik Mantığa Geçiş-Önerme ve Yapısı - Basit ve Bileşik Önermeler - Çıkarım",
        "Sembolleştirme - Önerme Eklemleri",
        "Yorumlama - Önermelerin Doğruluk Değerleri - Doğruluk Çizelgesi",
        "Tutarlılık",
        "Geçerlilik",
        "Eşdeğerlik Denetlemesi",
        "Çözümleyici Çizelge Kuralları",
        "Çözümleyici Çizelge ile Tutarlılık",
        "Geçerlilik ve Eşdeğerlik Denetlemesi",
        "Niceleme Mantığı - Temel Kurallar - Denetlemeler",
        "Çok Değerli Mantık"
      ],
      "Sosyoloji": [
        "Sosyolojiye Giriş",
        "Birey ve Toplum",
        "Toplumsal Yapı",
        "Toplumsal Değişme ve Gelişme",
        "Toplum ve Kültür",
        "Toplumsal Kurumlar",
        "Sosyolojiyi Tanıyalım",
        "Sosyolojik Düşünmenin Bireye ve Topluma Katkısı - Sosyolojinin Diğer Sosyal Bilim Dallarıyla İlişkisi",
        "Toplum ve Toplumu Oluşturan Ögeler",
        "Sosyolojinin Doğuşunda Etkili Olan Olaylar - Sosyolojinin Kurucuları",
        "Sosyolojide Kullanılan Başlıca Yöntemler",
        "Sosyolojide Kullanılan Veri Toplama Teknikleri",
        "Türkiye’de Sosyoloji",
        "Sosyalleşme ve Sosyalleşmeyi Etkileyen Unsurlar",
        "Sosyalleşmenin Aşamaları ve Sosyalleşmenin Toplumsal İlişkiler Üzerindeki Etkisi",
        "Toplumsal Statü - Toplumsal Rol -Toplumsal Saygınlık",
        "Toplumsal Değer - Toplumsal Norm - Toplumsal Kontrol",
        "Toplumsal Sapma ve Suç",
        "Hak ve Görev Dengesi",
        "Toplumsal Yapı Nedir? Toplumsal Yapıya Etki Eden Faktörler - Toplumsal Yapıyı Oluşturan Unsurlar",
        "Toplumsal Etkileşim Tipleri",
        "Toplumsal Tabakalaşma - Toplumsal Hareketlilik",
        "Toplumsal Değişme ve Toplumsal Değişmeyi Etkileyen Faktörler",
        "Toplumsal Değişme ve Kültür",
        "Modernleşme ve Küreselleşme",
        "Toplumsal Gelişme ve Toplumsal Gelişmenin Ögeleri -Toplumsal Bütünleşme -Toplumsal Çözülme",
        "Kültürün Anlamı",
        "Kültürün İşlevleri",
        "Kültüre İlişkin Kavramlar",
        "Toplumsal Kültürün Önemi",
        "Kültürel Tutumlar ve Kültürler Arası Etkileşim",
        "Kurum Kavramı ve Kurumların İşlevleri",
        "Aile Kurumu ve Evlilik",
        "Ailenin İşlevleri ve Aile Türleri",
        "Eğitim Kurumu",
        "Önemi ve İşlevleri",
        "Din Kurumu",
        "Ekonomi Kurumu",
        "Ekonominin Toplumsal Yaşamdaki Önemi",
        "Toplumsal Yaşamda Ekonominin Temel Ögeleri",
        "Temel Ekonomik Sistemler",
        "Siyaset Kurumu ve Temel Kavramları",
        "Siyasal Yönetim Biçimleri"
      ],
      "Felsefe": [
        "Felsefeyi Tanıma",
        "Felsefe ile Düşünme",
        "Varlık Felsefesi",
        "Bilgi Felsefesi",
        "Bilim Felsefesi",
        "Ahlak Felsefesi",
        "Din Felsefesi",
        "Siyaset Felsefesi",
        "Sanat Felsefesi",
        "Felsefi Okuma ve Yazma",
        "MÖ 6. Yüzyıl-MS 2. Yüzyıl Felsefesi",
        "MS 2. Yüzyıl - MS 15. Yüzyıl Felsefesi",
        "15. Yüzyıl - 17. Yüzyıl Felsefesi",
        "18. Yüzyıl - 19. Yüzyıl Felsefesi",
        "20. Yüzyıl Felsefesi",
        "Felsefenin Anlamı",
        "Felsefi Düşüncenin Ortaya Çıkışı ve Özellikleri - Felsefe Sorusu Nedir?",
        "Felsefenin İnsan ve Toplum Hayatı Üzerindeki Rolü",
        "Düşünme ve Akıl Yürütmeye İlişkin Kavramlar",
        "Düşünme ve Dil İlişkisi - Felsefi Bir Görüşü veya Argümanı Sorgulama",
        "Varlık Felsefesinin Konusu ve Problemleri",
        "Varlık Felsefesi Alanındaki Çağdaş Yaklaşımlar",
        "Evrende Amaçlılık ve Düzenlilik - Varlık Türlerinin Sınıflandırılması - Bir Konunun Varlık Felsefesi Açısından Değerlendirilmesi",
        "Bilgi Felsefesinin Konusu ve Bilginin İmkânı Problemi",
        "Bilginin Kaynağı ile İlgili Görüşler",
        "Bilginin Sınırları - Doğru Bilginin Ölçütü - Doğruluk ve Gerçeklik - Bilginin Değeri ve Güvenirliği",
        "Bilim Felsefesinin Konusu ve Problemleri",
        "Bilimin Değeri - Bilim Felsefe İlişkisi - Bilim ve Hayat İlişkisi",
        "Ahlak Felsefesinin Konusu ve Problemleri - İyi ve Kötünün Ölçütü",
        "Özgürlük ve Sorumluluk",
        "Evrensel Bir Ahlak Yasasını Kabul Eden Görüşler ve Filozoflar",
        "Evrensel Bir Ahlak Yasasını Reddeden Görüşler ve Filozoflar",
        "İyilik ve Mutluluk İlişkisi - Özgürlük",
        "Sorumluluk ve Kural İlişkisi",
        "Din Felsefesinin Konusu ve Soruları - Tanrı’nın Varlığı ile İlgili Görüşler",
        "Din Felsefesinin Soruları - Teoloji ve Din Felsefesi - Felsefe",
        "Bilim ve Din Açısından Ben Kimim?",
        "Siyaset Felsefesinin Konusu ve Problemleri - Hak",
        "Adalet",
        "Özgürlük - İktidarın Kaynağı",
        "İdeal Devlet Düzenine Yönelik Görüşler - Ütopya",
        "Egemenlik Sorunu - Toplumsal Sorunlara Felsefi Bakış",
        "Sanat Felsefesinin Konusu ve Problemleri - Güzellik - Sanat Nedir?",
        "Sanat Kuramları - Sanat Eserinin Özellikleri - Sanat ve Duyarlılık - Şehir",
        "İnsan ve Sanat",
        "İlk Medeniyetlerin Felsefenin Doğuşuna Etkisi - Anadolu’da Yaşamış Filozoflar",
        "İlk Neden(Arkhe) ve Değişim Problemi",
        "Sofistler ile Sokrates’in Bilgi ve Değer Anlayışları",
        "Platon’un Varlık",
        "Bilgi ve Değer Anlayışı",
        "Aristoteles’in Varlık",
        "Görüş Analizi: Konfüçyüs",
        "Sokrates",
        "Platon ve Aristoteles",
        "MS 2.Yüzyıl - MS 15.Yüzyıl Felsefesinin Ortaya Çıkışı - Hristiyan Felsefesinin Özellikleri ve Problemleri",
        "İslam Felsefesinin Özellikleri ve Problemleri",
        "İnanç - Akıl İlişkisi - Çeviri Faaliyetleri",
        "Görüş Analizi (Augustinus, Fârâbî, İbn Sîna, Gâzâlî ve İbn Rüşd) - Tasavvuf Düşüncesi",
        "15. Yüzyıl - 17. Yüzyıl Felsefesinin Ortaya Çıkışı",
        "15. Yüzyıl - 17. Yüzyıl Felsefesinde Öne Çıkan Görüşler",
        "Bilimsel Çalışmaların 15. Yüzyıl - 17. Yüzyıl Felsefesine Etkisi",
        "Görüş Analizi: R. Descartes",
        "B. Spinoza ve T. Hobbes",
        "18. Yüzyıl - 19. Yüzyıl Felsefesinin Ortaya Çıkışı - Genel Özellikleri - Dil ve Edebiyatla İlişkisi",
        "18. Yüzyıl - 19. Yüzyıl Felsefesinin Öne Çıkan Problemleri -",
        "Görüş Analizi: J. Locke",
        "I. Kant ve F. Hegel",
        "20. Yüzyıl Felsefesinin Ortaya Çıkışı",
        "20. Yüzyıl Felsefesinin Öne Çıkan Özellikleri ve Temel Problemleri -",
        "Türkiye’de Felsefi Düşünceye Katkıda Bulunan Felsefeciler - Çağımızın Felsefecileri - Yaşadıkları Yerler",
        "Görüş Analizi: F. Nietzsche",
        "H. Bergson",
        "J. P. Sartre ve T. Kuhn",
        "N. Topçu",
        "T. Mengüşoğlu ve K. Popper’ın Görüşlerinin Tartışılması"
      ]
    },
    "Din Kültürü ve Ahlak Bilgisi": {
      "Dünya ve Ahiret": [
        "Varoluşun Ve Hayatın Anlamı",
        "Ahiret Âlemi",
        "Ahirete Uğurlama",
        "Kur’an’dan Mesajlar: Bakara Suresi 153-157. Ayetler"
      ],
      "Hz. Muhammed": [
        "Hz. Muhammed’in Şahsiyeti",
        "Hz. Muhammed’in Peygamberlik Yönü",
        "Hz. Muhammed’e Bağlılık Ve İtaat",
        "Kur’an’dan Mesajlar: Ahzab Suresi 45-46. Ayetler"
      ],
      "Kur’an Kavramları": [
        "Kur’an’da Bazı Kavramlar",
        "Kur’an-ı Kerim’de Geçen Kavramları Bilmenin İslam’ı Doğru Anlamadaki Önemi",
        "Kur’an’dan Mesajlar: Kehf Suresi 107-110. Ayetler"
      ],
      "İnançla İlgili Meseleler": [
        "İnançla İlgili Meseleler (İnançla İlgili Felsefi Yaklaşımlar)",
        "İnançla İlgili Meseleler (Yeni Dinî Hareketler)",
        "Kur’an’dan Mesajlar: Enam Suresi 59. Ayet Ve Lokman Suresi 27. Ayet"
      ],
      "Yahudilik ve Hristiyanlık": [
        "Yahudilik",
        "Hristiyanlık"
      ],
      "İslam ve Bilim": [
        "Din-Bilim İlişkisi",
        "İslam Medeniyetinde Bilim Ve Düşüncenin Gelişimi",
        "İslam Medeniyetinde Öne Çıkan Eğitim Kurumları",
        "Müslümanların Bilim Alanında Yaptığı Öncü Ve Özgün Çalışmalar",
        "Kur’an’dan Mesajlar: Fatır Suresi 27-28. Ayetler"
      ],
      "Anadolu İslam Medeniyeti": [
        "Türklerin Müslüman Olmaları",
        "Milletimizin İslam Anlayışının Oluşmasında Etkili Olan Bazı Şahsiyetler",
        "Kur’an’dan Mesajlar: Nisa Suresi 69. Ayet"
      ],
      "Tasavvufi Yorumlar": [
        "Tasavvufi Düşüncenin Oluşumu",
        "Tasavvufi Düşüncenin Ahlaki Boyutu",
        "Kültürümüzde Etkin Olan Tasavvufi Yorumlar",
        "Kur’an’dan Mesajlar: Hucurat Suresi 10. Ayet"
      ],
      "Güncel Dinî Meseleler": [
        "Dinî Meselelerin Çözümünde Temel İlke Ve Yöntemler",
        "İktisadi Hayatla İlgili Meseleler",
        "Gıda Maddeleri Ve Bağımlılıkla İlgili Meseleler",
        "Sağlık Ve Tıpla İlgili Meseleler",
        "Kur’an’dan Mesajlar: Enam Suresi 151-152. Ayetler"
      ],
      "Hint ve Çin Dinleri": [
        "Hinduizm",
        "Budizm",
        "Konfüçyanizm",
        "Taoizm"
      ]
    }
  },
  "KPSS": {
    "Türkçe": [
      "Sözel Akıl Yürütme",
      "Dil Bilgisi",
      "Yazım Kuralları"
    ],
    "Matematik": [
      "Sayısal Akıl Yürütme",
      "Mantıksal Akıl Yürütme"
    ],
    "Tarih": [
      "Osmanlı Öncesi Türk Devletleri Tarihi",
      "Osmanlı Tarihi",
      "Atatürk İlkeleri ve İnkılap Tarihi",
      "Çağdaş Türk ve Dünya Tarihi"
    ],
    "Türkiye Coğrafyası": [
      "Türkiye’nin Fiziki Özellikleri",
      "Türkiye’nin Beşerî Özellikleri",
      "Türkiye’nin Ekonomik Özellikleri"
    ],
    "Temel Yurttaşlık Bilgisi": [
      "Hukuk Başlangıcı",
      "Anayasa ve İnsan Hakları Hukuku",
      "İdare"
    ],
    "Güncel Bilgiler": [
      "Türkiye ve Dünya ile İlgili Genel, Kültürel ve Sosyoekonomik Konular"
    ]
  }
};
  // KPSS keeps its existing flat entries; a neutral UI grouping does not rename topics.
  function groups(exam, lesson) {
    const value = Object.hasOwn(catalog, exam) && Object.hasOwn(catalog[exam], lesson) ? catalog[exam][lesson] : null;
    return Array.isArray(value) ? { 'Genel Konular': value } : value || {};
  }
  const api = {
    exams: Object.keys(catalog),
    lessons: exam => Object.keys(catalog[exam] || {}),
    categories: (exam, lesson) => Object.keys(groups(exam, lesson)),
    topics: (exam, lesson, category) => category === undefined
      ? Object.values(groups(exam, lesson)).flat()
      : [...(Object.hasOwn(groups(exam, lesson), category) ? groups(exam, lesson)[category] : [])],
    categoryFor: (exam, lesson, topic) => Object.entries(groups(exam, lesson)).find(([, topics]) => topics.includes(topic))?.[0] || '',
    taskTitle: (category, topic, scope) => scope === 'category' ? category || '' : scope === 'topic' ? topic || '' : '',
    supports: (exam, lesson) => Object.hasOwn(catalog[exam] || {}, lesson)
  };
  root.DersCurriculum = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
