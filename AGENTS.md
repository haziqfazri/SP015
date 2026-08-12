# AGENTS.md — SP015 Physics Simulation Project

## What this repo is

A library of interactive [p5.js](https://p5js.org/) simulations for teaching **Physics 1 (SP015)** at pre-university level (SP025 to follow). Each sim is a standalone teaching tool: sliders map to real physical quantities, readouts use correct SI units and notation, and theory text matches cited learning outcomes (LOs), e.g. `SP015 7.1(c.iii)`.

Two things matter equally: **pedagogical correctness** and **reusability**. The repo is maintained solo with heavy AI coding assistant use — predictable structure matters more than cleverness.

The source of truth for architecture and data flow is `docs/architecture.md`. Read it before touching any files. Supporting conventions live in `instructions/`.

---

## Running a simulation

Static pages — no build step, no bundler. Open a sim's HTML file directly in a browser, or serve the repo root with any static file server. p5.js is loaded from CDN.

---

## Folder layout

```
SP015/
  animations/                   <- sims, grouped by chapter
    02-kinematics-of-linear-motion/
      2.3-projectile-motion/    <- Level 3 (full split)
    05-circular-motion/         <- Level 2 (sim + sketch)
    07-simple-harmonic-motion/
      7.1-kinematics-of-shm/    <- Level 3 (full split)
      7.2-graphs-shm/           <- Level 3 (full split), instance mode, 5 canvases
      7.4-progressive-wave-shm/ <- Level 3, global + Graphics buffer
      7.5-superposition-shm/    <- Level 3, instance mode, 3+ canvases
      7.6-application-of-standing-waves/  <- Level 3
      7.7-doppler-effect/       <- Level 3, uses KaTeX (all sims now do)
  docs/
    architecture.md             <- authoritative architecture/patterns
  instructions/
    system.md                   <- project goals, educational objectives
    coding.md                   <- naming, JS, UI conventions
    physics.md                  <- units, coordinates, simplifications
    checklist.md                <- pre-release QA checklist
  shared/
    sim-style.css               <- shared visual language
    sim-utils.js                 <- shared helpers (see below)
  templates/                     <- starting point for new sims
```

Each sim is **self-contained inside its topic folder** with its own HTML, CSS, and JS. Nothing sim-specific belongs in `shared/`. A helper moves to `shared/` when genuinely reused by 2+ sims and the abstraction is clear.

---

## Architecture levels — choose the simplest that fits

Do **not** force the full split on a small sim. Start simple; add separation only when complexity justifies it.

| Level | Files | When |
|-------|-------|------|
| **Level 1 — Simple** | `index.html`, `<sim>-sim.js`, `<sim>-sketch.js`, `<sim>.css` | One physical model, minimal UI, limited state |
| **Level 2 — Medium** | + `<sim>-physics.js`, `<sim>-controller.js` | Physics/app separation improves clarity |
| **Level 3 — Complex** | + `<sim>-renderer.js`, `<sim>-ui.js`/`<sim>-ui-manager.js` | Multiple canvases, many controls, several physics models |

**Decision rule:** 1) Can it stay clear with few files? → Level 1. 2) Would separating physics from orchestration improve clarity? → Level 2. 3) Are UI, rendering, controller, physics all large enough to justify separate modules? → Level 3. If none applies, don't add another abstraction.

Canvas mode is an **independent** choice from file structure, based solely on "does the sim need multiple canvases kept in sync?"

---

## Canvas modes

| Mode | When | Examples |
|------|------|----------|
| **Global** — `setup()`/`draw()` bare, `createCanvas(...)` | Single canvas | 2.3, 05, 7.1, 7.4 (global + one `createGraphics` buffer), 7.6, 7.7 |
| **Instance** — `new p5(sketch)` per canvas, one shared ticker via `requestAnimationFrame` | 3+ independent canvases in lockstep | 7.2 (4–5 graphs), 7.5 (3 interference panels) |

Do not reach for instance mode just because a sim is "advanced." 7.6 has three physics classes and still uses global mode correctly — it only draws one canvas at a time.

---

## Simulation lifecycle (build order)

1. **Pick the LO.** Cite it in file headers, e.g. `SP015 7.5(a)`.
2. **Write the constants first:** `PHYSICS`, `LIMITS`, `DISPLAY` — these are the single source of truth for slider ranges/scaling. HTML `min`/`max`/`value` attributes are cosmetic fallbacks only; set them from `LIMITS` in JS.
3. **Write physics class(es).** Pure state + derivation, no DOM/canvas. Derived quantities are getters (e.g. `wavelength = v/f`), never cached. One class per physical system — use a flag for boundary-condition variants rather than duplicating a whole class.
4. **Write UIManager.** Cache DOM elements once, bind events, expose a `callbacks` object the controller fills in. Never calls physics or renderer directly. Uses shared `updateReadout(store, key, el, value)` for diffed DOM writes.
5. **Write renderer.** Free functions taking an explicit p5 context (`window` in global mode, `p5.Graphics`/instance in instance mode) plus already-computed state. No physics beyond unit→pixel mapping, no held state.
6. **Write SimulationController.** Owns physics + UI, wires callbacks, drives play/pause/step/reset, owns playback state and history/trail buffers. No drawing, no physics derivations.
7. **Write sketch entry point.** `setup()`/`draw()`/`windowResized()` for global, `DOMContentLoaded` bootstrap for instance.
8. **Wire theory strip / readouts** to LO text and correct units. Cross-check against `SP015-curriculum-spec.md`.
9. **Check for duplication.** Anything that's now the second copy of a helper (arrows, dashed guides, readout diffing, button patterns) must move to `shared/`.

---

## Data flow

```text
User → UIManager → SimulationController → Physics classes → SimulationController → Renderer → Canvas
```

- **UIManager** is the sole DOM accessor. Caches elements in `this.el`/`this.els`, binds listeners, calls registered callbacks. Writes formatted values to readouts via `updateReadout`.
- **SimulationController** is the only class that talks to both UIManager and physics. Decides *when* to step/reset/redraw, *what* to pass to the renderer.
- **Physics classes** expose `integrate()`/`step()`/`advance()`, `energy()`/`period()`, and derived getters. No DOM, no canvas.
- **Renderer functions** are free functions — no state, no physics beyond unit→pixel conversion.

### Readout performance rule

Call `ui.updateReadouts(...)` from the callback that actually changes the values. If readouts depend only on slider params, call it from `on*Change` — **never** from the per-frame `update(dt)`. Only call it per-frame when readouts genuinely depend on `t`/`dt`/integrated state (e.g. live "t = 2.34 s" display).

---

## Shared components

`shared/sim-utils.js` provides (all ctx-explicit — pass `window` in global mode or a `p5.Graphics`/instance ref):

- `PALETTE` — canonical JS color constants (hex + array forms) mirroring `shared/sim-style.css :root`. No inline hex/rgb literals in sim code.
- `drawArrowCtx(ctx, x0, y0, x1, y1, colorVal, weight, maxHeadSize)` — arrow drawing
- `normalizedArrowLength(magnitude, min, max, minLen, maxLen)` — scale vectors on screen
- `VectorArrow` — arrows with optional labels at the midpoint
- `signedFixed(value, decimals)` — "+0.35" / "-1.20" formatting
- `drawDashedGuide(p5ctx, x0, y0, x1, y1, colorVal, weight, dash)` — dashed reference lines
- `drawDashedCurve(p5ctx, pointFn, count, dash)` — dashed swept curves (e.g. reference/envelope guides)
- `drawTrailDots(p5ctx, trail, projector, r, g, b, maxAlpha)` — fading motion trail
- `drawLabel(p5ctx, text, x, y, { fill, size, weight, font, align })` — styled text label
- `updateReadout(store, key, el, formattedValue)` — diffed DOM writes
- `renderMath(el, latex, displayMode)` — KaTeX rendering for `data-latex` elements
- `AudioTone` — continuously-updatable tone (used by 7.7 Doppler)
- `PlaybackState({ buttonEl, playLabel, pauseLabel, onPlay, onPause })` — play/pause state machine

`shared/sim-style.css` provides the common layout shell: `.app-shell`, `.topbar`, `.system-bar`, `.sim-grid`, `.stage`, `.controls`, `.button-grid`, `.control-row`, `.readouts`, `.theory-strip`, responsive breakpoints. Topic CSS loads **after** this and only adds sim-specific rules — never redeclares shared rules.

---

## Coding conventions

### Naming

- Folders: `animations/<chapter-number>-<chapter-name>/<topic-number>-<short-name>/`
- Files: `<topic-prefix>-<role>.js` (e.g. `wave-physics.js`, `wave-ui-manager.js`, `wave-controller.js`, `wave-renderer.js`, `wave-sketch.js`)
- HTML: `index.html` or `<topic>.html`
- CSS: `<topic>.css`
- Classes: `UIManager`, `SimulationController`. Physics classes named for what they model (`SpringOscillator`, `Projectile`, `WaveState`, `PulseWave`, `ProgressiveWave`, `AirColumn`, etc.)

### JS conventions

- `class` for stateful objects. `const`/`let`, never `var`.
- Arrow functions for callbacks, `methodName() {}` for class methods.
- Getters for derived quantities (not cached fields).
- Destructuring: `integrate(dt, { m, k })`.
- Template literals for formatted/readout strings.
- UIManager registration: `Object.assign(this.callbacks, callbacksMap)`.
- One class per concern per file; renderer functions are plain top-level `function`.

### Constants

- `PHYSICS`, `LIMITS`, `DISPLAY` (and sim-specific variants like `INTERFERENCE_LIMITS`) — single source of truth. Physical constants in caps near file top (`G = 9.81`).

### Comments

- Every non-obvious equation gets an inline comment citing the LO and the equation, e.g. `// λ = v/f — derived, not stored`.
- Explain sign conventions and simplifications. Do **not** restate obvious code or standard JS syntax.

### Error handling

- Abstract base classes throw for unimplemented methods: `throw new Error('...')`.
- No silent failure — missing DOM or bad param should error loudly.

### Performance

- `dt` is always clamped (typically `Math.min(deltaTime/1000, 0.03)`).
- Readout DOM writes are diffed via `updateReadout`, never unconditional per frame.
- Rolling buffers capped and trimmed from the front (`TRAIL_MAX`, `windowDuration`).
- `noLoop()`/`redraw()` for global mode; shared `requestAnimationFrame` ticker for instance mode.

---

## UI standards

### Colors

`--ink #102126`, `--paper #eff3ed`, `--panel #f8faf6`, `--line #c9d2c7`, `--acid #dff34b`, `--orange #ff6b35` (primary curve/accent), `--teal #35b9ad` (secondary/reference), `--muted #617075`. Never introduce a new hex color when one of these fits.

### Fonts

`DM Sans` (display/labels), `Space Mono` (mono/readouts/formulas), declared as `--display`/`--mono` CSS vars.

### Math notation

All sims use KaTeX (repo-wide since the 7.7 pilot was promoted to `shared/`): link KaTeX 0.18.2 in `<head>`, render `data-latex` elements via the shared `renderMath()` (`sim-utils.js`), `.formula` = displayMode (theory-strip equations), `.katex-inline` = inline (label symbols). No HTML entities (`&omega;`, `<sub>`, `&radic;`...) for math. Numeric live readouts stay plain DOM text. UIManager does one `_renderStaticMath()` pass at construction; re-render only on runtime TeX changes (mode swaps, resolved ± signs).

### Layout
- Shell: `.app-shell > .lab-frame > .topbar, .system-bar?, .sim-grid, .theory-strip`
- `.sim-grid`: two-column (`.stage` left, `.controls` right)
- `.canvas-shell` default height `350px`
- Multi-canvas: named holders (`#canvas-holder-yx`, `#canvas-holder-yt`), sized via topic CSS

### Controls

- Playback: `.button-grid` — Play/Pause (`.primary`), Reset, Step (`.col-span-2` when 3 buttons)
- Mode switches: `.system-switch` with `.system-option`, `is-active` + `aria-pressed` synced
- Sliders: paired with `<output>`/`<span>` in `.control-meta`, updated on `input`, `min`/`max`/`step` set from `LIMITS` in JS

---

## Physics conventions

### Units

SI throughout: m, s, kg, rad, Hz, N, J. Angles stored in radians, converted to degrees only at the UI display layer. Readouts always show units in the formatted string.

### Coordinates

- Screen y grows **downward**; physics y grows **upward** — every renderer uses `centerY - value * scale`.
- Angles measured **counterclockwise from +x axis = 0**.
- Wave sign: `(ωt − kx)` for +x travel, `(ωt + kx)` for −x travel. Stored as `direction: +1 | -1`.
- Vectors: normalized via `normalizedArrowLength`, not drawn at literal pixel-per-unit scale.
- Independent vs. derived: never both stored. e.g. `v` and `f` stored; `λ = v/f` is a getter.

### Integration

- Semi-implicit Euler for spring/pendulum. Analytic closed form (e.g. `x = A sin(ωt)`) when possible.
- Pendulum: exact `sin(θ)`, not small-angle. Ideal period formula labeled as exact only for small angles.
- No damping modeled unless explicitly noted.
- `dt` clamped to `0.03`–`0.1` s.

---

## Pre-release checklist (abbreviated)

When calling a sim done, verify:

- **Functionality:** Play/Pause/Reset/Step work. Sliders update live. Mode toggles sync `aria-pressed`. Resize works. Sim starts paused, never blank.
- **Physics:** Equations match `SP015-curriculum-spec.md`. Every equation cited with LO. Derived quantities are getters. `dt` is clamped. Simplifications stated.
- **UI:** Uses `shared/sim-style.css` unmodified. Colors/fonts/spacing match palette. Readouts show correct units. Theory strip matches LO.
- **Code:** Architecture no more complex than needed. File responsibilities respected (no DOM in physics, no physics in renderer). Constants are single source of truth. No duplicated helper from `shared/sim-utils.js`. Rolling buffers capped.
- **Performance:** Readout writes diffed. Per-frame `updateReadouts` only for t-dependent values. Multi-canvas sims share one clock. No console errors.
- **Final:** `docs/architecture.md` updated if new pattern introduced. Tested at desktop and `800px`/`460px` breakpoints.

---

## AI editing rules

1. **Read `docs/architecture.md` first.** It is the source of truth.
2. **Modify only affected files.** Don't touch HTML when only physics changed.
3. **Preserve existing public APIs** (`integrate()`, `energy()`, `period()`, `reset()`, UIManager `callbacks` shape).
4. **Reuse shared components** — no local re-implementation of arrows, dashed guides, trail dots, or readout diffing.
5. **Smallest diff that works.** Don't restyle, rename, or restructure code that wasn't asked about.
6. **Avoid over-explaining comments.** Explain physics and assumptions, not obvious code.
7. **Follow the lifecycle** above. Use the simplest file structure.
8. **Fold repeated helpers into `shared/`** when a second sim needs them and the abstraction is clear.
