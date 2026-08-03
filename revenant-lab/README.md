# Revenant Lab — website

A dependency-free static storefront for **Revenant Lab**, built to the *Brand
Package V3* system: research-grade peptides, Australian supply, documented per batch.

Inspired structurally by peptide-supply stores such as lazaruslabs.com.au, but
styled entirely to the Revenant Lab brand — no cloned branding.

## Brand system applied

| Token | Value | Use |
| --- | --- | --- |
| Revenant Violet | `#6F47E8` | Primary accent, dose badges, CTAs |
| Void | `#090B0F` | Page background |
| Bone | `#F4F1E8` | Warm off-white text |
| Label White | `#FFFFFF` | Vial-sticker product faces |

- **Wordmark is the logo** — `REVENANT` (violet, wide-tracked, forward-leaning
  italic) over a small centred `LAB`. No icon, portal, circle, crest or monogram,
  per the brand core rule.
- **Type** — Space Grotesk (geometric grotesk) for the wordmark and headings,
  Inter for body and product names, compact bold for technical data.
- **Vial-sticker product cards** — white stock, violet mg badge as the strongest
  coloured element, `LOT ___ | KEEP REFRIGERATED`, `LABORATORY RESEARCH ONLY /
  NOT FOR HUMAN / VETERINARY USE`, and a violet `REVENANTLAB.COM` footer bar.
- **Purity rule respected** — no purity percentage is displayed anywhere. Copy
  states purity is reported per batch on the COA. (Add `purity` to a product in
  `app.js` only once verified for that exact batch, and it renders as a tag.)

## Sections

Announcement ticker · sticky nav · hero with vial-sticker visual · standards strip ·
filterable catalogue · testing & quality · ordering process · about · FAQ ·
compliance band · contact form · footer · slide-in cart drawer · research-use gate.

## Features

- Catalogue rendered from a data array in `app.js`, filterable by research area.
- Cart drawer with quantity controls and a subtotal; state persists to
  `localStorage`. Checkout is a stub (no payment provider connected).
- One-time **research-use acknowledgment** modal (18+ / research use), remembered
  in `localStorage`.
- Mobile nav, FAQ accordion, scroll-reveal, animated notice ticker.
- Fully responsive; honours `prefers-reduced-motion`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Markup and content |
| `styles.css` | Brand system, layout, vial-sticker cards, drawer, responsive |
| `app.js` | Catalogue data, filtering, cart, drawer, gate, FAQ, reveal |

Google Fonts (Space Grotesk + Inter) load from a CDN; the layout degrades to
system fonts if they're unavailable.

## Run locally

Just open `index.html`, or serve the folder:

```bash
cd revenant-lab
python3 -m http.server 8000   # http://localhost:8000
```

## Deploy on Vercel

Static site, no build step. Import the repo and set the **Root Directory** to
`revenant-lab`, Framework Preset **Other**, empty build command.

## Compliance

All product copy is written for laboratory research use only. Materials are
presented as **not for human or veterinary use**, with no medical, diagnostic or
therapeutic claims. Retain this framing for any future edits.
