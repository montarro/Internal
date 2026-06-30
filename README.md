# Montarro · Revenue Infrastructure Scorecard

A standalone, dependency-free scoring tool used during Montarro strategy calls and
embedded inside Notion.

## What it does

Score a business 0–10 across five revenue pillars — **Lead Capture, Qualification,
CRM, Automations, Reporting** — and instantly see:

- A live total score out of 100 with an animated gauge.
- A status label: **High Leakage** (0–30), **Infrastructure Gaps** (31–60),
  **Improving** (61–80), **Strong System** (81–100).
- Recommended modules for the weakest areas (scores below 6), ranked weakest first.
- A **Copy Summary** button that copies the score, weakest areas and recommended
  modules to the clipboard.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup and structure |
| `style.css` | Dark charcoal / emerald / mint theme, fully responsive |
| `script.js` | Scoring, status logic, recommendations, copy-to-clipboard |

No build step, no frameworks, no external requests.

## Deploy on Vercel

This is a static site, so no configuration is needed:

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Framework Preset: **Other**. Leave Build Command empty and Output Directory as
   the project root.
4. Deploy.

Or from the CLI:

```bash
npm i -g vercel
vercel --prod
```

## Embed in Notion

1. Deploy and copy the production URL.
2. In Notion type `/embed`, paste the URL, and resize the block.

The layout is responsive and sized to sit comfortably inside a Notion embed. The
clipboard copy includes a fallback for restrictive iframe contexts.
