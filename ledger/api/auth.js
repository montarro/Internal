// /api/auth
//   GET                       -> { email } if signed in, else 401  (the "me" check)
//   POST { action:'signup', email, password }
//   POST { action:'login',  email, password }
//   POST { action:'logout' }

const crypto = require('crypto');
const {
  getRedis,
  getSecret,
  hashPassword,
  newSalt,
  safeEqualHex,
  signToken,
  sessionCookie,
  getSession,
  readBody,
  COOKIE,
} = require('./_lib');

const WEEK = 60 * 60 * 24 * 7; // session lifetime in seconds

function normalizeEmail(e) {
  return String(e || '').trim().toLowerCase();
}
function validEmail(e) {
  if (typeof e !== 'string' || e.length < 5 || e.indexOf(' ') !== -1) return false;
  const at = e.indexOf('@');
  const dot = e.lastIndexOf('.');
  return at > 0 && dot > at + 1 && dot < e.length - 1;
}

module.exports = async (req, res) => {
  try {
    // ---- GET: who am I? -----------------------------------------------------
    if (req.method === 'GET') {
      const { uid, email } = await getSession(req);
      if (!uid) return res.status(401).json({ error: 'not signed in' });
      return res.status(200).json({ email });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'method not allowed' });
    }

    const body = readBody(req);
    const action = body.action;

    // ---- logout -------------------------------------------------------------
    if (action === 'logout') {
      res.setHeader('Set-Cookie', sessionCookie('', 0));
      return res.status(200).json({ ok: true });
    }

    const redis = getRedis();
    const secret = await getSecret(redis);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const userKey = 'user:' + email;

    // ---- signup -------------------------------------------------------------
    if (action === 'signup') {
      const existing = await redis.get(userKey);
      if (existing) return res.status(409).json({ error: 'An account with that email already exists. Try signing in.' });
      const salt = newSalt();
      const hash = hashPassword(password, salt);
      const uid = crypto.randomBytes(12).toString('hex');
      const user = { uid, email, salt, hash, createdAt: Date.now() };
      // NX guards against a race creating the same email twice.
      const ok = await redis.set(userKey, user, { nx: true });
      if (ok === null) return res.status(409).json({ error: 'An account with that email already exists. Try signing in.' });
      const token = signToken({ uid, email }, secret);
      res.setHeader('Set-Cookie', sessionCookie(token, WEEK));
      return res.status(200).json({ email });
    }

    // ---- login --------------------------------------------------------------
    if (action === 'login') {
      const user = await redis.get(userKey);
      if (!user) return res.status(401).json({ error: 'Wrong email or password.' });
      const attempt = hashPassword(password, user.salt);
      if (!safeEqualHex(attempt, user.hash)) return res.status(401).json({ error: 'Wrong email or password.' });
      const token = signToken({ uid: user.uid, email }, secret);
      res.setHeader('Set-Cookie', sessionCookie(token, WEEK));
      return res.status(200).json({ email });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (err) {
    if (err && err.message === 'NO_DB') {
      return res.status(503).json({ error: 'The database is not connected yet. (Owner: connect a KV store in Vercel.)' });
    }
    console.error('auth error', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
