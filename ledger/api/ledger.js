// /api/ledger  (all require a signed-in session)
//   GET  ?week=YYYY-MM-DD           -> { budget, entries }
//   POST { week, data:{budget,entries} } -> save that week for this user

const { getSession, readBody } = require('./_lib');

function validWeek(w) {
  w = String(w || '');
  if (w.length !== 10) return false;
  if (w[4] !== '-' || w[7] !== '-') return false;
  for (let i = 0; i < 10; i++) {
    if (i === 4 || i === 7) continue;
    if (w[i] < '0' || w[i] > '9') return false;
  }
  return true;
}

// Keep only the fields we expect, so a client can't stuff arbitrary junk in.
function sanitize(data) {
  const out = { budget: null, entries: [] };
  if (data && typeof data === 'object') {
    if (data.budget === null || data.budget === '' || typeof data.budget === 'number') {
      out.budget = (data.budget === '' ? null : data.budget);
    } else if (!isNaN(parseFloat(data.budget))) {
      out.budget = parseFloat(data.budget);
    }
    if (Array.isArray(data.entries)) {
      out.entries = data.entries.slice(0, 2000).map((e) => ({
        id: e && e.id != null ? e.id : null,
        day: Math.max(0, Math.min(6, Number(e && e.day) || 0)),
        desc: String((e && e.desc) || '').slice(0, 200),
        amount: Number((e && e.amount) || 0),
        ...(e && e.flag ? { flag: String(e.flag).slice(0, 200) } : {}),
      }));
    }
  }
  return out;
}

module.exports = async (req, res) => {
  try {
    const { redis, uid } = await getSession(req);
    if (!uid) return res.status(401).json({ error: 'not signed in' });

    if (req.method === 'GET') {
      const week = req.query && req.query.week;
      if (!validWeek(week)) return res.status(400).json({ error: 'bad week' });
      const data = await redis.get(`data:${uid}:${week}`);
      return res.status(200).json(data && data.entries ? data : { budget: null, entries: [] });
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      const week = body.week;
      if (!validWeek(week)) return res.status(400).json({ error: 'bad week' });
      const clean = sanitize(body.data);
      await redis.set(`data:${uid}:${week}`, clean);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    if (err && err.message === 'NO_DB') {
      return res.status(503).json({ error: 'database not connected' });
    }
    console.error('ledger error', err);
    return res.status(500).json({ error: 'server error' });
  }
};
