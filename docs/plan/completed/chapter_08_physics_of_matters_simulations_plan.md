# Chapter 8 Physics of Matter — Simulation Implementation Plan

**Status:** Completed

**Created:** 2026-09-02

**Last reviewed:** 2026-09-06

**Curriculum source:** `Curriculum Specifications (CS) Physics SP015.pdf`, Topic 8 (effective from the 2022/2023 session)

## 1. Summary

Implement three standalone simulations under `animations/08-physics-of-matter/`:

1. **Materials Testing Lab** — SP015 8.1 and 8.2
2. **Heat Conduction Lab** — SP015 8.3
3. **Thermal Expansion Lab** — SP015 8.4

Build them in that order because the Materials Testing Lab establishes the Chapter 8 graph language, the Heat Conduction Lab can reuse only the graph conventions proven by the first implementation, and the Thermal Expansion Lab can then reuse any proven mode-switch and comparison patterns. The planned responsibilities justify a Level 3 split for each lab, but that decision must be rechecked at the start of each implementation and reduced to Level 2 if a separate renderer or UI manager would only be boilerplate. Each simulation uses one responsive global-mode p5.js canvas; no simulation requires synchronized independent canvases.

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
- Provisional Level 3 filenames are `index.html`, topic CSS, and `*-physics.js`, `*-renderer.js`, `*-controller.js`, `*-ui-manager.js`, and `*-sketch.js`. Treat these as ordinary dependency-ordered scripts, matching existing simulations; do not introduce ES modules or a build step.
- Use global p5.js mode with one canvas composed from apparatus, graph, or measurement regions as the topic requires. Start paused with a nonblank frame; use `noLoop()` and explicit `redraw()` while paused.
- Keep `PHYSICS`, `LIMITS`, and `DISPLAY` blocks as the single source of truth. HTML range attributes are fallbacks and are overwritten from `LIMITS` by the UI manager.
- Keep physics modules free of DOM/p5 access, renderers stateless, UI managers as sole DOM accessors, and controllers as the only bridge between UI and physics.
- Use local runtime assets, shared styles/utilities, `PALETTE`, `updateReadout`, `renderMath`, `PlaybackState`, and existing arrow/guide helpers. Add a shared helper only when at least two simulations in the repository prove the same abstraction is genuinely reused.
- Keep parameter-only readouts out of the animation loop. Only the active loading/temperature sweep values that genuinely change with time may update per frame; conduction tracer animation redraws the canvas without recomputing DOM readouts.
- Clamp every playback `dt` to at most 0.03 s and keep loading progress/tracer phase/temperature progress bounded.
- Use SI units internally: Pa, dimensionless strain, N, m, m², m³, J, J m⁻³, W, W m⁻¹ K⁻¹, K/°C temperature differences, and K⁻¹ expansion coefficients. Convert display-friendly MPa/GPa, mm/mm²/cm², and litres only at the UI/controller boundary and include units in every formatted value.
- Cite the exact SP015 sub-LO in file headers, equation comments, and each theory strip.

The provisional Level 3 split is justified independently for each lab:

| Simulation | Why the split is warranted |
| --- | --- |
| Materials Testing | Two physics models, a testing-machine view, two linked graph views, mode-specific controls, and loading playback |
| Heat Conduction | Multiple rod/system models, an apparatus-plus-graph renderer, conditional one/two-rod controls, validation, and tracer playback |
| Thermal Expansion | Four visual modes, mode-specific controls/readouts, liquid/container calculations, and a controller-owned temperature sweep |

If implementation shows that any responsibility is too small to justify its own file, merge it before adding more code rather than preserving this table mechanically.

### Shared layout and visual direction

Use the existing SP015 **instrument bench** visual language: the physical apparatus is the memorable element, while graphs and readouts behave like precise measuring instruments. Retain the repository palette, DM Sans/Space Mono typography, square panel geometry, and restrained animation; do not introduce a separate Chapter 8 theme.

All three pages use the existing shell and DOM order. The topbar's `.live-chip` remains the fixed `Live Simulation` badge used by previous pages; playback state belongs on the Play/Pause control, not in the topbar.

```text
.app-shell
└── .lab-frame
    ├── header.topbar
    ├── nav.system-bar
    ├── main.sim-grid
    │   ├── section.stage
    │   │   ├── .stage-top
    │   │   ├── .canvas-shell > #canvas-holder
    │   │   ├── .visual-note? (only for a real limitation)
    │   │   └── .readouts[.readouts--dense]
    │   └── aside.controls
    │       ├── .control-title + .control-intro
    │       ├── mode-specific .control-row groups
    │       └── .button-grid
    └── footer.theory-strip > 2 × .theory-card
```

The optional `.visual-note` pattern already exists with the same declaration in Projectile Motion and Doppler Effect. If a Chapter 8 page needs it, promote that proven rule to `shared/sim-style.css` before a third copy is introduced; otherwise keep the limitation in the canvas label or right theory card.

```text
Desktop (>800 px)
┌─────────────────────────────────────────────────────────────┐
│ Topbar: topic kicker, title, Live Simulation chip          │
├─────────────────────────────────────────────────────────────┤
│ System bar: simulation mode                                 │
├───────────────────────────────────────┬─────────────────────┤
│ Stage heading                         │ Parameters heading  │
│ ┌───────────────────────────────────┐ │ mode-specific       │
│ │ one responsive p5 canvas          │ │ controls            │
│ └───────────────────────────────────┘ │                     │
│ optional visual note                  │ button-grid         │
│ 4 or 8 live readouts                  │ Play / Reset / Step │
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

- Match the shared dimensions exactly: `.canvas-shell` is 350 px high on desktop and 280 px at `<=800px`; Materials Testing alone uses the existing `.compare-tall` modifier (460/360 px). Keep Heat Conduction and every Thermal Expansion mode at the standard height so mode changes do not shift the page.
- Put only the primary mutually exclusive simulation mode in `.system-bar`. Place secondary choices in the sidebar using the existing compact `.system-switch` pattern when they are discrete.
- Keep controls in teaching order: mode-specific system choice, independent quantities, then the standard `.button-grid` ordered Play/Pause, Reset, and Step (`.col-span-2`). Hide inactive control groups with `.hidden` rather than disabling a long mixed form.
- Use `.readouts` for four values or `.readouts.readouts--dense` for exactly eight. Keep cells, labels, and order stable within a mode during playback; show `Not applicable` or `Not calculated` where needed instead of leaving stale values or creating layout gaps. Slider values already visible in `.control-value` do not need duplicate readout cells.
- Give each `.theory-strip` two permanent `.theory-card` slots. The left card contains the LO wording and governing equation; the right card contains `What to notice`, the active limitation, or the sign convention. Toggle nested mode content rather than replacing the card elements.
- Use the shared page breakpoints at 800 px and 460 px. Separately, redraw the internal canvas composition below 560 canvas pixels instead of shrinking desktop labels; test 320 px as a viewport, not as another CSS breakpoint unless implementation evidence requires one.

## 3. Phased delivery

### Phase 0 — Chapter foundation and acceptance baseline

**Goal:** Lock conventions shared by all three simulations before implementing physics.

**Tasks:**

- Create `animations/08-physics-of-matter/` and the three topic folders listed above.
- Record the Topic 8 LO text and equations from the local curriculum PDF in each simulation's implementation notes; do not rely on older SP015 sources where rotation was Topic 8.
- Define a common Chapter 8 graph presentation: labelled axes with units, a visible current-state marker, solid active curves, dashed/dotted comparison or continuation curves, explicit `Schematic` labels where applicable, and no meaning carried by color alone.
- Establish responsive stage geometry for 1440, 800, 460, and 320 px widths. Apparatus and graph may sit side by side on wide canvases and stack within the same canvas at narrow widths.
- Establish accessibility wording for every canvas through adjacent headings, readouts, and dynamic summaries; canvas graphics remain supplementary rather than the only source of a result.
- Resolve the existing duplicated `.visual-note` rule into `shared/sim-style.css` if any Chapter 8 design uses that pattern; verify Projectile Motion and Doppler Effect remain visually unchanged after removing their local copies.
- Add or verify exactly one landing metadata entry for each Chapter 8 lab after its title, folder name, and outcomes are fixed. Use the curriculum title `Physics of Matter` exactly. Keep `href: null` and `status: 'planned'` until the corresponding implementation phase passes QA; never create a second entry if planned metadata already exists.

**Exit criteria:**

- Folder names and public physics concepts are fixed; each file split and callback set has a written complexity rationale.
- Every equation and qualitative behavior is mapped to an SP015 sub-LO.
- No unresolved shared UI, graph, unit, or responsive convention remains.
- Existing simulation behavior is unchanged; any cross-simulation edit is limited to the explicitly verified `.visual-note` promotion, and unrelated dirty-worktree files are untouched.

### Phase 1 — Materials Testing Lab (SP015 8.1 and 8.2)

**Goal:** Teach how specimen geometry connects force/elongation to stress/strain, then distinguish idealized ductile and brittle responses.

#### Modes and controls

- **Elastic measurement** mode: adjustable loading type (`tension` or `compression`), original length `L0` (0.50–2.00 m, default 1.00 m), area `A` (25–200 mm², default 100 mm²), Young's modulus `Y` (20–250 GPa, default 200 GPa), and a non-negative target deformation up to 0.25% strain. The loading type supplies the sign.
- **Material comparison** mode: idealized `ductile` and `brittle` presets. Keep this mode schematic: hide the quantitative geometry and Young's-modulus controls, use normalized graph axes, and avoid implying that the presets are measured materials.
- Both modes share a normalized loading-progress control from unloaded to the selected target/fracture point. Playback advances progress at a fixed bounded rate; Step advances one fixed increment; Reset returns progress to zero while preserving mode, target deformation, and other selected parameters.

#### Suggested layout

Use `.canvas-shell.compare-tall` because the specimen and both curriculum graphs must remain visible together. Do not add another topic-specific canvas height.

```text
Wide canvas
┌─────────────────┬──────────────────────────┐
│ TESTING MACHINE │ σ–ε graph               │
│ force arrows    │ current point + regions │
│ specimen        ├──────────────────────────┤
│ L₀ / ΔL guides  │ F–ΔL graph              │
│ state badge     │ marker; U area (elastic)│
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

- Allocate approximately 38% of wide-canvas width to the testing machine and 62% to two equal graph rows. On compact canvases, allocate roughly one-third of the available 360 px height to each region and abbreviate annotations before reducing type below the established canvas-label scale.
- Place `Elastic measurement` / `Material comparison` in the system bar. In comparison mode, place the ductile/brittle selector first in the controls, followed by loading progress; keep geometry controls in elastic mode only.
- Use a persistent state badge beside the specimen (`Elastic`, `Yielding`, `Plastic`, `Necking`, or `Fractured`) and mirror the same state at the graph marker; do not rely on curve color.
- Use one stable eight-cell dense readout grid ordered as strain, stress, force, `ΔL`, `Y`, strain energy, energy density, and loading state. In schematic comparison mode, keep the cells but change the first four to clearly labelled normalized values and show `Not applicable — schematic` for `Y` and energy rather than hiding cells or displaying derived-looking numbers.
- The theory cards remain below the entire stage/controls grid so the graph area is not compressed by explanatory prose.

#### Physics model and public interface

- Implement `ElasticSpecimen` for the quantitative elastic region:
  - stored independent values: loading type, `L0`, `A`, `Y`, and non-negative deformation magnitude;
  - getters: signed `deltaL` from loading type, `strain = deltaL / L0`, `stress = Y * strain`, `force = stress * A`, `strainEnergy = 0.5 * Math.abs(force * deltaL)`, and `energyDensity = 0.5 * Math.abs(stress * strain)`;
  - preserve the tensile/compressive sign in stress, strain, force, and deformation rendering while keeping energy non-negative.
- Implement `IdealizedMaterialCurve` for schematic comparison presets:
  - ductile curve: linear elastic region, yield transition, plastic strain hardening, necking, and fracture;
  - brittle curve: nearly linear elastic region followed by abrupt fracture with no plastic plateau;
  - expose normalized curve points, normalized force/elongation values, and semantic region labels, not claimed real-world material constants.
- Public mutators validate finite values and configured limits; invalid mode, preset, or geometry values throw errors rather than silently clamp.

#### Rendering and UI behavior

- Render a testing-machine specimen with force arrows, original/current gauge length, and exaggerated deformation accompanied by an explicit “visual deformation exaggerated” note.
- Elastic mode shows linked stress–strain and force–elongation views with the current point, initial gradient, and triangular strain-energy area.
- Keep signed graph origins stable: tension plots in the positive stress/strain and force/elongation directions, compression plots in the negative directions, and the shaded triangular area is labelled as a non-negative energy magnitude.
- Comparison mode keeps both idealized ductile and brittle force–elongation curves visible for direct comparison. The selected preset drives the specimen and current marker; distinguish the other curve with line style and a text legend, and label elastic, plastic, necking, and fracture regions without relying on color.
- In elastic mode, show live readouts for `ΔL`, strain, stress, force, `Y`, strain energy, and energy density. Convert Pa to MPa/GPa and m to mm only in UI formatting. In comparison mode, show only normalized progress/curve values and semantic state.
- State that `U = 1/2 FΔL` and `u = 1/2 σε` are applied to the linear elastic loading represented by the triangular graph area; do not apply the triangle formula to the plastic portion.

#### Verification and exit criteria

- At `ΔL = 0`, stress, strain, force, and energy are zero.
- Doubling `Y` doubles stress and force at fixed strain; doubling area doubles force but leaves stress/strain unchanged; doubling `L0` halves strain at fixed `ΔL`.
- Compression produces negative stress/strain/force but non-negative stored strain energy.
- Ductile and brittle graphs remain visibly and semantically distinct without color.
- Play, Pause, Step, Reset, mode changes, resize, readout diffing, and paused redraw all pass.
- Mark its landing card completed only after desktop/mobile and keyboard QA passes.

#### Phase 1 implementation record — completed 2026-09-03

- Added the Level 3 global-mode Materials Testing Laboratory under `animations/08-physics-of-matter/8.1-8.2-materials-testing/`, including deterministic Node assertions for the quantitative model and normalized material curves.
- Verified zero/default/compression results, modulus/area/length scaling, curve bounds and semantic states, invalid-input rejection, JavaScript syntax, required DOM IDs, local assets, script order, and `git diff --check`.
- Exercised Play/Pause, replay from completion, Step, Reset, mode/preset changes, progress persistence, and synchronized `aria-pressed` state with a Firefox interaction harness.
- Inspected Firefox renders at 1440, 800, 460, and 320 px, including the comparison and brittle-fracture states. The initial paused frame, compact composition, specimen gap, normalized labelling, and solid/dashed curve identities remained visible.
- Promoted the third identical `.visual-note` use into `shared/sim-style.css` and regression-rendered Projectile Motion and Doppler Effect without a visual change.
- Safari 26.6.1 is present, but its local “Allow remote automation” setting is disabled; automated Safari smoke testing remains an environment-side follow-up and is not claimed as passed.
- Published only Topics 8.1–8.2. Heat Conduction and Thermal Expansion remain planned with null landing links, so this active Chapter 8 plan stays in place for Phases 2–5.

### Phase 2 — Heat Conduction Lab (SP015 8.3)

**Goal:** Quantitatively model steady one-dimensional conduction through one or two insulated rods and qualitatively compare the non-insulated temperature profile.

#### Modes and controls

- **Insulated quantitative** mode with one-rod/two-rods-in-series selector.
- **Non-insulated qualitative** mode showing lateral heat loss and the resulting curved temperature–distance profile; label it schematic and suppress unsupported quantitative heat-rate claims.
- Controls for hot temperature (20–150 °C, default 100 °C), cold temperature (0–100 °C, default 20 °C), rod length (0.20–1.00 m each, default 0.50 m), cross-sectional area (1–10 cm², default 4 cm²), and conductivity (10–400 W m⁻¹ K⁻¹, defaults 200 and 50 for rods A/B).
- Enforce `Thot > Tcold` in the UI with a clear validation message and preserve the last valid state. Limit the system to two rods in series.

#### Suggested layout

Use the standard `.canvas-shell` height. Make the temperature profile a direct vertical projection of the rod system by aligning both to the same horizontal material boundaries.

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
- Use one stable eight-cell dense grid ordered as heat rate, interface temperature, total resistance, boundary `ΔT`, rod A resistance, rod B resistance, arrangement, and model basis. Conductivity, length, and area remain visible beside their sliders and are not duplicated below the canvas. Show `Not applicable` for the interface/rod B cells in one-rod mode; in qualitative mode show `Not calculated` in quantitative cells and `Schematic — side loss` in the model cell.
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
- Show live readouts for per-rod resistance, total resistance, total heat rate, boundary temperature difference, and interface temperature when applicable. Keep each rod's `k`, `L`, and `A` in its existing slider output.
- Playback animates heat-flow tracers only; it must not imply a transient temperature solution. Parameter changes update the steady-state solution and DOM readouts immediately. The animation loop advances only bounded tracer phase and redraws the canvas; it does not call `updateReadouts()`.

#### Verification and exit criteria

- Equal rods produce an interface temperature halfway between boundary temperatures.
- Doubling area or conductivity doubles heat rate for a single rod; doubling length halves it.
- For two rods, computed temperature drops are proportional to their thermal resistances and the graph is continuous at the interface.
- Heat-flow arrows always point hot to cold and the sign convention is explained once in the theory strip.
- No third rod can be added; non-insulated mode never displays a falsely precise heat-rate calculation.
- Mark its landing card completed only after functionality, responsive, and accessibility QA passes.

#### Phase 2 implementation record — completed 2026-09-06

- Added the Level 3 global-mode Heat Conduction Laboratory under `animations/08-physics-of-matter/8.3-heat-conduction/`, with pure one/two-rod conduction models, a separate qualitative side-loss profile, and deterministic physics/controller tests.
- Verified thermal resistance, heat-rate scaling, equal and unequal series interfaces, continuous boundary profiles, signed gradients, validation failures, bounded tracer playback, and parameter-preserving Reset behavior.
- Exercised the insulated/non-insulated modes, one/two-rod switch, invalid-temperature recovery, Play/Pause, Step, Reset, and keyboard activation in the in-app browser; toggle state and accessible status text stayed synchronized.
- Inspected 1440, 800, 460, and 320 px layouts. The apparatus-to-graph interface alignment, schematic labelling, non-calculated qualitative readouts, 44 px interactive targets, and horizontal overflow checks passed with no browser console warnings or errors.
- Published the existing Topic 8.3 landing card with its canonical singular-folder link. Thermal Expansion remains planned, so the Chapter 8 plan stays active for Phases 3–5.

#### Phase 2 composite heat-loss extension — completed 2026-09-06

- Extended the qualitative mode to support two exposed rods and both mixed orientations: Rod A insulated/Rod B exposed and Rod A exposed/Rod B insulated.
- Added continuous, bounded composite profiles with segment identity, locally curved exposed sections, linear insulated sections, a shared schematic interface, and an aligned fully insulated reference.
- Kept all exposed cases explicitly non-quantitative: heat rate, interface temperature, resistance, and gradient claims are suppressed while the boundary temperature difference remains available.
- Verified all three exposure patterns, invalid-pattern rejection, profile endpoints/continuity/monotonicity, parameter persistence, interface movement with rod length, tracer-only Reset behavior, keyboard operation, and synchronized switch states in deterministic tests and the browser.
- Rechecked the mixed and both-exposed cases at 1440, 800, 460, and 320 px. Segment jackets, loss arrows, line styles, 44 px switch targets, interface alignment, horizontal overflow, and browser console checks passed.
- Added conductivity-responsive qualitative steepness, physical distance labels on the graph x-axis, a Rod A/Rod B parameter toggle with persistent independent values, and additional bounded side-loss tracers for exposed segments; the quantitative insulated model and non-insulated caveats remain unchanged.
- Reverified the shared rod-parameter panel, active-rod summaries, conductivity controls, compact 320 px layout, and final tracer presentation after the completion polish.

### Phase 3 — Thermal Expansion Lab (SP015 8.4)

**Goal:** Compare linear, area, volume, and liquid-in-container expansion using the same temperature change and consistent coefficient relationships.

#### Modes and controls

- Four modes: `linear`, `area`, `volume`, and `liquid-container`.
- Common temperature-change control from −50 to +150 K (default +50 K), supporting both contraction and expansion.
- Linear mode: `L0` 0.50–5.00 m (default 1.00 m) and `α` 5–30 × 10⁻⁶ K⁻¹ (default 12 × 10⁻⁶ K⁻¹).
- Area mode: `A0` 0.25–4.00 m² (default 1.00 m²); derive `β = 2α` rather than storing it independently.
- Volume mode: `V0` 0.10–2.00 m³ (default 1.00 m³); derive `γ = 3α`.
- Liquid-container mode: container capacity 0.50–2.00 L (default 1.00 L), initial fill fraction 50–100% (default 100%), container `α` 5–30 × 10⁻⁶ K⁻¹, and liquid `γ` 0.20–1.20 × 10⁻³ K⁻¹. Derive initial liquid volume from capacity and fill fraction so changing capacity cannot create invalid stored state.

#### Suggested layout

Use the standard `.canvas-shell` height in every mode and a before/after measurement plate rather than a generic graph. The signature visual is a precise original outline overlaid with an exaggerated final outline and dimension guides.

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

- Put the four expansion modes in the system bar; use the shared wrapping behavior and add equal-width topic rules only if the 460/320 px checks require them, while retaining `aria-pressed` and logical DOM order.
- Give approximately 72% of wide-canvas width to the physical comparison and 28% to the change magnifier. The magnifier explicitly separates exaggerated display displacement from the exact computed change.
- Render linear mode as a fixed-origin rod, area mode as nested rectangular outlines, and volume mode as nested isometric boxes. Expansion/contraction occurs symmetrically where the physical mounting does not fix an origin.
- Render liquid mode as side-by-side initial/final vessel cross-sections. Use separate outline styles for container and liquid, a capacity line, and an overflow path only when the computed overflow is positive.
- Group controls as `Initial size`, `Material coefficient`, and `Temperature change`; reveal a separate `Liquid` group only in liquid-container mode.
- Keep one stable eight-cell dense grid. The first row is initial value, final value, dimensional change, and current `ΔT`; the second row is `α`, derived `β`/`γ`, apparent liquid expansion, and overflow as applicable. Update labels for the active dimension but do not reorder cells; use `Not applicable` for concepts outside the active mode.
- Change the right theory card by mode to explain `β = 2α`, `γ = 3α`, or apparent liquid expansion without replacing the left LO/equation card's position.

#### Physics model and public interface

- Implement one `ThermalExpansionState` with mode-specific stored initial dimensions, `alpha`, the currently applied `deltaT`, and liquid coefficient where applicable. The controller separately owns the selected target `ΔT` and normalized playback progress so Reset can return the applied change to zero without changing the slider target.
- Derived getters implement:
  - `deltaL = alpha * L0 * deltaT`;
  - `beta = 2 * alpha` and `deltaA = beta * A0 * deltaT`;
  - `gamma = 3 * alpha` and `deltaV = gamma * V0 * deltaT`;
  - container capacity change from the container's derived `gamma`;
  - liquid volume change from the independent liquid `gamma`;
  - `gammaApparent = gammaLiquid - gammaContainer` and `deltaVApparent = gammaApparent * initialLiquidVolume * deltaT`;
  - overflow as `max(0, finalLiquidVolume - finalContainerCapacity)`.
- Convert litres to cubic metres at the UI/controller boundary; all capacity and liquid calculations remain in SI internally.
- Preserve signed dimensional changes for cooling while preventing physically impossible negative final dimensions through configured ranges and validation.

#### Rendering and UI behavior

- Render before/after outlines with dimension guides and a numeric scale statement; exaggerate visible expansion while keeping computed values exact.
- Area and volume modes must expand all relevant dimensions, not only stretch one axis.
- Liquid mode renders both the expanding container and liquid level, distinguishing real liquid expansion, container expansion, apparent expansion, and overflow.
- Show live initial/final dimensions, coefficient relationships, `ΔT`, dimensional change, and overflow where applicable.
- Playback sweeps normalized progress from 0 to the selected target `ΔT`; Step advances one fixed configured fraction; Reset returns the applied `ΔT` to zero while preserving mode and parameters. Because the current `ΔT` and dimensions change during the sweep, only those time-dependent readouts update per frame.
- Theory text states that temperature differences have the same numerical value in K and °C, while coefficients are displayed in K⁻¹.

#### Verification and exit criteria

- Zero `ΔT` gives zero change in every mode; negative `ΔT` produces contraction.
- Doubling the initial dimension, coefficient, or `ΔT` doubles the corresponding change.
- `β = 2α` and `γ = 3α` are always derived and cannot drift from `α`.
- A container overflows only when the liquid's final volume exceeds the expanded capacity; equal liquid/container volume coefficients produce no apparent expansion, including for a partially filled container.
- Mode switches preserve common temperature and coefficient state where meaningful and redraw immediately while paused.
- Mark its landing card completed only after functionality, responsive, and accessibility QA passes.

#### Phase 3 implementation record — completed 2026-09-06

- Added the Level 3 global-mode Thermal Expansion Laboratory with Linear, Area, Volume, and Liquid + container modes, a controller-owned temperature sweep, a stable eight-cell readout grid, and exaggerated measurement geometry paired with exact numerical results.
- Verified the first-order SP015 relationships, heating/contraction signs, proportional scaling, derived coefficients, partial-fill liquid state, apparent expansion, overflow thresholds, invalid-input rejection, bounded playback, replay, Step, Reset, and parameter persistence in deterministic tests.
- Exercised every mode, keyboard activation, target-temperature changes, heating/cooling, overflow, Play/Pause/Step/Reset, and synchronized `aria-pressed` state in the browser. The 1440, 800, 460, and 320 px layouts had no horizontal overflow; console warning/error checks were empty.
- Promoted the 8.4 landing card and curriculum coverage rows only after its functionality and responsive checks passed. No new shared helper or architecture pattern was required.

### Phase 4 — Repository integration and documentation

**Goal:** Make Chapter 8 discoverable and document only patterns that became real during implementation.

**Tasks:**

- Ensure the generic “Next SP015 topic” placeholder has been replaced by exactly three Chapter 8 cards, then add or verify recognizable static diagrams:
  - tensile specimen plus stress–strain curve;
  - two-material rod plus temperature gradient;
  - before/after expansion outlines.
- Promote each card from planned to completed only after its individual phase exits; completed cards receive exactly one semantic launch anchor and planned cards remain inert.
- Update the landing coverage table and README curriculum coverage after each simulation is completed, not before.
- Verify and, after implementation, finalize the three Chapter 8 rows in `instructions/physics.md` with their exact LO focus and documented simplifications; do not duplicate rows that already exist.
- Update `docs/architecture.md` only if implementation introduces a new reusable graph helper, validation convention, or other pattern actually used by at least two simulations.
- Check all three implementations for a second copy of graph axes, current-point markers, dimension guides, or dynamic summaries. Promote only a stable ctx-explicit abstraction into `shared/`.

**Exit criteria:**

- Landing search/filter finds Chapter 8, Physics of Matter, and each subtopic.
- Card diagrams remain accurate at thumbnail scale and decorative meaning is duplicated in card text.
- All relative links and local runtime assets resolve when served from the repository root.
- Documentation describes the implementation that exists rather than planned abstractions.

### Phase 5 — Cross-simulation QA and plan completion

**Goal:** Verify curriculum correctness, regression safety, and release readiness across the full Chapter 8 set.

**Automated/static checks:**

- Run `node --check` on every new JavaScript script.
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

- Save QA evidence under `docs/plan/completed/evidence/chapter-08-physics-of-matter/` grouped by simulation and viewport.
- Record final checks and any accepted limitations in this document.
- Move this plan to `docs/plan/completed/` only when all three simulations, landing integration, documentation, and QA exit criteria pass.

#### Chapter 8 completion record — completed 2026-09-06

- Re-ran every Chapter 8 deterministic test and JavaScript syntax check, then checked DOM IDs, local runtime paths, script order, raw canvas colors, raw math entities, and whitespace integrity across the completed simulations.
- Confirmed the landing metadata exposes exactly one launch link for each completed Chapter 8 lab and that README/landing curriculum status matches the implemented files.
- Accepted limitation: the in-app browser provided exact responsive viewport checks but no persistent screenshot export; the reproducible QA observations and command results are recorded under the completed-plan evidence directory.

## 4. Interfaces and callback contracts

Use the same lifecycle callback names across the chapter where applicable:

- `onModeChange(mode)`
- `onPlayToggle(isPlaying)`
- `onStep()`
- `onReset()`

Use explicit physics-named parameter callbacks such as `onLengthChange(value)`, `onAreaChange(value)`, or `onHotTemperatureChange(value)`, matching the established simulations. Do not introduce a chapter-wide stringly typed `onParamChange(name, value)` dispatcher solely for uniformity.

Each UI manager exposes `on(callbacksMap)`, `setMode(mode)`, `setPlaying(isPlaying)`, and `updateReadouts(values)`. Heat Conduction additionally exposes `showValidation(messageOrNull)` for the boundary-temperature constraint. Every UI manager caches and validates required DOM nodes once, synchronizes `is-active` and `aria-pressed`, and requests no physics or drawing work directly. Controllers preserve the last valid state, reject unknown modes/invalid values, and request a redraw after every accepted change while paused.

Physics classes expose only domain operations and derived getters. Renderers receive an explicit p5 context plus an immutable frame-state object assembled by the controller; they do not receive the UI manager or mutate physics state.

## 5. Assumptions and exclusions

- The three-simulation split is fixed; 8.1 and 8.2 share one Materials Testing Lab because their quantities and graphs are directly coupled.
- Idealized brittle/ductile curves are preferred over named real-material datasets.
- All simulations use one global-mode canvas; HTML readout panels remain outside the canvas.
- The Materials Testing comparison mode is normalized and schematic; quantitative geometry, modulus, and strain-energy calculations remain in Elastic measurement mode.
- Conduction is steady-state. Non-insulated behavior is qualitative because convection/fin equations are outside SP015 8.3.
- Small-strain isotropic relationships `β = 2α` and `γ = 3α` are used exactly as stated by SP015.
- No build system, framework, network dependency, backend, data persistence, audio, or user-generated export is added.
- Existing public APIs and shared styles remain compatible. Any shared-helper extraction must be justified by at least two actual repository consumers and documented after implementation; the already-duplicated `.visual-note` rule qualifies if Chapter 8 needs it.
