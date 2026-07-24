// Shared helpers for the Weekly Ledger backend.
// Files under /api that start with "_" are NOT treated as routes by Vercel,
// so this is a plain shared module.

const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

// ---- database (Upstash Redis / Vercel KV) ----------------------------------
// The Vercel storage integration injects these automatically once you connect
// a KV / Upstash Redis store to the project. We read whichever names exist.
function getRedis() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('NO_DB'); // surfaced as a friendly message to the client
  }
  return new Redis({ url, token });
}

// ---- password hashing (Node built-in crypto, no external deps) -------------
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}
function newSalt() {
  return crypto.randomBytes(16).toString('hex');
}
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

// ---- signed session tokens -------------------------------------------------
// A tiny signed token: base64url(payload).hmac. The signing secret lives in the
// database (generated once) so no secret ever has to be hand-configured.
async function getSecret(redis) {
  let s = await redis.get('app:secret');
  if (!s) {
    const candidate = crypto.randomBytes(32).toString('hex');
    // NX = only set if absent, so two concurrent boots can't clobber each other
    await redis.set('app:secret', candidate, { nx: true });
    s = await redis.get('app:secret');
  }
  return String(s);
}
function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}
function signToken(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + mac;
}
function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (!mac || mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch (e) {
    return null;
  }
}

// ---- cookies ---------------------------------------------------------------
const COOKIE = 'sid';
function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
function sessionCookie(value, maxAgeSeconds) {
  const attrs = [
    `${COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  return attrs.join('; ');
}

// Returns the authenticated user id, or null. Also hands back the redis client
// and secret so callers don't re-fetch them.
async function getSession(req) {
  const redis = getRedis();
  const secret = await getSecret(redis);
  const token = parseCookies(req)[COOKIE];
  const payload = verifyToken(token, secret);
  if (!payload || !payload.uid) return { redis, secret, uid: null };
  return { redis, secret, uid: payload.uid, email: payload.email };
}

function readBody(req) {
  // Vercel Node functions parse JSON bodies automatically, but guard anyway.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

module.exports = {
  getRedis,
  hashPassword,
  newSalt,
  safeEqualHex,
  getSecret,
  signToken,
  verifyToken,
  parseCookies,
  sessionCookie,
  getSession,
  readBody,
  COOKIE,
};
