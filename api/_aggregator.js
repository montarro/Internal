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
// Sources per UI language. Where an outlet's own feed works we use it directly;
// where it blocks datacenters (Al Jazeera Arabic, Al Arabiya) we pull that
// outlet's articles through Google News scoped to its domain (site:…), which
// returns the outlet's real stories in the chosen language.
const SOURCE_FEEDS = {
  en: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC News' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml', source: 'Sky News' },
    { url: googleNews('site:english.alarabiya.net', 'en'), source: 'Al Arabiya' },
  ],
  fr: [
    { url: 'https://www.france24.com/fr/rss', source: 'France 24' },
  ],
  ar: [
    { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', source: 'BBC عربي' },
    { url: 'https://www.aljazeera.net/feed', source: 'الجزيرة' },
    { url: googleNews('site:alarabiya.net', 'ar'), source: 'العربية' },
    { url: 'https://www.skynewsarabia.com/rss', source: 'سكاي نيوز عربية' },
  ],
};

// Individually pickable channels. Each has a per-language domain so the search
// lands on the right edition (aljazeera.com in English, aljazeera.net in
// Arabic). Selecting one restricts the whole feed to that outlet.
const CHANNELS = {
  aljazeera: { label: { en: 'Al Jazeera', fr: 'Al Jazeera', ar: 'الجزيرة' }, domain: { en: 'aljazeera.com', fr: 'aljazeera.com', ar: 'aljazeera.net' } },
  bbc: { label: { en: 'BBC', fr: 'BBC', ar: 'BBC عربي' }, domain: { en: 'bbc.com', fr: 'bbc.com', ar: 'bbc.com/arabic' } },
  sky: { label: { en: 'Sky News', fr: 'Sky News', ar: 'سكاي نيوز عربية' }, domain: { en: 'news.sky.com', fr: 'news.sky.com', ar: 'skynewsarabia.com' } },
  alarabiya: { label: { en: 'Al Arabiya', fr: 'Al Arabiya', ar: 'العربية' }, domain: { en: 'english.alarabiya.net', fr: 'english.alarabiya.net', ar: 'alarabiya.net' } },
  france24: { label: { en: 'France 24', fr: 'France 24', ar: 'فرانس 24' }, domain: { en: 'france24.com', fr: 'france24.com', ar: 'france24.com' } },
  // Always shows Al Jazeera's Arabic edition regardless of the UI language
  // (the existing "aljazeera" channel already does this when UI language = AR;
  // this entry is for picking it while browsing the site in English/French).
  aljazeera_ar: { label: { en: 'Al Jazeera Arabic', fr: 'Al Jazeera Arabe', ar: 'الجزيرة (عربي)' }, domain: { en: 'aljazeera.net', fr: 'aljazeera.net', ar: 'aljazeera.net' } },
  bfmtv: { label: { en: 'BFM TV', fr: 'BFM TV', ar: 'بي إف إم تي في' }, domain: { en: 'bfmtv.com', fr: 'bfmtv.com', ar: 'bfmtv.com' } },
  tf1: { label: { en: 'TF1 Info', fr: 'TF1 Info', ar: 'تي إف 1' }, domain: { en: 'tf1info.fr', fr: 'tf1info.fr', ar: 'tf1info.fr' } },
  franceinfo: { label: { en: 'France Info', fr: 'France Info', ar: 'فرانس أنفو' }, domain: { en: 'franceinfo.fr', fr: 'franceinfo.fr', ar: 'franceinfo.fr' } },
  tv5monde: { label: { en: 'TV5 Monde', fr: 'TV5 Monde', ar: 'تي في 5 موند' }, domain: { en: 'tv5monde.com', fr: 'tv5monde.com', ar: 'tv5monde.com' } },
  skyau: { label: { en: 'Sky News Australia', fr: 'Sky News Australie', ar: 'سكاي نيوز أستراليا' }, domain: { en: 'skynews.com.au', fr: 'skynews.com.au', ar: 'skynews.com.au' } },
  abcau: { label: { en: 'ABC Australia', fr: 'ABC Australie', ar: 'إيه بي سي أستراليا' }, domain: { en: 'abc.net.au', fr: 'abc.net.au', ar: 'abc.net.au' } },
  rtarabic: { label: { en: 'RT Arabic', fr: 'RT Arabic', ar: 'آر تي بالعربية' }, domain: { en: 'arabic.rt.com', fr: 'arabic.rt.com', ar: 'arabic.rt.com' } },
  asharq: { label: { en: 'Asharq Al-Awsat', fr: 'Asharq Al-Awsat', ar: 'الشرق الأوسط (صحيفة)' }, domain: { en: 'aawsat.com', fr: 'aawsat.com', ar: 'aawsat.com' } },
};

// When a single channel is picked we read its OWN RSS feed (real article URLs +
// images) instead of a Google News search, so photos come through. Al Jazeera's
// feed omits thumbnails, so those get an og:image fetch (see getNews).
// Al Arabiya's own site (both editions) returns 403 to datacenter requests, and
// Google News redirect links resolve to a JS interstitial (not a real 302), so
// there is no way to fetch a real Al Arabiya article server-side — that channel
// stays on the Google News search below and never gets a photo. Confirmed by
// direct probing; not a bug to chase further.
const CHANNEL_FEEDS = {
  aljazeera: {
    en: ['https://www.aljazeera.com/xml/rss/all.xml'],
    fr: ['https://www.aljazeera.com/xml/rss/all.xml'],
    ar: ['https://www.aljazeera.net/feed'],
  },
  bbc: {
    en: ['https://feeds.bbci.co.uk/news/world/rss.xml'],
    fr: ['https://feeds.bbci.co.uk/news/world/rss.xml'],
    ar: ['https://feeds.bbci.co.uk/arabic/rss.xml'],
  },
  sky: {
    en: ['https://feeds.skynews.com/feeds/rss/world.xml'],
    fr: ['https://feeds.skynews.com/feeds/rss/world.xml'],
    ar: ['https://www.skynewsarabia.com/rss'],
  },
  alarabiya: {
    en: [googleNews('site:english.alarabiya.net', 'en')],
    fr: [googleNews('site:english.alarabiya.net', 'en')],
    ar: [googleNews('site:alarabiya.net', 'ar')],
  },
  france24: {
    en: ['https://www.france24.com/en/rss'],
    fr: ['https://www.france24.com/fr/rss'],
    ar: ['https://www.france24.com/ar/rss'],
  },
  // The following are single-language outlets: the same feed is used no matter
  // which UI language is selected, so the channel always shows its real,
  // native-language content.
  aljazeera_ar: { en: ['https://www.aljazeera.net/feed'], fr: ['https://www.aljazeera.net/feed'], ar: ['https://www.aljazeera.net/feed'] },
  franceinfo: { en: ['https://www.franceinfo.fr/titres.rss'], fr: ['https://www.franceinfo.fr/titres.rss'], ar: ['https://www.franceinfo.fr/titres.rss'] },
  tv5monde: { en: ['https://information.tv5monde.com/rss.xml'], fr: ['https://information.tv5monde.com/rss.xml'], ar: ['https://information.tv5monde.com/rss.xml'] },
  abcau: { en: ['https://www.abc.net.au/news/feed/51120/rss.xml'], fr: ['https://www.abc.net.au/news/feed/51120/rss.xml'], ar: ['https://www.abc.net.au/news/feed/51120/rss.xml'] },
  rtarabic: { en: ['https://arabic.rt.com/rss/'], fr: ['https://arabic.rt.com/rss/'], ar: ['https://arabic.rt.com/rss/'] },
  asharq: { en: ['https://aawsat.com/feed'], fr: ['https://aawsat.com/feed'], ar: ['https://aawsat.com/feed'] },
  // No working direct RSS found after probing several real candidate paths on
  // each site (all returned 404/empty, or the modern JS-rendered site has no
  // feed left). These fall back to a Google News site: search, which works but
  // — like Al Arabiya — carries no photos, since Google News links can't be
  // scraped for og:image (see fetchOgImage's exclusion). Confirmed by direct
  // probing, not a guess.
  bfmtv: { en: [googleNews('site:bfmtv.com', 'fr')], fr: [googleNews('site:bfmtv.com', 'fr')], ar: [googleNews('site:bfmtv.com', 'fr')] },
  tf1: { en: [googleNews('site:tf1info.fr', 'fr')], fr: [googleNews('site:tf1info.fr', 'fr')], ar: [googleNews('site:tf1info.fr', 'fr')] },
  skyau: { en: [googleNews('site:skynews.com.au', 'en')], fr: [googleNews('site:skynews.com.au', 'en')], ar: [googleNews('site:skynews.com.au', 'en')] },
};

// Loose topic matchers for narrowing a single channel's feed by chip. World is
// intentionally broad (matches everything).
const CAT_TERMS = {
  world: null,
  sports: ['soccer', 'football', 'كرة القدم'],
  tunisia: ['tunisia', 'tunisie', 'tunis', 'تونس'],
  middleeast: ['middle east', 'moyen-orient', 'الشرق الأوسط', 'gaza', 'israel', 'iran', 'syria', 'lebanon', 'palestin'],
  northafrica: ['maghreb', 'north africa', 'afrique du nord', 'algeria', 'morocco', 'libya', 'algérie', 'maroc', 'libye', 'المغرب', 'الجزائر', 'ليبيا', 'شمال أفريقيا'],
  france: ['france', 'french', 'française', 'français', 'فرنسا', 'macron', 'paris'],
};

function articleMatchesCategory(a, cat) {
  const terms = CAT_TERMS[cat];
  if (!terms) return true;
  const hay = `${a.title} ${a.snippet}`.toLowerCase();
  return terms.some((tm) => hay.includes(tm.toLowerCase()));
}

function normalizeLang(lang) {
  return LANGS.includes(lang) ? lang : 'en';
}

// Localized category list for the frontend chips.
function categoryList(lang) {
  const L = normalizeLang(lang);
  return Object.keys(CATEGORIES).map((key) => ({ key, label: CATEGORIES[key].label[L] }));
}

// Localized channel list for the source picker.
function channelList(lang) {
  const L = normalizeLang(lang);
  return Object.keys(CHANNELS).map((key) => ({ key, label: CHANNELS[key].label[L] }));
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

// Best-effort thumbnail from an item: media:content / media:thumbnail, an image
// enclosure, or the first <img> embedded in the description HTML.
function extractImage(block) {
  let m = block.match(/<media:(?:content|thumbnail)[^>]*\burl=["']([^"']+)["']/i);
  if (m) return normalizeImg(m[1]);
  m = block.match(/<enclosure[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\//i)
    || block.match(/<enclosure[^>]*\btype=["']image\/[^>]*\burl=["']([^"']+)["']/i);
  if (m) return normalizeImg(m[1]);
  m = block.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
  if (m) return normalizeImg(decodeEntities(m[1]));
  return null;
}

function normalizeImg(u) {
  if (!u) return null;
  u = u.trim();
  if (u.startsWith('//')) return 'https:' + u;
  return /^https?:\/\//i.test(u) ? u : null;
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
      image: extractImage(block),
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

// Fetch a page's preview image (og:image / twitter:image). Used to fill in
// thumbnails for channels whose RSS omits them (e.g. Al Jazeera). Only called
// for real publisher URLs, never Google News redirect links.
async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AymensNews/1.0)', Range: 'bytes=0-90000' },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok && res.status !== 206) return null;
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::url)?|twitter:image)["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::url)?|twitter:image)["']/i);
    return m ? normalizeImg(decodeEntities(m[1])) : null;
  } catch {
    return null;
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

async function getNews({ categories, q, limit, lang, source } = {}) {
  const L = normalizeLang(lang);
  const selected =
    Array.isArray(categories) && categories.length
      ? categories.filter((c) => CATEGORIES[c])
      : [];

  const query = (q || '').trim();
  const channelKey = CHANNELS[source] ? source : 'all';
  const cacheKey = JSON.stringify({ c: selected.slice().sort(), q: query.toLowerCase(), l: L, s: channelKey });
  const cached = cacheGet(cacheKey);
  if (cached) return { ...cached, cached: true };

  // Assemble the feed set — each category searched in the chosen language.
  const feeds = [];
  const usedCategories = selected.length ? selected : ['world', 'tunisia', 'middleeast', 'northafrica', 'france'];

  if (channelKey !== 'all') {
    // A single channel is picked: read its own RSS feed so real photos come
    // through. Topic narrowing happens after fetch (see below).
    const ch = CHANNELS[channelKey];
    const label = ch.label[L] || ch.label.en;
    const cf = CHANNEL_FEEDS[channelKey] || {};
    const urls = cf[L] || cf.en || [];
    for (const u of urls) feeds.push({ url: u, source: label });
  } else {
    for (const cat of usedCategories) {
      feeds.push({ url: googleNews(CATEGORIES[cat].q[L], L), source: 'Google News' });
      // The broad World view also pulls Aymen's preferred outlets directly.
      if (cat === 'world') {
        for (const sf of SOURCE_FEEDS[L] || []) feeds.push(sf);
      }
    }

    // A keyword turns into a live Google News search in the chosen language.
    if (query) {
      feeds.push({ url: googleNews(query, L), source: 'Google News' });
    }
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

  const byDateDesc = (a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  };

  // Keep each feed's articles as its own list (newest first), so no single
  // high-volume topic (e.g. "World & Politics") can bury the others.
  const lists = [];
  const sources = [];
  for (const r of results) {
    if (r.ok) {
      lists.push(r.articles.slice().sort(byDateDesc));
      sources.push({ url: r.feed.url, source: r.feed.source, count: r.articles.length });
    } else {
      sources.push({ url: r.feed.url, source: r.feed.source, error: r.error });
    }
  }

  // Round-robin across the feeds so every selected topic/channel is represented
  // near the top, while each feed stays newest-first internally.
  let articles = [];
  for (let i = 0, more = true; more; i++) {
    more = false;
    for (const lst of lists) {
      if (lst[i]) { articles.push(lst[i]); more = true; }
    }
  }

  articles = dedupe(articles);

  // Keyword filtering across every fetched article.
  if (query) {
    const phrase = query.toLowerCase();
    const tokens = phrase.split(/\s+/).filter((t) => t.length > 1);
    articles = articles.filter((a) => matchesQuery(a, tokens, phrase));
  }

  // In single-channel mode, narrow the outlet's feed to the picked topics —
  // but never to empty (fall back to the full feed so photos still show).
  if (channelKey !== 'all' && selected.length) {
    const narrowed = articles.filter((a) => selected.some((cat) => articleMatchesCategory(a, cat)));
    if (narrowed.length) articles = narrowed;
  }

  const capped = articles.slice(0, limit || 120);

  // Fill in missing thumbnails for a picked channel by reading each article's
  // og:image (real publisher URLs only — Google News links can't be scraped).
  if (channelKey !== 'all') {
    const need = capped
      .filter((a) => !a.image && /^https?:\/\//i.test(a.link) && !a.link.includes('news.google.com'))
      .slice(0, 10);
    await Promise.all(need.map(async (a) => {
      const img = await fetchOgImage(a.link);
      if (img) a.image = img;
    }));
  }

  const value = {
    articles: capped,
    meta: {
      total: capped.length,
      categories: usedCategories,
      lang: L,
      source: channelKey,
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

module.exports = { getNews, categoryList, channelList, parseFeed, dedupe, CATEGORIES };
