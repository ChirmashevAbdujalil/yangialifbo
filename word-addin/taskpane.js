/*
 * Yangi Alifbo — Microsoft Word qo'shimchasi (panel).
 *
 * Ishlash tamoyili: har bir paragraf (yoki belgilangan qism) Word'dan OOXML ko'rinishida olinadi,
 * saytdagi konvertor (js/converter.js + js/docx.js) faqat matn bo'laklarini (w:t) almashtiradi,
 * so'ng o'sha joyga qaytarib qo'yiladi. Shu sababli shrift, qalin/kursiv, rang va boshqa
 * formatlash o'zgarmaydi. Talab: WordApi 1.3 (Word 2016 va yangilari, Microsoft 365, Word Online).
 */
(function () {
  'use strict';

  var X = window.UzDocx;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'ya_word_addin';
  var CHUNK = 25; // bir so'rovda qayta ishlanadigan paragraflar soni

  var S = { from: 'auto', to: 'yangi', variant: 'A', ascii: false };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '{}'); for (var k in saved) S[k] = saved[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function UserError(msg) { this.message = msg; this.user = true; }

  /* ---------------- Holat xabarlari ---------------- */
  function status(msg, kind) {
    var el = $('status');
    var icon = kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'check';
    el.className = 'pane-status' + (kind ? ' ' + kind : '');
    el.innerHTML = '<svg class="i"><use href="#i-' + icon + '"/></svg><span></span>';
    el.lastChild.textContent = msg;
    el.hidden = false;
  }
  function progress(done, total) {
    $('progress').hidden = !total;
    $('progressBar').style.width = total ? Math.round(done / total * 100) + '%' : '0';
  }
  function busy(on) {
    ['doSelection', 'doDocument', 'doApos'].forEach(function (id) { $(id).disabled = on; });
    if (!on) progress(0, 0);
  }

  /* ---------------- O'girish ---------------- */
  function makeMapper(kind) {
    if (kind === 'apos') return X.apostropheMapper;
    return X.mapper(S.from, S.to, { variant: S.variant, ascii: S.ascii });
  }

  function willChange(text, mapFn) {
    if (!text) return false;
    return mapFn(text).o.join('') !== text;
  }

  /* O'zgaradigan oraliqlarni qismlarga bo'lib qayta ishlash */
  function processRanges(ctx, ranges, mapFn) {
    var todo = ranges.filter(function (r) { return !r.isNullObject && willChange(r.text, mapFn); });
    if (!todo.length) return Promise.resolve({ total: 0, changed: 0 });
    var changed = 0;
    var i = 0;
    progress(0, todo.length);
    function next() {
      if (i >= todo.length) return Promise.resolve({ total: todo.length, changed: changed });
      var chunk = todo.slice(i, i + CHUNK);
      var ox = chunk.map(function (r) { return r.getOoxml(); });
      return ctx.sync().then(function () {
        chunk.forEach(function (r, j) {
          var t = X.transformXml(ox[j].value, mapFn);
          if (t.changed) { r.insertOoxml(t.xml, 'Replace'); changed++; }
        });
        return ctx.sync();
      }).then(function () {
        i += CHUNK;
        progress(Math.min(i, todo.length), todo.length);
        return next();
      });
    }
    return next();
  }

  /* Belgilangan qism: har bir paragrafning belgilangan bo'lagi alohida qayta ishlanadi */
  function runSelection(kind) {
    var mapFn = makeMapper(kind);
    return Word.run(function (ctx) {
      var sel = ctx.document.getSelection();
      sel.load('text,isEmpty');
      var paras = sel.paragraphs;
      paras.load('items');
      return ctx.sync().then(function () {
        if (sel.isEmpty || !String(sel.text || '').trim()) throw new UserError('Avval oʻgiriladigan matnni belgilang.');
        var ranges = paras.items.map(function (p) { return p.getRange('Content').intersectWithOrNullObject(sel); });
        ranges.forEach(function (r) { r.load('text,isNullObject'); });
        return ctx.sync().then(function () { return processRanges(ctx, ranges, mapFn); });
      });
    });
  }

  /* Butun hujjat: asosiy matn (jadvallar bilan) va barcha kolontitullar */
  function runDocument(kind) {
    var mapFn = makeMapper(kind);
    return Word.run(function (ctx) {
      var bodies = [ctx.document.body];
      var sections = ctx.document.sections;
      sections.load('items');
      return ctx.sync().then(function () {
        sections.items.forEach(function (sec) {
          ['Primary', 'FirstPage', 'EvenPages'].forEach(function (type) {
            bodies.push(sec.getHeader(type));
            bodies.push(sec.getFooter(type));
          });
        });
        var lists = bodies.map(function (b) { var ps = b.paragraphs; ps.load('items'); return ps; });
        return ctx.sync().then(function () {
          var ranges = [];
          lists.forEach(function (ps) { ps.items.forEach(function (p) { ranges.push(p.getRange('Content')); }); });
          ranges.forEach(function (r) { r.load('text,isNullObject'); });
          return ctx.sync().then(function () { return processRanges(ctx, ranges, mapFn); });
        });
      });
    });
  }

  function start(scope, kind) {
    busy(true);
    status(scope === 'document' ? 'Hujjat oʻgirilmoqda…' : 'Oʻgirilmoqda…', 'info');
    var job = scope === 'document' ? runDocument(kind) : runSelection(kind);
    job.then(function (r) {
      if (!r.total) {
        status(kind === 'apos' ? 'Tuzatiladigan tutuq belgisi topilmadi.' : 'Oʻgiriladigan matn topilmadi — matn allaqachon tanlangan yozuvda.', 'info');
      } else {
        status((kind === 'apos' ? 'Tutuq belgilari tuzatildi' : 'Tayyor') + ': ' + r.changed + ' ta paragraf. Bekor qilish uchun Ctrl+Z.');
      }
    }, function (err) {
      if (err && err.user) status(err.message, 'error');
      else status('Xatolik yuz berdi: ' + ((err && (err.message || err.code)) || 'nomaʼlum') + '. Hujjat oʻzgartirilmagan boʻlishi mumkin — Ctrl+Z bilan tekshiring.', 'error');
      if (window.console) console.error(err);
    }).then(function () { busy(false); });
  }

  /* ---------------- Interfeys ---------------- */
  function bind() {
    $('from').value = S.from;
    $('to').value = S.to;
    $('variant').value = S.variant;
    $('ascii').checked = !!S.ascii;
    $('from').onchange = function () { S.from = this.value; save(); };
    $('to').onchange = function () { S.to = this.value; save(); };
    $('variant').onchange = function () { S.variant = this.value; save(); };
    $('ascii').onchange = function () { S.ascii = this.checked; save(); };
    $('swap').onclick = function () {
      var f = S.from === 'auto' ? (S.to === 'kirill' ? 'lotin' : 'kirill') : S.from;
      S.from = S.to; S.to = f;
      $('from').value = S.from; $('to').value = S.to;
      save();
    };
    $('doSelection').onclick = function () { start('selection', 'convert'); };
    $('doDocument').onclick = function () { start('document', 'convert'); };
    $('doApos').onclick = function () { start('document', 'apos'); };
  }

  function showOutside() {
    $('outside').hidden = false;
    $('app').hidden = true;
  }

  if (typeof Office === 'undefined') {
    showOutside();
    return;
  }
  Office.onReady(function (info) {
    if (!info || info.host !== Office.HostType.Word) { showOutside(); return; }
    $('app').hidden = false;
    bind();
    if (!Office.context.requirements.isSetSupported('WordApi', '1.3')) {
      busy(true);
      status('Word versiyangiz eski. Qoʻshimcha Word 2016 va undan yangi versiyalarda, Microsoft 365 yoki Word Online’da ishlaydi.', 'error');
    }
  });
})();
