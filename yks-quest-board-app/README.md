# YKS Quest Board

Statik PWA uygulaması. Supabase bağlanınca e-posta/şifre girişiyle PC ve telefon arasında haftalar, questler, XP ve tamamlanma durumları eşitlenir.

## Supabase kurulumu

1. Supabase'te ücretsiz bir proje oluştur.
2. SQL Editor içinde `supabase-schema.sql` dosyasındaki SQL'i çalıştır.
3. Authentication > Providers altında Email provider açık kalsın.
4. Project Settings > API bölümünden Project URL ve anon public key değerlerini al.
5. `config.js` dosyasındaki `YOUR_SUPABASE_URL` ve `YOUR_SUPABASE_ANON_KEY` alanlarını doldur.

## Yayınlama

Bu klasör doğrudan Vercel, Netlify veya GitHub Pages'e yüklenebilir.

Vercel için:

```bash
vercel --prod
```

Netlify için:

```bash
netlify deploy --prod --dir .
```

## Telefona kurma

HTTPS adresini Chrome'da aç, menüden "Ana ekrana ekle" seçeneğini kullan.
