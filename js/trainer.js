/*
 * Tez yozish mashqi (trenajor).
 */
(function (global) {
  'use strict';

  var C = global.UzConvert;
  var L = global.UzLayouts;
  var D = global.UzData;

  var HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
  var TOP = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'];
  var BOTTOM = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period'];
  var ALL = HOME.concat(TOP, BOTTOM, ['Backquote', 'Minus', 'Equal']);

  var LESSONS = [
    { id: 'home', name: 'Asosiy qator (A S D F … J K L)', codes: HOME },
    { id: 'top', name: 'Yuqori qator + asosiy', codes: HOME.concat(TOP) },
    { id: 'bottom', name: 'Pastki qator + asosiy', codes: HOME.concat(BOTTOM) },
    { id: 'letters', name: 'Barcha harflar', codes: ALL },
    { id: 'special', name: 'Maxsus harflar (oʻ gʻ sh ch …)', kind: 'special' },
    { id: 'words', name: 'Ommabop soʻzlar', kind: 'words' },
    { id: 'caps', name: 'Bosh harflar bilan', kind: 'caps' },
    { id: 'digits', name: 'Raqamlar', kind: 'digits' },
    { id: 'sentences', name: 'Maqollar va gaplar', kind: 'sentences' },
    { id: 'custom', name: 'Oʻz matningiz', kind: 'custom' }
  ];

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function Trainer(opts) {
    this.o = opts;
    this.lesson = LESSONS[0];
    this.duration = 60;
    this.allowBackspace = true;
    this.stopOnError = false;
    this.customText = '';
    this.timer = null;
    this.reset();
  }

  Trainer.LESSONS = LESSONS;

  Trainer.prototype.layout = function () { return this.o.getLayout(); };
  Trainer.prototype.variant = function () { return this.o.getVariant(); };

  Trainer.prototype.toScript = function (s) {
    var lay = this.layout();
    if (lay === 'lotin') return s;
    return C.convert(s, 'lotin', lay, { variant: this.variant() });
  };

  Trainer.prototype.allowedChars = function (codes) {
    var map = L.getMap(this.layout(), this.variant());
    var set = {};
    codes.forEach(function (code) {
      var p = map[code];
      if (!p) return;
      if (p[0] === L.SMART) { set[C.OKINA] = 1; set[C.APOS] = 1; return; }
      if (C.isLetter(p[0]) || p[0] === C.APOS) set[p[0].toLowerCase()] = 1;
    });
    return set;
  };

  Trainer.prototype.generate = function () {
    var self = this;
    var timed = this.duration > 0;
    var count = timed ? 160 : 24;
    var lesson = this.lesson;
    var words = D.WORDS.map(function (w) { return self.toScript(w); });
    var out = [];
    var i;

    if (lesson.codes) {
      var set = this.allowedChars(lesson.codes);
      var letters = Object.keys(set).filter(function (c) { return C.isLetter(c); });
      var fit = words.filter(function (w) {
        for (var k = 0; k < w.length; k++) if (!set[w.charAt(k).toLowerCase()]) return false;
        return true;
      });
      for (i = 0; i < count; i++) {
        if (fit.length && Math.random() < 0.6) {
          out.push(pick(fit));
        } else {
          var len = 2 + Math.floor(Math.random() * 4);
          var w = '';
          for (var j = 0; j < len; j++) w += pick(letters);
          out.push(w);
        }
      }
      return out.join(' ');
    }

    switch (lesson.kind) {
      case 'special': {
        var re = this.layout() === 'kirill' ? /[ўқғҳЎҚҒҲ]/ :
          this.layout() === 'yangi' ? /[şçğöóǵʼ]/i :
            /(sh|ch|ng|ʻ|ʼ)/i;
        var sp = words.filter(function (w) { return re.test(w); });
        for (i = 0; i < count; i++) out.push(pick(sp));
        return out.join(' ');
      }
      case 'words':
        for (i = 0; i < count; i++) out.push(pick(words));
        return out.join(' ');
      case 'caps':
        for (i = 0; i < count; i++) {
          var cw = pick(words);
          if (Math.random() < 0.6) {
            var first = cw.charAt(0).toUpperCase();
            // oʻ / gʻ -> Oʻ / Gʻ; sh/ch -> Sh/Ch (birinchi harf katta)
            cw = first + cw.slice(1);
          }
          out.push(cw);
        }
        return out.join(' ');
      case 'digits':
        for (i = 0; i < count; i++) {
          var n = Math.floor(Math.random() * Math.pow(10, 1 + Math.floor(Math.random() * 4)));
          out.push(String(n));
        }
        return out.join(' ');
      case 'sentences': {
        var s = shuffle(D.SENTENCES).map(function (x) { return self.toScript(x); });
        if (!timed) s = s.slice(0, 4);
        else s = s.concat(shuffle(s));
        return s.join(' ');
      }
      case 'custom': {
        var t = (this.customText || '').replace(/\s+/g, ' ').trim();
        return t || this.toScript('Oʻz matningizni yuqoridagi maydonga kiriting.');
      }
    }
    return '';
  };

  Trainer.prototype.reset = function () {
    clearInterval(this.timer);
    this.timer = null;
    this.text = '';
    this.pos = 0;
    this.status = [];
    this.started = false;
    this.finished = false;
    this.startTime = 0;
    this.keystrokes = 0;
    this.wrong = 0;
    this.errChars = {};
    this.errCodes = {};
  };

  Trainer.prototype.restart = function () {
    this.reset();
    this.text = this.generate();
    this.renderText();
    this.updateStats();
    this.updateTarget();
    this.o.overlay.hidden = false;
    this.o.overlay.textContent = 'Boshlash uchun yozishni boshlang (Esc — qayta boshlash)';
  };

  Trainer.prototype.renderText = function () {
    var box = this.o.textEl;
    box.innerHTML = '';
    var frag = document.createDocumentFragment();
    this.spans = [];
    for (var i = 0; i < this.text.length; i++) {
      var s = document.createElement('span');
      var ch = this.text.charAt(i);
      s.textContent = ch;
      if (ch === ' ') s.className = 'sp';
      frag.appendChild(s);
      this.spans.push(s);
    }
    box.appendChild(frag);
    box.scrollTop = 0;
    this.markCurrent();
  };

  Trainer.prototype.markCurrent = function () {
    if (this.curSpan) this.curSpan.classList.remove('cur');
    var s = this.spans[this.pos];
    this.curSpan = s || null;
    if (s) {
      s.classList.add('cur');
      var box = this.o.textEl;
      var lh = s.offsetHeight || 32;
      var top = s.offsetTop; // box: position: relative
      if (top - box.scrollTop > lh * 1.5 || top < box.scrollTop) {
        box.scrollTop = Math.max(0, top - lh);
      }
    }
  };

  Trainer.prototype.updateTarget = function () {
    var kb = this.o.kb;
    if (this.finished || this.pos >= this.text.length) { kb.setTarget(null); return; }
    var ch = this.text.charAt(this.pos);
    var rev = L.reverseMap(this.layout(), this.variant());
    var t = rev[ch];
    if (t) kb.setTarget(t.code, t.shift);
    else kb.setTarget(null);
  };

  Trainer.prototype.start = function () {
    var self = this;
    this.started = true;
    this.startTime = Date.now();
    this.o.overlay.hidden = true;
    this.timer = setInterval(function () {
      self.updateStats();
      if (self.duration > 0 && self.elapsed() >= self.duration) self.finish();
    }, 200);
  };

  Trainer.prototype.elapsed = function () {
    if (!this.started) return 0;
    return ((this.finished ? this.endTime : Date.now()) - this.startTime) / 1000;
  };

  Trainer.prototype.matches = function (typed, expected) {
    if (typed === expected) return true;
    if (C.isApos(typed) && C.isApos(expected)) return true;
    if (typed === '-' && /[–—]/.test(expected)) return true;
    return false;
  };

  Trainer.prototype.input = function (ch) {
    if (this.finished || !this.text) return;
    if (!this.started) this.start();
    var expected = this.text.charAt(this.pos);
    if (ch === L.SMART) ch = C.isApos(expected) ? expected : C.APOS;
    this.keystrokes++;
    var ok = this.matches(ch, expected);
    var span = this.spans[this.pos];
    if (!ok) {
      this.wrong++;
      this.errChars[expected] = (this.errChars[expected] || 0) + 1;
      var rev = L.reverseMap(this.layout(), this.variant());
      var t = rev[expected];
      if (t) this.errCodes[t.code] = (this.errCodes[t.code] || 0) + 1;
      if (this.o.onError) this.o.onError();
      if (this.stopOnError) {
        span.classList.add('shake');
        setTimeout(function () { span.classList.remove('shake'); }, 250);
        this.updateStats();
        return;
      }
    }
    this.status[this.pos] = ok;
    span.classList.remove('ok', 'err');
    span.classList.add(ok ? 'ok' : 'err');
    this.pos++;
    if (this.pos >= this.text.length) {
      if (this.duration > 0 && this.lesson.kind !== 'custom') {
        this.appendMore();
      } else {
        this.finish();
        return;
      }
    }
    this.markCurrent();
    this.updateTarget();
    this.updateStats();
  };

  Trainer.prototype.appendMore = function () {
    var more = ' ' + this.generate();
    var box = this.o.textEl;
    for (var i = 0; i < more.length; i++) {
      var s = document.createElement('span');
      var ch = more.charAt(i);
      s.textContent = ch;
      if (ch === ' ') s.className = 'sp';
      box.appendChild(s);
      this.spans.push(s);
    }
    this.text += more;
  };

  Trainer.prototype.backspace = function () {
    if (this.finished || !this.allowBackspace || this.pos === 0) return;
    this.pos--;
    this.status[this.pos] = undefined;
    this.spans[this.pos].classList.remove('ok', 'err');
    this.markCurrent();
    this.updateTarget();
    this.updateStats();
  };

  Trainer.prototype.correctCount = function () {
    var n = 0;
    for (var i = 0; i < this.pos; i++) if (this.status[i]) n++;
    return n;
  };

  Trainer.prototype.metrics = function () {
    var t = Math.max(this.elapsed(), 0.001);
    if (this.duration > 0) t = Math.min(t, this.duration);
    var correct = this.correctCount();
    var min = t / 60;
    var ready = this.started && (t > 1 || this.finished);
    var wpm = ready ? Math.round((correct / 5) / min) : 0;
    var cpm = ready ? Math.round(correct / min) : 0;
    var acc = this.keystrokes ? Math.round(((this.keystrokes - this.wrong) / this.keystrokes) * 100) : 100;
    return { wpm: wpm, cpm: cpm, acc: acc, errors: this.wrong, time: t, correct: correct };
  };

  Trainer.prototype.updateStats = function () {
    var m = this.metrics();
    var s = this.o.stats;
    var timeLeft = this.duration > 0 ? Math.max(0, this.duration - this.elapsed()) : this.elapsed();
    s.time.textContent = fmtTime(timeLeft);
    s.timeLabel.textContent = this.duration > 0 ? 'Qolgan vaqt' : 'Vaqt';
    s.wpm.textContent = m.wpm;
    s.cpm.textContent = m.cpm;
    s.acc.textContent = m.acc + '%';
    s.err.textContent = m.errors;
    var prog = this.duration > 0
      ? Math.min(100, (this.elapsed() / this.duration) * 100)
      : (this.text.length ? (this.pos / this.text.length) * 100 : 0);
    s.progress.style.width = prog.toFixed(1) + '%';
  };

  Trainer.prototype.finish = function () {
    if (this.finished) return;
    this.finished = true;
    this.endTime = Date.now();
    clearInterval(this.timer);
    this.updateStats();
    this.o.kb.setTarget(null);
    var m = this.metrics();
    m.lesson = this.lesson.name;
    m.layout = this.layout();
    m.date = Date.now();
    m.errChars = this.errChars;
    this.o.overlay.hidden = false;
    this.o.overlay.textContent = 'Tugadi! Qayta boshlash uchun Esc yoki “Qayta boshlash” tugmasini bosing';
    if (this.o.onFinish) this.o.onFinish(m, this.errCodes);
  };

  function fmtTime(sec) {
    sec = Math.round(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  Trainer.fmtTime = fmtTime;
  global.Trainer = Trainer;
})(window);
