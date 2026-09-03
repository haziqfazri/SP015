# Chapter 8 Physics of Matters — Simulation Implementation Plan

**Status:** Active

**Created:** 2026-09-02

**Curriculum source:** `Curriculum Specifications (CS) Physics SP015.pdf`, Topic 8 (effective from the 2022/2023 session)

## 1. Summary

Implement three standalone simulations under `animations/08-physics-of-matters/`:

1. **Materials Testing Lab** — SP015 8.1 and 8.2
2. **Heat Conduction Lab** — SP015 8.3
3. **Thermal Expansion Lab** — SP015 8.4

Build them in that order because the Materials Testing Lab establishes the Chapter 8 graph language, the Heat Conduction Lab reuses the graph layout for a different physical system, and the Thermal Expansion Lab can then reuse any proven mode-switch and comparison patterns. Each simulation uses a Level 3 file split and one responsive global-mode p5.js canvas. No simulation requires synchronized independent canvases.

The materials curves are explicitly labelled **idealized teaching models**. They must not use named real materials or imply laboratory-grade material data. Quantitative formulas are limited to relationships stated by the SP015 specification; qualitative extensions are visibly labelled as schematic.

## 2. Curriculum and architecture contract

### Curriculum mapping

| Simulation | Learning outcomes covered |
| --- | --- |
| Materials Testing Lab | 8.1(a–d): stress, strain, tensile/compressive loading, stress–strain graphs, elastic/plastic deformation, and brittle/ductile force–elongation graphs; 8.2(a–c): Young's modulus and strain energy from the two graph forms |
| Heat Conduction Lab | 8.3(a–c): heat conduction, rate of heat transfer, and temperature–distance graphs for insulated/non-insulated rods, with no more than two rods in series |
| Thermal Expansion Lab | 8.4(a–b): linear, area, and volume expansion coefficients and calculations, including liquid expansion in a container |

### Shared architecture

- Create one topic folder per simulation:
  - `8.1-8.2-materials-testing/`
  - `8.3-heat-conduction/`
  - `8.4-thermal-expansion/`
- Give each simulation `index.html`, topic CSS, and `*-physics.js`, `*-renderer.js`, `*-controller.js`, `*-ui-manager.js`, and `*-sketch.js` modules.
- Use global p5.js mode with one canvas divided into apparatus and graph regions. Start paused with a nonblank frame; use `noLoop()` and explicit `redraw()` while paused.
- Keep `PHYSICS`, `LIMITS`, and `DISPLAY` blocks as the single source of truth. HTML range attributes are fallbacks and are overwritten from `LIMITS` by the UI manager.
- Keep physics modules free of DOM/p5 access, renderers stateless, UI managers as sole DOM accessors, and controllers as the only bridge between UI and physics.
- Use local runtime assets, shared styles/utilities, `PALETTE`, `updateReadout`, `renderMath`, `PlaybackState`, and existing arrow/guide helpers. Add a shared helper only when the second Chapter 8 simulation proves the same abstraction is genuinely reused.
- Use SI units internally and in readouts: Pa, MPa/GPa, dimensionless strain, N, m/mm, J, J m⁻³, W, W m⁻¹ K⁻¹, K/°C temperature differences, and K⁻¹ expansion coefficients.
- Cite the exact SP015 sub-LO in file headers, equation comments, and each theory strip.

### Shared layout and visual direction

Use the existing SP015 **instrument bench** visual language: the physical apparatus is the memorable element, while graphs and readouts behave like precise measuring instruments. Retain the repository palette, DM Sans/Space Mono typography, square panel geometry, and restrained animation; do not introduce a separate Chapter 8 theme.

All three pages use the same outer shell:

```text
Desktop (>800 px)
┌─────────────────────────────────────────────────────────────┐
│ Topbar: topic, title, live status                           │
├─────────────────────────────────────────────────────────────┤
│ System bar: simulation mode                                 │
├───────────────────────────────────────┬─────────────────────┤
│ Stage heading                         │ Parameters          │
│ ┌───────────────────────────────────┐ │ mode-specific       │
│ │ one responsive p5 canvas          │ │ controls            │
│ └───────────────────────────────────┘ │                     │
│ dense live readouts                   │ playback controls   │
├───────────────────────────────────────┴─────────────────────┤
│ LO/equation card              │ What to notice card         │
└─────────────────────────────────────────────────────────────┘

Tablet/mobile (≤800 px)
┌───────────────────────────────┐
│ Topbar                       │
│ Mode switch                  │
│ Stage + canvas               │
│ readouts (2 columns)         │
│ Controls                     │
│ Theory cards                 │
└───────────────────────────────┘

Small mobile (≤460 px): mode buttons wrap or become equal-width rows,
readouts become one column, and canvas labels use symbols/short phrases.
```

- Use `.canvas-shell.compare-tall` for Materials Testing and any Thermal Expansion liquid comparison requiring extra vertical space; Heat Conduction uses the standard canvas height.
- Keep controls in teaching order: choose the physical system, set independent quantities, operate playback, then inspect derived readouts. Hide inactive mode controls rather than disabling a long mixed form.
- Keep four primary readouts in the first row and secondary values in `.readouts--dense`; retain a stable readout order during playback so values do not jump spatially.
- Give each theory strip two stable cards: the left card names the LO and governing equation; the right card explains the visual relationship or limitation currently shown.
- At narrow widths, redraw the internal canvas composition instead of scaling desktop labels down. Use renderer breakpoints based on canvas width, with a compact layout below 560 canvas pixels.

## 3. Phased delivery

### Phase 0 — Chapter foundation and acceptance baseline

**Goal:** Lock conventions shared by all three simulations before implementing physics.

**Tasks:**

- Create `animations/08-physics-of-matters/` and the three topic folders listed above.
- Record the Topic 8 LO text and equations from the local curriculum PDF in each simulation's implementation notes; do not rely on older SP015 sources where rotation was Topic 8.
- Define a common Chapter 8 graph presentation: labelled axes with units, visible current-state marker, solid quantitative curves, dashed schematic curves, and no meaning carried by color alone.
- Establish responsive stage geometry for 1440, 800, 460, and 320 px widths. Apparatus and graph may sit side by side on wide canvases and stack within the same canvas at narrow widths.
- Establish accessibility wording for every canvas through adjacent headings, readouts, and dynamic summaries; canvas graphics remain supplementary rather than the only source of a result.
- Add planned landing metadata for the three Chapter 8 labs only after their titles, folder names, and outcomes are fixed. Keep `href: null` and `status: 'planned'` until each corresponding phase passes QA.

**Exit criteria:**

- Folder, file, class, and callback names are fixed.
- Every equation and qualitative behavior is mapped to an SP015 sub-LO.
- No unresolved shared UI, graph, unit, or responsive convention remains.
- Existing simulations and unrelated dirty-worktree files are untouched.

### Phase 1 — Materials Testing Lab (SP015 8.1 and 8.2)

**Goal:** Teach how specimen geometry connects force/elongation to stress/strain, then distinguish idealized ductile and brittle responses.

#### Modes and controls

- **Elastic measurement** mode: adjustable loading type (`tension` or `compression`), original length `L0` (0.50–2.00 m, default 1.00 m), area `A` (25–200 mm², default 100 mm²), Young's modulus `Y` (20–250 GPa, default 200 GPa), and signed elongation/compression magnitude up to 0.25% strain.
- **Material comparison** mode: idealized `ductile` and `brittle` presets with a normalized loading-progress control from unloaded to fracture. Geometry controls remain available so students can observe that the stress–strain shape is geometry-independent while the force–elongation axes change.
- Playback advances loading progress at a fixed bounded rate; Step advances one fixed increment; Reset returns to zero load while preserving mode and selected parameters.

#### Suggested layout

Use a tall comparison canvas because the specimen and both curriculum graphs must remain visible together.

```text
Wide canvas
┌─────────────────┬──────────────────────────┐
│ TESTING MACHINE │ σ–ε graph               │
│ force arrows    │ current point + regions │
│ specimen        ├──────────────────────────┤
│ L₀ / ΔL guides  │ F–ΔL graph              │
│ state badge     │ current point + U area  │
└─────────────────┴──────────────────────────┘

Compact canvas (<560 px)
┌────────────────────────────────────────────┐
│ horizontal specimen + opposing force arrows│
├────────────────────────────────────────────┤
│ σ–ε graph                                  │
├────────────────────────────────────────────┤
│ F–ΔL graph                                 │
└────────────────────────────────────────────┘
```

- Allocate approximately 38% of wide-canvas width to the testing machine and 62% to two equal graph rows. On compact canvases, allocate roughly one-third of the height to each region.
- Place `Elastic measurement` / `Material comparison` in the system bar. In comparison mode, place the ductile/brittle selector first in the controls, followed by geometry and loading progress.
- Use a persistent state badge beside the specimen (`Elastic`, `Yielding`, `Plastic`, `Necking`, or `Fractured`) and mirror the same state at the graph marker; do not rely on curve color.
- Order dense readouts as: strain, stress, force, `ΔL`, `Y`, strain energy, energy density, and loading state. Hide `Y`/energy values that are not valid in the schematic plastic region and show a textual reason in their place.
- The theory cards remain below the entire stage/controls grid so the graph area is not compressed by explanatory prose.

#### Physics model and public interface

- Implement `ElasticSpecimen` for the quantitative elastic region:
  - stored independent values: loading type, `L0`, `A`, `Y`, and signed `deltaL`;
  - getters: `strain = deltaL / L0`, `stress = Y * strain`, `force = stress * A`, `strainEnergy = 0.5 * force * deltaL`, and `energyDensity = 0.5 * stress * strain`;
  - use magnitudes for energy while preserving the tensile/compressive sign in stress, strain, force, and deformation rendering.
- Implement `IdealizedMaterialCurve` for schematic comparison presets:
  - ductile curve: linear elastic region, yield transition, plastic strain hardening, necking, and fracture;
  - brittle curve: nearly linear elastic region followed by abrupt fracture with no plastic plateau;
  - expose normalized stress/strain points and semantic region labels, not claimed real-world material constants.
- Public mutators validate finite values and configured limits; invalid mode, preset, or geometry values throw errors rather than silently clamp.

#### Rendering and UI behavior

- Render a testing-machine specimen with force arrows, original/current gauge length, and exaggerated deformation accompanied by an explicit “visual deformation exaggerated” note.
- Elastic mode shows linked stress–strain and force–elongation views with the current point, initial gradient, and triangular strain-energy area.
- Comparison mode overlays or switches between idealized ductile and brittle curves and labels elastic, plastic, necking, and fracture regions. A dashed style differentiates schematic continuation or comparison curves.
- Show live readouts for `ΔL`, strain, stress, force, `Y`, strain energy, and energy density. Convert Pa to MPa/GPa and m to mm only in UI formatting.
- State that `U = 1/2 FΔL` and `u = 1/2 σε` are applied to the linear elastic loading represented by the triangular graph area; do not apply the triangle formula to the plastic portion.

#### Verification and exit criteria

- At `ΔL = 0`, stress, strain, force, and energy are zero.
- Doubling `Y` doubles stress and force at fixed strain; doubling area doubles force but leaves stress/strain unchanged; doubling `L0` halves strain at fixed `ΔL`.
- Compression produces negative stress/strain/force but non-negative stored strain energy.
- Ductile and brittle graphs remain visibly and semantically distinct without color.
- Play, Pause, Step, Reset, mode changes, resize, readout diffing, and paused redraw all pass.
- Mark its landing card completed only after desktop/mobile and keyboard QA passes.

### Phase 2 — Heat Conduction Lab (SP015 8.3)

**Goal:** Quantitatively model steady one-dimensional conduction through one or two insulated rods and qualitatively compare the non-insulated temperature profile.

#### Modes and controls

- **Insulated quantitative** mode with one-rod/two-rods-in-series selector.
- **Non-insulated qualitative** mode showing lateral heat loss and the resulting curved temperature–distance profile; label it schematic and suppress unsupported quantitative heat-rate claims.
- Controls for hot temperature (50–150 °C, default 100 °C), cold temperature (0–40 °C, default 20 °C), rod length (0.20–1.00 m each, default 0.50 m), cross-sectional area (1–10 cm², default 4 cm²), and conductivity (10–400 W m⁻¹ K⁻¹, defaults 200 and 50 for rods A/B).
- Enforce `Thot > Tcold` in the UI with a clear validation message and preserve the last valid state. Limit the system to two rods in series.

#### Suggested layout

Make the temperature profile a direct vertical projection of the rod system by aligning both to the same horizontal material boundaries.

```text
Canvas at all widths
┌────────────────────────────────────────────┐
│ HOT │ Rod A │ interface? │ Rod B? │ COLD  │
│     heat-flow arrows / side-loss arrows    │
├────────────────────────────────────────────┤
│ T                                          │
│ │ temperature–distance profile             │
│ └────────────────────────────────────── L  │
└────────────────────────────────────────────┘
```

- Use the upper 45% of the canvas for reservoirs and rods and the lower 55% for the `T–L` graph. Keep the interface at the same x-coordinate in both regions.
- Put `Insulated` / `Non-insulated` in the system bar. In insulated mode, put the `One rod` / `Two rods` segmented control at the top of the sidebar.
- Group controls under `Boundary temperatures`, `Rod A`, and conditionally visible `Rod B` subheadings. Keep conductivity, length, and area adjacent within each rod group.
- Order readouts as: heat rate, interface temperature, total resistance, active rod count, then per-rod `k`, `L`, and `A`. In qualitative mode, replace quantitative-only values with `Schematic — side loss` instead of leaving stale numbers visible.
- Animate a small number of heat tracers inside the rod and use outward arrows for side loss. The graph itself stays steady so playback cannot be mistaken for transient warming.
- On compact canvases, shorten reservoir labels to `Hot`/`Cold`, move material names into a legend above the graph, and preserve the aligned interface rather than stacking rods vertically.

#### Physics model and public interface

- Implement `ConductionRod` with stored `length`, `area`, and `conductivity`, plus getter `thermalResistance = length / (conductivity * area)`.
- Implement `SeriesConductionSystem` with one or two rods and boundary temperatures:
  - `heatRate = (Thot - Tcold) / ΣR` in the hot-to-cold direction;
  - interface temperature for two rods from the temperature drop across the first resistance;
  - `temperatureAt(x)` as a continuous piecewise-linear function for the insulated steady state;
  - expose signed Fourier-law gradient consistently with +x from hot to cold, while the UI emphasizes positive heat-flow magnitude and direction.
- Keep the non-insulated profile in a separate `QualitativeHeatLossProfile` that returns normalized schematic points. Do not introduce convection coefficients or fin equations outside the syllabus.

#### Rendering and UI behavior

- Render one or two joined rods, hot/cold reservoirs, heat-flow arrows, interface marker, and a temperature-color treatment backed by labels and directional geometry.
- Draw the synchronized temperature–distance graph with separate line segments for two materials and the exact interface temperature in insulated mode.
- In non-insulated mode, show energy leaving the side surface and a visibly curved profile, with text explaining that side losses make the graph non-linear and that the quantitative one-dimensional formula no longer describes the full system.
- Show live readouts for each rod's `k`, `L`, `A`, resistance, total heat rate, and interface temperature when applicable.
- Playback animates heat-flow tracers only; it must not imply a transient temperature solution. Parameter changes update the steady-state solution immediately.

#### Verification and exit criteria

- Equal rods produce an interface temperature halfway between boundary temperatures.
- Doubling area or conductivity doubles heat rate for a single rod; doubling length halves it.
- For two rods, computed temperature drops are proportional to their thermal resistances and the graph is continuous at the interface.
- Heat-flow arrows always point hot to cold and the sign convention is explained once in the theory strip.
- No third rod can be added; non-insulated mode never displays a falsely precise heat-rate calculation.
- Mark its landing card completed only after functionality, responsive, and accessibility QA passes.

### Phase 3 — Thermal Expansion Lab (SP015 8.4)

**Goal:** Compare linear, area, volume, and liquid-in-container expansion using the same temperature change and consistent coefficient relationships.

#### Modes and controls

- Four modes: `linear`, `area`, `volume`, and `liquid-container`.
- Common temperature-change control from −50 to +150 K (default +50 K), supporting both contraction and expansion.
- Linear mode: `L0` 0.50–5.00 m (default 1.00 m) and `α` 5–30 × 10⁻⁶ K⁻¹ (default 12 × 10⁻⁶ K⁻¹).
- Area mode: `A0` 0.25–4.00 m² (default 1.00 m²); derive `β = 2α` rather than storing it independently.
- Volume mode: `V0` 0.10–2.00 m³ (default 1.00 m³); derive `γ = 3α`.
- Liquid-container mode: container capacity 0.50–2.00 L (default 1.00 L), initial liquid volume up to capacity (default full), container `α` 5–30 × 10⁻⁶ K⁻¹, and liquid `γ` 0.20–1.20 × 10⁻³ K⁻¹.

#### Suggested layout

Use a before/after measurement plate rather than a generic graph. The signature visual is a precise original outline overlaid with an exaggerated final outline and dimension guides.

```text
Linear / area / volume modes
┌───────────────────────────────┬────────────┐
│ ORIGINAL + FINAL OVERLAY      │ Δ magnifier│
│ dimension arrows              │ true value │
│ temperature direction         │ scale note │
└───────────────────────────────┴────────────┘

Liquid-container mode
┌─────────────────────┬──────────────────────┐
│ initial container   │ heated/cooled state  │
│ capacity + level    │ new level / overflow │
└─────────────────────┴──────────────────────┘

Compact canvas (<560 px)
┌────────────────────────────────────────────┐
│ before/after or overlay visual             │
├────────────────────────────────────────────┤
│ Δ magnifier + actual numerical change      │
└────────────────────────────────────────────┘
```

- Put the four expansion modes in the system bar; allow two wrapped rows at narrow widths while retaining `aria-pressed` and a logical DOM order.
- Give approximately 72% of wide-canvas width to the physical comparison and 28% to the change magnifier. The magnifier explicitly separates exaggerated display displacement from the exact computed change.
- Render linear mode as a fixed-origin rod, area mode as nested rectangular outlines, and volume mode as nested isometric boxes. Expansion/contraction occurs symmetrically where the physical mounting does not fix an origin.
- Render liquid mode as side-by-side initial/final vessel cross-sections. Use separate outline styles for container and liquid, a capacity line, and an overflow path only when the computed overflow is positive.
- Group controls as `Initial size`, `Material coefficient`, and `Temperature change`; reveal a separate `Liquid` group only in liquid-container mode.
- Keep the first four readouts stable as initial value, final value, dimensional change, and `ΔT`. Use the second row for `α`, derived `β`/`γ`, apparent liquid expansion, and overflow according to mode.
- Change the right theory card by mode to explain `β = 2α`, `γ = 3α`, or apparent liquid expansion without replacing the left LO/equation card's position.

#### Physics model and public interface

- Implement one `ThermalExpansionState` with mode-specific stored initial dimensions, `alpha`, `deltaT`, and liquid coefficient where applicable.
- Derived getters implement:
  - `deltaL = alpha * L0 * deltaT`;
  - `beta = 2 * alpha` and `deltaA = beta * A0 * deltaT`;
  - `gamma = 3 * alpha` and `deltaV = gamma * V0 * deltaT`;
  - container capacity change from the container's derived `gamma`;
  - liquid volume change from the independent liquid `gamma`;
  - apparent liquid expansion as liquid change minus container change;
  - overflow as `max(0, finalLiquidVolume - finalContainerCapacity)`.
- Preserve signed dimensional changes for cooling while preventing physically impossible negative final dimensions through configured ranges and validation.

#### Rendering and UI behavior

- Render before/after outlines with dimension guides and a numeric scale statement; exaggerate visible expansion while keeping computed values exact.
- Area and volume modes must expand all relevant dimensions, not only stretch one axis.
- Liquid mode renders both the expanding container and liquid level, distinguishing real liquid expansion, container expansion, apparent expansion, and overflow.
- Show live initial/final dimensions, coefficient relationships, `ΔT`, dimensional change, and overflow where applicable.
- Playback sweeps from 0 to the selected `ΔT`; Step advances a fixed fraction; Reset returns the animation to the initial temperature while preserving parameters.
- Theory text states that temperature differences have the same numerical value in K and °C, while coefficients are displayed in K⁻¹.

#### Verification and exit criteria

- Zero `ΔT` gives zero change in every mode; negative `ΔT` produces contraction.
- Doubling the initial dimension, coefficient, or `ΔT` doubles the corresponding change.
- `β = 2α` and `γ = 3α` are always derived and cannot drift from `α`.
- A full container overflows only when the liquid's final volume exceeds the expanded capacity; equal liquid/container volume coefficients produce no apparent expansion.
- Mode switches preserve common temperature and coefficient state where meaningful and redraw immediately while paused.
- Mark its landing card completed only after functionality, responsive, and accessibility QA passes.

### Phase 4 — Repository integration and documentation

**Goal:** Make Chapter 8 discoverable and document only patterns that became real during implementation.

**Tasks:**

- Replace the generic “Next SP015 topic” landing placeholder with three Chapter 8 cards and add recognizable static diagrams:
  - tensile specimen plus stress–strain curve;
  - two-material rod plus temperature gradient;
  - before/after expansion outlines.
- Keep planned cards inert until their individual phase exits; completed cards receive exactly one semantic launch anchor.
- Update the landing coverage table and README curriculum coverage after each simulation is completed, not before.
- Add the three Chapter 8 rows to `instructions/physics.md` with their exact LO focus and documented simplifications.
- Update `docs/architecture.md` only if implementation introduces a new reusable graph helper, validation convention, or other pattern actually used by at least two simulations.
- Check all three implementations for a second copy of graph axes, current-point markers, dimension guides, or dynamic summaries. Promote only a stable ctx-explicit abstraction into `shared/`.

**Exit criteria:**

- Landing search/filter finds Chapter 8, Physics of Matters, and each subtopic.
- Card diagrams remain accurate at thumbnail scale and decorative meaning is duplicated in card text.
- All relative links and local runtime assets resolve when served from the repository root.
- Documentation describes the implementation that exists rather than planned abstractions.

### Phase 5 — Cross-simulation QA and plan completion

**Goal:** Verify curriculum correctness, regression safety, and release readiness across the full Chapter 8 set.

**Automated/static checks:**

- Run `node --check` on every new JavaScript module.
- Run deterministic physics assertions for formula identities, boundary values, scaling relationships, sign handling, series-interface continuity, and overflow conditions.
- Check required and duplicate DOM IDs, script load order, local asset paths, and `git diff --check`.
- Search for raw math entities, inline canvas color literals, unconditional per-frame parameter readouts, uncapped animation state, DOM access in physics, and physics derivations in renderers.

**Browser checks:**

- Test every mode at 1440, 800, 460, and 320 px.
- Verify initial paused frames, Play/Pause/Step/Reset, parameter updates while paused and playing, resize behavior, mode persistence, keyboard operation, visible focus, and synchronized `aria-pressed` state.
- Verify no clipping, overflow, stale readouts, blank canvases, missing KaTeX, runtime dependency errors, or console errors.
- Check that graph meaning and comparison states remain understandable without color and at 200% zoom.

**Physics review:**

- Recheck all equations, scope limits, terminology, and theory-strip wording against the local SP015 PDF.
- Confirm all visible geometric deformation is identified as exaggerated and all brittle/ductile/non-insulated curves are identified as idealized or schematic.
- Confirm no unsupported transient conduction, nonlinear material-energy formula, or real-material accuracy claim was introduced.

**Completion:**

- Save QA evidence under `docs/plan/completed/evidence/chapter-08-physics-of-matters/` grouped by simulation and viewport.
- Record final checks and any accepted limitations in this document.
- Move this plan to `docs/plan/completed/` only when all three simulations, landing integration, documentation, and QA exit criteria pass.

## 4. Interfaces and callback contracts

Use the same controller-facing callback shape across the chapter where applicable:

- `onModeChange(mode)`
- `onParamChange(name, value)`
- `onPlayToggle()`
- `onStep()`
- `onReset()`

Each UI manager exposes `on(callbacksMap)`, `setMode(mode)`, `setPlaying(isPlaying)`, `updateReadouts(values)`, and `showValidation(message|null)`. Controllers preserve valid state, reject unknown parameter names/modes, and request a redraw after every accepted change while paused.

Physics classes expose only domain operations and derived getters. Renderers receive an explicit p5 context plus an immutable frame-state object assembled by the controller; they do not receive the UI manager or mutate physics state.

## 5. Assumptions and exclusions

- The three-simulation split is fixed; 8.1 and 8.2 share one Materials Testing Lab because their quantities and graphs are directly coupled.
- Idealized brittle/ductile curves are preferred over named real-material datasets.
- All simulations use one global-mode canvas; HTML readout panels remain outside the canvas.
- Conduction is steady-state. Non-insulated behavior is qualitative because convection/fin equations are outside SP015 8.3.
- Small-strain isotropic relationships `β = 2α` and `γ = 3α` are used exactly as stated by SP015.
- No build system, framework, network dependency, backend, data persistence, audio, or user-generated export is added.
- Existing public APIs and shared styles remain compatible. Any shared-helper extraction must be justified by two actual Chapter 8 consumers and documented after implementation.
