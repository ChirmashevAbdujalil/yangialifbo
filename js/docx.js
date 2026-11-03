/*
 * Word (.docx) hujjatlarini o'girish.
 * Hujjat brauzerning o'zida ochiladi va qayta yig'iladi — hech qayerga yuborilmaydi.
 * Shrift, qalin/kursiv, jadval, rasm va boshqa formatlash saqlanadi:
 * faqat matn bo'laklari (w:t) o'zgartiriladi.
 */
(function (global) {
  'use strict';

  var C = global.UzConvert;
  var W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  var XML_NS = 'http://www.w3.org/XML/1998/namespace';
  var DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  // Matn bo'lishi mumkin bo'lgan qismlar: asosiy matn, kolontitullar, izohlar
  var PARTS = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;
  var JSZIP_SRC = 'js/vendor/jszip.min.js';

  var loading = null;
  function loadJSZip() {
    if (global.JSZip) return Promise.resolve(global.JSZip);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = JSZIP_SRC;
      s.onload = function () { global.JSZip ? resolve(global.JSZip) : reject(new Error('JSZip')); };
      s.onerror = function () { loading = null; reject(new Error('JSZip yuklanmadi')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function isZip(buf) {
    var b = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
    return b.length === 4 && b[0] === 0x50 && b[1] === 0x4B; // "PK"
  }
  function isOldDoc(buf) {
    var b = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
    return b.length === 4 && b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0;
  }

  function closestParagraph(el) {
    var n = el.parentNode;
    while (n && n.nodeType === 1) {
      if (n.localName === 'p' && n.namespaceURI === W) return n;
      n = n.parentNode;
    }
    return null;
  }

  /*
   * Hujjatdagi matnni paragraflar bo'yicha guruhlash.
   * Har bir paragraf: [{ node: w:t | null, text }] — tab va qator ko'chishi node'siz.
   */
  function collect(root) {
    var groups = new Map();
    var all = root.getElementsByTagNameNS(W, '*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var ln = el.localName;
      if (ln !== 't' && ln !== 'tab' && ln !== 'br' && ln !== 'cr') continue;
      // faqat matn bo'laklari ichidagilar (w:tabs ichidagi tab to'xtash nuqtalari emas)
      if (!el.parentNode || el.parentNode.localName !== 'r') continue;
      var p = closestParagraph(el);
      if (!p) continue;
      var seg = ln === 't' ? { node: el, text: el.textContent } : { node: null, text: ln === 'tab' ? '\t' : '\n' };
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(seg);
    }
    return groups;
  }

  /* O'girish funksiyasi: matn -> { s: [manba indekslari], o: [natija bo'laklari] } */
  function mapper(from, to, opts) {
    return function (text) { return C.convertMapped(text, from, to, opts); };
  }
  /* Faqat tutuq belgilarini to'g'rilash (uzunlik o'zgarmaydi) */
  function apostropheMapper(text) {
    var out = C.normalizeApostrophes(text);
    var m = { s: [], o: [] };
    for (var i = 0; i < out.length; i++) { m.s.push(i); m.o.push(out.charAt(i)); }
    return m;
  }

  /* Paragrafni o'girish; o'zgargan bo'lsa true qaytaradi */
  function convertParagraph(segs, mapFn) {
    var full = '';
    var starts = [];
    segs.forEach(function (s) { starts.push(full.length); full += s.text; });
    if (!full) return false;
    var m = mapFn(full);
    var outs = segs.map(function () { return ''; });
    var k = 0;
    for (var i = 0; i < m.o.length; i++) {
      var src = m.s[i];
      while (k + 1 < segs.length && starts[k + 1] <= src) k++;
      if (segs[k].node) outs[k] += m.o[i];
    }
    var changed = false;
    segs.forEach(function (s, j) {
      if (!s.node || s.text === outs[j]) return;
      s.node.textContent = outs[j];
      s.node.setAttributeNS(XML_NS, 'xml:space', 'preserve');
      changed = true;
    });
    return changed;
  }

  function serialize(doc) {
    var xml = new XMLSerializer().serializeToString(doc);
    if (xml.indexOf('<?xml') !== 0) xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + xml;
    return xml;
  }

  function parse(xml) {
    var doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('XML xatosi');
    return doc;
  }

  function open(buf) {
    if (isOldDoc(buf)) return Promise.reject(new Error('old-doc'));
    if (!isZip(buf)) return Promise.reject(new Error('not-docx'));
    return loadJSZip().then(function (JSZip) { return JSZip.loadAsync(buf); }).then(function (zip) {
      if (!zip.file('word/document.xml')) throw new Error('not-docx');
      return zip;
    });
  }

  /* Hujjatdagi asosiy matnni oddiy matn ko'rinishida olish (ko'rib chiqish uchun) */
  function extractText(buf) {
    return open(buf).then(function (zip) {
      return zip.file('word/document.xml').async('string');
    }).then(function (xml) {
      var doc = parse(xml);
      var groups = collect(doc);
      var paras = doc.getElementsByTagNameNS(W, 'p');
      var lines = [];
      for (var i = 0; i < paras.length; i++) {
        var segs = groups.get(paras[i]);
        lines.push(segs ? segs.map(function (s) { return s.text; }).join('') : '');
      }
      return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    });
  }

  /* Hujjatni o'girib, yangi .docx (Blob) qaytarish */
  function convertDocx(buf, from, to, opts) {
    return open(buf).then(function (zip) {
      var names = Object.keys(zip.files).filter(function (n) { return PARTS.test(n); });
      return Promise.all(names.map(function (name) {
        return zip.file(name).async('string').then(function (xml) {
          var doc = parse(xml);
          var fn = mapper(from, to, opts);
          collect(doc).forEach(function (segs) { convertParagraph(segs, fn); });
          zip.file(name, serialize(doc));
        });
      })).then(function () {
        return zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME, compression: 'DEFLATE' });
      });
    });
  }

  /*
   * Word qo'shimchasi uchun: OOXML matnini (Word API getOoxml() natijasi — "pkg:package"
   * yoki oddiy w:document) o'girish. Faqat /word/document.xml qismidagi matnga tegiladi.
   * Qaytaradi: { xml, changed }
   */
  var PKG = 'http://schemas.microsoft.com/office/2006/xmlPackage';
  function transformXml(xml, mapFn) {
    var doc = parse(xml);
    var roots = [];
    var parts = doc.getElementsByTagNameNS(PKG, 'part');
    for (var i = 0; i < parts.length; i++) {
      var name = parts[i].getAttributeNS(PKG, 'name') || parts[i].getAttribute('pkg:name') || '';
      if (/^\/word\/document\.xml$/i.test(name)) roots.push(parts[i]);
    }
    if (!parts.length) roots.push(doc);
    var changed = false;
    roots.forEach(function (root) {
      collect(root).forEach(function (segs) { if (convertParagraph(segs, mapFn)) changed = true; });
    });
    return { xml: changed ? serialize(doc) : xml, changed: changed };
  }

  global.UzDocx = {
    mapper: mapper,
    apostropheMapper: apostropheMapper,
    transformXml: transformXml,
    isDocxName: function (name) { return /\.docx$/i.test(name || ''); },
    isDocName: function (name) { return /\.doc$/i.test(name || ''); },
    extractText: extractText,
    convertDocx: convertDocx
  };
})(window);
