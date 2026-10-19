# Carson Antiques & Collectibles Mall — website

Static homepage for Carson Antiques & Collectibles Mall, 1831 N Carson St, Carson City, NV 89701 · (775) 461-3142 · open every day 10 AM–6 PM.

Built by Digital Horizon (Carson City, NV). Self-contained: `index.html` + `styles.css` + `app.js` + `assets/` (self-hosted fonts, images, the custom anime.js build). No build step — deploy the folder as-is.

Canonical/production host: `https://carsonantiquesandcollectibles.com/` (apex; www 301s to it). Launched 2026-10-19 from `main` on Vercel. See the `TODO (pre-publish)` comments in `index.html` for items awaiting client confirmation.

Root files: `robots.txt`, `sitemap.xml` (`<lastmod>` = the real publish date — bump it on each content deploy), `llms.txt`, `favicon.ico`, and a headers-only `vercel.json` (immutable `/assets`, security headers, a Report-Only CSP). `tools/` holds build tooling that never ships (`.vercelignore` excludes it and every `*.md`): `encode.py` makes the `assets/d/` desktop encodes (Pillow, `python tools/encode.py`), `csp-hash.mjs` re-pins the CSP hash of the one inline `<head>` script (`node tools/csp-hash.mjs` after any edit to it). `anime-entry.mjs` is the entry for the custom anime.js 4.5.0 build `assets/anime-4.5.0-cacm.min.js` (the page's one motion engine): rebuild it with esbuild 0.28.2 run from outside the repo — the command is in the file. Assets under `/assets` are cached as immutable, so a changed image needs a new filename.

Notes for reviewers (fix-r2):
- The CSP is Report-Only on purpose and omits `upgrade-insecure-requests`: browsers ignore that directive in a Report-Only header. Add it back when the policy becomes an enforcing `Content-Security-Policy`.
- Photo honesty (spec §5.5): the shipped hero, phone-hero, landscape and share-card images are `-np2` (hero, phone-hero, landscape; fix-r3) and `-np` (share card) files with the stale "10% off" booth sign and the old grocery-wall lettering retouched out (`python tools/encode.py --hero-np`); the marquee/tile price tags are blanked — the tag stays, only the ink goes (`--noprice3`, fix-r3; replaces the round-1/2 blur patches). The raw masters stay in git for those scripts but are listed in `.vercelignore`.
- Spec deviation kept: the oil-lamp alt says "inside the mall", not the spec's "on a booth shelf" — no shelf is visible in the shipped crop, so "shelf" could not be verified.
