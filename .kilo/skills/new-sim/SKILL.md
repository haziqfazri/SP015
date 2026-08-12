---
name: new-sim
description: Build or scaffold a new physics simulation for this repo (SP015/SP025 p5.js). Use when the task is creating a new sim from scratch, copying the templates, or deciding a sim's file structure and canvas mode.
---

# New Simulation

Guides building a new SP015/SP025 sim in this repo. Source of truth:
`docs/architecture.md` (read it before touching anything) plus
`instructions/{system,coding,physics}.md` and `templates/README.md`.

## Preconditions

1. Read `docs/architecture.md` first — it is authoritative.
2. Pick the learning outcome. Cite `SP015 7.x(y.z)` (or `SP025`) in
   file-header comments, e.g. `SP015 7.5(a)`.
3. Decide architecture level (architecture.md §3) — the SIMPLEST that fits:
   - **Level 1:** `index.html`, `<sim>-sim.js`, `<sim>-sketch.js`, `<sim>.css`
   - **Level 2:** + `<sim>-physics.js`, `<sim>-controller.js`
   - **Level 3:** + `<sim>-renderer.js`, `<sim>-ui.js`/`-ui-manager.js`
   Decision rule: clear with few files → 1; separating physics from
   orchestration materially improves clarity → 2; UI/rendering/controller/
   physics all large → 3. Never add an abstraction to match a template.
4. Decide canvas mode (architecture.md §5) — INDEPENDENT of file split:
   - **Global** (`setup()`/`draw()`, `createCanvas`): single canvas.
   - **Instance** (`new p5(sketch)` per canvas, one shared
     `requestAnimationFrame` ticker): only for 3+ canvases needing lockstep.
   A sim with multiple physics classes but one canvas stays global (7.6).

## Build order (follow in this order)

1. **Constants first.** Write `PHYSICS` / `LIMITS` / `DISPLAY` blocks — the
   single source of truth for slider ranges/scaling. HTML `min`/`max`/
   `value` are cosmetic fallbacks only; set them from `LIMITS` in JS.
2. **Physics class(es).** Pure state + derivation. No DOM, no p5. Derived
   quantities are getters (e.g. `wavelength = v/f`), never cached fields.
   One class per physical system; use a flag for boundary-condition variants
   (`AirColumn(length, harmonic, closedEnd)` is the reference, 7.6).
3. **UIManager.** Sole DOM accessor. Cache elements once in
   `this.el`/`this.els`, bind events, expose `callbacks` object. Never calls
   physics or renderer. Runs one `_renderStaticMath()` pass over
   `[data-latex]` elements at construction. Writes readouts via shared
   `updateReadout(store, key, el, value)`.
4. **Renderer.** Free functions taking explicit ctx + already-computed state.
   No physics beyond unit→pixel mapping (physics y-up ↔ screen y-down:
   `centerY - value * scale`). No held state. Colors from `PALETTE` only.
5. **SimulationController.** Owns physics + UI, wires UIManager callbacks to
   physics, drives play/pause/step/reset, owns playback state and history/
   trail buffers. No drawing, no physics derivations.
6. **Sketch entry point.** Global: `setup()`/`draw()`/`windowResized()`.
   Instance: `DOMContentLoaded` bootstrap. Sim must start paused but never
   blank (`noLoop(); redraw();` or equivalent first-frame render).
7. **Wire theory strip + readouts** to the LO text and correct units,
   cross-checked against the curriculum spec (`SP015-curriculum-spec.md`) at
   the repo root.
8. **Check for duplication.** Second copy of a helper (arrows, dashed
   guides, trail dots, readout diffing) → fold into `shared/` — never
   re-implement locally.

## Setup from templates

Start from `templates/`. Copy ONLY the files the chosen level needs:

- Find-and-replace `Template` → `YourSimName` (classes), `template-` →
  `your-sim-name-` (filenames) in every copied file; rename files to match.
- Folder: `animations/<chapter-number>-<chapter-name>/<topic-number>-<short-name>/`.
- File naming: `<topic-prefix>-<role>.js`; HTML `index.html` or
  `<topic>.html`; CSS `<topic>.css`.
- Script load order in HTML: `shared/sim-utils.js` → physics → renderer →
  controller → ui-manager → sketch.
- KaTeX: copy the canonical `<link>`/`<script>` tags (version + SRI) from
  `shared/sim-style.css`'s KaTeX comment block verbatim — never retype them.

## Hard conventions (checklist)

- SI units throughout; angles in radians internally, degrees only at the UI
  display layer; readouts include units in the formatted string.
- `const`/`let` only (no `var`); `class` for stateful objects; arrow
  functions for callbacks; template literals for readouts; destructuring for
  param objects (`integrate(dt, { m, k })`).
- `dt` clamped in the update loop: `Math.min(deltaTime / 1000, 0.03)`.
- Rolling buffers capped and trimmed from the front.
- Comments explain physics/assumptions and cite the LO per non-obvious
  equation; never restate obvious code.
- No silent failure — missing DOM or bad param errors loudly.

## Self-review gate (before calling it done)

1. `node .kilo/scripts/check-shared-usage.mjs` — no hex literals, no `var`.
2. `node .kilo/scripts/check-dt.mjs` — dt clamps present, single clock.
3. Run the `simulation-qa` skill for the full pre-release checklist.
4. Update `docs/architecture.md` only if a genuinely new pattern was
   introduced; add the new sim to `instructions/physics.md` §4's LO table.
