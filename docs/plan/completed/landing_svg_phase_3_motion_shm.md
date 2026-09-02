# Landing SVG Phase 3 Motion and SHM Results

**Status:** Complete

**Completed:** 2026-09-01

**Parent plan:** [Landing Page SVG Improvement Plan](landing_svg_improvement_plan.md)

**Scope:** Circular Motion, Kinematics of SHM, and SHM Graphs card diagrams

## 1. Outcome

The three motion and SHM thumbnails have been replaced with diagrams that encode their defining physical relationships rather than relying on generic circular or sinusoidal decoration. Each diagram uses the Phase 1 grammar and the Phase 2 density standard while retaining the existing `120 x 74` viewBox and card layout.

The generic `orbit`, `oscillation`, and `graph` captions have been removed. The card titles and descriptions remain the accessible explanations because the generated SVGs remain `aria-hidden="true"`.

## 2. Uniform Circular Motion

### Represented state

The particle is shown in the upper-right quadrant moving counterclockwise. This is a valid state supported by the simulation's direction control, selected because it lets both defining vectors remain visible without overlapping the card edge.

### Included geometry

- Circular path and marked center.
- Dashed radius from the center to the particle.
- Orange particle marker.
- Tangential velocity arrow directed upper-left.
- Centripetal-acceleration arrow directed from the particle toward the center.
- Short `v` and `a` labels.

### Correctness check

The radius direction from center to particle is proportional to `(17, -17)` in screen coordinates. The velocity direction is proportional to `(-14, -14)`, perpendicular to the radius. The acceleration direction is proportional to `(-13, 13)`, parallel to the inward center direction. Both physical arrows originate at the particle.

A separate force arrow is intentionally omitted because centripetal force and acceleration are collinear and would duplicate the same thumbnail-scale relationship. The card was checked against [the circular-motion simulation first frame](evidence/landing-svg-phase-3/circular-simulation-first-frame.png) and its `tangentDirection()` and `centripetalDirection()` implementations.

## 3. Kinematics of SHM

### Represented state

The card shows the simulation's actual default Spring–Mass system with the mass displaced to the right of equilibrium.

Phase 0 provisionally described a vertical spring. Source review and first-frame comparison confirmed that the repository's default Spring–Mass renderer is horizontal. Phase 3 therefore uses the horizontal arrangement to improve consistency with the simulation students reach after selecting the card; this does not change the chosen physical mode or learning signal.

### Included geometry

- Fixed wall and attached horizontal spring.
- Dashed equilibrium reference.
- Rectangular mass displaced to the right.
- Displacement arrow `x` from equilibrium toward the mass.
- Restoring-force arrow `F` from the mass back toward equilibrium.

### Correctness check

The displacement is positive while the restoring force points left, encoding `F = -kx`. The attached spring, wall, equilibrium line, and localized mass make the diagram read as oscillation about equilibrium rather than a wave propagating through space.

The result was checked against [the Kinematics of SHM simulation first frame](evidence/landing-svg-phase-3/shm-simulation-first-frame.png), including its default positive displacement and negative restoring force.

## 4. SHM Graphs Analysis

### Represented state

The card shows synchronized displacement–time, velocity–time, and acceleration–time traces for:

- `x = A sin(omega t)`
- `v = A omega cos(omega t)`
- `a = -omega^2 x`

### Included geometry

- Three separated lanes labelled `x`, `v`, and `a`.
- A dashed zero reference in every lane.
- Solid orange displacement trace.
- Solid ink velocity trace.
- Dashed muted acceleration trace.

Three one-character labels are retained as a justified exception to the Phase 2 two-symbol preference: without all three lane identities, the key phase relationship would be ambiguous.

### Correctness check

At the left edge, displacement is zero and rising, velocity is at its positive maximum, and acceleration is zero. At one-quarter period, displacement is at positive maximum, velocity crosses zero, and acceleration is at negative maximum. At one-half period, displacement and acceleration return to zero while velocity is at negative maximum. The acceleration curve is the vertical inverse of displacement throughout.

The simulation's exact first frame contains only the initial sample, so the full trace shapes were verified against the closed-form getters in `shm-graphs-physics.js`; [the simulation first frame](evidence/landing-svg-phase-3/shm-graphs-simulation-first-frame.png) confirms the selected Standard Graphs mode and x/v/a lane organization.

## 5. Responsive and Grayscale Evidence

| Viewport | Evidence | Result |
| ---: | --- | --- |
| 1440 px | [cards-1440.png](evidence/landing-svg-phase-3/cards-1440.png) | All diagrams retain balanced density at desktop card width |
| 800 px | [cards-800.png](evidence/landing-svg-phase-3/cards-800.png) | Vectors, force direction, and graph lanes remain clear |
| 480 px | [cards-480.png](evidence/landing-svg-phase-3/cards-480.png) | Small two-column diagrams remain contained and recognizable |
| 460 px | [cards-460.png](evidence/landing-svg-phase-3/cards-460.png) | One-column enlargement introduces no clipping |
| 320 px | [cards-320.png](evidence/landing-svg-phase-3/cards-320.png) | Minimum-width cards preserve labels and physical relationships |

The diagrams remain distinct without color:

- Circular Motion is identified by an orbit and two directional vectors.
- Kinematics of SHM is identified by a wall–spring–mass system and opposed arrows.
- SHM Graphs is identified by three aligned lanes with solid and dashed traces.

No meaning depends on orange versus ink alone. All essential geometry continues to use the Phase 1 contrast-compliant roles.

## 6. Phase 3 Exit Check

- [x] Circular-motion radius, tangent velocity, and inward acceleration are geometrically correct.
- [x] Both circular-motion vectors originate at the particle.
- [x] Spring–mass displacement and restoring force point in opposite directions.
- [x] The SHM system cannot reasonably be mistaken for a travelling wave.
- [x] x, v, and a traces have the correct relative phase.
- [x] The three diagrams have distinct silhouettes in grayscale.
- [x] Generic visual-type captions removed from all three cards.
- [x] Compared with simulation first frames and source equations.
- [x] Reviewed at 1440, 800, 480, 460, and 320 px.
- [x] No clipping, overflow, or illegibility found.
- [x] No simulation, shared utility, hero, or unrelated card implementation changed.

