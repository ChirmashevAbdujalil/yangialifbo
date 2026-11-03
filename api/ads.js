/*
 * Yangi Alifbo — saytdagi reklamalar ro'yxati (Vercel).
 *   GET /api/ads
 * Natija Vercel CDN'da 30 soniya saqlanadi — har bir sahifa ochilishida bazaga murojaat qilinmaydi.
 */
'use strict';

const L = require('./_lib');

module.exports = async function handler(req, res) {
  if (!L.storageReady()) return L.send(res, 404, { ok: false, error: 'not_configured' });
  try {
    const cfg = await L.getAds(false);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
    res.end(JSON.stringify(cfg));
  } catch (e) {
    console.error(e);
    L.send(res, 500, { ok: false, error: 'server' });
  }
};
