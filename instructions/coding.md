# Coding — Conventions & Standards

## 1. Naming & folder organization

```
Animation-Projects/
  docs/architecture.md
  instructions/          system.md, coding.md, physics.md, checklist.md
  shared/
    sim-style.css         shared visual language
    sim-utils.js           shared p5 drawing/formatting helpers (global-mode)
  <topic-name>/            e.g. circular-motion, simple-harmonic-motion,
                            shm-graphs-analysis, shm-progressive-wave,
                            shm-superposition
```

- **Folder = topic name**, not a topic number (`simple-harmonic-motion`,
  not `sp015-topic-7.1`). The SP015 topic number goes in a comment/kicker,
  never the folder name.
- **One folder, self-contained.** Own HTML, own CSS, own JS. Nothing
  sim-specific lives in `shared/`; nothing shared lives inside a sim's
  folder — a helper needed by two sims moves to `shared/`.
- **File naming pattern:** `<topic-prefix>-<role>.js`, e.g.
  `wave-physics.js`, `wave-ui-manager.js` / `wave-superposition-ui.js`,
  `wave-controller.js`, `wave-renderer.js`, `wave-sketch.js`. HTML is
  `index.html` or `<topic>.html`; CSS is `<topic>.css`.
- **Class naming:** `UIManager`, `SimulationController` are the fixed names
  for those two roles in every sim. Physics classes are named for what they
  model (`SpringOscillator`, `WaveState`, `SHMOscillator`, `Particle`,
  `Orbit`, `PulseWave`, `ProgressiveWave`) — never generically `Physics` or
  `Model`.

### File responsibilities (strict)

| File | Owns | Never does |
|---|---|---|
| `*-physics.js` / `*-sim.js` | State, equations, `integrate()`/`step()`/`advance()`, `energy()`, `period()`, derived getters | DOM access, canvas/p5 calls |
| `*-ui.js` / `*-ui-manager.js` | DOM caching (`this.el`/`this.els`), event binding, readout writes, a `callbacks` object | Physics math, drawing, calling itself into physics |
| `*-renderer.js` | Free drawing functions taking an explicit ctx + already-computed state | Physics calculation beyond unit→pixel mapping, DOM access, held state |
| `*-controller.js` (`SimulationController`) | Owns physics + UI instances, wires callbacks, playback state (`isPlaying`), history/trail buffers, decides when to redraw | Drawing code, physics derivations of its own |
| `*-sketch.js` | `setup()`/`draw()`/`windowResized()` (global mode) or `DOMContentLoaded` bootstrap (instance mode) | Business logic beyond lifecycle wiring |

Two accepted file-split variants — pick based on complexity:
- **Single-file combo** (physics + UIManager + renderer together, sketch
  separate) — fine for a simple, single-canvas sim.
- **Fully split** (`*-physics.js`, `*-ui.js`, `*-renderer.js`,
  `*-controller.js`, `*-sketch.js`, loaded in that order) — required once a
  sim has >1 canvas or >~150 lines of physics.

## 2. ES6 conventions in use

- `class` for every stateful object (physics, UIManager, controller) —
  never bare factory functions or prototypes.
- `const`/`let` only, never `var`.
- Arrow functions for callbacks and inline event handlers; regular
  `methodName() {}` shorthand for class methods.
- Getters (`get wavelength() {}`, `get angularFrequency() {}`) for derived
  quantities instead of cached fields, so they can never drift from the
  live slider values.
- Destructuring for params objects: `integrate(dt, { m, k })`.
- Template literals for all formatted/readout strings.
- `Object.assign(this.callbacks, callbacksMap)` pattern for UIManager's
  `on(callbacksMap)` registration in split-file sims.
- One class per concern per file; free renderer functions are plain
  top-level `function`, not static class methods.

## 3. Constants, comments, error handling, performance

**Constants**
- Every sim defines its own `PHYSICS`, `LIMITS`, `DISPLAY` (and
  sim-specific variants like `INTERFERENCE_LIMITS`) blocks at the top of
  the physics or controller file. These are the **single source of truth**
  for ranges/scaling — HTML `min`/`max`/`value` attributes are a cosmetic
  fallback only, never edited to change behavior.
- Physical constants (`G = 9.81`) live near the top of the file that uses
  them, named in caps.

**Comments**
- File header block explains the file's role and load-order dependency.
- Every non-obvious equation gets an inline comment citing the SP015 LO
  and the equation itself, e.g. `// λ = v/f — derived, not stored`.
- Sign conventions and simplifications (small-angle vs exact,
  ±-direction resolution) are always explained in a comment, not left
  implicit.

**Error handling**
- Abstract base classes throw explicitly for unimplemented methods:
  `throw new Error('Oscillator.integrate() must be implemented by subclass')`.
- No silent failure — a missing DOM element or bad param should error
  loudly during development, not be swallowed.

**Performance**
- `dt` is always clamped on every controller's update loop (e.g.
  `Math.min(deltaTime / 1000, 0.03)`) so tab-switch stalls never blow up
  integration.
- Readouts write to the DOM only when the formatted value changed — use
  the shared `updateReadout(store, key, el, formattedValue)` diffing
  helper, never rewrite `textContent` unconditionally per frame.
- Rolling buffers (`trail`, `SignalHistory`, `yHistory`) are capped
  (`TRAIL_MAX`, `windowDuration`, `historyMaxPoints`) and trimmed from the
  front — never allowed to grow unbounded.
- `noLoop()`/`redraw()` (global mode) or a single shared
  `requestAnimationFrame` ticker (instance mode, multi-canvas) — never a
  free-running loop per canvas when they need to stay in sync.

## 4. UI standards

**Layout**
- Fixed shell: `.app-shell > .lab-frame > .topbar, .system-bar?, .sim-grid, .theory-strip`.
- `.sim-grid` is a two-column grid: `.stage` (canvas + readouts, left) and
  `.controls` (sidebar, right). Single-column full-width stage only for a
  dedicated mode (e.g. Reference Circle's `.stacked-layout`).
- `.canvas-shell` default height `350px`; use documented overrides for
  secondary/multi-canvas layouts (`90px` oscillator strip, `190px` graph
  quad cells, `150px` interference panels) — never invent a new arbitrary
  height without a reason in a comment.
- Multi-canvas sims: stack canvases in named holders (`#canvas-holder-yx`,
  `#canvas-holder-yt`) sized via topic CSS, never rely on the shared
  `#canvas-holder` id for more than one canvas.

**Buttons & sliders**
- Playback controls always as `.button-grid`: Play/Pause (`.primary`),
  Reset, Step — Step spans two columns (`.col-span-2`) when there are 3
  buttons.
- Mode/system switches use `.system-switch` with `.system-option` buttons,
  `is-active` class + `aria-pressed` kept in sync on every toggle.
- Sliders are always paired with a live-value `<output>`/`<span>` in
  `.control-meta`, updated on `input`, formatted with fixed decimals and
  units (e.g. `${v.toFixed(2)} m`).
- Slider `min`/`max`/`step`/`value` are set from `LIMITS` in JS at
  construction — HTML attributes are fallback only (see §3).

**Fonts, colors, spacing**
- Fonts: `DM Sans` (display/labels), `Space Mono` (mono/readouts/formulas)
  — loaded via Google Fonts, declared as `--display`/`--mono` CSS vars.
- Palette (from `shared/sim-style.css` `:root`): `--ink #102126`,
  `--paper #eff3ed`, `--panel #f8faf6`, `--line #c9d2c7`, `--acid #dff34b`,
  `--orange #ff6b35`, `--teal #35b9ad`, `--muted #617075`. Orange is the
  default "primary curve/accent" color; teal is the secondary/reference
  color; never introduce a new hex color when one of these fits.
- Spacing follows the existing rhythm: `.control-row` margin-bottom `21px`,
  `.stage`/`.controls` padding `28px`, `.button-grid` gap `9px`. Match
  these rather than picking new values.
- All topic CSS loads **after** `shared/sim-style.css` and only adds
  rules unique to that sim's layout — never redeclares shared rules.
