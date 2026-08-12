#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-shared-usage.mjs — dependency-free convention checker for the SP015
// sim codebase. Scans animations/** for violations of the repo conventions in
// instructions/coding.md and docs/architecture.md §6:
//
//   HARD (exit 1):
//     - hex color literals in *.js canvas code (must use PALETTE.*)
//     - `var ` declarations (const/let only)
//   WARN (never fail; agent interprets):
//     - rgb()/rgba()/fill()/stroke() with literal numbers (may be PALETTE.*RGB
//       spreads, which are fine)
//     - HTML-entity math (&omega;, <sub>, &radic;, ...) in HTML label/latex
//       contexts (legacy markup)
//
// shared/sim-utils.js itself and .kilo/ are exempt.
// Usage: node .kilo/scripts/check-shared-usage.mjs [root]
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve(process.argv[2] || '.');
const EXEMPT_DIRS = new Set(['.git', 'node_modules', '.kilo']);

const hexRe = /#[0-9a-fA-F]{3,8}\b/;
const varRe = /\bvar\s+[A-Za-z_$]/;
const numColorRe = /\b(?:rgb|rgba)\(\s*\d+[^)]*\)/;
const entityRe = /&(?:omega|lambda|radic|frac12|alpha|beta|gamma|theta|mu|pi|tau);|<sub>|<sup>/i;

const problems = { hard: [], warnings: [] };
const seen = new Set();

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
    else if (/\.(js|html|htm|css)$/i.test(entry)) out.push(full);
  }
  return out;
}

function rel(p) {
  const r = resolve(ROOT);
  return p.startsWith(r) ? p.slice(r.length + 1) : p;
}

function add(bucket, file, line, detail) {
  const key = `${file}:${line}:${detail}`;
  if (seen.has(key)) return;
  seen.add(key);
  problems[bucket].push({ file, line, detail });
}

function main() {
  const files = collectFiles(ROOT).sort();
  for (const file of files) {
    const isJS = /\.js$/i.test(file);
    const isHTML = /\.(html|htm)$/i.test(file);
    const isCSS = /\.css$/i.test(file);
    if (file.endsWith('/shared/sim-utils.js')) continue;

    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const loc = `${rel(file)}:${i + 1}`;

      if (isJS) {
        // Hex color literal in canvas code is the violation — including as a
        // string argument (fill("#ff6b35")). Only comments and PALETTE's own
        // definition in shared/sim-utils.js are exempt.
        if (hexRe.test(line) && !/^\s*\/\//.test(line) && !/PALETTE/.test(line)) {
          add('hard', file, i + 1, `hex color literal (use PALETTE.*) — ${line.trim()}`);
        }
        if (varRe.test(line) && !/^\s*\/\//.test(line) && !/['"]var\b/.test(line)) {
          add('hard', file, i + 1, `"var" declaration (use const/let) — ${line.trim()}`);
        }
        if (numColorRe.test(line) && !/^\s*\/\//.test(line)) {
          add('warnings', file, i + 1, `numeric rgb() call (PALETTE.*RGB spread is fine) — ${line.trim()}`);
        }
      }

      if (isHTML) {
        if (entityRe.test(line)) {
          add('warnings', file, i + 1, `HTML-entity or <sub>/<sup> math notation — ${line.trim()}`);
        }
      }

      if (isCSS) {
        if (/url\([^)]*\)/.test(line) && !/^\s*\/\*/.test(line)) {
          add('warnings', file, i + 1, `url() reference in CSS — ${line.trim()}`);
        }
      }
    }
  }

  for (const p of problems.hard) console.log(`violation: ${p.file}:${p.line} — ${p.detail}`);
  for (const w of problems.warnings) console.log(`warn:      ${w.file}:${w.line} — ${w.detail}`);

  console.log(`\n${files.length} files scanned; ${problems.hard.length} violations, ${problems.warnings.length} warnings.`);
  process.exit(problems.hard.length > 0 ? 1 : 0);
}

main();
