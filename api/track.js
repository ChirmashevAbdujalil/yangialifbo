/*
 * Yangi Alifbo — reklama ko'rish va bosishlarini hisoblash (Vercel).
 *   POST /api/track   ad=<id>&e=v|c   (application/x-www-form-urlencoded)
 * Shaxsiy ma'lumot saqlanmaydi — faqat kunlik umumiy sonlar.
 */
'use strict';

const L = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return L.empty(res, 405);
  if (!L.storageReady()) return L.empty(res, 404);
  const ua = String(req.headers['user-agent'] || '');
  if (!ua || L.BOT_RE.test(ua)) return L.empty(res, 204);
  try {
    const b = await L.body(req, 2048);
    const id = String((b && b.ad) || '').slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, '');
    const ev = String((b && b.e) || '');
    if (!id || (ev !== 'v' && ev !== 'c')) return L.empty(res, 400);

    // Bir IP manzildan daqiqasiga ko'pi bilan 60 ta hodisa
    const rk = L.K.rlTrack(L.ipKey(req), Math.floor(Date.now() / 60000));
    const [n] = await L.pipeline([['INCR', rk], ['EXPIRE', rk, '120']]);
    if (Number(n) > 60) return L.empty(res, 429);

    // Faqat mavjud va faol reklamalar hisoblanadi
    const cfg = await L.getAds(false);
    if (!cfg.ads.some(a => a.id === id && a.enabled)) return L.empty(res, 404);

    await L.pipeline([
      ['HINCRBY', L.K.stat(id), L.today() + ':' + ev, '1'],
      ['SADD', L.K.statIds, id]
    ]);
    return L.empty(res, 204);
  } catch (e) {
    console.error(e);
    return L.empty(res, 500);
  }
};
