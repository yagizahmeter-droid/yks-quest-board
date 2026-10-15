(function(root) {
  // Transcribed from the supplied four-page 2026-2027 guide; not an official coverage claim.
  // Commas inside parentheses belong to the topic, not to another selectable entry.
  const catalog = {
    TYT: {
      'Türkçe': {
        'Anlam Bilgisi': ['Sözcükte Anlam', 'Cümlede Anlam', 'Paragrafta Anlam', 'Paragrafta Yapı', 'Paragrafta Ana ve Yardımcı Düşünce'],
        'Dil Bilgisi': ['Ses Bilgisi', 'Sözcükte Yapı (Kök-Ek)', 'Sözcük Türleri (İsim, Sıfat, Zamir, Zarf, Edat, Bağlaç, Ünlem)', 'Fiiller ve Fiilimsiler', 'Cümle Ögeleri', 'Cümle Türleri', 'Anlatım Bozuklukları'],
        'Yazım & Noktalama': ['Yazım Kuralları', 'Noktalama İşaretleri']
      },
      'Matematik': {
        'Temel Matematik': ['Temel Kavramlar', 'Sayı Basamakları', 'Bölme ve Bölünebilme', 'EBOB-EKOK', 'Rasyonel Sayılar', 'Basit Eşitsizlikler', 'Mutlak Değer', 'Üslü Sayılar', 'Köklü Sayılar', 'Çarpanlara Ayırma', 'Oran-Orantı', 'Denklem Çözme'],
        'Problemler': ['Sayı Problemleri', 'Kesir Problemleri', 'Yaş Problemleri', 'Hareket Problemleri', 'Yüzde-Kâr-Zarar Problemleri', 'Karışım Problemleri', 'Grafik ve Tablo Problemleri'],
        'Mantık & Veri': ['Kümeler', 'Mantık', 'Permütasyon', 'Kombinasyon', 'Binom', 'Olasılık', 'Veri ve İstatistik'],
        'Geometri': ['Doğruda ve Üçgende Açılar', 'Özel Üçgenler (Dik, İkizkenar, Eşkenar)', 'Üçgende Alan ve Benzerlik', 'Çokgenler ve Dörtgenler', 'Çember ve Daire', 'Katı Cisimler (Prizma, Piramit, Silindir, Koni, Küre)']
      },
      'Fizik': {
        'Madde ve Hareket': ['Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Hareket ve Kuvvet', 'İş-Güç-Enerji'],
        'Enerji ve Madde': ['Isı ve Sıcaklık', 'Basınç ve Kaldırma Kuvveti'],
        'Elektrik ve Dalgalar': ['Elektrostatik', 'Elektrik ve Magnetizma', 'Dalgalar', 'Optik']
      },
      'Kimya': {
        'Temel Kimya': ['Kimya Bilimi', 'Atom ve Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler'],
        'Maddenin Halleri & Hesaplamalar': ['Maddenin Halleri', 'Kimyanın Temel Kanunları ve Mol Hesabı', 'Karışımlar'],
        'Uygulamalı Kimya': ['Asitler', 'Bazlar', 'Tuzlar', 'Doğa ve Kimya', 'Kimya Her Yerde']
      },
      'Biyoloji': {
        'Hücre ve Organizma': ['Yaşam Bilimi Biyoloji', 'Hücre ve Organeller', 'Canlıların Sınıflandırılması'],
        'Kalıtım ve Çevre': ['Hücre Bölünmeleri (Mitoz-Mayoz)', 'Üreme Çeşitleri', 'Kalıtım', 'Ekosistem Ekolojisi ve Güncel Çevre Sorunları']
      },
      'Tarih': {
        'İlk ve Orta Çağlar': ['Tarih ve Zaman', 'İnsanlığın İlk Dönemleri', "Orta Çağ’da Dünya", 'İlk ve Orta Çağlarda Türk Dünyası', 'İslam Medeniyeti'],
        'Osmanlı & İnkılap': ['Beylikten Devlete Osmanlı', 'Türk İnkılabı ve Atatürkçülük', 'Milli Mücadele Dönemi']
      },
      'Coğrafya': {
        'Fiziki Coğrafya': ['Doğa ve İnsan', "Dünya'nın Şekli ve Hareketleri", 'Harita Bilgisi', 'İklim Bilgisi', 'İç ve Dış Kuvvetler'],
        'Beşeri Coğrafya': ['Nüfus ve Yerleşme', "Türkiye'nin Coğrafi Konumu ve Özellikleri", 'Doğal Afetler']
      },
      'Felsefe': {
        'Felsefi Alanlar': ['Felsefeyi Tanıma', 'Bilgi Felsefesi', 'Varlık Felsefesi', 'Ahlak Felsefesi', 'Sanat Felsefesi', 'Din Felsefesi', 'Siyaset Felsefesi', 'Bilim Felsefesi']
      },
      'Din Kültürü ve Ahlak Bilgisi': {
        'İnanç ve İbadet': ['Bilgi ve İnanç', 'İbadetler', "Kur'an ve Yorumu", 'Hz. Muhammed (s.a.v.)', 'Ahlak ve Değerler']
      }
    },
    AYT: {
      'Matematik': {
        'İleri Cebir': ['Fonksiyonlar (Grafikler ve Dönüşümler)', 'Polinomlar', 'İkinci Dereceden Denklemler', 'Karmaşık Sayılar', 'Parabol', 'Eşitsizlik Sistemleri'],
        'Trigonometri & Diziler': ['Trigonometri (Toplam-Fark, Yarım Açı, Denklemler)', 'Logaritma', 'Diziler ve Seriler'],
        'Analiz (LTI)': ['Limit ve Süreklilik', 'Türev (Türev Alma Kuralları, Teğet-Normal, Ekstremum Noktalar)', 'İntegral (Belirsiz ve Belirli İntegral, Alan Hesabı)'],
        'İleri Geometri': ['Noktanın ve Doğrunun Analitiği', 'Dönüşüm Geometrisi', 'Çemberin Analitik İncelenmesi', 'Katı Cisimler (İleri Düzey)']
      },
      'Fizik': {
        'Mekanik': ['Vektörler', 'Tork ve Denge', 'Kütle Merkezi', 'Basit Makineler', 'Sabit İvmeli Hareket', 'İtme ve Çizgisel Momentum', 'İş-Güç-Enerji'],
        'Elektromanyetizma & Hareket': ['Elektriksel Alan ve Potansiyel', 'Düzgün Çembersel Hareket', 'Basit Harmonik Hareket', 'Dalga Mekaniği'],
        'Modern Fizik': ['Atom Fiziğine Giriş', 'Radyoaktivite', 'Modern Fizik ve Teknolojideki Uygulamaları']
      },
      'Kimya': {
        'Fizikokimya': ['Modern Atom Teorisi', 'Gazlar', 'Sıvı Çözeltiler ve Derişim', 'Tepkimelerde Enerji', 'Tepkimelerde Hız'],
        'Kimyasal Denge & Elektrokimya': ['Kimyasal Denge', 'Asit-Baz Dengesi', 'Çözünürlük Dengesi (KÇÇ)', 'Kimya ve Elektrik (Elektrokimya)'],
        'Organik Kimya': ['Karbon Kimyasına Giriş', 'Hidrokarbonlar (Alkan, Alken, Alkin, Aritmetik)', 'Fonksiyonel Gruplar']
      },
      'Biyoloji': {
        'İnsan Fizyolojisi': ['Sinir Sistemi', 'Duyu Organları', 'Destek-Hareket Sistemi', 'Sindirim Sistemi', 'Dolaşım-Bağışıklık Sistemleri', 'Solunum Sistemi', 'Boşaltım Sistemi', 'Üreme Sistemi'],
        'Genetik & Bitki Biyolojisi': ['Komünite/Popülasyon Ekolojisi', 'Nükleik Asitler (DNA/RNA)', 'Protein Sentezi', 'Canlılarda Enerji Dönüşümleri (Fotosentez, Kemosentez, Solunum)', 'Bitki Biyolojisi']
      },
      'Türk Dili ve Edebiyatı': {
        'Giriş & Şiir Bilgisi': ['Metinlerin Sınıflandırılması', 'Şiir Bilgisi', 'Edebi Sanatlar', 'Şiir Türleri'],
        'Geleneksel Türk Edebiyatı': ['İslamiyet Öncesi Türk Edebiyatı', 'Geçiş Dönemi', 'Halk Edebiyatı', 'Divan Edebiyatı'],
        'Modern Türk Edebiyatı': ['Tanzimat Edebiyatı', 'Servet-i Fünun', 'Fecr-i Ati', 'Milli Edebiyat', 'Cumhuriyet Dönemi Edebiyatı', 'Edebi Akımlar']
      },
      'Tarih-1': {
        'Türk & Dünya Tarihi': ['Türk-İslam Tarihi', 'Osmanlı Tarihi (Kuruluş-Dağılma)', '20. Yüzyıl Başlarında Osmanlı', 'I. Dünya Savaşı', 'İnkılap Tarihi']
      },
      'Coğrafya-1': {
        'Mekânsal Sistemler': ['Ekosistem ve Biyoçeşitlilik', 'Şehirler ve Etki Alanları', "Türkiye'de Ekonomi Politikaları", 'Globalleşen Dünya']
      },
      'Tarih-2': {
        'Geniş Tarih Müfredatı': ['Tarih Bilimi', 'İlk Çağ Uygarlıkları', 'Orta/Yeni Çağ Avrupa Tarihi', 'II. Dünya Savaşı Dönemi ve Sonrası', 'Çağdaş Türk ve Dünya Tarihi']
      },
      'Coğrafya-2': {
        'Çevre ve Kalkınma': ['Doğal Kaynaklar ve Kullanımı', "Türkiye'nin Bölgesel Kalkınma Projeleri", 'Küresel Örgütler', 'Sanayileşme Süreci', 'Sürdürülebilirlik']
      },
      'Felsefe Grubu': {
        'Psikoloji, Sosyoloji, Mantık': ['Mantık (Kavramlar, Önermeler, Sembolik Mantık)', 'Psikoloji (Öğrenme, Bellek, Düşünme)', 'Sosyoloji (Toplumsal Yapı, Kültür, Değişme)']
      },
      'Din Kültürü ve Ahlak Bilgisi': {
        'İslam Düşüncesi': ['Dünya ve Ahiret', "Kur'an'da Kavramlar", 'İnanç Meseleleri', 'İslam ve Bilim', "Anadolu'da İslam Medeniyeti"]
      }
    },
    KPSS: {
      'Türkçe': ['Sözel Akıl Yürütme', 'Dil Bilgisi', 'Yazım Kuralları'],
      'Matematik': ['Sayısal Akıl Yürütme', 'Mantıksal Akıl Yürütme'],
      'Tarih': ['Osmanlı Öncesi Türk Devletleri Tarihi', 'Osmanlı Tarihi', 'Atatürk İlkeleri ve İnkılap Tarihi', 'Çağdaş Türk ve Dünya Tarihi'],
      'Türkiye Coğrafyası': ['Türkiye’nin Fiziki Özellikleri', 'Türkiye’nin Beşerî Özellikleri', 'Türkiye’nin Ekonomik Özellikleri'],
      'Temel Yurttaşlık Bilgisi': ['Hukuk Başlangıcı', 'Anayasa ve İnsan Hakları Hukuku', 'İdare'],
      'Güncel Bilgiler': ['Türkiye ve Dünya ile İlgili Genel, Kültürel ve Sosyoekonomik Konular']
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
    supports: (exam, lesson) => Object.hasOwn(catalog[exam] || {}, lesson)
  };
  root.DersCurriculum = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
