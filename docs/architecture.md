# Architecture

Reference doc for `haziqfazri/SP015`. Read this before adding or
modifying a simulation — it describes the patterns actually in use across the
repo, not an aspirational spec.

## 1. Project philosophy

This repo is a growing library of interactive p5.js simulations for teaching
**Physics 1 (SP015)** at pre-university level, with **SP025** to follow later.
Each simulation is a standalone teaching tool built against the official
curriculum specification (SP015 in `SP015-curriculum-spec.md` at the repo
root; the SP025 spec is not yet converted to markdown) — sliders map to real
physical quantities, readouts use correct units and notation, and theory text
matches the learning outcomes (LOs) cited in code comments (e.g.
"SP015 7.1(c.iii)").

Two things matter equally: **pedagogical correctness** (equations, units,
sign conventions, small-angle caveats, etc., usually justified in a comment)
and **reusability** (new sims should cost less to build than the last one).
The repo is maintained solo, with heavy use of AI coding assistants — so
predictable structure matters more than any single sim's cleverness.

## 2. Folder layout & responsibilities

The repository currently uses the following structure:

```text
SP015/
├── README.md
├── SP015-curriculum-spec.md
├── animations/
│   ├── 02-kinematics-of-linear-motion/
│   │   └── 2.3-projectile-motion/
│   ├── 05-circular-motion/
│   │   ├── circular-motion-sim.js
│   │   ├── circular-motion-sketch.js
│   │   ├── circular-motion.css
│   │   └── circular-motion.html
│   └── 07-simple-harmonic-motion/
│       ├── 7.1-kinematics-of-shm/
│       ├── 7.2-graphs-shm/
│       ├── 7.4-progressive-wave-shm/
│       ├── 7.5-superposition-shm/
│       ├── 7.6-application-of-standing-waves/
│       └── 7.7-doppler-effect/
├── docs/
│   └── architecture.md
├── instructions/
│   ├── checklist.md
│   ├── coding.md
│   ├── physics.md
│   └── system.md
├── shared/
│   ├── sim-style.css
│   └── sim-utils.js
└── templates/
    ├── README.md
    ├── index.html
    ├── template-controller.js
    ├── template-physics.js
    ├── template-renderer.js
    ├── template-sketch.js
    ├── template-ui-manager.js
    └── template.css
```

### Folder responsibilities

- **`animations/`** — all simulation projects, grouped by chapter/topic.
- **`shared/`** — code genuinely reused by multiple simulations.
- **`templates/`** — optional starting files for new simulations; use only the
  parts appropriate to the simulation.
- **`docs/`** — repository architecture and structural decisions.
- **`instructions/`** — supporting coding, physics, project, and QA guidance.

Each simulation is self-contained inside its topic folder. It owns its HTML,
CSS, and JavaScript files. Nothing simulation-specific belongs in `shared/`.
Conversely, a helper should move into `shared/` when it is genuinely reused by
multiple simulations and the abstraction is clear.

The repository does **not** require every simulation to use the same number of
files. A small simulation may keep related code together, while a more involved
simulation may separate physics, UI, controller, renderer, and sketch code.
Choose the simplest structure that keeps responsibilities clear.

`docs/architecture.md` is the authoritative source for repository structure,
data flow, and architectural decisions. The files in `instructions/` support
that architecture with day-to-day conventions and QA guidance; they do not
maintain a competing folder layout or lifecycle definition.

## 3. Architecture levels — choose the simplest one that fits

The repository does **not** require every simulation to use the full
physics/UI/controller/renderer/sketch split. Start simple and introduce a
separation only when the current structure becomes difficult to understand or
maintain.

### Level 1 — Simple

Use this for a small, self-contained simulation with one main physical model,
minimal UI, and limited state. A typical structure is:

```text
<sim>/
├── index.html
├── <sim>-sim.js
├── <sim>-sketch.js
└── <sim>.css
```

Keep physics state, equations, and closely related simulation logic together
when doing so is clearer. Do not create controller, renderer, or UI classes
just to match a template.

### Level 2 — Medium

Use this when separating physics from application/interaction logic makes the
code substantially easier to understand. A typical structure is:

```text
<sim>/
├── index.html
├── <sim>-physics.js
├── <sim>-controller.js
├── <sim>-sketch.js
└── <sim>.css
```

The controller can handle UI events, playback, and orchestration while the
physics module remains independent of the DOM and canvas. A separate renderer
or UI manager is optional at this level.

### Level 3 — Complex

Use the full split only when the simulation has genuinely distinct and
substantial UI, rendering, controller, and physics responsibilities. A typical
structure is:

```text
<sim>/
├── index.html
├── <sim>-physics.js
├── <sim>-controller.js
├── <sim>-renderer.js
├── <sim>-ui.js
├── <sim>-sketch.js
└── <sim>.css
```

This is appropriate for simulations with multiple canvases, graphs, many
controls, several interacting physical models, multiple render modes, or
complicated state transitions.

### Decision rule

Use this sequence when starting or modifying a simulation:

1. **Can the simulation remain clear with a small number of files?** If yes,
   use Level 1.
2. **Would separating physics from application/interaction logic materially
   improve clarity?** If yes, use Level 2.
3. **Are UI, rendering, controller, and physics responsibilities all large
   enough to justify separate modules?** If yes, use Level 3.
4. If none of these conditions applies, do not add another abstraction.

Complexity should be judged from the implementation, not from the physics topic
name or file length alone.

### Anti-overengineering rule

Do not create a separate file, class, abstraction, or shared utility unless it
solves an existing problem. File separation should follow actual complexity,
not an idealized architecture. A small simulation is allowed to be small.

When modifying an existing simulation, preserve its current structure when it
is working well. Refactor only when the requested change or an existing
maintenance problem gives a concrete reason to do so.

## 4. Simulation lifecycle
 
Observed sequence for every sim in the repo so far:
 
1. **Pick the LO.** Identify the SP015/SP025 topic + learning outcome(s) the
   sim teaches (cited directly in file-header comments, e.g.
   `SP015 7.5(a)`).
2. **Decide physics state & constants.** Write the `PHYSICS` / `LIMITS` /
   `DISPLAY` (or `INTERFERENCE_LIMITS`, etc.) constant blocks first — see
   `coding.md` §3 for why these, not the HTML attributes, are the source
   of truth for slider ranges and scaling.
3. **Write the physics class(es).** Pure state + derivation, no DOM/canvas
    (`SHMOscillator`, `WaveState`, `Oscillator`/`SpringOscillator`/
    `PendulumOscillator`, `PulseWave`/`ProgressiveWave`, `Projectile`,
    `StretchedString`/`AirColumn`, `Particle`/`Orbit`).
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

   Canvas-mode choice at this step is about **cross-canvas sync**, not
   physics complexity: global mode remains the right call even for a sim
   with several physics classes and well over 150 lines of physics (7.6 has
   three physics classes and no single canvas needing to stay in lockstep
   with another) as long as it's a single canvas. Instance mode's value is
   specifically coordinating multiple canvases off one shared clock — don't
   reach for it just because a sim is "advanced." See §5 for the full
   canvas-mode decision guidance.
8. **Wire the theory strip / readouts** to match the LO text and correct
   units, cross-checking against `SP015-curriculum-spec.md`.
9. **Check for duplication against existing sims** — anything that's now
   the second copy of a helper (arrow drawing, dashed guides, readout
   diffing, button binding patterns, etc.) should move to `shared/`.

## 5. Data flow
 
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
  so unchanged text isn't rewritten every frame. It also owns the KaTeX
  rendering pass: a one-time `_renderStaticMath()` sweep over every
  `[data-latex]` element (called from the constructor after element
  caching), plus targeted `renderMath()` re-renders wherever a math span's
  TeX changes at runtime (e.g. 7.1's spring→pendulum label swap, 7.4's
  direction-resolved ± equations). See §6's KaTeX entry for the full
  convention.
- **SimulationController** is the only class that talks to both UIManager
  and the physics classes. It has no drawing code and no physics
  derivations of its own — it decides *when* to step/reset/redraw and
  *what* to pass to the renderer. It owns playback state (`isPlaying`),
  history/trail buffers (`SignalHistory`, `yHistory`, `trail[]`), and (in
  multi-canvas sims) the p5 instance(s).

  **Readout updates must be triggered by the state that actually changes
  them, not blanket-called every frame.** If a sim's readouts are driven
  purely by slider/parameter values (not by `t`/`dt` or any time-integrated
  quantity), call `ui.updateReadouts(...)` from the parameter's `on*Change`
  callback — never from inside `update(dt)`/the per-frame loop. Calling it
  every frame recomputes and reformats values that cannot have changed,
  wasting work even though `updateReadout()`'s diffing still prevents the
  resulting DOM write. If a sim's readouts genuinely depend on `t` (e.g. a
  live "t = 2.34 s" readout, or a per-frame peak/envelope sweep), calling
  `updateReadouts()` every frame is correct and expected — 7.5's
  `_interferenceLoop()` is the reference example of this legitimate case.
  7.6 is the reference example of the bug: its readouts depend only on
  `T`/`μ`/`L`/`n`, so the per-frame call in its `update(dt)` was dead work
  and was removed.
- **Physics classes** (`Oscillator` subclasses, `WaveState`,
  `SHMOscillator`, `Particle`/`Orbit`, `PulseWave`/`ProgressiveWave`,
  `StretchedString`/`AirColumn`, etc.) hold state and expose
  `integrate()`/`step()`/`advance()`, `energy()`/`period()`, and derived
  getters (e.g. `wavelength`, `angularFrequency`). No DOM access, no p5
  calls, no rendering. Derived quantities are generally computed on demand
  from stored independent fields (e.g. `wavelength = waveSpeed / frequency`)
  rather than cached, so they can never drift out of sync with the sliders.

  **One class per physical system, but not necessarily one class per
  boundary condition.** Where two physical systems differ only in boundary
  condition — the underlying derivation and equation *shape* are the same,
  just which end is a node vs. an antinode, and which harmonic numbers are
  physically allowed — prefer a single class parameterized by a flag over
  two classes that would mostly duplicate each other. `AirColumn(length,
  harmonic, closedEnd)` (7.6) is the reference example: open and closed
  columns share every method, differing only in wavelength relation,
  envelope phase, and allowed-harmonics set, all branched on `closedEnd`.
  Reserve genuinely separate classes (as with `StretchedString` vs.
  `AirColumn`) for cases where the derivation itself differs — string speed
  comes from tension/linear density, air column speed is a fixed constant —
  not just the display label or boundary condition.
- **Renderer functions** are free functions (`drawSpringSystem`,
  `drawWaveformPanel`, `drawOscillator`, `drawPulseScene`,
  `drawStandingWaveScene`, ...) that take an explicit context, the relevant
  physics object(s)/params, and canvas dimensions, and draw one frame. They
  perform no physics calculation beyond unit→pixel conversion, and hold no
  state of their own.

  **A `DISPLAY` visual-scale constant is sometimes better computed at
  render time than stored as a fixed pixel value.** Where a curve or shape
  needs to stay visually anchored to a boundary that's itself a function of
  canvas size (e.g. a standing wave's peak touching pipe walls whose
  position depends on `plotH`), compute the scale from the current plot
  dimensions (`plotH / 2 - margin`) inside the renderer rather than reading
  a fixed constant. `computeAmplitude(plotH)` in 7.6 is the reference
  example — this keeps the visual relationship correct across canvas
  resizes instead of drifting relative to the boundary as the canvas
  changes size.
- **Canvas** — either p5 global mode (`2.3-projectile-motion`, `05-circular-motion`,
  `7.1-kinematics-of-shm`, `7.4-progressive-wave-shm`, `7.6-application-of-standing-waves`,
  `7.7-doppler-effect`: one `setup()`/`draw()` pair, functions like
  `background()`/`stroke()` called bare — 7.4 additionally uses a
  `createGraphics` buffer for its second panel) or p5 **instance mode**
  (`7.2-graphs-shm`, `7.5-superposition-shm`: each canvas is its own
  `new p5(sketch)`, used when a sim needs 3+ independent canvases in
  lockstep, e.g. 4–5 synced graphs or 3 stacked interference panels
  driven by one shared clock/ticker).
  Choose based on **whether the sim needs more than one canvas kept in
  sync** — not sim complexity. 7.6 has three physics classes and a full
  play/pause animation loop, and still uses global mode correctly, because
  it only ever draws one canvas at a time.
The repository currently contains both compact and fully split simulations.
Both patterns are valid:

- **Compact** — related physics, UI, and rendering code may live in one or two
  files when the simulation is small and self-contained.
- **Split** — `*-physics.js`, `*-ui.js`/`*-ui-manager.js`, `*-renderer.js`,
  `*-controller.js`, and `*-sketch.js` may be separated when the simulation has
  enough distinct responsibilities that the split improves clarity.

There is no hard line-count threshold. Split files when responsibilities become
meaningfully difficult to manage together, not simply because a file is large.
Likewise, keep a simulation compact when splitting it would only create small
files with little benefit. File structure and canvas mode are independent
choices.

## 6. Shared components
 
Currently in `shared/`:
- `sim-style.css` — topbar, system-bar/mode-switch, `.sim-grid`,
  `.canvas-shell`, `.readouts`/`.readouts--dense`, `.controls`,
  `.control-row`, buttons, `.theory-strip`, responsive breakpoints.
  Topic CSS loads after this and only adds sim-specific layout (e.g.
  `shm-graphs.css`'s 2×2 `.graph-quad`, `wave-properties.css`'s stacked
  dual-canvas panels). For the specific palette, fonts, spacing rhythm, and button/slider placement
rules, see `instructions/coding.md` for the day-to-day UI conventions.
- `sim-utils.js` — `PALETTE`, `drawArrowCtx`, `normalizedArrowLength`,
  `VectorArrow`, `signedFixed`, `drawDashedGuide`, `drawDashedCurve`,
  `drawTrailDots`, `drawLabel`, `updateReadout`, `renderMath`, `AudioTone`,
  `PlaybackState`.
  `PALETTE` is the canonical JS color source (hex + array forms), mirroring
  `shared/sim-style.css` `:root`. Every sim must reference `PALETTE.*` for
  canvas colors — no inline hex or RGB literals. `PALETTE.accent` and
  `PALETTE.path` are documented non-CSS additions (2+ sims use each).
  `drawArrowCtx`/`VectorArrow` are ctx-explicit and canonical, so any future
  sim needing arrows (interference vectors, force diagrams, etc.) uses this instead
  of writing a new one.

  **KaTeX — math notation is a repo-wide convention, not a per-sim choice.**
  Every sim links KaTeX 0.18.2 in its `<head>` (CSS + JS) — copy the
  canonical `<link>`/`<script>` tags with their SRI integrity attributes
  verbatim from `shared/sim-style.css`'s KaTeX comment block (single source
  of truth for version + hashes) — and renders math via
  `renderMath(el, latex, displayMode)` from `sim-utils.js`. Two element
  conventions (mirrored by the `.formula .katex` / `.katex-inline` rules in
  `sim-style.css`):
  - `.formula` elements (theory-strip equations) carry a `data-latex`
    attribute and render in displayMode — centered, full-size, colored via
    the existing `--orange` `.formula` rule.
  - Inline notation in readout/control labels and prose uses
    `<span class="katex-inline" data-latex="...">fallback text</span>`,
    rendered inline at 1em.
  Raw HTML entities (`&omega;`, `&lambda;`, `<sub>`, `&radic;`, ...) are
  not used for math notation. Numeric live values (`.readout-value`,
  `.control-value` outputs) stay plain DOM text — never wrapped in KaTeX.
  Render once in the UIManager constructor (`_renderStaticMath()`); call
  `renderMath()` again only when a span's TeX changes at runtime. Promoted
  from the 7.7 pilot when 7.2/7.4/7.5 adopted it (see 7.7's
  `doppler-effect-ui.js` history for the original).
Duplication observed that should be reconciled next time it's touched:
- **`PHYSICS`/`LIMITS`/`DISPLAY` constant-block convention** is repeated
  by hand in every sim rather than scaffolded — fine as-is, but worth a
  template so the shape stays consistent.
- **UIManager boilerplate** (cache-elements → bind-controls →
  configure-ranges-from-LIMITS → diffed readout updates) is re-derived per
  sim. Not yet extracted because each sim's control set differs enough that
  a shared base class would mostly be overridden — revisit if a future sim
  needs materially the same controls as an existing one.
- **`signedFixed`/`updateReadout` are already shared** — keep new sims using
  these rather than re-rolling local diffing/formatting logic (this has
  mostly been followed correctly already).
- **Discrete-value stepper buttons** (`.system-switch.compact` reused for a
  fixed set of selectable values rather than a mode toggle) now has two
  independent uses: 7.5's `.amp-step-group` (signed amplitude steps) and
  7.6's `.harmonic-group` (integer harmonic numbers, including a non-
  contiguous odd-only set for the closed air column). This is a confirmed
  second use of the same underlying pattern — worth promoting to a generic
  `.stepper-group` modifier in `shared/sim-style.css` next time either
  topic's stepper CSS is touched, rather than deferring further per §6
  rule 3.
- **Node/antinode-style extrema markers with play-state-gated labels**
  (7.6's `drawExtremaMarkers`) are not yet a shared helper — only one sim
  uses this pattern so far. Revisit if a future sim (e.g. another
  standing-wave-adjacent topic) needs the same marker+label behavior.

## 7. Future expansion
 
More SP015 topics will be added using the patterns in §3–4, and SP025 sims
will start once SP015 coverage is far enough along — they'll live
alongside SP015's `animations/` chapters. If SP025 later becomes large enough
to need a separate root, document that decision here when it becomes an actual
requirement. Every new sim should:
 
1. Reuse `shared/sim-style.css` and `shared/sim-utils.js` where they fit,
   adding only topic-specific CSS/JS to the simulation folder.
2. Choose the file split based on the simulation's actual responsibilities. Do not split a small simulation into multiple
   files merely to match a more complex simulation. Canvas mode remains an
   independent decision based on whether multiple canvases need to stay in sync.
3. Fold a genuinely repeated helper into `shared/` when another simulation
   needs it and the abstraction is clear. See `instructions/checklist.md` for
   the related QA check.
4. Only call a controller's readout-update method from the callback that
   actually changes the underlying values (a slider/button `on*Change`, a
   mode switch), or from the per-frame `update(dt)` loop if the readouts
   genuinely depend on `t`/`dt`/integrated state — never call it
   unconditionally from `update(dt)` when it doesn't. See §5's Physics
   classes / SimulationController discussion for the reference examples of
   both the correct time-dependent case (7.5) and the bug (7.6, since
   fixed).
5. Update this file if the architecture actually changes shape (new file
   split, new shared module, new folder convention) — it should stay a
   description of what's true, not what was once planned.