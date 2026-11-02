/*
 * Klaviatura joylashuvlari (layout): Lotin, Kirill, Yangi alifbo.
 * Tugmalar fizik kod (KeyboardEvent.code) bo'yicha aniqlanadi —
 * shuning uchun tizim tili qaysi bo'lishidan qat'i nazar ishlaydi.
 */
(function (global) {
  'use strict';

  var C = global.UzConvert;
  var OKINA = C.OKINA;
  var APOS = C.APOS;
  var SMART = ''; // "aqlli" tutuq belgisi (oʻ/gʻ dan keyin ʻ, aks holda ʼ)

  /* Tugmalar qatori: [kod, kenglik] */
  var ROWS = [
    [['Backquote'], ['Digit1'], ['Digit2'], ['Digit3'], ['Digit4'], ['Digit5'], ['Digit6'],
      ['Digit7'], ['Digit8'], ['Digit9'], ['Digit0'], ['Minus'], ['Equal'], ['Backspace', 2]],
    [['Tab', 1.5], ['KeyQ'], ['KeyW'], ['KeyE'], ['KeyR'], ['KeyT'], ['KeyY'], ['KeyU'],
      ['KeyI'], ['KeyO'], ['KeyP'], ['BracketLeft'], ['BracketRight'], ['Backslash', 1.5]],
    [['CapsLock', 1.8], ['KeyA'], ['KeyS'], ['KeyD'], ['KeyF'], ['KeyG'], ['KeyH'], ['KeyJ'],
      ['KeyK'], ['KeyL'], ['Semicolon'], ['Quote'], ['Enter', 2.2]],
    [['ShiftLeft', 2.3], ['KeyZ'], ['KeyX'], ['KeyC'], ['KeyV'], ['KeyB'], ['KeyN'], ['KeyM'],
      ['Comma'], ['Period'], ['Slash'], ['ShiftRight', 2.7]],
    [['Lang', 2], ['AltLeft', 1.5], ['Space', 8], ['AltRight', 1.5], ['ArrowLeft', 1], ['ArrowRight', 1]]
  ];

  var ACTION_LABELS = {
    Backspace: '⌫', Tab: 'Tab ⇥', CapsLock: 'Caps', Enter: 'Enter ↵',
    ShiftLeft: '⇧ Shift', ShiftRight: '⇧ Shift', Space: '', AltLeft: 'Alt',
    AltRight: 'Alt', ArrowLeft: '←', ArrowRight: '→', Lang: '🌐'
  };

  /* Standart US (QWERTY) */
  var US = {
    Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'],
    Digit4: ['4', '$'], Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'],
    Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'], Minus: ['-', '_'],
    Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
    Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'],
    Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?']
  };
  'qwertyuiopasdfghjklzxcvbnm'.split('').forEach(function (l) {
    US['Key' + l.toUpperCase()] = [l, l.toUpperCase()];
  });

  function extend(base, over) {
    var o = {};
    var k;
    for (k in base) o[k] = base[k];
    for (k in over) o[k] = over[k];
    return o;
  }

  /* Joriy o'zbek lotin alifbosi */
  var LOTIN = extend(US, {
    Quote: [SMART, '"'],
    Backquote: [APOS, '`']
  });

  /* Yangi alifbo (loyiha) — variantga qarab yaratiladi */
  function makeYangi(variant) {
    var V = C.VARIANTS[variant] || C.VARIANTS.A;
    return extend(US, {
      Backquote: [APOS, '`'],
      BracketLeft: [V.g, V.G],
      BracketRight: [V.o, V.O],
      Semicolon: ['ş', 'Ş'],
      Quote: ['ç', 'Ç']
    });
  }

  /* O'zbek kirill (Windows standarti) */
  var KIRILL = {
    Backquote: ['ё', 'Ё'], Digit1: ['1', '!'], Digit2: ['2', '"'], Digit3: ['3', '№'],
    Digit4: ['4', ';'], Digit5: ['5', '%'], Digit6: ['6', ':'], Digit7: ['7', '?'],
    Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'], Minus: ['ғ', 'Ғ'],
    Equal: ['ҳ', 'Ҳ'],
    KeyQ: ['й', 'Й'], KeyW: ['ц', 'Ц'], KeyE: ['у', 'У'], KeyR: ['к', 'К'], KeyT: ['е', 'Е'],
    KeyY: ['н', 'Н'], KeyU: ['г', 'Г'], KeyI: ['ш', 'Ш'], KeyO: ['ў', 'Ў'], KeyP: ['з', 'З'],
    BracketLeft: ['х', 'Х'], BracketRight: ['ъ', 'Ъ'], Backslash: ['-', '/'],
    KeyA: ['ф', 'Ф'], KeyS: ['қ', 'Қ'], KeyD: ['в', 'В'], KeyF: ['а', 'А'], KeyG: ['п', 'П'],
    KeyH: ['р', 'Р'], KeyJ: ['о', 'О'], KeyK: ['л', 'Л'], KeyL: ['д', 'Д'],
    Semicolon: ['ж', 'Ж'], Quote: ['э', 'Э'],
    KeyZ: ['я', 'Я'], KeyX: ['ч', 'Ч'], KeyC: ['с', 'С'], KeyV: ['м', 'М'], KeyB: ['и', 'И'],
    KeyN: ['т', 'Т'], KeyM: ['ь', 'Ь'], Comma: ['б', 'Б'], Period: ['ю', 'Ю'], Slash: ['.', ',']
  };

  /* Alt + harf — tezkor maxsus harflar */
  function altCombos(layout, variant) {
    var V = C.VARIANTS[variant] || C.VARIANTS.A;
    if (layout === 'lotin') {
      return {
        KeyO: ['o' + OKINA, 'O' + OKINA], KeyG: ['g' + OKINA, 'G' + OKINA],
        KeyS: ['sh', 'Sh'], KeyC: ['ch', 'Ch'], KeyN: ['ng', 'Ng'], Quote: [APOS, APOS]
      };
    }
    if (layout === 'yangi') {
      return {
        KeyO: [V.o, V.O], KeyG: [V.g, V.G], KeyS: ['ş', 'Ş'],
        KeyC: ['ç', 'Ç'], Quote: [APOS, APOS]
      };
    }
    return {};
  }

  /* Klaviatura ustidagi maxsus belgilar paneli */
  function specials(layout, variant) {
    var V = C.VARIANTS[variant] || C.VARIANTS.A;
    if (layout === 'kirill') return ['ў', 'Ў', 'қ', 'Қ', 'ғ', 'Ғ', 'ҳ', 'Ҳ', 'ё', '«', '»', '—', '№'];
    if (layout === 'yangi') {
      return ['ş', 'Ş', 'ç', 'Ç', V.g, V.G, V.o, V.O, APOS, '«', '»', '—'];
    }
    return ['o' + OKINA, 'O' + OKINA, 'g' + OKINA, 'G' + OKINA, APOS, 'sh', 'ch', 'ng', '«', '»', '—'];
  }

  /* Qaysi barmoq bosadi */
  var FINGERS = {};
  function setF(f, codes) { codes.forEach(function (c) { FINGERS[c] = f; }); }
  setF('lp', ['Backquote', 'Digit1', 'KeyQ', 'KeyA', 'KeyZ', 'Tab', 'CapsLock', 'ShiftLeft']);
  setF('lr', ['Digit2', 'KeyW', 'KeyS', 'KeyX']);
  setF('lm', ['Digit3', 'KeyE', 'KeyD', 'KeyC']);
  setF('li', ['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB']);
  setF('ri', ['Digit6', 'Digit7', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM']);
  setF('rm', ['Digit8', 'KeyI', 'KeyK', 'Comma']);
  setF('rr', ['Digit9', 'KeyO', 'KeyL', 'Period']);
  setF('rp', ['Digit0', 'Minus', 'Equal', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash',
    'Semicolon', 'Quote', 'Slash', 'Enter', 'Backspace', 'ShiftRight']);
  setF('th', ['Space', 'AltLeft', 'AltRight']);

  var LEFT_HAND = { lp: 1, lr: 1, lm: 1, li: 1 };

  function getMap(layout, variant) {
    if (layout === 'kirill') return KIRILL;
    if (layout === 'yangi') return makeYangi(variant);
    return LOTIN;
  }

  function isLetterPair(pair) {
    return C.isLetter(pair[0]) && pair[0].toUpperCase() === pair[1];
  }

  /**
   * Tugma kodidan belgini olish.
   * Qaytaradi: belgi (string), SMART yoki null.
   */
  function getChar(layout, variant, code, shift, caps, alt) {
    if (code === 'Space') return ' ';
    var pair;
    if (alt) {
      var combos = altCombos(layout, variant);
      pair = combos[code] || US[code];
    } else {
      pair = getMap(layout, variant)[code];
    }
    if (!pair) return null;
    var up = isLetterPair(pair) ? (shift !== caps) : shift;
    return up ? pair[1] : pair[0];
  }

  /* Belgi -> tugma (mashq rejimida keyingi tugmani ko'rsatish uchun) */
  function reverseMap(layout, variant) {
    var map = getMap(layout, variant);
    var rev = { ' ': { code: 'Space', shift: false } };
    Object.keys(map).forEach(function (code) {
      var p = map[code];
      if (p[0] === SMART) {
        rev[OKINA] = { code: code, shift: false };
        rev[APOS] = rev[APOS] || { code: code, shift: false };
        rev["'"] = { code: code, shift: false };
      } else if (!rev[p[0]]) {
        rev[p[0]] = { code: code, shift: false };
      }
      if (!rev[p[1]]) rev[p[1]] = { code: code, shift: true };
    });
    return rev;
  }

  global.UzLayouts = {
    ROWS: ROWS,
    ACTION_LABELS: ACTION_LABELS,
    FINGERS: FINGERS,
    LEFT_HAND: LEFT_HAND,
    SMART: SMART,
    US: US,
    getMap: getMap,
    getChar: getChar,
    reverseMap: reverseMap,
    specials: specials,
    altCombos: altCombos,
    isLetterPair: isLetterPair,
    NAMES: { lotin: 'Lotin', kirill: 'Кирилл', yangi: 'Yangi alifbo' }
  };
})(window);
