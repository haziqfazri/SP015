# Chapter 9 Kinetic Theory of Gases and Thermodynamics — Simulation Implementation Plan

**Status:** Active

**Created:** 2026-09-07

**Last reviewed:** 2026-09-07

**Curriculum source:** `Curriculum Specifications (CS) Physics SP015.pdf`, Topic 9 (effective from the 2022/2023 session)

## 1. Summary

Implement three standalone simulations under `animations/09-kinetic-theory-and-thermodynamics/`:

1. **Molecular Gas Laboratory** — SP015 9.1 and 9.2
2. **First Law Energy Ledger** — SP015 9.3
3. **Thermodynamic Process Workbench** — SP015 9.4 and 9.5

The three-simulation split is deliberate. Topics 9.1 and 9.2 use the same ideal-gas state and are strongest when molecular motion, rms speed, equipartition, and internal energy can be compared in one laboratory. Topic 9.3 needs a focused sign-convention and energy-accounting tool. Topics 9.4 and 9.5 belong together because process definitions, P–V paths, and work as area under a curve are inseparable.

Build in curriculum order. The Molecular Gas Laboratory establishes the chapter's gas-state notation and 3D-model caveats. The First Law Energy Ledger then establishes the repository-wide thermodynamic sign convention before the Process Workbench applies that convention to expansion and compression paths.

| Simulation | Primary teaching question | Provisional architecture |
| --- | --- | --- |
| Molecular Gas Laboratory | How do temperature, molecular mass, and degrees of freedom determine molecular speed and gas energy? | Level 3, one global-mode canvas |
| First Law Energy Ledger | How do signed heat and work transfers change a gas's internal energy? | Level 2, one global-mode canvas |
| Thermodynamic Process Workbench | How do constraints shape P–V paths and determine work done by a gas? | Level 3, one global-mode canvas |

Recheck each architecture decision when implementation begins. Reduce the split if a proposed class or file would contain only boilerplate. None of the simulations needs synchronized independent canvases, so instance mode is not planned.

## 2. Curriculum and physics contract

### Curriculum mapping

| Simulation | Learning outcomes covered |
| --- | --- |
| Molecular Gas Laboratory | 9.1(a–d): assumptions of kinetic theory, rms speed, `v_rms = sqrt(<v²>)`, `v_rms = sqrt(3kT/m) = sqrt(3RT/M)`, `PV = (1/3)Nmv_rms²`, and `P = (1/3)rho v_rms²`; 9.2(a–f): translational kinetic energy, degrees of freedom, equipartition, and `U = (f/2)NkT` |
| First Law Energy Ledger | 9.3(a–b): `Delta U = Q - W` and quantitative energy accounting |
| Thermodynamic Process Workbench | 9.4(a–b): isothermal, isochoric, isobaric, and adiabatic processes and their P–V graphs; 9.5(a–b): work derived from P–V area for isothermal, isobaric, and isochoric processes |

### Chapter-wide notation and sign convention

- Use `N` for number of molecules and `n` for amount in moles. Never use the same UI label or code property for both.
- Use `m` for one molecule's mass and `M` for molar mass. Convert displayed `g mol⁻¹` to internal `kg mol⁻¹` at the UI/controller boundary.
- Use `rho` for gas mass density and `f` for molecular degrees of freedom.
- Use SI internally: K, Pa, m³, kg, kg mol⁻¹, mol, m s⁻¹, J, and J mol⁻¹ where applicable. Display kPa, L, or g mol⁻¹ only through explicit UI formatting.
- Apply the curriculum convention `Delta U = Q - W` everywhere:
  - `Q > 0`: heat transferred into the gas;
  - `Q < 0`: heat transferred out of the gas;
  - `W > 0`: work done by the gas on the surroundings;
  - `W < 0`: work done on the gas by the surroundings.
- Preserve signed work on P–V graphs: expansion gives positive area/work and compression gives negative work. Do not display unsigned “area” as though it were the signed thermodynamic result.
- Use `R` and `k` from one `PHYSICS` constant block per simulation, with documented values and sufficient precision. Do not scatter approximations through renderers or UI formatters.

### Pedagogical guardrails

- The molecular scene is a **representative 2D projection of an ideal 3D gas**. It must not imply that the 3D factor of three in kinetic-theory equations was derived from two screen dimensions.
- The displayed particles represent a small visual sample, not the physical value of `N`. Amount of gas and pressure calculations remain analytic.
- Particle motion may illustrate elastic wall collisions and random molecular directions, but collision counts from the animation must not drive the authoritative pressure readout. The screen sample is too small and time-scaled for that to be a stable thermodynamic measurement.
- On-screen molecular speed is visually scaled. The exact SI speed appears in readouts; pixel speed is never presented as a literal metre-per-second mapping.
- For equipartition, use the SP015 teaching model `f = 3` for monatomic, `f = 5` for diatomic, and `f = 6` for the generic polyatomic option. State that vibrational contributions and temperature-dependent activation of degrees of freedom are outside scope.
- Adiabatic behavior in the Process Workbench is required for definition and P–V graph comparison under 9.4. Do not present an adiabatic work formula as an assessed 9.5 result. If `PV^gamma = constant` is used to construct a physically meaningful comparison curve, label it as supporting context and derive `gamma = (f + 2) / f` from the selected ideal-gas model.
- Avoid real-gas claims, named material-quality data, or laboratory-precision language. All gases are ideal and remain in physically valid positive-temperature, positive-pressure, and positive-volume ranges.

## 3. Shared architecture and interface contract

- Create one self-contained folder per simulation:
  - `9.1-9.2-molecular-gas-lab/`
  - `9.3-first-law-energy-ledger/`
  - `9.4-9.5-thermodynamic-process-workbench/`
- Use ordinary dependency-ordered scripts and pinned local runtime assets. Do not introduce ES modules, a framework, a build step, or a network dependency.
- Keep `PHYSICS`, `LIMITS`, and `DISPLAY` blocks as the single source of truth. HTML range attributes are fallbacks and are configured from `LIMITS` at startup.
- In Level 3 simulations, physics remains free of DOM/p5 access, renderer functions remain stateless, the UI manager is the sole DOM accessor, and the controller is the only bridge between UI and physics.
- For the provisional Level 2 First Law simulation, keep its energy model in a separate physics file. A compact application file may own DOM binding and orchestration if splitting UI and controller responsibilities would only create boilerplate; drawing remains in the sketch/renderer layer.
- Use `shared/sim-style.css`, `shared/sim-utils.js`, `PALETTE`, `updateReadout`, `renderMath`, `PlaybackState`, and the existing arrow/guide helpers. Add a shared graph helper only after at least two simulations demonstrate the same ctx-explicit abstraction.
- Start each simulation paused with a complete, nonblank frame. Play/Pause, Step, Reset, parameter changes, mode changes, and resize must redraw correctly while paused.
- Clamp every animation `dt` to at most 0.03 s. Bound visual particle state and any graph/history buffers.
- Update parameter-only readouts from the callback that changes them. Only transfer progress, collision animation summaries, or path state that genuinely changes with time may trigger per-frame readout updates.
- Use KaTeX 0.18.2 through the repository's local assets and `renderMath()`. Equations and symbols use `data-latex`; live numeric readouts remain plain text with units.
- Cite exact SP015 sub-LOs in file headers, non-obvious equation comments, and theory-strip content.

### Common layout direction

Retain the existing SP015 instrument-bench language. Each simulation should pair one memorable physical system with one precise analysis instrument:

```text
Desktop
┌─────────────────────────────────────────────────────────────┐
│ Topbar: Topic 9 title + Live Simulation chip               │
├─────────────────────────────────────────────────────────────┤
│ System bar: current teaching mode/process                   │
├───────────────────────────────────────┬─────────────────────┤
│ Physical system + analysis canvas     │ Parameters          │
│ Readouts beneath the canvas           │ Play / Reset / Step │
├───────────────────────────────────────┴─────────────────────┤
│ Governing equation / LO       │ What to notice / caveat     │
└─────────────────────────────────────────────────────────────┘

Tablet/mobile
┌───────────────────────────────┐
│ Topbar + mode switch          │
│ Canvas                        │
│ Readouts                      │
│ Controls                      │
│ Theory cards                 │
└───────────────────────────────┘
```

- Use the standard shared breakpoints at 800 px and 460 px, plus an internal canvas composition change below approximately 560 canvas pixels where needed.
- Test 1440, 800, 460, and 320 px viewport widths. Do not add another CSS breakpoint without evidence that the shared layout cannot accommodate the content.
- Keep the visual meaning redundant with text, line style, labels, and readouts. Color alone cannot identify heat direction, process type, or positive/negative work.
- Use one stable four- or eight-cell readout grid per mode. Do not reorder cells during playback or leave stale values when a result is not applicable.

## 4. Phased delivery

### Phase 0 — Chapter foundation and acceptance baseline

**Goal:** Fix shared thermodynamic conventions before implementing any simulation.

**Tasks:**

- Create the Chapter 9 folder and the three topic folders only when implementation begins; do not add empty scaffolding solely to mark progress.
- Transcribe the exact Topic 9 LO wording and equations from the local curriculum PDF into implementation notes and theory-strip copy.
- Fix the `N`/`n`, `m`/`M`, `Q`, and `W` naming conventions from Section 2 before defining public physics interfaces.
- Define a common P–V graph grammar: axes always include units, active path is solid, comparison paths use distinct dash patterns and direct labels, current state has a visible marker, process direction has an arrow, and work area uses a labelled signed treatment.
- Define chapter accessibility language for projected particle motion, heat-flow direction, piston motion, graph paths, and current numerical state so canvas visuals remain supplementary.
- Add one planned landing metadata entry per lab after titles and paths are fixed. Use chapter name `Kinetic Theory of Gases and Thermodynamics`, `href: null`, and `status: 'planned'` until that lab passes its own QA.
- Confirm whether P–V axes and current-point rendering duplicate a proven helper in another simulation. Promote code into `shared/` only after two real consumers share the same interface.

**Exit criteria:**

- Every visible equation and process behavior maps to a specific Topic 9 sub-LO.
- Folder names, titles, notation, sign convention, architecture level, and explicit exclusions are settled.
- Planned landing entries are unique and inert.
- Existing simulation behavior and unrelated working-tree changes remain untouched.

### Phase 1 — Molecular Gas Laboratory (SP015 9.1 and 9.2)

**Goal:** Connect ideal-gas assumptions and representative molecular motion to rms speed, translational kinetic energy, degrees of freedom, pressure, and internal energy.

#### Modes and controls

- Two modes in the system bar:
  - **Molecular motion** — velocity vectors, elastic wall collisions, rms construction, and pressure relationships;
  - **Energy and degrees of freedom** — translational energy, equipartition, and internal energy comparison.
- Common controls:
  - temperature `T`: 100–1000 K, default 300 K;
  - amount `n`: 0.25–2.00 mol, default 1.00 mol;
  - volume `V`: 5–50 L, default 24 L, converted to m³ internally;
  - molar mass `M`: 2–60 g mol⁻¹, default 28 g mol⁻¹, converted to kg mol⁻¹ internally;
  - molecular category: monatomic (`f = 3`), diatomic (`f = 5`), or generic polyatomic (`f = 6`).
- Keep the rendered sample size fixed and modest. Do not map one dot to one real molecule or make visual dot count the stored thermodynamic `N`.
- Playback advances projected molecule positions and collision flashes. Step advances one fixed visual interval. Reset regenerates the same documented deterministic sample state or a seeded equivalent while preserving thermodynamic controls and mode.

#### Suggested canvas composition

```text
Molecular motion — wide canvas
┌──────────────────────────────┬───────────────────────┐
│ projected gas container      │ RMS speed instrument  │
│ particles + velocity vectors │ speed bars / <v²>     │
│ wall collision flashes       │ pressure identities   │
└──────────────────────────────┴───────────────────────┘

Energy mode — wide canvas
┌──────────────────────────────┬───────────────────────┐
│ molecule/category model      │ equipartition ledger  │
│ translational motion         │ f equal energy shares │
│ active degrees highlighted   │ K_trans and U totals  │
└──────────────────────────────┴───────────────────────┘
```

- Stack the physical scene above the analysis instrument below approximately 560 canvas pixels.
- Keep a persistent `Representative 2D projection` label inside the molecular-motion scene and repeat the 3D caveat in the adjacent theory card.
- Use direct vector/energy-channel labels and line styles so molecular category and energy allocation remain understandable without color.
- Use a stable eight-cell readout grid: `T`, `M`, `v_rms`, pressure, mean translational kinetic energy per molecule, `f`, internal energy, and amount/number of molecules. Update wording rather than order when switching modes.

#### Physics model and public interface

- Implement an analytic `IdealGasState` with independent stored values `temperature`, `amount`, `volume`, `molarMass`, and `degreesOfFreedom`.
- Derived getters include:
  - `moleculeCount = n * N_A`;
  - `moleculeMass = M / N_A`;
  - `density = n * M / V`;
  - `rmsSpeed = sqrt(3 * R * T / M)` and the equivalent molecular form;
  - `pressure = n * R * T / V`;
  - `kineticPressure = (1 / 3) * density * rmsSpeed²`;
  - `meanTranslationalEnergy = (3 / 2) * k * T`;
  - `internalEnergy = (f / 2) * n * R * T`.
- Validate finite, positive state and configured limits. Derived identities should be tested against one another rather than stored twice.
- Keep projected molecule positions/directions in a separate bounded visual ensemble. Generate a deterministic set of dimensionless speed factors normalized so its sample rms is one, then scale displayed SI labels from the analytic `rmsSpeed`. Visual pixel speed uses a separate `DISPLAY` mapping.
- Particle–wall and optional particle–particle collisions are illustrative and elastic. They cannot mutate temperature, pressure, internal energy, or the authoritative rms result.

#### Verification and exit criteria

- `sqrt(<v²>)`, `sqrt(3kT/m)`, and `sqrt(3RT/M)` agree within numerical tolerance.
- Doubling temperature multiplies `v_rms` by `sqrt(2)`; doubling molar mass divides it by `sqrt(2)`.
- `nRT/V`, `(1/3)rho v_rms²`, and `(1/3)Nmv_rms²/V` agree.
- Mean translational energy is independent of molecular mass at fixed temperature.
- Internal energy scales linearly with `f`, `n`, and `T`; changing volume alone does not change `U` for the ideal-gas state.
- The fixed visual sample remains bounded, preserves speed magnitudes through elastic wall reflection, and does not accumulate or drive thermodynamic state.
- Every kinetic-theory assumption appears in concise on-screen/theory text without claiming that the animation proves it.
- Promote the landing card only after physics, browser, responsive, keyboard, and accessibility checks pass.

#### Implementation record — completed 2026-09-07

- Implemented the Level 3 global-mode laboratory at `animations/09-kinetic-theory-and-thermodynamics/9.1-9.2-molecular-gas-lab/` with separate physics, renderer, UI, controller, and sketch files.
- Implemented the analytic three-dimensional ideal-gas state, deterministic 36-particle projected ensemble, elastic wall and equal-mass pair collisions, bounded collision flashes, both presentation modes, all specified controls, mode-specific eight-cell readouts, and the 9.1–9.2 theory cards.
- Deterministic Node tests pass for the two rms identities, temperature and molar-mass scaling, all three pressure identities, equipartition and internal-energy scaling, setter validation, collision invariants, 1,000 bounded ensemble steps, deterministic reset, controller playback/reset behavior, readout-write discipline, and wide/compact renderer geometry.
- Browser acceptance passed at 1440, 800, 460, and 320 CSS-pixel viewports. A 400 CSS-pixel reflow check covered the effective layout width of an 800-pixel viewport at 200% zoom. Both modes, all sliders and categories, Play/Pause/Step/Reset, keyboard activation, replay, and resize were exercised with no console warnings or errors.
- Static checks pass for JavaScript syntax, unique DOM IDs, local runtime assets, required script order, topic-code palette usage, physics-layer DOM isolation, KaTeX notation, trailing whitespace, and `git diff --check`.
- Promoted the completed landing card and Chapter 9 filter after QA, updated the catalogue totals to 12 labs across five chapters, and added README and physics-convention coverage entries. No reusable architectural pattern was introduced, so `docs/architecture.md` remains unchanged.

#### Energy-mode 2.5D redesign record — completed 2026-09-09

- Replaced the split molecule-and-ledger canvas with one full-width perspective chamber while retaining the existing two-panel Molecular motion presentation unchanged.
- Added visual-only focus states for combined motion, the three translational axes, and category-supported rotations. Unsupported rotations remain visible but disabled, category changes fall back safely to combined motion, and Reset and mode changes preserve a valid selection.
- Rebuilt the displayed molecules from rigid local 3D coordinates: monatomic uses one sphere, diatomic uses two separated spheres and a double rod, and polyatomic uses a central sphere, three separated outer spheres, and visible rods. Projection applies depth scaling, opacity, atom sorting, and front-edge occlusion without changing the analytic gas state or energy equations.
- Removed the equipartition ledger visualization and obsolete ledger wording. The eight Energy readouts and the equipartition theory card remain authoritative and unchanged.
- Extended deterministic tests for focus validation and availability, fallback and persistence, readout-write isolation, full-width chamber bounds, perspective projection, rotation-length preservation, non-overlapping resting geometry, and isolated versus combined motion.
- Rechecked desktop, 800, 460, and 320 CSS-pixel layouts in the browser. The chamber, molecule, axes, focus labels, readouts, and controls remain legible without horizontal overflow; the 320-pixel check also covers the effective narrow layout at 200% zoom. Native buttons and disabled states expose the expected pressed and unavailable semantics.

### Phase 2 — First Law Energy Ledger (SP015 9.3)

**Goal:** Make the signs and balance in `Delta U = Q - W` unambiguous for heating, cooling, expansion work, and work done on a gas.

#### Controls and interaction

- Use one free-exploration mode with signed target controls:
  - heat transferred to the gas `Q`: −1500 to +1500 J, default +600 J;
  - work done by the gas `W`: −1500 to +1500 J, default +200 J;
  - initial temperature `T1`: 200–600 K, default 300 K;
  - amount `n`: 0.50–2.00 mol, default 1.00 mol;
  - molecular category `f`: 3, 5, or 6.
- Provide compact scenario buttons only if they materially improve instruction: `Heating`, `Expansion`, `Compression`, and `Cooling`. A scenario sets the signed targets but does not create a separate physics path.
- Playback sweeps a normalized transfer progress from zero to the selected `Q` and `W`. Step advances one fixed fraction. Reset returns progress to zero while preserving targets and gas parameters.
- Reject a target combination that would produce a non-positive final absolute temperature. Preserve the last valid state and show an accessible validation message.

#### Suggested canvas composition

```text
┌──────────────────┬───────────────────┬──────────────────┐
│ heat reservoir   │ gas energy store  │ piston/load      │
│ signed Q arrow   │ U1 → U2 ledger    │ signed W arrow   │
│ IN / OUT wording │ Delta U balance   │ BY / ON wording  │
└──────────────────┴───────────────────┴──────────────────┘
```

- Reverse arrow direction and update `into/out of gas` or `by/on gas` wording when a transfer changes sign. Never indicate sign using color alone.
- Show a central three-term ledger with the currently applied values, not only the targets.
- Use a stable readout grid for applied `Q`, applied `W`, `Delta U`, `U1`, `U2`, `T1`, `T2`, and the current verbal energy outcome.
- The theory strip states the sign convention in words alongside `Delta U = Q - W`.

#### Physics model and public interface

- Implement `FirstLawState` with independent stored `initialTemperature`, `amount`, `degreesOfFreedom`, target `heat`, and target `work`.
- The controller owns normalized playback progress. The state derives applied `Q` and `W` from the supplied progress rather than storing a second evolving energy total.
- Derived values include:
  - `initialInternalEnergy = (f / 2) * n * R * T1`;
  - `deltaInternalEnergy = Q - W`;
  - `finalInternalEnergy = U1 + Delta U`;
  - `finalTemperature = 2U2 / (f n R)`.
- Keep the model path-independent: it accounts for net transfers between two states and does not claim a specific isothermal, isobaric, isochoric, or adiabatic path.

#### Verification and exit criteria

- `Q = 0` and `W = 0` give `Delta U = 0` and `T2 = T1`.
- Positive heat with zero work increases internal energy by exactly `Q`.
- Positive work with zero heat decreases internal energy; negative work increases it.
- Equal positive `Q` and `W` give zero internal-energy change.
- Every sign combination produces matching arrows, words, equation values, and final temperature.
- Invalid non-positive final-temperature targets are rejected without corrupting previous state.
- Parameter-only readouts do not update every frame; only progress-dependent transfer/readout values do.
- Promote the landing card only after physics, browser, responsive, keyboard, and accessibility checks pass.

### Phase 3 — Thermodynamic Process Workbench (SP015 9.4 and 9.5)

**Goal:** Compare the defining constraints and P–V paths of four thermodynamic processes, then connect signed work to area under the curve for the three processes required by SP015 9.5.

#### Modes and controls

- Four process modes in the system bar: `Isothermal`, `Isobaric`, `Isochoric`, and `Adiabatic`.
- Common initial-state controls:
  - amount `n`: 0.50–2.00 mol, default 1.00 mol;
  - initial pressure `P1`: 50–300 kPa, default 100 kPa;
  - initial volume `V1`: 5–30 L, default 10 L.
- Path target:
  - isothermal, isobaric, and adiabatic: final volume `V2`, bounded away from zero and distinct enough from `V1` to show expansion or compression;
  - isochoric: final pressure `P2`, with `V2 = V1` derived.
- Adiabatic mode additionally selects molecular category so `gamma = (f + 2) / f` can construct a supporting comparison curve. Keep that control hidden in modes where it is irrelevant.
- Playback moves a normalized path parameter from state 1 to state 2. Step advances one fixed fraction. Reset returns to state 1 while preserving process and parameters.

#### Suggested canvas composition

```text
Wide canvas
┌──────────────────────────┬────────────────────────────┐
│ piston-cylinder          │ P–V graph                  │
│ heat/process constraint  │ active path + direction    │
│ state 1 → current state  │ signed work area           │
└──────────────────────────┴────────────────────────────┘

Compact canvas (<560 px)
┌───────────────────────────────────────────────────────┐
│ piston-cylinder + invariant label                    │
├───────────────────────────────────────────────────────┤
│ P–V graph + direct path label + signed area           │
└───────────────────────────────────────────────────────┘
```

- Keep both state markers visible and label the invariant directly: `T constant`, `P constant`, `V constant`, or `Q = 0`.
- Show expansion/compression direction on both piston and graph.
- In isothermal/isobaric modes, shade the applied area from `V1` to current `V` and display signed work. In isochoric mode, explicitly show that a vertical path has zero width and therefore zero area/work.
- In adiabatic mode, emphasize definition and graph shape. Show it as steeper than the isothermal comparison curve from the same initial state during expansion. Label quantitative adiabatic construction as supporting context and do not add it to the assessed-work formula card.
- Use a stable eight-cell grid: current `P`, current `V`, current `T`, `P1`, `V1`, target state, signed work, and process invariant. Show `Not required by SP015 9.5` for adiabatic work rather than a silent blank or an unscoped formula.

#### Physics model and public interface

- Implement one `ThermodynamicProcessState` parameterized by process type rather than four mostly duplicated classes.
- Store independent initial values `n`, `P1`, `V1`, process type, and the mode-appropriate target. Derive `T1 = P1V1 / (nR)`.
- At normalized progress `s` in `[0, 1]`, derive the current state from an explicit path parameter:
  - isothermal: interpolate volume, then `P = P1V1 / V` and `T = T1`;
  - isobaric: interpolate volume, then `P = P1` and `T = PV / (nR)`;
  - isochoric: interpolate pressure, then `V = V1` and `T = PV / (nR)`;
  - adiabatic supporting model: interpolate volume, then `P = P1(V1/V)^gamma` and `T = PV / (nR)`.
- Derived final work for assessed modes:
  - isothermal: `W = nRT ln(V2/V1) = P1V1 ln(V2/V1)`;
  - isobaric: `W = P(V2 - V1)`;
  - isochoric: `W = 0`.
- Current work uses the same formulas with current volume, so its value and shaded graph region remain synchronized during playback.
- Validate process type, finite values, positive state variables, configured limits, and mode-appropriate targets. Unknown processes and irrelevant target setters must fail loudly.

#### Verification and exit criteria

- Every process preserves its defining invariant throughout the path.
- At the initial state, work is zero. Expansion gives positive work and compression gives negative work for isothermal and isobaric paths.
- Isothermal work agrees with numerical area integration within a defined tolerance; isobaric work equals rectangular signed area; isochoric work remains exactly zero.
- Isothermal `PV` remains constant. Isobaric pressure and isochoric volume remain constant.
- The adiabatic comparison passes through the same initial state and, for expansion, falls more steeply than the isothermal path without being presented as a required 9.5 work derivation.
- Piston direction, graph arrow, state labels, shaded area, and signed work always agree.
- Mode changes preserve common initial-state values, configure relevant controls, synchronize `aria-pressed`, and redraw immediately while paused.
- Promote the landing card only after physics, browser, responsive, keyboard, and accessibility checks pass.

### Phase 4 — Repository integration and documentation

**Goal:** Make Chapter 9 discoverable and document only architecture that exists after implementation.

**Tasks:**

- Replace each planned Chapter 9 landing entry with a completed link only after that simulation's phase exit criteria pass.
- Add recognizable landing diagrams:
  - molecule container with velocity vectors for Molecular Gas Laboratory;
  - central energy ledger with inward/outward arrows for First Law Energy Ledger;
  - piston plus labelled P–V path for Thermodynamic Process Workbench.
- Update README curriculum coverage and landing filters/search after each completed simulation, not before.
- Add three Chapter 9 rows to `instructions/physics.md` with exact LO scope, sign convention, and simplifications after the implementations exist.
- Update `docs/architecture.md` only if Chapter 9 introduces a new reusable pattern used by at least two simulations, such as a shared graph-axis/path helper. Do not document planned abstractions as current architecture.
- Audit repeated gas constants, unit conversion, P–V plotting, current-point markers, and direction-arrow code. Extract only stable, ctx-explicit behavior with at least two actual consumers.

**Exit criteria:**

- Landing search and filtering find Chapter 9, each simulation title, and the key terms kinetic theory, rms speed, internal energy, First Law, thermodynamic process, and P–V work.
- Each completed card has exactly one semantic launch link; planned cards remain inert.
- All relative links and pinned local assets work when served from the repository root and when simulation HTML is opened directly where supported.
- README, landing metadata, `instructions/physics.md`, and the implemented folders agree on coverage and naming.

### Phase 5 — Cross-simulation QA and plan completion

**Goal:** Verify curriculum correctness, numerical identities, regression safety, and release readiness across the Chapter 9 set.

**Automated and static checks:**

- Run `node --check` on every new JavaScript file.
- Add deterministic physics assertions for all equations, equivalent identities, scaling relationships, signs, process invariants, boundary values, and invalid-state rejection listed in Phases 1–3.
- Check required and duplicate DOM IDs, dependency/script order, local asset paths, and `git diff --check`.
- Search for raw math entities, inline canvas color literals, ambiguous `N`/`n` or `m`/`M` labels, unconditional per-frame parameter readouts, uncapped visual state, DOM access in physics, and physics derivations in renderers.
- Verify that no displayed formula contradicts the curriculum convention `Delta U = Q - W`.

**Browser and responsive checks:**

- Test every mode at 1440, 800, 460, and 320 px viewport widths.
- Verify initial paused frames, Play/Pause/Step/Reset, parameter updates while paused and playing, resize behavior, mode persistence, keyboard operation, visible focus, and synchronized `aria-pressed` state.
- Verify no clipping, horizontal overflow, stale readouts, blank canvases, missing KaTeX, dependency errors, console warnings, or console errors.
- Check comprehension at 200% zoom and without relying on color: particle-projection caveat, energy-flow directions, process identity, graph direction, and work sign must remain available in text.

**Physics and curriculum review:**

- Recheck all equations, wording, scope limits, and units against Topic 9 of the local SP015 PDF.
- Confirm the molecular scene is labelled as a representative 2D projection, while all assessed equations remain 3D ideal-gas relationships.
- Confirm pressure and thermodynamic readouts are analytic and are not inferred from the small visual particle sample.
- Confirm degrees-of-freedom assumptions are explicit and temperature-dependent vibrational modes are not implied.
- Confirm the First Law sign convention is identical across the Energy Ledger and Process Workbench.
- Confirm adiabatic work, heat capacities, entropy, engines, cycles, and real-gas effects have not entered assessed content.

**Completion:**

- Save reproducible QA evidence under `docs/plan/completed/evidence/chapter-09-kinetic-theory-thermodynamics/`, grouped by simulation and viewport.
- Record implementation summaries, final checks, and accepted limitations in this plan as each phase completes.
- Move this plan to `docs/plan/completed/` only when all three simulations, landing integration, documentation, and cross-simulation QA exit criteria pass.

## 5. Interfaces and callback conventions

Use these lifecycle callback names where applicable:

- `onModeChange(mode)` or `onProcessChange(process)`;
- `onPlayToggle(isPlaying)`;
- `onStep()`;
- `onReset()`.

Use explicit physics-named callbacks such as `onTemperatureChange(value)`, `onMolarMassChange(value)`, `onHeatChange(value)`, `onWorkChange(value)`, `onInitialPressureChange(value)`, and `onFinalVolumeChange(value)`. Do not create a chapter-wide string-based parameter dispatcher solely for uniformity.

For Level 3 pages, each UI manager exposes `on(callbacksMap)`, `setMode(mode)`, `setPlaying(isPlaying)`, and `updateReadouts(values)`, plus targeted validation or control-visibility methods where required. UI managers cache and validate required DOM nodes once, synchronize `is-active` and `aria-pressed`, and request no physics or drawing work directly.

Controllers preserve the last valid state, reject unknown modes and invalid physical values, and request a redraw after every accepted change while paused. Physics classes expose domain operations and derived getters only. Renderers receive an explicit p5 context and immutable frame-state objects assembled by controllers; they do not receive UI managers or mutate physics state.

## 6. Assumptions and exclusions

- The three-simulation split is fixed unless implementation reveals a concrete usability problem. Do not revive a separate 9.5-only area-under-the-curve page; that would duplicate the Process Workbench's graph and state model.
- All gases are ideal. Molecular volume, intermolecular forces outside elastic collisions, phase changes, and real-gas equations are excluded.
- The molecular animation is illustrative, projected, time-scaled, and based on a fixed representative sample. It is not a molecular-dynamics solver and does not numerically estimate macroscopic pressure.
- The generic degree-of-freedom model uses `f = 3`, `5`, and `6`; vibrational modes, heat-capacity variation, and linear-versus-nonlinear polyatomic distinctions are outside SP015 scope for this plan.
- The First Law Energy Ledger models net energy transfers between states. It does not assign a thermodynamic path or calculate path-dependent work.
- The Process Workbench quantitatively calculates work only for isothermal, isobaric, and isochoric processes as required by SP015 9.5. Adiabatic behavior is included for definition and P–V comparison under 9.4.
- Entropy, the Second Law, cyclic processes, heat engines, refrigerators, Carnot efficiency, and thermodynamic potentials are excluded.
- No backend, persistence, audio, export, framework, build system, or network dependency is added.
- Existing public APIs and shared styles remain compatible. Shared extraction requires at least two proven consumers and must be documented only after implementation.
