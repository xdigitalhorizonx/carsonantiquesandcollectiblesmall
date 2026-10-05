# Carson Antiques & Collectibles Mall — website

Static homepage for Carson Antiques & Collectibles Mall, 1831 N Carson St, Carson City, NV 89701 · (775) 461-3142 · open every day 10 AM–6 PM.

Built by Digital Horizon (Carson City, NV). Self-contained: `index.html` + `styles.css` + `app.js` + `assets/` (self-hosted fonts, images, anime.js). No build step — deploy the folder as-is.

Canonical/production host: `https://carsoncityantiquemall.com/` (pending domain recovery). See the `TODO (pre-publish)` comments in `index.html` for items awaiting client confirmation.

Root files: `robots.txt`, `sitemap.xml` (no `<lastmod>` — add the real date at deploy), `llms.txt`, `favicon.ico`, and a headers-only `vercel.json` (immutable `/assets`, security headers, a Report-Only CSP). `tools/` holds build tooling that never ships (`.vercelignore` excludes it and every `*.md`): `encode.py` makes the `assets/d/` desktop encodes (Pillow, `python tools/encode.py`), `csp-hash.mjs` re-pins the CSP hash of the one inline `<head>` script (`node tools/csp-hash.mjs` after any edit to it). Assets under `/assets` are cached as immutable, so a changed image needs a new filename.
