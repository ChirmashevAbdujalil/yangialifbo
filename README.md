# Yangi Alifbo — onlayn oʻzbek klaviaturasi

Oddiy **HTML + CSS + JavaScript** bilan yozilgan sayt. Build yoki server dasturi kerak emas:
fayllarni istalgan hostingga (Netlify, GitHub Pages, oddiy Apache/Nginx, cPanel hosting) yuklasangiz
yoki `index.html` ni kompyuterda shunchaki ochsangiz ham ishlaydi.

Dasturchi: **Abdujalil Chirmashev** · Dastur homiysi: **Andijon davlat texnika instituti**

## Imkoniyatlar

### Konvertor
- Kirill ⇄ Lotin ⇄ Yangi alifbo, yozuvni avtomatik aniqlash.
- Aralash va “iflos” matnlar ham oxirigacha oʻgiriladi: bir matnda kirill, lotin va qisman yangi
  alifbo boʻlsa; lotin soʻz ichida koʻrinishi bir xil kirill harflari (с, о, һ) uchrasa;
  tutuq belgisi har xil yozilgan boʻlsa (' ` ‘ ’ ʻ ʼ ′ va boshqalar).
- Toʻgʻri qoidalar: е → ye/e, ц → s/ts, ъ → ʼ, ё/ю/я, `sʼh` (Isʼhoq), katta harfli soʻzlar (ШАХМАТ → SHAXMAT).
- **Word (.docx) hujjatlarni oʻgirish**: hujjat yuklanadi, oʻgiriladi va yana .docx sifatida
  yuklab olinadi. Shrift, qalin/kursiv, jadval, rasm, kolontitul va izohlar saqlanadi.
  Hujjat faqat brauzerda qayta ishlanadi — hech qayerga yuborilmaydi.
- Faylni (.txt yoki .docx) matn maydoniga sudrab tashlash mumkin.
- Fayldan yuklash, nusxa olish, saqlash, natijani muharrirga oʻtkazish.

### Word qoʻshimchasi (Microsoft Word ichida)
- Saytdagi **«Word dasturiga qoʻshish»** tugmasi — oʻrnatish fayli (`manifest.xml`) va yoʻriqnoma
  (Word Online, Windows, Mac, tashkilot uchun Microsoft 365 orqali).
- Word lentasida **«Yangi Alifbo»** tugmasi paydo boʻladi, yon panelda:
  belgilangan matnni oʻgirish, butun hujjatni (jadvallar va kolontitullar bilan) oʻgirish,
  tutuq belgilarini tuzatish. Saytdagi konvertorning aynan oʻzi ishlatiladi.
- Formatlash saqlanadi: har bir paragraf OOXML koʻrinishida olinadi va faqat matn boʻlaklari
  (`w:t`) almashtiriladi. Natija yoqmasa — `Ctrl+Z`.
- Talab: Word 2016 va yangilari / Microsoft 365 / Word Online (WordApi 1.3). Qoʻshimcha sayt
  joylangan manzildan (`https://yangialifbouz.vercel.app/word-addin/`) yuklanadi.

### Klaviatura (matn muharriri)
- Uchta yozuv: **Lotin**, **Кирилл** va **Yangi alifbo** (loyiha).
- Kompyuteringiz tili inglizcha yoki ruscha boʻlsa ham, matn tanlangan yozuvda yoziladi
  (tugmalar fizik joylashuvi boʻyicha aniqlanadi).
- Ekrandagi klaviatura: Shift, Caps Lock, Alt, Backspace (bosib tursa takrorlaydi), strelkalar.
- Maxsus harflar paneli: oʻ, gʻ, ʼ, sh, ch, ng, «», — (kirillda ў, қ, ғ, ҳ; yangi alifboda ş, ç, ğ, ö).
- “Aqlli” tutuq belgisi: `'` tugmasi o va g dan keyin **ʻ**, boshqa joyda **ʼ** qoʻyadi.
- Yangi alifboda avtomatik almashtirish: `sh → ş`, `ch → ç`, `o' → ö`, `g' → ğ`.
- Tezkor tugmalar: `Alt+O` → oʻ, `Alt+G` → gʻ, `Alt+S` → sh/ş, `Alt+C` → ch/ç,
  `Alt+1/2/3` — yozuvni almashtirish, `Ctrl+Shift+C` — butun matndan nusxa.
- Nusxa olish, `.txt` qilib saqlash, fayl ochish, tutuq belgilarini tuzatish,
  shrift oʻlchami, belgi/soʻz/qator hisoblagichi, matn avtomatik saqlanadi.

### Mashq (tez yozish trenajyori)
- 10 ta dars: asosiy qator, yuqori/pastki qator, barcha harflar, maxsus harflar, soʻzlar,
  bosh harflar, raqamlar, maqollar va oʻz matningiz.
- Vaqt: 15 s, 30 s, 1, 2, 5 daqiqa yoki “matn tugaguncha”.
- Jonli statistika: soʻz/daqiqa, belgi/daqiqa, aniqlik, xatolar, progress.
- Keyingi bosiladigan tugma va kerakli Shift yoritiladi, barmoqlar boʻyicha ranglar.
- **Xatolar xaritasi** — qaysi tugmalarda koʻp adashayotganingiz klaviaturada koʻrinadi.
- Natijalar tarixi, grafik, eng yaxshi natija va daraja (Boshlangʻich → Usta).
- Barcha darslar uchala yozuvda ishlaydi.

### Alifbo
- Har bir harf uch yozuvda va misol soʻz bilan; bossangiz muharrirga qoʻshiladi.

### Umumiy
- Rasmiy uslubdagi dizayn: SVG ikonlar (internetsiz ishlaydi), kunduzgi / tungi mavzu,
  tugma ovozi, telefon va planshetga moslashgan koʻrinish.
- Telefonda tizim klaviaturasini yashirish (faqat ekrandagi klaviatura bilan yozish).
- Barcha sozlamalar va natijalar brauzerda (`localStorage`) saqlanadi.
- Telegram, Facebook va X uchun havola koʻrinishi (rasm, nom, tavsif), Google uchun
  tuzilgan maʼlumotlar (schema.org) va `robots.txt`.

### Reklama va admin panel
- Saytda ikkita reklama joyi bor: **sahifa tepasi** (menyu ostida) va **sahifa pasti**.
  Faol reklama boʻlmasa, bu joylar umuman koʻrinmaydi va sahifaga hech qanday taʼsir qilmaydi.
- Reklama turlari: **rasm (banner)** — kompyuter va telefon uchun alohida rasm bilan,
  **matnli eʼlon** (sarlavha, matn, tugma) va **HTML kod** (Google AdSense, Yandex RTB va h.k.).
- Har bir reklama uchun: qaysi boʻlimlarda koʻrinishi, qurilma (kompyuter/telefon),
  boshlanish va tugash sanasi, foydalanuvchi yopa olishi mumkinligi.
- Reklama ustida “Reklama” yozuvi turadi, havolalar `rel="sponsored"` bilan ochiladi.
- Boshqaruv paneli: `sayt-manzili/admin/`

### Reklama statistikasi (Vercel yoki PHP hostingda)
- Har bir reklama uchun **koʻrishlar**, **bosishlar** va **CTR** (bosish ulushi) kunlar boʻyicha.
- Admin paneldagi “Statistika” boʻlimi: davr (7 / 30 / 90 kun, 12 oy), reklama boʻyicha filtr,
  koʻrsatkich kartochkalari, kunlik (12 oyda — oylik) grafik, jadval koʻrinishi,
  reklamalar reytingi, Excel uchun CSV yuklab olish, statistikani tozalash.
- **Koʻrish** — reklamaning kamida yarmi ekranda 1 soniya turganda (bir sahifa ochilishida bir marta).
  **Bosish** — reklama havolasi bosilganda.
- Qidiruv robotlari hisoblanmaydi; bir IP manzildan daqiqasiga 60 tadan ortiq hodisa qabul qilinmaydi;
  faqat mavjud va faol reklamalar hisoblanadi.
- Maʼlumotlar bazasi (MySQL) kerak emas: kunlik sonlar `admin/data/ads-stats.php` faylida saqlanadi
  (brauzer orqali ochib boʻlmaydi). IP manzil yoki cookie saqlanmaydi.
- HTML kod (AdSense, Yandex) reklamalarida bosishlar reklama tarmogʻining oʻz kabinetida hisoblanadi.

## Fayllar

```
index.html        — sahifa
css/style.css     — dizayn
js/converter.js   — Kirill/Lotin/Yangi oʻgirish qoidalari
js/layouts.js     — klaviatura joylashuvlari
js/keyboard.js    — ekrandagi klaviatura komponenti
js/data.js        — mashq uchun soʻzlar va maqollar
js/trainer.js     — tez yozish mashqi
js/app.js         — asosiy ilova
js/docx.js        — Word (.docx) hujjatlarni oʻgirish
js/ads.js         — reklama joylari
js/vendor/        — JSZip kutubxonasi (Word fayllar uchun, MIT litsenziya)
ads.json          — reklamalar roʻyxati (admin panel yaratadi)
ads/uploads/      — admin paneldan yuklangan reklama rasmlari
ads/track.php     — koʻrish va bosishlarni hisoblash (PHP)
admin/            — reklama boshqaruv paneli (admin/save.php — PHP boʻlsa)
admin/stats.js    — statistika boʻlimi
admin/lib.php     — statistika ombori (PHP)
admin/data/       — statistika fayli (server yozishi mumkin boʻlishi kerak)
api/              — Vercel server funksiyalari (admin panel, reklamalar, statistika, rasmlar)
.vercelignore     — Vercel’ga joylanmaydigan fayllar (PHP)
og-image.png      — ijtimoiy tarmoqlarda havola ulashilganda chiqadigan rasm
word-addin/       — Microsoft Word qoʻshimchasi: manifest.xml, panel (taskpane.*), ikonkalar
promo/            — reklama posteri (16:9 PNG) va uning manbasi
```

## Ishga tushirish

- Kompyuterda: `index.html` faylini brauzerda oching.
- Hostingda: barcha fayllarni papka tuzilishi bilan birga yuklang.
- Lokal server (ixtiyoriy):

```bash
python3 -m http.server 8080
```

## Admin panelni sozlash

Panel uch xil hostingda ishlaydi va qaysi biri ekanini oʻzi aniqlaydi: **Vercel**, **PHP** yoki **statik**.

**0. Vercel (sayt hozir shu yerda: https://yangialifbouz.vercel.app)** — admin panel ham, statistika ham ishlaydi:

1. Vercel → loyiha → **Storage** → **Upstash for Redis** (bepul tarif) → **Create** / **Connect Project**.
   `KV_REST_API_URL` va `KV_REST_API_TOKEN` kalitlari avtomatik qoʻshiladi.
2. Vercel → loyiha → **Settings** → **Environment Variables** → `ADMIN_PASSWORD` = kamida 10 belgili parol.
   (Ixtiyoriy: `SESSION_SECRET` — uzun tasodifiy matn.)
3. **Deployments** → oxirgi joylash → **Redeploy**.
4. `https://yangialifbouz.vercel.app/admin/` — parol bilan kiring. Saqlangan oʻzgarishlar ~30 soniyada saytda koʻrinadi.

Qanday ishlaydi: `api/` papkasidagi Node.js funksiyalari (`admin`, `ads`, `track`, `ad-image`) PHP versiyasi
bilan bir xil vazifani bajaradi; reklamalar, rasmlar (brauzerda 700 KB gacha siqiladi) va statistika
Upstash Redis’da saqlanadi. Parol repoda emas, Vercel sozlamalarida turadi. Tashqi kutubxona kerak emas.
`.vercelignore` PHP fayllarni Vercel’ga joylamaydi.
Upstash bepul tarifining oylik soʻrovlar chegarasi bor (joriy shartlarni Upstash saytida tekshiring):
har bir reklama koʻrish/bosish ~4 ta soʻrov; reklamalar roʻyxati CDN’da 30 soniya keshlanadi.

**1. PHP qoʻllaydigan hosting (cPanel, oddiy Apache/Nginx + PHP)** — eng qulayi:

1. `admin/config.php` faylini oching va `PAROLNI_OZGARTIRING` oʻrniga kamida 10 belgidan iborat
   parol yozing.
2. Saytni yuklang. `ads.json` fayli, `ads/uploads/` va `admin/data/` papkalari server tomonidan
   yozilishi mumkin boʻlishi kerak (odatda 644/755 huquqlar yetarli; kerak boʻlsa 664/775 qiling).
3. `sayt-manzili/admin/` ni oching, parol bilan kiring, reklamalarni tayyorlang va
   **“Saytga saqlash”** tugmasini bosing — oʻzgarishlar darhol saytda koʻrinadi.

Xavfsizlik: parol tekshiruvi serverda, 5 ta notoʻgʻri urinishdan soʻng 15 daqiqa bloklanadi,
sessiya cookie `HttpOnly` + `SameSite=Strict`, saqlashda CSRF tokeni tekshiriladi,
yuklangan fayllar faqat haqiqiy rasm (PNG, JPG, GIF, WEBP) boʻlishi mumkin.

**2. Statik hosting (Netlify, GitHub Pages)** — PHP yoʻq:

1. `admin/` sahifasini oching (yoki `admin/index.html` ni kompyuterda oching).
2. Reklamalarni tayyorlang va **“ads.json yuklab olish”** tugmasini bosing.
3. Yuklab olingan `ads.json` faylini sayt papkasiga (`index.html` yoniga) joylang va saytni yangilang.

Statik hostingda `admin/config.php` faylini yuklamang — u yerda PHP ishlamaydi va kerak emas.

## Sayt manzili oʻzgarsa

Sayt `https://yangialifbouz.vercel.app` manzilida. Manzil oʻzgarsa, quyidagilarni yangilang:
`word-addin/manifest.xml` (barcha manzillar va `<Version>` raqamini oshirish) hamda
`index.html` dagi `og:url`, `og:image`, `twitter:image`, `canonical`.

## Havola koʻrinishi (Telegram, Facebook)

`index.html` dagi `og:image` va `twitter:image` qiymatlarini sayt domeni bilan toʻliq
manzilga almashtirish tavsiya etiladi, masalan: `https://yangialifbo.uz/og-image.png`.
Baʼzi ijtimoiy tarmoqlar faqat toʻliq manzilni qabul qiladi.

> Eslatma: “Yangi alifbo” — taklif etilgan loyiha boʻyicha. Sozlamalarda ikki variantdan birini
> tanlash mumkin: **Ş Ç Ğ Ö** yoki **Ş Ç Ǵ Ó**.
