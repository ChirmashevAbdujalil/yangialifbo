/*
 * Yangi Alifbo — admin paneldan yuklangan reklama rasmlarini berish (Vercel).
 *   GET /api/ad-image?id=<id>
 * Rasm o'zgarmaydi (har bir yuklash yangi id oladi), shuning uchun CDN'da uzoq saqlanadi.
 */
'use strict';

const L = require('./_lib');

module.exports = async function handler(req, res) {
  const id = String(L.query(req).id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
  if (!id || !L.storageReady()) return L.empty(res, 404);
  try {
    const raw = await L.redis(['GET', L.K.img(id)]);
    if (!raw) return L.empty(res, 404);
    const img = JSON.parse(raw);
    if (!/^image\/(png|jpeg|gif|webp)$/.test(img.type)) return L.empty(res, 404);
    const buf = Buffer.from(img.data, 'base64');
    res.statusCode = 200;
    res.setHeader('Content-Type', img.type);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.end(buf);
  } catch (e) {
    console.error(e);
    return L.empty(res, 500);
  }
};
