#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-dt.mjs — dependency-free dt-clamp checker for the SP015 sim codebase.
//
// Scans controller/sketch/sim files (by basename, so chapter names like
// "simple-harmonic-motion" never match) for the repo's integration-loop rules
// (instructions/coding.md §3, instructions/physics.md §3):
//
//   HARD (exit 1):
//     - a clock-derived per-frame dt (deltaTime, performance.now(),
//       Date.now(), a timestamp param, or a "(a - b) / 1000" expression)
//       assigned to dt with no Math.min(..., MAX) clamp on the line or
//       within 3 lines
//   WARN (never fails):
//     - a hardcoded numeric dt with no nearby clamp (agent decides whether
//       it is a legit fixed timestep like 7.5's _interferenceLoop or an
//       integration step that needs a clamp)
//     - more than one persistent loop driver — requestAnimationFrame counts
//       as ONE driver per file (a ticker re-registers itself at each call
//       site), and setInterval adds one per distinct callback; p5
//       .loop()/.noLoop() toggles and one-shot setTimeout calls are not
//       independent clocks (docs/architecture.md §5)
//
// dt passed *into* a physics method (e.g. `this.elapsedTime += dt`) is not
// a violation — the clamp must live at the clock-read site, which is the
// controller/sketch.
//
// Usage: node .kilo/scripts/check-dt.mjs [root]
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] || '.');
const EXEMPT_DIRS = new Set(['.git', 'node_modules', '.kilo']);

const clockReadRe = /(?:deltaTime|performance\.now\(\)|Date\.now\(\)|\btimestamp\b|\bdt\s*=\s*\(\s*\w+\s*-\s*\w+\s*\)\s*\/\s*\d{2,4})/i;
const clampRe = /Math\.min\s*\([^)]*,[^)]*\)/;
const fixedDtRe = /\bdt\s*=\s*\d+(\.\d+)?\b/;
const rAFRe = /requestAnimationFrame\s*\(\s*([A-Za-z_$][\w$]*)/;
const intervalRe = /setInterval\s*\(\s*([A-Za-z_$][\w$]*)/;

const problems = { hard: [], warnings: [] };

function collectFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (EXEMPT_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...collectFiles(full));
    else if (/\.(js|mjs)$/i.test(entry)) out.push(full);
  }
  return out;
}

function rel(p) {
  const r = resolve(ROOT);
  return p.startsWith(r) ? p.slice(r.length + 1) : p;
}

function main() {
  const files = collectFiles(ROOT)
    .filter((f) => /(?:controller|sketch|^circular-motion-sim)\.js$/i.test(basename(f)));

  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    const drivers = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*\/\//.test(line)) continue;

      // Persistent clock drivers (deduped — a re-registering rAF is one).
      const rAF = line.match(rAFRe);
      const interval = line.match(intervalRe);
      if (rAF) drivers.add('rAF');
      if (interval) drivers.add(`interval:${interval[1]}`);

      const lookahead = lines.slice(i, i + 4).join('\n');

      // Clock-derived dt without a clamp.
      if (clockReadRe.test(line) && /\bdt\b/.test(line) && !clampRe.test(lookahead)) {
        problems.hard.push({ file, line: i + 1, detail: `clock-derived dt without Math.min clamp — ${line.trim()}` });
      }
      // Hardcoded numeric dt without a clamp (warn — legit for fixed-step loops).
      if (fixedDtRe.test(line) && !clampRe.test(lookahead)) {
        problems.warnings.push({ file, line: i + 1, detail: `hardcoded dt without clamp — ${line.trim()}` });
      }
    }

    if (drivers.size > 1) {
      problems.warnings.push({ file, line: 0, detail: `${drivers.size} loop drivers [${[...drivers].join(', ')}] — single shared clock expected` });
    }
  }

  for (const p of problems.hard) console.log(`violation: ${p.file}:${p.line} — ${p.detail}`);
  for (const w of problems.warnings) console.log(`warn:      ${w.file}:${w.line || 0} — ${w.detail}`);

  console.log(`\n${files.length} controller/sketch files scanned; ${problems.hard.length} violations, ${problems.warnings.length} warnings.`);
  process.exit(problems.hard.length > 0 ? 1 : 0);
}

main();
