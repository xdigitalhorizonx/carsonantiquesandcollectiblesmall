/* Carson Antiques & Collectibles Mall — home-v1 · app.js
   ONE motion library: anime.js v4.5.0 (assets/anime.umd.min.js, MIT, self-hosted). It owns the noun cycle, the reveals,
   the price-tag swing and the easter-egg trail. The marquee runs on a CSS @keyframes transform (director l.163) — JS only
   refines its speed. Under prefers-reduced-motion: marquee static (CSS), noun frozen on "oil lamps", no swing, reveals
   instant, the trail appears whole with no pulse and no scroll. Everything here degrades: with this file missing the map
   still renders every number, the marquee still moves, the first noun is visible. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const A = window.anime;
  const hasAnime = !!(A && typeof A.animate === 'function');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  document.documentElement.classList.add('js');

  /* ---- the console hint (D10) — byte-exact string from content.md §7 ---- */
  console.log('%cPsst, hey you — over here. Type "treasure" and X marks the spot.',
    'color:#D9A400;background:#14201B;font:700 14px/1.6 Satoshi,system-ui,sans-serif;padding:8px 14px;border-left:4px solid #7A2E1F;');

  /* ---- block 2 · marquee: constant px/s across breakpoints (CSS --dur is the no-JS default) ---- */
  const marquee = $('#marquee');
  if (marquee) {
    const copy = $('.marquee__copy', marquee);
    const setSpeed = () => {
      const gap = parseFloat(getComputedStyle(marquee).getPropertyValue('--gap')) || 24;
      const w = copy.getBoundingClientRect().width + gap;
      marquee.style.setProperty('--dur', (w / 60).toFixed(2) + 's');   // 60 CSS px per second
    };
    setSpeed();
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(setSpeed, 200); });
    if (reduced) {   // the strip is static + overflow-x:auto (CSS): make it a focusable named region so keyboard users can pan to photos 5-9
      marquee.tabIndex = 0; marquee.setAttribute('role', 'region'); marquee.setAttribute('aria-labelledby', 'marquee-h2');
    }
  }

  /* ---- scroll-shadow edges for the horizontal rows that can outrun a small screen (header nav, zone legend) ---- */
  const shadowEdges = (scroller, host) => {
    if (!scroller || !host) return;
    const edges = () => {
      const can = scroller.scrollWidth > scroller.clientWidth + 2;
      host.classList.toggle('can-left', can && scroller.scrollLeft > 2);
      host.classList.toggle('can-right', can && scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2);
    };
    edges(); scroller.addEventListener('scroll', edges, { passive: true }); addEventListener('resize', edges);
  };
  shadowEdges($('.site-nav ul'), $('.site-nav'));
  shadowEdges($('#legend'), $('#legend-wrap'));

  /* ---- block 1 · the cycling noun — an inline-grid stack, so the sentence never reflows (CLS 0) ---- */
  const nouns = $$('.hero__noun .noun');
  if (hasAnime && !reduced && nouns.length > 1) {
    let i = 0, timer = 0;
    const step = () => {
      const cur = nouns[i], nxt = nouns[(i + 1) % nouns.length];
      A.animate(cur, { opacity: [1, 0], translateY: [0, -10], duration: 380, ease: 'inQuad',
        onComplete: () => { cur.classList.remove('is-on'); cur.setAttribute('aria-hidden', 'true'); } });
      nxt.classList.add('is-on'); nxt.removeAttribute('aria-hidden');
      A.animate(nxt, { opacity: [0, 1], translateY: [12, 0], duration: 560, delay: 260, ease: 'outExpo' });
      i = (i + 1) % nouns.length;
    };
    const start = () => { if (!timer) timer = setInterval(step, 2600); };
    const stop = () => { clearInterval(timer); timer = 0; };
    start();
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ---- scroll reveals — start state is set HERE, never in CSS, so a no-JS / reduced-motion page is never blank ---- */
  const reveals = $$('[data-reveal]');
  if (hasAnime && !reduced && 'IntersectionObserver' in window && reveals.length) {
    A.utils.set(reveals, { opacity: 0, translateY: 18 });
    const shown = new WeakSet();
    const show = el => { if (shown.has(el)) return; shown.add(el);
      A.animate(el, { opacity: 1, translateY: 0, duration: 720, ease: 'outExpo', delay: +(el.dataset.reveal || 0) }); };
    const io = new IntersectionObserver(entries => {
      for (const en of entries) if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    reveals.forEach(el => io.observe(el));
    setTimeout(() => reveals.forEach(el => { io.unobserve(el); show(el); }), 3000);   // safety: nothing stays hidden
  }

  /* ---- block 2 · price-tag swing on hover (pointer devices only) ---- */
  if (hasAnime && !reduced && matchMedia('(hover: hover)').matches) {
    $$('.tag').forEach(tag => tag.addEventListener('pointerenter', () => {
      A.animate(tag, { rotate: [{ to: 3, duration: 200, ease: 'outQuad' }, { to: -2, duration: 220 }, { to: 0, duration: 260, ease: 'outQuad' }] });
    }));
  }

  /* =====================================================================
     block 4 · THE TREASURE MAP — one Tab stop, roving tabindex, arrows + digit type-ahead, Esc-dismissible hoverable chip
     (WCAG 1.4.13), tap-to-pin on touch, zone legend = highlight only. Chip text = the aria-label = content.md §7 strings.
     ===================================================================== */
  const svg = $('svg.map');
  const figure = $('#map-figure');
  const scroller = $('#map-scroller');
  const chip = $('#map-chip');
  const regions = svg ? $$('g.booth', svg) : [];           // DOM order = the ring: 1→80, cases, cashier, restrooms, G, G, entrance
  const booths = regions.filter(g => g.dataset.n);
  let active = booths[0] || null, pinned = null, hideTimer = 0, dismissed = false, typeBuf = '', typeTimer = 0;
  let eggText = null;                                       // set while X-marks-the-spot owns the chip

  const centre = g => { const r = $('rect', g); return { x: +r.getAttribute('x') + +r.getAttribute('width') / 2, y: +r.getAttribute('y') + +r.getAttribute('height') / 2 }; };

  const placeChip = g => {
    const fr = figure.getBoundingClientRect(), sr = scroller.getBoundingClientRect(), r = $('rect', g).getBoundingClientRect();
    const cw = chip.offsetWidth, ch = chip.offsetHeight;
    let left = r.left - fr.left + r.width / 2 - cw / 2;
    left = Math.max(sr.left - fr.left + 4, Math.min(left, sr.right - fr.left - cw - 4));
    let top = r.top - fr.top - ch - 10, below = false;
    if (r.top - sr.top < ch + 12) { top = r.bottom - fr.top + 10; below = true; }
    chip.style.left = left + 'px'; chip.style.top = top + 'px'; chip.classList.toggle('is-below', below);
  };
  const showChip = (g, pin) => {
    clearTimeout(hideTimer); dismissed = false;
    chip.textContent = eggText && g.classList.contains('is-x') ? eggText : g.dataset.chip;
    chip.hidden = false; placeChip(g);
    regions.forEach(x => x.classList.toggle('is-active', x === g));
    if (pin) { pinned = g; chip.classList.add('is-pinned'); } else if (pinned !== g) { pinned = null; chip.classList.remove('is-pinned'); }
  };
  const hideChip = force => {
    if (pinned && !force) return;
    clearTimeout(hideTimer); chip.hidden = true; chip.classList.remove('is-pinned'); pinned = null;
    regions.forEach(x => x.classList.remove('is-active'));
  };
  const scheduleHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => hideChip(false), 120); };
  const moveFocus = g => {
    if (!g) return;
    if (active) active.tabIndex = -1;
    g.tabIndex = 0; active = g;
    g.focus({ preventScroll: false });
    showChip(g, false);
  };

  if (svg) {
    /* pointer */
    regions.forEach(g => {
      g.addEventListener('pointerenter', e => { if (e.pointerType === 'touch' || pinned) return; showChip(g, false); });
      g.addEventListener('pointerleave', e => { if (e.pointerType === 'touch' || pinned) return; scheduleHide(); });
      g.addEventListener('click', e => {
        e.preventDefault();
        if (pinned === g) { hideChip(true); return; }
        if (active) active.tabIndex = -1; g.tabIndex = 0; active = g;
        showChip(g, true);
      });
      g.addEventListener('focus', () => { if (!pinned && !dismissed) showChip(g, false); });
      g.addEventListener('blur', () => { if (!pinned) scheduleHide(); });
    });
    chip.addEventListener('pointerenter', () => clearTimeout(hideTimer));       // hoverable (1.4.13)
    chip.addEventListener('pointerleave', () => { if (!pinned) scheduleHide(); });
    document.addEventListener('pointerdown', e => { if (pinned && !figure.contains(e.target)) hideChip(true); });

    /* keyboard — roving tabindex ring + geometric ↑/↓ + digit type-ahead */
    const ring = regions;
    const nearest = (from, dir) => {
      const c = centre(from); let best = null, score = Infinity;
      for (const g of regions) {
        if (g === from) continue;
        const p = centre(g), dy = p.y - c.y, dx = p.x - c.x;
        if (dir < 0 ? dy >= -4 : dy <= 4) continue;              // must be above / below
        const s = Math.abs(dy) + 2.6 * Math.abs(dx);              // same-column bias: walk the aisle, not the list
        if (s < score) { score = s; best = g; }
      }
      return best;
    };
    svg.addEventListener('keydown', e => {
      const g = e.target.closest ? e.target.closest('g.booth') : null;
      if (!g) return;
      const idx = ring.indexOf(g); let handled = true;
      switch (e.key) {
        case 'ArrowRight': moveFocus(ring[(idx + 1) % ring.length]); break;
        case 'ArrowLeft': moveFocus(ring[(idx - 1 + ring.length) % ring.length]); break;
        case 'ArrowUp': moveFocus(nearest(g, -1) || g); break;
        case 'ArrowDown': moveFocus(nearest(g, 1) || g); break;
        case 'Home': moveFocus(ring[0]); break;
        case 'End': moveFocus(ring[ring.length - 1]); break;
        case 'Enter': case ' ': (pinned === g) ? hideChip(true) : showChip(g, true); break;
        case 'Escape': dismissed = true; hideChip(true); break;
        default:
          if (/^[0-9]$/.test(e.key)) {
            clearTimeout(typeTimer); typeBuf = (typeBuf + e.key).slice(-2);
            let n = parseInt(typeBuf, 10);
            if (n < 1 || n > 80) { typeBuf = e.key; n = parseInt(e.key, 10); }
            const target = booths.find(b => +b.dataset.n === n);
            if (target) moveFocus(target);
            typeTimer = setTimeout(() => { typeBuf = ''; }, 800);
          } else handled = false;
      }
      if (handled) e.preventDefault();
    });

    /* zone legend — highlight only, never a count */
    const legend = $$('.legend__btn');
    legend.forEach(btn => btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      legend.forEach(b => b.setAttribute('aria-pressed', 'false'));
      svg.classList.remove('zone-front', 'zone-aisle', 'zone-perimeter', 'zone-case', 'zone-service');
      if (on) { btn.setAttribute('aria-pressed', 'true'); svg.classList.add('zone-' + btn.dataset.zone); }
    }));

    /* mobile scroller: open on the ENTRANCE, scroll-shadow edges, keep a pinned chip in place */
    const VB = svg.viewBox.baseVal;
    const edges = () => {
      figure.classList.toggle('can-left', scroller.scrollLeft > 2);
      figure.classList.toggle('can-right', scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2);
    };
    const centreEntrance = () => {
      if (scroller.scrollWidth <= scroller.clientWidth + 2) { edges(); return; }
      const ex = (+svg.dataset.entranceX0 + +svg.dataset.entranceX1) / 2;
      const px = (ex - VB.x) / VB.width * svg.getBoundingClientRect().width;
      scroller.scrollLeft = Math.max(0, px - scroller.clientWidth / 2); edges();
    };
    centreEntrance();
    addEventListener('resize', centreEntrance);
    let sr = 0;
    scroller.addEventListener('scroll', () => { edges(); if (!chip.hidden) { cancelAnimationFrame(sr); sr = requestAnimationFrame(() => placeChip(pinned || active)); } }, { passive: true });
  }

  /* =====================================================================
     D10 · "X MARKS THE SPOT" — type `treasure`, or tap the small red X in the footer rule three times.
     The trail WALKS THE AISLES: a BFS on a 6-unit grid over the map's own geometry (every rect.wall + the outer wall),
     from the ENTRANCE gap to a booth chosen at trigger time. Reduced motion = whole trail at once, no pulse, no scroll.
     ===================================================================== */
  if (svg && booths.length) {
    const CELL = 6, VBX = 300, VBY = 236, VBW = 1470, VBH = 664;
    const W = Math.ceil(VBW / CELL) + 1, H = Math.ceil(VBH / CELL) + 1;
    let walls = null;
    const buildWalls = () => {
      walls = new Uint8Array(W * H);
      const block = (x, y, w, h) => {
        for (let yy = Math.max(0, Math.floor((y - VBY) / CELL)); yy < Math.min(H, Math.ceil((y + h - VBY) / CELL)); yy++)
          for (let xx = Math.max(0, Math.floor((x - VBX) / CELL)); xx < Math.min(W, Math.ceil((x + w - VBX) / CELL)); xx++) walls[yy * W + xx] = 1;
      };
      $$('rect.wall', svg).forEach(r => block(+r.getAttribute('x'), +r.getAttribute('y'), +r.getAttribute('width'), +r.getAttribute('height')));
      const f = $('.map-floor', svg), ox = +f.getAttribute('x'), oy = +f.getAttribute('y'), ow = +f.getAttribute('width'), oh = +f.getAttribute('height');
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        const X = VBX + xx * CELL, Y = VBY + yy * CELL;
        if (!(ox < X && X < ox + ow && oy < Y && Y < oy + oh)) walls[yy * W + xx] = 1;
      }
    };
    const route = target => {
      if (!walls) buildWalls();
      const gx = (+svg.dataset.entranceX0 + +svg.dataset.entranceX1) / 2, gy = +svg.dataset.entranceY;
      const sx = Math.floor((gx - VBX) / CELL), sy = Math.floor((gy - 8 - VBY) / CELL);
      const start = sy * W + sx;
      const prev = new Int32Array(W * H).fill(-1); prev[start] = start;
      const q = [start]; let qi = 0;
      while (qi < q.length) {
        const c = q[qi++], x = c % W, y = (c - x) / W;
        const nb = [c + 1, c - 1, c + W, c - W];
        for (let k = 0; k < 4; k++) {
          const n = nb[k]; if (n < 0 || n >= W * H) continue;
          if (k === 0 && x === W - 1) continue; if (k === 1 && x === 0) continue;
          if (walls[n] || prev[n] !== -1) continue;
          prev[n] = c; q.push(n);
        }
      }
      const r = $('rect', target), bx = +r.getAttribute('x'), by = +r.getAttribute('y'), bw = +r.getAttribute('width'), bh = +r.getAttribute('height');
      const x0 = Math.floor((bx - VBX) / CELL) - 1, x1 = Math.ceil((bx + bw - VBX) / CELL), y0 = Math.floor((by - VBY) / CELL) - 1, y1 = Math.ceil((by + bh - VBY) / CELL);
      const ringCells = [];
      for (let x = x0; x <= x1; x++) { ringCells.push([x, y0], [x, y1]); }
      for (let y = y0; y <= y1; y++) { ringCells.push([x0, y], [x1, y]); }
      let end = -1, bestD = Infinity;
      for (const [x, y] of ringCells) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const c = y * W + x; if (prev[c] === -1) continue;
        let d = 0, k = c; while (k !== start && d < 100000) { k = prev[k]; d++; }
        if (d < bestD) { bestD = d; end = c; }
      }
      if (end === -1) return null;
      const cells = []; let k = end;
      while (k !== start) { cells.push(k); k = prev[k]; } cells.push(start); cells.reverse();
      const pts = cells.map(c => { const x = c % W, y = (c - x) / W; return [VBX + x * CELL + CELL / 2, VBY + y * CELL + CELL / 2]; });
      const simp = [pts[0]];                                    // orthogonal polyline: keep only the turns
      for (let i = 1; i < pts.length - 1; i++) {
        const a = simp[simp.length - 1], b = pts[i], c = pts[i + 1];
        if ((b[0] - a[0]) * (c[1] - b[1]) !== (b[1] - a[1]) * (c[0] - b[0])) simp.push(b);
      }
      simp.push(pts[pts.length - 1]);
      simp.unshift([gx, gy + 6]);                                // start just outside the door, walk in through the gap
      simp.push([bx + bw / 2, by + bh / 2]);                     // finish on the booth itself
      let len = 0; for (let i = 1; i < simp.length; i++) len += Math.hypot(simp[i][0] - simp[i - 1][0], simp[i][1] - simp[i - 1][1]);
      return { d: 'M' + simp.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L'), len, cx: bx + bw / 2, cy: by + bh / 2 };
    };

    const layer = $('.map-trail', svg), live = $('#egg-live');
    let lastBooth = null, running = false;
    const xMarksTheSpot = () => {
      if (running) return; running = true;
      layer.innerHTML = '';
      if (lastBooth) { lastBooth.classList.remove('is-x'); if (hasAnime) A.utils.remove($('rect', lastBooth)); $('rect', lastBooth).style.fill = ''; }
      hideChip(true); eggText = null;
      const pick = hasAnime ? A.utils.randomPick(booths) : booths[Math.floor(Math.random() * booths.length)];
      const r = route(pick);
      if (!r) { running = false; return; }
      const NS = 'http://www.w3.org/2000/svg';
      const path = document.createElementNS(NS, 'path'); path.setAttribute('class', 'trail'); path.setAttribute('d', r.d); layer.appendChild(path);
      const mkX = (cls, s) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls);
        p.setAttribute('d', `M${r.cx - s},${r.cy - s} L${r.cx + s},${r.cy + s} M${r.cx + s},${r.cy - s} L${r.cx - s},${r.cy + s}`); return p; };
      const xOuter = mkX('trail-x', 14), xCore = mkX('trail-x trail-x--core', 14);
      const text = `X marks the spot — Booth ${pick.dataset.n}. No promises. Go look.`;
      const finish = () => {
        layer.appendChild(xOuter); layer.appendChild(xCore);
        pick.classList.add('is-x'); lastBooth = pick; eggText = text;
        if (active) active.tabIndex = -1; pick.tabIndex = 0; active = pick;
        showChip(pick, true);
        if (live) { live.textContent = ''; setTimeout(() => { live.textContent = text; }, 50); }
        document.body.classList.add('x-marks'); setTimeout(() => document.body.classList.remove('x-marks'), 2200);
        running = false;
      };
      const scrollMap = () => {
        figure.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        if (scroller.scrollWidth > scroller.clientWidth + 2) {
          const mid = (r.cx - VBX) / VBW * svg.getBoundingClientRect().width;
          scroller.scrollTo({ left: Math.max(0, mid - scroller.clientWidth / 2), behavior: reduced ? 'auto' : 'smooth' });
        }
      };
      if (reduced || !hasAnime) { scrollMap(); finish(); return; }
      scrollMap();
      const drawable = A.svg.createDrawable(path);
      A.animate(drawable, { draw: ['0 0', '0 1'], duration: Math.min(2600, Math.max(900, r.len * 1.2)), ease: 'inOutQuad', delay: 350,
        onComplete: () => {
          finish();
          A.animate($('rect', pick), { fill: ['#EDEBE3', '#F5D31C'], duration: 360, loop: 3, alternate: true, ease: 'inOutQuad',
            onComplete: () => { $('rect', pick).style.fill = ''; } });
          A.animate([xOuter, xCore], { scale: [0, 1], duration: 420, ease: 'outBack', transformOrigin: `${r.cx}px ${r.cy}px` });
        } });
    };

    /* Escape anywhere dismisses the pinned egg chip (the SVG's own Escape branch covers focus inside the map); the X stays on the map */
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && eggText && !chip.hidden) hideChip(true); });

    /* trigger 1: type "treasure" anywhere (never inside an editable field) */
    let buf = '';
    document.addEventListener('keydown', e => {
      const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-8);
      if (buf === 'treasure') { buf = ''; xMarksTheSpot(); }
    });
    /* trigger 2: three taps on the small red X in the footer rule within 1.5 s */
    const wink = $('#xmark-wink');
    if (wink) { let taps = [];
      wink.addEventListener('click', () => { const now = Date.now(); taps = taps.filter(t => now - t < 1500); taps.push(now); if (taps.length >= 3) { taps = []; xMarksTheSpot(); } });
    }
  }
})();
