/*
 * Yangi Alifbo — matn konvertori
 * Kirill <-> Lotin <-> Yangi alifbo (loyiha) o'girish qoidalari.
 * Hech qanday kutubxonasiz, oddiy brauzer JavaScript.
 *
 * Ichki funksiyalar "token" ro'yxatini qaytaradi: { s: [manba indeksi], o: [natija bo'lagi] }.
 * Bu Word hujjatlarida har bir bo'lak (run) formatlashini saqlagan holda o'girish uchun kerak.
 */
(function (global) {
  'use strict';

  var OKINA = 'ʻ'; // ʻ  (oʻ, gʻ uchun)
  var APOS = 'ʼ';  // ʼ  (tutuq belgisi)
  var ANY_APOS = "'`‘’ʻʼ´ʹ";

  var VOWELS_LAT = 'aeiouAEIOU';
  var VOWELS_CYR = 'аеёиоуэюяўАЕЁИОУЭЮЯЎ';

  // Yangi alifbo variantlari
  var VARIANTS = {
    A: { o: 'ö', O: 'Ö', g: 'ğ', G: 'Ğ' }, // ö Ö ğ Ğ
    B: { o: 'ó', O: 'Ó', g: 'ǵ', G: 'Ǵ' }  // ó Ó ǵ Ǵ
  };
  var NEW_SH = { s: 'ş', S: 'Ş' }; // ş Ş
  var NEW_CH = { c: 'ç', C: 'Ç' }; // ç Ç

  function isLetter(c) {
    return !!c && c.toLowerCase() !== c.toUpperCase();
  }
  function isUpper(c) {
    return isLetter(c) && c === c.toUpperCase();
  }
  function isApos(c) {
    return !!c && ANY_APOS.indexOf(c) >= 0;
  }
  // Lotin harfi yoki ʻ ʼ belgisi (so'z ichida)
  function isWordChar(c) {
    return isLetter(c) || c === OKINA || c === APOS;
  }

  /* So'z butunlay katta harfda yozilganmi? (SH yoki Sh) */
  function capsContext(text, start, len) {
    var next = text.charAt(start + len);
    if (isLetter(next)) return isUpper(next);
    var prev = text.charAt(start - 1);
    if (isLetter(prev)) return isUpper(prev);
    return false;
  }

  function applyCase(srcFirst, out, caps) {
    if (!out) return out;
    if (!isUpper(srcFirst)) return out;
    if (caps || out.length === 1) return out.toUpperCase();
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  /* ---------------- Token yordamchilari ---------------- */
  function Tokens() { this.s = []; this.o = []; }
  Tokens.prototype.push = function (src, out) { this.s.push(src); this.o.push(out); };
  Tokens.prototype.text = function () { return this.o.join(''); };

  /* Natijadagi har bir belgi manbaning qaysi indeksidan kelganini ko'rsatuvchi massiv */
  function charMap(t) {
    var map = [];
    for (var i = 0; i < t.o.length; i++) {
      for (var k = 0; k < t.o[i].length; k++) map.push(t.s[i]);
    }
    return map;
  }

  /* Ikki bosqichli o'girishni bitta token ro'yxatiga birlashtirish */
  function compose(t1, t2) {
    var map = charMap(t1);
    var r = new Tokens();
    var last = t1.s.length ? t1.s[t1.s.length - 1] : 0;
    for (var i = 0; i < t2.o.length; i++) {
      var idx = t2.s[i] < map.length ? map[t2.s[i]] : last;
      r.push(idx, t2.o[i]);
    }
    return r;
  }

  /* Belgilarni bittadan almashtiradigan (uzunlik o'zgarmaydigan) funksiyalar uchun */
  function identity(text) {
    var t = new Tokens();
    for (var i = 0; i < text.length; i++) t.push(i, text.charAt(i));
    return t;
  }

  /* Tutuq belgilarini to'g'rilash: o' g' -> oʻ gʻ, boshqalari -> ʼ (uzunlik saqlanadi) */
  function normalizeApostrophes(text) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (isApos(c)) {
        var prev = text.charAt(i - 1);
        var next = text.charAt(i + 1);
        if (prev === 'o' || prev === 'O' || prev === 'g' || prev === 'G') {
          out += OKINA;
          continue;
        }
        if (isLetter(prev) && isLetter(next)) {
          out += APOS;
          continue;
        }
      }
      out += c;
    }
    return out;
  }

  /* ---------------- Kirill -> Lotin ---------------- */
  var C2L = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ж': 'j', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': APOS, 'ы': 'i', 'ь': '', 'э': 'e',
    'ё': 'yo', 'ю': 'yu', 'я': 'ya', 'ў': 'o' + OKINA, 'қ': 'q',
    'ғ': 'g' + OKINA, 'ҳ': 'h'
  };

  function cyrToLatT(text) {
    var t = new Tokens();
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var lo = ch.toLowerCase();
      var prev = text.charAt(i - 1);
      var r;
      if (lo === 'е') {
        var start = !isLetter(prev) || VOWELS_CYR.indexOf(prev) >= 0 || 'ъьЪЬ'.indexOf(prev) >= 0;
        r = start ? 'ye' : 'e';
      } else if (lo === 'ц') {
        r = (isLetter(prev) && VOWELS_CYR.indexOf(prev) >= 0) ? 'ts' : 's';
      } else if (Object.prototype.hasOwnProperty.call(C2L, lo)) {
        r = C2L[lo];
      } else {
        t.push(i, ch);
        continue;
      }
      t.push(i, applyCase(ch, r, capsContext(text, i, 1)));
    }
    return t;
  }

  /* ---------------- Lotin -> Kirill ---------------- */
  var L2C = {
    a: 'а', b: 'б', c: 'ц', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж',
    k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с',
    t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з'
  };

  function latToCyrT(text) {
    text = normalizeApostrophes(text);
    var t = new Tokens();
    var i = 0;
    var n = text.length;
    while (i < n) {
      var ch = text.charAt(i);
      var lo = ch.toLowerCase();
      var two = text.substr(i, 2).toLowerCase();
      var three = text.substr(i, 3).toLowerCase();
      var prev = text.charAt(i - 1);
      var wordStart = !isWordChar(prev);
      var afterVowel = isLetter(prev) && VOWELS_LAT.indexOf(prev) >= 0;
      var r = null;
      var len = 1;

      if (three === 's' + APOS + 'h') { r = 'сҳ'; len = 3; }
      else if (two === 'sh') { r = 'ш'; len = 2; }
      else if (two === 'ch') { r = 'ч'; len = 2; }
      else if (two === 'o' + OKINA) { r = 'ў'; len = 2; }
      else if (two === 'g' + OKINA) { r = 'ғ'; len = 2; }
      else if (two === 'yo') { r = 'ё'; len = 2; }
      else if (two === 'yu') { r = 'ю'; len = 2; }
      else if (two === 'ya') { r = 'я'; len = 2; }
      else if (two === 'ye') {
        r = (wordStart || afterVowel) ? 'е' : 'ъе';
        len = 2;
      }
      else if (lo === 'e') { r = (wordStart || afterVowel) ? 'э' : 'е'; }
      else if (ch === APOS) { r = 'ъ'; }
      else if (Object.prototype.hasOwnProperty.call(L2C, lo)) { r = L2C[lo]; }

      if (r === null) {
        t.push(i, ch);
      } else {
        t.push(i, applyCase(ch, r, capsContext(text, i, len)));
      }
      i += len;
    }
    return t;
  }

  /* ---------------- Lotin -> Yangi alifbo ---------------- */
  function latToNewT(text, variant) {
    var V = VARIANTS[variant] || VARIANTS.A;
    text = normalizeApostrophes(text);
    var t = new Tokens();
    var i = 0;
    var n = text.length;
    while (i < n) {
      var ch = text.charAt(i);
      var two = text.substr(i, 2).toLowerCase();
      var three = text.substr(i, 3).toLowerCase();
      var up = isUpper(ch);
      if (three === 's' + APOS + 'h') {
        t.push(i, ch); t.push(i + 2, text.charAt(i + 2)); i += 3; continue; // Isʼhoq -> Ishoq
      }
      if (two === 'sh') { t.push(i, up ? NEW_SH.S : NEW_SH.s); i += 2; continue; }
      if (two === 'ch') { t.push(i, up ? NEW_CH.C : NEW_CH.c); i += 2; continue; }
      if (two === 'o' + OKINA) { t.push(i, up ? V.O : V.o); i += 2; continue; }
      if (two === 'g' + OKINA) { t.push(i, up ? V.G : V.g); i += 2; continue; }
      t.push(i, ch);
      i++;
    }
    return t;
  }

  /* ---------------- Yangi alifbo -> Lotin ---------------- */
  var NEW2L = {};
  NEW2L[NEW_SH.s] = 'sh'; NEW2L[NEW_SH.S] = 'sh';
  NEW2L[NEW_CH.c] = 'ch'; NEW2L[NEW_CH.C] = 'ch';
  ['A', 'B'].forEach(function (k) {
    NEW2L[VARIANTS[k].o] = 'o' + OKINA; NEW2L[VARIANTS[k].O] = 'o' + OKINA;
    NEW2L[VARIANTS[k].g] = 'g' + OKINA; NEW2L[VARIANTS[k].G] = 'g' + OKINA;
  });

  function newToLatT(text) {
    var t = new Tokens();
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (Object.prototype.hasOwnProperty.call(NEW2L, ch)) {
        t.push(i, applyCase(ch, NEW2L[ch], capsContext(text, i, 1)));
      } else if ((ch === 's' || ch === 'S') && (text.charAt(i + 1) === 'h' || text.charAt(i + 1) === 'H')) {
        // yangi alifboda "sh" = s + h (ikki alohida tovush)
        t.push(i, ch + APOS);
      } else {
        t.push(i, ch);
      }
    }
    return t;
  }

  function toAscii(text) {
    return text.replace(/[ʻʼ]/g, "'");
  }

  /**
   * convertMapped(text, from, to, opts) -> { s: [...], o: [...] }
   * Har bir natija bo'lagi (o[i]) manbadagi qaysi belgidan (s[i]) boshlanganini bildiradi.
   */
  function convertMapped(text, from, to, opts) {
    opts = opts || {};
    var t1;
    if (from === 'kirill') t1 = cyrToLatT(text);
    else if (from === 'yangi') t1 = newToLatT(text);
    else t1 = identity(normalizeApostrophes(text));

    var lat = t1.text();
    var res;
    if (to === 'kirill') res = compose(t1, latToCyrT(lat));
    else if (to === 'yangi') res = compose(t1, latToNewT(lat, opts.variant));
    else res = t1;

    if (opts.ascii && to !== 'kirill') res.o = res.o.map(toAscii);
    return res;
  }

  /**
   * convert(text, from, to, opts)
   * from / to: 'kirill' | 'lotin' | 'yangi'
   * opts.variant: 'A' | 'B'   opts.ascii: true -> ʻ ʼ o'rniga '
   */
  function convert(text, from, to, opts) {
    if (!text) return '';
    return convertMapped(text, from, to, opts).o.join('');
  }

  /* Matn qaysi yozuvda ekanini taxmin qilish */
  function detect(text) {
    var cyr = (text.match(/[Ѐ-ӿ]/g) || []).length;
    var lat = (text.match(/[A-Za-z]/g) || []).length;
    var nw = (text.match(/[şŞçÇğĞöÖóÓǵǴ]/g) || []).length;
    if (cyr > lat) return 'kirill';
    if (nw > 0) return 'yangi';
    return 'lotin';
  }

  global.UzConvert = {
    OKINA: OKINA,
    APOS: APOS,
    VARIANTS: VARIANTS,
    isApos: isApos,
    isLetter: isLetter,
    isUpper: isUpper,
    normalizeApostrophes: normalizeApostrophes,
    cyrToLat: function (s) { return cyrToLatT(s).text(); },
    latToCyr: function (s) { return latToCyrT(s).text(); },
    latToNew: function (s, v) { return latToNewT(s, v).text(); },
    newToLat: function (s) { return newToLatT(s).text(); },
    toAscii: toAscii,
    convert: convert,
    convertMapped: convertMapped,
    detect: detect
  };
})(window);
