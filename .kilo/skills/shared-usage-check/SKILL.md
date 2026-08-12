---
name: shared-usage-check
description: Check for duplicated local helpers, inline color literals, and shared-component misuse across the sims. Use when asked to verify shared-util usage, find duplicated code to fold into shared/, or enforce PALETTE/const conventions.
---

# Shared Usage Check

Verifies that sims reuse `shared/sim-utils.js` / `shared/sim-style.css`
instead of re-implementing helpers locally, and that conventions from
`instructions/coding.md` and `docs/architecture.md` §6 hold. Run the script
first, then the manual scans. Report in chat as a checklist: violations
(hard), warnings (verify), and fold-suggestions.

## 1. Automated scan

```sh
node .kilo/scripts/check-shared-usage.mjs
```

- HARD (exit 1): hex color literals in `*.js` (must use `PALETTE.*`),
  `var` declarations (const/let only).
- WARN: numeric `rgb()`/`rgba()` calls (may be `PALETTE.*RGB` spreads —
  verify), HTML-entity math (`&omega;`, `<sub>`, `&radic;`, ...) in HTML.
  Warnings never fail; the agent interprets them.

## 2. Local re-implementations of shared helpers

For each sim folder, grep for hand-rolled versions of helpers that already
exist in `shared/sim-utils.js`:

- Arrow drawing: local `drawArrow*` / polygon head-building code instead of
  `drawArrowCtx` / `VectorArrow`.
- Dashed lines: `setLineDash` + `line` sweeps instead of `drawDashedGuide` /
  `drawDashedCurve`.
- Trail dots: fading-dot loops instead of `drawTrailDots`.
- Number formatting: `(v >= 0 ? '+' : '') + ...` instead of `signedFixed`.
- Readout diffing: `if (last.x !== x)` per field instead of `updateReadout`.
- Math rendering: `katex.render(...)` calls instead of shared `renderMath`.

Any of these is a violation — shared helpers are mandatory once they exist.

## 3. Convention violations

- `PHYSICS`/`LIMITS`/`DISPLAY` (or sim-specific variants) present and the
  single source of truth; HTML `min`/`max`/`value` cosmetic only.
- Topic CSS redeclaring shared rules (`.button-grid`, `.control-row`,
  `.readouts`, `.theory-strip`, `.app-shell`) instead of only adding
  sim-specific rules.
- Colors: new hex/rgb not present in `PALETTE` / `:root`.
- One class per concern; renderer functions are free functions, not static
  class methods.

## 4. Duplication to fold into shared/ (docs/architecture.md §6)

Check the recorded duplication list — it is the list of known, deferred
folds. Also scan for NEW second uses:

- `.system-switch.compact` used as a discrete stepper (7.5 `.amp-step-group`,
  7.6 `.harmonic-group`) — a third use confirms the fold to a generic
  `.stepper-group` modifier in `shared/sim-style.css`.
- Node/antinode extrema markers with play-state-gated labels (7.6's
  `drawExtremaMarkers`) — only one sim so far; a second standing-wave-adjacent
  sim needing marker+label behavior confirms the fold.
- Any helper logic now present in 2+ sims (identical or near-identical
  implementation) that is not in `shared/`.

A fold-suggestion is not a violation — flag it as a recommendation with the
2+ call sites as evidence.

## Output

```
violations:  <file>:<line> — description
warnings:    <file>:<line> — description
fold-suggestions: <2+ call sites> — proposed shared helper
```
End with a verdict: clean, or items to fix/reconcile.
