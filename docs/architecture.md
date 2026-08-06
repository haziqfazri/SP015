# Architecture

Reference doc for `haziqfazri/Animation-Projects`. Read this before adding or
modifying a simulation — it describes the patterns actually in use across the
repo, not an aspirational spec.

## 1. Project philosophy

This repo is a growing library of interactive p5.js simulations for teaching
**Physics 1 (SP015)** at pre-university level, with **SP025** to follow later.
Each simulation is a standalone teaching tool built against the official
curriculum specification (see `Curriculum_Specifications_CS_Physics_SP015.pdf`
/ `SP025.pdf`) — sliders map to real physical quantities, readouts use correct
units and notation, and theory text matches the learning outcomes (LOs) cited
in code comments (e.g. "SP015 7.1(c.iii)").

Two things matter equally: **pedagogical correctness** (equations, units,
sign conventions, small-angle caveats, etc., usually justified in a comment)
and **reusability** (new sims should cost less to build than the last one).
The repo is maintained solo, with heavy use of AI coding assistants — so
predictable structure matters more than any single sim's cleverness.

## 2. Folder layout & responsibilities

```
Animation-Projects/
  docs/
    architecture.md          <- this file
  instructions/
    system.md                 project goals, educational objectives, AI development notes
    coding.md                  naming/file conventions, ES6 style, UI standards
    physics.md                 units, coordinate/vector conventions, LO mapping
    checklist.md                pre-"done" QA checklist
  shared/
    sim-style.css             shared visual language (topbar, controls, readouts, buttons, theory strip)
    sim-utils.js               shared p5 drawing/formatting helpers (global-mode functions)
  circular-motion/
  simple-harmonic-motion/      ("Oscillation Laboratory": spring–mass, pendulum, reference circle)
  shm-graphs-analysis/         (Topic 7.2: x-t/v-t/a-t/E-x graphs)
  shm-progressive-wave/        (Topic 7.4: Properties of Waves)
  shm-superposition/           (Topic 7.5: Superposition of Waves)
  <next-topic>/
  ...
```

Each simulation is **one folder, self-contained**, named after its topic
(not "SP015-topic-7.4" — the topic number lives in a comment/kicker, not the
folder name). A folder holds its own `index.html` (or `<topic>.html`), its
own CSS, and its own JS. Nothing sim-specific lives outside its folder;
nothing shared lives inside a sim's folder — if the same helper turns up in
two sims, it belongs in `shared/`.

The `instructions/` split (`system.md` / `coding.md` / `physics.md` /
`checklist.md`) described in `repo-refactor-roadmap-condensed.md` now
exists alongside this file. Division of labor: **this file** is the
structural/data-flow reference (folder layout, lifecycle, data flow, shared
components) — **`instructions/`** is the day-to-day conventions and QA
reference (naming, ES6 style, UI standards, physics conventions, the
pre-"done" checklist). Keep new structural decisions here and new
conventions/QA items there; cross-check both when either changes.

## 3. Simulation lifecycle

Observed sequence for every sim in the repo so far:

1. **Pick the LO.** Identify the SP015/SP025 topic + learning outcome(s) the
   sim teaches (cited directly in file-header comments, e.g.
   `SP015 7.5(a)`).
2. **Decide physics state & constants.** Write the `PHYSICS` / `LIMITS` /
   `DISPLAY` (or `INTERFERENCE_LIMITS`, etc.) constant blocks first — these
   are the single source of truth for slider ranges and scaling, not the
   HTML's `min`/`max`/`value` attributes (those are a cosmetic fallback
   only, per repeated comments like *"index.html's static min/max/value
   attributes are just a cosmetic fallback for viewing the markup alone"*).
3. **Write the physics class(es).** Pure state + derivation, no DOM/canvas
   (`SHMOscillator`, `WaveState`, `Oscillator`/`SpringOscillator`/
   `PendulumOscillator`, `PulseWave`/`ProgressiveWave`, `Particle`/`Orbit`).
4. **Write UIManager.** Cache DOM elements once, bind events, expose a
   `callbacks` object the controller fills in — UIManager never calls
   physics or renderer functions directly.
5. **Write the renderer.** Free functions taking an explicit p5 context
   (`window` in global mode, a `p5.Graphics`/instance in instance mode) plus
   already-computed state. No physics math beyond unit→pixel mapping.
6. **Write SimulationController.** Owns physics + UI instances, wires
   UIManager callbacks to physics mutations, drives play/pause/step/reset,
   decides when to redraw.
7. **Write the sketch entry point** (`setup`/`draw`/`windowResized`, or a
   `DOMContentLoaded` bootstrap for instance mode).
8. **Wire the theory strip / readouts** to match the LO text and correct
   units, cross-checking against the curriculum spec PDF.
9. **Check for duplication against existing sims** — anything that's now
   the second copy of a helper (arrow drawing, dashed guides, readout
   diffing, button binding patterns, etc.) should move to `shared/`.

## 4. Data flow

```
User → UIManager → SimulationController → Physics classes → SimulationController → Renderer → Canvas
```

What each stage actually does, based on the code:

- **User** interacts with an `<input type="range">`, checkbox, or `<button>`
  in the sim's HTML.
- **UIManager** is the *sole* DOM accessor. It caches elements in `this.el`
  (or `this.els`) once at construction, binds `input`/`change`/`click`
  listeners, and calls a registered callback (`this.callbacks.onXChange(v)`
  or `this.onParamsChange()`/`this.onReset()` set directly on the instance).
  It never touches physics state or the canvas. It also owns writing
  formatted values back into readout `<output>`/`<span>` elements, usually
  through the shared `updateReadout(store, key, el, value)` diffing helper
  so unchanged text isn't rewritten every frame.
- **SimulationController** is the only class that talks to both UIManager
  and the physics classes. It has no drawing code and no physics
  derivations of its own — it decides *when* to step/reset/redraw and
  *what* to pass to the renderer. It owns playback state (`isPlaying`),
  history/trail buffers (`SignalHistory`, `yHistory`, `trail[]`), and (in
  multi-canvas sims) the p5 instance(s).
- **Physics classes** (`Oscillator` subclasses, `WaveState`,
  `SHMOscillator`, `Particle`/`Orbit`, `PulseWave`/`ProgressiveWave`, etc.)
  hold state and expose `integrate()`/`step()`/`advance()`,
  `energy()`/`period()`, and derived getters (e.g. `wavelength`,
  `angularFrequency`). No DOM access, no p5 calls, no rendering. Derived
  quantities are generally computed on demand from stored independent
  fields (e.g. `wavelength = waveSpeed / frequency`) rather than cached, so
  they can never drift out of sync with the sliders.
- **Renderer functions** are free functions (`drawSpringSystem`,
  `drawWaveformPanel`, `drawOscillator`, `drawPulseScene`, ...) that take an
  explicit context, the relevant physics object(s)/params, and canvas
  dimensions, and draw one frame. They perform no physics calculation
  beyond unit→pixel conversion, and hold no state of their own.
- **Canvas** — either p5 global mode (`circular-motion`,
  `simple-harmonic-motion`: one `setup()`/`draw()` pair, functions like
  `background()`/`stroke()` called bare) or p5 **instance mode**
  (`shm-graphs-analysis`, `shm-progressive-wave`, `shm-superposition`: each
  canvas is its own `new p5(sketch)`, useful when a sim needs multiple
  independent canvases in sync, e.g. 4–5 synced graphs or 3 stacked
  interference panels driven by one shared clock/ticker).

Two variants of the controller→physics wiring exist and both are fine:
- **Single-file combo** (`oscillation-sim.js`, `wave-physics.js` +
  `oscillation-sketch.js`): physics classes, UIManager, and renderer
  functions in one or two files, sketch/controller in another.
- **Fully split** (`shm-progressive-wave`, `shm-superposition`):
  `*-physics.js`, `*-ui.js`/`*-ui-manager.js`, `*-renderer.js`,
  `*-controller.js`, `*-sketch.js` as five separate files loaded in that
  order. Prefer this split for any new sim with more than ~1 canvas or more
  than ~150 lines of physics — it's what the two most recent, most complex
  sims (wave + superposition) converged on.

## 5. Shared components

Currently in `shared/`:
- `sim-style.css` — topbar, system-bar/mode-switch, `.sim-grid`,
  `.canvas-shell`, `.readouts`/`.readouts--dense`, `.controls`,
  `.control-row`, buttons, `.theory-strip`, responsive breakpoints.
  Topic CSS loads after this and only adds sim-specific layout (e.g.
  `shm-graphs.css`'s 2×2 `.graph-quad`, `wave-properties.css`'s stacked
  dual-canvas panels). For the specific palette (hex values), fonts,
  spacing rhythm, and button/slider placement rules this file encodes, see
  `instructions/coding.md` §4 (UI standards) — keep the two in sync if
  either changes.
- `sim-utils.js` — `drawArrowhead`, `normalizedArrowLength`, `VectorArrow`,
  `signedFixed`, `drawDashedGuide`, `drawTrailDots`, `updateReadout`. These
  assume p5 global mode (bare `push()`/`stroke()`) or take an explicit
  `p5ctx` first argument.
- `drawArrowCtx`/`VectorArrow` are now ctx-explicit and canonical, so any future 
  sim needing arrows (interference vectors, force diagrams, etc.) uses this instead 
  of writing a new one.Arrow

Duplication observed that should be reconciled next time it's touched:
- **`PHYSICS`/`LIMITS`/`DISPLAY` constant-block convention** is repeated
  by hand in every sim rather than scaffolded — fine as-is, but worth a
  template (see §6 / roadmap Phase 5) so the shape stays consistent.
- **UIManager boilerplate** (cache-elements → bind-controls →
  configure-ranges-from-LIMITS → diffed readout updates) is re-derived per
  sim. Not yet extracted because each sim's control set differs enough that
  a shared base class would mostly be overridden — revisit if a future sim
  needs materially the same controls as an existing one.
- **Play/Pause/Reset/Step button wiring** (`isPlaying` toggle +
  `loop()`/`noLoop()`/`redraw()` in global mode, or a `requestAnimationFrame`
  ticker in instance mode) follows the same shape in every sim but is
  hand-written each time. A small shared "playback controller" mixin would
  remove real duplication if a future sim needs it.
- **`signedFixed`/`updateReadout` are already shared** — keep new sims using
  these rather than re-rolling local diffing/formatting logic (this has
  mostly been followed correctly already).

## 6. Future expansion

More SP015 topics will be added following the exact pattern in §3–4, and
SP025 sims will start once SP015 coverage is far enough along — they'll live
alongside SP015 folders (or under an `sp025/` prefix if the flat layout gets
crowded; revisit that only once it's actually a problem). Every new sim
should:

1. Reuse `shared/sim-style.css` and `shared/sim-utils.js` untouched, adding
   only topic-specific CSS/JS on top.
2. Prefer the fully-split file structure (§4) once the sim needs more than a
   trivial amount of physics or more than one canvas.
3. Fold any newly-duplicated helper into `shared/` per §5 before moving on
   to the next sim, not "later" — this is also enforced as a QA gate in
   `instructions/checklist.md` ("Code cleanliness" section).
4. Update this file if the architecture actually changes shape (new file
   split, new shared module, new folder convention) — it should stay a
   description of what's true, not what was once planned.