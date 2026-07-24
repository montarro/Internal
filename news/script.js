'use strict';

/*
 * Aymen's News frontend.
 * Talks to /api/news, renders the sidebar (topics, channel, language, nav),
 * a compact article feed with an optional featured story, and manages the
 * keyword filter, EN/FR/AR language switch and liked/saved articles (stored
 * in the browser so they persist and act as recommendations next time).
 */

const API = '/api/news';
const LANGS = ['en', 'fr', 'ar'];
const LIKES_KEY = 'aymen_likes_v1';
const READ_KEY = 'aymen_read_v1';

// UI translations. The language-switch buttons themselves stay Latin (EN/FR/AR)
// so the reader can always find their way back to English.
const I18N = {
  en: {
    tagline: "What's happening today",
    placeholder: 'Add a keyword (e.g. election, football, energy)…',
    refresh: 'Refresh', loading: 'Loading…', saved: 'Saved',
    latest: 'Latest News',
    channel: 'Channel', allChannels: 'All channels',
    topics: 'Topics', language: 'Language',
    clearFilters: 'Clear filters',
    featuredTag: 'Top story',
    noMatchTitle: 'No matching headlines',
    noMatchKeyword: (k) => `Nothing found for “${k}”. Try a broader keyword or add more topics.`,
    noTopic: 'Select at least one topic to build your feed.',
    errTitle: 'Could not load the news',
    errHint: "The news service didn't respond. Give it a moment and try again.",
    retry: 'Try again',
    savedEmptyTitle: 'No saved articles yet',
    savedEmptyHint: 'Tap the heart on any headline to save it here for next time.',
    headline: (n) => `${n} headline${n === 1 ? '' : 's'}`,
    savedCount: (n) => `${n} saved`,
    updated: 'Updated',
    updatedAt: (s) => `Updated ${s}`,
  },
  fr: {
    tagline: "L'actualité du jour",
    placeholder: 'Ajouter un mot-clé (ex. élection, football, énergie)…',
    refresh: 'Actualiser', loading: 'Chargement…', saved: 'Enregistrés',
    latest: 'Actualités',
    channel: 'Chaîne', allChannels: 'Toutes les chaînes',
    topics: 'Sujets', language: 'Langue',
    clearFilters: 'Effacer les filtres',
    featuredTag: 'À la une',
    noMatchTitle: 'Aucun titre correspondant',
    noMatchKeyword: (k) => `Rien trouvé pour « ${k} ». Essayez un mot-clé plus large ou ajoutez des sujets.`,
    noTopic: 'Sélectionnez au moins un sujet.',
    errTitle: 'Impossible de charger les actualités',
    errHint: "Le service n'a pas répondu. Patientez un instant puis réessayez.",
    retry: 'Réessayer',
    savedEmptyTitle: 'Aucun article enregistré',
    savedEmptyHint: 'Touchez le cœur sur un titre pour l’enregistrer ici.',
    headline: (n) => `${n} titre${n === 1 ? '' : 's'}`,
    savedCount: (n) => `${n} enregistré${n === 1 ? '' : 's'}`,
    updated: 'Mis à jour',
    updatedAt: (s) => `Mis à jour ${s}`,
  },
  ar: {
    tagline: 'أخبار اليوم',
    placeholder: 'أضف كلمة مفتاحية (مثال: انتخابات، كرة القدم، طاقة)…',
    refresh: 'تحديث', loading: 'جارٍ التحميل…', saved: 'المحفوظة',
    latest: 'آخر الأخبار',
    channel: 'القناة', allChannels: 'كل القنوات',
    topics: 'المواضيع', language: 'اللغة',
    clearFilters: 'مسح عوامل التصفية',
    featuredTag: 'أبرز خبر',
    noMatchTitle: 'لا توجد عناوين مطابقة',
    noMatchKeyword: (k) => `لا نتائج عن «${k}». جرّب كلمة أعمّ أو أضف مواضيع.`,
    noTopic: 'اختر موضوعًا واحدًا على الأقل.',
    errTitle: 'تعذّر تحميل الأخبار',
    errHint: 'لم يستجب الخادم. انتظر لحظة ثم أعد المحاولة.',
    retry: 'إعادة المحاولة',
    savedEmptyTitle: 'لا مقالات محفوظة بعد',
    savedEmptyHint: 'اضغط على القلب في أي عنوان لحفظه هنا للمرة القادمة.',
    headline: (n) => `${n} عنوان`,
    savedCount: (n) => `${n} محفوظ`,
    updated: 'آخر تحديث',
    updatedAt: (s) => `آخر تحديث ${s}`,
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
const HEART_OUTLINE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 20.2s-7-4.4-9.4-8.9C1 8.2 2.4 4.9 5.6 4.2c1.9-.4 3.8.4 5 2 1.2-1.6 3.1-2.4 5-2 3.2.7 4.6 4 3 7.1C19 15.8 12 20.2 12 20.2z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

const els = {
  sidebar: document.getElementById('sidebar'),
  menuBtn: document.getElementById('menuBtn'),
  closeMenuBtn: document.getElementById('closeMenuBtn'),
  scrim: document.getElementById('scrim'),
  mobileSavedBtn: document.getElementById('mobileSavedBtn'),
  chips: document.getElementById('chips'),
  topicsLabel: document.getElementById('topicsLabel'),
  languageLabel: document.getElementById('languageLabel'),
  feed: document.getElementById('feed'),
  featuredWrap: document.getElementById('featuredWrap'),
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  clearBtn: document.getElementById('clearBtn'),
  clearFiltersBtn: document.getElementById('clearFiltersBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  navLatest: document.getElementById('navLatest'),
  navLatestLabel: document.getElementById('navLatestLabel'),
  navSaved: document.getElementById('navSaved'),
  navSavedLabel: document.getElementById('navSavedLabel'),
  savedCount: document.getElementById('savedCount'),
  meta: document.getElementById('metaLine'),
  updatedLine: document.getElementById('updatedLine'),
  dateLine: document.getElementById('dateLine'),
  stateBox: document.getElementById('stateBox'),
  stateTitle: document.getElementById('stateTitle'),
  stateHint: document.getElementById('stateHint'),
  langSwitch: document.getElementById('langSwitch'),
  tagline: document.getElementById('tagline'),
  footer: document.getElementById('footer'),
  sourceSelect: document.getElementById('sourceSelect'),
  channelLabel: document.getElementById('channelLabel'),
};

let categories = FALLBACK_CATEGORIES;
let channels = [];
let selected = new Set(DEFAULT_SELECTED);
let keyword = '';
let lang = 'en';
let source = 'all';
let inflight = null;
let currentArticles = [];
let savedView = false;
let lastGeneratedAt = null;

const t = () => I18N[lang] || I18N.en;
const loc = () => (lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en-US');

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
  els.savedCount.textContent = likes.length ? String(likes.length) : '';
}

// ---------------------------------------------------------------------------
// Read state (persisted in the browser; purely a visual affordance).
// ---------------------------------------------------------------------------

function loadRead() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY)) || []); } catch { return new Set(); }
}
function saveRead() {
  try {
    // Cap so this never grows without bound.
    const arr = [...readLinks].slice(-500);
    localStorage.setItem(READ_KEY, JSON.stringify(arr));
  } catch { /* private mode */ }
}
let readLinks = loadRead();
function markRead(link) {
  if (readLinks.has(link)) return;
  readLinks.add(link);
  saveRead();
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
  source = params.get('s') || 'all';
}

function writeState() {
  const params = new URLSearchParams();
  params.set('c', [...selected].join(','));
  if (keyword) params.set('q', keyword);
  params.set('l', lang);
  if (source && source !== 'all') params.set('s', source);
  history.replaceState(null, '', '#' + params.toString());
}

// ---------------------------------------------------------------------------
// Mobile sidebar drawer.
// ---------------------------------------------------------------------------

function openDrawer() {
  els.sidebar.classList.add('is-open');
  els.scrim.hidden = false;
  els.menuBtn.setAttribute('aria-expanded', 'true');
}
function closeDrawer() {
  els.sidebar.classList.remove('is-open');
  els.scrim.hidden = true;
  els.menuBtn.setAttribute('aria-expanded', 'false');
}

// ---------------------------------------------------------------------------
// Language.
// ---------------------------------------------------------------------------

function renderDate() {
  els.dateLine.textContent = new Date().toLocaleDateString(loc(), {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function applyLanguageChrome() {
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
  els.tagline.textContent = t().tagline;
  els.searchInput.placeholder = t().placeholder;
  els.navLatestLabel.textContent = t().latest;
  els.navSavedLabel.textContent = t().saved;
  els.channelLabel.textContent = t().channel;
  els.topicsLabel.textContent = t().topics;
  els.languageLabel.textContent = t().language;
  els.clearFiltersBtn.textContent = t().clearFilters;
  els.footer.textContent = '';
  renderDate();
  els.langSwitch.querySelectorAll('.lang').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
  });
}

function buildChannelSelect() {
  const sel = els.sourceSelect;
  sel.innerHTML = '';
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = t().allChannels;
  sel.appendChild(all);
  for (const ch of channels) {
    const opt = document.createElement('option');
    opt.value = ch.key;
    opt.textContent = ch.label;
    sel.appendChild(opt);
  }
  sel.value = source;
  if (sel.value !== source) { source = 'all'; sel.value = 'all'; } // guard invalid
}

async function loadChannels() {
  try {
    const res = await fetch(`${API}?meta=channels&lang=${lang}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.channels)) channels = data.channels;
    }
  } catch {
    /* leave channels empty; only "All channels" shows */
  }
  buildChannelSelect();
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
  if (secs < 60) return t().updated;
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  return new Date(then).toLocaleDateString(loc(), { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function likeButtonHTML(a) {
  const liked = isLiked(a.link);
  return (
    `<button class="like" type="button" data-link="${escapeHtml(a.link)}" ` +
    `aria-pressed="${liked ? 'true' : 'false'}" aria-label="${escapeHtml(t().saved)}">${HEART_OUTLINE}</button>`
  );
}

function cardHTML(a) {
  const time = timeAgo(a.publishedAt);
  const isRead = readLinks.has(a.link);
  const img = a.image
    ? `<div class="card__imgwrap"><img class="card__img" src="${escapeHtml(a.image)}" alt="" loading="lazy" onerror="this.parentElement.remove()" /></div>`
    : '';
  return (
    `<a class="card${img ? '' : ' card--noimg'}${isRead ? ' card--read' : ''}" ` +
    `href="${encodeURI(a.link)}" target="_blank" rel="noopener noreferrer" data-link="${escapeHtml(a.link)}">` +
    img +
    '<div class="card__body">' +
    '<div class="card__top">' +
    `<span class="card__source">${escapeHtml(a.source)}</span>` +
    (time ? `<span class="card__dot">·</span><span class="card__time">${escapeHtml(time)}</span>` : '') +
    '</div>' +
    `<span class="card__title">${escapeHtml(a.title)}</span>` +
    (a.snippet ? `<div class="card__snippet">${escapeHtml(a.snippet)}</div>` : '') +
    `<div class="card__foot">${likeButtonHTML(a)}</div>` +
    '</div>' +
    '</a>'
  );
}

function featuredHTML(a) {
  const time = timeAgo(a.publishedAt);
  return (
    '<a class="featured" href="' + encodeURI(a.link) + '" target="_blank" rel="noopener noreferrer" data-link="' + escapeHtml(a.link) + '">' +
    '<div class="featured__grid">' +
    `<img class="featured__img" src="${escapeHtml(a.image)}" alt="" loading="lazy" onerror="this.remove()" />` +
    '<div class="featured__body">' +
    '<div class="featured__top">' +
    `<span class="featured__source">${escapeHtml(a.source)}</span>` +
    (time ? `<span>·</span><span>${escapeHtml(time)}</span>` : '') +
    '</div>' +
    `<div class="featured__title">${escapeHtml(a.title)}</div>` +
    (a.snippet ? `<div class="featured__snippet">${escapeHtml(a.snippet)}</div>` : '') +
    '<div class="featured__foot">' +
    `<span class="featured__tag">${escapeHtml(t().featuredTag)}</span>` +
    likeButtonHTML(a) +
    '</div>' +
    '</div>' +
    '</div>' +
    '</a>'
  );
}

function pickFeatured(list) {
  const scanDepth = Math.min(list.length, 12);
  for (let i = 0; i < scanDepth; i++) {
    if (list[i].image) return i;
  }
  return -1;
}

function showSkeletons(n = 7) {
  els.stateBox.hidden = true;
  els.featuredWrap.hidden = true;
  els.feed.setAttribute('aria-busy', 'true');
  let html = '';
  for (let i = 0; i < n; i++) {
    html +=
      '<div class="skeleton">' +
      '<div class="skeleton__thumb"></div>' +
      '<div class="skeleton__lines">' +
      '<div class="skeleton__line short"></div>' +
      '<div class="skeleton__line title"></div>' +
      '<div class="skeleton__line body"></div>' +
      '</div>' +
      '</div>';
  }
  els.feed.innerHTML = html;
}

function renderList(list) {
  els.feed.setAttribute('aria-busy', 'false');
  currentArticles = list;

  if (!list.length) {
    els.feed.innerHTML = '';
    els.featuredWrap.hidden = true;
    if (savedView) showState(t().savedEmptyTitle, t().savedEmptyHint);
    else showState(t().noMatchTitle, keyword ? t().noMatchKeyword(keyword) : t().noTopic);
    return;
  }
  els.stateBox.hidden = true;

  let rest = list;
  if (!savedView) {
    const idx = pickFeatured(list);
    if (idx !== -1) {
      els.featuredWrap.hidden = false;
      els.featuredWrap.innerHTML = featuredHTML(list[idx]);
      rest = list.slice(0, idx).concat(list.slice(idx + 1));
    } else {
      els.featuredWrap.hidden = true;
      els.featuredWrap.innerHTML = '';
    }
  } else {
    els.featuredWrap.hidden = true;
    els.featuredWrap.innerHTML = '';
  }

  els.feed.innerHTML = rest.map(cardHTML).join('');
}

function showState(title, hint, isError) {
  els.feed.innerHTML = '';
  els.featuredWrap.hidden = true;
  els.stateBox.hidden = false;
  els.stateBox.classList.toggle('state--error', !!isError);
  els.stateTitle.textContent = title;
  els.stateHint.textContent = hint;
  const existingRetry = els.stateBox.querySelector('.state__retry');
  if (existingRetry) existingRetry.remove();
  if (isError) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'state__retry';
    retry.textContent = t().retry;
    retry.addEventListener('click', () => (savedView ? showSaved() : load()));
    els.stateBox.appendChild(retry);
  }
}

function updateMeta(data) {
  const m = (data && data.meta) || {};
  els.meta.textContent = t().headline(m.total || 0);
  if (m.generatedAt) {
    lastGeneratedAt = m.generatedAt;
    els.updatedLine.textContent = t().updatedAt(
      new Date(m.generatedAt).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' })
    );
  }
  updateClearFilters();
}

function updateClearFilters() {
  const active = !!keyword || (source && source !== 'all');
  els.clearFiltersBtn.hidden = !active;
}

// ---------------------------------------------------------------------------
// Views.
// ---------------------------------------------------------------------------

function setNav(which) {
  els.navLatest.setAttribute('aria-pressed', which === 'latest' ? 'true' : 'false');
  els.navSaved.setAttribute('aria-pressed', which === 'saved' ? 'true' : 'false');
  els.mobileSavedBtn.setAttribute('aria-pressed', which === 'saved' ? 'true' : 'false');
}

function showSaved() {
  savedView = true;
  setNav('saved');
  if (inflight) inflight.abort();
  // Saved list ordered newest-liked first (acts as "recommended for next time").
  const list = likes.slice().sort((a, b) => (b.likedAt || 0) - (a.likedAt || 0));
  renderList(list);
  els.meta.textContent = t().savedCount(likes.length);
  els.updatedLine.textContent = '';
  els.clearFiltersBtn.hidden = true;
  closeDrawer();
}

async function load() {
  savedView = false;
  setNav('latest');
  if (inflight) inflight.abort();
  inflight = new AbortController();

  showSkeletons();
  els.meta.textContent = t().loading;

  const params = new URLSearchParams();
  params.set('categories', [...selected].join(','));
  if (keyword) params.set('q', keyword);
  params.set('lang', lang);
  params.set('source', source);

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
    showState(t().errTitle, t().errHint, true);
  } finally {
    els.refreshBtn.classList.remove('is-spinning');
  }
  closeDrawer();
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
  await Promise.all([loadCategories(), loadChannels()]);
  renderChips();
  if (savedView) showSaved();
  else load();
}

function onFeedClick(e) {
  const btn = e.target.closest('.like');
  const card = e.target.closest('.card, .featured');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    const link = btn.dataset.link;
    const article = currentArticles.find((a) => a.link === link);
    if (!article) return;
    toggleLike(article);
    const nowLiked = isLiked(link);
    btn.setAttribute('aria-pressed', nowLiked ? 'true' : 'false');
    btn.classList.remove('is-pulsing');
    void btn.offsetWidth;
    btn.classList.add('is-pulsing');
    // If we're viewing the saved list and just un-liked, drop the card.
    if (savedView && !nowLiked) showSaved();
    return;
  }
  if (card && card.dataset.link) {
    markRead(card.dataset.link);
    card.classList.add('card--read');
  }
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
  els.clearFiltersBtn.addEventListener('click', () => {
    keyword = '';
    source = 'all';
    els.searchInput.value = '';
    els.clearBtn.hidden = true;
    els.sourceSelect.value = 'all';
    writeState();
    load();
  });
  els.refreshBtn.addEventListener('click', () => {
    els.refreshBtn.classList.add('is-spinning');
    if (savedView) showSaved();
    else load();
  });
  els.navLatest.addEventListener('click', () => { if (savedView) load(); else closeDrawer(); });
  els.navSaved.addEventListener('click', () => { if (!savedView) showSaved(); else closeDrawer(); });
  els.mobileSavedBtn.addEventListener('click', () => {
    if (savedView) load();
    else showSaved();
  });
  els.feed.addEventListener('click', onFeedClick);
  els.featuredWrap.addEventListener('click', onFeedClick);
  els.sourceSelect.addEventListener('change', () => {
    source = els.sourceSelect.value || 'all';
    writeState();
    load();
  });
  els.langSwitch.querySelectorAll('.lang').forEach((b) => {
    b.addEventListener('click', () => setLanguage(b.dataset.lang));
  });
  els.menuBtn.addEventListener('click', () => {
    if (els.sidebar.classList.contains('is-open')) closeDrawer();
    else openDrawer();
  });
  els.closeMenuBtn.addEventListener('click', closeDrawer);
  els.scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
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
  await Promise.all([loadCategories(), loadChannels()]);
  renderChips();
  load();
})();
