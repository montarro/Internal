// /api/assistant  (requires a signed-in session)
// POST { messages: [{role:'user'|'assistant', content:'...'}] }
//   -> { reply, bills, updates:{ week:{key,data}, month:{key,data} } }
//
// A tool-using agent with access to the whole app: weekly entries, monthly
// entries, bills and budgets. It can log, edit and remove expenses, manage
// recurring bills, and move items between the two (e.g. turn a weekly gas
// expense into a monthly bill).

const crypto = require('crypto');
const { getSession, readBody } = require('./_lib');

const MODEL = 'claude-haiku-4-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const CATS = ['regular', 'bill', 'household', 'gas', 'food', 'work'];

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
function pad2(n) {
  return String(n).padStart(2, '0');
}
function monthOf(ds) {
  return ds ? ds.slice(0, 7) : '';
}
// Sunday-start week key for a YYYY-MM-DD date
function weekKeyOf(ds) {
  const p = ds.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
function dayIndexOf(ds) {
  const p = ds.split('-').map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
}
function addMonthsToDate(ds, n) {
  const p = ds.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1 + n, p[2]));
  return d.toISOString().slice(0, 10);
}
function cleanCat(c) {
  return CATS.indexOf(c) > -1 ? c : 'regular';
}
function num(v) {
  const n = Number(v);
  return isNaN(n) ? null : n;
}

const TOOLS = [
  {
    name: 'log_expense',
    description:
      'Record a new expense. Use scope "week" for day-to-day spending in the weekly tracker (the default for everyday purchases), or scope "month" for a one-off logged directly against the month. Always pass a real date.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'What the expense was for, e.g. Groceries' },
        amount: { type: 'number', description: 'Amount in dollars, e.g. 45.20' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD. Defaults to today if omitted.' },
        category: { type: 'string', enum: CATS, description: 'Expense category. Defaults to regular.' },
        scope: { type: 'string', enum: ['week', 'month'], description: 'Where to log it. Defaults to week.' },
      },
      required: ['description', 'amount'],
    },
  },
  {
    name: 'remove_expense',
    description: 'Delete an expense, matched by its description (and optionally date). Searches both weekly and monthly entries.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Description of the expense to remove.' },
        date: { type: 'string', description: 'YYYY-MM-DD to disambiguate. Optional.' },
      },
      required: ['description'],
    },
  },
  {
    name: 'add_bill',
    description: 'Add a recurring bill / monthly subscription.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Bill name, e.g. Netflix' },
        cost: { type: 'number', description: 'Monthly cost in dollars.' },
        date: { type: 'string', description: 'Next due date YYYY-MM-DD. Compute the next occurrence from today if the user gives a day of the month.' },
      },
      required: ['name', 'cost'],
    },
  },
  {
    name: 'update_bill',
    description: 'Change the cost and/or due date of an existing bill, matched by name.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        cost: { type: 'number' },
        date: { type: 'string', description: 'New due date YYYY-MM-DD.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'remove_bill',
    description: 'Delete a recurring bill, matched by name.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'expense_to_bill',
    description:
      'Turn an existing logged expense into a recurring monthly bill. Finds the expense by description, removes it from the tracker, and creates a bill with the same name and amount. Use when the user says things like "make my gas a recurring bill" or "move this into bills".',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Description of the expense to convert.' },
        due_date: { type: 'string', description: 'Next due date YYYY-MM-DD. Defaults to one month after the expense date.' },
      },
      required: ['description'],
    },
  },
  {
    name: 'pay_bill',
    description:
      'Mark a bill as paid: logs it as a bill expense in the current month and rolls the bill due date forward one month. Use when the user says a bill is paid.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Name of the bill that was paid.' } },
      required: ['name'],
    },
  },
  {
    name: 'set_budget',
    description: 'Set the weekly or monthly budget.',
    input_schema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['week', 'month'] },
        amount: { type: 'number', description: 'Budget in dollars. Pass 0 to clear.' },
      },
      required: ['scope', 'amount'],
    },
  },
];

// ---- in-memory working state, flushed to Redis at the end -------------------
function makeState(redis, uid, today) {
  return {
    redis,
    uid,
    today,
    weekKey: weekKeyOf(today),
    monthKey: monthOf(today),
    weeks: {},   // key -> {budget, entries}
    months: {},  // key -> {budget, entries}
    bills: [],
    dirtyWeeks: {},
    dirtyMonths: {},
    billsDirty: false,
  };
}
async function loadWeek(st, key) {
  if (st.weeks[key]) return st.weeks[key];
  let d = await st.redis.get(`data:${st.uid}:${key}`);
  if (!d || !Array.isArray(d.entries)) d = { budget: null, entries: [] };
  st.weeks[key] = d;
  return d;
}
async function loadMonth(st, key) {
  if (st.months[key]) return st.months[key];
  let d = await st.redis.get(`month:${st.uid}:${key}`);
  if (!d || !Array.isArray(d.entries)) d = { budget: null, entries: [] };
  st.months[key] = d;
  return d;
}
function findBill(bills, name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return null;
  let b = bills.find((x) => String(x.name || '').trim().toLowerCase() === n);
  if (b) return b;
  return bills.find((x) => String(x.name || '').trim().toLowerCase().indexOf(n) > -1) || null;
}
// Search loaded weeks + months for an entry by description
function findEntry(st, description, date) {
  const q = String(description || '').trim().toLowerCase();
  if (!q) return null;
  const match = (e) => {
    const d = String(e.desc || '').trim().toLowerCase();
    if (d !== q && d.indexOf(q) === -1) return false;
    return true;
  };
  for (const key of Object.keys(st.months)) {
    const m = st.months[key];
    for (let i = 0; i < m.entries.length; i++) {
      const e = m.entries[i];
      if (match(e) && (!date || e.date === date)) return { kind: 'month', key, idx: i, entry: e };
    }
  }
  for (const key of Object.keys(st.weeks)) {
    const w = st.weeks[key];
    for (let i = 0; i < w.entries.length; i++) {
      const e = w.entries[i];
      if (!match(e)) continue;
      if (date) {
        const p = key.split('-').map(Number);
        const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
        d.setUTCDate(d.getUTCDate() + (Number(e.day) || 0));
        if (d.toISOString().slice(0, 10) !== date) continue;
      }
      return { kind: 'week', key, idx: i, entry: e };
    }
  }
  return null;
}
function entryDate(st, hit) {
  if (hit.kind === 'month') return hit.entry.date || '';
  const p = hit.key.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  d.setUTCDate(d.getUTCDate() + (Number(hit.entry.day) || 0));
  return d.toISOString().slice(0, 10);
}

async function execTool(st, name, input) {
  input = input || {};

  if (name === 'log_expense') {
    const desc = String(input.description || '').trim().slice(0, 200);
    const amt = num(input.amount);
    if (!desc || amt === null) return 'Could not log: need a description and a numeric amount.';
    const date = isDate(input.date) ? input.date : st.today;
    const cat = cleanCat(input.category);
    const scope = input.scope === 'month' ? 'month' : 'week';
    if (scope === 'month') {
      const key = monthOf(date);
      const m = await loadMonth(st, key);
      m.entries.push({ id: newId(), date, desc, amount: amt, cat });
      st.dirtyMonths[key] = true;
      return 'Logged ' + desc + ' $' + amt.toFixed(2) + ' (' + cat + ') on ' + date + ' in the monthly tracker.';
    }
    const key = weekKeyOf(date);
    const w = await loadWeek(st, key);
    w.entries.push({ id: newId(), day: dayIndexOf(date), desc, amount: amt, cat });
    st.dirtyWeeks[key] = true;
    return 'Logged ' + desc + ' $' + amt.toFixed(2) + ' (' + cat + ') on ' + date + ' in the weekly tracker.';
  }

  if (name === 'remove_expense') {
    const hit = findEntry(st, input.description, isDate(input.date) ? input.date : null);
    if (!hit) return 'No expense matching "' + input.description + '" was found in the loaded weeks/months.';
    const label = hit.entry.desc + ' $' + Number(hit.entry.amount || 0).toFixed(2);
    if (hit.kind === 'month') {
      st.months[hit.key].entries.splice(hit.idx, 1);
      st.dirtyMonths[hit.key] = true;
    } else {
      st.weeks[hit.key].entries.splice(hit.idx, 1);
      st.dirtyWeeks[hit.key] = true;
    }
    return 'Removed ' + label + '.';
  }

  if (name === 'add_bill') {
    const nm = String(input.name || '').trim().slice(0, 200);
    const cost = num(input.cost);
    if (!nm || cost === null) return 'Could not add: need a name and a numeric cost.';
    const date = isDate(input.date) ? input.date : '';
    st.bills.push({ id: newId(), name: nm, date, cost });
    st.billsDirty = true;
    return 'Added bill ' + nm + ' $' + cost.toFixed(2) + (date ? ' due ' + date : '') + '.';
  }

  if (name === 'update_bill') {
    const b = findBill(st.bills, input.name);
    if (!b) return 'No bill named "' + input.name + '" found.';
    const cost = num(input.cost);
    if (cost !== null) b.cost = cost;
    if (isDate(input.date)) b.date = input.date;
    st.billsDirty = true;
    return 'Updated ' + b.name + ' $' + Number(b.cost).toFixed(2) + (b.date ? ' due ' + b.date : '') + '.';
  }

  if (name === 'remove_bill') {
    const b = findBill(st.bills, input.name);
    if (!b) return 'No bill named "' + input.name + '" found.';
    st.bills.splice(st.bills.indexOf(b), 1);
    st.billsDirty = true;
    return 'Removed bill ' + b.name + '.';
  }

  if (name === 'expense_to_bill') {
    const hit = findEntry(st, input.description, null);
    if (!hit) return 'No expense matching "' + input.description + '" was found.';
    const e = hit.entry;
    const amt = Number(e.amount || 0);
    const nm = String(e.desc || '').slice(0, 200);
    const from = entryDate(st, hit);
    const due = isDate(input.due_date) ? input.due_date : (from ? addMonthsToDate(from, 1) : '');
    if (hit.kind === 'month') {
      st.months[hit.key].entries.splice(hit.idx, 1);
      st.dirtyMonths[hit.key] = true;
    } else {
      st.weeks[hit.key].entries.splice(hit.idx, 1);
      st.dirtyWeeks[hit.key] = true;
    }
    st.bills.push({ id: newId(), name: nm, date: due, cost: amt });
    st.billsDirty = true;
    return 'Moved ' + nm + ' $' + amt.toFixed(2) + ' out of the ' + (hit.kind === 'week' ? 'weekly' : 'monthly') +
      ' tracker and created a recurring bill' + (due ? ', next due ' + due : '') + '.';
  }

  if (name === 'pay_bill') {
    const b = findBill(st.bills, input.name);
    if (!b) return 'No bill named "' + input.name + '" found.';
    const key = st.monthKey;
    const m = await loadMonth(st, key);
    m.entries.push({ id: newId(), date: st.today, desc: b.name, amount: Number(b.cost || 0), cat: 'bill' });
    st.dirtyMonths[key] = true;
    if (b.date) b.date = addMonthsToDate(b.date, 1);
    st.billsDirty = true;
    return 'Marked ' + b.name + ' paid: logged $' + Number(b.cost || 0).toFixed(2) +
      ' to ' + key + (b.date ? ' and moved the due date to ' + b.date : '') + '.';
  }

  if (name === 'set_budget') {
    const amt = num(input.amount);
    if (amt === null) return 'Need a numeric budget amount.';
    const val = amt > 0 ? amt : null;
    if (input.scope === 'month') {
      const m = await loadMonth(st, st.monthKey);
      m.budget = val;
      st.dirtyMonths[st.monthKey] = true;
      return val === null ? 'Cleared the monthly budget.' : 'Monthly budget set to $' + val.toFixed(2) + '.';
    }
    const w = await loadWeek(st, st.weekKey);
    w.budget = val;
    st.dirtyWeeks[st.weekKey] = true;
    return val === null ? 'Cleared the weekly budget.' : 'Weekly budget set to $' + val.toFixed(2) + '.';
  }

  return 'Unknown tool.';
}

// Build a compact snapshot of the user's finances for the system prompt.
function snapshot(st) {
  const w = st.weeks[st.weekKey] || { budget: null, entries: [] };
  const m = st.months[st.monthKey] || { budget: null, entries: [] };
  const weekList = w.entries.map((e) => ({
    desc: e.desc, amount: e.amount, cat: e.cat || 'regular', day: e.day,
  }));
  const monthList = m.entries.map((e) => ({
    desc: e.desc, amount: e.amount, cat: e.cat || 'regular', date: e.date,
  }));
  const catTotal = (list, c) =>
    list.filter((x) => (x.cat || 'regular') === c).reduce((s, x) => s + Number(x.amount || 0), 0);
  const all = weekList.concat(monthList);
  const totals = {};
  CATS.forEach((c) => { totals[c] = Number(catTotal(all, c).toFixed(2)); });
  return {
    today: st.today,
    this_week_starting: st.weekKey,
    this_month: st.monthKey,
    weekly_budget: w.budget,
    monthly_budget: m.budget,
    weekly_entries: weekList,
    monthly_entries: monthList,
    category_totals_week_plus_month: totals,
    bills: st.bills.map((b) => ({ name: b.name, cost: b.cost, date: b.date })),
  };
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
    const convo = incoming
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));
    if (convo.length === 0 || convo[0].role !== 'user') {
      return res.status(400).json({ error: 'Say something to the assistant first.' });
    }

    const now = new Date();
    const today = now.getUTCFullYear() + '-' + pad2(now.getUTCMonth() + 1) + '-' + pad2(now.getUTCDate());
    const st = makeState(redis, uid, today);

    // Preload the current week, current month and bills so the model has context
    // and findEntry() has something to search.
    await loadWeek(st, st.weekKey);
    await loadMonth(st, st.monthKey);
    let storedBills = await redis.get(`bills:${uid}`);
    if (!Array.isArray(storedBills)) storedBills = [];
    st.bills = storedBills.map((b) =>
      b && b.id != null ? b : { id: newId(), name: b && b.name, date: (b && b.date) || '', cost: Number((b && b.cost) || 0) });

    const system =
      'You are the assistant inside a personal finance tracker. You can see and change the weekly expenses, monthly expenses, recurring bills and budgets for the person you are talking to, using the tools provided. ' +
      'Today is ' + today + '. ' +
      'Everyday purchases belong in the weekly tracker (scope "week"); use scope "month" only when the user clearly means a monthly one-off. ' +
      'Categories are: regular (default), bill, household, gas, food, work. Household is tracked separately from the spending total. ' +
      'When the user gives a day of the month (e.g. "the 15th"), compute the next occurrence on or after today as YYYY-MM-DD. ' +
      'When the user wants a recurring expense moved into bills, use expense_to_bill. When they say a bill is paid, use pay_bill. ' +
      'If the user only asks a question, answer from the snapshot below without calling a tool. ' +
      'Keep replies short, friendly and concrete - state exactly what you changed and the amounts. Never invent numbers that are not in the data. ' +
      'Current data (JSON): ' + JSON.stringify(snapshot(st));

    let reply = '';
    const messages = convo.slice();

    for (let i = 0; i < 8; i++) {
      const { ok, status, data } = await callClaude(apiKey, {
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: TOOLS,
        messages,
      });
      if (!ok) {
        console.error('anthropic error', status, data && data.error);
        const msg = data && data.error && data.error.message ? String(data.error.message) : '';
        if (msg.toLowerCase().indexOf('credit balance') > -1) {
          return res.status(502).json({ error: 'The assistant is out of API credit. (Owner: add credit at console.anthropic.com.)' });
        }
        return res.status(502).json({ error: 'The assistant had trouble responding. Please try again.' });
      }
      const content = Array.isArray(data.content) ? data.content : [];
      messages.push({ role: 'assistant', content });
      const toolUses = content.filter((b) => b.type === 'tool_use');
      const texts = content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
      if (texts) reply = texts;

      if (data.stop_reason !== 'tool_use' || toolUses.length === 0) break;

      const results = [];
      for (const tu of toolUses) {
        let out;
        try {
          out = await execTool(st, tu.name, tu.input);
        } catch (e) {
          console.error('tool error', tu.name, e);
          out = 'That action failed.';
        }
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: out });
      }
      messages.push({ role: 'user', content: results });
    }

    // ---- flush changes ----
    const weekKeys = Object.keys(st.dirtyWeeks);
    const monthKeys = Object.keys(st.dirtyMonths);
    for (const k of weekKeys) await redis.set(`data:${uid}:${k}`, st.weeks[k]);
    for (const k of monthKeys) await redis.set(`month:${uid}:${k}`, st.months[k]);
    if (st.billsDirty) await redis.set(`bills:${uid}`, st.bills);

    // Hand the client back whatever it needs to re-render without a refetch.
    const updates = {};
    if (weekKeys.indexOf(st.weekKey) > -1) updates.week = { key: st.weekKey, data: st.weeks[st.weekKey] };
    else if (weekKeys.length) updates.week = { key: weekKeys[0], data: st.weeks[weekKeys[0]] };
    if (monthKeys.indexOf(st.monthKey) > -1) updates.month = { key: st.monthKey, data: st.months[st.monthKey] };
    else if (monthKeys.length) updates.month = { key: monthKeys[0], data: st.months[monthKeys[0]] };

    return res.status(200).json({ reply: reply || 'Done.', bills: st.bills, updates });
  } catch (err) {
    if (err && err.message === 'NO_DB') {
      return res.status(503).json({ error: 'database not connected' });
    }
    console.error('assistant error', err);
    return res.status(500).json({ error: 'server error' });
  }
};
