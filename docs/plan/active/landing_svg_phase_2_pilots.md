# Landing SVG Phase 2 Pilot Results

**Status:** Complete

**Completed:** 2026-09-01

**Parent plan:** [Landing Page SVG Improvement Plan](landing_svg_improvement_plan.md)

**Scope:** Projectile Motion and Doppler Effect card diagrams only

## 1. Outcome

The two pilot thumbnails have been replaced with scientifically recognizable diagrams built from the Phase 1 SVG grammar. They establish the fidelity and density standard for the remaining card replacements without changing the card layout, metadata, filtering behavior, or simulation implementations.

The generic `trajectory` and `doppler` visual-type captions were removed from these two cards. Their geometry must now carry recognition, with the adjacent card title and explanation continuing to provide the accessible description.

## 2. Projectile Motion Pilot

### Represented state

The card shows the simulation's default angled launch: ground-level origin, 45° launch direction, `+x` to the right, and `+y` upward.

### Included geometry

- Muted arrow-ended x and y axes.
- A ground-to-ground parabolic path.
- A launch particle at the common origin.
- A primary diagonal initial-velocity vector tangent to the path at launch.
- Horizontal and vertical resolved-component arrows sharing the launch point.
- Dashed projection guides joining the component endpoints to the diagonal vector tip.
- Two short axis labels, `x` and `y`.

### Correctness check

The path rises and falls in the positive-x direction, consistent with the simulation's default `u = 25 m/s`, `theta = 45°`, and `y0 = 0`. Both resolved components originate at the launch point. The initial vector follows the launch tangent; no orbital, wave, or current-position gravity imagery is mixed into the thumbnail.

The pilot was compared with [the simulation's rendered first frame](evidence/landing-svg-phase-2/projectile-simulation-first-frame.png). The full simulation additionally shows instantaneous velocity and downward acceleration, while the thumbnail deliberately uses the learning-outcome-focused initial components.

## 3. Doppler Effect Pilot

### Represented state

The card uses the simulation's default `movingSource` mode: a source travelling in `+x` toward a stationary observer. It shows an early approaching snapshot rather than exact `t = 0` because no expanded wavefront exists at the initial instant.

### Included geometry

- Dashed line of motion.
- Orange circular source marker labelled `S`.
- Ink diamond observer marker labelled `O`, providing a non-color distinction.
- A rightward source-motion arrow originating at the source.
- Four circular wavefronts centered on progressively older source positions.

### Correctness check

The constructed wavefronts use these viewBox positions:

| Front age | Emission center x | Radius | Right boundary | Left boundary |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 53 | 10 | 63 | 43 |
| 2 | 48 | 20 | 68 | 28 |
| 3 | 43 | 30 | 73 | 13 |
| 4 | 38 | 40 | 78 | -2 |

The source's current x-position is 58. Historical emission centers therefore sit progressively farther behind the moving source. Successive right-side boundaries are 5 units apart, while successive left-side boundaries are 15 units apart. This produces visibly compressed wavefront spacing ahead and expanded spacing behind without relying on color.

The pilot was compared with [the simulation's rendered first frame](evidence/landing-svg-phase-2/doppler-simulation-first-frame.png) and its `wavefronts(t)` renderer contract. The first frame confirms moving-source mode, source/observer roles, and left-to-right approach; the later representative thumbnail state supplies the wavefront spacing that is absent at `t = 0`.

## 4. Responsive Evidence

The two isolated cards were rendered using the production card grid and CSS at every Phase 2 target width:

| Viewport | Evidence | Result |
| ---: | --- | --- |
| 1440 px | [pilots-1440.png](evidence/landing-svg-phase-2/pilots-1440.png) | Both pilots remain balanced at desktop card width |
| 800 px | [pilots-800.png](evidence/landing-svg-phase-2/pilots-800.png) | Axes, components, wavefront spacing, and markers remain clear |
| 480 px | [pilots-480.png](evidence/landing-svg-phase-2/pilots-480.png) | Smallest two-column card rendering remains legible |
| 460 px | [pilots-460.png](evidence/landing-svg-phase-2/pilots-460.png) | One-column enlargement introduces no clipping or excessive stroke growth |
| 320 px | [pilots-320.png](evidence/landing-svg-phase-2/pilots-320.png) | Minimum-width rendering remains recognizable and contained |

No path, marker, label, or wavefront clips in a way that removes required meaning. The outer Doppler fronts intentionally continue beyond the SVG frame, matching wavefronts propagating outside the depicted field rather than indicating accidental overflow.

## 5. Approved Standard for Remaining Cards

The Phase 3 and Phase 4 diagrams should preserve these pilot decisions:

1. Use one selected mode or state rather than combining every capability of a simulation.
2. Encode the defining relationship through geometry before adding text.
3. Use no more than two short symbols when geometry alone cannot identify roles or axes.
4. Use solid/dashed treatment, arrow direction, and marker shape so meaning survives without color.
5. Let construction geometry extend to the frame only when the continuation is physically meaningful.
6. Keep primary objects visually dominant and guides subordinate.
7. Remove the generic visual-type caption once a replacement diagram is independently recognizable.

## 6. Phase 2 Exit Check

- [x] Only the Projectile Motion and Doppler Effect templates replaced.
- [x] Projectile axes, path, launch vector, and resolved components are internally consistent.
- [x] Doppler source, observer, motion direction, historical centers, and unequal front spacing are internally consistent.
- [x] Each pilot uses only two short symbols.
- [x] Both diagrams compared with their simulation first frames and renderer conventions.
- [x] Generic visual-type captions removed from the two pilots.
- [x] Both cards remain recognizable without those captions.
- [x] Reviewed at 1440, 800, 480, 460, and 320 px.
- [x] No clipping, overflow, or illegibility found at the target widths.
- [x] No simulation, shared utility, or hero code changed.

