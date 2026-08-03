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
  "assets/favicon.svg",
].forEach(copy);

// Generated pages + images, written straight into dist
const env = { ...process.env, OUTDIR: DIST };
execFileSync("node", [path.join(__dirname, "build-pages.js")], { stdio: "inherit", env });
execFileSync("node", [path.join(__dirname, "gen-images.js")], { stdio: "inherit", env });

console.log("Build complete ->", DIST);
