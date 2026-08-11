# Turf and Landscaping — marketing website

A fast, mobile-first static marketing site for **Turf and Landscaping**, a
turf and landscaping business serving Melbourne's north-west. Built to do one
job: turn a visitor into a booked, on-site quote.

- **Stack:** plain HTML, CSS and vanilla JS. No framework, no runtime
  dependencies, no build step required to serve.
- **Deploy target:** Vercel (static).

## Structure

```
/                                  landscaping site (deploys at the domain root)
├── index.html                     single-page homepage (all 13 sections)
├── style.css                      design system + all components
├── main.js                        mobile nav + quote-form submission
├── vercel.json                    cleanUrls, caching headers
├── robots.txt                     allows crawling, points to sitemap
├── sitemap.xml                    all 12 URLs
├── assets/
│   ├── logo-mark.svg              brand emblem
│   ├── favicon.svg
│   └── images/                    16 WebP images (descriptive filenames)
├── services/                      5 service pages (generated)
│   ├── natural-turf-solutions.html
│   ├── paving-and-stepping-stones.html
│   ├── retaining-walls.html
│   ├── soft-landscaping.html
│   └── garden-design.html
├── suburbs/                       6 suburb pages (generated)
│   ├── craigieburn.html  mickleham.html  sunbury.html
│   └── point-cook.html   melton.html     werribee.html
├── scripts/
│   ├── build-pages.js             regenerates the service + suburb pages
│   └── gen-images.js              regenerates the placeholder WebP images (needs `sharp`)
└── montarro/                      the previous Montarro scorecard app, moved here
                                   so it isn't lost (unrelated to this site)
```

> **Note:** the earlier *Montarro Revenue Infrastructure Scorecard* that lived
> at the repo root was moved into `montarro/` so the landscaping site can be the
> clean root deploy on this branch. It still works at `/montarro/`.

## Editing content

- **Homepage:** edit `index.html` directly.
- **Service / suburb pages:** edit the data at the top of
  `scripts/build-pages.js`, then run `node scripts/build-pages.js`. The pages
  are committed as static HTML, so the generator is a convenience, not a
  runtime requirement.
- **Images:** replace the files in `assets/images/` with real photos, keeping
  the same filenames (see `PHOTOGRAPHY.md`). To regenerate the placeholders:
  `npm i sharp && node scripts/gen-images.js`.

## Wiring up the quote form

Open `main.js` and set `WEBHOOK_URL` to the endpoint you want the form to POST
to. It sends a JSON body with: `name, phone, email, suburb, service, message,
source_page, submitted_at`. Until a URL is set, the form validates and tells
the visitor to call rather than silently failing.

## Deploy to Vercel

The repo is git-connected: **every push to `main` deploys automatically.**

Vercel settings (already captured in `vercel.json`, no manual entry needed):

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | `./` |
| Build Command | `node scripts/build-site.js` |
| Output Directory | `dist` |
| Production Branch | `main` |

The build installs `sharp`, generates the 11 service/suburb pages and the 16
WebP images into `dist/`, and copies anything in `assets/` over the top — so
dropping a real photo into `assets/images/` with the same filename ships it.

Point the domain (`turfandlandscaping.com.au`) at the project under
**Settings → Domains** when you're ready.

## ✅ Before you publish — confirm these placeholders

Everything below is a best-guess placeholder. Replace/confirm before go-live —
each spot is marked with a `TODO` comment in the source.

- [ ] **Service suburbs** — brief lists Craigieburn, Mickleham, Sunbury, Point
      Cook, Melton, Werribee. Confirm the business actually services all six.
- [ ] **Email** — `info@turfandlandscaping.com.au` is assumed from the domain.
      Confirm it's a real, monitored inbox.
- [ ] **Instagram / Facebook** — links currently point to
      `instagram.com/turfandlandscaping` and `facebook.com/turfandlandscaping`.
      Replace with the real profile URLs.
- [ ] **Google reviews** — the 3 quoted reviews are placeholders. Swap in real,
      current Google reviews (with the reviewers' consent) and point the
      "Read all our Google reviews" button at the real Business Profile.
- [ ] **ABN** — footer shows `00 000 000 000`. Add the real ABN.
- [ ] **Trading hours** — assumed Mon–Fri 7am–5pm, Sat 8am–2pm. Confirm and
      update in `index.html` (text + JSON-LD) and the footer.
- [ ] **Canonical domain** — the site assumes `https://turfandlandscaping.com.au`
      (no `www`). If you use `www`, update canonicals, OG URLs, JSON-LD and
      `sitemap.xml` accordingly (or set a redirect).
- [ ] **Real photography** — replace the WebP placeholders (see `PHOTOGRAPHY.md`).
