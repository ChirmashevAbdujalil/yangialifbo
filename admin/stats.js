/*
 * Yangi Alifbo — reklama statistikasi (admin panel).
 * Ma'lumot save.php?action=stats dan olinadi: { ads: { id: { "YYYY-MM-DD": [ko'rish, bosish] } }, names }
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var SVG = 'http://www.w3.org/2000/svg';
  var MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

  var raw = null;        // serverdan kelgan ma'lumot
  var loading = null;
  var metric = 'v';      // grafik: 'v' ko'rishlar | 'c' bosishlar
  var points = [];       // grafik nuqtalari

  /* ---------------- Yordamchilar ---------------- */
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function axisFmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M';
    if (n >= 1e4) return Math.round(n / 1e3) + 'K';
    return fmt(n);
  }
  function ctr(v, c) { return v ? (c / v * 100).toFixed(c / v >= 0.1 ? 1 : 2).replace('.', ',') + '%' : '—'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseDay(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayLabel(s) { var d = parseDay(s); return d.getDate() + '-' + MONTHS[d.getMonth()]; }
  function monthLabel(s) { var d = parseDay(s + '-01'); return MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function admin() { return window.YaAdmin; }

  function load() {
    if (loading) return loading;
    loading = admin().api('stats').then(function (j) {
      raw = j;
      loading = null;
      return j;
    }, function (e) { loading = null; throw e; });
    return loading;
  }

  /* Tanlangan davr kunlari (eskidan yangiga) */
  function periodDays(n, today) {
    var end = parseDay(today);
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(end);
      d.setDate(end.getDate() - i);
      out.push(dayKey(d));
    }
    return out;
  }

  function adIds() {
    var ids = {};
    admin().ads().forEach(function (a) { ids[a.id] = true; });
    Object.keys(raw.ads || {}).forEach(function (id) { ids[id] = true; });
    return Object.keys(ids);
  }

  function adName(id) {
    var a = admin().ads().filter(function (x) { return x.id === id; })[0];
    if (a) return a.name || 'Nomsiz reklama';
    return (raw.names && raw.names[id]) || id;
  }

  function sumFor(id, days) {
    var rec = (raw.ads && raw.ads[id]) || {};
    var v = 0, c = 0;
    days.forEach(function (d) { var r = rec[d]; if (r) { v += +r[0] || 0; c += +r[1] || 0; } });
    return { v: v, c: c };
  }

  /* ---------------- Hisob-kitob ---------------- */
  function compute() {
    var n = +$('stPeriod').value;
    var days = periodDays(n, raw.today);
    var only = $('stAd').value;
    var ids = only ? [only] : adIds();

    // Kunlik yig'indi
    var daily = days.map(function (d) {
      var v = 0, c = 0;
      ids.forEach(function (id) {
        var r = raw.ads && raw.ads[id] && raw.ads[id][d];
        if (r) { v += +r[0] || 0; c += +r[1] || 0; }
      });
      return { key: d, v: v, c: c };
    });

    // 90 kundan uzun davr — oylar bo'yicha guruhlash
    if (n > 90) {
      var months = {};
      var order = [];
      daily.forEach(function (p) {
        var m = p.key.slice(0, 7);
        if (!months[m]) { months[m] = { key: m, v: 0, c: 0, month: true }; order.push(m); }
        months[m].v += p.v; months[m].c += p.c;
      });
      points = order.map(function (m) { return months[m]; });
    } else {
      points = daily;
    }

    var total = daily.reduce(function (s, p) { return { v: s.v + p.v, c: s.c + p.c }; }, { v: 0, c: 0 });
    var today = daily[daily.length - 1];
    return { days: days, ids: ids, total: total, today: today };
  }

  /* ---------------- Chizish ---------------- */
  function render() {
    if (!raw) return;
    var r = compute();
    $('tViews').textContent = fmt(r.total.v);
    $('tClicks').textContent = fmt(r.total.c);
    $('tCtr').textContent = ctr(r.total.v, r.total.c);
    $('tToday').textContent = fmt(r.today.v);
    $('tTodaySub').textContent = 'koʻrish · ' + fmt(r.today.c) + ' bosish';
    var per = $('stPeriod').options[$('stPeriod').selectedIndex].text.toLowerCase();
    $('tViewsSub').textContent = per;
    $('tClicksSub').textContent = per;
    $('chartTitle').textContent = (points.length && points[0].month ? 'Oylik ' : 'Kunlik ') + (metric === 'v' ? 'koʻrishlar' : 'bosishlar');
    drawChart();
    renderDayTable();
    renderAdTable(r.days);
  }

  /* Y o'qi uchun "chiroyli" yuqori chegara: 4 ta teng, butun sonli qadam */
  function niceMax(m) {
    var step = m / 4;
    var p = Math.pow(10, Math.floor(Math.log10(step)));
    var mult = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < mult.length; i++) {
      if (mult[i] * p >= step) return Math.max(1, Math.ceil(mult[i] * p)) * 4;
    }
    return Math.ceil(m);
  }

  function drawChart() {
    var host = $('statsChart');
    host.innerHTML = '';
    var vals = points.map(function (p) { return p[metric]; });
    var maxVal = Math.max.apply(null, vals.concat([0]));
    if (!maxVal) {
      host.appendChild(el('div', 'chart-empty', 'Bu davrda ' + (metric === 'v' ? 'koʻrishlar' : 'bosishlar') + ' hali qayd etilmagan'));
      return;
    }
    var W = Math.max(280, host.clientWidth);
    var H = 240, pl = 44, pr = 12, pt = 14, pb = 28;
    var max = niceMax(maxVal);
    var iw = W - pl - pr, ih = H - pt - pb;
    var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': $('chartTitle').textContent });

    // To'r chiziqlari va Y o'qi
    for (var i = 0; i <= 4; i++) {
      var val = max * i / 4;
      var y = pt + ih - ih * i / 4;
      s.appendChild(svg('line', { x1: pl, x2: W - pr, y1: y, y2: y, class: i ? 'grid' : 'baseline' }));
      var t = svg('text', { x: pl - 8, y: y + 4, class: 'tick', 'text-anchor': 'end' });
      t.textContent = axisFmt(val);
      s.appendChild(t);
    }

    var n = points.length;
    var slot = iw / n;
    var bw = Math.max(2, Math.min(24, slot - 2));
    var every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));
    var bars = [];
    var base = pt + ih;

    points.forEach(function (p, k) {
      var v = p[metric];
      var h = v ? Math.max(2, ih * v / max) : 0;
      var x0 = pl + slot * k + (slot - bw) / 2;
      var x1 = x0 + bw;
      var top = base - h;
      if (h) {
        var r = Math.min(4, bw / 2, h);
        var d = 'M' + x0 + ',' + base + 'V' + (top + r) + 'Q' + x0 + ',' + top + ' ' + (x0 + r) + ',' + top +
          'H' + (x1 - r) + 'Q' + x1 + ',' + top + ' ' + x1 + ',' + (top + r) + 'V' + base + 'Z';
        var bar = svg('path', { d: d, class: 'bar' });
        s.appendChild(bar);
        bars[k] = bar;
      }
      if (k % every === 0 || k === n - 1 && n <= 14) {
        var lx = svg('text', { x: pl + slot * k + slot / 2, y: H - 8, class: 'tick', 'text-anchor': 'middle' });
        lx.textContent = p.month ? monthLabel(p.key) : dayLabel(p.key);
        s.appendChild(lx);
      }
    });

    // Sichqoncha / klaviatura bilan ko'rish uchun kengroq maydonlar
    var tip = el('div', 'chart-tip');
    tip.hidden = true;
    points.forEach(function (p, k) {
      var hit = svg('rect', { x: pl + slot * k, y: pt, width: slot, height: ih, class: 'hit' });
      if (n <= 31) hit.setAttribute('tabindex', '0');
      hit.setAttribute('aria-label', (p.month ? monthLabel(p.key) : dayLabel(p.key)) + ': ' + p.v + ' koʻrish, ' + p.c + ' bosish');
      var show = function () {
        bars.forEach(function (b) { if (b) b.classList.remove('active'); });
        if (bars[k]) bars[k].classList.add('active');
        tip.innerHTML = '';
        tip.appendChild(el('span', 'tip-date', p.month ? monthLabel(p.key) : dayLabel(p.key) + ' ' + p.key.slice(0, 4)));
        var main = el('div', 'tip-main');
        main.appendChild(el('b', '', fmt(p[metric])));
        main.appendChild(document.createTextNode(metric === 'v' ? ' koʻrish' : ' bosish'));
        tip.appendChild(main);
        tip.appendChild(el('span', 'tip-sub', metric === 'v'
          ? fmt(p.c) + ' bosish · CTR ' + ctr(p.v, p.c)
          : fmt(p.v) + ' koʻrish · CTR ' + ctr(p.v, p.c)));
        tip.hidden = false;
        var cx = pl + slot * k + slot / 2;
        var tw = tip.offsetWidth || 150;
        tip.style.left = Math.min(Math.max(4, cx - tw / 2), W - tw - 4) + 'px';
        tip.style.top = '4px';
      };
      var hide = function () {
        tip.hidden = true;
        if (bars[k]) bars[k].classList.remove('active');
      };
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('pointermove', show);
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', show);
      hit.addEventListener('blur', hide);
      s.appendChild(hit);
    });

    host.appendChild(s);
    host.appendChild(tip);
  }

  function renderDayTable() {
    var tb = $('dayRows');
    tb.innerHTML = '';
    points.slice().reverse().forEach(function (p) {
      var tr = el('tr');
      tr.appendChild(el('td', '', p.month ? monthLabel(p.key) : p.key.split('-').reverse().join('.')));
      tr.appendChild(el('td', 'num', fmt(p.v)));
      tr.appendChild(el('td', 'num', fmt(p.c)));
      tr.appendChild(el('td', 'num', ctr(p.v, p.c)));
      tb.appendChild(tr);
    });
  }

  function renderAdTable(days) {
    var tb = $('adRows');
    tb.innerHTML = '';
    var only = $('stAd').value;
    var rows = adIds().filter(function (id) { return !only || id === only; }).map(function (id) {
      var s = sumFor(id, days);
      return { id: id, v: s.v, c: s.c };
    }).sort(function (a, b) { return b.v - a.v || b.c - a.c; });
    var maxV = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1]));
    if (!rows.length) {
      var tr0 = el('tr');
      var td0 = el('td', 'muted center', 'Hali reklama yoʻq');
      td0.colSpan = 5;
      tr0.appendChild(td0);
      tb.appendChild(tr0);
      return;
    }
    var current = {};
    admin().ads().forEach(function (a) { current[a.id] = a; });
    rows.forEach(function (r) {
      var tr = el('tr');
      var name = el('td', 'ad-name-cell');
      name.appendChild(el('b', '', adName(r.id)));
      var ad = current[r.id];
      if (ad) {
        var st = admin().status(ad);
        var badge = el('span', 'status st-' + st[1], st[0]);
        name.appendChild(badge);
      } else {
        name.appendChild(el('span', 'status st-off', 'Oʻchirib tashlangan'));
      }
      tr.appendChild(name);
      var vtd = el('td', 'num bar-cell');
      var barWrap = el('span', 'inline-bar');
      var fill = el('i');
      fill.style.width = (r.v / maxV * 100).toFixed(1) + '%';
      barWrap.appendChild(fill);
      vtd.appendChild(barWrap);
      vtd.appendChild(el('span', '', fmt(r.v)));
      tr.appendChild(vtd);
      tr.appendChild(el('td', 'num', fmt(r.c)));
      tr.appendChild(el('td', 'num', ctr(r.v, r.c)));
      var act = el('td', 'num');
      var btn = el('button', 'btn small ghost');
      btn.type = 'button';
      btn.title = 'Shu reklama statistikasini tozalash';
      btn.setAttribute('aria-label', 'Statistikani tozalash: ' + adName(r.id));
      btn.innerHTML = '<svg class="i"><use href="#i-trash"/></svg>';
      btn.onclick = function () { reset(r.id); };
      act.appendChild(btn);
      tr.appendChild(act);
      tb.appendChild(tr);
    });
  }

  /* ---------------- Amallar ---------------- */
  function reset(id) {
    var msg = id
      ? '«' + adName(id) + '» reklamasining butun statistikasi oʻchirilsinmi?'
      : 'Barcha reklamalarning butun statistikasi oʻchirilsinmi? Bu amalni qaytarib boʻlmaydi.';
    if (!confirm(msg)) return;
    var body = new URLSearchParams();
    if (id) body.set('id', id);
    admin().api('stats_reset', { method: 'POST', body: body }).then(function () {
      admin().toast('Statistika tozalandi');
      refresh();
    }, function () { admin().toast('Statistikani tozalab boʻlmadi', 'error'); });
  }

  function exportCsv() {
    if (!raw) return;
    var r = compute();
    var lines = ['Sana;Reklama;Koʻrishlar;Bosishlar;CTR'];
    r.days.forEach(function (d) {
      r.ids.forEach(function (id) {
        var rec = raw.ads && raw.ads[id] && raw.ads[id][d];
        if (!rec) return;
        var name = '"' + adName(id).replace(/"/g, '""') + '"';
        lines.push([d, name, rec[0], rec[1], ctr(rec[0], rec[1])].join(';'));
      });
    });
    var blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reklama-statistika_' + r.days[0] + '_' + r.days[r.days.length - 1] + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function fillAdSelect() {
    var sel = $('stAd');
    var keep = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    adIds().forEach(function (id) {
      var o = document.createElement('option');
      o.value = id;
      o.textContent = adName(id);
      sel.appendChild(o);
    });
    sel.value = keep;
    if (sel.value !== keep) sel.value = '';
  }

  function refresh() {
    return load().then(function () {
      fillAdSelect();
      render();
      if (admin().refreshList) admin().refreshList();
    }, function (e) {
      if (e && e.status === 401) admin().toast('Sessiya tugagan — qayta kiring', 'error');
      else admin().toast('Statistikani yuklab boʻlmadi', 'error');
    });
  }

  function show() {
    var server = admin().mode() === 'server';
    $('statsStatic').hidden = server;
    $('statsMain').hidden = !server;
    if (server) refresh();
  }

  /* Ro'yxat uchun: oxirgi 30 kun yig'indisi */
  function summary(id) {
    if (!raw) return null;
    var s = sumFor(id, periodDays(30, raw.today));
    return { v: fmt(s.v), c: fmt(s.c) };
  }

  $('stPeriod').addEventListener('change', render);
  $('stAd').addEventListener('change', render);
  $('stRefresh').addEventListener('click', refresh);
  $('stCsv').addEventListener('click', exportCsv);
  $('stResetAll').addEventListener('click', function () { reset(''); });
  document.querySelectorAll('#stMetric button').forEach(function (b) {
    b.addEventListener('click', function () {
      metric = b.dataset.metric;
      document.querySelectorAll('#stMetric button').forEach(function (x) {
        x.classList.toggle('active', x === b);
        x.setAttribute('aria-checked', x === b ? 'true' : 'false');
      });
      render();
    });
  });
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (raw && !$('statsView').hidden) drawChart(); }, 150);
  });

  window.YaStats = { show: show, load: load, summary: summary };
})();
