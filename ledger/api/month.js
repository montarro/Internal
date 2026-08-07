const { getSession, readBody } = require('./_lib');

function isMonth(m) {
  m = String(m || '');
  if (m.length !== 7) return false;
  if (m[4] !== '-') return false;
  for (let i = 0; i < 7; i++) {
    if (i === 4) continue;
    if (m[i] < '0' || m[i] > '9') return false;
  }
  return true;
}

function isDate(w) {
  w = String(w || '');
  if (w.length !== 10) return false;
  if (w[4] !== '-' || w[7] !== '-') return false;
  for (let i = 0; i < 10; i++) {
    if (i === 4 || i === 7) continue;
    if (w[i] < '0' || w[i] > '9') return false;
  }
  return true;
}

function sanitize(data) {
  const out = { budget: null, entries: [] };
  if (data && typeof data === 'object') {
    if (data.budget === null || data.budget === '' || typeof data.budget === 'number') {
      out.budget = (data.budget === '' ? null : data.budget);
    } else if (!isNaN(parseFloat(data.budget))) {
      out.budget = parseFloat(data.budget);
    }
    if (Array.isArray(data.entries)) {
      out.entries = data.entries.slice(0, 4000).map((e) => {
        const o = {
          id: e && e.id != null ? e.id : null,
          date: isDate(e && e.date) ? e.date : '',
          desc: String((e && e.desc) || '').slice(0, 200),
          amount: Number((e && e.amount) || 0),
        };
        if (e && (e.cat === 'bill' || e.cat === 'household' || e.cat === 'regular' || e.cat === 'gas' || e.cat === 'work')) o.cat = e.cat;
        return o;
      });
    }
  }
  return out;
}

module.exports = async (req, res) => {
  try {
    const { redis, uid } = await getSession(req);
    if (!uid) return res.status(401).json({ error: 'not signed in' });

    if (req.method === 'GET') {
      const month = req.query && req.query.month;
      if (!isMonth(month)) return res.status(400).json({ error: 'bad month' });
      const data = await redis.get(`month:${uid}:${month}`);
      return res.status(200).json(data && data.entries ? data : { budget: null, entries: [] });
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      const month = body.month;
      if (!isMonth(month)) return res.status(400).json({ error: 'bad month' });
      const clean = sanitize(body.data);
      await redis.set(`month:${uid}:${month}`, clean);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    if (err && err.message === 'NO_DB') {
      return res.status(503).json({ error: 'database not connected' });
    }
    console.error('month error', err);
    return res.status(500).json({ error: 'server error' });
  }
};
