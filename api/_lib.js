/*
 * Yangi Alifbo — Vercel server funksiyalari uchun umumiy modul.
 * ("_" bilan boshlangan fayllar Vercel'da alohida funksiya bo'lmaydi.)
 *
 * Ma'lumotlar ombori: Upstash Redis (Vercel Marketplace orqali bir tugma bilan ulanadi).
 * Muhit o'zgaruvchilari (Vercel → Project → Settings → Environment Variables):
 *   ADMIN_PASSWORD                         — admin panel paroli (kamida 10 belgi)
 *   KV_REST_API_URL / KV_REST_API_TOKEN    — Upstash ulanganda avtomatik qo'shiladi
 *   (yoki UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
 *   SESSION_SECRET                         — ixtiyoriy, sessiya imzosi uchun
 * Tashqi kutubxona talab qilinmaydi (Node.js 18+ o'rnatilgan fetch va crypto).
 */
'use strict';

const crypto = require('crypto');

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const PASSWORD = process.env.ADMIN_PASSWORD || '';

const K = {
  ads: 'ya:ads',                       // reklamalar ro'yxati (JSON)
  names: 'ya:names',                   // hash: reklama id -> nomi
  statIds: 'ya:st:ids',                // set: statistikasi bor reklamalar
  stat: id => 'ya:st:' + id,           // hash: "YYYY-MM-DD:v" / "YYYY-MM-DD:c" -> son
  img: id => 'ya:img:' + id,           // reklama rasmi (JSON: type, data)
  rlLogin: ip => 'ya:rl:login:' + ip,  // noto'g'ri parol urinishlari
  rlTrack: (ip, m) => 'ya:rl:tr:' + ip + ':' + m
};

/* ---------------- Redis (Upstash REST) ---------------- */
function storageReady() { return !!(REDIS_URL && REDIS_TOKEN); }

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error('redis: ' + j.error);
  return j.result;
}

async function pipeline(cmds) {
  if (!cmds.length) return [];
  const r = await fetch(REDIS_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error('redis pipeline');
  return j.map(x => { if (x.error) throw new Error('redis: ' + x.error); return x.result; });
}

/* ---------------- HTTP yordamchilari ---------------- */
function send(res, code, data, headers) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  Object.keys(headers || {}).forEach(h => res.setHeader(h, headers[h]));
  res.end(JSON.stringify(data));
}

function empty(res, code) {
  res.statusCode = code;
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

function query(req) {
  if (req.query) return req.query;
  const u = new URL(req.url, 'http://x');
  return Object.fromEntries(u.searchParams);
}

/* So'rov tanasini o'qish (Vercel o'zi tahlil qilgan bo'lsa — o'shani ishlatish) */
async function body(req, limit) {
  let b;
  try { b = req.body; } catch (e) { b = undefined; }
  if (b !== undefined && b !== null && !(Buffer.isBuffer(b) && !b.length)) {
    if (Buffer.isBuffer(b)) b = b.toString('utf8');
    if (typeof b === 'string') return parseBody(b, req.headers['content-type']);
    return b;
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) { const e = new Error('too_large'); e.code = 413; throw e; }
    chunks.push(c);
  }
  return parseBody(Buffer.concat(chunks).toString('utf8'), req.headers['content-type']);
}
function parseBody(text, ctype) {
  ctype = String(ctype || '');
  if (ctype.indexOf('application/json') >= 0) { try { return JSON.parse(text || 'null'); } catch (e) { return null; } }
  if (ctype.indexOf('application/x-www-form-urlencoded') >= 0) return Object.fromEntries(new URLSearchParams(text));
  return text;
}

function cookies(req) {
  if (req.cookies) return req.cookies;
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function clientIp(req) {
  const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return f || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}
function ipKey(req) {
  return crypto.createHash('sha256').update(clientIp(req) + '|ya').digest('hex').slice(0, 32);
}

/* Toshkent vaqti bo'yicha bugungi sana: YYYY-MM-DD */
function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}

/* ---------------- Sessiya (imzolangan cookie) ---------------- */
const COOKIE = 'ya_admin';
const TTL = 8 * 3600;

function secret() {
  return crypto.createHash('sha256').update('ya-session|' + (process.env.SESSION_SECRET || '') + '|' + PASSWORD).digest();
}
function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return data + '.' + mac;
}
function verify(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const [data, mac] = token.split('.');
  const good = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  const a = Buffer.from(mac || ''), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return p && p.exp > Date.now() / 1000 ? p : null;
  } catch (e) { return null; }
}
function sessionCookie(token, maxAge) {
  return COOKIE + '=' + token + '; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge;
}
function session(req) { return verify(cookies(req)[COOKIE]); }

function passwordConfigured() { return PASSWORD.length >= 10 && PASSWORD !== 'PAROLNI_OZGARTIRING'; }
function passwordOk(input) {
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(PASSWORD).digest();
  return crypto.timingSafeEqual(a, b) && passwordConfigured();
}

/* ---------------- Reklamalar ---------------- */
const SLOTS = ['top', 'bottom'];
const TYPES = ['image', 'text', 'html'];
const PAGES = ['all', 'converter', 'editor', 'trainer', 'alphabet'];
const DEVICES = ['all', 'desktop', 'mobile'];

/* admin/save.php dagi clean_ads bilan bir xil tekshiruv */
function cleanAds(data) {
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const date = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  const ads = [];
  for (const a of (data && Array.isArray(data.ads) ? data.ads : [])) {
    if (!a || typeof a !== 'object') continue;
    const pages = (Array.isArray(a.pages) ? a.pages : []).filter(p => PAGES.indexOf(p) >= 0);
    ads.push({
      id: str(a.id, 40).replace(/[^a-zA-Z0-9_-]/g, '') || ('ad_' + crypto.randomBytes(4).toString('hex')),
      name: str(a.name, 120),
      enabled: !!a.enabled,
      slot: SLOTS.indexOf(a.slot) >= 0 ? a.slot : 'top',
      pages: pages.length ? pages : ['all'],
      device: DEVICES.indexOf(a.device) >= 0 ? a.device : 'all',
      start: date(a.start),
      end: date(a.end),
      closable: !!a.closable,
      type: TYPES.indexOf(a.type) >= 0 ? a.type : 'image',
      image: str(a.image, 600000),
      imageMobile: str(a.imageMobile, 600000),
      alt: str(a.alt, 200),
      link: str(a.link, 2000),
      title: str(a.title, 200),
      text: str(a.text, 1000),
      button: str(a.button, 60),
      html: str(a.html, 50000)
    });
    if (ads.length >= 100) break;
  }
  return { version: 1, updated: new Date().toISOString(), tracking: 'api/track', ads: ads };
}

/* Reklamalar ro'yxati (issiq funksiyada 30 soniya xotirada saqlanadi) */
let adsCache = null;
let adsCacheAt = 0;
async function getAds(fresh) {
  if (!fresh && adsCache && Date.now() - adsCacheAt < 30000) return adsCache;
  const raw = await redis(['GET', K.ads]);
  let d = null;
  try { d = raw ? JSON.parse(raw) : null; } catch (e) { d = null; }
  adsCache = d && Array.isArray(d.ads) ? d : { version: 1, tracking: 'api/track', ads: [] };
  adsCacheAt = Date.now();
  return adsCache;
}
function resetAdsCache() { adsCache = null; }

const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|telegram|whatsapp|curl|wget|python|java\//i;

module.exports = {
  K, redis, pipeline, storageReady, send, empty, query, body, cookies, ipKey, today,
  sign, verify, session, sessionCookie, passwordConfigured, passwordOk, TTL,
  cleanAds, getAds, resetAdsCache, BOT_RE
};
