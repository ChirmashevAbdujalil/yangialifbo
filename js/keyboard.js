/*
 * Ekrandagi (virtual) klaviatura komponenti.
 * new VirtualKeyboard(container, { onKey: fn })
 * onKey({ type: 'char', char, code }) yoki onKey({ type: 'action', name })
 */
(function (global) {
  'use strict';

  var L = global.UzLayouts;
  var ACTIONS = {
    Backspace: 1, Tab: 1, Enter: 1, ArrowLeft: 1, ArrowRight: 1, Lang: 1,
    ShiftLeft: 1, ShiftRight: 1, CapsLock: 1, AltLeft: 1, AltRight: 1
  };

  function VirtualKeyboard(container, opts) {
    this.el = container;
    this.opts = opts || {};
    this.layout = 'lotin';
    this.variant = 'A';
    this.shift = false;   // ekrandagi Shift (bir martalik)
    this.caps = false;
    this.alt = false;
    this.physShift = false;
    this.physAlt = false;
    this.keys = {};
    this.targetCodes = [];
    this.repeatTimer = null;
    this.build();
  }

  VirtualKeyboard.prototype.build = function () {
    var self = this;
    this.el.innerHTML = '';
    this.el.classList.add('vkb');

    this.specialBar = document.createElement('div');
    this.specialBar.className = 'vkb-specials';
    this.el.appendChild(this.specialBar);

    var board = document.createElement('div');
    board.className = 'vkb-board';
    L.ROWS.forEach(function (row) {
      var r = document.createElement('div');
      r.className = 'vkb-row';
      row.forEach(function (k) {
        var code = k[0];
        var w = k[1] || 1;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'key';
        b.dataset.code = code;
        b.style.flexGrow = w;
        b.style.flexBasis = '0';
        if (ACTIONS[code] || code === 'Space') b.classList.add('key-action');
        if (code === 'Space') b.classList.add('key-space');
        var f = L.FINGERS[code];
        if (f) b.classList.add('f-' + f);
        b.innerHTML = '<span class="k-sub"></span><span class="k-main"></span>';
        r.appendChild(b);
        self.keys[code] = b;
      });
      board.appendChild(r);
    });
    this.el.appendChild(board);

    // Fokusni matn maydonidan olib qo'ymaslik uchun pointerdown'da preventDefault
    this.el.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      e.preventDefault();
      if (btn.dataset.special !== undefined) {
        self.emitChar(btn.dataset.special, null);
        self.flashEl(btn);
        return;
      }
      var code = btn.dataset.code;
      self.handleVirtual(code);
      if (code === 'Backspace') {
        clearTimeout(self.repeatTimer);
        self.repeatTimer = setTimeout(function rep() {
          self.handleVirtual('Backspace');
          self.repeatTimer = setTimeout(rep, 60);
        }, 450);
      }
    });
    var stop = function () { clearTimeout(self.repeatTimer); };
    this.el.addEventListener('pointerup', stop);
    this.el.addEventListener('pointerleave', stop);
    this.el.addEventListener('pointercancel', stop);
    // Klaviatura (Tab + Enter) orqali bosilganda
    this.el.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      var btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.special !== undefined) self.emitChar(btn.dataset.special, null);
      else self.handleVirtual(btn.dataset.code);
    });
    this.el.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    this.refresh();
  };

  VirtualKeyboard.prototype.setLayout = function (layout, variant) {
    this.layout = layout;
    this.variant = variant || this.variant;
    this.refresh();
  };

  VirtualKeyboard.prototype.isShift = function () { return this.shift || this.physShift; };
  VirtualKeyboard.prototype.isAlt = function () { return this.alt || this.physAlt; };

  VirtualKeyboard.prototype.refresh = function () {
    var self = this;
    var map = L.getMap(this.layout, this.variant);
    var combos = L.altCombos(this.layout, this.variant);
    var alt = this.isAlt();
    var shift = this.isShift();

    Object.keys(this.keys).forEach(function (code) {
      var b = self.keys[code];
      var main = b.querySelector('.k-main');
      var sub = b.querySelector('.k-sub');
      if (ACTIONS[code] || code === 'Space') {
        var lbl = L.ACTION_LABELS[code];
        if (code === 'Space') lbl = L.NAMES[self.layout];
        if (code === 'Lang') lbl = '🌐 ' + (self.layout === 'kirill' ? 'Ки' : self.layout === 'yangi' ? 'Ya' : 'Lo');
        main.textContent = lbl;
        sub.textContent = '';
        return;
      }
      var pair = alt ? (combos[code] || L.US[code]) : map[code];
      if (!pair) { main.textContent = ''; sub.textContent = ''; return; }
      var letter = L.isLetterPair(pair) || (pair[0] && pair[0].length > 1);
      var p0 = pair[0] === L.SMART ? 'ʻ ʼ' : pair[0];
      if (letter) {
        var up = shift !== self.caps;
        main.textContent = up ? pair[1] : p0;
        sub.textContent = '';
      } else {
        main.textContent = shift ? pair[1] : p0;
        sub.textContent = shift ? p0 : pair[1];
      }
      b.classList.toggle('has-combo', alt && !!combos[code]);
    });

    ['ShiftLeft', 'ShiftRight'].forEach(function (c) { self.keys[c].classList.toggle('on', shift); });
    this.keys.CapsLock.classList.toggle('on', this.caps);
    ['AltLeft', 'AltRight'].forEach(function (c) { self.keys[c].classList.toggle('on', alt); });

    // Maxsus belgilar paneli
    this.specialBar.innerHTML = '';
    L.specials(this.layout, this.variant).forEach(function (ch) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'key key-special';
      b.dataset.special = ch;
      b.textContent = ch;
      b.title = ch + ' belgisini qoʻshish';
      self.specialBar.appendChild(b);
    });
  };

  VirtualKeyboard.prototype.emitChar = function (ch, code) {
    if (this.opts.onKey) this.opts.onKey({ type: 'char', char: ch, code: code });
  };

  VirtualKeyboard.prototype.handleVirtual = function (code) {
    var b = this.keys[code];
    if (b) this.flashEl(b);
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.shift = !this.shift; this.refresh(); this.sound(); return;
    }
    if (code === 'CapsLock') { this.caps = !this.caps; this.refresh(); this.sound(); return; }
    if (code === 'AltLeft' || code === 'AltRight') { this.alt = !this.alt; this.refresh(); this.sound(); return; }
    if (ACTIONS[code]) {
      if (this.opts.onKey) this.opts.onKey({ type: 'action', name: code });
      this.sound();
      return;
    }
    var ch = L.getChar(this.layout, this.variant, code, this.isShift(), this.caps, this.isAlt());
    if (ch !== null) this.emitChar(ch, code);
    if (this.shift || this.alt) { this.shift = false; this.alt = false; this.refresh(); }
  };

  VirtualKeyboard.prototype.sound = function () {
    if (this.opts.onSound) this.opts.onSound();
  };

  VirtualKeyboard.prototype.flashEl = function (el) {
    el.classList.add('pressed');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('pressed'); }, 140);
  };

  /* Fizik klaviatura holatini ko'rsatish */
  VirtualKeyboard.prototype.physicalDown = function (e) {
    var b = this.keys[e.code];
    if (b) b.classList.add('down');
    var changed = false;
    if (e.shiftKey !== this.physShift) { this.physShift = e.shiftKey; changed = true; }
    var alt = e.altKey;
    if (alt !== this.physAlt) { this.physAlt = alt; changed = true; }
    if (e.getModifierState) {
      var caps = e.getModifierState('CapsLock');
      if (caps !== this.caps) { this.caps = caps; changed = true; }
    }
    if (changed) this.refresh();
  };

  VirtualKeyboard.prototype.physicalUp = function (e) {
    var b = this.keys[e.code];
    if (b) b.classList.remove('down');
    var changed = false;
    if (e.shiftKey !== this.physShift) { this.physShift = e.shiftKey; changed = true; }
    if (e.altKey !== this.physAlt) { this.physAlt = e.altKey; changed = true; }
    if (changed) this.refresh();
  };

  VirtualKeyboard.prototype.releaseAll = function () {
    var self = this;
    Object.keys(this.keys).forEach(function (c) { self.keys[c].classList.remove('down'); });
    if (this.physShift || this.physAlt) {
      this.physShift = false; this.physAlt = false; this.refresh();
    }
  };

  /* Mashq rejimi: keyingi bosiladigan tugmani yoritish */
  VirtualKeyboard.prototype.setTarget = function (code, needShift) {
    var self = this;
    this.targetCodes.forEach(function (c) { if (self.keys[c]) self.keys[c].classList.remove('target'); });
    this.targetCodes = [];
    if (!code || !this.keys[code]) return;
    this.keys[code].classList.add('target');
    this.targetCodes.push(code);
    if (needShift) {
      var f = L.FINGERS[code];
      var sh = L.LEFT_HAND[f] ? 'ShiftRight' : 'ShiftLeft';
      this.keys[sh].classList.add('target');
      this.targetCodes.push(sh);
    }
  };

  /* Xatolar xaritasi: { code: count } */
  VirtualKeyboard.prototype.setHeat = function (heat) {
    var self = this;
    var max = 0;
    Object.keys(heat || {}).forEach(function (c) { if (heat[c] > max) max = heat[c]; });
    Object.keys(this.keys).forEach(function (c) {
      var b = self.keys[c];
      var v = heat && heat[c] ? heat[c] / max : 0;
      if (v > 0) {
        b.style.setProperty('--heat', v.toFixed(2));
        b.classList.add('heat');
        b.title = heat[c] + ' ta xato';
      } else {
        b.style.removeProperty('--heat');
        b.classList.remove('heat');
        b.removeAttribute('title');
      }
    });
  };

  global.VirtualKeyboard = VirtualKeyboard;
})(window);
