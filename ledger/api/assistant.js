// /api/assistant  (requires a signed-in session)
// POST { messages: [{role:'user'|'assistant', content:'...'}] }
//   -> { reply: string, bills: [...] }
// A small tool-using agent that manages the signed-in user's upcoming bills
// (a.k.a. monthly subscriptions) from natural language, backed by Claude.

const crypto = require('crypto');
const { getSession, readBody } = require('./_lib');

const MODEL = 'claude-haiku-4-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

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

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

const TOOLS = [
  {
    name: 'add_subscription',
    description: 'Add a new upcoming bill / monthly subscription for the user.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the bill or subscription, e.g. Netflix' },
        cost: { type: 'number', description: 'Cost in dollars, e.g. 22.99' },
        date: { type: 'string', description: 'Due date in YYYY-MM-DD format. Optional. Compute the next occurrence from today if the user gives a day of the month.' },
      },
      required: ['name', 'cost'],
    },
  },
  {
    name: 'update_subscription',
    description: 'Update the cost and/or due date of an existing bill, matched by name.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the existing bill to update.' },
        cost: { type: 'number', description: 'New cost in dollars. Optional.' },
        date: { type: 'string', description: 'New due date YYYY-MM-DD. Optional.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'remove_subscription',
    description: 'Remove an existing bill, matched by name.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the bill to remove.' },
      },
      required: ['name'],
    },
  },
];

function findBill(bills, name) {
  const n = String(name || '').trim().toLowerCase();
  return bills.find((b) => String(b.name || '').trim().toLowerCase() === n);
}

function execTool(bills, name, input) {
  input = input || {};
  if (name === 'add_subscription') {
    const nm = String(input.name || '').trim().slice(0, 200);
    const cost = Number(input.cost);
    if (!nm || isNaN(cost)) return { text: 'Could not add: need a name and a numeric cost.', changed: false };
    const date = isDate(input.date) ? input.date : '';
    bills.push({ id: newId(), name: nm, date, cost });
    return { text: 'Added ' + nm + ' ($' + cost.toFixed(2) + ')' + (date ? ' due ' + date : '') + '.', changed: true };
  }
  if (name === 'update_subscription') {
    const b = findBill(bills, input.name);
    if (!b) return { text: 'No bill named "' + input.name + '" found.', changed: false };
    if (input.cost !== undefined && !isNaN(Number(input.cost))) b.cost = Number(input.cost);
    if (isDate(input.date)) b.date = input.date;
    return { text: 'Updated ' + b.name + ' ($' + Number(b.cost).toFixed(2) + ')' + (b.date ? ' due ' + b.date : '') + '.', changed: true };
  }
  if (name === 'remove_subscription') {
    const b = findBill(bills, input.name);
    if (!b) return { text: 'No bill named "' + input.name + '" found.', changed: false };
    const idx = bills.indexOf(b);
    bills.splice(idx, 1);
    return { text: 'Removed ' + b.name + '.', changed: true };
  }
  return { text: 'Unknown tool.', changed: false };
}

async function callClaude(apiKey, body) {
  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

module.exports = async (req, res) => {
  try {
    const { redis, uid } = await getSession(req);
    if (!uid) return res.status(401).json({ error: 'not signed in' });

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method not allowed' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'The assistant is not set up yet. (Owner: add ANTHROPIC_API_KEY in Vercel, then redeploy.)' });
    }

    const body = readBody(req);
    const incoming = Array.isArray(body.messages) ? body.messages : [];
    // keep it cheap: only the last 20 turns, text only
    const convo = incoming
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));
    if (convo.length === 0 || convo[0].role !== 'user') {
      return res.status(400).json({ error: 'Say something to the assistant first.' });
    }

    let bills = await redis.get(`bills:${uid}`);
    if (!Array.isArray(bills)) bills = [];
    bills = bills.map((b) => (b && b.id != null ? b : { id: newId(), name: b && b.name, date: (b && b.date) || '', cost: Number((b && b.cost) || 0) }));

    const today = new Date().toISOString().slice(0, 10);
    const system =
      'You help the user manage their upcoming bills and monthly subscriptions in a personal finance app. ' +
      'Today is ' + today + '. Use the tools to add, update, or remove bills when the user asks. ' +
      'When the user gives a day of the month (e.g. "the 15th"), compute the next occurrence on or after today as a YYYY-MM-DD date. ' +
      'Treat "subscription" and "bill" as the same thing. Keep replies short and friendly, and confirm exactly what you changed. ' +
      'If the user just asks a question about their bills, answer from the current list without calling a tool. ' +
      'Current bills (JSON): ' + JSON.stringify(bills.map((b) => ({ name: b.name, cost: b.cost, date: b.date })));

    let changed = false;
    let reply = '';
    const messages = convo.slice();

    for (let i = 0; i < 6; i++) {
      const { ok, status, data } = await callClaude(apiKey, {
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: TOOLS,
        messages,
      });
      if (!ok) {
        console.error('anthropic error', status, data && data.error);
        return res.status(502).json({ error: 'The assistant had trouble responding. Please try again.' });
      }
      const content = Array.isArray(data.content) ? data.content : [];
      messages.push({ role: 'assistant', content });
      const toolUses = content.filter((b) => b.type === 'tool_use');
      const texts = content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
      if (texts) reply = texts;

      if (data.stop_reason !== 'tool_use' || toolUses.length === 0) break;

      const results = toolUses.map((tu) => {
        const out = execTool(bills, tu.name, tu.input);
        if (out.changed) changed = true;
        return { type: 'tool_result', tool_use_id: tu.id, content: out.text };
      });
      messages.push({ role: 'user', content: results });
    }

    if (changed) {
      await redis.set(`bills:${uid}`, bills);
    }
    return res.status(200).json({ reply: reply || 'Done.', bills });
  } catch (err) {
    if (err && err.message === 'NO_DB') {
      return res.status(503).json({ error: 'database not connected' });
    }
    console.error('assistant error', err);
    return res.status(500).json({ error: 'server error' });
  }
};
