(function(root) {
  // Curated starting points, not a claim of complete annual exam coverage.
  const catalog = {
    TYT: {
      'Türkçe': ['Dil Bilgisi', 'Sözcükte ve Cümlede Anlam', 'Paragraf'],
      'Matematik': ['Temel Kavramlar', 'Sayı Basamakları'],
      'Fizik': ['Basınç', 'Sıvıların Kaldırma Kuvveti'],
      'Kimya': ['Kimya Bilimi', 'Atomun Yapısı'],
      'Biyoloji': ['Canlıların Ortak Özellikleri', 'Canlıların Temel Bileşenleri'],
      'Tarih': ['Osmanlı Dağılma Dönemi', '1. Dünya Savaşı', 'Milli Mücadele'],
      'Coğrafya': [], 'Felsefe': [], 'Din Kültürü ve Ahlak Bilgisi': []
    },
    AYT: {
      'Matematik': ['Anlık Değişim Oranı ve Türev', 'Belirsiz İntegral'],
      'Fizik': [], 'Kimya': [], 'Biyoloji': ['İnsan Fizyolojisi'],
      'Türk Dili ve Edebiyatı': [], 'Tarih-1': [], 'Coğrafya-1': [],
      'Tarih-2': [], 'Coğrafya-2': [], 'Felsefe Grubu': [], 'Din Kültürü ve Ahlak Bilgisi': []
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
  const api = {
    exams: Object.keys(catalog),
    lessons: exam => Object.keys(catalog[exam] || {}),
    topics: (exam, lesson) => [...(catalog[exam]?.[lesson] || [])],
    supports: (exam, lesson) => Object.hasOwn(catalog[exam] || {}, lesson)
  };
  root.DersCurriculum = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
