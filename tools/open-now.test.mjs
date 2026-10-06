// tools/open-now.test.mjs (fix-r1, 2026-10-06; never shipped — tools/ is in .vercelignore). A-06 / AC-35 unit test for app.js's open-now block (between /* open-now:begin */ and /* open-now:end */), run in Node.
// 7 days × 4 times (PDT week and PST week) + 6 holiday dates × 4 times + evening-before-holiday + laTime vs Intl.
import { readFileSync } from 'node:fs';
const src = readFileSync(process.argv[2] || new URL('../app.js', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('/* open-now:begin */'), src.indexOf('/* open-now:end */'));
if (!block.includes('openState')) throw new Error('open-now block not found');
const { laTime, holiday, openState } = new Function(block + '; return { laTime, holiday, openState };')();
// LA wall-clock → UTC instant (PDT = UTC-7, PST = UTC-8), the expected offset passed explicitly per case
const at = (y, m, d, hh, mm, off) => new Date(Date.UTC(y, m - 1, d, hh + off, mm));
const T = [[9, 59, 'Opens today at 10 AM'], [10, 0, 'Open now · until 6 PM'], [17, 59, 'Open now · until 6 PM'], [18, 0, 'Closed now · opens 10 AM']];
const H = "Holiday — call to check today's hours";
let pass = 0, fail = 0; const bad = [];
const check = (label, got, want) => { if (got === want) pass++; else { fail++; bad.push(`${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); } };
// 7 ordinary days in PDT (Mon 5 – Sun 11 Oct 2026) and in PST (Mon 11 – Sun 17 Jan 2027)
for (const [y, m, d0, off] of [[2026, 10, 5, 7], [2027, 1, 11, 8]]) for (let k = 0; k < 7; k++) for (const [hh, mm, want] of T) check(`${y}-${m}-${d0 + k} ${hh}:${mm}`, openState(at(y, m, d0 + k, hh, mm, off)), want);
// 6 holiday dates (Thanksgiving 2026 + 2027, Dec 24/25/31 2026, Jan 1 2027) × 4 times → holiday string all day
const HOL = [[2026, 11, 26], [2027, 11, 25], [2026, 12, 24], [2026, 12, 25], [2026, 12, 31], [2027, 1, 1]];
for (const [y, m, d] of HOL) for (const [hh, mm] of T) check(`holiday ${y}-${m}-${d} ${hh}:${mm}`, openState(at(y, m, d, hh, mm, 8)), H);
// the evening before a holiday promises nothing (null); the day after a holiday is ordinary
for (const [y, m, d] of [[2026, 11, 25], [2026, 12, 23], [2026, 12, 30]]) check(`eve ${y}-${m}-${d} 18:30`, openState(at(y, m, d, 18, 30, 8)), null);
check('day after Thanksgiving 10:30', openState(at(2026, 11, 27, 10, 30, 8)), 'Open now · until 6 PM');
check('Dec 26 09:00', openState(at(2026, 12, 26, 9, 0, 8)), 'Opens today at 10 AM');
check('Thu 19 Nov 2026 (3rd Thu) 11:00', openState(at(2026, 11, 19, 11, 0, 8)), 'Open now · until 6 PM');
// 23:30 / 00:30 PT weekday boundaries (AC-35's mocked times)
check('Sat 23:30 PT is Saturday', laTime(at(2026, 10, 10, 23, 30, 7)).wd, 6);
check('Sun 00:30 PT is Sunday', laTime(at(2026, 10, 11, 0, 30, 7)).wd, 0);
check('Sun 00:30 PST is Sunday', laTime(at(2027, 1, 17, 0, 30, 8)).wd, 0);
// laTime agrees with an independent Intl America/Los_Angeles formatter every 15 min over 2025-01-01 … 2031-01-01 (fix-r3: laTime itself is Intl now, spec §9 A8; this guards the parts parsing)
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short' });
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
let mism = 0, n = 0;
for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2031, 0, 1); t += 15 * 60e3) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map(x => [x.type, x.value])); const l = laTime(new Date(t)); n++;
  if (l.wd !== WD[p.weekday] || l.day !== +p.day || l.mo !== +p.month - 1 || l.min !== +p.hour * 60 + +p.minute) mism++;
}
check(`laTime vs Intl over ${n} quarter-hours`, mism, 0);
console.log(`open-now unit test: ${pass} pass, ${fail} fail`); bad.forEach(b => console.log('  FAIL ' + b));
process.exit(fail ? 1 : 0);
