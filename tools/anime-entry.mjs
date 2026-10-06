// anime.js 4.5.0 custom build entry for Carson Antiques home v2 (SPEC.md §7.1; copy of concept-C-evidence/entry-c.mjs).
// Tree-shaken to exactly what app.js calls: no splitText (D-06). Imports point at the vendored animejs skill (MIT).
// createSpring is bound to 4.5.0's spring(): same Spring class and params, minus the deprecation console.warn that
// createSpring() prints on every call (build-motion.md, deviation 1). window.anime keeps the spec's shape.
// Rebuild (esbuild 0.28.2, installed OUTSIDE the repo — AM-2: no package.json here):
//   esbuild tools/anime-entry.mjs --bundle --minify --format=iife --legal-comments=eof --outfile=assets/anime-4.5.0-cacm.min.js
// Immutable /assets cache (vercel.json): any rebuild with different bytes must ship under a new file name.
import { animate, createTimeline, stagger, onScroll, createAnimatable, spring, set, remove, random, randomPick, cleanInlineStyles, clamp, mapRange, snap } from 'C:/Users/Landmark/.claude/skills/animejs/lib/dist/modules/index.js';
import { createDrawable, createMotionPath } from 'C:/Users/Landmark/.claude/skills/animejs/lib/dist/modules/svg/index.js';
window.anime = { animate, createTimeline, stagger, onScroll, createAnimatable, createSpring: spring, utils: { set, remove, random, randomPick, cleanInlineStyles, clamp, mapRange, snap }, svg: { createDrawable, createMotionPath } };
