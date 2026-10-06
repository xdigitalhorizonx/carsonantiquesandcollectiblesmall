#!/usr/bin/env node
// csp-hash.mjs — prints the CSP hash of index.html's ONE inline executable script and pins it in vercel.json
// (spec §6.5). Never guess the hash: run this after ANY edit to the inline head script.
//   node tools/csp-hash.mjs           -> prints sha256-…, patches vercel.json's Content-Security-Policy-Report-Only
//   node tools/csp-hash.mjs --check   -> exit 1 if vercel.json's hash differs from the recomputed one (no write)
// The script is hashed exactly as written between <script> and </script>. It is kept on one line so a CRLF
// (Windows checkout, core.autocrlf=true) and an LF (git / Vercel) copy hash identically.
// No upgrade-insecure-requests in the policy on purpose: browsers ignore it in a Report-Only header (it is not
// reportable). Add it back when this policy is switched to an enforcing Content-Security-Policy.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const inline = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .filter(m => !/\ssrc=/.test(m[1] || '') && !/application\/ld\+json/.test(m[1] || ''));
if (inline.length !== 1) { console.error(`expected exactly 1 inline executable script, found ${inline.length}`); process.exit(2); }
if (/\r|\n/.test(inline[0][2])) { console.error('the inline script spans lines — keep it on one line (CRLF/LF checkouts would hash differently)'); process.exit(2); }
const hash = 'sha256-' + crypto.createHash('sha256').update(inline[0][2], 'utf8').digest('base64');
const vPath = path.join(root, 'vercel.json');
const vj = fs.readFileSync(vPath, 'utf8');
const v = JSON.parse(vj);
const hdr = [].concat(...v.headers.map(h => h.headers)).find(h => h.key === 'Content-Security-Policy-Report-Only');
if (!hdr) { console.error('vercel.json has no Content-Security-Policy-Report-Only header'); process.exit(2); }
const current = (hdr.value.match(/'(sha256-[^']+)'/) || [])[1];
console.log(hash);
if (process.argv.includes('--check')) { console.log(current === hash ? 'vercel.json OK' : `vercel.json STALE (has ${current})`); process.exit(current === hash ? 0 : 1); }
if (current === hash) { console.log('vercel.json already pinned'); process.exit(0); }
fs.writeFileSync(vPath, vj.replace(`'${current}'`, `'${hash}'`));
console.log(`vercel.json patched (${current} -> ${hash})`);
