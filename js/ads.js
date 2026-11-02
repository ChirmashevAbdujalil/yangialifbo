/*
 * Reklama joylari.
 * Reklamalar "ads.json" faylidan o'qiladi (uni admin panel yaratadi).
 * Faol reklama bo'lmasa, reklama joyi umuman ko'rinmaydi va sahifaga ta'sir qilmaydi.
 */
(function (global) {
  'use strict';

  var PAGES = { converter: 'Konvertor', editor: 'Klaviatura', trainer: 'Mashq', alphabet: 'Alifbo' };
  var SLOTS = { top: 'Sahifa tepasi (menyu ostida)', bottom: 'Sahifa pasti (asosiy qismdan keyin)' };
  var DEVICES = { all: 'Barcha qurilmalar', desktop: 'Faqat kompyuter', mobile: 'Faqat telefon' };
  var TYPES = { image: 'Rasm (banner)', text: 'Matnli eʼlon', html: 'HTML kod (AdSense, Yandex va h.k.)' };
  var MOBILE_MQ = '(max-width: 760px)';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function isComplete(ad) {
    if (ad.type === 'image') return !!(ad.image && String(ad.image).trim());
    if (ad.type === 'text') return !!((ad.title || '').trim() || (ad.text || '').trim());
    if (ad.type === 'html') return !!(ad.html || '').trim();
    return false;
  }

  /* Holat: active | disabled | scheduled | expired | incomplete */
  function status(ad, day) {
    day = day || today();
    if (!ad || !ad.enabled) return 'disabled';
    if (!isComplete(ad)) return 'incomplete';
    if (ad.start && day < ad.start) return 'scheduled';
    if (ad.end && day > ad.end) return 'expired';
    return 'active';
  }

  function matches(ad, tab, mobile) {
    var pages = ad.pages && ad.pages.length ? ad.pages : ['all'];
    if (pages.indexOf('all') < 0 && pages.indexOf(tab) < 0) return false;
    if (ad.device === 'desktop' && mobile) return false;
    if (ad.device === 'mobile' && !mobile) return false;
    return true;
  }

  /* Xavfsiz havolalar: faqat http(s), mailto, tel va nisbiy yo'llar */
  function safeHref(u, base) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^\/\//.test(u)) return 'https:' + u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return ''; // javascript: va boshqalar taqiqlanadi
    return (base || '') + u.replace(/^\.?\//, '');
  }
  function safeSrc(u, base) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^https?:/i.test(u)) return u;
    if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(u)) return u;
    if (/^\/\//.test(u)) return 'https:' + u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';
    return (base || '') + u.replace(/^\.?\//, '');
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function icon(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'i');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  function linkWrap(ad, base, child) {
    var href = safeHref(ad.link, base);
    if (!href) return child;
    var a = el('a', 'ad-link');
    a.href = href;
    a.target = '_blank';
    a.rel = 'sponsored noopener noreferrer';
    a.appendChild(child);
    return a;
  }

  /* HTML kod ichidagi <script> teglarini ishga tushirish */
  function activateScripts(root) {
    var list = root.querySelectorAll('script');
    for (var i = 0; i < list.length; i++) {
      var old = list[i];
      var s = document.createElement('script');
      for (var k = 0; k < old.attributes.length; k++) s.setAttribute(old.attributes[k].name, old.attributes[k].value);
      s.text = old.text;
      old.parentNode.replaceChild(s, old);
    }
  }

  /**
   * render(ad, { base, onClose, preview }) -> { el, ready: Promise, mount: fn }
   */
  function render(ad, opts) {
    opts = opts || {};
    var base = opts.base || '';
    var box = el('div', 'ad ad-' + ad.type);
    box.setAttribute('role', 'complementary');
    box.setAttribute('aria-label', 'Reklama');
    box.appendChild(el('span', 'ad-label', 'Reklama'));
    if (ad.closable && opts.onClose) {
      var x = el('button', 'ad-close');
      x.type = 'button';
      x.title = 'Yopish';
      x.setAttribute('aria-label', 'Reklamani yopish');
      x.appendChild(icon('close'));
      x.addEventListener('click', function () { opts.onClose(ad); });
      box.appendChild(x);
    }

    var ready;
    if (ad.type === 'image') {
      var src = safeSrc(ad.image, base);
      var pic = el('picture', 'ad-picture');
      var mob = safeSrc(ad.imageMobile, base);
      if (mob) {
        var source = document.createElement('source');
        source.media = MOBILE_MQ;
        source.srcset = mob;
        pic.appendChild(source);
      }
      var img = document.createElement('img');
      img.alt = ad.alt || ad.name || 'Reklama';
      img.decoding = 'async';
      pic.appendChild(img);
      box.appendChild(linkWrap(ad, base, pic));
      ready = new Promise(function (resolve, reject) {
        if (!src) { reject(new Error('rasm yoʻq')); return; }
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });
    } else if (ad.type === 'text') {
      var inner = el('div', 'ad-text-inner');
      var body = el('div', 'ad-text-body');
      if (ad.title) body.appendChild(el('b', 'ad-title', ad.title));
      if (ad.text) body.appendChild(el('p', 'ad-desc', ad.text));
      inner.appendChild(body);
      var href = safeHref(ad.link, base);
      if (href && ad.button) {
        var btn = el('a', 'btn primary ad-btn', ad.button);
        btn.href = href;
        btn.target = '_blank';
        btn.rel = 'sponsored noopener noreferrer';
        inner.appendChild(btn);
        box.appendChild(inner);
      } else {
        box.appendChild(linkWrap(ad, base, inner));
      }
      ready = Promise.resolve();
    } else {
      var code = el('div', 'ad-code');
      if (opts.preview) {
        // Admin panelda kod ishga tushirilmaydi, faqat namuna ko'rsatiladi
        code.classList.add('ad-code-preview');
        code.appendChild(el('b', '', 'HTML reklama kodi'));
        code.appendChild(el('span', '', 'Kod saytda ishga tushadi. Bu yerda faqat joy koʻrsatilmoqda.'));
      } else {
        code.innerHTML = ad.html;
      }
      box.appendChild(code);
      ready = Promise.resolve();
    }

    return {
      el: box,
      ready: ready,
      mount: function () { if (ad.type === 'html' && !opts.preview) activateScripts(box); }
    };
  }

  /* ---------------- Saytda ishga tushirish ---------------- */
  function initSite() {
    var slots = Array.prototype.slice.call(document.querySelectorAll('.ad-slot'));
    // Sahifa kompyuterdan (file://) ochilganda reklama yuklanmaydi — faqat serverda ishlaydi
    if (!slots.length || !global.fetch || location.protocol === 'file:') return;
    var mq = global.matchMedia ? global.matchMedia(MOBILE_MQ) : null;
    var ads = [];
    var chosen = {};
    var tracking = false;
    var viewed = {};
    var lastClick = {};

    /* --- Statistika: ko'rish va bosishlarni serverga yuborish (faqat PHP hostingda) --- */
    function send(id, ev) {
      if (!tracking || navigator.webdriver) return;
      var fd = new FormData();
      fd.append('ad', id);
      fd.append('e', ev);
      try { if (navigator.sendBeacon && navigator.sendBeacon('ads/track.php', fd)) return; } catch (e) {}
      try { fetch('ads/track.php', { method: 'POST', body: fd, keepalive: true }).catch(function () {}); } catch (e) {}
    }
    /* Ko'rish: reklamaning kamida yarmi 1 soniya ekranda tursa (sahifa ochilishida bir marta) */
    function watch(slot, ad) {
      if (!tracking || viewed[ad.id]) return;
      if (!('IntersectionObserver' in global)) { viewed[ad.id] = true; send(ad.id, 'v'); return; }
      var timer = null;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && en.intersectionRatio >= 0.5 && !document.hidden) {
            if (!timer) {
              timer = setTimeout(function () {
                if (viewed[ad.id]) return;
                viewed[ad.id] = true;
                send(ad.id, 'v');
                io.disconnect();
              }, 1000);
            }
          } else {
            clearTimeout(timer);
            timer = null;
          }
        });
      }, { threshold: [0, 0.5, 1] });
      io.observe(slot);
      slot._io = io;
    }
    /* Bosish: reklama ichidagi havola bosilganda */
    function clickTracker(ad) {
      return function (e) {
        if (!e.target.closest || !e.target.closest('a[href]')) return;
        var now = Date.now();
        if (now - (lastClick[ad.id] || 0) < 1500) return;
        lastClick[ad.id] = now;
        send(ad.id, 'c');
      };
    }

    function closed(id) {
      try { return sessionStorage.getItem('ya_ad_closed_' + id) === '1'; } catch (e) { return false; }
    }
    function close(ad) {
      try { sessionStorage.setItem('ya_ad_closed_' + ad.id, '1'); } catch (e) {}
      update();
    }

    function update() {
      var activeTab = document.querySelector('.tab.active');
      var tab = activeTab ? activeTab.getAttribute('data-tab') : '';
      var mobile = mq ? mq.matches : false;
      slots.forEach(function (slot) {
        var name = slot.getAttribute('data-slot');
        var cands = ads.filter(function (a) { return a.slot === name && matches(a, tab, mobile) && !closed(a.id); });
        var key = name + '|' + tab + '|' + mobile;
        var ad = chosen[key];
        if (!ad || cands.indexOf(ad) < 0) {
          ad = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
          chosen[key] = ad;
        }
        var id = ad ? ad.id : null;
        if (slot._adId === id) return;
        slot._adId = id;
        if (slot._io) { slot._io.disconnect(); slot._io = null; }
        slot.hidden = true;
        slot.innerHTML = '';
        if (!ad) return;
        var r = render(ad, { onClose: close });
        r.el.addEventListener('click', clickTracker(ad), true);
        r.el.addEventListener('auxclick', clickTracker(ad), true);
        slot.appendChild(r.el);
        r.ready.then(function () {
          if (slot._adId !== id) return;
          slot.hidden = false;
          r.mount();
          watch(slot, ad);
        }, function () {
          if (slot._adId === id) slot.innerHTML = '';
        });
      });
    }

    fetch('ads.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var day = today();
        tracking = !!(data && data.tracking === true);
        ads = (data && Array.isArray(data.ads) ? data.ads : []).filter(function (a) {
          return status(a, day) === 'active' && SLOTS[a.slot];
        });
        if (!ads.length) return;
        update();
        document.addEventListener('ya:tabchange', update);
        if (mq) {
          if (mq.addEventListener) mq.addEventListener('change', update);
          else if (mq.addListener) mq.addListener(update);
        }
      })
      .catch(function () { /* ads.json yo'q yoki fayl tizimidan ochilgan — reklama ko'rsatilmaydi */ });
  }

  global.UzAds = {
    PAGES: PAGES, SLOTS: SLOTS, DEVICES: DEVICES, TYPES: TYPES,
    status: status, matches: matches, render: render, today: today,
    safeHref: safeHref, safeSrc: safeSrc
  };

  if (document.querySelector('.ad-slot')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSite);
    else initSite();
  }
})(window);
