/* Carson Antiques & Collectibles Mall · home v2 · app.js (SPEC §7). One engine: anime.js 4.5.0 custom build.
   Start states only under html.motion; facts never start hidden; Calm = reduced path; signs rest at 0°. */
requestAnimationFrame(() => setTimeout(() => {   // AC-13: boot after the first frame, so the first full layout is the browser's own, not forced inside this task
  'use strict';
  const H = document.documentElement, A = window.anime, hasAnime = !!(A && typeof A.animate === 'function');
  /* §7.2.1 watchdog; a failed boot keeps html.rib (one-line ribbon), so nothing moves */
  if (hasAnime) H.classList.add('motion-ok'); else H.classList.remove('motion');
  /* a crawler-tall viewport gets the end state (§7.4 map guard) */
  if (matchMedia('(min-height: 2600px)').matches) H.classList.remove('motion', 'rib');
  H.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const still = () => !hasAnime || mq.matches || H.classList.contains('calm');
  const live = () => !still() && H.classList.contains('motion');
  const NS = 'http://www.w3.org/2000/svg';
  const spring = (s = 120, d = 8) => A.createSpring({ mass: 1, stiffness: s, damping: d });
  const clean = a => { try { A.utils.cleanInlineStyles(a); } catch (e) { /* not a renderable */ } };
  const rest = el => el && el.style.removeProperty('transform');
  const later = [];
  const idle = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 800 }) : f => setTimeout(f, 50);


  /* ===== X-02/X-03 · boot, registries, once-reveals, Calm ===== */
  const IN = '[data-anim],.hero__lights,.map-booths,.faq,.street,.footer__wordmark';
  const settleAll = () => $$(IN).forEach(e => e.classList.add('is-in'));
  const runs = new Map();
  const fx = new Set();
  const blockOf = el => el && el.closest && (el.closest('section, footer, header') || document.body);
  const fin = (hosts, then) => a => { runs.delete(a); [].concat(hosts || []).forEach(h => h && h.classList.add('is-in')); clean(a); if (then) then(a); };
  const play = (t, p, hosts, then) => { const a = A.animate(t, { ...p, onComplete: fin(hosts, then) }); runs.set(a, [].concat(hosts)); return a; };
  const tline = (hosts, then) => { const a = A.createTimeline({ onComplete: fin(hosts, then) }); runs.set(a, [].concat(hosts)); return a; };
  const fxPlay = (t, p, then) => { const a = A.animate(t, { ...p, onComplete: x => { fx.delete(x); if (then) then(x); } }); fx.add(a); return a; };

  /* once-triggers: one IO per threshold */
  const pend = new Map(), ios = new Map(), claimed = new Set();
  const fire = (el, now) => {
    const p = pend.get(el); if (!p) return;
    pend.delete(el); p.io.unobserve(el);
    const a = live() ? p.fn() : null;
    if (a && now) a.complete();
  };
  const when = (el, fn, at = 85, ratio = 0) => {
    if (!el) return;
    claimed.add(el);
    if (!live()) return;
    const k = at + '/' + ratio; let io = ios.get(k);
    if (!io) ios.set(k, io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= ratio) fire(e.target);
    }), { rootMargin: `0px 0px ${at - 100}% 0px`, threshold: ratio }));
    pend.set(el, { fn, io }); io.observe(el);
  };
  /* focus wins (§7.2.10) */
  document.addEventListener('focusin', e => {
    const b = blockOf(e.target); if (!b) return;
    pend.forEach((p, el) => { if (b.contains(el)) fire(el, true); });
    runs.forEach((hs, a) => { if (blockOf(hs[0]) === b) a.complete(); });
  });

  document.addEventListener('click', e => {   // fix-r2 A-L7
    const a = e.target.closest && e.target.closest('a[href^="#"]'), t = a && document.getElementById(a.hash.slice(1));
    if (!t) return;
    pend.forEach((p, el) => { if (el.contains(t)) fire(el, true); });
  });

  /* ≤ 5 synced onScroll */
  let scrubs = [], nounObs = null;
  const loose = [];
  /* anime 4.5.0: never start a ScrollContainer's dataTimer (idle rAF) */
  const tame = o => { const c = o.container; if (c && !c.tamed) { c.tamed = 1; c.scrollTicker.onBegin = () => {}; c.dataTimer.pause(); } return o; };
  const scrub = (t, p, obs) => { const a = A.animate(t, { ease: 'linear', duration: 1000, ...p, autoplay: tame(A.onScroll(obs)) }); scrubs.push(a); return a; };
  const undraw = el => { if (el) ['pathLength', 'stroke-dasharray', 'stroke-dashoffset'].forEach(n => el.removeAttribute(n)); };
  let wakeScrubs = () => {}, swayOff = () => {}, nounTo = () => {}, marqueeRegion = () => {}, beatOff = () => {};
  const sleepScrubs = () => {
    scrubs.forEach(a => a.revert()); scrubs = [];
    if (nounObs) { nounObs.revert(); nounObs = null; }
    undraw($('.map-wall'));
  };

  /* Calm (§7.3) = the reduced path */
  const quiet = () => {
    pend.forEach((p, el) => p.io.unobserve(el)); pend.clear();
    runs.forEach((b, a) => a.complete()); fx.forEach(a => a.complete());
    beatOff(false);   // fix-r1 AC-10
    sleepScrubs(); swayOff(); settleAll(); H.classList.remove('motion', 'rib'); loose.forEach(undraw);
    $$('.map-route .walker, .map-trail .walker').forEach(w => w.remove());
    nounTo(0, true); marqueeRegion();
  };
  const wake = () => { if (still()) return; H.classList.add('motion', 'rib'); wakeScrubs(); marqueeRegion(); };
  const toggles = $$('.calm-toggle');
  const syncToggles = () => toggles.forEach(b => b.setAttribute('aria-pressed', H.classList.contains('calm') ? 'true' : 'false'));
  toggles.forEach(b => b.addEventListener('click', () => {
    const on = !H.classList.contains('calm');
    try { if (on) localStorage.setItem('cacm-motion', 'calm'); else localStorage.removeItem('cacm-motion'); } catch (e) { /* private mode */ }
    H.classList.toggle('calm', on); syncToggles();
    if (on) quiet(); else wake();
  }));
  syncToggles();
  if (mq.addEventListener) mq.addEventListener('change', () => (still() ? quiet() : wake()));
  addEventListener('beforeprint', () => { pend.forEach((p, el) => fire(el, true)); quiet(); });
  addEventListener('afterprint', wake);

  /* scroll: sway velocity; 150 ms after it stops: end-of-page fallback + finish entrances a fly-by left off screen (§7.2.8) */
  let lastY = null, lastT = 0, onVelocity = () => {}, stopT = 0;
  const off = el => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight; };
  const settled = () => {
    if (pend.size && innerHeight + scrollY >= document.documentElement.scrollHeight - 4)
      pend.forEach((p, el) => { if (el.getBoundingClientRect().top < innerHeight) fire(el, off(el)); });
    runs.forEach((hs, a) => { if (hs.every(h => !h || off(h))) a.complete(); });
  };
  addEventListener('scroll', () => {
    const now = performance.now(), y = scrollY, v = lastY === null ? 0 : (y - lastY) / Math.max(1, now - lastT);
    lastY = y; lastT = now; onVelocity(v);
    clearTimeout(stopT); stopT = setTimeout(settled, 150);
  }, { passive: true });

  /* scroll-shadow edges (nav, legend) */
  const shadowEdges = (scroller, host) => {
    if (!scroller || !host) return;
    const edges = () => {
      const can = scroller.scrollWidth > scroller.clientWidth + 2;
      host.classList.toggle('can-left', can && scroller.scrollLeft > 2);
      host.classList.toggle('can-right', can && scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2);
    };
    later.push(edges); scroller.addEventListener('scroll', edges, { passive: true }); addEventListener('resize', edges);
    /* A-01: bring a focused item fully in (2.4.7) */
    scroller.addEventListener('focusin', e => {
      const a = e.target.getBoundingClientRect(), s = scroller.getBoundingClientRect(), m = 46;
      if (a.left - m < s.left) scroller.scrollLeft -= s.left - a.left + m; else if (a.right + m > s.right) scroller.scrollLeft += a.right + m - s.right;
    });
  };
  shadowEdges($('.site-nav ul'), $('.site-nav'));
  /* 1.4.12: an overflowing nav scrolls sideways under a vertical wheel */
  const navUl = $('.site-nav ul');
  if (navUl) navUl.addEventListener('wheel', e => {
    const max = navUl.scrollWidth - navUl.clientWidth, d = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    if (max < 2 || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || (d < 0 ? navUl.scrollLeft <= 0 : navUl.scrollLeft >= max - 1)) return;
    navUl.scrollLeft += d; e.preventDefault();
  }, { passive: false });
  shadowEdges($('#legend'), $('#legend-wrap'));

  /* ===== X-04 · HERO — M01 lights · M02 trail underline · M03 "in" stamp · M04 chip X · M05 noun roll ===== */
  const hero = $('#hero'), h1 = $('#hero-h1'), body = $('.hero__body'), hl = h1 && $('.hl', h1);
  const trailSvg = $('.hero__trail'), lights = $('.hero__lights'), chipX = $('.chip__x');
  const mk = (n, at) => { const e = document.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); return e; };
  let trailMasks = [], heroTl = null;

  /* glyph boxes of the other hero lines (Tanker cap top = top + .25 em, baseline = + 1 em) */
  const inkBoxes = () => {
    const out = [], rg = document.createRange(), nodes = [];
    [h1, $('.hero__noun', body)].forEach(r => { if (!r) return; const tw = document.createTreeWalker(r, NodeFilter.SHOW_TEXT); for (let n; (n = tw.nextNode());) nodes.push(n); });
    for (const n of nodes) {
      if (!n.data.trim() || hl.contains(n) || (n.parentElement.closest('.noun') && !n.parentElement.closest('.is-on'))) continue;
      const f = parseFloat(getComputedStyle(n.parentElement).fontSize);
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) out.push({ l: r.left, r: r.right, t: r.top + .25 * f, b: r.top + f });
    }
    /* + the "in" disc and its ring */
    const sl = $('.sl-in', h1);
    if (sl) { const r = sl.getBoundingClientRect(); out.push({ l: r.left - 2, r: r.right + 2, t: r.top - 2, b: r.bottom + 2 }); }
    return out;
  };
  let trailSW = 0;
  const strokeW = () => {
    if (!trailSW) { const p = mk('path', {}); trailSvg.appendChild(p); trailSW = parseFloat(getComputedStyle(p).strokeWidth) || 5; p.remove(); }
    return trailSW;
  };
  /* M02: a dashed path + a mask path per line box of "right here" (§7.2.6) */
  const buildTrail = () => {
    if (!trailSvg || !hl) return;
    if (heroTl) heroTl.complete();
    trailSvg.textContent = '';
    const B = body.getBoundingClientRect(), fs = parseFloat(getComputedStyle(hl).fontSize), clear = 3.5 + strokeW() / 2;
    const others = inkBoxes(), defs = mk('defs', {}); trailSvg.appendChild(defs);
    trailMasks = [];
    Array.from(hl.getClientRects()).filter(r => r.width > 4).forEach(r => {
      const y0 = Math.max(r.bottom - .17 * fs, r.top + fs + strokeW() / 2);
      let y = y0, a = r.left, b = r.right;
      const cut = .3 * (b - a);
      for (const o of others) {   /* an end obstacle trims; never above the own baseline */
        if (!(o.t > r.top + .9 * fs && o.l < b && o.r > a && o.t < y + clear)) continue;
        if (o.l <= a && o.r - a < cut) a = o.r + clear; else if (o.r >= b && b - o.l < cut) b = o.l - clear; else y = o.t - clear;
      }
      if (y < Math.min(y0, r.top + fs + strokeW() / 2 + 1) || b - a < 8) return;
      const i = trailMasks.length, x0 = a - B.left, x1 = b - B.left, yy = y - B.top, d = `M${x0.toFixed(1)} ${yy.toFixed(1)}H${x1.toFixed(1)}`;
      const m = mk('mask', { id: 'trail-m' + i, maskUnits: 'userSpaceOnUse', x: x0 - 12, y: yy - 12, width: x1 - x0 + 24, height: 24 });
      const mp = mk('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 10 });
      m.appendChild(mp); defs.appendChild(m);
      trailSvg.appendChild(mk('path', { d, mask: `url(#trail-m${i})` }));
      trailMasks.push(mp);
    });
  };
  const heroIntro = () => {
    if (!live()) return;
    /* §7.2.7: a slow boot skips the intro */
    if (performance.now() + 1080 > 5000) { if (chipX) chipX.classList.add('is-in'); return; }
    const tl = heroTl = tline([chipX], () => { heroTl = null; });
    const per = 450 / Math.max(1, trailMasks.length);
    trailMasks.forEach((m, i) => tl.add(A.svg.createDrawable(m), { draw: ['0 0', '0 1'], duration: per, ease: 'inOutQuad' }, i * per));
    const sl = $('.sl-in', h1);
    if (sl) tl.add(sl, {
      scale: [{ from: 1, to: 1.22, duration: 150, ease: 'outQuad' }, { to: 1, duration: 270, ease: 'outBack' }],
      rotate: [{ from: 0, to: -10, duration: 150, ease: 'outQuad' }, { to: 0, duration: 270, ease: 'outBack' }]
    }, 380);
    if (chipX) tl.add(chipX, { opacity: [0, 1], scale: [1.6, 1], rotate: [-12, 0], duration: 380, ease: 'outBack' }, 700);
  };
  if (live() && lights) {   // M01; fix-r1: skipped if it can't end by 5 s
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    if (performance.now() + 900 > 5000 || (fcp && performance.now() - fcp.startTime > 300)) lights.classList.add('is-in');
    else { lights.style.opacity = '1'; play(lights, { opacity: [1, 0], duration: 900, ease: 'outQuad' }, [lights]); }
  }
  claimed.add(lights); claimed.add(chipX);

  /* M05: two auto steps (only if done by 5 s), then hero scroll 0 → .6 snaps the rest */
  const nouns = $$('.nouns .noun');
  let ni = 0, nounAnims = [], nounBase = 0, autoT = [];
  nounTo = (i, instant) => {
    i = Math.max(0, Math.min(nouns.length - 1, i));
    if (i === ni) { if (instant) nounAnims.forEach(a => a.complete()); return; }
    nounAnims.forEach(a => a.complete()); nounAnims = [];
    const out = nouns[ni], inn = nouns[i], dir = i > ni ? 1 : -1; ni = i;
    inn.classList.add('is-on'); inn.removeAttribute('aria-hidden'); out.setAttribute('aria-hidden', 'true');
    if (instant || still()) { out.classList.remove('is-on'); return; }
    nounAnims = [
      A.animate(out, { translateY: ['0%', -100 * dir + '%'], duration: 420, ease: 'outBack(1.2)', onComplete: a => { out.classList.remove('is-on'); clean(a); } }),
      A.animate(inn, { translateY: [100 * dir + '%', '0%'], duration: 420, ease: 'outBack(1.2)', onComplete: clean })
    ];
  };
  const autoStop = () => { autoT.forEach(clearTimeout); autoT = []; };
  const autoNouns = () => {
    if (!live() || nouns.length < 3) return;
    const t0 = performance.now();
    [1800, 3600].forEach((d, k) => {
      if (t0 + d + 420 > 5000) return;                                   // §7.2.7 autoplay ≤ 5 s from navigation
      autoT.push(setTimeout(() => { if (!still()) { nounBase = k + 1; nounTo(k + 1, performance.now() + 420 > 4900); } }, d));   // late timer: snap (≤ 5 s)
    });
  };

  if (hero && body) {
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    let lastW = 0, lastH = 0, lastTop = 0, built = false;
    const topIn = () => (hl ? Math.round(hl.getBoundingClientRect().top - body.getBoundingClientRect().top) : 0);
    ready.then(() => setTimeout(() => { lastW = innerWidth; built = true; buildTrail(); lastTop = topIn(); heroIntro(); autoNouns(); }, 150));
    /* a height-only resize can move the H1 inside .hero__body (the 820 px short step) without resizing it */
    addEventListener('resize', () => {
      if (!built) return;
      const t = topIn();
      if (innerWidth !== lastW || t !== lastTop) { lastW = innerWidth; lastTop = t; buildTrail(); }
    });
    if ('ResizeObserver' in window) new ResizeObserver(([e]) => {      // text spacing / text-only zoom (1.4.12)
      const h = Math.round(e.contentRect.height * 10);
      if (built && lastH && h !== lastH) buildTrail();
      lastH = h;
    }).observe(h1);
  }

  /* ===== scrubs: M05 noun · M06 ribbon · M07 road · M11 lamp · M19 wall ===== */
  const lamp = $('.worth__photo img'), wall = $('.map-wall'), figure = $('#map-figure');
  let lampW = 0, scrubT = 0;
  wakeScrubs = () => {
    if (scrubs.length || !live()) return;
    lampW = innerWidth;
    if (hero) nounObs = tame(A.onScroll({ target: hero, enter: 'top top', leave: 'top bottom', sync: true, onUpdate: o => {
      if (o.progress > 0) autoStop();
      nounTo(nounBase + Math.round(Math.min(1, o.progress / .6) * (nouns.length - 1 - nounBase)));
    } }));
    /* M06: 28 % drive right; rest −50 % = the same frame as 0 (failed boot) */
    if ($('.ribbon__track')) scrub('.ribbon__track', { translateX: ['-50%', '-22%'] }, { target: '.ribbon', enter: 'bottom bottom', leave: 'top top', sync: .25 });
    const road = $('.site-head__road');
    if (road) scrub(road, { scaleX: [0, 1] }, { target: document.body, enter: 'top top', leave: 'bottom bottom', sync: true });
    if (lamp) {
      const amp = Math.min(innerWidth < 768 ? 12 : 24, lamp.getBoundingClientRect().height * .03);
      scrub(lamp, { translateY: [-amp, amp] }, { target: '.worth__photo', sync: true });
    }
    if (wall && figure) scrub(A.svg.createDrawable(wall), { draw: ['0 0', '0 1'] }, { target: figure, enter: '85% top', leave: '45% top', sync: true });
  };
  addEventListener('resize', () => {
    clearTimeout(scrubT);
    scrubT = setTimeout(() => { if (innerWidth !== lampW && scrubs.length) { lampW = innerWidth; sleepScrubs(); wakeScrubs(); } }, 200);
  });

  /* ===== WORTH M08–M10 ===== */
  const stampList = lis => {
    const tl = tline(lis);
    tl.add(lis, { '--tick': [1.6, 1], duration: 320, ease: 'outBack', delay: A.stagger(90) }, 0)
      .add(lis, { translateX: [10, 0], duration: 320, ease: 'outQuad', delay: A.stagger(90) }, 0);
    return tl;
  };
  const wq = $('.worth__quote');
  when(wq, () => {
    const tl = tline([wq]);
    tl.add(wq, { opacity: [0, 1], translateY: [16, 0], duration: 600, ease: 'outExpo' }, 0)
      .add($('blockquote', wq), { '--quote-s': [1.4, 1], '--quote-o': [0, 1], duration: 360, ease: 'outBack' }, 0)
      .add($('.vinyl', wq), { '--vinyl': [0, 1], duration: 500, ease: 'outQuad' }, 560);
    return tl;
  });
  const wf = $('.worth__facts');
  if (wf) { const lis = $$('[data-anim]', wf); lis.forEach(l => claimed.add(l)); when(wf, () => stampList(lis)); }
  const wm = $$('.worth__more [data-anim]');
  if (wm.length) { wm.forEach(l => claimed.add(l)); when(wm[0], () => play(wm, { opacity: [0, 1], translateY: [16, 0], duration: 600, ease: 'outExpo', delay: A.stagger(120) }, wm)); }

  /* ===== MARQUEE M12–M15 ===== */
  const marquee = $('#marquee'), mpBtn = $('#marquee-pause');
  if (marquee) {
    const copy = $('.marquee__copy', marquee);
    const setSpeed = () => {
      const gap = parseFloat(getComputedStyle(marquee).getPropertyValue('--gap')) || 24;
      marquee.style.setProperty('--dur', ((copy.getBoundingClientRect().width + gap) / 60).toFixed(2) + 's');
    };
    later.push(setSpeed);
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(setSpeed, 200); });
    const paused = () => marquee.classList.contains('is-paused');
    marqueeRegion = () => {
      if (still() || paused()) { marquee.tabIndex = 0; marquee.setAttribute('role', 'region'); marquee.setAttribute('aria-labelledby', 'marquee-h2'); }
      else { marquee.removeAttribute('tabindex'); marquee.removeAttribute('role'); marquee.removeAttribute('aria-labelledby'); }
    };
    marqueeRegion();
    if (mpBtn) mpBtn.addEventListener('click', () => {
      const on = !paused();
      marquee.classList.toggle('is-paused', on);
      $('span', mpBtn).textContent = on ? 'Play the photo strip' : 'Pause the photo strip';
      $('use', mpBtn).setAttribute('href', on ? '#i-play' : '#i-pause');
      if (on) swayOff();
      marqueeRegion();
    });
    let inView = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => {
      inView = e.isIntersecting; marquee.classList.toggle('is-off', !inView);
    }).observe(marquee);

    if (hasAnime) {
      const tags = $$('.tag', marquee);
      let sway = null, swayT = 0;
      swayOff = () => { clearTimeout(swayT); if (sway) { sway.revert(); sway = null; } };
      const swayOn = () => { if (!sway) sway = A.createAnimatable(tags, { rotate: 500, ease: 'out(3)' }); };
      later.push(() => idle(() => { if (live()) swayOn(); }));   // fix-r1: built in idle time
      onVelocity = v => {
        if (!inView || still() || paused() || Math.abs(v) < .05) return;
        swayOn();
        const max = innerWidth < 768 ? 2 : 3;
        sway.rotate(Math.max(-max, Math.min(max, v * 1.6)));
        clearTimeout(swayT); swayT = setTimeout(() => { if (sway) sway.rotate(0); }, 140);
      };
      const swing = card => fxPlay(card, { rotate: [{ to: 3, duration: 200, ease: 'outQuad' }, { to: -2, duration: 220 }, { to: 0, duration: 260, ease: 'outQuad' }] }, () => rest(card));
      tags.forEach(tag => {
        const card = $('.tag__card', tag);
        tag.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && fine.matches && !still()) swing(card); });
        tag.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !still()) swing(card); });
      });
    }
  }

  /* ===== BOOTHS M16–M18 ===== */
  const plate = $('.plate--enamel'), forrent = $('.forrent');
  const settleSign = (el, from) => play(el, { rotate: [from, 0], ease: spring() }, [el], () => rest(el));
  const kick = el => { if (el && el.classList.contains('is-in') && !still()) fxPlay(el, { rotate: [2.5, 0], ease: spring() }, () => rest(el)); };
  when(plate, () => settleSign(plate, 4));
  if (plate) plate.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && fine.matches) kick(plate); });

  const grid = $('#tile-grid');
  if (grid) {
    const arts = $$('[data-anim="shelf"]', grid);
    arts.forEach(a => claimed.add(a));
    when(grid, () => {
      const w = innerWidth, st = () => (w >= 1024 ? A.stagger(70, { grid: [3, 2] }) : w >= 680 ? A.stagger(70, { grid: [2, 3] }) : A.stagger(60));
      const tl = tline(arts, () => {
        if (off(grid)) return;   // finished off screen: no sweep
        arts.forEach((a, i) => { const t = a.closest('.tile'); setTimeout(() => { t.classList.add('tick-sweep'); setTimeout(() => t.classList.remove('tick-sweep'), 450); }, i * 70); });
      });
      tl.add(arts, { opacity: [0, 1], translateY: [24, 0], duration: 800, ease: 'outExpo', delay: st() }, 0)
        .add(arts.map(a => $('img', a)), { translateY: ['6%', '0%'], scale: [1.06, 1], duration: 900, ease: 'outExpo', delay: st() }, 0);
      return tl;
    }, 90);
  }

  /* ===== TREASURE MAP: one Tab stop, roving tabindex, arrows + digits, Esc chip, tap-to-pin; M19–M22, #pick-booth, #booth-n ===== */
  const svg = $('svg.map');
  const scroller = $('#map-scroller');
  const chip = $('#map-chip');
  const regions = svg ? $$('g.booth', svg) : [];
  const booths = regions.filter(g => g.dataset.n);
  const live1 = $('#egg-live'), mapStatus = $('#map-status'), pickBtn = $('#pick-booth');
  let active = booths[0] || null, pinned = null, hideTimer = 0, dismissed = false, typeBuf = '', typeTimer = 0;
  let eggText = null;
  const CELL = 6, VBX = 300, VBY = 236, VBW = 1470, VBH = 664;
  const say = (el, t) => { if (!el) return; el.textContent = ''; setTimeout(() => { el.textContent = t; }, 50); };
  /* §9 A10 */
  const rove = g => {
    if (active && active !== g) { active.tabIndex = -1; active.removeAttribute('aria-describedby'); }
    g.tabIndex = 0; g.setAttribute('aria-describedby', 'map-keys'); active = g;
  };
  if (active) rove(active);

  const centre = g => { const r = $('rect', g); return { x: +r.getAttribute('x') + +r.getAttribute('width') / 2, y: +r.getAttribute('y') + +r.getAttribute('height') / 2 }; };
  const placeChip = g => {
    /* measured from x 0 */
    chip.style.left = '0px'; chip.style.top = '0px';
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
    if (eggText && g.classList.contains('is-x')) chip.innerHTML = eggText.replace(/^(.+?\d\.) /, '<span class="nw">$1</span> <span class="nw">') + '</span>';
    else chip.textContent = g.dataset.chip;
    chip.hidden = false; placeChip(g);
    regions.forEach(x => x.classList.toggle('is-active', x === g));
    if (pin) { pinned = g; chip.classList.add('is-pinned'); } else if (pinned !== g) { pinned = null; chip.classList.remove('is-pinned'); }
  };

  /* M21: a solid mask path draws the dashed route + a walker dot */
  const routeLayer = svg && $('.map-route', svg), trailLayer = svg && $('.map-trail', svg);
  let walkAnims = [];
  const clearRoute = () => { walkAnims.forEach(a => a.cancel()); walkAnims = []; if (routeLayer) routeLayer.textContent = ''; };
  const lay = (layer, r, paths, id, dot) => {
    layer.innerHTML = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${VBX}" y="${VBY}" width="${VBW}" height="${VBH}"><path d="${r.d}" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></mask></defs><g mask="url(#${id})">${paths}</g>` +
      (dot ? `<circle class="walker" cx="0" cy="0" r="${(5 * VBW / svg.getBoundingClientRect().width).toFixed(1)}"/>` : '');
    return { mp: $('mask path', layer), path: $('g > path:last-child', layer), dot: $('.walker', layer) };
  };
  const hideChip = force => {
    if (pinned && !force) return;
    const was = pinned;
    clearTimeout(hideTimer); chip.hidden = true; chip.classList.remove('is-pinned'); pinned = null;
    regions.forEach(x => x.classList.remove('is-active'));
    if (force) { clearRoute(); if (was) document.dispatchEvent(new CustomEvent('cacm:pin', { detail: null })); }
  };
  const scheduleHide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => hideChip(false), 120); };
  const moveFocus = g => {
    if (!g) return;
    rove(g);
    g.focus({ preventScroll: false });
    showChip(g, false);
  };
  const centreOn = (x, smooth) => {
    if (scroller.scrollWidth <= scroller.clientWidth + 2) return;
    const mid = (x - VBX) / VBW * svg.getBoundingClientRect().width;
    scroller.scrollTo({ left: Math.max(0, mid - scroller.clientWidth / 2), behavior: smooth && !still() ? 'smooth' : 'auto' });
  };

  let route = () => null, stockNow = () => {};
  const walk = g => {
    clearRoute();
    if (!routeLayer || g.id === 'entrance') return;
    const r = route(g); if (!r) return;
    const L = lay(routeLayer, r, `<path class="route-base" d="${r.d}"/><path class="route-dash" d="${r.d}"/>`, 'route-mask', !still());
    if (still()) return;
    const D = Math.min(1800, Math.max(700, r.len));
    walkAnims = [fxPlay(A.svg.createDrawable(L.mp), { draw: ['0 0', '0 1'], duration: D, ease: 'inOutQuad' }),
      fxPlay(L.dot, { ...A.svg.createMotionPath(L.path), duration: D, ease: 'inOutQuad' })];
  };
  const pin = (g, how) => {
    rove(g);
    showChip(g, true); walk(g);
    if (how === 'hash' || how === 'pick') centreOn(centre(g).x, true);
    document.dispatchEvent(new CustomEvent('cacm:pin', { detail: g }));
  };

  if (svg) {
    /* pointer */
    regions.forEach(g => {
      g.addEventListener('pointerenter', e => { if (e.pointerType === 'touch' || pinned) return; showChip(g, false); });
      g.addEventListener('pointerleave', e => { if (e.pointerType === 'touch' || pinned) return; scheduleHide(); });
      g.addEventListener('click', e => {
        e.preventDefault();
        if (pinned === g) { hideChip(true); return; }
        pin(g, 'tap');
      });
      g.addEventListener('focus', () => { if (!pinned && !dismissed) showChip(g, false); });
      g.addEventListener('blur', () => { if (!pinned) scheduleHide(); });
    });
    chip.addEventListener('pointerenter', () => clearTimeout(hideTimer));
    chip.addEventListener('pointerleave', () => { if (!pinned) scheduleHide(); });
    document.addEventListener('pointerdown', e => {
      if (pinned && !figure.contains(e.target) && !(e.target.closest && e.target.closest('.map-tools'))) hideChip(true);
    });

    /* keyboard: ring ←/→, geometric ↑/↓, digits; Enter/Space pin + draw */
    const ring = regions;
    const nearest = (from, dir) => {
      const c = centre(from); let best = null, score = Infinity;
      for (const g of regions) {
        if (g === from) continue;
        const p = centre(g), dy = p.y - c.y, dx = p.x - c.x;
        if (dir < 0 ? dy >= -4 : dy <= 4) continue;
        const s = Math.abs(dy) + 2.6 * Math.abs(dx);
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
        case 'Enter': case ' ': if (pinned === g) hideChip(true); else pin(g, 'key'); break;
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

    /* legend: highlight only (M22) */
    const legend = $$('.legend__btn');
    legend.forEach(btn => btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      legend.forEach(b => b.setAttribute('aria-pressed', 'false'));
      svg.classList.remove('zone-front', 'zone-aisle', 'zone-perimeter', 'zone-case', 'zone-service');
      if (!on) return;
      btn.setAttribute('aria-pressed', 'true'); svg.classList.add('zone-' + btn.dataset.zone);
      const hit = regions.filter(g => g.dataset.zone === btn.dataset.zone);
      if (!still() && hit.length) fxPlay(hit, { scale: [{ from: 1, to: 1.04, duration: 140, ease: 'outQuad' }, { to: 1, duration: 140, ease: 'inQuad' }], delay: A.stagger(6) }, clean);
    }));

    /* phone scroller opens on the ENTRANCE */
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
    /* only a width change re-centres */
    let lastW = 0;
    later.push(() => { lastW = innerWidth; centreEntrance(); });
    addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; centreEntrance(); } });
    let sr = 0;
    scroller.addEventListener('scroll', () => { edges(); if (!chip.hidden) { cancelAnimationFrame(sr); sr = requestAnimationFrame(() => placeChip(pinned || active)); } }, { passive: true });

    /* M20: booths arrive from the ENTRANCE (delay = distance × .6 ms) */
    const floor = $('.map-booths', svg);
    let stocking = null;
    when(figure, () => {
      const ex = (+svg.dataset.entranceX0 + +svg.dataset.entranceX1) / 2, ey = +svg.dataset.entranceY;
      const dist = regions.map(g => { const c = centre(g); return Math.hypot(c.x - ex, c.y - ey); });
      if (pickBtn) pickBtn.setAttribute('aria-disabled', 'true');
      /* opacity only (AC-13) */
      return (stocking = play(regions, { opacity: [0, 1], duration: 450, ease: 'outExpo', delay: (el, i) => dist[i] * .6 }, [floor],
        () => { stocking = null; if (pickBtn) pickBtn.removeAttribute('aria-disabled'); }));
    }, 100, .3);
    stockNow = () => { fire(figure, true); if (stocking) stocking.complete(); };

    /* #pick-booth: never moves focus */
    if (pickBtn) pickBtn.addEventListener('click', () => {
      if (pickBtn.getAttribute('aria-disabled') === 'true') return;
      stockNow();
      const g = hasAnime ? A.utils.randomPick(booths) : booths[Math.floor(Math.random() * booths.length)];
      eggText = null; pin(g, 'pick');
      say(mapStatus, `Start with Booth ${g.dataset.n}. No promises — go look.`);
    });

    /* #booth-n (A11): focus not moved */
    let prevFocus = null;
    document.addEventListener('focusin', e => { if (!(e.target.closest && e.target.closest('g.booth'))) prevFocus = e.target; });
    const fromHash = () => {
      const m = /^#booth-(\d+)$/.exec(location.hash); if (!m) return;
      const g = booths.find(b => b.dataset.n === String(+m[1]));
      if (!g) { say(mapStatus, `There's no booth ${m[1]} on the main-floor map.`); return; }
      stockNow();
      figure.scrollIntoView({ block: 'center', behavior: 'auto' });
      eggText = null; pin(g, 'hash');
      if (document.activeElement === g) {
        if (prevFocus && prevFocus.isConnected && prevFocus !== document.body) prevFocus.focus({ preventScroll: true }); else g.blur();
      }
      say(live1, `Booth ${g.dataset.n} — the way from the entrance is drawn on the map.`);
    };
    addEventListener('hashchange', fromHash);
    if (location.hash) (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fromHash);
  }

  /* ===== M34 X MARKS THE SPOT: type `treasure` or tap the footer X 3× — BFS trail, walker, X stamp, 6 s beat ===== */
  if (svg && booths.length) {
    const W = Math.ceil(VBW / CELL) + 1, Hh = Math.ceil(VBH / CELL) + 1;
    let walls = null;
    const buildWalls = () => {
      walls = new Uint8Array(W * Hh);
      const block = (x, y, w, h) => {
        for (let yy = Math.max(0, Math.floor((y - VBY) / CELL)); yy < Math.min(Hh, Math.ceil((y + h - VBY) / CELL)); yy++)
          for (let xx = Math.max(0, Math.floor((x - VBX) / CELL)); xx < Math.min(W, Math.ceil((x + w - VBX) / CELL)); xx++) walls[yy * W + xx] = 1;
      };
      $$('rect.wall', svg).forEach(r => block(+r.getAttribute('x'), +r.getAttribute('y'), +r.getAttribute('width'), +r.getAttribute('height')));
      const f = $('.map-floor', svg), ox = +f.getAttribute('x'), oy = +f.getAttribute('y'), ow = +f.getAttribute('width'), oh = +f.getAttribute('height');
      for (let yy = 0; yy < Hh; yy++) for (let xx = 0; xx < W; xx++) {
        const X = VBX + xx * CELL, Y = VBY + yy * CELL;
        if (!(ox < X && X < ox + ow && oy < Y && Y < oy + oh)) walls[yy * W + xx] = 1;
      }
    };
    route = target => {
      if (!walls) buildWalls();
      const gx = (+svg.dataset.entranceX0 + +svg.dataset.entranceX1) / 2, gy = +svg.dataset.entranceY;
      const sx = Math.floor((gx - VBX) / CELL), sy = Math.floor((gy - 8 - VBY) / CELL);
      const start = sy * W + sx;
      const prev = new Int32Array(W * Hh).fill(-1); prev[start] = start;
      const q = [start]; let qi = 0;
      while (qi < q.length) {
        const c = q[qi++], x = c % W;
        const nb = [c + 1, c - 1, c + W, c - W];
        for (let k = 0; k < 4; k++) {
          const n = nb[k]; if (n < 0 || n >= W * Hh) continue;
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
        if (x < 0 || y < 0 || x >= W || y >= Hh) continue;
        const c = y * W + x; if (prev[c] === -1) continue;
        let d = 0, k = c; while (k !== start && d < 100000) { k = prev[k]; d++; }
        if (d < bestD) { bestD = d; end = c; }
      }
      if (end === -1) return null;
      const cells = []; let k = end;
      while (k !== start) { cells.push(k); k = prev[k]; } cells.push(start); cells.reverse();
      const pts = cells.map(c => { const x = c % W, y = (c - x) / W; return [VBX + x * CELL + CELL / 2, VBY + y * CELL + CELL / 2]; });
      const simp = [pts[0]];
      for (let i = 1; i < pts.length - 1; i++) {
        const a = simp[simp.length - 1], b = pts[i], c = pts[i + 1];
        if ((b[0] - a[0]) * (c[1] - b[1]) !== (b[1] - a[1]) * (c[0] - b[0])) simp.push(b);
      }
      simp.push(pts[pts.length - 1]);
      simp.unshift([simp[0][0], gy + 6]);   // straight out of the door
      let len = 0; for (let i = 1; i < simp.length; i++) len += Math.hypot(simp[i][0] - simp[i - 1][0], simp[i][1] - simp[i - 1][1]);
      return { d: 'M' + simp.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L'), len, cx: bx + bw / 2, cy: by + bh / 2 };
    };

    /* jump if > 1.5 viewports, then a smooth settle */
    const jump = y => { H.style.scrollBehavior = 'auto'; scrollTo(0, y); H.style.scrollBehavior = ''; };
    const toMap = cx => new Promise(res => {
      centreOn(cx, true);
      const fr = figure.getBoundingClientRect();
      const target = Math.round(Math.max(0, Math.min(scrollY + fr.top + fr.height / 2 - innerHeight / 2, document.documentElement.scrollHeight - innerHeight)));
      if (Math.abs(target - scrollY) < 4) return res();
      if (still()) { jump(target); return res(); }
      if (Math.abs(target - scrollY) > 1.5 * innerHeight) jump(target - Math.sign(target - scrollY) * innerHeight);
      let t = 0;
      const done = () => { clearTimeout(t); removeEventListener('scrollend', end); res(); };
      const end = () => { if (Math.abs(scrollY - target) < 4) done(); };
      t = setTimeout(done, 1000);
      addEventListener('scrollend', end);
      scrollTo({ top: target, behavior: 'smooth' });
    });

    /* the 6 s beat: ribbon flap, signs swing, tags flip, rules march */
    const track = $('.ribbon__track'), ribs = $$('.ribbon__copy'), ribHTML = ribs.map(p => p.innerHTML);
    const ribbon = (n, on) => {
      const rb = ribs[0].closest('.ribbon');
      const swap = () => ribs.forEach((p, i) => { if (!i) rb.style.minHeight = on ? rb.offsetHeight + 'px' : ''; p.innerHTML = on ? `<span class="seg">X marks the spot — Booth ${n}&nbsp;<i>●</i></span> <span class="seg">No promises&nbsp;<i>●</i></span> <span class="seg">Go look&nbsp;<i>●</i></span>` : ribHTML[i]; });
      if (still() || !track) { swap(); return; }
      fxPlay(track, { rotateX: [0, 90], duration: 280, ease: 'inQuad' }, () => { swap(); fxPlay(track, { rotateX: [-90, 0], duration: 320, ease: 'outQuad' }); });
    };
    /* one beat at a time */
    let beatT = 0, beatN = null, flipIO = null, flipped = [];
    const swung = new Set(), signs = [[plate, 3], [forrent, -3]].filter(([el]) => el);
    const swingSign = (el, a) => { if (swung.has(el) || still()) return; swung.add(el); fxPlay(el, { rotate: [a, 0], ease: spring() }, () => rest(el)); };
    beatOff = animate => {
      clearTimeout(beatT); beatT = 0; swung.clear();
      if (flipIO) { flipIO.disconnect(); flipIO = null; }
      document.body.classList.remove('x-marks');
      if (beatN !== null) { ribbon(beatN, false); beatN = null; }
      const back = flipped; flipped = [];
      back.forEach((t, i) => {
        const c = $('.tag__card', t);
        if (animate && !still()) fxPlay(c, { rotateY: [180, 360], duration: 600, ease: 'inOutQuad', delay: Math.abs(i - (back.length - 1) / 2) * 70 }, () => rest(c));
        else { if (hasAnime) A.utils.remove(c); rest(c); }
      });
    };
    const beat = n => {
      const again = !!beatT;
      clearTimeout(beatT);
      document.body.classList.add('x-marks');
      beatN = n; ribbon(n, true);
      swung.clear();
      signs.forEach(([el, a]) => {
        if (pend.has(el)) { pend.get(el).io.unobserve(el); pend.delete(el); }
        el.classList.add('is-in');
        const r = el.getBoundingClientRect();
        if (!still()) fxPlay(el, { rotate: [a, 0], ease: spring() }, () => rest(el));
        if (r.bottom > 0 && r.top < innerHeight) swung.add(el);
      });
      if (!still() && 'IntersectionObserver' in window) {
        if (!flipIO) flipIO = new IntersectionObserver(es => {
          const vis = es.filter(e => e.isIntersecting).map(e => e.target);
          signs.forEach(([el, a]) => { if (vis.includes(el)) swingSign(el, a); });
          const batch = vis.filter(t => t.classList.contains('tag') && !flipped.includes(t))
            .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          batch.forEach((t, i) => {
            flipped.push(t);
            fxPlay($('.tag__card', t), { rotateY: [0, 180], duration: 600, ease: 'inOutQuad', delay: Math.abs(i - (batch.length - 1) / 2) * 70 });
          });
        });
        if (!again) $$('.tag').forEach(t => flipIO.observe(t));
        signs.forEach(([el]) => { flipIO.unobserve(el); flipIO.observe(el); });
      }
      beatT = setTimeout(() => beatOff(true), 6000);
    };

    const live2 = $('#egg-live');
    let lastBooth = null, running = false;
    const xMarksTheSpot = () => {
      if (running) return; running = true;
      if (lastBooth) { lastBooth.classList.remove('is-x'); if (hasAnime) A.utils.remove($('rect', lastBooth)); $('rect', lastBooth).style.fill = ''; }
      hideChip(true); eggText = null;
      stockNow();
      const pick = hasAnime ? A.utils.randomPick(booths) : booths[Math.floor(Math.random() * booths.length)];
      const r = route(pick);
      if (!r) { running = false; return; }
      const L = lay(trailLayer, r, `<path class="trail" d="${r.d}"/>`, 'trail-mask', !still());
      const mkX = (cls, s) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls);
        p.setAttribute('d', `M${r.cx - s},${r.cy - s} L${r.cx + s},${r.cy + s} M${r.cx + s},${r.cy - s} L${r.cx - s},${r.cy + s}`); return p; };
      const xOuter = mkX('trail-x', 14), xCore = mkX('trail-x trail-x--core', 14);
      const text = `X marks the spot — Booth ${pick.dataset.n}. No promises. Go look.`;
      const finish = () => {
        trailLayer.appendChild(xOuter); trailLayer.appendChild(xCore);
        if (L.dot && still()) L.dot.remove();
        pick.classList.add('is-x'); lastBooth = pick; eggText = text;
        rove(pick);
        showChip(pick, true);
        document.dispatchEvent(new CustomEvent('cacm:pin', { detail: pick }));
        say(live2, text);
        beat(pick.dataset.n);
        running = false;
        if (still()) return;
        fxPlay([xOuter, xCore], { opacity: [0, 1], scale: [1.6, 1], rotate: [-12, 0], duration: 380, ease: 'outBack' });
        const tok = n => getComputedStyle(H).getPropertyValue(n).trim();
        fxPlay($('rect', pick), { fill: [tok('--chalk'), tok('--yellow-bright')], duration: 360, loop: 3, alternate: true, ease: 'inOutQuad' },
          () => { $('rect', pick).style.fill = ''; });   // in fx, so Calm completes it (AC-10)
      };
      const drawable = still() ? null : A.svg.createDrawable(L.mp);
      toMap(r.cx).then(() => {
        if (!drawable || still()) { if (drawable) undraw(L.mp); finish(); return; }
        const D = Math.min(2600, Math.max(900, r.len * 1.2));
        fxPlay(drawable, { draw: ['0 0', '0 1'], duration: D, ease: 'inOutQuad' }, finish);
        fxPlay(L.dot, { ...A.svg.createMotionPath(L.path), duration: D, ease: 'inOutQuad' });
      });
    };

    /* Esc closes the chip; the X stays */
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && eggText && !chip.hidden) hideChip(true); });

    /* type "treasure" (never in a field) */
    let buf = '';
    document.addEventListener('keydown', e => {
      const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-8);
      if (buf === 'treasure') { buf = ''; xMarksTheSpot(); }
    });
    /* 3 taps on the footer X in 1.5 s */
    const wink = $('#xmark-wink');
    if (wink) { let taps = [];
      wink.addEventListener('click', () => { const now = Date.now(); taps = taps.filter(t => now - t < 1500); taps.push(now); if (taps.length >= 3) { taps = []; xMarksTheSpot(); } });
    }
  }

  /* ===== M23–M33 ===== */
  when(forrent, () => settleSign(forrent, -4));   // −4°: §7.2.9 cap
  if (forrent) {
    forrent.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && fine.matches) kick(forrent); });
    forrent.addEventListener('focus', () => { if (forrent.matches(':focus-visible')) kick(forrent); });
  }
  const ledger = $$('.rent__ledger [data-anim]');
  if (ledger.length) { ledger.forEach(l => claimed.add(l)); when(ledger[0].parentElement, () => stampList(ledger)); }

  /* TODAY (A8): Intl, America/Los_Angeles. Open now (A9): built, OFF. */
  /* open-now:begin */
  let laFmt = null;   // built on first use (~35 ms at 4x CPU): never in the boot task
  const laTime = (d = new Date()) => {
    laFmt = laFmt || new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    const p = {}; laFmt.formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return { y: +p.year, mo: p.month - 1, day: +p.day, wd: 'SunMonTueWedThuFriSat'.indexOf(p.weekday) / 3, min: p.hour * 60 + +p.minute };
  };
  /* TODO (pre-publish): holiday list unconfirmed (Thanksgiving, Dec 24/25/31, Jan 1) — keep open-status off until the client confirms */
  const holiday = t => (t.mo === 10 && t.wd === 4 && t.day >= 22 && t.day <= 28) || (t.mo === 11 && (t.day === 24 || t.day === 25 || t.day === 31)) || (t.mo === 0 && t.day === 1);
  const openState = (d = new Date()) => {
    const t = laTime(d);
    if (holiday(t)) return "Holiday — call to check today's hours";
    if (t.min < 600) return 'Opens today at 10 AM';
    if (t.min < 1080) return 'Open now · until 6 PM';
    const n = new Date(Date.UTC(t.y, t.mo, t.day + 1));
    /* evening before a holiday: no promise about tomorrow */
    return holiday({ mo: n.getUTCMonth(), day: n.getUTCDate(), wd: n.getUTCDay() }) ? null : 'Closed now · opens 10 AM';
  };
  /* open-now:end */
  const laDay = d => laTime(d).wd;
  /* re-marked on tab return + each minute */
  let markedDay = -1;
  const markToday = () => {
    const wd = laDay(); if (wd === markedDay) return; markedDay = wd;
    $$('.board__days li').forEach(li => {
      const on = li.dataset.day === String(wd), t = $('.board__today', li);
      if (on) li.setAttribute('aria-current', 'date'); else li.removeAttribute('aria-current');
      if (t) t.hidden = !on;
    });
  };
  idle(markToday);   // below the fold: idle time
  setInterval(markToday, 6e4);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) markToday(); });
  const openEl = $('#open-status');
  if (openEl && H.dataset.openStatus === 'on') {   // once a minute, no live region (§9 A9)
    const tick = () => { const s = openState(); openEl.textContent = s || ''; openEl.hidden = !s; };
    tick(); setInterval(tick, 6e4);
  }

  /* copy booth link / address */
  const clip = navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext ? t => navigator.clipboard.writeText(t) : null;
  const copyBooth = $('#copy-booth'), copyAddr = $('#copy-addr');
  if (clip && copyBooth) {
    const num = $('.copy-booth__n', copyBooth);
    document.addEventListener('cacm:pin', e => {
      const n = e.detail && e.detail.dataset.n;
      if (n) { copyBooth.dataset.n = n; num.textContent = n; }
      copyBooth.hidden = !n;
    });
    copyBooth.addEventListener('click', () => {
      const n = copyBooth.dataset.n; if (!n) return;
      clip(location.origin + location.pathname + '#booth-' + n).then(() => say(mapStatus, `Link to booth ${n} copied.`), () => {});
    });
  }
  if (clip && copyAddr) {
    const status = $('#copy-status'), nap = $('.nap');
    copyAddr.hidden = false;
    copyAddr.addEventListener('click', () => clip(copyAddr.dataset.copy).then(() => say(status, 'Address copied.'), () => {
      const r = document.createRange(), s = getSelection();
      r.setStartBefore($('strong', nap)); r.setEndAfter($('span', nap)); s.removeAllRanges(); s.addRange(r);
    }));
  }
  const board = $('#hours');
  when(board, () => {
    const tl = tline([board]);
    tl.add(board, { translateY: [12, 0], duration: 500, ease: 'outExpo' }, 0).add(board, { '--today-bar': [0, 1], duration: 500, ease: 'outQuad' }, 150);
    return tl;
  });
  const cover = $('.visit__cover');
  when(cover, () => play(cover, { '--wipe': [0, 1], duration: 700, ease: 'inOutQuad' }, [cover]));
  const guide = $('#getting-here');
  when(guide, () => {
    const lines = $$('.guide__line', guide), st = () => A.stagger(innerWidth < 768 ? 90 : 120);
    const tl = tline([guide]);
    tl.add(guide, { translateY: [12, 0], duration: 500, ease: 'outExpo' }, 0)
      .add(lines, { '--lane': [0, 1], duration: 400, ease: 'outQuad', delay: st() }, 120)
      .add($$('.g-cta', guide), { translateX: [{ from: 0, to: 4, duration: 200, ease: 'outQuad' }, { to: 0, duration: 200, ease: 'inQuad' }], delay: st() }, 320);
    return tl;
  });

  /* M28: pins drop as the line reaches their routed distance */
  const street = $('.street');
  if (street) {
    const roads = $$('.street__road', street), masks = [];
    const streetMasks = () => { if (masks.length || !live()) return; roads.forEach((s, i) => {
      const c = $('.street__centre', s); if (!c) return;
      const vb = s.viewBox.baseVal, m = mk('mask', { id: 'street-m' + i, maskUnits: 'userSpaceOnUse', x: vb.x, y: vb.y, width: vb.width, height: vb.height });
      const mp = mk('path', { d: c.getAttribute('d'), fill: 'none', stroke: '#fff', 'stroke-width': 14 });
      m.appendChild(mp); s.insertBefore(m, s.firstChild); c.setAttribute('mask', `url(#street-m${i})`);
      masks.push(...A.svg.createDrawable(mp)); loose.push(mp);
    }); };
    later.push(streetMasks);
    when(street, () => {
      streetMasks();
      const tl = tline([street]);
      masks.forEach(d => tl.add(d, { draw: ['0 0', '0 1'], duration: 1200, ease: 'inOutQuad' }, 0));
      [['kids', .58], ['mint', .67], ['capitol', .91]].forEach(([k, d]) =>
        tl.add($$('.street__pin--' + k, street), { translateY: [-12, 0], scale: [.6, 1], ease: spring(180, 14) }, Math.round(1200 * d)));
      return tl;
    }, 100, .3);
  }
  [$$('.street__stops [data-anim]'), $$('.drives__list [data-anim]')].forEach(cards => {
    if (!cards.length) return;
    cards.forEach(c => claimed.add(c));
    when(cards[0].parentElement, () => play(cards, { translateY: [12, 0], duration: 500, ease: 'outExpo', delay: A.stagger(80) }, cards));
  });
  $$('dl.faq').forEach(dl => when(dl, () => play($$('.faq__row', dl), { '--rule-s': [0, 1], duration: 400, ease: 'outExpo', delay: A.stagger(40) }, [dl])));
  const fwm = $('.footer__wordmark');
  when(fwm, () => play($$('.fw > span', fwm), { translateY: ['100%', '0%'], duration: 800, ease: 'outExpo', delay: A.stagger(90) }, [fwm]), 95);

  /* M33: tucked only while the CTAs and the chip are fully on screen */
  const ctas = $('#hero-ctas'), hoursChip = $('#open-chip');
  if (ctas && 'IntersectionObserver' in window) {
    const onScreen = new Map();
    const io = new IntersectionObserver(es => {
      es.forEach(e => onScreen.set(e.target, e.isIntersecting && e.intersectionRatio >= .99));
      H.classList.toggle('bar-tucked', onScreen.get(ctas) === true && (!hoursChip || onScreen.get(hoursChip) === true));
    }, { threshold: [0, .99, 1] });
    io.observe(ctas); if (hoursChip) io.observe(hoursChip);
  }

  /* safety net: every unclaimed start state still lands */
  $$('[data-anim]').forEach(el => {
    if (claimed.has(el) || el.closest('svg') || el.closest('#tile-grid')) return;
    when(el, () => play(el, { translateY: [el.dataset.anim === 'rise' ? 16 : 12, 0], opacity: [el.dataset.anim === 'rise' ? 0 : 1, 1], duration: 600, ease: 'outExpo' }, [el]));
  });

  /* tiles render after load, one per idle slice */
  const tilesIn = () => { const ts = $$('.tile:not(.is-ready)'); const step = () => { const t = ts.shift(); if (t) { t.classList.add('is-ready'); idle(step); } }; idle(step); };
  if (document.readyState === 'complete') tilesIn(); else addEventListener('load', tilesIn, { once: true });

  /* boot: no entrances when motion is off */
  if (live()) later.push(wakeScrubs); else settleAll();
  later.push(() => console.log('%cPsst, hey you — over here. Type "treasure" and X marks the spot.',   // the D10 hint, byte-exact (content.md §7)
    'color:#D9A400;background:#14201B;font:700 14px/1.6 Satoshi,system-ui,sans-serif;padding:8px 14px;border-left:4px solid #7A2E1F;'));
  const next = () => { const f = later.shift(); if (!f) return; try { f(); } catch (e) { console.error(e); } setTimeout(next, 0); };
  requestAnimationFrame(() => setTimeout(next, 0));
}, 0));

/* the map iframe loads only on "Show the map here" (A15) */
(() => {
  const btn = document.getElementById('map-reveal');
  const media = btn && btn.closest('.visit__map');
  if (!btn || !media) return;
  btn.addEventListener('click', () => {
    media.classList.add('map-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.hidden = true;
    const map = document.getElementById('visit-map');
    if (map) map.focus();
  });
})();
