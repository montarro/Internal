# News Brief · filtered personal news feed

A small, personal news dashboard. The reader picks the subjects they care about
(and can add a free-text keyword) and gets matching headlines pulled from across
the web — each linking out to the original publisher.

Built for a reader who follows **world & politics, sports, Tunisia, the wider
Middle East, North Africa / Maghreb, and French politics** (English + French
sources).

## How it works

```
Browser (news/)  ──►  /api/news  ──►  fetches & parses RSS/Atom feeds
                                       de-dupes · filters by keyword · sorts newest-first
```

- **`api/_aggregator.js`** — the feed catalog + a dependency-free RSS/Atom
  parser, plus de-dup / keyword-filter / sort logic and a 5-minute in-memory
  cache.
- **`api/news.js`** — the Vercel serverless endpoint (`GET /api/news`).
- **`news/`** — the static frontend (`index.html`, `style.css`, `script.js`).
- **`news/server.js`** — a tiny local dev server that reuses the exact same API
  handler, so local testing matches production.

Feeds are fetched **server-side**, so there are no browser CORS issues and no
reliance on a third-party proxy.

### News from "all over the web"

Every category is backed by a **Google News RSS search** feed alongside named
publishers (BBC, The Guardian, Al Jazeera, Le Monde, France 24, Middle East
Eye…). A keyword in the search box runs live Google News searches in both
English and French, so results are drawn from thousands of outlets — not just
the ones listed by name.

## Run locally

No dependencies, no build step. Requires Node 18+ (for built-in `fetch`).

```bash
node news/server.js
# open http://localhost:3000
```

## Deploy on Vercel

This lives in the same repo as the Scorecard and deploys the same way — the
`api/` folder is automatically turned into a serverless function.

1. Push to GitHub.
2. In Vercel, import the repo (Framework Preset: **Other**, no build command).
3. Deploy. The news app is served at `/news/` and the API at `/api/news`.

## API

`GET /api/news`

| Param | Example | Meaning |
| --- | --- | --- |
| `categories` | `world,tunisia,sports` | Comma-separated topic keys. Omit for a sensible default set. |
| `q` | `election` | Optional keyword filter (also triggers live EN+FR web search). |
| `limit` | `120` | Max articles (capped at 200). |
| `meta=categories` | — | Returns the list of available topics. |

Response: `{ articles: [{ title, link, source, publishedAt, snippet }], meta: {…} }`

## Customize the topics

Edit the `CATEGORIES` object in `api/_aggregator.js`. Each category is a label
plus a list of feed URLs. Use the `googleNews('your query', 'en' | 'fr')` helper
to add a search-based feed for any subject or region.
