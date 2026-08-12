---
name: simulation-qa
description: Review a simulation against the pre-release checklist before calling it done. Use when asked to QA, validate, verify, or sign off on a sim, or run the repo's done-checklist.
---

# Simulation QA

Run this before any sim is called done. Mirrors `instructions/checklist.md`
one-to-one — that file is canonical; if this skill and the checklist ever
disagree, fix the checklist.

Every item needs evidence: a `file:line` ref, a console trace, or an observed
interaction. Mark an item pass only when you have that evidence. Report as an
in-chat checklist grouped by the 6 categories below, ending with a
GO/NO-GO verdict. Do not write anything to disk.

## 1. Functionality

- Play/Pause/Reset/Step all work and update button labels correctly
  (`PlaybackState` or equivalent — label must flip on every toggle).
- Sliders update state live on `input` and their `<output>` matches what is
  actually applied to the physics (compare against the physics state the
  readout derives from, not the slider's own value attribute).
- Mode/system toggles swap stage, controls, theory text, and sync
  `is-active` + `aria-pressed`.
- Resize (`windowResized`) keeps canvas(es) filling their holder(s) without
  distortion.
- Sim starts paused on a sensible first frame (`noLoop(); redraw();` or a
  first-frame render) — never blank on load.

## 2. Physics accuracy

- Equations match the SP015/SP025 spec — check against
  `SP015-curriculum-spec.md` at the repo root, not memory. Units, symbols,
  sign conventions all correct.
- Every non-obvious equation has a comment citing the LO
  (`SP015 7.1(c.iii)`).
- Independent vs. derived quantities correctly separated: derived values are
  getters (`wavelength = v/f`), never a second stored/cacheable field.
- `dt` clamped in the update loop. Run `node .kilo/scripts/check-dt.mjs`
  and verify its findings against the code.
- Simplifications (small-angle, undamped, kinematic-only, etc.) are stated
  in a comment or on-screen note, never silently assumed.

## 3. UI consistency

- Uses `shared/sim-style.css` unmodified; topic CSS only adds sim-specific
  rules and never redeclares shared ones.
- Colors reference `PALETTE` from `shared/sim-utils.js` — run
  `node .kilo/scripts/check-shared-usage.mjs`; no inline hex or raw
  `rgb()` literals in canvas code.
- Fonts/colors/spacing match the palette and rhythm in `instructions/coding.md`
  §4 — no new ad hoc hex colors or spacing values.
- Readouts show correct units and consistent decimal formatting
  (`signedFixed` for signed quantities).
- Math uses KaTeX (`data-latex` + shared `renderMath`), not HTML entities or
  `<sub>`/`<sup>`; live numeric readouts stay plain DOM text.
- Button/slider placement matches `.button-grid` / `.control-row` layout.
- Theory strip matches the LO wording and cites correct formulas.

## 4. Code cleanliness

- Architecture no more complex than the sim requires (Levels 1–3; see
  `docs/architecture.md` §3) — no file/class/abstraction added just to match
  a template.
- Comments explain physics, assumptions, or non-obvious reasoning; none
  restate obvious code.
- File responsibilities respected: physics has no DOM/canvas access;
  UIManager has no physics math; renderer has no held state or physics beyond
  unit→pixel mapping; controller has no drawing.
- `PHYSICS`/`LIMITS`/`DISPLAY` constants are the single source of truth;
  HTML `min`/`max`/`value` are cosmetic only.
- No duplicated helper that already exists in `shared/sim-utils.js` (arrows,
  dashed guides, trail dots, `signedFixed`, `updateReadout`, `renderMath`).
- Any logic now found in 2+ sims is folded into `shared/`.
- Class/method names follow convention (`UIManager`,
  `SimulationController`, `integrate()`/`energy()`/`period()`/`reset()`).
- Rolling buffers (trail/history) are capped and trimmed, never unbounded.

## 5. Performance

- Readout DOM writes are diffed via `updateReadout`, not unconditional per
  frame.
- `update(dt)` only calls `ui.updateReadouts(...)` if the readouts depend on
  `t`/`dt`/integrated state. Readouts driven purely by slider params are
  updated from the param's `on*Change` callback — never the per-frame loop
  (`docs/architecture.md` §5: 7.5 is the correct t-dependent case; 7.6 had
  the bug, since fixed).
- Multi-canvas sims share one clock/ticker — no independent free-running
  loops per canvas.
- No console errors/warnings on load, slider drag, or mode switch.

## 6. Final pass

- `docs/architecture.md` updated if this sim introduced a new pattern,
  shared module, or file-split convention.
- Tested at desktop width and the `800px` / `460px` responsive breakpoints.

## Verdict

Report every item PASS/FAIL with evidence. Any FAIL under Physics accuracy
or Performance is a hard NO-GO. Otherwise state GO/NO-GO with the list of
open items.
