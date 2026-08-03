/* =====================================================================
   Static page generator for service + suburb stub pages.
   Produces plain static HTML into /services and /suburbs so the site
   stays a no-build, plain-HTML deploy. Re-run after editing content:

     node scripts/build-pages.js

   No runtime dependencies — pure Node.
   ===================================================================== */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://turfandlandscaping.com.au";
const PHONE_DISPLAY = "0457 357 085";
const PHONE_TEL = "+61457357085";
const OG = SITE + "/assets/images/og-turf-and-landscaping.webp";

const SUBURBS = ["Craigieburn", "Mickleham", "Sunbury", "Point Cook", "Melton", "Werribee"];
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- Shared chrome ---------- */
function head({ title, desc, canonical, image = OG }) {
  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="theme-color" content="#0e3b23" />
  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Turf and Landscaping" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="en_AU" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/assets/favicon.svg" />
  <link rel="stylesheet" href="/style.css" />`;
}

const HEADER = `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap site-header__inner">
      <a class="brand" href="/" aria-label="Turf and Landscaping — home">
        <img class="brand__logo" src="/assets/logo-mark.svg" alt="Turf and Landscaping logo" width="46" height="46" />
        <span class="brand__text">
          <span class="brand__name">Turf <b>and</b> Landscaping</span>
          <span class="brand__tag">North-West Melbourne</span>
        </span>
      </a>
      <nav class="primary-nav" aria-label="Primary">
        <a href="/#services">Services</a>
        <a href="/#work">Recent work</a>
        <a href="/#reviews">Reviews</a>
        <a href="/#areas">Areas</a>
        <a href="/#faq">FAQ</a>
      </nav>
      <div class="header-cta">
        <a class="header-call" href="tel:${PHONE_TEL}">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.24 1z"/></svg>
          <span class="header-call__label">Call</span>
          <span class="header-call__num">0457&nbsp;357&nbsp;085</span>
        </a>
        <button class="nav-toggle" type="button" aria-label="Open menu" aria-controls="mobile-nav" aria-expanded="false">
          <svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
    </div>
    <nav class="mobile-nav" id="mobile-nav" data-open="false" aria-label="Mobile">
      <a href="/#services">Services</a>
      <a href="/#how">How it works</a>
      <a href="/#reviews">Reviews</a>
      <a href="/#work">Recent work</a>
      <a href="/#areas">Areas we serve</a>
      <a href="/#faq">FAQ</a>
      <a class="btn btn--primary btn--block" href="/#quote">Get a free quote</a>
    </nav>
  </header>`;

const FOOTER = `
  <footer class="site-footer">
    <div class="wrap">
      <div class="footer__grid">
        <div class="footer__brand">
          <a class="brand" href="/" aria-label="Turf and Landscaping — home">
            <img class="brand__logo" src="/assets/logo-mark.svg" alt="Turf and Landscaping logo" width="44" height="44" />
            <span class="brand__text">
              <span class="brand__name">Turf <b>and</b> Landscaping</span>
              <span class="brand__tag">North-West Melbourne</span>
            </span>
          </a>
          <p style="margin-top:1rem;max-width:22rem;color:#9db8a4;">Turf, paving, retaining walls and garden design for homeowners across Melbourne's north-west.</p>
          <div class="footer__socials">
            <a href="https://www.instagram.com/turfandlandscaping" target="_blank" rel="noopener" aria-label="Turf and Landscaping on Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.2 1 .46 1.4.86.4.4.66.8.86 1.4.17.4.36 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2a3.8 3.8 0 0 1-.86 1.4c-.4.4-.8.66-1.4.86-.4.17-1 .36-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.42a3.8 3.8 0 0 1-1.4-.86 3.8 3.8 0 0 1-.86-1.4c-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.2-.6.46-1 .86-1.4.4-.4.8-.66 1.4-.86.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2z"/></svg>
            </a>
            <a href="https://www.facebook.com/turfandlandscaping" target="_blank" rel="noopener" aria-label="Turf and Landscaping on Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.75-1.6 1.5V12h2.7l-.43 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>
            </a>
          </div>
        </div>
        <div>
          <h4>Services</h4>
          <ul>
            <li><a href="/services/natural-turf-solutions">Natural Turf Solutions</a></li>
            <li><a href="/services/paving-and-stepping-stones">Paving &amp; Stepping Stones</a></li>
            <li><a href="/services/retaining-walls">Retaining Walls</a></li>
            <li><a href="/services/soft-landscaping">Soft Landscaping</a></li>
            <li><a href="/services/garden-design">Garden Design</a></li>
          </ul>
        </div>
        <div>
          <h4>Areas we serve</h4>
          <ul>
${SUBURBS.map((s) => `            <li><a href="/suburbs/${slug(s)}">${s}</a></li>`).join("\n")}
          </ul>
        </div>
        <div>
          <h4>Get in touch</h4>
          <ul>
            <li><a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a></li>
            <li><a href="mailto:info@turfandlandscaping.com.au">info@turfandlandscaping.com.au</a></li>
            <li>Servicing north-west Melbourne, VIC</li>
            <li>Mon–Fri 7am–5pm · Sat 8am–2pm</li>
            <li><a href="/#quote">Get a free quote</a></li>
          </ul>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© <span id="year">2026</span> Turf and Landscaping · ABN 00 000 000 000</span>
        <span>North-west Melbourne, Victoria · Fully insured</span>
      </div>
    </div>
  </footer>
  <nav class="mobile-bar" aria-label="Quick contact">
    <a class="bar-call" href="tel:${PHONE_TEL}">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.24 1z"/></svg>
      Call
    </a>
    <a class="bar-quote" href="/#quote">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4h16v12H7l-3 3z"/></svg>
      Get a quote
    </a>
  </nav>
  <script src="/main.js" defer></script>
  <script>var y=document.getElementById("year"); if(y) y.textContent=new Date().getFullYear();</script>
</body>
</html>`;

function heroActions() {
  return `<div class="page-hero__actions">
        <a class="btn btn--call" href="tel:${PHONE_TEL}">Call ${PHONE_DISPLAY}</a>
        <a class="btn btn--ondark" href="/#quote">Get a free quote</a>
      </div>`;
}

function ctaBand() {
  return `<div class="cta-band">
        <h2>Ready for a free on-site quote?</h2>
        <p>Tell us about your yard and we'll come out, measure up and give you a clear fixed price — no obligation.</p>
        <div class="cta-band__actions">
          <a class="btn btn--call" href="tel:${PHONE_TEL}">Call ${PHONE_DISPLAY}</a>
          <a class="btn btn--ondark" href="/#quote">Request a quote online</a>
        </div>
      </div>`;
}

/* ---------- Service pages ---------- */
const SERVICES = [
  {
    name: "Natural Turf Solutions",
    image: "service-natural-turf-solutions.webp",
    imageAlt: "Roll of fresh natural turf being laid over prepared soil",
    tagline: "Fresh, hard-wearing lawns supplied and laid to suit your soil, sun and lifestyle.",
    desc:
      "New natural turf supplied and laid across Melbourne's north-west. Proper soil prep, warm-season varieties and a lawn that lasts. Free on-site quotes — call 0457 357 085.",
    intro:
      "A healthy lawn is the fastest way to lift the look of a whole property — and the biggest disappointment if it's laid over poor ground. We supply and lay quality natural turf on soil that's been properly prepared, graded and drained, so your new lawn takes quickly and holds up to Melbourne summers, kids and pets.",
    included: [
      "Site clearing, weed removal and soil preparation",
      "Grading and levelling for a smooth, even finish",
      "Supply of quality warm-season turf suited to your aspect",
      "Careful laying, rolling and joint alignment",
      "Watering-in and simple aftercare advice",
    ],
    body:
      "We help you choose the right variety for the spot — a tougher couch or kikuyu for a lawn that cops full sun and foot traffic, or a soft-leaf buffalo where you want shade tolerance and a plush feel underfoot. Whether it's a small front verge or a full backyard, we handle the whole job, leave the site tidy, and tell you exactly how to water it in for the first few weeks.",
  },
  {
    name: "Paving & Stepping Stones",
    image: "service-paving-and-stepping-stones.webp",
    imageAlt: "Bluestone paving laid level across an outdoor patio area",
    tagline: "Patios, paths and pool surrounds laid dead level and built to last.",
    desc:
      "Paving and stepping-stone paths across north-west Melbourne — bluestone, concrete and clay pavers on a proper base with correct drainage. Free on-site quotes: call 0457 357 085.",
    intro:
      "Good paving is all in the base you don't see. We excavate, compact and lay a proper sub-base so your patio, path or pool surround stays flat and true for years — no rocking pavers, no puddles, no weeds pushing through the joints.",
    included: [
      "Excavation and compacted road-base preparation",
      "Bluestone, concrete, clay and porcelain pavers",
      "Stepping-stone paths and garden walkways",
      "Correct falls for drainage away from the house",
      "Clean cuts, tight joints and a swept finish",
    ],
    body:
      "From an entertaining area off the back door to a neat path down the side of the house, we lay to a string line and a level so the finish looks sharp and drains the way it should. We'll talk you through paver options to match your home and budget, and make sure water runs away from your slab, not toward it.",
  },
  {
    name: "Retaining Walls",
    image: "service-retaining-walls.webp",
    imageAlt: "Concrete sleeper retaining wall holding back a garden bed",
    tagline: "Structural walls that hold back slopes and carve out usable, level yard.",
    desc:
      "Retaining walls across north-west Melbourne — timber and concrete sleepers, besser block and rock walls, built with proper drainage. Free on-site quotes: call 0457 357 085.",
    intro:
      "A retaining wall does real structural work, so it has to be built right. We set posts to the correct depth, use the right materials for the load, and put ag-drain and backfill behind every wall so water has somewhere to go instead of pushing the wall over.",
    included: [
      "Timber and concrete sleeper walls",
      "Besser block and rendered walls",
      "Natural rock and boulder walls",
      "Ag-drain, aggregate and correct backfill",
      "Levelling and terracing of sloping blocks",
    ],
    body:
      "Whether you're levelling a sloping backyard for a lawn, terracing a garden into usable beds, or holding back a driveway cut, we'll recommend the right wall type and height for the job. On new estates across the north-west we build plenty of boundary and split-level walls, and we'll let you know if a job needs engineering or council sign-off before we start.",
  },
  {
    name: "Soft Landscaping",
    image: "service-soft-landscaping.webp",
    imageAlt: "Freshly mulched garden bed planted with native shrubs",
    tagline: "Garden beds, mulch and planting that make the whole yard feel finished.",
    desc:
      "Soft landscaping across north-west Melbourne — garden beds, planting, quality soil, mulch and edging. Low-maintenance gardens done right. Free on-site quotes: call 0457 357 085.",
    intro:
      "Soft landscaping is what turns a bare block into a garden. We build up good soil, choose plants that suit the spot and your appetite for maintenance, and finish with clean edges and quality mulch so beds look sharp and stay that way.",
    included: [
      "Garden bed shaping and soil improvement",
      "Plant selection and planting",
      "Quality mulch, compost and feature stone",
      "Timber, steel or masonry garden edging",
      "Low-maintenance and water-wise planting plans",
    ],
    body:
      "We're big on hardy, water-wise plants that look good with minimal fuss — natives and exotics that handle our hot summers and clay soils. Tell us how much time you want to spend gardening and we'll plan beds to match, from a low-care front garden to a lush, layered backyard.",
  },
  {
    name: "Garden Design",
    image: "service-garden-design.webp",
    imageAlt: "Hand-drawn garden design plan showing a landscaped courtyard layout",
    tagline: "A clear plan for your outdoor space, costed and ready to build.",
    desc:
      "Garden design across north-west Melbourne — concept plans, planting schedules and staged build options that you can actually afford to build. Free on-site quotes: call 0457 357 085.",
    intro:
      "A good design saves money by getting the decisions right before anyone picks up a shovel. We map out how your space should flow — lawn, paving, beds, screening and features — and give you a plan you can build in one go or stage over time.",
    included: [
      "On-site consultation and measure-up",
      "Concept and layout plans",
      "Plant and materials schedule",
      "Costing and staged build options",
      "The option to have us build the whole thing",
    ],
    body:
      "Because we design and build, our plans are realistic and buildable — no drawings full of features you'll never afford. We'll balance the look you're after with your budget and how the space needs to work day to day, then hand you a clear plan. When you're ready to build, the same local crew can bring it to life.",
  },
];

function serviceJsonLd(s, canonical) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "name": s.name,
        "serviceType": s.name,
        "description": s.tagline,
        "url": canonical,
        "areaServed": SUBURBS.map((n) => ({ "@type": "City", name: n })),
        "provider": {
          "@type": "HomeAndConstructionBusiness",
          "name": "Turf and Landscaping",
          "telephone": PHONE_TEL,
          "url": SITE + "/",
          "areaServed": "North-West Melbourne, VIC",
        },
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: "Services", item: SITE + "/#services" },
          { "@type": "ListItem", position: 3, name: s.name, item: canonical },
        ],
      },
    ],
  };
}

function servicePage(s) {
  const sl = slug(s.name);
  const canonical = `${SITE}/services/${sl}`;
  const title = `${s.name.replace(/&/g, "&amp;")} — North-West Melbourne | Turf and Landscaping`;
  const others = SERVICES.filter((x) => x.name !== s.name);
  return `${head({ title, desc: s.desc, canonical, image: SITE + "/assets/images/" + s.image })}
  <script type="application/ld+json">
  ${JSON.stringify(serviceJsonLd(s, canonical), null, 2)}
  </script>
</head>
<body>
${HEADER}
  <main id="main">
    <section class="page-hero">
      <div class="page-hero__media">
        <img src="/assets/images/${s.image}" alt="${s.imageAlt}" width="1200" height="750" fetchpriority="high" />
      </div>
      <div class="wrap page-hero__inner">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/#services">Services</a><span>/</span>${s.name.replace(/&/g, "&amp;")}</nav>
        <h1>${s.name.replace(/&/g, "&amp;")} in Melbourne's north-west</h1>
        <p>${s.tagline}</p>
        ${heroActions()}
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="prose">
          <p class="lead">${s.intro}</p>
          <h2>What's included</h2>
          <ul>
${s.included.map((i) => `            <li>${i}</li>`).join("\n")}
          </ul>
          <h2>Local, reliable and built to last</h2>
          <p>${s.body}</p>
          <h2>Available across the north-west</h2>
          <p>We provide ${s.name.toLowerCase().replace(/&/g, "and")} to homeowners right across the region:</p>
          <div class="chip-row">
${SUBURBS.map((n) => `            <a class="chip" href="/suburbs/${slug(n)}">${n}</a>`).join("\n")}
          </div>
        </div>

        <div class="prose" style="margin-top:2.4rem;">
          <h2>Other services</h2>
          <div class="chip-row">
${others.map((o) => `            <a class="chip" href="/services/${slug(o.name)}">${o.name.replace(/&/g, "&amp;")}</a>`).join("\n")}
          </div>
        </div>

        <div style="margin-top:2.4rem;">
          ${ctaBand()}
        </div>
      </div>
    </section>
  </main>
${FOOTER}`;
}

/* ---------- Suburb pages ---------- */
const SUBURB_INTRO = {
  Craigieburn:
    "Craigieburn's mix of established homes and fast-growing new estates keeps us busy — from turfing bare blocks on handover to rebuilding tired backyards for families who've been here for years.",
  Mickleham:
    "Mickleham is one of the north's newest growth areas, and most homes here start with a blank canvas. We turn bare builder's blocks into finished yards with turf, paving, walls and gardens.",
  Sunbury:
    "Sunbury's larger blocks and gently sloping streets are perfect for what we do — levelling yards with retaining walls, laying big lawns and building paved entertaining areas.",
  "Point Cook":
    "Point Cook homes are typically newer with compact, well-designed yards that reward a considered layout. We help owners make the most of the space with smart paving, planting and lawn.",
  Melton:
    "Melton and the surrounding estates are growing quickly, and we do a lot of complete yard set-ups here — turf, paths, walls and garden beds that take a new house from bare to finished.",
  Werribee:
    "Werribee's established gardens and newer estates both keep us busy, whether it's refreshing an older backyard or landscaping a brand-new home from the ground up.",
};

function suburbNearby(name) {
  return SUBURBS.filter((s) => s !== name);
}

function suburbJsonLd(name, canonical) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HomeAndConstructionBusiness",
        "name": "Turf and Landscaping",
        "description": `Turf, paving, retaining walls and garden design serving ${name}, Victoria.`,
        "url": canonical,
        "telephone": PHONE_TEL,
        "image": OG,
        "areaServed": { "@type": "City", name: name + ", Victoria" },
        "aggregateRating": { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "17", bestRating: "5" },
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: "Areas we serve", item: SITE + "/#areas" },
          { "@type": "ListItem", position: 3, name: name, item: canonical },
        ],
      },
    ],
  };
}

function suburbPage(name) {
  const sl = slug(name);
  const canonical = `${SITE}/suburbs/${sl}`;
  const title = `Landscaping &amp; Turf ${name} | Turf and Landscaping`;
  const desc = `Turf laying, paving, retaining walls and garden design in ${name}, north-west Melbourne. Local, fully insured, 4.8-star rated. Free on-site quotes — call ${PHONE_DISPLAY}.`;
  return `${head({ title, desc, canonical })}
  <script type="application/ld+json">
  ${JSON.stringify(suburbJsonLd(name, canonical), null, 2)}
  </script>
</head>
<body>
${HEADER}
  <main id="main">
    <section class="page-hero">
      <div class="page-hero__media">
        <img src="/assets/images/hero-landscaping-northwest-melbourne.webp" alt="Landscaped backyard with new turf, paving and garden beds in ${name}, north-west Melbourne" width="1920" height="1080" fetchpriority="high" />
      </div>
      <div class="wrap page-hero__inner">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/#areas">Areas</a><span>/</span>${name}</nav>
        <h1>Turf &amp; landscaping in ${name}</h1>
        <p>Your local crew for lawns, paving, retaining walls and gardens in ${name} and across Melbourne's north-west.</p>
        ${heroActions()}
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="prose">
          <p class="lead">${SUBURB_INTRO[name]}</p>
          <p>We're a local business, so a job in ${name} isn't a long drive across town for us — it's our patch. That means quick quotes, familiar soils and conditions, and a crew that treats your street like its own. Every job comes with a free on-site quote and a clear fixed price before we start.</p>

          <h2>What we do in ${name}</h2>
          <ul>
            <li><a href="/services/natural-turf-solutions">Natural turf supply and laying</a> — new lawns prepared and laid to last</li>
            <li><a href="/services/paving-and-stepping-stones">Paving and stepping stones</a> — patios, paths and pool surrounds</li>
            <li><a href="/services/retaining-walls">Retaining walls</a> — sleeper, block and rock walls to level your yard</li>
            <li><a href="/services/soft-landscaping">Soft landscaping</a> — garden beds, planting, soil and mulch</li>
            <li><a href="/services/garden-design">Garden design</a> — a costed plan you can build in stages</li>
          </ul>

          <h2>Why ${name} homeowners choose us</h2>
          <p>We're fully insured, rated 4.8 across 17 Google reviews, and Victorian owned and operated. We turn up when we say we will, keep the site tidy, and hand over a finished job you'll be proud to show off. No call centres, no vague estimates — just straight answers and quality work.</p>

          <h2>Nearby suburbs we service</h2>
          <div class="chip-row">
${suburbNearby(name).map((n) => `            <a class="chip" href="/suburbs/${slug(n)}">${n}</a>`).join("\n")}
          </div>
        </div>

        <div style="margin-top:2.4rem;">
          ${ctaBand()}
        </div>
      </div>
    </section>
  </main>
${FOOTER}`;
}

/* ---------- Write files ---------- */
fs.mkdirSync(path.join(ROOT, "services"), { recursive: true });
fs.mkdirSync(path.join(ROOT, "suburbs"), { recursive: true });

let count = 0;
for (const s of SERVICES) {
  const file = path.join(ROOT, "services", `${slug(s.name)}.html`);
  fs.writeFileSync(file, servicePage(s));
  console.log("wrote services/" + slug(s.name) + ".html");
  count++;
}
for (const name of SUBURBS) {
  const file = path.join(ROOT, "suburbs", `${slug(name)}.html`);
  fs.writeFileSync(file, suburbPage(name));
  console.log("wrote suburbs/" + slug(name) + ".html");
  count++;
}
console.log("Done:", count, "pages");
