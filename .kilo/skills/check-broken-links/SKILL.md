---
name: check-broken-links
description: Find broken references across the repo — missing script/CSS targets, dead markdown links, dangling anchors, and unreachable external URLs. Use when asked to check links, references, or paths in HTML/markdown files.
---

# Check Broken Links

Finds broken references across the repo (HTML asset refs, markdown links,
anchors, external URLs). Run the script from the repo root:

```sh
node .kilo/scripts/check-links.mjs            # html + markdown, external too
node .kilo/scripts/check-links.mjs --html-only
node .kilo/scripts/check-links.mjs --skip-external
node .kilo/scripts/check-links.mjs <path>     # scope to a subdirectory
```

## What the script reports

- `broken:` — external URL failed (404/5xx after redirects).
- `missing:` — local `href`/`src`/`srcset` or markdown link target does not
  resolve to an existing file. Directory targets fall back to `index.html`.
  `..` walks are clamped at the repo root (browser URL normalization for a
  site served from the root — the canonical way these sims run).
- `warn:` — anchor (`#id`) on a local file with no matching `id`/`name`.
  Never a hard failure (p5/CDN targets may legitimately have no id).
- `external:` — external URL unverified (timeout, network down, or
  WAF-blocked 403/429). Not a failure.

## What to check manually after the script

1. Markdown links the regex can't parse (angle-bracket or bare URLs).
   Grep for `](` near `http`, and bare `https://` URLs in prose.
2. Case-sensitivity: the script matches case-sensitively (macOS default FS
   is case-insensitive but Linux/CI is not). Verify flagged refs aren't
   case-only mismatches that would break a case-sensitive deploy.
3. Script `src` and `link` `href` refs in each sim's HTML: confirm they
   resolve both relative to the HTML file AND from the repo root (some
   sims overshoot with `../../../shared/` by design — clamped correctly).
4. README/AGENTS.md relative links to docs, instructions, templates,
   the curriculum spec (`SP015-curriculum-spec.md`).

## Report format

```
missing:  <file>:<line> -> <target> (resolved path)
broken:   <file>:<line> -> <external-url>
warn:     <file>:<line> -> <target> (anchor not found)
```
Plus summary counts and a verdict. Exit code 1 from the script means hard
failures exist; 0 means the mechanical checks are clean.
