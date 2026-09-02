# Landing SVG Phase 0 Baseline and Diagram Contract

**Status:** Complete

**Completed:** 2026-09-01

**Parent plan:** [Landing Page SVG Improvement Plan](landing_svg_improvement_plan.md)

**Scope:** Physics and visual baseline only; no landing-page implementation changes

## 1. Phase 0 Outcome

The current landing illustrations have been checked against the theory, physics, and renderer implementations of all eight completed simulations. This document resolves the represented mode, required teaching signal, direction conventions, and intentional omissions for every replacement thumbnail and the future hero illustration.

The contract deliberately favors one scientifically recognizable idea per card. The thumbnail is an index aid, not a compressed copy of the full simulation.

## 2. Sources Reviewed

The review used `docs/architecture.md`, `instructions/physics.md`, the landing implementation in `landing/index.html`, `landing/style.css`, and `landing/app.js`, plus these simulation sources:

| Topic | Theory/UI source | Physics source | Rendering source |
| --- | --- | --- | --- |
| 2.3 Projectile Motion | `2.3-projectile-motion/index.html` | `projectile-physics.js` | `projectile-renderer.js` |
| 5 Circular Motion | `circular-motion.html` | `circular-motion-sim.js` | `circular-motion-sketch.js` |
| 7.1 Kinematics of SHM | `7.1-kinematics-of-shm/index.html` | `kinematics-shm-physics.js` | `kinematics-shm-renderer.js` |
| 7.2 SHM Graphs Analysis | `7.2-graphs-shm/index.html` | `shm-graphs-physics.js` | `shm-graphs-renderer.js` |
| 7.4 Progressive Waves | `7.4-progressive-wave-shm/index.html` | `wave-physics.js` | `wave-renderer.js` |
| 7.5 Superposition of Waves | `wave-superposition.html` | `wave-superposition-physics.js` | `wave-superposition-renderer.js` |
| 7.6 Application of Standing Waves | `standing-waves.html` | `standing-waves-physics.js` | `standing-waves-renderer.js` |
| 7.7 Doppler Effect | `doppler-effect.html` | `doppler-effect-physics.js` | `doppler-effect-renderer.js` |

## 3. Responsive Baseline Evidence

The landing page was served as a static site and captured at the required viewport widths. Each width has an above-the-fold hero capture and a simulation-card capture:

| Viewport | Hero | Cards |
| ---: | --- | --- |
| 1440 px | [hero-1440.png](evidence/landing-svg-phase-0/hero-1440.png) | [cards-1440.png](evidence/landing-svg-phase-0/cards-1440.png) |
| 800 px | [hero-800.png](evidence/landing-svg-phase-0/hero-800.png) | [cards-800.png](evidence/landing-svg-phase-0/cards-800.png) |
| 480 px | [hero-480.png](evidence/landing-svg-phase-0/hero-480.png) | [cards-480.png](evidence/landing-svg-phase-0/cards-480.png) |
| 460 px | [hero-460.png](evidence/landing-svg-phase-0/hero-460.png) | [cards-460.png](evidence/landing-svg-phase-0/cards-460.png) |
| 320 px | [hero-320.png](evidence/landing-svg-phase-0/hero-320.png) | [cards-320.png](evidence/landing-svg-phase-0/cards-320.png) |

### Current rendered geometry

These values are CSS-derived estimates, verified against the captures. They establish comparison targets for later phases; they are not browser DOM measurements.

| Viewport | Page padding | Card columns | Card width | Card SVG width | Card SVG height | Effective 1.6-unit stroke | Hero SVG height | Hero panel height |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440 | 100.8 | 4 | 300.6 | 264.5 | 163.1 | 3.53 px | 345.0 | 390.0 |
| 800 | 40.0 | 2 | 354.0 | 311.5 | 192.1 | 4.15 px | 557.4 | 599.4 |
| 480 | 24.0 | 2 | 210.0 | 184.8 | 114.0 | 2.46 px | 334.5 | 376.5 |
| 460 | 20.0 | 1 | 420.0 | 369.6 | 227.9 | 4.93 px | 325.2 | 367.2 |
| 320 | 20.0 | 1 | 280.0 | 246.4 | 151.9 | 3.29 px | 216.8 | 258.8 |

Current source geometry:

- Hero SVG: `viewBox="0 0 620 480"`; desktop CSS height is `345px` inside a `390px` panel.
- Card SVGs: `viewBox="0 0 120 74"`; no intrinsic `width` or `height`; CSS width is `88%` with automatic height.
- Card paths and circles share a `1.6` viewBox-unit stroke, so their visible stroke width varies with card width.
- Card visual area has `min-height: 137px`, but a tall scaled SVG can expand it.

The captures confirm two sizing behaviors that later phases must preserve as regression tests:

1. The hero becomes substantially taller at 800 px than at 1440 px because its fixed desktop height changes to width-driven intrinsic scaling.
2. Card artwork changes size non-monotonically: the two-column 480 px layout produces the smallest diagrams, while the one-column 460 px layout produces the largest diagrams and thickest strokes.

### Current contrast baseline

Contrast ratios below are against the card visual surface, `#e4ebe3`:

| Token/current color | Contrast | Baseline assessment |
| --- | ---: | --- |
| `--orange` (`#ff6b35`) | 2.33:1 | Insufficient for essential non-text graphical objects |
| `--teal` (`#35b9ad`) | 1.99:1 | Insufficient for essential non-text graphical objects |
| `--orange-dark` (`#bf5a00`) | 3.70:1 | Suitable for essential diagram geometry |
| `--ink` (`#102126`) | 13.64:1 | Suitable |
| `--muted` (`#617075`) | 4.24:1 | Suitable, subject to line weight and opacity |
| `--acid` (`#dff34b`) | 1.01:1 | Decorative only on this surface |

This is a functional accessibility constraint, not a request to recolor every line. Essential boundaries, vectors, nodes, axes, and curves need a compliant treatment; subordinate guides may remain visually quieter if they are not required to understand the diagram.

## 4. Checked Diagram Contract

### 2.3 Projectile Motion

- **Represented state:** An angled projectile launched from the origin in a `+x`, `+y` reference frame.
- **Essential:** Launch point, parabolic trajectory, initial velocity vector, and its horizontal and vertical resolved components.
- **Supporting:** A restrained apex marker or guide if it remains legible at card size.
- **Omit:** Orbital imagery, wave-like decoration, a current-position gravity vector, and numeric labels.
- **Physics constraints:** The component arrows share the launch point; horizontal motion is constant; vertical motion is accelerated downward; the path is consistent with `x = u cos(theta)t` and `y = y0 + u sin(theta)t - 1/2 gt^2`.

### 5 Circular Motion

- **Represented state:** One counterclockwise state with the particle in the upper-right quadrant.
- **Essential:** Circular path, center, particle, radius, a tangent velocity arrow, and one inward centripetal-acceleration arrow.
- **Supporting:** Short labels `v` and `a_c` only if geometry alone is ambiguous.
- **Omit:** A separate force arrow, because `F_c` and `a_c` are collinear and duplicate information at thumbnail scale; decorative orbit rings.
- **Physics constraints:** Both vectors originate at the particle; velocity is perpendicular to the radius; centripetal acceleration points exactly toward the center; no outward acceleration is shown.

### 7.1 Kinematics of SHM

- **Represented mode:** The simulation's default Spring–Mass system.
- **Essential:** A vertical spring and mass, equilibrium reference, signed displacement from equilibrium, and restoring-force arrow toward equilibrium.
- **Supporting:** A compact amplitude extent or displacement bracket.
- **Omit:** A free-floating sine curve, pendulum mode, and reference-circle mode. Those are valid simulation modes but compete with the default system in a small thumbnail.
- **Physics constraints:** Restoring force opposes displacement, `F = -kx`; the diagram must read as oscillation about equilibrium rather than propagation through space.

### 7.2 SHM Graphs Analysis

- **Represented state:** Synchronized time traces for displacement, velocity, and acceleration.
- **Essential:** Three aligned mini-lanes for `x`, `v`, and `a`; distinguishable traces with the correct phase relationships.
- **Supporting:** One shared time marker or compact lane labels if legible.
- **Omit:** Energy-versus-displacement at thumbnail scale. It remains in the card's learning-outcome text and full simulation, while adding a fourth graph would reduce phase readability.
- **Physics constraints:** For `x = A sin(omega t)`, `v` leads `x` by one-quarter period and `a = -omega^2 x`; acceleration is antiphase with displacement.

### 7.4 Progressive Waves

- **Represented state:** A transverse progressive wave travelling in `+x`.
- **Essential:** Wave profile, horizontal propagation arrow, wavelength interval, one marked medium particle at a fixed horizontal position, and a vertical particle-velocity arrow.
- **Supporting:** A local equilibrium line.
- **Omit:** A horizontal particle-motion arrow and multiple animated-time profiles.
- **Physics constraints:** Use the repository convention `y = A sin(omega t - kx)` for `+x` travel; pattern motion is horizontal while the selected particle's motion is vertical; `lambda = v/f`.

### 7.5 Superposition of Waves

- **Represented mode:** The simulation's default pulse mode with two equal positive pulses approaching one another.
- **Essential:** Two clearly separated input lanes and a third resultant lane showing constructive overlap; the resultant is visually dominant.
- **Supporting:** Direction arrows on the input pulses or compact `A`, `B`, and resultant lane identifiers.
- **Omit:** Continuous-wave mode, a standing-wave silhouette, and unrelated duplicate sine curves.
- **Physics constraints:** The resultant is the pointwise sum, `y_resultant = y_A + y_B`; equal positive pulses produce a doubled positive displacement at complete overlap while retaining their individual pulse shapes.

### 7.6 Application of Standing Waves

- **Represented mode:** A fixed–fixed string in the second harmonic, `n = 2`.
- **Essential:** Fixed boundaries at both ends, nodes at `x = 0`, `L/2`, and `L`, and antinodes at `L/4` and `3L/4`.
- **Supporting:** A dashed opposite-phase envelope or node/antinode marker shapes.
- **Omit:** Open–open and closed–open air-column modes. They remain discoverable through the card copy and full simulation but cannot be combined without obscuring the selected boundary condition.
- **Physics constraints:** Boundary displacement is zero at both fixed ends; nodes lie on the equilibrium line; the two loops form a valid stationary mode rather than a travelling wave.

### 7.7 Doppler Effect

- **Represented mode:** A source moving in `+x` toward a stationary observer positioned ahead of it.
- **Essential:** Source, observer, source-motion arrow, and wavefronts whose centers track earlier emission positions, creating compressed spacing ahead and expanded spacing behind.
- **Supporting:** A small approach-direction cue or differentiated source/observer marker shapes.
- **Omit:** Moving-observer mode, both parties moving, and concentric rings centered on the source's current position.
- **Physics constraints:** Only the source moves in the selected case; older wavefronts remain centered on historical source positions; frequency is higher at the observer on approach.

### Planned State

- **Represented state:** No physics topic has been assigned.
- **Essential:** A neutral dashed construction frame or placeholder geometry.
- **Supporting:** Existing planned status text outside the SVG.
- **Omit:** Waves, trajectories, or other shapes that imply a completed physical model.

## 5. Hero Diagram Contract

The hero will continue to represent the project's breadth through projectile, circular, and wave phenomena, but the systems must not share an ambiguous physical frame.

- **Projectile zone:** A compact launch trajectory and launch vector in its own reference frame.
- **Circular-motion zone:** A particle, orbit, tangent velocity, and inward acceleration in its own local construction.
- **Progressive-wave zone:** A wave profile with horizontal propagation and vertical particle-motion cues.
- **Separation rule:** The three zones may share the grid and visual grammar, but their paths, vectors, and labels must not overlap in a way that implies one combined system.
- **Density rule:** Geometry should carry the meaning. Retain only short symbols that materially disambiguate direction or quantity.
- **Hierarchy rule:** The illustration remains visually subordinate to the hero heading and primary `Explore simulations` action.

## 6. Accessibility and Visual Decisions

- Card SVGs will remain `aria-hidden="true"` because the adjacent card title, description, learning outcome, and launch link provide the accessible explanation. If a later diagram introduces unique instructional content, that content must first be added to accessible text or supplied as an appropriate alternative.
- The hero is meaningful rather than decorative. Its final implementation should use `role="img"` with an accessible label that names the three represented systems.
- Essential non-text graphical objects must achieve at least 3:1 contrast against their immediate background.
- Meaning must not depend on color alone. Direction, solid/dashed treatment, shape, position, and stroke weight should distinguish roles.
- No new palette colors, decorative animation, or small numeric labels are required.
- The current card `120 x 74` and hero `620 x 480` viewBoxes remain provisional Phase 1 starting points. Intrinsic dimensions, stroke scaling, and `vector-effect` will be resolved against the recorded viewport evidence rather than guessed in Phase 0.

## 7. Resolved Decisions for Phase 1

1. Every completed topic now has one selected system or mode; no direction or boundary-condition choice remains open.
2. The card visuals prioritize recognition and one teaching relationship over exhaustive feature coverage.
3. 7.1 uses the default spring–mass mode, not reference-circle projection.
4. 7.2 prioritizes the `x`, `v`, and `a` phase relationship and omits the energy graph from the thumbnail.
5. 7.5 uses the default constructive pulse-overlap case.
6. 7.6 uses a fixed–fixed second harmonic.
7. 7.7 uses a moving source and stationary observer.
8. Card SVGs remain decorative; the hero requires an accurate text alternative.
9. Existing orange and teal cannot carry essential light-surface geometry without a contrast treatment.
10. Intermediate-width SVG scaling and the 480/460 px grid discontinuity are explicit regression targets for later phases.

## 8. Phase 0 Exit Check

- [x] All eight theory, physics, and renderer implementations reviewed.
- [x] Direction conventions, selected modes, and boundary conditions resolved.
- [x] Essential, supporting, and omitted details recorded per topic.
- [x] Hero and card baselines captured at 1440, 800, 480, 460, and 320 px.
- [x] Current viewBoxes, rendered size behavior, and effective stroke widths recorded.
- [x] Contrast limitations recorded.
- [x] Card SVG accessibility treatment confirmed.
- [x] No landing HTML, CSS, or JavaScript changed during Phase 0.
