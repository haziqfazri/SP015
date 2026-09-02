# Landing SVG Phase 1 Visual Grammar

**Status:** Complete

**Completed:** 2026-09-01

**Parent plan:** [Landing Page SVG Improvement Plan](landing_svg_improvement_plan.md)

**Scope:** Landing-local card SVG primitives and semantic styling; no topic-diagram replacement

## 1. Outcome

Phase 1 replaces the card SVGs' ad hoc path styling with a small reusable grammar in `landing/app.js` and `landing/style.css`. Existing card compositions remain in place so the scientific redesign can be tested deliberately through the Phase 2 pilots rather than changed all at once.

The implementation retains `viewBox="0 0 120 74"`, adds intrinsic `width="120"` and `height="74"`, uses semantic roles instead of topic-specific color selectors, and keeps all landing-specific helpers inside the landing implementation.

## 2. Primitive Set

`DIAGRAM` in `landing/app.js` provides these local primitives:

| Primitive | Generated geometry | Intended use |
| --- | --- | --- |
| `path()` | Path | Primary, secondary, or resultant curves |
| `circle()` | Unfilled circle | Orbits and wavefronts |
| `line()` | Plain line | General solid geometry |
| `axis()` | Arrow-ended line | Coordinate axes |
| `arrow()` | Role-colored arrow-ended line | Velocity, acceleration, force, and propagation vectors |
| `guide()` | Dashed line | Construction and projection guides |
| `equilibrium()` | Dashed line | Oscillator or wave equilibrium reference |
| `bracket()` | Line with terminal ticks | Wavelength or interval notation |
| `particle()` | Filled circle with outline | Projectile, mass, source, or selected medium particle |
| `node()` | Filled circular marker | Standing-wave node |
| `antinode()` | Filled diamond marker | Standing-wave antinode; deliberately differs from a node by shape |
| `boundary()` | Strong square-ended line | Fixed or physical boundary |

These helpers produce SVG markup only. They do not contain physics derivations, animation state, or simulation rendering logic.

## 3. Semantic Visual Roles

| Class | Token | Stroke treatment | Purpose |
| --- | --- | --- | --- |
| `.diagram-primary` | `--orange-dark` | 2 px, solid | Defining physical quantity or principal curve |
| `.diagram-secondary` | `--ink` | 1.6 px, solid | Independent secondary quantity or construction |
| `.diagram-resultant` | `--ink` | 2.5 px, solid | Superposition resultant requiring extra emphasis |
| `.diagram-guide` | `--muted` | 1.25 px, dashed | Supporting construction guide |
| `.diagram-equilibrium` | `--muted` | 1.25 px, dashed | Zero-displacement reference |
| `.diagram-axis` | `--muted` | 1.25 px, arrow-ended | Coordinate direction |
| `.diagram-bracket` | `--muted` | 1.25 px, terminal ticks | Measured interval such as wavelength |
| `.diagram-particle` | `--orange-dark` + `--ink` | Filled circle with outline | Physical object or selected particle |
| `.diagram-node` | `--ink` | Filled circle | Node |
| `.diagram-antinode` | `--orange-dark` + `--ink` | Filled diamond | Antinode |
| `.diagram-boundary` | `--ink` | 2 px, square-ended | Fixed or physical boundary |

Essential light-surface roles use the Phase 0 compliant colors: `--orange-dark` is approximately 3.70:1, `--muted` approximately 4.24:1, and `--ink` approximately 13.64:1 against the existing card visual background. Bright orange, teal, and acid are no longer used for essential card-diagram geometry.

## 4. Scaling and Marker Decisions

- All generated card SVGs have explicit intrinsic dimensions to reserve their aspect ratio before CSS applies.
- CSS retains responsive `width: 88%` and `height: auto` behavior.
- `.diagram-shape` uses `vector-effect: non-scaling-stroke`, keeping the visible stroke treatment stable when the grid changes between two and one columns.
- Arrowhead definitions are placed inside each generated SVG.
- Every marker ID contains the diagram type and a monotonically increasing instance number, preventing collisions when multiple cards render or filters rerender the card groups.
- Arrowheads use role-specific classes, so their color matches the associated primary, secondary, or axis line without inline colors.
- No raw color value, new palette token, global helper, external library, or animation was introduced.

## 5. Responsive Evidence

The page and card region were rendered in Firefox at four representative Phase 1 widths:

| Viewport | Landing capture | Card capture | Result |
| ---: | --- | --- | --- |
| 1440 px | [landing-1440.png](evidence/landing-svg-phase-1/landing-1440.png) | [cards-1440.png](evidence/landing-svg-phase-1/cards-1440.png) | Clean desktop rendering |
| 800 px | [landing-800.png](evidence/landing-svg-phase-1/landing-800.png) | [cards-800.png](evidence/landing-svg-phase-1/cards-800.png) | Clean two-column breakpoint rendering |
| 460 px | [landing-460.png](evidence/landing-svg-phase-1/landing-460.png) | [cards-460.png](evidence/landing-svg-phase-1/cards-460.png) | Clean one-column rendering |
| 320 px | [landing-320.png](evidence/landing-svg-phase-1/landing-320.png) | [cards-320.png](evidence/landing-svg-phase-1/cards-320.png) | No clipping or horizontal overflow at minimum width |

The visual checks confirmed that line weight no longer becomes nearly twice as thick at 460 px as at 480 px. Card artwork still scales with its container, but its strokes and role hierarchy remain stable.

## 6. Deliberately Deferred

Phase 1 does not claim that the current topic diagrams are scientifically sufficient. Their geometry was only migrated onto the new grammar. The following remain assigned to subsequent phases:

- Physics-accurate projectile and Doppler pilot diagrams: Phase 2.
- Circular-motion and SHM replacements: Phase 3.
- Progressive, superposition, standing-wave, and planned-state replacements: Phase 4.
- Hero scientific separation and responsive height correction: Phase 5.
- Final interaction, responsive, accessibility, and regression integration: Phases 6–7.

## 7. Phase 1 Exit Check

- [x] Existing `120 x 74` card viewBox retained.
- [x] Axes, arrows, guides, particles, equilibrium lines, brackets, nodes, antinodes, and boundaries defined as landing-local primitives.
- [x] Semantic diagram classes implemented.
- [x] Essential roles use colors with at least 3:1 contrast against the card surface.
- [x] Solid/dashed treatment, marker shape, direction, and stroke weight provide non-color distinctions.
- [x] Generated SVGs have intrinsic width and height.
- [x] Marker IDs are unique per generated SVG.
- [x] Responsive rendering checked at desktop, 800 px, 460 px, and 320 px.
- [x] No landing-specific helper moved into `shared/`.

