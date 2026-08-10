/* =====================================================================
   Vercel build: assemble the static site into ./dist
   - copies the hand-written static files
   - generates the service + suburb pages
   - generates the WebP images
   Run automatically by Vercel (see vercel.json buildCommand). Locally:
     npm install && npm run build
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

function copy(rel) {
  const src = path.join(ROOT, rel);
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("copied", rel);
}

// Fresh dist
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// Static, hand-written files
[
  "index.html",
  "style.css",
  "main.js",
  "robots.txt",
  "sitemap.xml",
  "assets/logo-mark.svg",
  "assets/logo-mark-light.svg",
  "assets/favicon.svg",
].forEach(copy);

// Generated pages + images, written straight into dist
const env = { ...process.env, OUTDIR: DIST };
execFileSync("node", [path.join(__dirname, "build-pages.js")], { stdio: "inherit", env });
execFileSync("node", [path.join(__dirname, "gen-images.js")], { stdio: "inherit", env });

// Real photography wins over generated placeholders.
// Anything committed in assets/images/ is copied over the generated files, so
// dropping a real photo in there (same filename) is all it takes to ship it.
const SRC_IMG = path.join(ROOT, "assets", "images");
const DEST_IMG = path.join(DIST, "assets", "images");
if (fs.existsSync(SRC_IMG)) {
  fs.mkdirSync(DEST_IMG, { recursive: true });
  for (const f of fs.readdirSync(SRC_IMG)) {
    if (fs.statSync(path.join(SRC_IMG, f)).isFile()) {
      fs.copyFileSync(path.join(SRC_IMG, f), path.join(DEST_IMG, f));
      console.log("used real asset", f);
    }
  }
}

console.log("Build complete ->", DIST);
