# Landing SVG Phase 5 Hero Illustration Results

**Status:** Complete

**Completed:** 2026-09-02

**Parent plan:** [Landing Page SVG Improvement Plan](landing_svg_improvement_plan.md)

**Scope:** Landing-page hero illustration, its accessible label, and its responsive height behavior

## 1. Outcome

The hero illustration has been reorganized into three separate scientific fields instead of one composite coordinate space. Projectile motion and circular motion occupy independent upper fields; a progressive wave occupies a full-width lower field. Dashed dividers and local guides prevent any vector, path, or symbol from appearing to belong to another system.

The composition keeps the existing `620 x 480` viewBox, panel, grid, palette, stamp, and restrained editorial tone. No animation, new palette token, simulation code, shared utility, card implementation, navigation, CTA, or content hierarchy changed.

The UI/UX skill's generic palette and landing-pattern suggestions were intentionally not adopted because they conflict with the established repository visual system and the educational, non-commercial purpose. Its applicable guidance informed the explicit SVG dimensions, responsive cap, non-color differentiation, and accessible image labeling.

## 2. Field 01 — Projectile Motion

### Included geometry

- A local horizontal and vertical reference frame.
- A parabolic trajectory contained entirely inside the projectile field.
- A marked launch point.
- A solid launch-velocity vector originating at the launch point.
- Compact `u`, `+x`, and `+y` labels.

### Correctness check

The trajectory begins and ends on the local horizontal reference and remains concave downward in physics coordinates. The launch vector begins at the projectile and points upward and right, consistent with the initial tangent direction. The trajectory is dashed while the launch vector is solid, so their different roles do not depend on color.

## 3. Field 02 — Circular Motion

### Included geometry

- A circular path and marked center.
- A particle in the upper-right quadrant.
- A dashed radius from the center to the particle.
- A tangential velocity arrow originating at the particle.
- An inward centripetal-acceleration arrow originating at the same particle.
- Compact `v` and `a` labels.

### Correctness check

The outward radius direction is proportional to `(44, -44)` in screen coordinates. The tangential arrow direction is `(-34, -34)`, whose dot product with the radius is zero. The acceleration arrow direction is `(-34, 34)`, collinear with the direction from the particle back toward the center. This makes the tangent and inward relationships geometrically exact rather than approximate.

## 4. Field 03 — Progressive Wave

### Included geometry

- A transverse wave profile and dashed equilibrium line.
- A rightward pattern-propagation arrow.
- A marked medium particle at a fixed horizontal position.
- A vertical particle-velocity arrow originating at that particle.

### Correctness check

The particle sits at an equilibrium crossing where the physical profile decreases as `x` increases. Under the repository convention `y = A sin(omega t - kx)`, that snapshot has positive particle velocity, so the upward particle arrow is consistent with the displayed rightward-travelling wave. The propagation and particle arrows are orthogonal, and no horizontal particle-motion cue is present.

## 5. Separation and Hierarchy

- A vertical divider separates projectile and circular motion.
- A horizontal divider separates both upper systems from the wave.
- Each field has a short numbered heading and its own local guides.
- Geometry never crosses a divider.
- The illustration remains static and visually subordinate to the headline and primary CTA.
- The footer caption now names the three system types rather than using the ambiguous previous `Motion / wave / field` wording.

## 6. Accessibility

The meaningful hero container retains `role="img"`. Its accessible label now states:

> Three separate physics diagrams: projectile motion with a launch vector, circular motion with tangential velocity and inward acceleration, and a progressive wave with rightward propagation and vertical particle motion.

The nested SVG remains `aria-hidden="true"` and `focusable="false"`, avoiding duplicate or path-level announcements. It now has explicit intrinsic `width="620"` and `height="480"` attributes. Meaning is reinforced by field separation, solid versus dashed treatment, distinct geometry, marker position, and arrow direction rather than color alone.

## 7. Responsive Evidence

| Viewport | Evidence | Result |
| ---: | --- | --- |
| 1440 px | [hero-1440.png](evidence/landing-svg-phase-5/hero-1440.png) | Three fields remain balanced and subordinate to the headline and CTA |
| 1024 px | [hero-1024.png](evidence/landing-svg-phase-5/hero-1024.png) | Two-column composition retains clear field separation without crowding the copy |
| 800 px | [hero-800.png](evidence/landing-svg-phase-5/hero-800.png) | SVG height is capped at the desktop 345 px treatment instead of expanding beyond 550 px |
| 480 px | [hero-480.png](evidence/landing-svg-phase-5/hero-480.png) | Field labels, vectors, and separation remain legible without excess panel height |
| 460 px | [hero-460.png](evidence/landing-svg-phase-5/hero-460.png) | Mobile padding and the three-field structure remain balanced |
| 375 px | [hero-375.png](evidence/landing-svg-phase-5/hero-375.png) | Common narrow-mobile width preserves geometry and footer-caption separation |
| 320 px | [hero-320.png](evidence/landing-svg-phase-5/hero-320.png) | Minimum-width illustration contains all geometry; the footer captions remain separate and unclipped |

At widths of 800 px and below, the SVG uses `width: min(100%, 446px)`, `height: auto`, and `max-height: 345px`. This preserves the aspect ratio while preventing the width-driven 800 px height increase recorded in `RESP-002`. At narrower widths it continues to shrink naturally.

## 8. Phase 5 Exit Check

- [x] Projectile, circular-motion, and progressive-wave geometry occupy separate fields.
- [x] No vector or symbol can reasonably be assigned to the wrong system.
- [x] Projectile axes, trajectory, launch point, and launch vector are internally consistent.
- [x] Circular velocity is tangential and acceleration is inward.
- [x] Progressive-wave propagation and particle motion are orthogonal and sign-consistent.
- [x] The hero remains subordinate to the heading and primary CTA.
- [x] The 800 px illustration no longer grows taller than the desktop SVG.
- [x] The accessible label accurately names the visible systems and relationships.
- [x] Explicit SVG dimensions prevent intrinsic-size ambiguity.
- [x] Reviewed at 1440, 1024, 800, 480, 460, 375, and 320 px.
- [x] No clipping, overflow, caption collision, or unintended wrapping remains.
- [x] No card, simulation, shared utility, or unrelated landing behavior changed.
