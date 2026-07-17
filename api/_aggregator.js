'use strict';

/*
 * News aggregator core.
 *
 * Fetches RSS / Atom feeds server-side (so there are no browser CORS problems
 * and no dependency on a third-party proxy), parses them with a small
 * dependency-free parser, then de-duplicates, filters and sorts the results.
 *
 * Every category is backed by a Google News RSS *search* feed as well as a few
 * hand-picked publishers. The Google News backbone is what makes this pull
 * "news from all over the web matching the filters" rather than only the
 * handful of outlets we list by name.
 */

// ---------------------------------------------------------------------------
// Feed catalog — tuned to the reader: world/politics, sports, Tunisia,
// the wider Middle East, North Africa/Maghreb, and French politics.
// ---------------------------------------------------------------------------

const LANGS = ['en', 'fr', 'ar'];

// Build a Google News RSS search URL for a query in a given language/region.
function googleNews(query, lang) {
  const q = encodeURIComponent(query);
  if (lang === 'fr') return `https://news.google.com/rss/search?q=${q}&hl=fr&gl=FR&ceid=FR:fr`;
  if (lang === 'ar') return `https://news.google.com/rss/search?q=${q}&hl=ar&gl=EG&ceid=EG:ar`;
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

// Each category has a localized display label and a localized search query, so
// the same topic returns news in whichever language the reader picked.
const CATEGORIES = {
  world: {
    label: { en: 'World & Politics', fr: 'Monde & Politique', ar: 'العالم والسياسة' },
    q: { en: 'world politics', fr: 'politique mondiale', ar: 'العالم سياسة' },
  },
  sports: {
    label: { en: 'Soccer', fr: 'Football', ar: 'كرة القدم' },
    q: { en: 'soccer football', fr: 'football', ar: 'كرة القدم' },
  },
  tunisia: {
    label: { en: 'Tunisia', fr: 'Tunisie', ar: 'تونس' },
    q: { en: 'Tunisia', fr: 'Tunisie', ar: 'تونس' },
  },
  middleeast: {
    label: { en: 'Middle East', fr: 'Moyen-Orient', ar: 'الشرق الأوسط' },
    q: { en: '"Middle East"', fr: 'Moyen-Orient', ar: 'الشرق الأوسط' },
  },
  northafrica: {
    label: { en: 'North Africa / Maghreb', fr: 'Afrique du Nord / Maghreb', ar: 'شمال أفريقيا / المغرب العربي' },
    q: {
      en: 'Maghreb OR "North Africa" OR Algeria OR Morocco OR Libya',
      fr: 'Maghreb OR "Afrique du Nord" OR Algérie OR Maroc OR Libye',
      ar: 'المغرب العربي OR شمال أفريقيا OR الجزائر OR المغرب OR ليبيا',
    },
  },
  france: {
    label: { en: 'France & French Politics', fr: 'France & Politique', ar: 'فرنسا والسياسة' },
    q: { en: 'France politics', fr: 'politique française', ar: 'فرنسا سياسة' },
  },
};

// Aymen's preferred outlets, in the edition matching each UI language. Added to
// the broad "World & Politics" view. Best-effort URLs: if any feed is down the
// request still succeeds on the others (and on the Google News backbone).
const SOURCE_FEEDS = {
  en: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC News' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml', source: 'Sky News' },
    { url: 'https://english.alarabiya.net/.mrss/en.xml', source: 'Al Arabiya' },
  ],
  fr: [
    { url: 'https://www.france24.com/fr/rss', source: 'France 24' },
  ],
  ar: [
    { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', source: 'BBC عربي' },
    { url: 'https://www.aljazeera.net/xml/rss/all.xml', source: 'الجزيرة' },
    { url: 'https://www.alarabiya.net/.mrss/ar.xml', source: 'العربية' },
  ],
};

function normalizeLang(lang) {
  return LANGS.includes(lang) ? lang : 'en';
}

// Localized category list for the frontend chips.
function categoryList(lang) {
  const L = normalizeLang(lang);
  return Object.keys(CATEGORIES).map((key) => ({ key, label: CATEGORIES[key].label[L] }));
}

// ---------------------------------------------------------------------------
// Tiny XML helpers (dependency-free).
// ---------------------------------------------------------------------------

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function stripTags(str) {
  return decodeEntities(String(str || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

// Inner text of the first <tag ...>...</tag> in a block, CDATA-aware.
function firstTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : '';
}

// Links differ between RSS (<link>URL</link>) and Atom (<link href="URL"/>).
function extractLink(block) {
  const rss = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i);
  if (rss && rss[1].trim()) return decodeEntities(rss[1]).trim();
  const atom = block.match(/<link[^>]*\shref=["']([^"']+)["'][^>]*\/?>/i);
  if (atom) return decodeEntities(atom[1]).trim();
  return '';
}

function extractDate(block) {
  const raw =
    firstTag(block, 'pubDate') ||
    firstTag(block, 'published') ||
    firstTag(block, 'updated') ||
    firstTag(block, 'dc:date') ||
    firstTag(block, 'lastBuildDate');
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// Publisher name: <source> tag (Google News supplies it), else the feed's
// configured source, else the article's domain.
function extractSource(block, fallbackSource, link) {
  const src = firstTag(block, 'source');
  if (src) return stripTags(src);
  if (fallbackSource) return fallbackSource;
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown';
  }
}

// Parse one feed's XML into normalized article objects.
function parseFeed(xml, feedSource) {
  const articles = [];
  const blockRe = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[2];
    const title = stripTags(firstTag(block, 'title'));
    const link = extractLink(block);
    if (!title || !link) continue;

    const date = extractDate(block);
    const rawSnippet =
      firstTag(block, 'description') ||
      firstTag(block, 'summary') ||
      firstTag(block, 'content') ||
      firstTag(block, 'content:encoded');

    articles.push({
      title,
      link,
      source: extractSource(block, feedSource, link),
      publishedAt: date ? date.toISOString() : null,
      snippet: stripTags(rawSnippet).slice(0, 280),
    });
  }
  return articles;
}

// ---------------------------------------------------------------------------
// Fetching.
// ---------------------------------------------------------------------------

async function fetchFeed(feed, timeoutMs) {
  try {
    const res = await fetch(feed.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NewsBrief/1.0; +https://montarro.example)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { ok: false, feed, error: `HTTP ${res.status}` };
    const xml = await res.text();
    return { ok: true, feed, articles: parseFeed(xml, feed.source) };
  } catch (err) {
    return { ok: false, feed, error: err.message || String(err) };
  }
}

// ---------------------------------------------------------------------------
// De-dup, filter, sort.
// ---------------------------------------------------------------------------

function normalizeTitle(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function canonicalLink(link) {
  try {
    const u = new URL(link);
    return (u.hostname.replace(/^www\./, '') + u.pathname).toLowerCase();
  } catch {
    return link.toLowerCase();
  }
}

function dedupe(articles) {
  const seen = new Set();
  const out = [];
  for (const a of articles) {
    const key = `${normalizeTitle(a.title)}`;
    const linkKey = canonicalLink(a.link);
    if (seen.has(key) || seen.has(linkKey)) continue;
    seen.add(key);
    seen.add(linkKey);
    out.push(a);
  }
  return out;
}

function matchesQuery(article, tokens, phrase) {
  const hay = `${article.title} ${article.snippet}`.toLowerCase();
  if (phrase && hay.includes(phrase)) return true;
  return tokens.every((tok) => hay.includes(tok));
}

// ---------------------------------------------------------------------------
// Small in-memory cache. Warm serverless instances reuse this, so we are
// gentle on the upstream feeds and fast on repeat requests.
// ---------------------------------------------------------------------------

const CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheGet(key) {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  return null;
}

function cacheSet(key, value) {
  CACHE.set(key, { at: Date.now(), value });
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

async function getNews({ categories, q, limit, lang } = {}) {
  const L = normalizeLang(lang);
  const selected =
    Array.isArray(categories) && categories.length
      ? categories.filter((c) => CATEGORIES[c])
      : [];

  const query = (q || '').trim();
  const cacheKey = JSON.stringify({ c: selected.slice().sort(), q: query.toLowerCase(), l: L });
  const cached = cacheGet(cacheKey);
  if (cached) return { ...cached, cached: true };

  // Assemble the feed set — each category searched in the chosen language.
  const feeds = [];
  const usedCategories = selected.length ? selected : ['world', 'tunisia', 'middleeast', 'northafrica', 'france'];
  for (const cat of usedCategories) {
    feeds.push({ url: googleNews(CATEGORIES[cat].q[L], L), source: 'Google News' });
    // The broad World view also pulls Aymen's preferred outlets directly.
    if (cat === 'world') {
      for (const sf of SOURCE_FEEDS[L] || []) feeds.push(sf);
    }
  }

  // A keyword turns into a live Google News search in the chosen language, so
  // results are drawn from across the web, not just the categories above.
  if (query) {
    feeds.push({ url: googleNews(query, L), source: 'Google News' });
  }

  // De-duplicate identical feed URLs.
  const uniqueFeeds = [];
  const feedSeen = new Set();
  for (const f of feeds) {
    if (feedSeen.has(f.url)) continue;
    feedSeen.add(f.url);
    uniqueFeeds.push(f);
  }

  const results = await Promise.all(uniqueFeeds.map((f) => fetchFeed(f, 12000)));

  let articles = [];
  const sources = [];
  for (const r of results) {
    if (r.ok) {
      articles.push(...r.articles);
      sources.push({ url: r.feed.url, source: r.feed.source, count: r.articles.length });
    } else {
      sources.push({ url: r.feed.url, source: r.feed.source, error: r.error });
    }
  }

  articles = dedupe(articles);

  // Keyword filtering across every fetched article.
  if (query) {
    const phrase = query.toLowerCase();
    const tokens = phrase.split(/\s+/).filter((t) => t.length > 1);
    articles = articles.filter((a) => matchesQuery(a, tokens, phrase));
  }

  // Newest first; undated articles sink to the bottom.
  articles.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  const capped = articles.slice(0, limit || 120);

  const value = {
    articles: capped,
    meta: {
      total: capped.length,
      categories: usedCategories,
      lang: L,
      query: query || null,
      feedsQueried: uniqueFeeds.length,
      feedsOk: sources.filter((s) => !s.error).length,
      generatedAt: new Date().toISOString(),
      sources,
    },
    cached: false,
  };

  cacheSet(cacheKey, value);
  return value;
}

module.exports = { getNews, categoryList, parseFeed, dedupe, CATEGORIES };
