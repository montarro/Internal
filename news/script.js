'use strict';

/*
 * Aymen's News frontend.
 * Talks to /api/news, renders article cards, and manages topic chips, keyword
 * filter, the EN/FR/AR language switch and liked/saved articles (stored in the
 * browser so they persist and act as recommendations next time).
 */

const API = '/api/news';
const LANGS = ['en', 'fr', 'ar'];
const LIKES_KEY = 'aymen_likes_v1';

// UI translations. The language-switch buttons themselves stay Latin (EN/FR/AR)
// so the reader can always find their way back to English.
const I18N = {
  en: {
    tagline: "What's happening today",
    placeholder: 'Add a keyword (e.g. election, football, energy)…',
    refresh: 'Refresh', loading: 'Loading…', saved: 'Saved',
    noMatchTitle: 'No matching headlines',
    noMatchKeyword: (k) => `Nothing found for “${k}”. Try a broader keyword or add more topics.`,
    noTopic: 'Select at least one topic above to build your feed.',
    errTitle: 'Could not load the news',
    errHint: "The news service didn't respond. Give it a moment and press Refresh.",
    savedEmptyTitle: 'No saved articles yet',
    savedEmptyHint: 'Tap the ♥ on any headline to save it here for next time.',
    headline: (n) => `${n} headline${n === 1 ? '' : 's'}`,
    savedCount: (n) => `${n} saved`,
    updated: 'updated',
  },
  fr: {
    tagline: "L'actualité du jour",
    placeholder: 'Ajouter un mot-clé (ex. élection, football, énergie)…',
    refresh: 'Actualiser', loading: 'Chargement…', saved: 'Enregistrés',
    noMatchTitle: 'Aucun titre correspondant',
    noMatchKeyword: (k) => `Rien trouvé pour « ${k} ». Essayez un mot-clé plus large ou ajoutez des sujets.`,
    noTopic: 'Sélectionnez au moins un sujet ci-dessus.',
    errTitle: 'Impossible de charger les actualités',
    errHint: "Le service n'a pas répondu. Patientez un instant puis appuyez sur Actualiser.",
    savedEmptyTitle: 'Aucun article enregistré',
    savedEmptyHint: 'Touchez le ♥ sur un titre pour l’enregistrer ici.',
    headline: (n) => `${n} titre${n === 1 ? '' : 's'}`,
    savedCount: (n) => `${n} enregistré${n === 1 ? '' : 's'}`,
    updated: 'mis à jour',
  },
  ar: {
    tagline: 'أخبار اليوم',
    placeholder: 'أضف كلمة مفتاحية (مثال: انتخابات، كرة القدم، طاقة)…',
    refresh: 'تحديث', loading: 'جارٍ التحميل…', saved: 'المحفوظة',
    noMatchTitle: 'لا توجد عناوين مطابقة',
    noMatchKeyword: (k) => `لا نتائج عن «${k}». جرّب كلمة أعمّ أو أضف مواضيع.`,
    noTopic: 'اختر موضوعًا واحدًا على الأقل بالأعلى.',
    errTitle: 'تعذّر تحميل الأخبار',
    errHint: 'لم يستجب الخادم. انتظر لحظة ثم اضغط تحديث.',
    savedEmptyTitle: 'لا مقالات محفوظة بعد',
    savedEmptyHint: 'اضغط على ♥ في أي عنوان لحفظه هنا للمرة القادمة.',
    headline: (n) => `${n} عنوان`,
    savedCount: (n) => `${n} محفوظ`,
    updated: 'آخر تحديث',
  },
};

const FALLBACK_CATEGORIES = [
  { key: 'world', label: 'World & Politics' },
  { key: 'sports', label: 'Soccer' },
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
  refreshLabel: document.getElementById('refreshLabel'),
  savedBtn: document.getElementById('savedBtn'),
  savedLabel: document.getElementById('savedLabel'),
  savedCount: document.getElementById('savedCount'),
  meta: document.getElementById('metaLine'),
  stateBox: document.getElementById('stateBox'),
  stateTitle: document.getElementById('stateTitle'),
  stateHint: document.getElementById('stateHint'),
  langSwitch: document.getElementById('langSwitch'),
  tagline: document.getElementById('tagline'),
  footer: document.getElementById('footer'),
};

let categories = FALLBACK_CATEGORIES;
let selected = new Set(DEFAULT_SELECTED);
let keyword = '';
let lang = 'en';
let inflight = null;
let currentArticles = [];
let savedView = false;

const t = () => I18N[lang] || I18N.en;

// ---------------------------------------------------------------------------
// Likes (persisted in the browser).
// ---------------------------------------------------------------------------

function loadLikes() {
  try { return JSON.parse(localStorage.getItem(LIKES_KEY)) || []; } catch { return []; }
}
function saveLikes(arr) {
  try { localStorage.setItem(LIKES_KEY, JSON.stringify(arr)); } catch { /* private mode */ }
}
let likes = loadLikes();
const isLiked = (link) => likes.some((l) => l.link === link);

function toggleLike(article) {
  if (isLiked(article.link)) {
    likes = likes.filter((l) => l.link !== article.link);
  } else {
    likes = [{ ...article, likedAt: Date.now() }, ...likes];
  }
  saveLikes(likes);
  updateSavedCount();
}

function updateSavedCount() {
  els.savedCount.textContent = likes.length ? `(${likes.length})` : '';
}

// ---------------------------------------------------------------------------
// URL state.
// ---------------------------------------------------------------------------

function readState() {
  const params = new URLSearchParams(location.hash.slice(1));
  const cats = params.get('c');
  if (cats !== null) selected = new Set(cats.split(',').filter(Boolean));
  keyword = params.get('q') || '';
  lang = LANGS.includes(params.get('l')) ? params.get('l') : 'en';
}

function writeState() {
  const params = new URLSearchParams();
  params.set('c', [...selected].join(','));
  if (keyword) params.set('q', keyword);
  params.set('l', lang);
  history.replaceState(null, '', '#' + params.toString());
}

// ---------------------------------------------------------------------------
// Language.
// ---------------------------------------------------------------------------

function applyLanguageChrome() {
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
  els.tagline.textContent = t().tagline;
  els.searchInput.placeholder = t().placeholder;
  els.refreshLabel.textContent = t().refresh;
  els.savedLabel.textContent = t().saved;
  els.footer.textContent = '';
  els.langSwitch.querySelectorAll('.lang').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
  });
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
      if (!savedView) load();
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
  const loc = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : undefined;
  if (secs < 60) return t().updated;
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  return new Date(then).toLocaleDateString(loc, { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function cardHTML(a) {
  const time = timeAgo(a.publishedAt);
  const liked = isLiked(a.link);
  return (
    '<article class="card">' +
    '<div class="card__top">' +
    `<span class="card__source">${escapeHtml(a.source)}</span>` +
    (time ? '<span class="card__dot">·</span><span class="card__time">' + escapeHtml(time) + '</span>' : '') +
    `<button class="like" type="button" data-link="${escapeHtml(a.link)}" aria-pressed="${liked ? 'true' : 'false'}" aria-label="Save">${liked ? '♥' : '♡'}</button>` +
    '</div>' +
    `<a class="card__title" href="${encodeURI(a.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title)}</a>` +
    (a.snippet ? `<div class="card__snippet">${escapeHtml(a.snippet)}</div>` : '') +
    '</article>'
  );
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

function renderList(list) {
  els.feed.setAttribute('aria-busy', 'false');
  currentArticles = list;
  if (!list.length) {
    els.feed.innerHTML = '';
    if (savedView) showState(t().savedEmptyTitle, t().savedEmptyHint);
    else showState(t().noMatchTitle, keyword ? t().noMatchKeyword(keyword) : t().noTopic);
    return;
  }
  els.stateBox.hidden = true;
  els.feed.innerHTML = list.map(cardHTML).join('');
}

function showState(title, hint) {
  els.feed.innerHTML = '';
  els.stateBox.hidden = false;
  els.stateTitle.textContent = title;
  els.stateHint.textContent = hint;
}

function updateMeta(data) {
  const m = (data && data.meta) || {};
  const parts = [t().headline(m.total || 0)];
  if (m.generatedAt) {
    const loc = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : undefined;
    parts.push(t().updated + ' ' + new Date(m.generatedAt).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }));
  }
  els.meta.textContent = parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Views.
// ---------------------------------------------------------------------------

function showSaved() {
  savedView = true;
  els.savedBtn.setAttribute('aria-pressed', 'true');
  if (inflight) inflight.abort();
  // Saved list ordered newest-liked first (acts as "recommended for next time").
  const list = likes.slice().sort((a, b) => (b.likedAt || 0) - (a.likedAt || 0));
  renderList(list);
  els.meta.textContent = t().savedCount(likes.length);
}

async function load() {
  savedView = false;
  els.savedBtn.setAttribute('aria-pressed', 'false');
  if (inflight) inflight.abort();
  inflight = new AbortController();

  showSkeletons();
  els.meta.textContent = t().loading;

  const params = new URLSearchParams();
  params.set('categories', [...selected].join(','));
  if (keyword) params.set('q', keyword);
  params.set('lang', lang);

  try {
    const res = await fetch(`${API}?${params.toString()}`, { signal: inflight.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderList((data && data.articles) || []);
    updateMeta(data);
  } catch (err) {
    if (err.name === 'AbortError') return;
    els.feed.setAttribute('aria-busy', 'false');
    els.meta.textContent = t().errTitle;
    showState(t().errTitle, t().errHint);
  } finally {
    els.refreshBtn.classList.remove('is-spinning');
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API}?meta=categories&lang=${lang}`);
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

async function setLanguage(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  writeState();
  applyLanguageChrome();
  await loadCategories();
  renderChips();
  if (savedView) showSaved();
  else load();
}

function onFeedClick(e) {
  const btn = e.target.closest('.like');
  if (!btn) return;
  const link = btn.dataset.link;
  const article = currentArticles.find((a) => a.link === link);
  if (!article) return;
  toggleLike(article);
  const nowLiked = isLiked(link);
  btn.setAttribute('aria-pressed', nowLiked ? 'true' : 'false');
  btn.textContent = nowLiked ? '♥' : '♡';
  // If we're viewing the saved list and just un-liked, drop the card.
  if (savedView && !nowLiked) showSaved();
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
  els.savedBtn.addEventListener('click', () => {
    if (savedView) load();
    else showSaved();
  });
  els.feed.addEventListener('click', onFeedClick);
  els.langSwitch.querySelectorAll('.lang').forEach((b) => {
    b.addEventListener('click', () => setLanguage(b.dataset.lang));
  });
}

// ---------------------------------------------------------------------------
// Init.
// ---------------------------------------------------------------------------

(async function init() {
  readState();
  applyLanguageChrome();
  els.searchInput.value = keyword;
  els.clearBtn.hidden = !keyword;
  updateSavedCount();
  wireEvents();
  await loadCategories();
  renderChips();
  load();
})();
