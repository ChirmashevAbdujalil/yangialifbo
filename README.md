# Yangi Alifbo — onlayn oʻzbek klaviaturasi

Oddiy **HTML + CSS + JavaScript** bilan yozilgan sayt. Hech qanday kutubxona, build yoki
server dasturi kerak emas: fayllarni istalgan hostingga (Netlify, GitHub Pages, oddiy Apache/Nginx,
cPanel hosting) yuklasangiz yoki `index.html` ni kompyuterda shunchaki ochsangiz ham ishlaydi.

## Imkoniyatlar

### ⌨️ Klaviatura (matn muharriri)
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

### 🏁 Mashq (tez yozish trenajyori)
- 10 ta dars: asosiy qator, yuqori/pastki qator, barcha harflar, maxsus harflar, soʻzlar,
  bosh harflar, raqamlar, maqollar va oʻz matningiz.
- Vaqt: 15 s, 30 s, 1, 2, 5 daqiqa yoki “matn tugaguncha”.
- Jonli statistika: soʻz/daqiqa, belgi/daqiqa, aniqlik, xatolar, progress.
- Keyingi bosiladigan tugma va kerakli Shift yoritiladi, barmoqlar boʻyicha ranglar.
- **Xatolar xaritasi** — qaysi tugmalarda koʻp adashayotganingiz klaviaturada koʻrinadi.
- Natijalar tarixi, grafik, eng yaxshi natija va daraja (Boshlovchi → Chempion).
- Barcha darslar uchala yozuvda ishlaydi.

### 🔄 Konvertor
- Kirill ⇄ Lotin ⇄ Yangi alifbo, yozuvni avtomatik aniqlash.
- Toʻgʻri qoidalar: е → ye/e, ц → s/ts, ъ → ʼ, ё/ю/я, `sʼh` (Isʼhoq), katta harfli soʻzlar (ШАХМАТ → SHAXMAT).
- Fayldan yuklash, nusxa olish, saqlash, natijani muharrirga oʻtkazish.

### 🔤 Alifbo
- Har bir harf uch yozuvda va misol soʻz bilan; bossangiz muharrirga qoʻshiladi.

### Umumiy
- Kunduzgi / tungi mavzu, tugma ovozi, telefon va planshetga moslashgan dizayn.
- Telefonda tizim klaviaturasini yashirish (faqat ekrandagi klaviatura bilan yozish).
- Barcha sozlamalar va natijalar brauzerda (`localStorage`) saqlanadi.

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
```

## Ishga tushirish

- Kompyuterda: `index.html` faylini brauzerda oching.
- Hostingda: barcha fayllarni papka tuzilishi bilan birga yuklang.
- Lokal server (ixtiyoriy):

```bash
python3 -m http.server 8080
```

> Eslatma: “Yangi alifbo” — taklif etilgan loyiha boʻyicha. Sozlamalarda ikki variantdan birini
> tanlash mumkin: **Ş Ç Ğ Ö** yoki **Ş Ç Ǵ Ó**.
