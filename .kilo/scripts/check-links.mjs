#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-links.mjs — dependency-free broken-link checker for static repos.
//
// Scans all .html and .md files under the given root, extracts href/src/srcset
// references, and verifies:
//   - local relative/absolute paths resolve to existing files (index.html is
//     assumed for directory targets),
//   - external http(s) URLs return a 2xx/3xx status (bounded concurrency).
// Anchors (#frag) on local files are checked as a warning only (p5/CDN
// targets may legitimately have no matching id).
//
// Usage: node .kilo/scripts/check-links.mjs [--html-only] [--skip-external]
//        node .kilo/scripts/check-links.mjs [root]
// Exit 0 = no hard failures; 1 = broken/missing local targets or failed
// external requests. Warnings never fail.
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve, isAbsolute, sep } from 'node:path';

const ARGS = process.argv.slice(2);
const FLAGS = new Set(ARGS.filter((a) => a.startsWith('--')));
const ROOT = resolve(ARGS.filter((a) => !a.startsWith('--'))[0] || '.');
const HTML_ONLY = FLAGS.has('--html-only');
const SKIP_EXTERNAL = FLAGS.has('--skip-external');

const MAX_CONCURRENCY = 4;
const EXTERNAL_TIMEOUT_MS = 8000;

const EXTENSIONS = ['.html', '.htm', '.md', '.markdown', '.css', '.js', '.mjs'];

const htmlRefRe = /\b(?:href|src|srcset)\s*=\s*["']([^"']+)["']/g;
// CommonMark: [text](target "title") — also [[wiki]]-style links ignored.
const mdRefRe = /\[[^\]]*\]\(([^\s]+)(?:\s+["'][^"']*["'])?\)/g;

const problems = { broken: [], missing: [], external: [], warnings: [] };
const seen = new Set();

function logProblem(bucket, file, target, detail) {
  const key = `${file}::${target}`;
  if (seen.has(key)) return;
  seen.add(key);
  problems[bucket].push({ file, target, detail });
}

function collectFiles(dir) {
  // Support passing a single file as the root: scan just that file.
  try {
    if (statSync(dir).isFile()) {
      return [dir];
    }
  } catch {
    return [];
  }
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === '.git' || entry === 'node_modules' || entry === '.kilo') continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...collectFiles(full));
    else if (HTML_ONLY ? /\.html?$/i.test(entry) : EXTENSIONS.includes(extname(entry).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function extractRefs(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const refs = [];
  const source = extname(file).toLowerCase();
  const isMd = source === '.md' || source === '.markdown';
  const re = isMd ? mdRefRe : htmlRefRe;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') ||
        raw.startsWith('javascript:') || raw.startsWith('data:')) continue;
    const url = safeDecode(raw.replace(/^\/\//, 'https://'));
    // path: local filesystem path (fragment + query stripped for resolution)
    // full: original URL kept for external fetching (query strings matter)
    const path = url.split('#')[0].split('?')[0];
    const full = url.split('#')[0];
    const frag = url.includes('#') ? url.split('#').pop() : null;
    refs.push({ target: url, path, full, frag });
  }
  return refs;
}

function fileExists(p) {
  try {
    const st = statSync(p);
    return st.isFile();
  } catch {
    return false;
  }
}

function resolveLocal(fromDir, path) {
  // Absolute-from-root paths are relative to the repo root. Relative paths
  // are resolved from the file's directory, but a `..` walk is CLAMPED at
  // the repo root — matching browser URL normalization for a site served
  // from the repo root (the canonical way these sims run). Overshooting
  // paths like templates' `../../../shared/` therefore resolve to
  // `<root>/shared/`, exactly as a browser would.
  const target = isAbsolute(path) || path.startsWith(sep)
    ? join(ROOT, path.replace(/^[/\\]+/, ''))
    : normalizeClamped(`${fromDir}${sep}${path}`, ROOT);
  if (fileExists(target)) return { ok: true, path: target };
  if (statSyncSafe(target)?.isDirectory()) {
    const index = join(target, 'index.html');
    if (fileExists(index)) return { ok: true, path: index };
  }
  return { ok: false, path: target };
}

function normalizeClamped(p, root) {
  // p is the RAW joined path (join() does not normalize `..`). Walk it
  // part-by-part so overshooting `..` segments can be clamped at the repo
  // root instead of walking past it (matching browser URL normalization for
  // a site served from the repo root).
  const repoDepth = resolve(process.cwd()).split(sep).filter(Boolean).length;
  const rawParts = p.split(sep);
  const out = [];
  for (const part of rawParts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (out.length > repoDepth) out.pop();
      continue;
    }
    out.push(part);
  }
  return sep + out.join(sep);
}

function statSyncSafe(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

// decodeURI throws on malformed percent-encoding (e.g. `%zz`) in URLs from
// untrusted HTML/Markdown. Fall back to the raw string so a stray `%` can't
// abort the whole scan.
function safeDecode(s) {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}

async function checkExternal(target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
    });
    // A redirect chain or 2xx is fine. 404/5xx is a broken resource. 403
    // and other 4xx are usually WAF/UA policy, not a broken link — report
    // as unverified rather than failing. Origin-only URLs (preconnect
    // targets like https://fonts.googleapis.com) return 404 by design; the
    // real asset URLs carry a path and return 200.
    if (res.ok || (res.status >= 300 && res.status < 400)) return true;
    if (res.status === 403 || res.status === 429 || res.status === 401) return null;
    return res.status >= 400 && res.status < 500 ? false : null;
  } catch {
    return null; // network unavailable / timeout — unverified
  } finally {
    clearTimeout(timer);
  }
}

// Runs `worker(item)` over `items` with at most `limit` in flight at once.
// Items are consumed from the front; the pool is sized to the concurrency
// limit and workers pull the next item as each finishes.
async function runBounded(items, limit, worker) {
  const queue = [...items];
  const workers = [];
  for (let i = 0; i < Math.min(limit, queue.length); i++) {
    workers.push((async () => {
      let item;
      while ((item = queue.shift()) !== undefined) {
        await worker(item);
      }
    })());
  }
  await Promise.all(workers);
}

async function main() {
  const files = collectFiles(ROOT).sort();
  const localRefs = [];
  const externalJobs = [];

  for (const file of files) {
    for (const { target, path: clean, full, frag } of extractRefs(file)) {
      if (/^https?:\/\//i.test(clean)) {
        if (!SKIP_EXTERNAL) {
          // Origin-only URLs (preconnect/dns-prefetch targets) are never
          // fetched by the browser and commonly return 404 on the bare
          // origin — skip them entirely.
          const pathPart = full.replace(/^https?:\/\/[^/]+/i, '');
          if (pathPart) externalJobs.push({ file, target, full });
        }
        continue;
      }
      localRefs.push({ file, target, path: clean, frag });
    }
  }

  // External checks are network-bound: run them in a bounded worker pool
  // (MAX_CONCURRENCY parallel fetches) so N unreachable hosts take ~N/MAX
  // batches of 8s, not N × 8s serially.
  await runBounded(externalJobs, MAX_CONCURRENCY, async ({ file, target, full }) => {
    const outcome = await checkExternal(full);
    if (outcome === false) logProblem('broken', file, target, 'external request failed');
    else if (outcome === null) logProblem('external', file, target, 'unverified (network unavailable/timeout/blocked)');
  });

  for (const { file, target, path: clean, frag } of localRefs) {
    // Anchor-only reference (#foo): resolves against the same file.
    if (clean === '') {
      if (frag && !hasFragment(file, frag)) {
        logProblem('warnings', file, target, `anchor "#${frag}" not found in ${rel(file)}`);
      }
      continue;
    }
    const dir = dirname(file);
    const { ok, path: resolvedPath } = resolveLocal(dir, clean);
    if (!ok) {
      logProblem('missing', file, target, `no such file: ${resolvedPath}`);
    } else if (frag) {
      const okFrag = hasFragment(resolvedPath, frag);
      if (!okFrag) {
        logProblem('warnings', file, target, `anchor "#${frag}" not found in ${rel(resolvedPath)}`);
      }
    }
  }

  const failures = problems.broken.length + problems.missing.length;
  const counts = {
    files: files.length,
    broken: problems.broken.length,
    missing: problems.missing.length,
    warnings: problems.warnings.length,
    unverified: problems.external.length,
  };

  for (const b of problems.broken) console.log(`broken:   ${rel(b.file)} -> ${b.target} (${b.detail})`);
  for (const m of problems.missing) console.log(`missing:  ${rel(m.file)} -> ${m.target} (${m.detail})`);
  for (const w of problems.warnings) console.log(`warn:     ${rel(w.file)} -> ${w.target} (${w.detail})`);
  for (const e of problems.external) console.log(`external: ${rel(e.file)} -> ${e.target} (${e.detail})`);

  console.log(`\n${counts.files} files scanned; ${counts.broken} broken, ${counts.missing} missing, ${counts.warnings} anchor warnings, ${counts.unverified} unverified external.`);
  process.exit(failures > 0 ? 1 : 0);
}

function hasFragment(path, frag) {
  try {
    const text = readFileSync(path, 'utf8');
    const idRe = new RegExp(`\\bid=["']${escapeRe(frag)}["']`);
    const nameRe = new RegExp(`\\bname=["']${escapeRe(frag)}["']`);
    return idRe.test(text) || nameRe.test(text);
  } catch {
    return false;
  }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rel(p) {
  const r = resolve(ROOT);
  return p.startsWith(r) ? p.slice(r.length + 1) : p;
}

main().catch((err) => {
  console.error('check-links failed:', err);
  process.exit(2);
});
