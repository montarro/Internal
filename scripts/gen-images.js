/* =====================================================================
   Placeholder image generator for Turf and Landscaping.
   Renders branded WebP placeholders with descriptive filenames so the
   site ships valid WebP assets. Each placeholder names the shot it
   stands in for — see PHOTOGRAPHY.md for the full photo brief.

   Requires: npm i sharp   (dev-time only; not a runtime dependency)
   Run:      node scripts/gen-images.js
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT = path.join(__dirname, "..", "assets", "images");
fs.mkdirSync(OUT, { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Simple faint line icons keyed by category
const ICONS = {
  turf: '<path d="M20 88 C16 60 14 34 20 8 M34 88 C34 56 36 30 42 4 M48 88 C52 58 60 34 74 16 M8 88 C4 62 0 40 -2 20" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>',
  paving: '<g fill="none" stroke="#ffffff" stroke-width="3"><rect x="4" y="4" width="38" height="38" rx="3"/><rect x="50" y="4" width="38" height="38" rx="3"/><rect x="4" y="50" width="38" height="38" rx="3"/><rect x="50" y="50" width="38" height="38" rx="3"/></g>',
  wall: '<g fill="none" stroke="#ffffff" stroke-width="3"><rect x="2" y="6" width="40" height="22" rx="2"/><rect x="50" y="6" width="40" height="22" rx="2"/><rect x="26" y="34" width="40" height="22" rx="2"/><rect x="2" y="62" width="40" height="22" rx="2"/><rect x="50" y="62" width="40" height="22" rx="2"/></g>',
  soft: '<g fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"><path d="M46 88 C46 60 40 34 24 16"/><path d="M46 88 C46 60 52 34 68 16"/><path d="M24 16 C14 22 12 34 20 40 C30 40 32 28 24 16Z"/><path d="M68 16 C78 22 80 34 72 40 C62 40 60 28 68 16Z"/></g>',
  design: '<g fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"><path d="M10 78 L58 30 L70 42 L22 90 L6 94 Z"/><path d="M58 30 L66 22 L78 34 L70 42Z"/></g>',
  hero: '<path d="M20 88 C16 60 14 34 20 8 M40 88 C40 56 42 30 48 4 M60 88 C64 58 72 34 86 16" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>'
};

const GRADS = {
  a: ["#17663a", "#0e3b23"],
  b: ["#1e7a3f", "#12472b"],
  c: ["#3f9d4f", "#12472b"],
  d: ["#5a9c3e", "#0e3b23"],
};

function svg({ w, h, title, lines, icon = "hero", grad = "a", eyebrow = "TURF AND LANDSCAPING", textless = false }) {
  const [c1, c2] = GRADS[grad] || GRADS.a;
  const cx = w / 2;

  // Textless variant: used behind overlaid headlines (hero + service page heroes).
  // Just a gradient plus faint icons — no baked-in text to clash with the H1.
  if (textless) {
    const s = Math.min(w, h) * 0.5;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g opacity="0.12" transform="translate(${w - s * 0.95}, ${h - s * 0.95}) scale(${s / 92})">${ICONS[icon] || ICONS.hero}</g>
  <g opacity="0.10" transform="translate(${-s * 0.2}, ${-s * 0.15}) scale(${s / 92})">${ICONS[icon] || ICONS.hero}</g>
  <g opacity="0.08" transform="translate(${w * 0.42}, ${-s * 0.1}) scale(${s / 140})">${ICONS[icon] || ICONS.hero}</g>
</svg>`;
  }

  const baseY = h / 2 - (lines.length - 1) * (h * 0.045);
  const fs = Math.round(Math.min(w, h) * 0.075);
  const textLines = lines
    .map((ln, i) => `<text x="${cx}" y="${baseY + i * fs * 1.18}" text-anchor="middle" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="800" fill="#ffffff">${esc(ln)}</text>`)
    .join("");
  const iconSize = Math.min(w, h) * 0.34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g opacity="0.10" transform="translate(${w - iconSize - w * 0.04}, ${h - iconSize - h * 0.06}) scale(${iconSize / 92})">${ICONS[icon] || ICONS.hero}</g>
  <g opacity="0.10" transform="translate(${-iconSize * 0.25}, ${-iconSize * 0.15}) scale(${iconSize / 92})">${ICONS[icon] || ICONS.hero}</g>
  <text x="${cx}" y="${baseY - fs * 1.05}" text-anchor="middle" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="${Math.round(fs * 0.34)}" letter-spacing="${fs * 0.06}" font-weight="800" fill="#86c05a">${esc(eyebrow)}</text>
  ${textLines}
  <text x="${cx}" y="${baseY + lines.length * fs * 1.18 + fs * 0.4}" text-anchor="middle" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="${Math.round(fs * 0.3)}" fill="#cfe0d3" opacity="0.9">Placeholder — replace with site photograph</text>
</svg>`;
}

const IMAGES = [
  // Textless — these sit behind an overlaid headline, so no baked-in text.
  { file: "hero-landscaping-northwest-melbourne.webp", w: 1920, h: 1080, grad: "a", icon: "hero", textless: true, lines: [] },
  { file: "service-natural-turf-solutions.webp", w: 1200, h: 750, grad: "c", icon: "turf", textless: true, lines: [] },
  { file: "service-paving-and-stepping-stones.webp", w: 1200, h: 750, grad: "b", icon: "paving", textless: true, lines: [] },
  { file: "service-retaining-walls.webp", w: 1200, h: 750, grad: "a", icon: "wall", textless: true, lines: [] },
  { file: "service-soft-landscaping.webp", w: 1200, h: 750, grad: "d", icon: "soft", textless: true, lines: [] },
  { file: "service-garden-design.webp", w: 1200, h: 750, grad: "c", icon: "design", textless: true, lines: [] },

  // Labelled — standalone card, nothing overlaid.
  { file: "og-turf-and-landscaping.webp", w: 1200, h: 630, grad: "b", icon: "hero",
    lines: ["Turf & Landscaping", "North-West Melbourne"], eyebrow: "FREE ON-SITE QUOTES" },

  { file: "new-turf-lawn-craigieburn-backyard.webp", w: 1200, h: 900, grad: "c", icon: "turf",
    lines: ["New turf lawn", "Craigieburn"] },
  { file: "bluestone-paving-patio-sunbury.webp", w: 1200, h: 900, grad: "b", icon: "paving",
    lines: ["Bluestone paving", "Sunbury"] },
  { file: "timber-sleeper-retaining-wall-melton.webp", w: 1200, h: 900, grad: "a", icon: "wall",
    lines: ["Timber sleeper wall", "Melton"] },
  { file: "native-garden-planting-point-cook.webp", w: 1200, h: 900, grad: "d", icon: "soft",
    lines: ["Native garden beds", "Point Cook"] },
  { file: "stepping-stone-path-werribee.webp", w: 1200, h: 900, grad: "b", icon: "paving",
    lines: ["Stepping-stone path", "Werribee"] },
  { file: "instant-turf-front-lawn-mickleham.webp", w: 1200, h: 900, grad: "c", icon: "turf",
    lines: ["Instant turf front lawn", "Mickleham"] },
  { file: "courtyard-garden-design-craigieburn.webp", w: 1200, h: 900, grad: "c", icon: "design",
    lines: ["Courtyard garden design", "Craigieburn"] },
  { file: "concrete-sleeper-retaining-wall-sunbury.webp", w: 1200, h: 900, grad: "a", icon: "wall",
    lines: ["Concrete sleeper wall", "Sunbury"] },
  { file: "mulched-garden-beds-shrubs-melton.webp", w: 1200, h: 900, grad: "d", icon: "soft",
    lines: ["Mulched beds & shrubs", "Melton"] },
];

(async () => {
  for (const img of IMAGES) {
    const buf = Buffer.from(svg(img));
    await sharp(buf).webp({ quality: 82 }).toFile(path.join(OUT, img.file));
    console.log("wrote", img.file);
  }
  console.log("Done:", IMAGES.length, "images");
})();
