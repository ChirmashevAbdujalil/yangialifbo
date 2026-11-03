/*
 * Yangi Alifbo — admin panel API (Vercel). admin/save.php bilan bir xil protokol:
 *   GET  /api/admin?action=ping
 *   POST /api/admin?action=login        password=...
 *   POST /api/admin?action=logout
 *   POST /api/admin?action=save         JSON (X-CSRF-Token)
 *   POST /api/admin?action=upload       JSON { type, data: base64 } (X-CSRF-Token)
 *   GET  /api/admin?action=stats
 *   POST /api/admin?action=stats_reset  id=... (X-CSRF-Token)
 */
'use strict';

const crypto = require('crypto');
const L = require('./_lib');

const MAX_FAILS = 5;
const LOCK_TIME = 900;
const MAX_ADS_JSON = 900 * 1024;   // Upstash bepul tarifida bitta so'rov ~1 MB gacha
const MAX_IMAGE = 700 * 1024;

const IMAGE_TYPES = {
  'image/png': b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47,
  'image/jpeg': b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  'image/gif': b => b.slice(0, 4).toString('ascii') === 'GIF8',
  'image/webp': b => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP'
};

function requireAuth(req, res, method) {
  if (method !== 'POST') { L.send(res, 405, { ok: false, error: 'method' }); return null; }
  const s = L.session(req);
  if (!s) { L.send(res, 401, { ok: false, error: 'auth' }); return null; }
  const t = String(req.headers['x-csrf-token'] || '');
  const a = Buffer.from(t), b = Buffer.from(String(s.csrf || ''));
  if (!t || a.length !== b.length || !crypto.timingSafeEqual(a, b)) { L.send(res, 403, { ok: false, error: 'csrf' }); return null; }
  return s;
}

module.exports = async function handler(req, res) {
  const action = String(L.query(req).action || 'ping');
  const method = req.method || 'GET';
  try {
    if (action === 'ping') {
      const s = L.session(req);
      return L.send(res, 200, {
        ok: true,
        mode: 'vercel',
        configured: L.passwordConfigured() && L.storageReady(),
        password: L.passwordConfigured(),
        storage: L.storageReady(),
        logged: !!s,
        csrf: s ? s.csrf : null,
        writable: L.storageReady()
      });
    }

    if (!L.storageReady() || !L.passwordConfigured()) {
      return L.send(res, 403, { ok: false, error: 'not_configured' });
    }

    if (action === 'login') {
      if (method !== 'POST') return L.send(res, 405, { ok: false, error: 'method' });
      const key = L.K.rlLogin(L.ipKey(req));
      const fails = Number(await L.redis(['GET', key])) || 0;
      if (fails >= MAX_FAILS) return L.send(res, 429, { ok: false, error: 'locked' });
      const b = await L.body(req, 10 * 1024);
      const password = b && typeof b === 'object' ? b.password : '';
      if (!L.passwordOk(password)) {
        await L.pipeline([['INCR', key], ['EXPIRE', key, String(LOCK_TIME)]]);
        await new Promise(r => setTimeout(r, 800));
        return L.send(res, 401, { ok: false, error: 'wrong' });
      }
      await L.redis(['DEL', key]);
      const csrf = crypto.randomBytes(32).toString('hex');
      const token = L.sign({ exp: Math.floor(Date.now() / 1000) + L.TTL, csrf: csrf });
      return L.send(res, 200, { ok: true, csrf: csrf }, { 'Set-Cookie': L.sessionCookie(token, L.TTL) });
    }

    if (action === 'logout') {
      return L.send(res, 200, { ok: true }, { 'Set-Cookie': L.sessionCookie('', 0) });
    }

    if (action === 'ads') {
      if (!L.session(req)) return L.send(res, 401, { ok: false, error: 'auth' });
      return L.send(res, 200, { ok: true, data: await L.getAds(true) });
    }

    if (action === 'stats') {
      if (!L.session(req)) return L.send(res, 401, { ok: false, error: 'auth' });
      const cfg = await L.getAds(true);
      const ids = new Set(cfg.ads.map(a => a.id));
      (await L.redis(['SMEMBERS', L.K.statIds]) || []).forEach(id => ids.add(id));
      const list = Array.from(ids);
      const rows = await L.pipeline(list.map(id => ['HGETALL', L.K.stat(id)]).concat([['HGETALL', L.K.names]]));
      const namesFlat = rows.pop() || [];
      const ads = {};
      list.forEach((id, i) => {
        const flat = rows[i] || [];
        const days = {};
        for (let j = 0; j < flat.length; j += 2) {
          const [day, ev] = String(flat[j]).split(':');
          if (!days[day]) days[day] = [0, 0];
          days[day][ev === 'c' ? 1 : 0] = Number(flat[j + 1]) || 0;
        }
        if (Object.keys(days).length) ads[id] = days;
      });
      const names = {};
      for (let j = 0; j < namesFlat.length; j += 2) names[namesFlat[j]] = namesFlat[j + 1];
      return L.send(res, 200, { ok: true, today: L.today(), ads: ads, names: names, writable: true });
    }

    // Quyidagi amallar — faqat kirgan administrator uchun, CSRF tokeni bilan
    if (!requireAuth(req, res, method)) return;

    if (action === 'save') {
      const b = await L.body(req, 4 * 1024 * 1024);
      if (!b || typeof b !== 'object' || !Array.isArray(b.ads)) return L.send(res, 400, { ok: false, error: 'invalid' });
      const clean = L.cleanAds(b);
      const json = JSON.stringify(clean);
      if (Buffer.byteLength(json) > MAX_ADS_JSON) return L.send(res, 413, { ok: false, error: 'too_large' });
      const cmds = [['SET', L.K.ads, json]];
      const names = [];
      clean.ads.forEach(a => { names.push(a.id, a.name || ''); });
      if (names.length) cmds.push(['HSET', L.K.names].concat(names));
      await L.pipeline(cmds);
      L.resetAdsCache();
      return L.send(res, 200, { ok: true });
    }

    if (action === 'upload') {
      const b = await L.body(req, 1.2 * 1024 * 1024);
      const type = b && typeof b === 'object' ? String(b.type || '') : '';
      const check = IMAGE_TYPES[type];
      if (!check || typeof b.data !== 'string') return L.send(res, 400, { ok: false, error: 'bad_type' });
      const buf = Buffer.from(b.data, 'base64');
      if (!buf.length) return L.send(res, 400, { ok: false, error: 'bad_type' });
      if (buf.length > MAX_IMAGE) return L.send(res, 413, { ok: false, error: 'too_large' });
      if (!check(buf)) return L.send(res, 400, { ok: false, error: 'bad_type' });
      const id = Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
      await L.redis(['SET', L.K.img(id), JSON.stringify({ type: type, data: buf.toString('base64') })]);
      return L.send(res, 200, { ok: true, url: 'api/ad-image?id=' + id });
    }

    if (action === 'stats_reset') {
      const b = await L.body(req, 10 * 1024);
      const id = String((b && b.id) || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (id) {
        await L.pipeline([['DEL', L.K.stat(id)], ['SREM', L.K.statIds, id]]);
      } else {
        const ids = await L.redis(['SMEMBERS', L.K.statIds]) || [];
        await L.pipeline(ids.map(x => ['DEL', L.K.stat(x)]).concat([['DEL', L.K.statIds]]));
      }
      return L.send(res, 200, { ok: true });
    }

    return L.send(res, 404, { ok: false, error: 'unknown_action' });
  } catch (e) {
    if (e && e.code === 413) return L.send(res, 413, { ok: false, error: 'too_large' });
    console.error(e);
    return L.send(res, 500, { ok: false, error: 'server' });
  }
};
