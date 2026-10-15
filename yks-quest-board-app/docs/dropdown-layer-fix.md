# Ortak dropdown ve bildirim katmanı düzeltmesi

## Yeniden üretim

Chrome'da uygulamanın gerçek `select-controls.js` bileşeni ve CSS'i ile hem
normal sayfada hem yerel `dialog.showModal()` içinde etiketli bir select
çalıştırıldı. Normal sayfa seçimi geçti; modal seçimi tıklanınca değeri `a`
olarak kaldı (beklenen `b`). Eski koda karşı çalışan test bu nedenle başarısız
oldu. Kök neden olay kaydı ile doğrulandı:

1. Seçenek DIV'i üzerinde pointerdown ve mousedown oluşuyor.
2. Odak, arama input'undan modal DIALOG'a geçiyor.
3. Ortak focusin işleyicisi odağı menü dışında gördüğü için popover'ı kapatıyor.
4. Pointerup ve click artık seçenek yerine DIALOG'a gidiyor; seçim işlenmiyor.

Bu bir görünmez overlay veya düşük z-index sorunu değil. Klavye seçiminde
odak arama alanında kaldığından Enter ile seçim çalışıyordu. Ek olarak normal
sayfadaki etiketli menüde seçenek tıklamasının label varsayılanı gizli native
select'e ek click/odak aktarabiliyordu.

## Çözüm

- `select-controls.js`: seçenek mousedown varsayılanı engellenerek combobox
  odağı seçim click'i tamamlanana kadar korunur. Click varsayılanı da iptal
  edilerek label'ın gizli select'e yeniden click aktarması önlenir. Değer
  hâlâ tek ortak `select()` yoluyla yazılır; input/change birer kez gönderilir.
  Pointerdown sırasında erken seçim yapılmaz; dokunmatik kaydırma davranışı
  değiştirilmez. Dış tıklama, Tab, Escape ve klavye araması korunur.
- `index.html`: toast, `popover="manual"` ile yerel top layer'a alınır. Her
  yeni bildirim mevcut üst katmanın üzerine yeniden açılır. Odak alınmaz;
  eski süre sonunda popover kapanır. Popover API'si olmayan tarayıcılar için
  önceki bildirim gösterme yolu korunur.
- `ui.css`: popover'ın tarayıcı varsayılan ortalaması yerine mevcut alt-orta
  toast konumu, mobil güvenli alan ve tıklamaları engellemeyen backdrop ayarı.

Bildirim hatasının ayrı kök nedeni: `showModal()` dialog'ları normal document
stacking context'lerinin üstündeki tarayıcı top layer'ında bulunur. Normal
sayfa içindeki toast'ın z-index'ini yükseltmek bu katmanı aşmaz.

## Test kapsamı

- `tests/dropdown-layers.cjs`: eski kodda başarısız olan gerçek fare olaylı
  yeniden üretim; sayfa/modal, Classic/Bulanık, açık/koyu, dokunma, tek
  input/change, klavye araması, Escape, Tab, dış tıklama, modal/drawer toast,
  bildirim zaman aşımı ve odağın korunması.
- `tests/pointer-select.cjs`: testlerde native selectOption yerine gerçek
  ortak menüye fare ile basan yardımcı.
- `tests/catalog-browser.cjs`: tüm öğretmen sınav/ders/kategori/alt konu/tekrar
  seçicilerinde gerçek pointer seçimi ve taslak değer kontrolü.
- `tests/ui.cjs`: geçmiş filtresi, manuel görev dersi ve öğretmen özel konu
  seçimi gerçek fareyle çalıştırılır.
- `tests/staging.cjs`: izole Supabase test hesabıyla gerçek fare seçimi,
  program gönderme/kabul ve ikinci cihazda veri doğrulaması.
- `tests/browser.cjs`: ortak katman testi tam regresyon paketine eklenmiştir.

Önceki bazı testler native `selectOption` kullandığından fare olay sırası
hatasını yakalayamıyordu. Yeni kontroller bu test boşluğunu kapatır.
Veritabanı, RLS, XP hesaplamaları ve gerçek kullanıcı verileri değiştirilmez.
