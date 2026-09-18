/* Palette preview tool — Digital Horizon, 2026-09-18.
   Lets the client flip the whole site between five colour schemes to pick a direction.
   Every scheme only swaps the seven colour tokens in styles.css, and each one was checked for
   WCAG AA on every text role before it shipped. Choice persists per browser (localStorage) and
   can be shared as a link: ?palette=<id>. Remove this file + #palette-tool to retire the tool. */
(function () {
  'use strict';
  var PALETTES = [
    { id: 'dock',    name: 'Loading Dock',    note: 'The original — sign yellow and barn red on pine-black.', meta: '#14201B' },
    { id: 'oxblood', name: 'Oxblood & Brass', note: 'Parlor tones — deep oxblood, polished brass, verdigris.', meta: '#2A1417' },
    { id: 'enamel',  name: 'Enamel Sign',     note: 'Old porcelain signs — cobalt, signal orange and red.',    meta: '#10294A' },
    { id: 'walnut',  name: 'Walnut & Teal',   note: 'Mid-century — walnut brown with teal and plum.',         meta: '#2A1E16' },
    { id: 'pewter',  name: 'Pewter & Copper', note: 'Workshop metals — pewter grey, copper and slate blue.',   meta: '#1F2328' }
  ];
  var KEY = 'cacm-palette';
  var root = document.documentElement;
  var tool = document.getElementById('palette-tool');
  if (!tool) return;
  var btn = tool.querySelector('.palette-tool__toggle');
  var panel = tool.querySelector('.palette-tool__panel');
  var list = tool.querySelector('.palette-tool__list');
  var copyBtn = tool.querySelector('.palette-tool__copy');
  var status = tool.querySelector('.palette-tool__status');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var metaTheme = document.querySelector('meta[name="theme-color"]');

  function byId(id) { for (var i = 0; i < PALETTES.length; i++) if (PALETTES[i].id === id) return PALETTES[i]; return null; }
  function current() { return byId(root.dataset.palette) || PALETTES[0]; }

  // Build the options (native radios = arrow-key navigation and screen-reader semantics for free)
  list.innerHTML = PALETTES.map(function (p) {
    return '<label class="palette-opt" data-palette-preview="' + p.id + '">' +
      '<input type="radio" name="cacm-palette" value="' + p.id + '">' +
      '<span class="palette-opt__chips" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      '<span class="palette-opt__text"><b>' + p.name + '</b><small>' + p.note + '</small></span>' +
      '</label>';
  }).join('');

  function apply(id, opts) {
    var p = byId(id) || PALETTES[0];
    var go = function () {
      if (p.id === 'dock') delete root.dataset.palette; else root.dataset.palette = p.id;
      if (metaTheme) metaTheme.setAttribute('content', p.meta);
    };
    if (opts && opts.animate && !reduced && document.startViewTransition) document.startViewTransition(go); else go();
    try { if (p.id === 'dock') localStorage.removeItem(KEY); else localStorage.setItem(KEY, p.id); } catch (e) {}
    var r = list.querySelector('input[value="' + p.id + '"]');
    if (r) r.checked = true;
    btn.querySelector('.palette-tool__label').textContent = p.name;
    if (opts && opts.announce) status.textContent = p.name + ' applied.';
  }

  function open() {
    panel.hidden = false; btn.setAttribute('aria-expanded', 'true');
    var r = list.querySelector('input:checked') || list.querySelector('input');
    if (r) r.focus();
  }
  function close(focusBack) {
    if (panel.hidden) return;
    panel.hidden = true; btn.setAttribute('aria-expanded', 'false');
    if (focusBack) btn.focus();
  }

  btn.addEventListener('click', function () { panel.hidden ? open() : close(true); });
  tool.querySelector('.palette-tool__close').addEventListener('click', function () { close(true); });
  list.addEventListener('change', function (e) { if (e.target && e.target.name === 'cacm-palette') apply(e.target.value, { animate: true, announce: true }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(true); });
  document.addEventListener('click', function (e) { if (!panel.hidden && !tool.contains(e.target)) close(false); });

  copyBtn.addEventListener('click', function () {
    var p = current();
    var url = location.origin + location.pathname + (p.id === 'dock' ? '' : '?palette=' + p.id);
    var done = function (ok) { status.textContent = ok ? 'Link copied — it opens the site in ' + p.name + '.' : url; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
    else done(false);
  });

  // Initial state: the <head> snippet already set data-palette before first paint; sync the UI to it.
  apply(current().id, { animate: false, announce: false });
})();
