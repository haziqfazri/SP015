---
name: frontend-design
description: Review a simulation's HTML/CSS for conformance to the repo's visual system (layout shell, palette, fonts, spacing, button/slider patterns, KaTeX). Use when asked to check a sim's design, styling, UI conformance, or visual consistency with the other sims.
---

# Frontend Design (Conformance Review)

Audits an existing sim's HTML/CSS against the repo's visual system:
`instructions/coding.md` §4 and `shared/sim-style.css` (the canonical
palette/fonts/layout). This is a REVIEW skill — it verifies conformance; it
does not advise on design choices for new sims. Report in chat as a
pass/fail checklist with `file:line` evidence. Subjective calls get a
PASS/FAIL recommendation but the human confirms them.

## 1. Shell structure

- Fixed shell: `.app-shell > .lab-frame > .topbar, .system-bar?, .sim-grid, .theory-strip`.
- `.sim-grid` is two columns: `.stage` (left) and `.controls` (right).
  Single-column full-width stage only for a dedicated mode (e.g. Reference
  Circle's `.stacked-layout`).
- `.canvas-shell` default height `350px`; documented overrides only —
  `90px` oscillator strip, `190px` graph-quad cells, `150px` interference
  panels. Never an arbitrary new height without a reason in a comment.
- Multi-canvas sims use named holders (`#canvas-holder-yx`, `#canvas-holder-yt`)
  sized via topic CSS — never more than one canvas on the shared
  `#canvas-holder` id.

## 2. Controls

- Playback is `.button-grid`: Play/Pause (`.primary`), Reset, Step; Step
  spans two columns (`.col-span-2`) when there are 3 buttons.
- Mode/system switches use `.system-switch` with `.system-option` buttons;
  `is-active` class and `aria-pressed` are kept in sync on every toggle.
- Sliders are paired with a live-value `<output>`/`<span>` in
  `.control-meta`, updated on `input`, formatted with fixed decimals + units
  (`${v.toFixed(2)} m`).
- Slider `min`/`max`/`step`/`value` are set from `LIMITS` in JS at
  construction — HTML attributes are fallback only. Flag any sim whose HTML
  hardcodes different ranges than `LIMITS`.

## 3. Palette, fonts, spacing

- Run `node .kilo/scripts/check-shared-usage.mjs`; confirm no inline hex or
  raw `rgb()` literals in canvas code — colors come from `PALETTE`.
- CSS custom properties come from `shared/sim-style.css :root`; the topic
  CSS never redeclares them. Allowed set: `--ink #102126`, `--paper #eff3ed`,
  `--panel #f8faf6`, `--line #c9d2c7`, `--acid #dff34b`, `--orange #ff6b35`,
  `--teal #35b9ad`, `--muted #617075` (+ `--accent #bf5a00`, `--path #b4beb2`
  additions). No new hex colors when one of these fits.
- Fonts: DM Sans (display/labels), Space Mono (mono/readouts/formulas) via
  `--display`/`--mono` CSS vars, loaded from Google Fonts.
- Spacing rhythm: `.control-row` margin-bottom `21px`, `.stage`/`.controls`
  padding `28px`, `.button-grid` gap `9px`. Flag new ad hoc values.

## 4. KaTeX math notation

- Every sim links KaTeX 0.18.2 in `<head>` (CSS + JS) with the canonical
  `<link>`/`<script>` tags (SRI integrity attributes) copied verbatim from
  `shared/sim-style.css`'s KaTeX comment block.
- Theory-strip equations: `<span class="formula" data-latex="...">…</span>`
  rendered in displayMode.
- Inline notation: `<span class="katex-inline" data-latex="...">fallback</span>`.
- No HTML entities (`&omega;`, `&lambda;`, `&radic;`, `&frac12;`) or
  `<sub>`/`<sup>` for math. Numeric live readouts are plain DOM text, never
  wrapped in KaTeX.
- UIManager runs one `_renderStaticMath()` pass at construction; targeted
  `renderMath()` only when TeX changes at runtime (mode swaps, resolved ±).

## 5. Shared stylesheet discipline

- `shared/sim-style.css` is loaded unmodified (no local copy, no
  overrides).
- Topic CSS loads AFTER it and only adds rules unique to that sim's layout.
- Flag any topic CSS rule that re-implements a shared rule (check `.app-shell`,
  `.button-grid`, `.control-row`, `.readouts`, `.theory-strip` selectors).

## Output

Per item: PASS/FAIL + `file:line` + the specific rule violated. End with a
summary listing hard violations (must fix) vs. warnings (preferences) and a
conformance verdict.
