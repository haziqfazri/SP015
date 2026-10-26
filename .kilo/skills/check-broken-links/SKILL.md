---
name: check-broken-links
description: Validate local links, JavaScript catalogue destinations, HTML assets and redirects, CSS URLs, duplicate IDs, and optional external URLs without dependencies.
---

# Check Broken Links and Assets

Run from the repository root. A positional path narrows scanning; references
still resolve against the repository and each owning page/stylesheet.

```sh
node .kilo/scripts/check-links.mjs --skip-external
node .kilo/scripts/check-links.mjs --skip-external --base-path=/SP015/
node .kilo/scripts/check-links.mjs --html-only --skip-external
node .kilo/scripts/check-links.mjs simulations --skip-external
node --test .kilo/scripts/check-links.test.mjs
```

## Coverage and resolution

- Parse actual literal `SIMULATIONS` arrays without executing the application.
  Strings/objects/arrays, comments, escapes, and trailing commas are supported;
  computed metadata fails explicitly. Do not inspect `${sim.href}` as a file.
- Check HTML href/src/srcset/poster, inline styles, style blocks, base URLs,
  meta-refresh targets, CSS url()/quoted imports, and Markdown links.
- Resolve assets from their owner, decode URL entities/escapes, ignore query
  strings when checking files, and require exact-case filenames.
- Check directory index pages for HTML navigation; Markdown may link directly
  to existing directories. Do not silently clamp excessive `../` traversal.
- `--base-path=/SP015/` models repository-prefixed hosting and catches paths
  escaping that prefix. Relative references remain portable. Templates are
  validated at `simulations/sp015/__chapter__/__topic__/`, their prepared
  destination depth, with sibling template assets mapped back to templates/.
- Static duplicate HTML IDs are hard failures. Fragment warnings remain advisory
  because dynamically generated IDs and GitHub source-line anchors need review.
- `.git`, node_modules, ignored scratch work, local generic .codex skill data,
  and test modules are excluded. Historical Markdown is retained and checked.

## Semester catalogue gate

After metadata conversion, add `--require-semesters`. It requires explicit
`semester: 'sp015' | 'sp025'`, destinations under the matching semester,
consistent names within semester+chapter groups, unique qualified explicit IDs,
and unique launch destinations. Only completed records expose launch links.
The current SP015-only catalogue is valid without this future gate.

The validator cannot prove runtime grouping, unique generated DOM/SVG IDs,
keyboard tab behavior, or per-semester state retention. Follow the active
migration plan's browser acceptance scenarios. Thermodynamics Workbench must
remain unpublished until its existing release criteria pass.

## Results

- `missing`, `invalid`, `broken`: hard failures, exit 1.
- `warn`: fragment needs review; does not fail.
- `external`: network/permission outcome unverified; does not fail.
- Exit 2: invalid invocation or checker error. Missing scan scopes fail loudly.

Without `--skip-external`, HTTP requests run with bounded concurrency/timeouts;
404/410 and server errors fail, while blocked/time-out requests are unverified.
Static parsing is not a full browser parser: unusual markup, CSS escape forms,
reference-style Markdown links, and runtime-computed URLs need manual review.
Curriculum source: `Curriculum Specifications (CS) Physics SP015.pdf`; SP025's
specification is absent from the current checkout.
