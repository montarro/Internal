/* =====================================================================
   Client photography drop-box.

   Drop a photo into assets/photos/ named after its slot — e.g. "hero.jpg" —
   and this converts it to an optimised WebP under the filename the site
   actually references. No HTML changes, no renaming, no WebP conversion
   needed by hand. Accepts .jpg / .jpeg / .png / .webp.

   Runs last in the build so it wins over the generated placeholders.
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(process.env.OUTDIR || ROOT, "assets", "images");
const SRC = path.join(ROOT, "assets", "photos");

// short name you upload  ->  filename the site references
const SLOTS = {
  hero:    "hero-landscaping-northwest-melbourne",
  og:      "og-turf-and-landscaping",
  turf:    "service-natural-turf-solutions",
  paving:  "service-paving-and-stepping-stones",
  walls:   "service-retaining-walls",
  soft:    "service-soft-landscaping",
  design:  "service-garden-design",
};

// slot -> [width, height] so each photo is cropped to the ratio the layout expects
const SIZES = {
  "hero-landscaping-northwest-melbourne": [1920, 1080],
  "og-turf-and-landscaping": [1200, 630],
};
const SERVICE_SIZE = [1200, 750];
const GALLERY_SIZE = [1200, 900];

const OK = [".jpg", ".jpeg", ".png", ".webp"];

(async () => {
  if (!fs.existsSync(SRC)) { return; }
  fs.mkdirSync(OUT, { recursive: true });

  let n = 0;
  for (const file of fs.readdirSync(SRC)) {
    const ext = path.extname(file).toLowerCase();
    if (!OK.includes(ext)) continue;

    const key = path.basename(file, path.extname(file)).toLowerCase();
    const target = SLOTS[key] || key;                 // unknown names pass through
    const size = SIZES[target] || (target.startsWith("service-") ? SERVICE_SIZE : GALLERY_SIZE);

    await sharp(path.join(SRC, file))
      .resize(size[0], size[1], { fit: "cover", position: "centre" })
      .webp({ quality: 80 })
      .toFile(path.join(OUT, target + ".webp"));

    console.log(`photo: ${file} -> ${target}.webp (${size[0]}x${size[1]})`);
    n++;
  }
  if (n) console.log(`Applied ${n} real photo(s)`);
})();
