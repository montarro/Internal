'use strict';

/*
 * Aymen's News frontend.
 * Talks to /api/news, renders article cards, manages topic chips, keyword
 * filter and the EN/FR/AR language switch. State (topics + keyword + language)
 * lives in the URL hash so a view is bookmarkable.
 */

const API = '/api/news';
const LANGS = ['en', 'fr', 'ar'];

// UI translations. The language-switch buttons themselves stay Latin (EN/FR/AR)
// so the reader can always find their way back to English.
const I18N = {
  en: {
    tagline: "What's happening today",
    subtitle: 'Pick the subjects you care about and pull matching headlines from across the web.',
    placeholder: 'Add a keyword (e.g. election, football, energy)…',
    refresh: 'Refresh',
    loading: 'Loading…',
    footer: 'Headlines link out to their original publishers, gathered from across the web via Google News.',
    noMatchTitle: 'No matching headlines',
    noMatchKeyword: (k) => `Nothing found for “${k}”. Try a broader keyword or add more topics.`,
    noTopic: 'Select at least one topic above to build your feed.',
    errTitle: 'Could not load the news',
    errHint: "The news service didn't respond. Give it a moment and press Refresh.",
    headline: (n) => `${n} headline${n === 1 ? '' : 's'}`,
    updated: 'updated',
  },
  fr: {
    tagline: "L'actualité du jour",
    subtitle: 'Choisissez les sujets qui vous intéressent et recevez les titres correspondants de tout le web.',
    placeholder: 'Ajouter un mot-clé (ex. élection, football, énergie)…',
    refresh: 'Actualiser',
    loading: 'Chargement…',
    footer: "Les titres renvoient vers leurs éditeurs d'origine, rassemblés depuis tout le web via Google News.",
    noMatchTitle: 'Aucun titre correspondant',
    noMatchKeyword: (k) => `Rien trouvé pour « ${k} ». Essayez un mot-clé plus large ou ajoutez des sujets.`,
    noTopic: 'Sélectionnez au moins un sujet ci-dessus.',
    errTitle: 'Impossible de charger les actualités',
    errHint: "Le service n'a pas répondu. Patientez un instant puis appuyez sur Actualiser.",
    headline: (n) => `${n} titre${n === 1 ? '' : 's'}`,
    updated: 'mis à jour',
  },
  ar: {
    tagline: 'أخبار اليوم',
    subtitle: 'اختر المواضيع التي تهمّك واحصل على العناوين المطابقة من مختلف مواقع الويب.',
    placeholder: 'أضف كلمة مفتاحية (مثال: انتخابات، كرة القدم، طاقة)…',
    refresh: 'تحديث',
    loading: 'جارٍ التحميل…',
    footer: 'تحيل العناوين إلى مصادرها الأصلية، مجمّعة من مختلف مواقع الويب عبر Google News.',
    noMatchTitle: 'لا توجد عناوين مطابقة',
    noMatchKeyword: (k) => `لا نتائج عن «${k}». جرّب كلمة أعمّ أو أضف مواضيع.`,
    noTopic: 'اختر موضوعًا واحدًا على الأقل بالأعلى.',
    errTitle: 'تعذّر تحميل الأخبار',
    errHint: 'لم يستجب الخادم. انتظر لحظة ثم اضغط تحديث.',
    headline: (n) => `${n} عنوان`,
    updated: 'آخر تحديث',
  },
};

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
  refreshLabel: document.getElementById('refreshLabel'),
  meta: document.getElementById('metaLine'),
  stateBox: document.getElementById('stateBox'),
  stateTitle: document.getElementById('stateTitle'),
  stateHint: document.getElementById('stateHint'),
  langSwitch: document.getElementById('langSwitch'),
  tagline: document.getElementById('tagline'),
  subtitle: document.getElementById('subtitle'),
  footer: document.getElementById('footer'),
};

let categories = FALLBACK_CATEGORIES;
let selected = new Set(DEFAULT_SELECTED);
let keyword = '';
let lang = 'en';
let inflight = null;

const t = () => I18N[lang] || I18N.en;

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
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);

  els.tagline.textContent = t().tagline;
  els.subtitle.textContent = t().subtitle;
  els.searchInput.placeholder = t().placeholder;
  els.refreshLabel.textContent = t().refresh;
  els.footer.textContent = t().footer;

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
    showState(t().noMatchTitle, keyword ? t().noMatchKeyword(keyword) : t().noTopic);
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
  const parts = [t().headline(m.total || 0)];
  if (m.generatedAt) {
    const loc = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : undefined;
    parts.push(t().updated + ' ' + new Date(m.generatedAt).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }));
  }
  els.meta.textContent = parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Data loading.
// ---------------------------------------------------------------------------

async function load() {
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
    renderArticles(data);
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
  load();
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
  wireEvents();
  await loadCategories();
  renderChips();
  load();
})();
