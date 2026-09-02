# Landing SVG Phase 7 Final Physics and Regression QA

**Status:** Approved

**Completed:** 2026-09-02

**Parent plan:** [Landing Page SVG Improvement Plan](landing_svg_improvement_plan.md)

**Scope:** Final scientific-accuracy, rendering, interaction, accessibility, responsive, and regression verification for the landing-page hero and simulation-card diagrams

## 1. Outcome

The landing-page visual set is approved. All eight completed simulation diagrams are distinct, recognizable at card size, and consistent with the corresponding simulation model and theory. The hero keeps projectile motion, circular motion, and progressive waves in separate labelled fields rather than implying a shared physical system.

No Phase 7 implementation correction was required. This phase added only QA evidence and documentation; it did not change landing or simulation runtime code.

The `sp015-simulation-builder` skill supplied the repository physics and simulation review criteria. The `ui-ux-pro-max` skill supplied the relevant focus, keyboard, reduced-motion, target-size, and responsive checks. Generic commercial landing-page, personalization, palette, typography, and conversion recommendations were excluded because they do not fit this educational index or its established design language.

## 2. Physics Review

| Topic | Verified thumbnail signal | Source comparison | Result |
| --- | --- | --- | --- |
| 2.3 Projectile Motion | Positive x-axis, upward physics y-axis, decomposed launch vector, dotted component guides, and a downward-concave trajectory returning to ground | `instructions/physics.md`; projectile theory strip and renderer | Pass |
| 5 Uniform Circular Motion | Particle on orbit, velocity tangent in the counterclockwise direction, and acceleration directed toward the centre | circular-motion theory strip, `centripetalDirection()`, and first frame | Pass |
| 7.1 Kinematics of SHM | Spring–mass system, equilibrium line, displacement away from equilibrium, and restoring force in the opposite direction | SHM physics/restoring-force model and renderer | Pass |
| 7.2 SHM Graphs Analysis | Separate x, v, and a traces; v is quarter-cycle shifted from x and a is opposite in phase to x | `x = A sin(ωt)`, `v`, and `a = −ω²x` theory/renderer definitions | Pass |
| 7.4 Progressive Waves | Sinusoidal disturbance, rightward pattern arrow, vertical particle-motion arrow, equilibrium line, and one-wavelength bracket | wave sign convention, `WaveState.phase(x)`, theory strip, and renderer | Pass |
| 7.5 Superposition of Waves | Two pulses travelling toward one another and a resultant whose central amplitude equals their constructive sum | pulse-superposition model, theory strip, and three-panel renderer | Pass |
| 7.6 Application of Standing Waves | Fixed boundaries, nodes at both boundaries and the centre, alternating loops, and antinode markers between nodes | stretched-string boundary conditions and node/antinode position getters | Pass |
| 7.7 Doppler Effect | Source moving toward the observer, wavefronts compressed ahead and expanded behind, with separate source and observer markers | moving-source mode, Doppler theory strip, and wavefront renderer | Pass |

The neutral planned card contains no physics claim and remains visually distinct from completed topics.

## 3. Hero Review

The hero contains three independent, explicitly labelled zones:

- projectile: x/y axes, launch vector, and parabolic path;
- circular: orbit, radius, tangential velocity, and inward acceleration;
- progressive wave: equilibrium line, transverse particle motion, and rightward propagation.

The field dividers and zone labels prevent notation from being read as one combined system. The illustration remains secondary to the heading and primary simulation-discovery action at every captured width.

## 4. Runtime and DOM Regression

The final scripted render check produced:

| Check | Result |
| --- | ---: |
| Rendered entries | 9 |
| Whole-card launch links | 8 |
| Planned, unlinked entries | 1 |
| Missing launch destinations | 0 |
| Generated SVG IDs | 31 unique |
| SVG marker references | 14 resolved |
| Search for “Doppler” | 1 correct result |
| Chapter 7 filter | 6 correct results |
| Planned status filter | 1 unlinked result |
| Retired visual selectors | 0 |

`landing/app.js` passes `node --check`, and `git diff --check` passes. Headless Firefox loaded the landing HTML, shared stylesheet, landing stylesheet, and landing script successfully; the captures rendered the generated cards and diagrams without a blank or failed-script state. No new page runtime error was observed during the browser or scripted render checks.

## 5. Interaction and Accessibility

- Completed cards use the existing semantic launch anchor as a stretched link over the full card; there is no nested interactive element.
- The whole-card lift and shadow correspond exactly to the clickable area.
- The planned card has no anchor, pointer cursor, lift, or shadow.
- Link accessible names identify the destination simulation rather than announcing only “Launch lab.”
- Keyboard focus receives a 3 px high-contrast outline around the entire linked card.
- Search and filter controls remain native, labelled, and keyboard accessible; `aria-pressed` state updates are unchanged.
- Essential actions retain at least a 44 px target height.
- SVG thumbnails remain `aria-hidden="true"` and `focusable="false"` because their educational meaning is duplicated by the adjacent title, description, and outcome.
- Diagram meaning is not conveyed by color alone; direction, line style, geometry, labels, and marker shape provide redundant cues.
- `prefers-reduced-motion: reduce` continues to reduce the completed-card transition and disable smooth scrolling.

## 6. Responsive and Zoom Evidence

| Viewport | Evidence | Result |
| ---: | --- | --- |
| 1440 px | [final-1440.png](evidence/landing-svg-phase-7/final-1440.png) | Four-column Chapter 7 grid, capped diagrams, and stable hero composition |
| 1024 px | [final-1024.png](evidence/landing-svg-phase-7/final-1024.png) | Two-column responsive organization remains contained |
| 800 px | [final-800.png](evidence/landing-svg-phase-7/final-800.png) | Hero stacks without oversized artwork; cards remain legible |
| 480 px | [final-480.png](evidence/landing-svg-phase-7/final-480.png) | One-column card layout avoids the former cramped state |
| 460 px | [final-460.png](evidence/landing-svg-phase-7/final-460.png) | Navigation, filters, hero, and cards remain contained |
| 375 px | [final-375.png](evidence/landing-svg-phase-7/final-375.png) | Touch targets and metadata wrap without collision |
| 320 px | [final-320.png](evidence/landing-svg-phase-7/final-320.png) | Minimum-width layout has no visible horizontal clipping |
| 200% scaling | [final-200-percent.png](evidence/landing-svg-phase-7/final-200-percent.png) | Isolated Firefox profile at 2× CSS pixel scaling renders without clipping |
| 200% reflow equivalent | [final-200-percent-equivalent.png](evidence/landing-svg-phase-7/final-200-percent-equivalent.png) | 720 CSS-pixel viewport, equivalent to 200% zoom on a 1440 px display, remains readable and contained |

The final captures were compared with the Phase 1 baseline and Phase 6 integration set. Diagram detail increased without increasing the established capped visual footprint. The only later interaction change—the restored completed-card hover—uses transforms and shadow, so it creates no document-flow layout shift.

## 7. Contrast and Visual-System Check

The Phase 6 measured ratios remain applicable because Phase 7 did not change colors:

- `--orange-dark` against the card visual: 3.70:1;
- `--muted` against the card visual: 4.24:1;
- `--ink` against paper/panel surfaces: 14.76:1–15.78:1;
- `--acid`, `--orange`, and `--teal` against the dark hero surface: 5.84:1–13.46:1.

Essential graphical objects exceed 3:1. Small metadata uses `--ink`; brighter accents remain decorative or appear on the dark surface where contrast is sufficient.

## 8. Final Exit Check

- [x] All eight diagrams match their topic model and teaching signal.
- [x] The hero systems remain visually and semantically independent.
- [x] All eight completed simulation links resolve.
- [x] Search, chapter filters, and status filters are unchanged.
- [x] All generated SVG IDs are unique and every marker reference resolves.
- [x] No obsolete visual selector remains.
- [x] Responsive captures pass at 1440, 1024, 800, 480, 460, 375, and 320 px.
- [x] The 200% scaling and reflow checks remain readable without clipping.
- [x] Pointer and keyboard card behavior match the real full-card target.
- [x] Reduced-motion behavior remains intact.
- [x] JavaScript syntax and `git diff --check` pass.
- [x] The related audit findings are marked resolved with evidence.

The landing-page SVG improvement plan is complete.
