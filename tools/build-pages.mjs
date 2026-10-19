#!/usr/bin/env node
// build-pages.mjs — assembles the sub-pages (/visit/…, /blog/…) from tools/pages/<id>.json + tools/pages/<id>.main.html,
// and rewrites sitemap.xml + blog/feed.xml. Never ships (.vercelignore excludes tools/).
//
// Why a generator: every sub-page must carry the SAME head kit, header, footer, NAP and JSON-LD stubs, character for character
// (SCHEMA-STANDARD NAP parity). The committed HTML is still the source of truth that deploys; re-run after editing a spec:
//   node tools/build-pages.mjs            (writes every page)
//   node tools/build-pages.mjs --check    (writes nothing; exits 1 if any page on disk differs from what it would write)
//
// Main-fragment tokens (expanded here, so the markup stays identical across pages):
//   {{img:KEY|alt|caption|shape}} framed photo (.photo); shape = wide (4:3) or square, default 4:5
//   {{route}}                   the page's road strip (spec.route), horizontal ≥900 px, vertical below
//   {{compass}}                 the four-approaches diagram (visit hub)
//   {{guide}}                   the drive-time guide sign, each line linking to its city page (visit hub)
//   {{hours}}                   the letter-board hours sign (id="hours")
//   {{cards:id,id,…}}           sibling cards (2, 3 or 4 — balanced counts only)
// FAQPage JSON-LD is generated from the visible <dl class="faq" data-faq> rows, so schema and DOM can't drift.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PAGES_DIR = join(ROOT, 'tools', 'pages')
const CHECK = process.argv.includes('--check')
const SITE = 'https://carsonantiquesandcollectibles.com'
const BUILT = '2026-10-19'

// ---- NAP: identical strings to index.html's #business node and footer. Never vary. ----
const NAME = 'Carson Antiques & Collectibles Mall'
const NAME_HTML = 'Carson Antiques &amp; Collectibles Mall'
const STREET = '1831 N Carson St', CITY = 'Carson City', REGION = 'NV', ZIP = '89701'
const PHONE = '(775) 461-3142', TEL = 'tel:+17754613142', PHONE_LD = '+1-775-461-3142'
const DEST = 'destination=Carson%20Antiques%20%26%20Collectibles%20Mall%2C%201831%20N%20Carson%20St%2C%20Carson%20City%2C%20NV%2089701&amp;destination_place_id=ChIJV4dzZtkKmYARQRRib-5tQW8'
const dirUrl = origin => `https://www.google.com/maps/dir/?api=1&amp;${DEST}${origin ? `&amp;origin=${encodeURIComponent(origin)}` : ''}`

// ---- images: existing encodes only (the -np files are the price-free retouches) ----
const IMG = {
  'window-sign': { src: '/assets/marquee-09-window-sign-860x1147.jpg', w: 860, h: 1147,
    avif: '/assets/m/marquee-09-window-sign-480.avif 480w, /assets/m/marquee-09-window-sign-720.avif 720w',
    webp: '/assets/m/marquee-09-window-sign-480.webp 480w, /assets/m/marquee-09-window-sign-720.webp 720w',
    jpg: '/assets/marquee-09-window-sign-860x1147.jpg 860w' },
  'aisle': { src: '/assets/hero-aisle-mobile-np2-1560x3376.jpg', w: 1560, h: 3376, cls: 'pos-aisle',
    avif: '/assets/m/hero-aisle-mobile-np2-780.avif 780w, /assets/m/hero-aisle-mobile-np2-960.avif 960w, /assets/m/hero-aisle-mobile-np2-1170.avif 1170w',
    webp: '/assets/m/hero-aisle-mobile-np2-780.webp 780w, /assets/m/hero-aisle-mobile-np2-960.webp 960w, /assets/m/hero-aisle-mobile-np2-1170.webp 1170w',
    jpg: '/assets/hero-aisle-mobile-np2-1560x3376.jpg 1560w' },
  'chandeliers': { src: '/assets/m/tile-home-goods-chandeliers-np3-1116x1488.jpg', w: 1116, h: 1488,
    avif: '/assets/m/tile-home-goods-chandeliers-np3-480.avif 480w, /assets/m/tile-home-goods-chandeliers-np3-720.avif 720w, /assets/m/tile-home-goods-chandeliers-np3-full.avif 1116w',
    webp: '/assets/m/tile-home-goods-chandeliers-np3-480.webp 480w, /assets/m/tile-home-goods-chandeliers-np3-720.webp 720w, /assets/m/tile-home-goods-chandeliers-np3-full.webp 1116w',
    jpg: '/assets/m/tile-home-goods-chandeliers-np3-1116x1488.jpg 1116w' },
  'hutch': { src: '/assets/tile-furniture-hutch-1116x1488.jpg', w: 1116, h: 1488,
    avif: '/assets/m/tile-furniture-hutch-480.avif 480w, /assets/m/tile-furniture-hutch-720.avif 720w, /assets/m/tile-furniture-hutch-full.avif 1116w',
    webp: '/assets/m/tile-furniture-hutch-480.webp 480w, /assets/m/tile-furniture-hutch-720.webp 720w, /assets/m/tile-furniture-hutch-full.webp 1116w',
    jpg: '/assets/tile-furniture-hutch-1116x1488.jpg 1116w' },
  'americana': { src: '/assets/tile-collectibles-americana-1116x1488.jpg', w: 1116, h: 1488,
    avif: '/assets/m/tile-collectibles-americana-480.avif 480w, /assets/m/tile-collectibles-americana-720.avif 720w, /assets/m/tile-collectibles-americana-full.avif 1116w',
    webp: '/assets/m/tile-collectibles-americana-480.webp 480w, /assets/m/tile-collectibles-americana-720.webp 720w, /assets/m/tile-collectibles-americana-full.webp 1116w',
    jpg: '/assets/tile-collectibles-americana-1116x1488.jpg 1116w' },
  'china': { src: '/assets/tile-china-teapots-960x1280.jpg', w: 960, h: 1280,
    avif: '/assets/m/tile-china-teapots-480.avif 480w, /assets/m/tile-china-teapots-720.avif 720w, /assets/m/tile-china-teapots-full.avif 960w',
    webp: '/assets/m/tile-china-teapots-480.webp 480w, /assets/m/tile-china-teapots-720.webp 720w, /assets/m/tile-china-teapots-full.webp 960w',
    jpg: '/assets/tile-china-teapots-960x1280.jpg 960w' },
  'coins': { src: '/assets/tile-currency-coins-960x1280.jpg', w: 960, h: 1280,
    avif: '/assets/m/tile-currency-coins-480.avif 480w, /assets/m/tile-currency-coins-720.avif 720w, /assets/m/tile-currency-coins-full.avif 960w',
    webp: '/assets/m/tile-currency-coins-480.webp 480w, /assets/m/tile-currency-coins-720.webp 720w, /assets/m/tile-currency-coins-full.webp 960w',
    jpg: '/assets/tile-currency-coins-960x1280.jpg 960w' },
  'storefront': { src: '/assets/visit-storefront-exterior-1536x1044.jpg', w: 1536, h: 1044,
    avif: '/assets/m/visit-storefront-720.avif 720w, /assets/m/visit-storefront-1080.avif 1080w, /assets/d/visit-storefront-1536.avif 1536w',
    webp: '/assets/m/visit-storefront-720.webp 720w, /assets/m/visit-storefront-1080.webp 1080w, /assets/d/visit-storefront-1536.webp 1536w',
    jpg: '/assets/visit-storefront-exterior-1536x1044.jpg 1536w' },
  'lamps': { src: '/assets/d/lamp-panel-1020.jpg', w: 1020, h: 1267,
    avif: '/assets/d/lamp-panel-640.avif 640w, /assets/d/lamp-panel-760.avif 760w, /assets/d/lamp-panel-1020.avif 1020w',
    webp: '/assets/d/lamp-panel-640.webp 640w, /assets/d/lamp-panel-760.webp 760w, /assets/d/lamp-panel-1020.webp 1020w',
    jpg: '/assets/d/lamp-panel-640.jpg 640w, /assets/d/lamp-panel-760.jpg 760w, /assets/d/lamp-panel-1020.jpg 1020w' },
}
const esc = s => String(s).replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const attr = s => esc(s)

function picture(key, { alt, sizes, eager = false } = {}) {
  const im = IMG[key]; if (!im) throw new Error(`unknown image key ${key}`)
  const load = eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'
  const cls = im.cls ? ` class="${im.cls}"` : ''   // no inline style attributes anywhere (CSP style-src 'self')
  return `<picture><source type="image/avif" srcset="${im.avif}" sizes="${sizes}"><source type="image/webp" srcset="${im.webp}" sizes="${sizes}"><img${cls} src="${im.src}" srcset="${im.jpg}" sizes="${sizes}" width="${im.w}" height="${im.h}" ${load} alt="${attr(alt)}"></picture>`
}

// ---- page specs ----
const specs = readdirSync(PAGES_DIR).filter(f => f.endsWith('.json')).map(f => {
  const s = JSON.parse(readFileSync(join(PAGES_DIR, f), 'utf8')); s.id = f.replace(/\.json$/, '')
  s.url = SITE + s.path; return s
})
const byId = Object.fromEntries(specs.map(s => [s.id, s]))

// ---- shared chrome ----
const NAV = [['Booths', '/#booths'], ['Treasure Map', '/#map'], ['Rent a booth', '/#rent'], ['Visit', '/visit/'], ['Blog', '/blog/'], ['FAQ', '/#faq']]
const navList = path => NAV.map(([t, h]) => `<li><a href="${h}"${h === path ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')

const SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false">
  <symbol id="ink-x" viewBox="0 0 48 48"><path class="ink-x__under" d="M10 10 L38 38 M38 10 L10 38" fill="none" stroke-width="11" stroke-linecap="square"/><path class="ink-x__core" d="M10 10 L38 38 M38 10 L10 38" fill="none" stroke-width="6" stroke-linecap="square"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" /></symbol>
  <symbol id="i-navigation" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></symbol>
</svg>`

const header = path => `<header class="site-head">
  <div class="wrap site-head__row">
    <a class="lockup" href="/"><span>Carson Antiques &amp;</span> <span>Collectibles Mall</span></a>
    <nav class="site-nav" aria-label="Main"><ul>
      ${navList(path)}
    </ul></nav>
    <p class="site-head__open"><span aria-hidden="true">■</span> Open every day 10–6</p>
    <a class="btn btn--yellow btn--sm site-head__cta" href="${TEL}">Call ${PHONE}</a>
  </div>
</header>`

const footer = path => `<footer class="footer">
  <div class="band band--ground footer__main">
    <h2 class="sr-only">Contact</h2>
    <div class="wrap footer__grid">
      <div class="footer__brand"><p class="footer__name">${NAME_HTML}</p><p class="footer__tag">Northern Nevada's largest antique mall · Carson City, NV</p></div>
      <address class="footer__nap">
        <span>${STREET}, ${CITY}, ${REGION} ${ZIP}</span>
        <a href="${TEL}">${PHONE}</a>
        <span class="footer__hours num">Open every day <span class="nw">10 AM – 6 PM</span></span>
      </address>
      <nav class="footer__nav" aria-label="Footer">
        <ul>
          ${navList(path)}
        </ul>
      </nav>
      <div class="footer__more">
        <ul class="footer__links">
          <li><a href="https://www.facebook.com/CARSONANTIQUESANDCOLLECTIBLESMALL/" rel="noopener">Facebook</a></li>
          <li><a href="https://www.instagram.com/carsonantiquesandcollectibles" rel="noopener">Instagram</a></li>
          <li><a href="https://www.yelp.com/biz/carson-antiques-and-collectibles-mall-carson-city" rel="noopener">Yelp</a></li>
          <li><a href="${dirUrl()}" rel="noopener">Get directions</a></li>
        </ul>
      </div>
    </div>
  </div>
  <div class="footer__fascia"><div class="wrap">
    <p class="footer__wordmark"><span class="fw"><span>Carson Antiques &amp;</span></span> <span class="fw"><span>Collectibles Mall</span></span></p>
    <p class="footer__fascia-tag">Gifts <i aria-hidden="true">●</i> Home Decor <i aria-hidden="true">●</i> Art <i aria-hidden="true">●</i> Toys <i aria-hidden="true">●</i> &amp; More!</p>
    <div class="footer__rule"><span class="xmark-wink" aria-hidden="true"></span></div>
    <p class="legal">© 2026 ${NAME_HTML}</p>
    <p class="credit">Powered by <a href="https://digitalhorizon.dev/" rel="noopener">Digital Horizon</a></p>
  </div></div>
</footer>

<nav class="actionbar" aria-label="Quick actions">
  <a href="${TEL}"><svg aria-hidden="true" focusable="false"><use href="#i-phone"/></svg><span>Call<span class="sr-only"> ${PHONE}</span></span></a>
  <a href="${dirUrl()}" rel="noopener"><svg aria-hidden="true" focusable="false"><use href="#i-navigation"/></svg><span>Directions</span></a>
  <a href="/visit/#hours"><svg aria-hidden="true" focusable="false"><use href="#i-clock"/></svg><span>Hours</span></a>
</nav>`

// ---- hero ----
function crumbs(s) {
  const items = s.crumbs.map(([t, h], i, a) => i === a.length - 1
    ? `<li><span aria-current="page">${t}</span></li>` : `<li><a href="${h}">${t}</a></li>`).join('')
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`
}
function hero(s) {
  const h = s.hero
  const shield = h.shield ? `<p class="shield">${(h.shield.roads || []).map(r => `<span class="shield__road">${r}</span>`).join('')}<span class="shield__text">${h.shield.text}</span></p>` : ''
  const eyebrow = !h.shield && h.eyebrow ? `<p class="shield"><span class="shield__text">${h.eyebrow}</span></p>` : ''
  const meta = s.post ? `<ul class="post-meta"><li><time datetime="${s.post.date}">${s.post.dateText}</time></li><li>${s.post.section}</li><li>${s.post.read}</li></ul>` : ''
  const ctas = (h.ctas || []).map(c => {
    const href = c.href === 'DIRECTIONS' ? dirUrl(c.origin) : c.href === 'TEL' ? TEL : c.href
    const icon = c.icon ? `<svg aria-hidden="true" focusable="false"><use href="#i-${c.icon}"/></svg>` : ''
    const rel = /^https?:/.test(href) ? ' rel="noopener"' : ''
    return `<a class="btn btn--${c.kind || 'yellow'}" href="${href}"${rel}>${icon}${c.label}</a>`
  }).join('\n          ')
  const facts = h.facts ? `<ul class="phero__facts">${h.facts.map(f => `<li>${f}</li>`).join('')}</ul>` : ''
  const ph = h.photo
  const photo = ph ? `<figure class="phero__photo${ph.wide ? ' phero__photo--wide' : ''}">
        ${picture(ph.img, { alt: ph.alt, eager: true, sizes: '(min-width: 1184px) 454px, (min-width: 900px) 36vw, min(454px, calc(100vw - 48px))' })}
        <figcaption>${ph.caption}</figcaption>
      </figure>` : ''
  const long = h.h1.replace(/<[^>]+>/g, '').length > 50 ? ' phero--long' : ''   // long H1s step down one size
  return `<section class="phero${long}" aria-labelledby="page-h1">
    <div class="wrap">
      ${crumbs(s)}
      <div class="phero__grid">
        <div class="phero__words">
          ${shield}${eyebrow}
          <h1 id="page-h1">${h.h1}</h1>
          ${meta}
          <p class="phero__lede">${h.lede}</p>
          ${ctas ? `<div class="phero__ctas">\n          ${ctas}\n        </div>` : ''}
          ${facts}
        </div>
        ${photo}
      </div>
    </div>
  </section>`
}

// ---- tokens ----
function photoFigure(key, alt, caption, shape) {
  const mod = shape ? ` photo--${shape}` : ''   // shape: wide (4:3) | square; default 4:5
  return `<figure class="photo${mod}">${picture(key, { alt, sizes: 'min(508px, calc(100vw - 44px))' })}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
}

function routeSvg(r) {
  const n = r.stops.length, x0 = 50, x1 = 950, y = 104
  const xs = r.stops.map((_, i) => Math.round(x0 + i * (x1 - x0) / (n - 1)))
  let hz = `<line class="street__edge" x1="${x0}" y1="${y - 13}" x2="${x1}" y2="${y - 13}"/><line class="street__edge" x1="${x0}" y1="${y + 13}" x2="${x1}" y2="${y + 13}"/><path class="street__centre" d="M${x0} ${y}H${x1}"/>`
  let prev = null
  r.roads.forEach((road, i) => {
    if (road === prev) return; prev = road
    const mx = Math.round((xs[i] + xs[i + 1]) / 2), w = Math.round(road.length * 10.5 + 20)   // Tanker is condensed
    hz += `<g class="route__shield"><rect x="${mx - w / 2}" y="${y - 17}" width="${w}" height="34" rx="4"/><text x="${mx}" y="${y + 8}" text-anchor="middle">${road}</text></g>`
  })
  r.stops.forEach((st, i) => {
    const last = i === n - 1, first = i === 0
    if (last) hz += `<use class="route__x" href="#ink-x" x="${xs[i] - 22}" y="${y - 22}" width="44" height="44"/>`
    else hz += `<circle class="${first ? 'street__start' : 'street__pin'}" cx="${xs[i]}" cy="${y}" r="${first ? 14 : 8}"/>`
    const above = i % 2 === 0, ty = above ? y - 44 : y + 64
    const anchor = first ? 'start' : last ? 'end' : 'middle', tx = first ? xs[i] - 14 : last ? xs[i] + 22 : xs[i]
    hz += `<text class="street__label${last ? ' street__label--door' : ''}" x="${tx}" y="${ty}" text-anchor="${anchor}">${st}</text>`
  })
  const H = 40 + (n - 1) * 104 + 40, X = 40
  const ys = r.stops.map((_, i) => 40 + i * 104)
  let vt = `<line class="street__edge" x1="${X - 12}" y1="${ys[0]}" x2="${X - 12}" y2="${ys[n - 1]}"/><line class="street__edge" x1="${X + 12}" y1="${ys[0]}" x2="${X + 12}" y2="${ys[n - 1]}"/><path class="street__centre" d="M${X} ${ys[0]}V${ys[n - 1]}"/>`
  prev = null
  r.roads.forEach((road, i) => {
    if (road === prev) return; prev = road
    vt += `<text class="route__road-v" x="${X + 34}" y="${Math.round((ys[i] + ys[i + 1]) / 2) + 6}">via ${road}</text>`
  })
  r.stops.forEach((st, i) => {
    const last = i === n - 1, first = i === 0
    if (last) vt += `<use class="route__x" href="#ink-x" x="${X - 20}" y="${ys[i] - 20}" width="40" height="40"/>`
    else vt += `<circle class="${first ? 'street__start' : 'street__pin'}" cx="${X}" cy="${ys[i]}" r="${first ? 13 : 8}"/>`
    vt += `<text class="street__label${last ? ' street__label--door' : ''}" x="${X + 34}" y="${ys[i] + 7}">${st}</text>`
  })
  return `<div class="route">
      <svg class="street__road street__road--h" viewBox="0 0 1000 190" aria-hidden="true" focusable="false">${hz}</svg>
      <svg class="street__road street__road--v" viewBox="0 0 340 ${H}" aria-hidden="true" focusable="false">${vt}</svg>
      <p class="street__note">${r.note}</p>
    </div>`
}

const COMPASS = `<figure class="compass">
      <svg viewBox="0 0 640 600" role="img" aria-labelledby="compass-t">
        <title id="compass-t">The three ways in: Reno and Sparks from the north on I-580, Lake Tahoe from the west on US-50, Carson Valley from the south on US-395. Not to scale.</title>
        <path class="compass__road" d="M308 300V70M332 300V70"/><path class="compass__lane" d="M320 300V70"/>
        <path class="compass__road" d="M320 288H90M320 312H90"/><path class="compass__lane" d="M320 300H90"/>
        <path class="compass__road" d="M308 300V530M332 300V530"/><path class="compass__lane" d="M320 300V530"/>
        <g class="compass__shield"><rect x="281" y="160" width="78" height="34" rx="4"/><text x="320" y="185" text-anchor="middle">I-580</text></g>
        <g class="compass__shield"><rect x="168" y="283" width="72" height="34" rx="4"/><text x="204" y="308" text-anchor="middle">US-50</text></g>
        <g class="compass__shield"><rect x="279" y="404" width="82" height="34" rx="4"/><text x="320" y="429" text-anchor="middle">US-395</text></g>
        <circle class="compass__town" cx="320" cy="62" r="12"/><text class="compass__label" x="342" y="50">Reno &amp; Sparks</text><text class="compass__time" x="342" y="74">31 mi · about 40 min</text>
        <circle class="compass__town" cx="84" cy="300" r="12"/><text class="compass__label" x="60" y="256">Lake Tahoe</text><text class="compass__time" x="60" y="352">26–30 mi</text><text class="compass__time" x="60" y="374">about 45–55 min</text>
        <circle class="compass__town" cx="320" cy="538" r="12"/><text class="compass__label" x="342" y="534">Carson Valley</text><text class="compass__time" x="342" y="558">16–18 mi · about 30–35 min</text>
        <use class="compass__x" href="#ink-x" x="290" y="270" width="60" height="60"/>
        <text class="compass__us" x="368" y="292">1831 N Carson St</text><text class="compass__time" x="368" y="316">Carson City</text>
      </svg>
      <figcaption class="compass__note">Not to scale. Drive times from the town centers to our door.</figcaption>
    </figure>`

const HOURS = `<div class="board" id="hours">
            <p class="board__title"><span>Open every day</span> <span>10 AM – 6 PM</span></p>
            <ul class="board__days" aria-label="Hours by day">
              <li><span class="board__abbr" aria-hidden="true">Mon</span><span class="sr-only">Monday, 10 AM to 6 PM</span></li>
              <li><span class="board__abbr" aria-hidden="true">Tue</span><span class="sr-only">Tuesday, 10 AM to 6 PM</span></li>
              <li><span class="board__abbr" aria-hidden="true">Wed</span><span class="sr-only">Wednesday, 10 AM to 6 PM</span></li>
              <li><span class="board__abbr" aria-hidden="true">Thu</span><span class="sr-only">Thursday, 10 AM to 6 PM</span></li>
              <li><span class="board__abbr" aria-hidden="true">Fri</span><span class="sr-only">Friday, 10 AM to 6 PM</span></li>
              <li><span class="board__abbr" aria-hidden="true">Sat</span><span class="sr-only">Saturday, 10 AM to 6 PM</span></li>
              <li><span class="board__abbr" aria-hidden="true">Sun</span><span class="sr-only">Sunday, 10 AM to 6 PM</span></li>
            </ul>
            <p class="board__note">Regular hours — Saturday and Sunday included.</p>
          </div>`

function guide() {
  // Drive times: the homepage's sourced DIST table only (index.html, #getting-here comment). Never recomputed here.
  const L = [
    ['visit-reno', 'Reno &amp; Sparks', '31 mi', 'about 40 min', ['I-580'], 'Plan the trip from Reno'],
    ['visit-lake-tahoe', 'Lake Tahoe', '26–30 mi', 'about 45–55 min', ['US-50'], 'Plan the trip from the lake'],
    ['visit-minden-gardnerville', 'Carson Valley <span class="nw">(Minden–Gardnerville)</span>', '16–18 mi', 'about 30–35 min', ['US-395'], 'Plan the trip from the Valley'],
    ['visit-carson-city', 'Already in Carson City', '0.9 mi', 'north of the Capitol', ['N Carson St'], 'Plan a day downtown'],
  ]
  return `<div class="guide guide--4" id="getting-here">
        <h3>Coming from Reno, the lake or the Valley?</h3>
        <ul class="guide__list">
${L.map(([id, town, mi, min, roads, cta]) => `          <li><a class="guide__line" href="${byId[id] ? byId[id].path : '#'}"><span class="g-town">${town}</span><span class="g-sep"> — </span><span class="g-mi">${mi}</span>, <span class="g-min">${min}</span> via ${roads.map(r => `<span class="g-route">${r}</span>`).join(' and ')}<span class="g-cta"><span class="g-dot"> · </span>${cta}</span></a></li>`).join('\n')}
        </ul>
      </div>`
}

function cards(ids) {
  const list = ids.map(i => byId[i] || (() => { throw new Error(`cards: unknown page ${i}`) })())
  if (![2, 3, 4].includes(list.length)) throw new Error('cards: use 2, 3 or 4 (balanced rows)')
  return `<ul class="cards cards--${list.length}">
${list.map(p => `        <li class="card">
          <figure>${picture(p.card.img, { alt: '', sizes: list.length === 3 ? '(min-width: 960px) 373px, (min-width: 680px) 40vw, 100vw' : '(min-width: 680px) 50vw, 100vw' })}</figure>
          <div class="card__text"><p class="card__kicker">${p.card.kicker}</p><h3><a href="${p.path}">${p.card.title}</a></h3><p>${p.card.text}</p><p class="card__more" aria-hidden="true">${p.card.more || 'Read it'} →</p></div>
        </li>`).join('\n')}
      </ul>`
}

function expand(html, s) {
  return html
    .replace(/\{\{img:([^|}]+)\|([^|}]*)\|([^|}]*)(?:\|([^}]*))?\}\}/g, (_, k, alt, cap, ar) => photoFigure(k.trim(), alt.trim(), cap.trim(), ar && ar.trim()))
    .replace(/\{\{route\}\}/g, () => routeSvg(s.route))
    .replace(/\{\{compass\}\}/g, COMPASS)
    .replace(/\{\{guide\}\}/g, () => guide())
    .replace(/\{\{hours\}\}/g, HOURS)
    .replace(/\{\{cards:([^}]+)\}\}/g, (_, ids) => cards(ids.split(',').map(x => x.trim())))
}

function closeBand(s) {
  const c = s.close || {}
  return `<section class="band band--barn rent-band close-band" aria-labelledby="close-h2">
    <div class="wrap rent">
      <div class="rent__pitch">
        <p class="kicker">${c.kicker || 'Come see it'}</p>
        <p class="rent__display"><span>Open every day.</span> <span>10 to 6.</span></p>
        <h2 id="close-h2">${c.h2}</h2>
        <p class="rent__body">${c.body}</p>
        <div class="close__btns">
          <a class="btn btn--yellow" href="${dirUrl(c.origin)}" rel="noopener"><svg aria-hidden="true" focusable="false"><use href="#i-navigation"/></svg>${c.dirLabel || 'Get directions'}</a>
          <a class="btn btn--ghost" href="${TEL}"><svg aria-hidden="true" focusable="false"><use href="#i-phone"/></svg>Call ${PHONE}</a>
        </div>
        <p class="close__fine">Holiday hours aren't posted — call <a class="nw" href="${TEL}">${PHONE}</a> before a holiday trip.</p>
      </div>
      <div class="rent__sign"><a class="forrent" href="${TEL}"><span class="forrent__big">Open 10–6</span> <span class="forrent__call">Call ${PHONE}</span></a></div>
    </div>
  </section>`
}

// ---- JSON-LD ----
const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“', hellip: '…', middot: '·', times: '×', deg: '°', frac12: '½', eacute: 'é', rarr: '→', copy: '©', reg: '®', trade: '™', prime: '′', Prime: '″' }
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? (() => { throw new Error(`decode: add &${e}; to ENT`) })()))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
const text = s => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
function faqFrom(html) {
  return [...html.matchAll(/<div class="faq__row"[^>]*><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g)].map(m => ({ q: text(m[1]), a: text(m[2]) }))
}
const BIZ = { '@type': 'Store', '@id': `${SITE}/#business`, name: NAME, url: `${SITE}/`, telephone: PHONE_LD,
  address: { '@type': 'PostalAddress', streetAddress: STREET, addressLocality: CITY, addressRegion: REGION, postalCode: ZIP, addressCountry: 'US' } }
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: NAME, publisher: { '@id': `${SITE}/#business` } }

function graph(s, main) {
  const id = frag => `${s.url}#${frag}`
  const og = `${SITE}${s.og.image}`
  const page = { '@type': s.pageType || 'WebPage', '@id': id('webpage'), url: s.url, name: s.title, description: s.description, inLanguage: 'en-US',
    isPartOf: { '@id': `${SITE}/#website` }, breadcrumb: { '@id': id('breadcrumb') },
    primaryImageOfPage: { '@type': 'ImageObject', '@id': id('primaryimage'), url: og, width: 1200, height: 630 },
    datePublished: s.published || BUILT, dateModified: s.modified || BUILT }
  if (!s.post) page.about = { '@id': `${SITE}/#business` }
  if (s.mentions) page.mentions = s.mentions
  const crumbsLd = { '@type': 'BreadcrumbList', '@id': id('breadcrumb'), itemListElement: s.crumbs.map(([t, h], i, a) => {
    const item = { '@type': 'ListItem', position: i + 1, name: text(t) }
    if (i < a.length - 1) item.item = SITE + h; else item.item = s.url
    return item }) }
  const nodes = [BIZ, WEBSITE, page, crumbsLd]
  const faq = faqFrom(main)
  if (faq.length) nodes.push({ '@type': 'FAQPage', '@id': id('faq'), isPartOf: { '@id': id('webpage') },
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
  if (s.post) {
    const words = text(main.replace(/<dl class="faq"[\s\S]*?<\/dl>/g, '')).split(' ').length
    nodes.push({ '@type': 'BlogPosting', '@id': id('article'), headline: text(s.hero.h1), description: s.description,
      image: [og, SITE + IMG[s.hero.photo.img].src], datePublished: `${s.post.date}T09:00:00-07:00`, dateModified: `${s.modified || s.post.date}T09:00:00-07:00`,
      author: { '@id': `${SITE}/#business` }, publisher: { '@id': `${SITE}/#business` }, mainEntityOfPage: { '@id': id('webpage') },
      isPartOf: { '@id': `${SITE}/blog/#blog` }, articleSection: s.post.section, wordCount: words, inLanguage: 'en-US',
      ...(s.post.about ? { about: s.post.about } : {}) })
  }
  if (s.blogIndex) {
    const posts = specs.filter(p => p.post).sort((a, b) => b.post.date.localeCompare(a.post.date) || a.id.localeCompare(b.id))
    nodes.push({ '@type': 'Blog', '@id': `${SITE}/blog/#blog`, url: `${SITE}/blog/`, name: s.blogIndex.name, description: s.description,
      inLanguage: 'en-US', publisher: { '@id': `${SITE}/#business` },
      blogPost: posts.map(p => ({ '@type': 'BlogPosting', '@id': `${p.url}#article`, headline: text(p.hero.h1), url: p.url, datePublished: `${p.post.date}T09:00:00-07:00` })) })
  }
  if (s.trip) nodes.push({ '@type': 'TouristTrip', '@id': id('trip'), ...s.trip })
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }, null, 2)
}

// ---- head ----
function head(s, ld) {
  const og = `${SITE}${s.og.image}`
  const art = s.post ? `\n<meta property="article:published_time" content="${s.post.date}T09:00:00-07:00">\n<meta property="article:section" content="${attr(s.post.section)}">` : ''
  const feed = s.post || s.blogIndex ? `\n<link rel="alternate" type="application/rss+xml" title="${NAME_HTML} — Blog" href="/blog/feed.xml">` : ''
  return `<!doctype html>
<html lang="en">
<head>
<!-- Generated by tools/build-pages.mjs from tools/pages/${s.id}.json + ${s.id}.main.html — edit the spec, then re-run. -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(s.title)}</title>
<meta name="description" content="${attr(s.description)}">
<link rel="canonical" href="${s.url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#14201B">
<meta property="og:type" content="${s.post ? 'article' : 'website'}">
<meta property="og:site_name" content="${NAME_HTML}">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${s.url}">
<meta property="og:title" content="${attr(s.og.title)}">
<meta property="og:description" content="${attr(s.og.description || s.description)}">
<meta property="og:image" content="${og}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(s.og.alt)}">${art}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(s.og.title)}">
<meta name="twitter:description" content="${attr(s.og.description || s.description)}">
<meta name="twitter:image" content="${og}">
<meta name="twitter:image:alt" content="${attr(s.og.alt)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/favicon-96.png" sizes="96x96" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon-180.png">
<link rel="manifest" href="/site.webmanifest">${feed}
<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/tanker-400.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/satoshi-400.woff2">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/pages.css">
<script type="application/ld+json">
${ld}
</script>
</head>`
}

function render(s) {
  const mainFile = join(PAGES_DIR, `${s.id}.main.html`)
  const main = expand(readFileSync(mainFile, 'utf8').trim(), s)
  const sources = s.sources ? `\n<!-- SOURCES (every outside fact on this page; re-check before editing):\n${s.sources.map(x => `     · ${x}`).join('\n')} -->` : ''
  return `${head(s, graph(s, main))}
<body>
<a class="skip" href="#main">Skip to content</a>
${SPRITE}
${header(s.path)}

<main id="main">
  ${hero(s)}
${sources}
  ${main}

  ${s.close === false ? '' : closeBand(s)}
</main>

${footer(s.path)}
</body>
</html>
`
}

// ---- write pages ----
let drift = 0
const onDisk = f => readFileSync(f, 'utf8').replace(/\r\n/g, '\n')   // a CRLF checkout (core.autocrlf) is not drift
for (const s of specs) {
  const out = join(ROOT, s.path.replace(/^\//, ''), 'index.html')
  const html = render(s)
  if (CHECK) { if (!existsSync(out) || onDisk(out) !== html) { console.log(`DIFF ${s.path}`); drift++ } continue }
  mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, html); console.log(`wrote ${s.path}`)
}

// ---- sitemap.xml (home first, then every generated page) + blog feed ----
const imgLoc = k => `${SITE}${IMG[k].src}`
const urls = [`  <url>
    <loc>${SITE}/</loc>
    <lastmod>${BUILT}</lastmod>
    <image:image><image:loc>${SITE}/assets/hero-aisle-band-np2-3840x2400.jpg</image:loc></image:image>
    <image:image><image:loc>${SITE}/assets/tile-collectibles-americana-1116x1488.jpg</image:loc></image:image>
    <image:image><image:loc>${SITE}/assets/m/tile-home-goods-chandeliers-np3-1116x1488.jpg</image:loc></image:image>
    <image:image><image:loc>${SITE}/assets/tile-furniture-hutch-1116x1488.jpg</image:loc></image:image>
  </url>`, ...specs.slice().sort((a, b) => a.path.localeCompare(b.path)).map(s => `  <url>
    <loc>${s.url}</loc>
    <lastmod>${s.modified || BUILT}</lastmod>${s.hero.photo ? `\n    <image:image><image:loc>${imgLoc(s.hero.photo.img)}</image:loc></image:image>` : ''}
  </url>`)]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- <lastmod> is the real publish date, set at deploy, never guessed (spec §6.5). Images: client-own photos only (no Yelp, no tourism-board shot).
     Sub-page entries are written by tools/build-pages.mjs. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`
const posts = specs.filter(p => p.post).sort((a, b) => b.post.date.localeCompare(a.post.date) || a.id.localeCompare(b.id))
const rfc = d => new Date(`${d}T09:00:00-07:00`).toUTCString()
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${NAME_HTML} — Blog</title>
  <link>${SITE}/blog/</link>
  <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Collecting tips from Northern Nevada's largest antique mall, 1831 N Carson St, Carson City.</description>
  <language>en-us</language>
${posts.map(p => `  <item>
    <title>${esc(text(p.hero.h1))}</title>
    <link>${p.url}</link>
    <guid isPermaLink="true">${p.url}</guid>
    <pubDate>${rfc(p.post.date)}</pubDate>
    <category>${esc(p.post.section)}</category>
    <description>${esc(p.description)}</description>
  </item>`).join('\n')}
</channel>
</rss>
`
for (const [file, body] of [['sitemap.xml', sitemap], ['blog/feed.xml', feed]]) {
  const out = join(ROOT, file)
  if (CHECK) { if (!existsSync(out) || onDisk(out) !== body) { console.log(`DIFF /${file}`); drift++ } continue }
  mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, body); console.log(`wrote /${file}`)
}
if (CHECK) { console.log(drift ? `${drift} file(s) differ` : 'all generated files match'); process.exit(drift ? 1 : 0) }
