#!/usr/bin/env node
// Static link/asset validation without executing the application or adding dependencies.
// Usage: node .kilo/scripts/check-links.mjs [scope] [--skip-external]
//        [--html-only] [--base-path=/SP015/] [--require-semesters]
// templates/ is checked at its intended four-level destination, not as a runnable page.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXTENSIONS = new Set(['.html', '.htm', '.md', '.markdown', '.css', '.js', '.mjs']);
const EXCLUDED = new Set(['.git', 'node_modules', '.codex', 'scratch']);
const ORIGIN = 'https://repository.invalid';
const TEMPLATE_DIRECTORY = 'simulations/sp015/__chapter__/__topic__';
const slash = (value) => value.split(sep).join('/');
const within = (root, file) => !relative(root, file).startsWith(`..${sep}`) && relative(root, file) !== '..';
const stat = (file) => { try { return statSync(file); } catch { return null; } };
const decodeEntities = (value) => value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (all, entity) => {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
  if (entity.startsWith('#')) {
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
  }
  return named[entity.toLowerCase()];
});

function collectFiles(scope, htmlOnly) {
  if (!stat(scope)) throw new Error(`Scan scope does not exist: ${scope}`);
  if (stat(scope).isFile()) return [scope];
  return readdirSync(scope, { withFileTypes: true }).flatMap((entry) => {
    if (EXCLUDED.has(entry.name) || entry.isSymbolicLink()) return [];
    const file = join(scope, entry.name);
    if (entry.isDirectory()) return collectFiles(file, htmlOnly);
    if (/\.test\.[cm]?js$/.test(file)) return [];
    return (htmlOnly ? /\.html?$/.test(file) : EXTENSIONS.has(extname(file))) ? [file] : [];
  });
}

function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
    .map((match) => [match[1].toLowerCase(), decodeEntities(match[2] ?? match[3] ?? match[4] ?? '')]));
}

export function cssReferences(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const urls = [...text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|((?:\\.|[^)])*))\s*\)/gi)]
    .map((match) => (match[1] ?? match[2] ?? match[3]).trim().replace(/\\([() '"\\])/g, '$1'));
  const imports = [...text.matchAll(/@import\s+["']([^"']+)["']/gi)].map((match) => match[1]);
  return [...urls, ...imports].map((target) => ({ target, kind: 'asset' }));
}

function srcsetReferences(source) {
  // URL tokens may contain commas (data URLs); descriptors end at the next comma.
  const urls = [];
  let rest = source.trim();
  while (rest) {
    rest = rest.replace(/^[\s,]+/, '');
    const match = rest.match(/^(\S+)/);
    if (!match) break;
    const token = match[1];
    urls.push(token.replace(/,+$/, ''));
    rest = rest.slice(token.length);
    if (!token.endsWith(',')) {
      const comma = rest.indexOf(',');
      rest = comma < 0 ? '' : rest.slice(comma + 1);
    }
  }
  return urls.map((target) => ({ target, kind: 'asset' }));
}

export function htmlReferences(source) {
  const text = source.replace(/<!--[\s\S]*?-->/g, '').replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>');
  const refs = [];
  const ids = [];
  let base = null;
  for (const match of text.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attrs = attributes(match[2]);
    if (attrs.id) ids.push(attrs.id);
    if (tag === 'base') { base ??= attrs.href ?? null; continue; }
    for (const key of ['href', 'src', 'poster']) {
      if (attrs[key]) refs.push({ target: attrs[key], kind: tag === 'a' || (tag === 'link' && attrs.rel === 'canonical') ? 'navigation' : 'asset' });
    }
    if (attrs.srcset) refs.push(...srcsetReferences(attrs.srcset));
    if (tag === 'meta' && attrs['http-equiv']?.toLowerCase() === 'refresh') {
      const target = attrs.content?.match(/(?:^|;)\s*url\s*=\s*(.*?)\s*$/i)?.[1];
      if (target) refs.push({ target: target.replace(/^(['"])(.*)\1$/, '$2'), kind: 'navigation' });
      else if (/url/i.test(attrs.content ?? '')) refs.push({ target: '', error: 'Invalid meta-refresh destination' });
    }
    if (attrs.style) refs.push(...cssReferences(attrs.style));
  }
  for (const match of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) refs.push(...cssReferences(match[1]));
  return { refs, ids, base };
}

function markdownReferences(source) {
  const text = source.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '');
  return [...text.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|((?:\\.|[^()\s]|\([^()]*\))+))(?:\s+["'][^"']*["'])?\s*\)/g)]
    .map((match) => ({ target: match[1] ?? match[2], kind: 'documentation' }));
}

// Catalogue metadata is deliberately a literal array of literal objects. Parse
// that small JS subset instead of evaluating application code or template strings.
export function parseCatalogue(source) {
  const declaration = /^\s*(?:export\s+)?const\s+SIMULATIONS\s*=\s*/m.exec(source);
  if (!declaration) return null;
  let offset = declaration.index + declaration[0].length;
  const fail = () => { throw new Error(`SIMULATIONS must contain static literal metadata (offset ${offset})`); };
  const skip = () => {
    while (true) {
      const next = source.slice(offset).match(/^(?:\s+|\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)/);
      if (!next) return;
      offset += next[0].length;
    }
  };
  const string = () => {
    const quote = source[offset++];
    let result = '';
    while (offset < source.length) {
      const char = source[offset++];
      if (char === quote) return result;
      if (char !== '\\') { if (char === '\n' || char === '\r') fail(); result += char; continue; }
      const escaped = source[offset++];
      if (escaped === 'u' || escaped === 'x') {
        const count = escaped === 'u' ? 4 : 2;
        const digits = source.slice(offset, offset + count);
        if (!new RegExp(`^[\\da-fA-F]{${count}}$`).test(digits)) fail();
        result += String.fromCharCode(parseInt(digits, 16)); offset += count;
      } else {
        result += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' })[escaped] ?? escaped;
      }
    }
    fail();
  };
  const value = () => {
    skip();
    const start = source[offset];
    if (start === '"' || start === "'") return string();
    if (start === '[' || start === '{') {
      offset++;
      const array = start === '[';
      const end = array ? ']' : '}';
      const result = array ? [] : Object.create(null);
      skip();
      while (source[offset] !== end) {
        if (array) result.push(value());
        else {
          skip();
          const quoted = /['"]/.test(source[offset]);
          const key = quoted ? string() : source.slice(offset).match(/^[A-Za-z_$][\w$]*/)?.[0];
          if (key == null) fail();
          if (!quoted) offset += key.length;
          skip(); if (source[offset++] !== ':') fail();
          if (Object.hasOwn(result, key)) fail();
          result[key] = value();
        }
        skip();
        if (source[offset] === end) break;
        if (source[offset++] !== ',') fail();
        skip();
      }
      if (source[offset++] !== end) fail();
      return result;
    }
    const primitive = source.slice(offset).match(/^(?:true\b|false\b|null\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/)?.[0];
    if (!primitive) fail();
    offset += primitive.length;
    return JSON.parse(primitive);
  };
  const entries = value();
  skip();
  if (!Array.isArray(entries) || ![';', undefined].includes(source[offset])) fail();
  return entries;
}

function exactExists(file) {
  // Check case explicitly even on a case-insensitive development filesystem.
  if (!stat(file)) return false;
  let current = resolve(file);
  while (dirname(current) !== current) {
    if (!readdirSync(dirname(current)).includes(current.slice(dirname(current).length + (dirname(current) === sep ? 0 : 1)))) return false;
    current = dirname(current);
  }
  return true;
}

export function resolveReference(repoRoot, file, target, { basePath = '/', base = null } = {}) {
  const segments = basePath.split('/').filter(Boolean);
  const prefix = segments.length ? `/${segments.join('/')}/` : '/';
  const template = slash(relative(repoRoot, file)).startsWith('templates/');
  const logical = template ? `${TEMPLATE_DIRECTORY}/${slash(relative(join(repoRoot, 'templates'), file))}` : slash(relative(repoRoot, file));
  const pageURL = new URL(prefix + logical.split('/').map(encodeURIComponent).join('/'), ORIGIN);
  const url = new URL(target, base ? new URL(base, pageURL) : pageURL);
  if (url.origin !== ORIGIN) return { external: url.href };
  if (!url.pathname.startsWith(prefix)) return { error: `Escapes hosting base ${prefix}` };
  const decoded = decodeURIComponent(url.pathname.slice(prefix.length));
  let path = resolve(repoRoot, decoded);
  if (!within(repoRoot, path)) return { error: 'Path escapes repository root' };
  if (template && decoded.startsWith(`${TEMPLATE_DIRECTORY}/`)) path = resolve(repoRoot, 'templates', decoded.slice(TEMPLATE_DIRECTORY.length + 1));
  // Detect overshooting relative paths even when a root-hosted URL would clamp.
  if (!base && !target.startsWith('/') && !/^[a-z][\w+.-]*:/i.test(target)) {
    const raw = target.split(/[?#]/)[0];
    if (!within(repoRoot, resolve(repoRoot, dirname(logical), decodeURIComponent(raw)))) return { error: 'Relative path walks above repository root' };
  }
  return { path, fragment: decodeURIComponent(url.hash.slice(1)) };
}

function hasFragment(file, fragment) {
  const source = readFileSync(file, 'utf8');
  if (htmlReferences(source).ids.includes(fragment) || [...source.matchAll(/\bname=["']([^"']+)["']/g)].some((m) => m[1] === fragment)) return true;
  if (!/\.md(?:own)?$/.test(file) && !file.endsWith('.markdown')) return false;
  const slugs = new Map();
  return [...source.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)].some((match) => {
    const slug = match[1].toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
    const count = slugs.get(slug) ?? 0; slugs.set(slug, count + 1);
    return (count ? `${slug}-${count}` : slug) === fragment;
  });
}

async function checkExternal(target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(target, { redirect: 'follow', signal: controller.signal });
    if (response.ok || (response.status >= 300 && response.status < 400)) return true;
    if (response.status === 404 || response.status === 410 || response.status >= 500) return false;
    return null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function validateTree({ root = process.cwd(), repoRoot = root, basePath = '/', htmlOnly = false, skipExternal = true, requireSemesters = false } = {}) {
  root = resolve(root); repoRoot = resolve(repoRoot);
  const files = collectFiles(root, htmlOnly).sort();
  const issues = [];
  const seen = new Set();
  const external = new Map();
  let references = 0;
  let catalogueEntries = 0;
  const add = (kind, file, target, detail) => {
    const key = JSON.stringify([kind, file, target, detail]);
    if (!seen.has(key)) { seen.add(key); issues.push({ kind, file, target, detail }); }
  };
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const extension = extname(file).toLowerCase();
    let refs = []; let base = null;
    if (['.html', '.htm'].includes(extension)) {
      const parsed = htmlReferences(source); refs = parsed.refs; base = parsed.base;
      const ids = new Set();
      for (const id of parsed.ids) { if (ids.has(id)) add('invalid', file, `#${id}`, 'Duplicate HTML id'); ids.add(id); }
    } else if (extension === '.css') refs = cssReferences(source);
    else if (['.md', '.markdown'].includes(extension)) refs = markdownReferences(source);
    else if (['.js', '.mjs'].includes(extension)) {
      try {
        const entries = parseCatalogue(source);
        if (entries) {
          catalogueEntries += entries.length;
          const groups = new Map(); const ids = new Set(); const destinations = new Set();
          for (const entry of entries) {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Catalogue entries must be objects');
            const semester = entry.semester ?? 'sp015';
            if (!['sp015', 'sp025'].includes(semester) || (requireSemesters && !entry.semester)) add('invalid', file, entry.title ?? '', 'Explicit semester sp015/sp025 required');
            const group = `${semester}:${entry.chapter}`;
            if (groups.has(group) && groups.get(group) !== entry.chapterName) add('invalid', file, group, 'Chapter names disagree within a semester');
            groups.set(group, entry.chapterName);
            if (entry.id) {
              if (ids.has(entry.id) || (requireSemesters && !entry.id.startsWith(`${semester}-`))) add('invalid', file, entry.id, 'Catalogue IDs must be unique and semester-qualified');
              ids.add(entry.id);
            }
            if (entry.href) {
              if (typeof entry.href !== 'string') throw new Error('Catalogue href must be a literal string');
              if (entry.status !== 'completed') add('invalid', file, entry.href, 'Only completed catalogue entries may expose launch URLs');
              const destination = resolveReference(repoRoot, file, entry.href, { basePath });
              const key = destination.path ?? entry.href;
              if (destinations.has(key)) add('invalid', file, entry.href, 'Duplicate catalogue destination');
              destinations.add(key);
              if (requireSemesters && destination.path && !slash(relative(repoRoot, destination.path)).startsWith(`simulations/${semester}/`)) add('invalid', file, entry.href, 'Destination does not match semester');
              refs.push({ target: entry.href, kind: 'navigation' });
            } else if (entry.status === 'completed') add('invalid', file, entry.title ?? '', 'Completed entry is missing a launch URL');
          }
        }
      } catch (error) { add('invalid', file, 'SIMULATIONS', error.message); }
    }
    for (const ref of refs) {
      if (ref.error) { add('invalid', file, ref.target, ref.error); continue; }
      if (!ref.target || /^(?:data|mailto|tel|javascript|blob):/i.test(ref.target)) continue;
      references++;
      try {
        const destination = resolveReference(repoRoot, file, ref.target, { basePath, base });
        if (destination.error) { add('missing', file, ref.target, destination.error); continue; }
        if (destination.external) {
          if (!skipExternal && /^https?:/.test(destination.external) && new URL(destination.external).pathname !== '/') {
            const jobs = external.get(destination.external) ?? []; jobs.push({ file, target: ref.target }); external.set(destination.external, jobs);
          }
          continue;
        }
        let path = destination.path;
        if (exactExists(path) && stat(path).isDirectory() && ref.kind === 'navigation') path = join(path, 'index.html');
        if (!exactExists(path) || (stat(path).isDirectory() && ref.kind !== 'documentation')) add('missing', file, ref.target, `No exact-case target: ${path}`);
        else if (destination.fragment && stat(path).isFile()
          && ['.html', '.htm', '.md', '.markdown', '.svg', '.js', '.mjs', '.css'].includes(extname(path))
          && !hasFragment(path, destination.fragment)) add('warn', file, ref.target, 'Fragment not found (dynamic IDs and source-line anchors require review)');
      } catch (error) { add('invalid', file, ref.target, error.message); }
    }
  }
  const jobs = [...external];
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, async () => {
    while (jobs.length) {
      const [url, owners] = jobs.shift(); const result = await checkExternal(url);
      if (result !== true) for (const owner of owners) add(result === false ? 'broken' : 'external', owner.file, owner.target, result === false ? 'External URL failed' : 'External URL unverified');
    }
  }));
  return { files: files.length, references, catalogueEntries, issues, failures: issues.filter((issue) => ['missing', 'invalid', 'broken'].includes(issue.kind)).length };
}

async function main() {
  const args = process.argv.slice(2);
  const known = new Set(['--skip-external', '--html-only', '--require-semesters']);
  for (const arg of args) if (arg.startsWith('--') && !known.has(arg) && !arg.startsWith('--base-path=')) throw new Error(`Unknown option: ${arg}`);
  const scopes = args.filter((arg) => !arg.startsWith('--'));
  if (scopes.length > 1) throw new Error('Pass at most one scan scope');
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
  const result = await validateTree({ root: scopes[0] ?? '.', repoRoot, basePath: args.find((arg) => arg.startsWith('--base-path='))?.slice(12) ?? '/', htmlOnly: args.includes('--html-only'), skipExternal: args.includes('--skip-external'), requireSemesters: args.includes('--require-semesters') });
  for (const issue of result.issues) console.log(`${issue.kind}: ${slash(relative(repoRoot, issue.file))} -> ${issue.target} (${issue.detail})`);
  console.log(`\n${result.files} files; ${result.references} references; ${result.catalogueEntries} catalogue entries; ${result.failures} failures; ${result.issues.filter((i) => i.kind === 'warn').length} warnings; ${result.issues.filter((i) => i.kind === 'external').length} unverified external.`);
  process.exitCode = result.failures ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((error) => { console.error(`check-links failed: ${error.message}`); process.exitCode = 2; });
