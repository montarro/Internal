# Self-hosted fonts

This directory is intentionally empty. **No font binaries ship with the theme.**

Until WOFF2 files are added here, the theme uses the system fallback stacks
declared in `theme.json`, and `assets/css/fonts.css` is **not enqueued at all**
— see `revenant_labs_has_local_fonts()` in `inc/assets.php`. That way the site
never fires requests for files that do not exist, and there are no external
font requests either way.

## Option A — upload through the Site Editor (no code)

Appearance → Editor → Styles → Typography → **Manage fonts** → Upload.

Upload the families named below. Because `theme.json` lists the real family
names first in each stack (`"Inter Tight"`, `"Inter"`, `"IBM Plex Mono"`), the
uploaded fonts are picked up automatically with no further changes.

## Option B — drop the files in here

Add the licensed WOFF2 files with these exact filenames and the ready-made
`@font-face` rules in `assets/css/fonts.css` activate on the next page load:

| File | Family | Used for |
| --- | --- | --- |
| `inter-tight-variable.woff2` | Inter Tight | Headings |
| `inter-variable.woff2` | Inter | Body and interface |
| `ibm-plex-mono-400.woff2` | IBM Plex Mono | Technical metadata |
| `ibm-plex-mono-500.woff2` | IBM Plex Mono (medium) | Eyebrows, labels |

Static weights work too — adjust the `font-weight` ranges in `fonts.css` to
match whatever you add.

## Licensing

Inter, Inter Tight and IBM Plex Mono are all published under the SIL Open Font
License, which permits self-hosting. Download them from the Google Fonts or IBM
Plex releases and convert to WOFF2 if needed.

**Do not** replace these with a runtime third-party CDN link — the theme is
built to make zero external font requests.
