#!/usr/bin/env node
// og-cards.mjs — renders each sub-page's 1200×630 share card (og:image / twitter:image) from tools/pages/<id>.json:
// the page's own store photo + its og.kicker / og.headline, typeset in the site's Tanker + Satoshi, with the yellow fascia.
// Headless, muted Chrome; output → assets/og/<id>-1200x630.jpg (JPEG on purpose: social scrapers). Never ships (tools/).
//   node tools/og-cards.mjs            (every page)      node tools/og-cards.mjs visit-reno   (one page)
// Assets under /assets are cached immutable — if a card changes after launch, give it a new filename.
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
// Photo per image key — the same files tools/build-pages.mjs serves (largest JPEG of each).
const PHOTO = { 'window-sign': 'assets/marquee-09-window-sign-860x1147.jpg', aisle: 'assets/hero-aisle-mobile-np2-1560x3376.jpg',
  chandeliers: 'assets/m/tile-home-goods-chandeliers-np3-1116x1488.jpg', hutch: 'assets/tile-furniture-hutch-1116x1488.jpg',
  americana: 'assets/tile-collectibles-americana-1116x1488.jpg', china: 'assets/tile-china-teapots-960x1280.jpg',
  coins: 'assets/tile-currency-coins-960x1280.jpg', storefront: 'assets/visit-storefront-exterior-1536x1044.jpg', lamps: 'assets/d/lamp-panel-1020.jpg' }
const POS = { aisle: '50% 60%', storefront: '58% 50%' }
const f = p => pathToFileURL(join(ROOT, p)).href
const only = process.argv[2]
const specs = readdirSync(join(ROOT, 'tools', 'pages')).filter(n => n.endsWith('.json') && (!only || n === `${only}.json`))
const tmp = join(tmpdir(), `og-${process.pid}`); mkdirSync(tmp, { recursive: true }); mkdirSync(join(ROOT, 'assets', 'og'), { recursive: true })

for (const name of specs) {
  const id = name.replace(/\.json$/, ''), s = JSON.parse(readFileSync(join(ROOT, 'tools', 'pages', name), 'utf8'))
  const key = s.hero.photo.img, head = s.og.headline || s.hero.h1, plain = head.replace(/<[^>]+>/g, '')
  const size = plain.length <= 34 ? 96 : plain.length <= 52 ? 84 : plain.length <= 72 ? 72 : 62
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Tanker;src:url('${f('assets/fonts/tanker-400.woff2')}') format('woff2')}
@font-face{font-family:Satoshi;font-weight:700;src:url('${f('assets/fonts/satoshi-700.woff2')}') format('woff2')}
@font-face{font-family:Satoshi;font-weight:500;src:url('${f('assets/fonts/satoshi-500.woff2')}') format('woff2')}
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;background:#14201B}
.card{position:relative;width:1200px;height:630px;display:grid;grid-template-columns:690px 510px;grid-template-rows:1fr 84px;
 background:#14201B repeating-linear-gradient(90deg,rgba(237,235,227,.05) 0 1px,transparent 1px 72px),repeating-linear-gradient(0deg,rgba(237,235,227,.05) 0 1px,transparent 1px 72px)}
.words{padding:58px 48px 30px 60px;display:flex;flex-direction:column;justify-content:center;gap:24px;color:#EDEBE3}
.kick{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font:700 24px/1.2 Satoshi;letter-spacing:.06em;text-transform:uppercase;color:#F5D31C}
.kick b{font:400 26px/1 Tanker;letter-spacing:.03em;color:#EDEBE3;border:2px solid #EDEBE3;border-radius:4px;padding:6px 10px 4px;text-transform:none}
h1{font:400 ${size}px/.94 Tanker;letter-spacing:.005em;text-transform:uppercase;text-wrap:balance}
h1 .hl{color:#F5D31C}
.photo{position:relative;border-left:6px solid #D9A400;overflow:hidden}
.photo img{width:100%;height:100%;object-fit:cover;object-position:${POS[key] || '50% 50%'};filter:saturate(1.15)}
.fascia{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:0 40px 0 60px;background:#D9A400;border-top:3px solid #14201B;color:#14201B}
.fascia .name{font:400 40px/1 Tanker;letter-spacing:.01em}
.fascia .nap{font:700 19px/1.25 Satoshi;letter-spacing:.06em;text-transform:uppercase;text-align:right}
.x{position:absolute;right:22px;top:22px;width:58px;height:58px}
</style></head><body><div class="card">
<div class="words"><p class="kick">${s.og.kicker || ''}</p><h1>${head}</h1></div>
<div class="photo"><img src="${f(PHOTO[key])}" alt=""><svg class="x" viewBox="0 0 48 48"><path d="M10 10 L38 38 M38 10 L10 38" stroke="#EDEBE3" stroke-width="11" stroke-linecap="square" fill="none"/><path d="M10 10 L38 38 M38 10 L10 38" stroke="#7A2E1F" stroke-width="6" stroke-linecap="square" fill="none"/></svg></div>
<div class="fascia"><p class="name">Carson Antiques &amp; Collectibles Mall</p><p class="nap">1831 N Carson St · Carson City, NV<br>Open every day 10–6</p></div>
</div></body></html>`
  const page = join(tmp, `${id}.html`), png = join(tmp, `${id}.png`)
  writeFileSync(page, html)
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--force-device-scale-factor=1', '--window-size=1200,630',
    '--allow-file-access-from-files', '--virtual-time-budget=4000', `--user-data-dir=${join(tmp, 'prof')}`, `--screenshot=${png}`, pathToFileURL(page).href], { stdio: 'ignore' })
  if (!existsSync(png)) throw new Error(`no screenshot for ${id}`)
  const out = join(ROOT, 'assets', 'og', `${id}-1200x630.jpg`)
  execFileSync('python', ['-c', `from PIL import Image; im=Image.open(r'${png}').convert('RGB'); assert im.size==(1200,630), im.size; im.save(r'${out}', quality=86, optimize=True, progressive=True)`])
  console.log(`wrote assets/og/${id}-1200x630.jpg`)
}
rmSync(tmp, { recursive: true, force: true })
