/*
 * Yangi Alifbo — asosiy ilova.
 */
(function () {
  'use strict';

  var C = window.UzConvert;
  var L = window.UzLayouts;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- Saqlash (localStorage) ---------------- */
  var store = {
    get: function (k, def) {
      try {
        var v = localStorage.getItem(k);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* xotira to'la yoki taqiqlangan */ }
    },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  var isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  var DEFAULTS = {
    layout: 'lotin', variant: 'A', sound: true, theme: '', auto: true, smart: true,
    map: true, fingers: true, noSysKb: isTouch, errSound: true, fontSize: 20,
    lesson: 'home', duration: 60, backspace: true, stop: false, heat: false,
    targetHint: true, tab: 'converter', convFrom: 'auto', convTo: 'lotin', convAscii: false
  };
  var S = Object.assign({}, DEFAULTS, store.get('ya_settings', {}));
  function save() { store.set('ya_settings', S); }

  /* ---------------- Ovoz ---------------- */
  var audioCtx = null;
  function beep(freq, dur, vol, type) {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t = audioCtx.currentTime;
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function clickSound() { if (S.sound) beep(1500 + Math.random() * 300, 0.035, 0.03, 'square'); }
  function errorSound() { if (S.errSound) beep(180, 0.15, 0.06, 'sawtooth'); }

  /* ---------------- Toast ---------------- */
  var toastTimer;
  function toast(msg, kind) {
    var t = $('toast');
    t.className = 'toast' + (kind === 'error' ? ' error' : '');
    t.innerHTML = window.uzIcon(kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'check') + '<span></span>';
    t.lastChild.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------------- Clipboard / fayl ---------------- */
  function copyText(text) {
    if (!text) { toast('Matn boʻsh', 'info'); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('Nusxa olindi'); }, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('Nusxa olindi'); } catch (e) { toast('Nusxa olib boʻlmadi', 'error'); }
      document.body.removeChild(ta);
    }
  }

  function downloadText(text, name) {
    if (!text) { toast('Matn boʻsh', 'info'); return; }
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function readFile(input, cb) {
    var f = input.files && input.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { cb(String(r.result)); input.value = ''; };
    r.onerror = function () { toast('Faylni oʻqib boʻlmadi', 'error'); };
    r.readAsText(f, 'utf-8');
  }

  /* ---------------- Modallar ---------------- */
  function openModal(id) { $(id).hidden = false; var f = $(id).querySelector('select, input, button.primary'); if (f) f.focus(); }
  function closeModals() {
    document.querySelectorAll('.modal').forEach(function (m) { m.hidden = true; });
    if (S.tab === 'trainer') $('typingBox').focus();
  }
  function modalOpen() {
    return Array.prototype.some.call(document.querySelectorAll('.modal'), function (m) { return !m.hidden; });
  }
  document.querySelectorAll('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.closest('[data-close]')) closeModals();
    });
  });

  /* ================= MUHARRIR ================= */
  var editor = $('editor');

  var kbEditor = new window.VirtualKeyboard($('kbEditor'), {
    onKey: function (k) { editorVirtualKey(k); },
    onSound: clickSound
  });

  function insertText(text) {
    if (document.activeElement !== editor) editor.focus();
    var ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
    if (!ok) {
      editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, 'end');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function insertChar(ch) {
    var start = editor.selectionStart;
    var end = editor.selectionEnd;
    var prev = start === end ? editor.value.charAt(start - 1) : '';
    if (ch === L.SMART) {
      if (S.smart) ch = /[oOgG]/.test(prev) ? C.OKINA : (C.isLetter(prev) ? C.APOS : "'");
      else ch = "'";
    }
    if (S.layout === 'yangi' && S.auto && start === end && prev) {
      var V = C.VARIANTS[S.variant] || C.VARIANTS.A;
      var rep = null;
      if ((ch === 'h' || ch === 'H') && (prev === 's' || prev === 'S')) rep = prev === 'S' ? 'Ş' : 'ş';
      else if ((ch === 'h' || ch === 'H') && (prev === 'c' || prev === 'C')) rep = prev === 'C' ? 'Ç' : 'ç';
      else if (C.isApos(ch) && (prev === 'o' || prev === 'O')) rep = prev === 'O' ? V.O : V.o;
      else if (C.isApos(ch) && (prev === 'g' || prev === 'G')) rep = prev === 'G' ? V.G : V.g;
      if (rep) {
        editor.setSelectionRange(start - 1, start);
        insertText(rep);
        return;
      }
    }
    insertText(ch);
  }

  function editorVirtualKey(k) {
    if (k.type === 'char') { clickSound(); insertChar(k.char); return; }
    switch (k.name) {
      case 'Backspace':
        if (document.activeElement !== editor) editor.focus();
        var ok = false;
        try { ok = document.execCommand('delete', false); } catch (e) {}
        if (!ok) {
          var s = editor.selectionStart, e2 = editor.selectionEnd;
          if (s === e2 && s > 0) s--;
          editor.setRangeText('', s, e2, 'end');
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      case 'Enter': insertText('\n'); break;
      case 'Tab': insertText('\t'); break;
      case 'ArrowLeft':
      case 'ArrowRight': {
        var p = editor.selectionStart + (k.name === 'ArrowLeft' ? -1 : 1);
        p = Math.max(0, Math.min(editor.value.length, p));
        editor.focus();
        editor.setSelectionRange(p, p);
        break;
      }
      case 'Lang': cycleLayout(); break;
    }
  }

  function handleEditorKey(e) {
    if (!S.map || e.isComposing) return;
    if ((e.ctrlKey && !e.altKey) || e.metaKey) return;
    var caps = e.getModifierState ? e.getModifierState('CapsLock') : false;
    var ch = L.getChar(S.layout, S.variant, e.code, e.shiftKey, caps, e.altKey);
    if (ch === null) return;
    e.preventDefault();
    clickSound();
    insertChar(ch);
  }

  var saveTimer;
  function updateCounters() {
    var v = editor.value;
    $('cntChars').textContent = v.length;
    $('cntWords').textContent = (v.match(/\S+/g) || []).length;
    $('cntLines').textContent = v.split('\n').length;
  }
  editor.addEventListener('input', function () {
    updateCounters();
    $('saveState').innerHTML = window.uzIcon('rotate') + 'Saqlanmoqda…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      store.set('ya_text', editor.value);
      $('saveState').innerHTML = window.uzIcon('check') + 'Saqlandi';
    }, 400);
  });

  function replaceEditorText(text) {
    editor.focus();
    editor.select();
    insertText(text);
    if (!text) editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  $('copyBtn').onclick = function () { copyText(editor.value); };
  $('downloadBtn').onclick = function () { downloadText(editor.value, 'matn.txt'); };
  $('openFile').onchange = function () { readFile(this, function (t) { replaceEditorText(t); toast('Fayl ochildi'); }); };
  $('fixBtn').onclick = function () {
    var before = editor.value;
    var after = S.layout === 'kirill' ? before : C.normalizeApostrophes(before);
    if (after === before) { toast('Tuzatiladigan belgi topilmadi', 'info'); return; }
    replaceEditorText(after);
    toast('Tutuq belgilari tuzatildi');
  };
  $('toConverterBtn').onclick = function () {
    $('convIn').value = editor.value;
    switchTab('converter');
    runConvert();
  };
  $('fontMinus').onclick = function () { S.fontSize = Math.max(14, S.fontSize - 2); applyFont(); save(); };
  $('fontPlus').onclick = function () { S.fontSize = Math.min(44, S.fontSize + 2); applyFont(); save(); };
  $('clearBtn').onclick = function () {
    if (!editor.value) return;
    if (confirm('Matnni butunlay oʻchirasizmi?')) replaceEditorText('');
  };
  function applyFont() { editor.style.fontSize = S.fontSize + 'px'; }

  var HINTS = {
    lotin: 'Maslahat: <kbd>\'</kbd> tugmasi o va g dan keyin <b>ʻ</b>, boshqa joyda <b>ʼ</b> qoʻyadi. <kbd>Alt</kbd>+<kbd>O</kbd> → oʻ, <kbd>Alt</kbd>+<kbd>G</kbd> → gʻ. <kbd>Alt</kbd>+<kbd>1/2/3</kbd> — yozuvni almashtirish.',
    kirill: 'Кирилл: <kbd>O</kbd> → ў, <kbd>S</kbd> → қ, <kbd>-</kbd> → ғ, <kbd>=</kbd> → ҳ, <kbd>\\</kbd> → «-». <kbd>Alt</kbd> + tugma — lotin/asl belgi.',
    yangi: 'Yangi alifbo: <kbd>[</kbd> → ğ, <kbd>]</kbd> → ö, <kbd>;</kbd> → ş, <kbd>\'</kbd> → ç, <kbd>`</kbd> → ʼ. sh, ch, o\', g\' yozsangiz avtomatik almashadi.'
  };

  /* ================= MASHQ ================= */
  var kbTrainer = new window.VirtualKeyboard($('kbTrainer'), {
    onKey: function (k) {
      if (k.type === 'char') { clickSound(); trainer.input(k.char); }
      else if (k.name === 'Backspace') trainer.backspace();
      else if (k.name === 'Lang') cycleLayout();
      else if (k.name === 'Enter' && trainer.finished) trainer.restart();
    },
    onSound: clickSound
  });

  var trainer = new window.Trainer({
    textEl: $('typingText'),
    overlay: $('typingOverlay'),
    kb: kbTrainer,
    getLayout: function () { return S.layout; },
    getVariant: function () { return S.variant; },
    stats: {
      time: $('stTime'), timeLabel: $('stTimeLabel'), wpm: $('stWpm'), cpm: $('stCpm'),
      acc: $('stAcc'), err: $('stErr'), progress: $('stProgress')
    },
    onError: errorSound,
    onFinish: onTrainerFinish
  });

  var lessonSel = $('lessonSel');
  window.Trainer.LESSONS.forEach(function (l, i) {
    var o = document.createElement('option');
    o.value = l.id;
    o.textContent = (i + 1) + '. ' + l.name;
    lessonSel.appendChild(o);
  });

  function applyTrainerOptions() {
    var lesson = window.Trainer.LESSONS.filter(function (l) { return l.id === S.lesson; })[0] || window.Trainer.LESSONS[0];
    trainer.lesson = lesson;
    trainer.duration = Number(S.duration);
    trainer.allowBackspace = S.backspace;
    trainer.stopOnError = S.stop;
    trainer.customText = store.get('ya_custom', '');
    lessonSel.value = lesson.id;
    $('durationSel').value = String(S.duration);
    $('optBackspace').checked = S.backspace;
    $('optStop').checked = S.stop;
    $('customWrap').hidden = lesson.kind !== 'custom';
    $('customText').value = trainer.customText;
  }

  lessonSel.onchange = function () { S.lesson = this.value; save(); applyTrainerOptions(); trainer.restart(); focusTyping(); };
  $('durationSel').onchange = function () { S.duration = Number(this.value); save(); applyTrainerOptions(); trainer.restart(); focusTyping(); };
  $('optBackspace').onchange = function () { S.backspace = this.checked; save(); trainer.allowBackspace = S.backspace; focusTyping(); };
  $('optStop').onchange = function () { S.stop = this.checked; save(); trainer.stopOnError = S.stop; focusTyping(); };
  $('restartBtn').onclick = function () { trainer.restart(); focusTyping(); };
  var customTimer;
  $('customText').addEventListener('input', function () {
    var v = this.value;
    clearTimeout(customTimer);
    customTimer = setTimeout(function () {
      store.set('ya_custom', v);
      trainer.customText = v;
      trainer.restart();
    }, 500);
  });
  $('typingBox').addEventListener('click', focusTyping);
  function focusTyping() { $('typingBox').focus({ preventScroll: true }); }

  function handleTrainerKey(e) {
    var t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.tagName === 'INPUT')) return;
    if (e.key === 'Escape') { e.preventDefault(); trainer.restart(); return; }
    if ((e.ctrlKey && !e.altKey) || e.metaKey || e.isComposing) return;
    if (e.code === 'Backspace') { e.preventDefault(); trainer.backspace(); return; }
    if (e.code === 'Enter' && trainer.finished) { e.preventDefault(); trainer.restart(); return; }
    var ch;
    if (S.map) {
      var caps = e.getModifierState ? e.getModifierState('CapsLock') : false;
      ch = L.getChar(S.layout, S.variant, e.code, e.shiftKey, caps, e.altKey);
    } else {
      ch = e.key && e.key.length === 1 ? e.key : null;
    }
    if (ch === null) return;
    e.preventDefault();
    clickSound();
    trainer.input(ch);
  }

  /* --- Natijalar --- */
  var RANKS = [
    [0, 'Boshlangʻich'], [20, 'Havaskor'], [30, 'Oʻrta'],
    [40, 'Yaxshi'], [55, 'Aʼlo'], [70, 'Mohir'], [90, 'Usta']
  ];
  function rankOf(wpm) {
    var r = RANKS[0][1];
    RANKS.forEach(function (x) { if (wpm >= x[0]) r = x[1]; });
    return r;
  }

  function onTrainerFinish(m, errCodes) {
    var hist = store.get('ya_history', []);
    hist.push({ d: m.date, l: m.lesson, y: m.layout, w: m.wpm, a: m.acc, c: m.cpm, e: m.errors, t: Math.round(m.time) });
    if (hist.length > 100) hist = hist.slice(-100);
    store.set('ya_history', hist);

    var heat = store.get('ya_heat', {});
    var h = heat[m.layout] || {};
    Object.keys(errCodes).forEach(function (c) { h[c] = (h[c] || 0) + errCodes[c]; });
    heat[m.layout] = h;
    store.set('ya_heat', heat);

    $('resWpm').textContent = m.wpm;
    $('resAcc').textContent = m.acc + '%';
    $('resCpm').textContent = m.cpm;
    $('resErr').textContent = m.errors;
    $('resTime').textContent = window.Trainer.fmtTime(m.time);
    var best = Math.max.apply(null, hist.map(function (x) { return x.w; }));
    $('resRank').innerHTML = 'Daraja: <b>' + rankOf(m.wpm) + '</b>' +
      (m.wpm >= best && hist.length > 1 ? '<span class="badge ok">Yangi rekord</span>' : '');
    var weak = Object.keys(m.errChars).sort(function (a, b) { return m.errChars[b] - m.errChars[a]; }).slice(0, 5);
    $('resWeak').innerHTML = weak.length
      ? 'Eng koʻp xato qilingan belgilar: ' + weak.map(function (c) {
        return '<kbd>' + (c === ' ' ? '␣' : escapeHtml(c)) + '</kbd>×' + m.errChars[c];
      }).join(' ')
      : 'Mashq xatolarsiz bajarildi.';

    renderHistory();
    applyHeat();
    openModal('resultModal');
  }
  $('resAgain').onclick = function () { closeModals(); trainer.restart(); focusTyping(); };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderHistory() {
    var hist = store.get('ya_history', []);
    var tb = $('historyTable').querySelector('tbody');
    tb.innerHTML = '';
    if (!hist.length) {
      tb.innerHTML = '<tr><td colspan="5" class="muted center">Hali natija yoʻq. Birinchi mashqni boshlang!</td></tr>';
    }
    hist.slice(-12).reverse().forEach(function (x) {
      var d = new Date(x.d);
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) +
        '</td><td>' + escapeHtml(x.l) + '</td><td>' + escapeHtml(L.NAMES[x.y] || x.y) +
        '</td><td><b>' + x.w + '</b></td><td>' + x.a + '%</td>';
      tb.appendChild(tr);
    });
    var ws = hist.map(function (x) { return x.w; });
    $('bestWpm').textContent = ws.length ? Math.max.apply(null, ws) : '—';
    $('avgWpm').textContent = ws.length ? Math.round(ws.reduce(function (a, b) { return a + b; }, 0) / ws.length) : '—';
    $('totalRuns').textContent = hist.length;
    $('rankName').textContent = ws.length ? rankOf(Math.max.apply(null, ws.slice(-5))) : '—';
    drawChart(hist.slice(-30));
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function drawChart(hist) {
    var cv = $('historyChart');
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth || 300;
    var h = 160;
    cv.width = w * dpr; cv.height = h * dpr;
    var g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    var cs = getComputedStyle(document.documentElement);
    var cLine = cs.getPropertyValue('--accent').trim() || '#0f766e';
    var cGrid = cs.getPropertyValue('--border').trim() || '#ddd';
    var cText = cs.getPropertyValue('--muted').trim() || '#888';
    var cAcc = cs.getPropertyValue('--accent-2').trim() || '#f59e0b';
    var pl = 30, pr = 10, pt = 10, pb = 22;
    g.font = '11px system-ui, sans-serif';
    g.fillStyle = cText;
    if (!hist.length) {
      g.textAlign = 'center';
      g.fillText('Mashq natijalari shu yerda grafik koʻrinishida chiqadi', w / 2, h / 2);
      return;
    }
    var max = Math.max(20, Math.max.apply(null, hist.map(function (x) { return x.w; })));
    max = Math.ceil(max / 10) * 10;
    g.strokeStyle = cGrid; g.lineWidth = 1;
    g.textAlign = 'right';
    for (var i = 0; i <= 4; i++) {
      var y = pt + (h - pt - pb) * (i / 4);
      g.beginPath(); g.moveTo(pl, y); g.lineTo(w - pr, y); g.stroke();
      g.fillText(String(Math.round(max * (1 - i / 4))), pl - 5, y + 4);
    }
    var n = hist.length;
    var x = function (i) { return n === 1 ? (pl + w - pr) / 2 : pl + (w - pl - pr) * (i / (n - 1)); };
    var yv = function (v, m) { return pt + (h - pt - pb) * (1 - v / m); };
    // Aniqlik (%) — nuqtali chiziq
    g.strokeStyle = cAcc; g.setLineDash([4, 4]); g.lineWidth = 1.5;
    g.beginPath();
    hist.forEach(function (p, i) { var yy = yv(p.a, 100); if (i) g.lineTo(x(i), yy); else g.moveTo(x(i), yy); });
    g.stroke(); g.setLineDash([]);
    // Tezlik
    g.strokeStyle = cLine; g.lineWidth = 2.5; g.lineJoin = 'round';
    g.beginPath();
    hist.forEach(function (p, i) { var yy = yv(p.w, max); if (i) g.lineTo(x(i), yy); else g.moveTo(x(i), yy); });
    g.stroke();
    g.fillStyle = cLine;
    hist.forEach(function (p, i) { g.beginPath(); g.arc(x(i), yv(p.w, max), 3, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = cText; g.textAlign = 'left';
    g.fillText('— soʻz/daq', pl, h - 6);
    g.fillStyle = cAcc;
    g.fillText('- - aniqlik %', pl + 80, h - 6);
  }
  window.addEventListener('resize', function () { renderHistory(); });

  $('clearHistory').onclick = function () {
    if (confirm('Natijalar tarixini oʻchirasizmi?')) { store.del('ya_history'); renderHistory(); }
  };

  function applyHeat() {
    $('optHeat').checked = S.heat;
    if (S.heat) kbTrainer.setHeat((store.get('ya_heat', {}))[S.layout] || {});
    else kbTrainer.setHeat({});
  }
  $('optHeat').onchange = function () { S.heat = this.checked; save(); applyHeat(); focusTyping(); };
  $('resetHeat').onclick = function () {
    var heat = store.get('ya_heat', {});
    delete heat[S.layout];
    store.set('ya_heat', heat);
    applyHeat();
    toast('Xatolar xaritasi tozalandi');
  };
  $('optTargetHint').onchange = function () {
    S.targetHint = this.checked; save();
    $('kbTrainer').classList.toggle('no-target', !S.targetHint);
    focusTyping();
  };

  /* ================= KONVERTOR ================= */
  var convIn = $('convIn');
  var convOut = $('convOut');
  var convTimer;

  function runConvert() {
    var text = convIn.value;
    var from = $('convFrom').value;
    var to = $('convTo').value;
    var det = '';
    if (from === 'auto') {
      from = C.detect(text);
      det = text ? 'Aniqlandi: ' + L.NAMES[from] : '';
    }
    $('convDetected').textContent = det;
    $('convDetected').hidden = !det;
    convOut.value = C.convert(text, from, to, { variant: S.variant, ascii: S.convAscii });
    $('convInCount').textContent = text.length + ' belgi';
    $('convOutCount').textContent = convOut.value.length + ' belgi';
    if (from === to && text) {
      $('convDetected').textContent = (det ? det + ' · ' : '') + 'yozuvlar bir xil';
      $('convDetected').hidden = false;
    }
  }
  convIn.addEventListener('input', function () {
    clearTimeout(convTimer);
    convTimer = setTimeout(runConvert, convIn.value.length > 20000 ? 250 : 30);
    store.set('ya_conv', convIn.value);
  });
  $('convFrom').onchange = function () { S.convFrom = this.value; save(); runConvert(); };
  $('convTo').onchange = function () { S.convTo = this.value; save(); runConvert(); };
  $('convAscii').onchange = function () { S.convAscii = this.checked; save(); runConvert(); };
  $('swapBtn').onclick = function () {
    var from = $('convFrom').value;
    if (from === 'auto') from = C.detect(convIn.value);
    var to = $('convTo').value;
    $('convFrom').value = to;
    $('convTo').value = from;
    S.convFrom = to; S.convTo = from; save();
    if (convOut.value) { convIn.value = convOut.value; store.set('ya_conv', convIn.value); }
    runConvert();
  };
  $('convCopy').onclick = function () { copyText(convOut.value); };
  $('convDownload').onclick = function () { downloadText(convOut.value, 'natija-' + $('convTo').value + '.txt'); };
  $('convClear').onclick = function () { convIn.value = ''; store.set('ya_conv', ''); runConvert(); convIn.focus(); };
  $('convFile').onchange = function () {
    readFile(this, function (t) { convIn.value = t; store.set('ya_conv', t); runConvert(); toast('Fayl yuklandi'); });
  };
  $('convPaste').onclick = function () {
    if (navigator.clipboard && navigator.clipboard.readText && window.isSecureContext) {
      navigator.clipboard.readText().then(function (t) {
        convIn.value = t; store.set('ya_conv', t); runConvert();
      }, function () { toast('Ruxsat berilmadi — Ctrl+V dan foydalaning', 'error'); convIn.focus(); });
    } else { toast('Ctrl+V bilan joylang', 'info'); convIn.focus(); }
  };
  $('convToEditor').onclick = function () {
    if (!convOut.value) { toast('Natija boʻsh', 'info'); return; }
    var target = $('convTo').value;
    switchTab('editor');
    if (S.layout !== target) setLayout(target);
    replaceEditorText(convOut.value);
    toast('Matn muharrirga oʻtkazildi');
  };

  /* ================= ALIFBO ================= */
  var ALPHA = [
    ['A a', 'Anor'], ['B b', 'Bola'], ['D d', 'Daraxt'], ['E e', 'Eshik'], ['F f', 'Futbol'],
    ['G g', 'Gul'], ['H h', 'Hosil'], ['I i', 'Ilon'], ['J j', "Jo'ja"], ['K k', 'Kitob'],
    ['L l', 'Lola'], ['M m', 'Maktab'], ['N n', 'Non'], ['O o', 'Olma'], ['P p', 'Paxta'],
    ['Q q', 'Qalam'], ['R r', 'Ruchka'], ['S s', 'Suv'], ['T t', "Tog'"], ['U u', 'Uy'],
    ['V v', 'Vatan'], ['X x', 'Xat'], ['Y y', 'Yulduz'], ['Z z', 'Zamin'], ["O' o'", "O'rik"],
    ["G' g'", "G'oz"], ['Sh sh', 'Shamol'], ['Ch ch', 'Choy'], ['ng', 'Tong'], ["'", "Ma'no"]
  ];
  var CYR_ONLY = [
    ['Е е', 'ye / e', 'Ер → Yer, келди → keldi'],
    ['Ё ё', 'yo', 'Ёз → Yoz'],
    ['Ю ю', 'yu', 'Юлдуз → Yulduz'],
    ['Я я', 'ya', 'Янги → Yangi'],
    ['Ц ц', 's / ts', 'Цирк → Sirk, милиция → militsiya'],
    ['Ъ ъ', 'ʼ', 'Маъно → Maʼno'],
    ['Ь ь', '—', 'Мебель → Mebel (yozilmaydi)']
  ];

  function renderAlphabet() {
    var grid = $('alphaGrid');
    grid.innerHTML = '';
    var opts = { variant: S.variant };
    ALPHA.forEach(function (a) {
      var lat = C.normalizeApostrophes(a[0]);
      var word = C.normalizeApostrophes(a[1]);
      var cyr = a[0] === "'" ? 'ъ' : C.latToCyr(lat);
      var nw = C.latToNew(lat, S.variant);
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'alpha-card';
      card.innerHTML =
        '<div class="alpha-main">' + escapeHtml(lat) + '</div>' +
        '<div class="alpha-row"><span class="cyr" title="Kirill">' + escapeHtml(cyr) + '</span><span class="new" title="Yangi alifbo">' + escapeHtml(nw) + '</span></div>' +
        '<div class="alpha-word">' + escapeHtml(word) + '<br><small>' + escapeHtml(C.convert(word, 'lotin', 'kirill')) +
        ' · ' + escapeHtml(C.convert(word, 'lotin', 'yangi', opts)) + '</small></div>';
      card.onclick = function () {
        var forms = { lotin: lat, kirill: cyr, yangi: nw };
        var letter = forms[S.layout].split(' ').pop();
        var pos = editor.value.length;
        editor.focus();
        editor.setSelectionRange(pos, pos);
        insertText(letter);
        editor.blur();
        toast('«' + letter + '» muharrirga qoʻshildi');
      };
      grid.appendChild(card);
    });
    var h = document.createElement('h3');
    h.className = 'alpha-sub';
    h.textContent = 'Faqat kirill yozuvida boʻlgan harflar';
    grid.appendChild(h);
    CYR_ONLY.forEach(function (a) {
      var card = document.createElement('div');
      card.className = 'alpha-card static';
      card.innerHTML = '<div class="alpha-main">' + escapeHtml(a[0]) + '</div><div class="alpha-row"><span>→ ' +
        escapeHtml(a[1]) + '</span></div><div class="alpha-word"><small>' + escapeHtml(a[2]) + '</small></div>';
      grid.appendChild(card);
    });
  }

  /* ================= UMUMIY ================= */
  var LAYOUTS = ['lotin', 'kirill', 'yangi'];

  function setLayout(l) {
    if (LAYOUTS.indexOf(l) < 0) return;
    S.layout = l;
    save();
    document.querySelectorAll('#layoutSeg button').forEach(function (b) {
      var on = b.dataset.layout === l;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    kbEditor.setLayout(l, S.variant);
    kbTrainer.setLayout(l, S.variant);
    $('editorHint').innerHTML = HINTS[l];
    document.documentElement.lang = l === 'kirill' ? 'uz-Cyrl' : 'uz';
    trainer.restart();
    applyHeat();
  }
  function cycleLayout() {
    var l = LAYOUTS[(LAYOUTS.indexOf(S.layout) + 1) % LAYOUTS.length];
    setLayout(l);
    toast('Yozuv: ' + L.NAMES[l]);
  }
  document.querySelectorAll('#layoutSeg button').forEach(function (b) {
    b.onclick = function () { setLayout(b.dataset.layout); if (S.tab === 'trainer') focusTyping(); };
  });

  function switchTab(tab) {
    S.tab = tab;
    save();
    document.querySelectorAll('.tab').forEach(function (b) {
      var on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'tab-' + tab);
    });
    kbEditor.releaseAll();
    kbTrainer.releaseAll();
    if (tab === 'trainer') {
      if (!trainer.text) trainer.restart();
      renderHistory();
      focusTyping();
    }
  }
  document.querySelectorAll('.tab').forEach(function (b) {
    b.onclick = function () { switchTab(b.dataset.tab); };
  });

  /* Global klaviatura hodisalari */
  document.addEventListener('keydown', function (e) {
    if (modalOpen()) {
      if (e.key === 'Escape') closeModals();
      return;
    }
    if (e.key === 'Alt') e.preventDefault(); // brauzer menyusi ochilmasligi uchun
    if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[123]$/.test(e.code)) {
      e.preventDefault();
      setLayout(LAYOUTS[Number(e.code.slice(5)) - 1]);
      toast('Yozuv: ' + L.NAMES[S.layout]);
      return;
    }
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyC' && S.tab === 'editor') {
      e.preventDefault();
      copyText(editor.value);
      return;
    }
    var kb = S.tab === 'editor' ? kbEditor : S.tab === 'trainer' ? kbTrainer : null;
    if (kb) kb.physicalDown(e);
    if (S.tab === 'trainer') handleTrainerKey(e);
    else if (S.tab === 'editor' && document.activeElement === editor) handleEditorKey(e);
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'Alt') e.preventDefault();
    var kb = S.tab === 'editor' ? kbEditor : S.tab === 'trainer' ? kbTrainer : null;
    if (kb) kb.physicalUp(e);
  });
  window.addEventListener('blur', function () { kbEditor.releaseAll(); kbTrainer.releaseAll(); });

  /* Sozlamalar */
  function effectiveDark() {
    if (S.theme) return S.theme === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applySettings() {
    if (S.theme) document.documentElement.setAttribute('data-theme', S.theme);
    else document.documentElement.removeAttribute('data-theme');
    $('themeBtn').innerHTML = window.uzIcon(effectiveDark() ? 'sun' : 'moon');
    $('soundBtn').innerHTML = window.uzIcon(S.sound ? 'volume' : 'volume-off');
    $('kbEditor').classList.toggle('fingers', S.fingers);
    $('kbTrainer').classList.toggle('fingers', S.fingers);
    $('kbTrainer').classList.toggle('no-target', !S.targetHint);
    $('optTargetHint').checked = S.targetHint;
    if (S.noSysKb) editor.setAttribute('inputmode', 'none');
    else editor.removeAttribute('inputmode');
    applyFont();

    $('setVariant').value = S.variant;
    $('setAuto').checked = S.auto;
    $('setSmart').checked = S.smart;
    $('setMap').checked = S.map;
    $('setFingers').checked = S.fingers;
    $('setNoSysKb').checked = S.noSysKb;
    $('setErrSound').checked = S.errSound;
    $('setTheme').value = S.theme;
    $('convFrom').value = S.convFrom;
    $('convTo').value = S.convTo;
    $('convAscii').checked = S.convAscii;
  }

  $('soundBtn').onclick = function () { S.sound = !S.sound; save(); applySettings(); toast(S.sound ? 'Tugma ovozi yoqildi' : 'Tugma ovozi oʻchirildi', 'info'); };
  $('themeBtn').onclick = function () {
    S.theme = effectiveDark() ? 'light' : 'dark';
    save(); applySettings(); renderHistory();
  };
  $('settingsBtn').onclick = function () { openModal('settingsModal'); };
  $('helpBtn').onclick = function () { openModal('helpModal'); };

  function bindSetting(id, key, after) {
    $(id).onchange = function () {
      S[key] = this.type === 'checkbox' ? this.checked : this.value;
      save();
      applySettings();
      if (after) after();
    };
  }
  bindSetting('setVariant', 'variant', function () { setLayout(S.layout); renderAlphabet(); runConvert(); });
  bindSetting('setAuto', 'auto');
  bindSetting('setSmart', 'smart');
  bindSetting('setMap', 'map');
  bindSetting('setFingers', 'fingers');
  bindSetting('setNoSysKb', 'noSysKb');
  bindSetting('setErrSound', 'errSound');
  bindSetting('setTheme', 'theme', renderHistory);
  $('resetAll').onclick = function () {
    if (!confirm('Barcha sozlamalar, matnlar va natijalar oʻchiriladi. Davom etasizmi?')) return;
    ['ya_settings', 'ya_text', 'ya_history', 'ya_heat', 'ya_custom', 'ya_conv'].forEach(store.del);
    location.reload();
  };
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onMq = function () { if (!S.theme) { applySettings(); renderHistory(); } };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  /* ---------------- Ishga tushirish ---------------- */
  $('year').textContent = new Date().getFullYear();
  editor.value = store.get('ya_text', '');
  convIn.value = store.get('ya_conv', '');
  updateCounters();
  applySettings();
  applyTrainerOptions();
  setLayout(S.layout);
  renderAlphabet();
  runConvert();
  renderHistory();
  // Sayt har doim birinchi boʻlim — Konvertor bilan ochiladi
  switchTab('converter');
  if (!isTouch) convIn.focus();
})();
