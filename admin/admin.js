/*
 * Yangi Alifbo — reklama boshqaruv paneli.
 *
 * Ikki rejim:
 *  1) Server rejimi — hosting PHP'ni qo'llasa (save.php ishlasa): parol bilan kirish,
 *     o'zgarishlar bevosita saytdagi ads.json fayliga saqlanadi, rasmlar serverga yuklanadi.
 *  2) Statik rejim — PHP bo'lmasa (Netlify, GitHub Pages): panel ads.json faylini tayyorlab beradi,
 *     uni sayt papkasiga yuklash kifoya.
 */
(function () {
  'use strict';

  var A = window.UzAds;
  var $ = function (id) { return document.getElementById(id); };
  var API = 'save.php';
  var DRAFT_KEY = 'ya_admin_draft';
  var MAX_EMBED = 400 * 1024; // statik rejimda faylga joylanadigan rasm hajmi chegarasi

  var mode = 'static';      // 'server' | 'static'
  var csrf = null;
  var data = { version: 1, ads: [] };
  var savedJson = '';       // oxirgi saqlangan holat (o'zgarishlarni aniqlash uchun)
  var selectedId = null;
  var previewMode = 'desktop';

  /* ---------------- Yordamchilar ---------------- */
  var toastTimer;
  function toast(msg, kind) {
    var t = $('toast');
    t.className = 'toast' + (kind === 'error' ? ' error' : '');
    t.innerHTML = '<svg class="i"><use href="#i-' + (kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'check') + '"/></svg><span></span>';
    t.lastChild.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function uid() { return 'ad_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

  function newAd() {
    return {
      id: uid(), name: 'Yangi reklama', enabled: true, slot: 'top', pages: ['all'], device: 'all',
      start: '', end: '', closable: true, type: 'image',
      image: '', imageMobile: '', alt: '', link: '', title: '', text: '', button: '', html: ''
    };
  }
  function normalize(d) {
    var out = { version: 1, ads: [] };
    if (d && Array.isArray(d.ads)) {
      out.ads = d.ads.filter(function (a) { return a && typeof a === 'object'; }).map(function (a) {
        var n = newAd();
        Object.keys(n).forEach(function (k) { if (a[k] !== undefined) n[k] = a[k]; });
        if (!n.id) n.id = uid();
        if (!A.SLOTS[n.slot]) n.slot = 'top';
        if (!A.TYPES[n.type]) n.type = 'image';
        if (!Array.isArray(n.pages) || !n.pages.length) n.pages = ['all'];
        n.enabled = !!n.enabled; n.closable = !!n.closable;
        return n;
      });
    }
    return out;
  }
  function json() { return JSON.stringify(data, null, 2); }
  function current() { return data.ads.filter(function (a) { return a.id === selectedId; })[0] || null; }

  function api(action, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    if (csrf) headers['X-CSRF-Token'] = csrf;
    return fetch(API + '?action=' + action, {
      method: opts.method || 'GET', body: opts.body, headers: headers,
      credentials: 'same-origin', cache: 'no-store'
    }).then(function (r) {
      return r.text().then(function (t) {
        var j;
        try { j = JSON.parse(t); } catch (e) { throw new Error('not-json'); }
        if (!r.ok || !j.ok) { var err = new Error(j.error || 'error'); err.status = r.status; throw err; }
        return j;
      });
    });
  }

  /* ---------------- Holat va saqlash ---------------- */
  function isDirty() { return json() !== savedJson; }
  function changed() {
    store(DRAFT_KEY, { data: data, base: savedJson, t: Date.now() });
    updateSaveState();
    renderList();
    renderPreview();
  }
  function updateSaveState() {
    var el = $('saveState');
    var dirty = isDirty();
    el.className = 'save-state' + (dirty ? ' dirty' : '');
    if (mode === 'server') {
      el.innerHTML = dirty
        ? '<svg class="i"><use href="#i-alert"/></svg>Saqlanmagan oʻzgarishlar bor'
        : '<svg class="i"><use href="#i-check"/></svg>Barcha oʻzgarishlar saytga saqlangan';
    } else {
      el.innerHTML = dirty
        ? '<svg class="i"><use href="#i-alert"/></svg>Oʻzgarishlar bor — ads.json faylini yuklab olib, saytga joylang'
        : '<svg class="i"><use href="#i-check"/></svg>Oʻzgarishlar yoʻq';
    }
    $('saveBtn').disabled = !dirty;
  }

  function setData(d, asSaved) {
    data = normalize(d);
    if (asSaved) savedJson = json();
    if (!data.ads.some(function (a) { return a.id === selectedId; })) selectedId = data.ads.length ? data.ads[0].id : null;
    renderAll();
  }

  /* ---------------- Ro'yxat ---------------- */
  var STATUS = {
    active: ['Faol', 'ok'], disabled: ['Oʻchirilgan', 'off'], scheduled: ['Rejalashtirilgan', 'wait'],
    expired: ['Muddati tugagan', 'off'], incomplete: ['Toʻldirilmagan', 'warn']
  };
  var TYPE_ICON = { image: 'image', text: 'text', html: 'code' };

  function pagesText(ad) {
    if (!ad.pages || ad.pages.indexOf('all') >= 0) return 'Barcha boʻlimlar';
    return ad.pages.map(function (p) { return A.PAGES[p]; }).filter(Boolean).join(', ') || '—';
  }

  function renderList() {
    var ul = $('adList');
    ul.innerHTML = '';
    if (!data.ads.length) {
      var li = document.createElement('li');
      li.className = 'ad-list-empty';
      li.textContent = 'Hozircha reklama yoʻq. Saytda reklama joylari koʻrinmaydi.';
      ul.appendChild(li);
      return;
    }
    data.ads.forEach(function (ad) {
      var st = STATUS[A.status(ad)];
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ad-item' + (ad.id === selectedId ? ' selected' : '');
      b.innerHTML = '<span class="ad-item-icon"><svg class="i"><use href="#i-' + TYPE_ICON[ad.type] + '"/></svg></span>' +
        '<span class="ad-item-body"><b></b><small></small></span><span class="status"></span>';
      b.querySelector('b').textContent = ad.name || 'Nomsiz reklama';
      var sum = window.YaStats && window.YaStats.summary(ad.id);
      b.querySelector('small').textContent = (ad.slot === 'top' ? 'Tepada' : 'Pastda') + ' · ' + pagesText(ad) +
        (sum ? ' · 30 kun: ' + sum.v + ' koʻrish, ' + sum.c + ' bosish' : '');
      var s = b.querySelector('.status');
      s.textContent = st[0];
      s.classList.add('st-' + st[1]);
      b.onclick = function () { selectedId = ad.id; renderAll(); };
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  /* ---------------- Forma ---------------- */
  var F = ['name', 'image', 'imageMobile', 'alt', 'link', 'title', 'text', 'button', 'html', 'start', 'end', 'device'];

  function fillForm() {
    var ad = current();
    $('emptyState').hidden = !!ad;
    $('adForm').hidden = !ad;
    $('previewCard').hidden = !ad;
    if (!ad) return;
    $('formTitle').textContent = ad.name || 'Nomsiz reklama';
    F.forEach(function (k) { $('f-' + k).value = ad[k] || (k === 'device' ? 'all' : ''); });
    $('f-enabled').checked = ad.enabled;
    $('f-closable').checked = ad.closable;
    document.querySelectorAll('#f-slot input').forEach(function (r) { r.checked = r.value === ad.slot; });
    document.querySelectorAll('#f-pages input').forEach(function (c) { c.checked = ad.pages.indexOf(c.value) >= 0; });
    syncPages();
    showType(ad.type);
  }

  function showType(type) {
    document.querySelectorAll('#f-type button').forEach(function (b) {
      var on = b.dataset.type === type;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    document.querySelectorAll('.type-pane').forEach(function (p) {
      var pane = p.dataset.pane;
      p.hidden = !(pane === type || (pane === 'link' && type !== 'html'));
    });
  }

  function syncPages() {
    var all = document.querySelector('#f-pages input[value="all"]');
    document.querySelectorAll('#f-pages input:not([value="all"])').forEach(function (c) {
      c.disabled = all.checked;
      c.parentNode.classList.toggle('disabled', all.checked);
    });
  }

  function bindForm() {
    F.forEach(function (k) {
      $('f-' + k).addEventListener('input', function () {
        var ad = current(); if (!ad) return;
        ad[k] = this.value;
        if (k === 'name') $('formTitle').textContent = ad.name || 'Nomsiz reklama';
        changed();
      });
    });
    $('f-device').addEventListener('change', function () { var ad = current(); if (ad) { ad.device = this.value; changed(); } });
    $('f-enabled').addEventListener('change', function () { var ad = current(); if (ad) { ad.enabled = this.checked; changed(); } });
    $('f-closable').addEventListener('change', function () { var ad = current(); if (ad) { ad.closable = this.checked; changed(); } });
    document.querySelectorAll('#f-slot input').forEach(function (r) {
      r.addEventListener('change', function () { var ad = current(); if (ad && this.checked) { ad.slot = this.value; changed(); } });
    });
    document.querySelectorAll('#f-pages input').forEach(function (c) {
      c.addEventListener('change', function () {
        var ad = current(); if (!ad) return;
        if (this.value === 'all' && !this.checked) {
          // "Barcha bo'limlar" olib tashlansa — har bir bo'lim alohida belgilanadi, keraksizini olib tashlash mumkin
          document.querySelectorAll('#f-pages input:not([value="all"])').forEach(function (x) { x.checked = true; });
        }
        syncPages();
        var all = document.querySelector('#f-pages input[value="all"]').checked;
        var list = [];
        document.querySelectorAll('#f-pages input:not([value="all"])').forEach(function (x) { if (x.checked) list.push(x.value); });
        ad.pages = all || !list.length ? ['all'] : list;
        if (!all && !list.length) {
          document.querySelector('#f-pages input[value="all"]').checked = true;
          syncPages();
          toast('Hech boʻlmaganda bitta boʻlim tanlanishi kerak', 'info');
        }
        changed();
      });
    });
    document.querySelectorAll('#f-type button').forEach(function (b) {
      b.addEventListener('click', function () {
        var ad = current(); if (!ad) return;
        ad.type = b.dataset.type;
        showType(ad.type);
        changed();
      });
    });
    document.querySelectorAll('.upload-btn input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var f = this.files && this.files[0];
        var target = this.dataset.target;
        this.value = '';
        if (f) uploadImage(f, target);
      });
    });
    $('adForm').addEventListener('submit', function (e) { e.preventDefault(); });
  }

  function uploadImage(f, target) {
    if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) { toast('Faqat PNG, JPG, GIF yoki WEBP rasm', 'error'); return; }
    var setVal = function (v) {
      var ad = current(); if (!ad) return;
      var key = target.replace('f-', '');
      ad[key] = v;
      $(target).value = v.length > 120 ? '(faylga joylangan rasm, ' + Math.round(f.size / 1024) + ' KB)' : v;
      changed();
    };
    if (mode === 'server') {
      var fd = new FormData();
      fd.append('image', f);
      toast('Rasm yuklanmoqda…', 'info');
      api('upload', { method: 'POST', body: fd }).then(function (j) {
        setVal(j.url);
        toast('Rasm yuklandi');
      }, function (e) { toast(e.message === 'too_large' ? 'Rasm juda katta (2 MB gacha)' : 'Rasmni yuklab boʻlmadi', 'error'); });
      return;
    }
    if (f.size > MAX_EMBED && !confirm('Rasm hajmi ' + Math.round(f.size / 1024) + ' KB. Statik rejimda rasm ads.json fayliga joylanadi va sayt sekinlashishi mumkin.\n\nTavsiya: rasmni sayt papkasiga (masalan ads/uploads/) yuklab, manzilini yozing.\n\nBaribir joylansinmi?')) return;
    var r = new FileReader();
    r.onload = function () { setVal(String(r.result)); toast('Rasm joylandi'); };
    r.readAsDataURL(f);
  }

  /* Uzun data-URL'larni maydonda qisqa ko'rsatish */
  function shortenDataFields() {
    var ad = current(); if (!ad) return;
    ['image', 'imageMobile'].forEach(function (k) {
      if (ad[k] && ad[k].indexOf('data:') === 0) {
        $('f-' + k).value = '(faylga joylangan rasm, ' + Math.round(ad[k].length * 0.75 / 1024) + ' KB)';
      }
    });
  }
  ['f-image', 'f-imageMobile'].forEach(function (id) {
    $(id).addEventListener('focus', function () {
      if (/^\(faylga joylangan rasm/.test(this.value)) this.select();
    });
  });

  /* ---------------- Ko'rinish (preview) ---------------- */
  function renderPreview() {
    var ad = current();
    var top = $('mockTop'), bottom = $('mockBottom');
    top.innerHTML = ''; bottom.innerHTML = '';
    top.classList.remove('filled'); bottom.classList.remove('filled');
    $('mockPage').classList.toggle('mobile', previewMode === 'mobile');
    if (!ad) return;
    var slot = ad.slot === 'bottom' ? bottom : top;
    var r = A.render(ad, { base: '../', preview: true, onClose: function () {} });
    slot.appendChild(r.el);
    slot.classList.add('filled');
    r.ready.catch(function () {
      slot.innerHTML = '<div class="mock-missing">Rasm koʻrsatilmadi — manzilni tekshiring</div>';
    });
    var st = A.status(ad);
    var note = {
      active: 'Reklama hozir saytda koʻrinadi' + (mode === 'static' ? ' (ads.json saytga joylangandan keyin).' : ' (saqlangandan keyin).'),
      disabled: 'Reklama oʻchirilgan — saytda koʻrinmaydi.',
      scheduled: 'Reklama ' + ad.start + ' sanasidan boshlab koʻrinadi.',
      expired: 'Reklama muddati ' + ad.end + ' sanasida tugagan — saytda koʻrinmaydi.',
      incomplete: 'Reklama mazmuni toʻldirilmagan — saytda koʻrinmaydi.'
    }[st];
    var dev = ad.device !== 'all' ? ' Qurilma: ' + A.DEVICES[ad.device].toLowerCase() + '.' : '';
    $('previewNote').textContent = note + dev;
    $('previewNote').className = 'preview-note st-' + STATUS[st][1];
  }
  document.querySelectorAll('#previewMode button').forEach(function (b) {
    b.onclick = function () {
      previewMode = b.dataset.mode;
      document.querySelectorAll('#previewMode button').forEach(function (x) { x.classList.toggle('active', x === b); });
      renderPreview();
    };
  });

  function renderAll() {
    renderList();
    fillForm();
    shortenDataFields();
    renderPreview();
    updateSaveState();
  }

  /* ---------------- Amallar ---------------- */
  function addAd() {
    var ad = newAd();
    data.ads.unshift(ad);
    selectedId = ad.id;
    changed();
    fillForm();
    renderPreview();
    $('f-name').focus();
    $('f-name').select();
  }
  $('addBtn').onclick = addAd;
  $('addBtn2').onclick = addAd;
  $('dupBtn').onclick = function () {
    var ad = current(); if (!ad) return;
    var copy = JSON.parse(JSON.stringify(ad));
    copy.id = uid();
    copy.name = (ad.name || 'Reklama') + ' (nusxa)';
    copy.enabled = false;
    data.ads.splice(data.ads.indexOf(ad) + 1, 0, copy);
    selectedId = copy.id;
    changed();
    fillForm();
    toast('Nusxa yaratildi (oʻchirilgan holatda)');
  };
  $('delBtn').onclick = function () {
    var ad = current(); if (!ad) return;
    if (!confirm('«' + (ad.name || 'Nomsiz reklama') + '» reklamasi oʻchirilsinmi?')) return;
    var i = data.ads.indexOf(ad);
    data.ads.splice(i, 1);
    selectedId = data.ads.length ? data.ads[Math.min(i, data.ads.length - 1)].id : null;
    changed();
    fillForm();
    shortenDataFields();
  };

  $('exportBtn').onclick = function () {
    var out = JSON.parse(json());
    out.updated = new Date().toISOString();
    var blob = new Blob([JSON.stringify(out, null, 2) + '\n'], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ads.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    if (mode === 'static') {
      savedJson = json();
      store(DRAFT_KEY, null);
      updateSaveState();
      toast('ads.json yuklab olindi — uni sayt papkasiga (index.html yoniga) joylang');
    } else {
      toast('ads.json zaxira nusxasi yuklab olindi');
    }
  };

  $('importFile').onchange = function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(String(r.result));
        if (!d || !Array.isArray(d.ads)) throw new Error();
        setData(d, false);
        changed();
        toast('Fayldan ' + data.ads.length + ' ta reklama yuklandi');
      } catch (e) { toast('Notoʻgʻri fayl — ads.json kutilgan edi', 'error'); }
    };
    r.readAsText(f, 'utf-8');
  };

  $('saveBtn').onclick = function () {
    if (mode !== 'server') return;
    var btn = this;
    btn.disabled = true;
    api('save', { method: 'POST', body: json(), headers: { 'Content-Type': 'application/json' } }).then(function () {
      savedJson = json();
      store(DRAFT_KEY, null);
      updateSaveState();
      toast('Saytga saqlandi. Oʻzgarishlar darhol koʻrinadi');
    }, function (e) {
      btn.disabled = false;
      if (e.status === 401) { toast('Sessiya tugagan — qayta kiring', 'error'); showLogin(); }
      else if (e.message === 'write') toast('Serverda ads.json fayliga yozish huquqi yoʻq', 'error');
      else toast('Saqlab boʻlmadi: ' + e.message, 'error');
    });
  };

  $('logoutBtn').onclick = function () {
    if (isDirty() && !confirm('Saqlanmagan oʻzgarishlar bor. Baribir chiqilsinmi?')) return;
    api('logout', { method: 'POST' }).catch(function () {}).then(function () {
      csrf = null;
      showLogin();
    });
  };

  window.addEventListener('beforeunload', function (e) {
    if (mode === 'server' && isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------------- Rejimlar ---------------- */
  function showMode(html, kind) {
    var box = $('modeBox');
    box.className = 'mode-box ' + kind;
    box.innerHTML = html;
    box.hidden = false;
  }

  /* Bo'limlar: Reklamalar | Statistika */
  var view = 'ads';
  function setView(v) {
    view = v;
    document.querySelectorAll('#viewTabs .vtab').forEach(function (b) {
      var on = b.dataset.view === v;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('workspace').hidden = v !== 'ads';
    $('saveBar').hidden = v !== 'ads';
    $('statsView').hidden = v !== 'stats';
    if (v === 'stats' && window.YaStats) window.YaStats.show();
  }
  document.querySelectorAll('#viewTabs .vtab').forEach(function (b) {
    b.onclick = function () { setView(b.dataset.view); };
  });

  window.YaAdmin = {
    api: api,
    mode: function () { return mode; },
    ads: function () { return data.ads; },
    status: function (ad) { return STATUS[A.status(ad)]; },
    toast: toast,
    refreshList: renderList
  };

  function showLogin() {
    $('viewTabs').hidden = true;
    $('statsView').hidden = true;
    $('workspace').hidden = true;
    $('saveBar').hidden = true;
    $('logoutBtn').hidden = true;
    $('loginCard').hidden = false;
    $('loginPassword').value = '';
    $('loginPassword').focus();
  }

  function startWorkspace() {
    $('loginCard').hidden = true;
    $('viewTabs').hidden = false;
    setView('ads');
    $('saveBtn').hidden = mode !== 'server';
    $('logoutBtn').hidden = mode !== 'server';
    fetch('../ads.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { ads: [] }; })
      .catch(function () { return { ads: [] }; })
      .then(function (site) {
        setData(site, true);
        var draft = load(DRAFT_KEY);
        if (draft && draft.data && JSON.stringify(normalize(draft.data), null, 2) !== savedJson &&
          confirm('Saqlanmagan qoralama topildi (' + new Date(draft.t).toLocaleString() + '). Tiklansinmi?')) {
          setData(draft.data, false);
        } else if (draft) {
          store(DRAFT_KEY, null);
        }
        updateSaveState();
        // Ro'yxatda 30 kunlik ko'rsatkichlarni ko'rsatish uchun statistikani fon rejimida yuklash
        if (mode === 'server' && window.YaStats) window.YaStats.load().then(renderList, function () {});
      });
  }

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var body = new URLSearchParams();
    body.set('password', $('loginPassword').value);
    $('loginError').hidden = true;
    api('login', { method: 'POST', body: body }).then(function (j) {
      csrf = j.csrf;
      startWorkspace();
    }, function (err) {
      var msg = err.message === 'locked' ? 'Juda koʻp notoʻgʻri urinish. 15 daqiqadan soʻng qayta urinib koʻring.'
        : err.message === 'wrong' ? 'Parol notoʻgʻri.' : 'Kirishda xatolik yuz berdi.';
      $('loginError').textContent = msg;
      $('loginError').hidden = false;
    });
  });

  function init() {
    bindForm();
    api('ping').then(function (j) {
      mode = 'server';
      if (!j.configured) {
        showMode('<svg class="i"><use href="#i-alert"/></svg><div><b>Parol oʻrnatilmagan.</b> Serverdagi <code>admin/config.php</code> faylini oching va ' +
          '<code>ADMIN_PASSWORD</code> qiymatiga kamida 10 belgidan iborat parol yozing. Shundan soʻng sahifani yangilang.</div>', 'warn');
        return;
      }
      showMode('<svg class="i"><use href="#i-server"/></svg><div><b>Server rejimi.</b> “Saytga saqlash” tugmasi bosilganda oʻzgarishlar darhol saytda koʻrinadi.' +
        (j.writable ? '' : ' <b class="text-danger">Diqqat: serverda ads.json fayliga yozish huquqi yoʻq.</b>') + '</div>', 'ok');
      if (j.logged) { csrf = j.csrf; startWorkspace(); } else showLogin();
    }, function () {
      mode = 'static';
      showMode('<svg class="i"><use href="#i-info"/></svg><div><b>Statik rejim</b> (hosting PHP’ni qoʻllamaydi yoki sahifa kompyuterdan ochilgan). ' +
        'Reklamalarni tayyorlang, soʻng <b>“ads.json yuklab olish”</b> tugmasini bosing va faylni sayt papkasiga (<code>index.html</code> yoniga) joylang.</div>', 'info');
      startWorkspace();
    });
  }

  init();
})();
