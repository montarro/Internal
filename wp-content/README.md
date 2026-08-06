# Revenant Labs — WordPress FSE theme + companion plugin

Build handover. Everything below lives in this repository under `wp-content/`,
mirroring the paths it occupies inside a WordPress installation, so deploying it
is a straight copy.

---

## 1. What was built

A **standalone native Full Site Editing block theme** — not a child theme, and
with no dependency on Blocksy, Elementor, Divi or WPBakery — plus a small
companion plugin that owns the business-critical data.

| Piece | Path in WordPress |
| --- | --- |
| Theme | `wp-content/themes/revenant-labs` |
| Companion plugin | `wp-content/plugins/revenant-labs-core` |

**Theme (`revenant-labs`)**

- `theme.json` v3 carrying the full design system: the nine canonical brand
  colours as named presets, three font families, a fluid type scale, an
  eight-step spacing scale, restrained radii (button 3px / card 6px / panel
  10px), shadows, and layout widths (content 800px, wide 1280px, outer ceiling
  1440px).
- **21 block templates** and **6 template parts**, all editable in the Site
  Editor.
- **15 block patterns** grouped under a *Revenant Labs* category.
- Per-block stylesheets that WordPress only loads on views where the block is
  actually rendered, plus one small global stylesheet.
- ~1KB of deferred JavaScript for the sticky-header shadow and reveal-on-scroll,
  and a separate small script for the first-entry notice which is **not
  enqueued at all** once a visitor has acknowledged it.
- No jQuery, no framework, no external requests, no trackers.

**Plugin (`revenant-labs-core`)**

- Optional COA metadata on products: document, lot, batch, laboratory, test
  date, result as reported, and report status. Nonce-protected, capability
  checked, every field sanitised on save and escaped on output.
- Two server-rendered blocks — `revenant-labs/product-coa` and
  `revenant-labs/coa-library` — that print **only fields that hold a value** and
  never a bare label.
- The required, never-pre-checked checkout research-use declaration, registered
  through WooCommerce's additional-checkout-fields API so it validates
  server-side, stores against the order, and works with the Checkout block. A
  classic-checkout fallback covers older WooCommerce versions.
- A settings screen (Settings → Revenant Labs) for the declaration wording.

Business data lives in the plugin **on purpose**, so a future theme change never
takes the COA records or order declarations with it.

---

## 2. Installing into LocalWP

1. Copy the two directories into your site:

   ```
   <LocalWP site>/app/public/wp-content/themes/revenant-labs
   <LocalWP site>/app/public/wp-content/plugins/revenant-labs-core
   ```

   On macOS the site root is usually `~/Local Sites/<site>/app/public`; on
   Windows, `C:\Users\<you>\Local Sites\<site>\app\public`.

2. **Plugins → Installed Plugins → activate "Revenant Labs Core"** (activate
   WooCommerce first if it is not already running).

3. **Appearance → Themes → activate "Revenant Labs".**

4. Create these pages and set their slugs exactly — the templates attach by
   slug:

   | Page | Slug | Template applied |
   | --- | --- | --- |
   | Contact | `contact` | Page · Contact |
   | Research | `research` | Page · Research |
   | FAQs | `faqs` | Page · FAQs |
   | Lab Reports | `lab-reports` | Page · Lab Reports / COA Library |

   Each is also selectable manually from the page's Template dropdown, so a
   different slug still works — just pick the template by hand.

5. **WooCommerce → Settings → Products** — set the Shop page. The header
   navigation links to `/catalogue/`, so either rename the Shop page slug to
   `catalogue` or edit the navigation links (Appearance → Editor → Navigation).

6. **Settings → Reading** — set the front page to a static page so
   `front-page.html` is used.

7. Set the logo (§4) and confirm the announcement bar copy (§8).

---

## 3. Requirements

- WordPress **6.6+** (6.7+ recommended — `theme.json` v3).
- PHP **7.4+**.
- WooCommerce **9.8+** recommended for the Product Collection and Product
  Filters blocks used by the catalogue. See *Known limitations*.
- No other plugin is required. No payment gateway is configured, referenced or
  advertised anywhere in this build.

---

## 4. Replacing the logo

**The approved Revenant Labs logo asset was not available during this build, so
none was invented.** The theme ships no wordmark, no recreated lettering and no
substitute font pretending to be the logo. The header, footer and checkout
header all use the core **Site Logo** block, so the real asset drops straight in:

1. Appearance → Editor → **Styles → click the logo placeholder**, or
   Appearance → Customise → Site Identity.
2. Upload the approved transparent **SVG or PNG** and select it.

Display width is set to 180px in the block and capped responsively by CSS:

| Breakpoint | Width |
| --- | --- |
| Desktop (≥1024px) | 180px |
| Tablet (600–1023px) | 160px |
| Mobile (<600px) | 140px |

Proportions are preserved at every size (`height: auto`, `object-fit: contain`).
Nothing stretches, crops, recolours or redraws the asset. To change the widths,
edit `assets/css/theme.css` (`.rl-logo img` rules).

---

## 5. Adding approved vial photography

The hero product panel currently shows a **neutral, clearly labelled
placeholder** — a bordered box reading "Product image / Replace with approved
Revenant Labs vial photography". No vial was generated, drawn, recreated in CSS
or approximated.

To add the real photography:

1. Appearance → Editor → **Templates → Front Page**.
2. Select the placeholder group inside the dark hero panel (it is the block with
   the dashed border).
3. Replace it with an **Image** block and upload the approved photograph. Apply
   the *Panel image* block style for the correct 10px corner radius.
4. Write real alt text describing the product as photographed.

Do the same for the "Packaging image" placeholder in the Discreet Dispatch
section.

**Technical metadata on the hero panel is deliberately absent.** Lot numbers,
batch numbers, purity figures, test dates and laboratory names are only ever
rendered from real stored data via the COA blocks — never typed into a template.
A `VIEW COA` action appears automatically once a matching published report
exists (§7).

---

## 6. Adding products

Products are added the normal WooCommerce way — the theme creates none, and no
dummy products, prices, strengths, purity figures or descriptions were written
into the database or the templates.

- Create the six research categories under **Products → Categories**, matching
  the slugs the homepage cards link to: `metabolic-signalling`,
  `tissue-and-cellular-research`, `gh-igf-pathway`, `copper-peptides`,
  `neural-research`, `laboratory-supplies`. (Or edit the card links in the Site
  Editor to match whatever slugs you prefer.)
- Use **variable products** with attributes for **Strength** and **Format**. The
  single-product template renders WooCommerce's native variation form — it is
  never labelled a "dose selector".
- To add Strength/Format to the catalogue filters: Appearance → Editor →
  Templates → **Product Catalog** → select the Product Filters block → add an
  **Attribute** filter and choose the attribute.

Until products exist, the front end shows a designed empty state rather than an
empty grid. The editor shows WooCommerce's own placeholder previews — that is
editor-only and never reaches visitors.

---

## 7. Adding certificates of analysis

Per product: **Products → edit a product → "Certificate of analysis" panel.**

| Field | Notes |
| --- | --- |
| COA document | Select from the media library (PDF or image). Documents stay in the media library, not on an external host. |
| Document URL | Fallback only. The media library attachment wins. |
| Lot number | As printed on the report. |
| Batch number | As printed on the report. |
| Testing laboratory | Spell it exactly as the laboratory spells it. |
| Test date | Date picker; validated. |
| Result as reported | Transcribe verbatim — do not round or restate. |
| Report status | **Only "Published" makes a report public.** |

A report is shown publicly **only** when the status is `Published` **and** a
document actually resolves. A half-filled record renders nothing at all — no
empty labels, no placeholder values, no implied testing.

Where reports appear:

- **Product page** — the COA details block, summary mode, above the add-to-cart
  area; and the full table under the "Documentation" section.
- **Product cards** — a compact "COA available" badge, only where one exists.
- **Lab Reports page** — the COA library block, with lot and test-date filters.
  The filter form only renders once at least one report is published; before
  that visitors see a plain empty state.

---

## 8. Editing the announcement bar

Appearance → Editor → **Patterns → Template Parts → Announcement Bar.**

Default copy: `FREE EXPRESS SHIPPING ON AUSTRALIAN ORDERS OVER $250`

It is a normal Paragraph block inside a near-black group — change the wording,
colours or padding freely. Removing the bar entirely means deleting the
`<!-- wp:template-part {"slug":"announcement-bar"} /-->` line from each template
that includes it, or simply emptying the part.

---

## 9. Editing the homepage sections

Appearance → Editor → **Templates → Front Page.**

Every section is inline block markup — **not** a locked pattern reference — so
each one is directly editable, reorderable and removable in the Site Editor. In
document order:

1. Announcement bar (template part)
2. Header (template part)
3. Hero + hero product panel
4. Proof strip (4 columns → 2 → 1)
5. Featured products (Product Collection)
6. Research categories
7. Documentation process (`EVERY LOT, DOCUMENTED.`)
8. COA preview (near-black)
9. Discreet dispatch
10. FAQ accordion
11. Final CTA
12. Footer (template part)

The same 15 sections are also registered as **patterns** (inserter → *Revenant
Labs*) so they can be dropped onto any other page. The template is the live
homepage; the patterns are the reusable library. Editing one does not change the
other.

---

## 10. Editing the footer

Appearance → Editor → **Patterns → Template Parts → Footer.**

Four columns — Brand, Browse, Support, Policies — over a near-black
`RESEARCH USE ONLY — NOT FOR HUMAN OR VETERINARY USE` band.

- **Contact and Australian business details are not pre-filled.** The brand
  column carries an instruction to add them rather than invented placeholder
  details. Replace that paragraph with your real contact email, phone, address
  and ABN.
- **No social links are included** — add them only when real profiles exist.
- The copyright year is dynamic via the `[rl_year]` shortcode inside a Shortcode
  block. Edit the surrounding text freely; keep `[rl_year]` to keep the year
  current.
- Policy links point at `/research-use-policy/`, `/customer-eligibility/`,
  `/terms-and-conditions/`, `/privacy-policy/`, `/refund-policy/`,
  `/shipping-and-returns/` and `/storage-information/`. Create those pages or
  repoint the links.

---

## 11. Editing the first-entry research notice

Appearance → Editor → **Patterns → Template Parts → Research-Use Notice (first
visit).**

The content is ordinary blocks — heading, paragraph, two buttons — so the copy
is editable without touching theme code. The script promotes that markup into a
native `<dialog>` and calls `showModal()`, which gives real focus trapping and
page inertness from the browser rather than hand-rolled JavaScript.

Behaviour:

- Nothing is pre-acknowledged; the visitor must activate the confirm control.
- The confirm control is converted to a real `<button>` at runtime, because
  confirming is an action rather than navigation.
- **Escape does not dismiss it** — dismissing is not an acknowledgement — and
  focus returns to the confirm button.
- Acknowledgement is remembered for **30 days** via a cookie, with a
  `sessionStorage` fallback. Once set, the script is not even enqueued.
- The "LEAVE SITE" button is a normal Button block; change its URL in the editor.
- With JavaScript disabled the notice never appears and the site stays fully
  usable.
- **This notice does not replace the checkout declaration**, which is separate
  and enforced server-side.

---

## 12. Motion

Motion is limited to two effects, both additive:

- A soft shadow appears under the sticky header once the page scrolls.
- Full-width top-level sections fade and rise slightly as they enter the
  viewport. Anything already visible at load — the hero above all — is skipped
  entirely, so nothing fades in on first paint and LCP is unaffected.

To opt any other block into the reveal, give it the class `rl-reveal` in the
Site Editor (block sidebar → Advanced → Additional CSS class(es)).

`prefers-reduced-motion: reduce` disables every transition and reveal, including
when the visitor switches the preference on mid-session. With JavaScript blocked,
no element is ever hidden in the first place — the classes that hide content are
only ever added by script, never saved into the markup.

---

## 13. Created files

### Theme — `wp-content/themes/revenant-labs`

```
style.css                      theme header only (no styles)
theme.json                     design system, v3
functions.php                  bootstrap
inc/setup.php                  theme supports, editor styles
inc/assets.php                 global + per-block stylesheets, deferred JS, logo preload
inc/patterns.php               pattern categories
inc/block-styles.php           7 block style variations
inc/shortcodes.php             [rl_year]
inc/woocommerce.php            Woo supports, placeholder image, related-products args

templates/  (21)
  index · home · front-page · page · page-wide · single · archive · search · 404
  page-contact · page-research · page-faqs · page-lab-reports
  archive-product · taxonomy-product_cat · taxonomy-product_tag · single-product
  page-cart · page-checkout · order-confirmation · page-my-account

parts/  (6)
  announcement-bar · header · checkout-header · footer · mini-cart · research-notice

patterns/  (15)
  announcement-bar · header · hero · hero-product-panel · proof-strip
  featured-products · research-categories · documentation-process · coa-preview
  discreet-dispatch · faq · final-cta · contact-section · research-notice · footer

assets/css/theme.css           layout shells, grids, motion, dialog, My Account
assets/css/editor.css          editor-only affordances
assets/css/fonts.css           @font-face (only enqueued once WOFF2 files exist)
assets/css/blocks/*.css        13 per-block stylesheets
assets/js/theme.js             sticky-header shadow + reveal on entry
assets/js/research-notice.js   first-entry dialog
assets/images/product-placeholder.svg
assets/fonts/README.md         how to add the licensed WOFF2 files
```

### Plugin — `wp-content/plugins/revenant-labs-core`

```
revenant-labs-core.php              bootstrap, HPOS + blocks compatibility
includes/helpers.php                meta keys, readers, formatters, date validation
includes/class-coa-meta.php         product COA panel (nonce, caps, sanitisation)
includes/blocks.php                 block registration + both render callbacks
includes/checkout-declaration.php   required declaration + classic fallback + admin display
includes/settings.php               Settings → Revenant Labs
blocks/product-coa/{block.json,index.js,index.asset.php}
blocks/coa-library/{block.json,index.js,index.asset.php}
assets/coa.css                      COA display (theme-independent, with fallbacks)
assets/coa-admin.js                 media picker for the COA document field
```

### Modified files

**None.** No WordPress core file, WooCommerce file, unrelated theme, unrelated
plugin or existing upload was touched, and no database operation was performed.

---

## 14. Checks that were run

Static verification, all passing:

- `php -l` across every PHP file in the theme and plugin — clean.
- `theme.json` and both `block.json` files parse as valid JSON; brand colours
  verified against the canonical palette hex-by-hex.
- Every JavaScript file parses (`node --check`).
- Block delimiters checked with a proper nesting stack across all 42 markup
  files — every `wp:` open matched by its own close, all attribute JSON valid.
- HTML tag nesting validated across the same 42 files.
- CSS brace balance across all 17 stylesheets.
- Cross-references verified: every `template-part` slug resolves to a real file;
  every `theme.json` template part and custom template exists on disk; every
  `has-*-color`, `has-*-font-size` and spacing preset used in markup is defined
  in `theme.json`; pattern slugs unique and matching filenames.
- Compliance scan for prohibited claims (pharmaceutical/medical grade,
  guaranteed purity, `≥99%`, GMP/ISO, named testing providers, dosage,
  reconstitution, injection, therapeutic claims, named payment providers,
  urgency and countdown language). The only matches are inside explicitly
  prohibitive sentences such as "we cannot provide … dosing … guidance".

---

## 15. Known limitations

**Read this section before going live.**

1. **Nothing was verified against a running site.** This build was produced in
   an environment with no WordPress, WooCommerce or LocalWP installation
   reachable, so none of the runtime checks in the brief could be performed: the
   Site Editor rendering, WooCommerce template output, variation behaviour, cart
   and checkout flows, the declaration checkbox, keyboard testing of the modal,
   mobile navigation, filters, console errors, live contrast measurement or the
   responsive breakpoint sweep. Everything above is **static** verification. The
   first LocalWP session should walk the §24 checklist from the brief.

2. **WooCommerce block names are the highest-risk item.** The catalogue uses the
   current Product Collection and Product Filters families
   (`woocommerce/product-filter-price`, `-status`, `-taxonomy`, `-active`,
   `-clear-button`), and cart/checkout use the nested inner-block structures.
   These names have changed across WooCommerce releases. If a filter or a
   cart/checkout section renders blank, open that template in the Site Editor,
   delete the affected block and re-insert it from the inserter — the editor
   will insert whatever structure your installed version expects. The
   surrounding theme markup and styling are unaffected.

3. **Cart, checkout and order-confirmation templates override WooCommerce's
   own.** This gives brand-consistent chrome, and checkout deliberately uses the
   minimal checkout header instead of the full navigation. If you would rather
   track WooCommerce's defaults, delete
   `templates/page-cart.html`, `templates/page-checkout.html` and
   `templates/order-confirmation.html` — WooCommerce's versions take over
   immediately and the theme's styling still applies.

4. **No logo asset.** See §4. The approved wordmark could not be located and was
   deliberately not recreated. Supply the transparent SVG or PNG.

5. **No product photography.** See §5. Neutral labelled placeholders are in
   place.

6. **No fonts bundled.** See `assets/fonts/README.md`. System fallbacks are
   active and look correct; the brand faces need the licensed WOFF2 files or a
   Font Library upload.

7. **Contact details, ABN and social links are intentionally blank** rather than
   filled with plausible-looking placeholders.

8. **`page-my-account.html` applies only if the My Account page slug is
   `my-account`** (the WooCommerce default). It renders the page content, so
   WooCommerce's `[woocommerce_my_account]` shortcode drives the account screens,
   styled by the theme.

9. **Homepage sections and patterns are separate copies.** Editing the Front Page
   template does not update the matching pattern, and vice versa. This is the
   trade-off for making every homepage section directly editable rather than a
   locked pattern reference.

10. **Category card links assume the six slugs in §6.** They are ordinary links
    until those categories exist.

---

## 16. Recommended next steps

1. Install into LocalWP and run the brief's §24 checklist — start with cart,
   checkout and the catalogue filters (limitation 2).
2. Add the approved logo and vial photography.
3. Add the brand WOFF2 files, or upload them through the Font Library.
4. Fill in the footer contact block and Australian business details.
5. Create the six product categories and the policy pages the footer links to.
6. Create products as variable products with Strength and Format attributes,
   then add the attribute filters to the catalogue.
7. Upload the first COAs and confirm the product page, product card badge and
   Lab Reports library all pick them up — and that a product with no report
   renders nothing rather than an empty label.
8. Place a test order to confirm the declaration blocks checkout when unticked
   and is recorded on the order when ticked.
9. Run Lighthouse and an accessibility audit (axe or similar) against the real
   site, and re-check colour contrast once the real logo and photography are in.
10. Have the compliance copy reviewed by whoever signs off on claims before
    launch.
