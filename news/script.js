'use strict';

/*
 * News Brief frontend.
 * Talks to /api/news, renders article cards, and manages the topic chips and
 * keyword filter. State (selected topics + keyword) is kept in the URL hash so
 * the reader can bookmark a particular view.
 */

const API = '/api/news';

// Fallback category list, used only if /api/news?meta=categories can't be
// reached (keeps the UI usable offline / on a bare static host).
const FALLBACK_CATEGORIES = [
  { key: 'world', label: 'World & Politics' },
  { key: 'sports', label: 'Sports' },
  { key: 'tunisia', label: 'Tunisia' },
  { key: 'middleeast', label: 'Middle East' },
  { key: 'northafrica', label: 'North Africa / Maghreb' },
  { key: 'france', label: 'France & French Politics' },
];

const DEFAULT_SELECTED = ['world', 'tunisia', 'middleeast', 'northafrica', 'france'];

const els = {
  chips: document.getElementById('chips'),
  feed: document.getElementById('feed'),
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  clearBtn: document.getElementById('clearBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  meta: document.getElementById('metaLine'),
  stateBox: document.getElementById('stateBox'),
  stateTitle: document.getElementById('stateTitle'),
  stateHint: document.getElementById('stateHint'),
};

let categories = FALLBACK_CATEGORIES;
let selected = new Set(DEFAULT_SELECTED);
let keyword = '';
let inflight = null; // AbortController for the current request

// ---------------------------------------------------------------------------
// URL state (so a view is bookmarkable / shareable).
// ---------------------------------------------------------------------------

function readState() {
  const params = new URLSearchParams(location.hash.slice(1));
  const cats = params.get('c');
  if (cats !== null) {
    selected = new Set(cats.split(',').filter(Boolean));
  }
  keyword = params.get('q') || '';
}

function writeState() {
  const params = new URLSearchParams();
  params.set('c', [...selected].join(','));
  if (keyword) params.set('q', keyword);
  history.replaceState(null, '', '#' + params.toString());
}

// ---------------------------------------------------------------------------
// Rendering.
// ---------------------------------------------------------------------------

function renderChips() {
  els.chips.innerHTML = '';
  for (const cat of categories) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = cat.label;
    btn.setAttribute('aria-pressed', selected.has(cat.key) ? 'true' : 'false');
    btn.addEventListener('click', () => {
      if (selected.has(cat.key)) selected.delete(cat.key);
      else selected.add(cat.key);
      btn.setAttribute('aria-pressed', selected.has(cat.key) ? 'true' : 'false');
      writeState();
      load();
    });
    els.chips.appendChild(btn);
  }
}

function timeAgo(iso) {
  if (!iso) return '';
  const then = Date.parse(iso);
  if (isNaN(then)) return '';
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (secs < 60) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function showSkeletons(n = 6) {
  els.stateBox.hidden = true;
  els.feed.setAttribute('aria-busy', 'true');
  let html = '';
  for (let i = 0; i < n; i++) {
    html +=
      '<div class="skeleton">' +
      '<div class="skeleton__line short"></div>' +
      '<div class="skeleton__line title"></div>' +
      '<div class="skeleton__line body"></div>' +
      '<div class="skeleton__line body b2"></div>' +
      '</div>';
  }
  els.feed.innerHTML = html;
}

function renderArticles(data) {
  els.feed.setAttribute('aria-busy', 'false');
  const articles = (data && data.articles) || [];

  if (!articles.length) {
    els.feed.innerHTML = '';
    showState(
      'No matching headlines',
      keyword
        ? `Nothing found for “${keyword}” in the selected topics. Try a broader keyword or add more topics.`
        : 'Select at least one topic above to build your brief.'
    );
    return;
  }

  els.stateBox.hidden = true;
  els.feed.innerHTML = articles
    .map((a) => {
      const time = timeAgo(a.publishedAt);
      return (
        `<a class="card" href="${encodeURI(a.link)}" target="_blank" rel="noopener noreferrer">` +
        '<div class="card__top">' +
        `<span class="card__source">${escapeHtml(a.source)}</span>` +
        (time ? '<span class="card__dot">·</span><span class="card__time">' + escapeHtml(time) + '</span>' : '') +
        '</div>' +
        `<div class="card__title">${escapeHtml(a.title)}</div>` +
        (a.snippet ? `<div class="card__snippet">${escapeHtml(a.snippet)}</div>` : '') +
        '</a>'
      );
    })
    .join('');
}

function showState(title, hint) {
  els.feed.innerHTML = '';
  els.stateBox.hidden = false;
  els.stateTitle.textContent = title;
  els.stateHint.textContent = hint;
}

function updateMeta(data) {
  const m = (data && data.meta) || {};
  const parts = [];
  parts.push(`${m.total || 0} headline${(m.total || 0) === 1 ? '' : 's'}`);
  if (typeof m.feedsOk === 'number' && typeof m.feedsQueried === 'number') {
    parts.push(`${m.feedsOk}/${m.feedsQueried} sources`);
  }
  if (m.generatedAt) {
    parts.push('updated ' + new Date(m.generatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
  }
  if (data && data.cached) parts.push('cached');
  els.meta.textContent = parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Data loading.
// ---------------------------------------------------------------------------

async function load() {
  if (inflight) inflight.abort();
  inflight = new AbortController();

  showSkeletons();
  els.meta.textContent = 'Loading your brief…';

  const params = new URLSearchParams();
  params.set('categories', [...selected].join(','));
  if (keyword) params.set('q', keyword);

  try {
    const res = await fetch(`${API}?${params.toString()}`, { signal: inflight.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderArticles(data);
    updateMeta(data);
  } catch (err) {
    if (err.name === 'AbortError') return;
    els.feed.setAttribute('aria-busy', 'false');
    els.meta.textContent = 'Could not load';
    showState(
      'Could not load the news',
      'The news service did not respond. If you just deployed, give it a moment and hit Refresh. (Locally, run: node news/server.js)'
    );
  } finally {
    els.refreshBtn.classList.remove('is-spinning');
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API}?meta=categories`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.categories) && data.categories.length) {
        categories = data.categories;
      }
    }
  } catch {
    /* keep fallback list */
  }
}

// ---------------------------------------------------------------------------
// Events.
// ---------------------------------------------------------------------------

let searchTimer = null;
function onSearchInput() {
  const val = els.searchInput.value.trim();
  els.clearBtn.hidden = !val;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    keyword = val;
    writeState();
    load();
  }, 400);
}

function wireEvents() {
  els.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(searchTimer);
    keyword = els.searchInput.value.trim();
    writeState();
    load();
  });
  els.searchInput.addEventListener('input', onSearchInput);
  els.clearBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    els.clearBtn.hidden = true;
    keyword = '';
    writeState();
    load();
  });
  els.refreshBtn.addEventListener('click', () => {
    els.refreshBtn.classList.add('is-spinning');
    load();
  });
}

// ---------------------------------------------------------------------------
// Init.
// ---------------------------------------------------------------------------

(async function init() {
  readState();
  els.searchInput.value = keyword;
  els.clearBtn.hidden = !keyword;
  wireEvents();
  await loadCategories();
  renderChips();
  load();
})();
