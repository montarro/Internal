const { getSession, readBody } = require('./_lib');

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

function sanitizeBills(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 500).map((b) => ({
    id: b && b.id != null ? b.id : null,
    name: String((b && b.name) || '').slice(0, 200),
    date: isDate(b && b.date) ? b.date : '',
    cost: Number((b && b.cost) || 0),
  }));
}

module.exports = async (req, res) => {
  try {
    const { redis, uid } = await getSession(req);
    if (!uid) return res.status(401).json({ error: 'not signed in' });

    if (req.method === 'GET') {
      const data = await redis.get(`bills:${uid}`);
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      const clean = sanitizeBills(body.bills);
      await redis.set(`bills:${uid}`, clean);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    if (err && err.message === 'NO_DB') {
      return res.status(503).json({ error: 'database not connected' });
    }
    console.error('bills error', err);
    return res.status(500).json({ error: 'server error' });
  }
};
