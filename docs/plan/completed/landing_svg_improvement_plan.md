# Landing Page SVG Improvement Plan

**Status:** Complete

**Created:** 2026-09-01

**Completed:** 2026-09-02

**Scope:** Landing-page hero illustration and simulation-card SVG thumbnails

**Source:** `docs/audits/2026-09-01_landing_page_ui_ux_audit.md`, screenshots reviewed on 2026-09-01, and follow-up visual-accuracy review

## 1. Objective

Replace the landing page's generic or ambiguous SVG artwork with compact, topic-accurate educational diagrams that help students identify each simulation before opening it.

The work should preserve the existing landing-page composition, typography, palette, card metadata, search/filter behavior, and static vanilla HTML/CSS/JavaScript architecture. This is a targeted visual-remediation effort, not a landing-page redesign.

## 2. Problem Statement

The current `visualSvg(type)` implementation uses a small collection of generic curves, circles, and dashed lines. The thumbnails are stylistically coherent, but several do not encode the defining physics of their topics:

- SHM, progressive waves, superposition, and standing waves are represented by visually similar sinusoidal curves.
- Circular motion does not clearly distinguish tangential velocity from centripetal acceleration.
- The Doppler diagram uses concentric rings, which suggests a stationary source rather than compressed and expanded wavefronts caused by relative motion.
- The hero combines projectile, circular, and wave notation inside one visual field, which can imply that unrelated quantities belong to one physical system.
- Primary diagram strokes currently use colors with less than 3:1 contrast against the card-visual background (`--orange`: approximately 2.33:1; `--teal`: approximately 1.99:1).

For an educational physics index, attractive but scientifically ambiguous artwork is a comprehension problem. Each diagram must be visually economical while remaining physically recognizable.

## 3. Guiding Principles

1. **Physics first.** Every visual must be checked against the simulation's actual model, learning outcome, and stated simplifications.
2. **One teaching signal per thumbnail.** A card diagram should communicate the system and its defining relationship, not reproduce the entire simulation.
3. **No misleading notation.** Arrows, axes, wavefront spacing, nodes, antinodes, and phase relationships must have physically correct direction and placement.
4. **Consistent visual grammar.** Reuse a small set of SVG primitives and palette roles, while allowing each topic to retain a distinct silhouette.
5. **Readable at card size.** Essential geometry must survive at 320 px and 460 px layouts without relying on tiny labels.
6. **Accessible by construction.** Essential strokes should meet 3:1 non-text contrast where required; meaning must not rely on color alone.
7. **Smallest architecture that works.** Keep SVG generation in `landing/app.js` unless the implementation becomes genuinely difficult to maintain. Do not move landing-specific SVG helpers into `shared/`.
8. **Static and restrained.** Do not add decorative animation. The simulations provide motion; the landing thumbnails provide recognition.

## 4. Diagram Contract by Topic

The following contract is the acceptance baseline for the design phase.

| Topic | Required visual content | Avoid |
| --- | --- | --- |
| 2.3 Projectile Motion | `+x/+y` reference, parabolic trajectory, launch point, initial velocity or resolved components, and one clear trajectory landmark such as the apex | A curve without axes; velocity arrow placed away from the projectile; mixing projectile and orbital vectors |
| 5 Circular Motion | Circular path, particle, radius, tangential velocity arrow, and inward centripetal-acceleration/force arrow | An outward acceleration arrow; tangent arrow that does not touch the particle; an unlabeled decorative orbit |
| 7.1 Kinematics of SHM | The default vertical spring–mass system with equilibrium, displacement, and restoring force directed toward equilibrium | A free-floating sine wave; any shape that implies propagation through space |
| 7.2 SHM Graphs | Compact synchronized `x–t`, `v–t`, and `a–t` traces with recognizable, mathematically correct phase offsets | Two nearly identical sine curves; phase relationships that are mathematically incorrect |
| 7.4 Progressive Waves | Wave profile, propagation direction, wavelength interval, and one medium particle shown moving transversely | A static sine curve with no travel direction; implying that particles travel horizontally with the wave |
| 7.5 Superposition | Two equal positive input pulses and a separate, visually dominant resultant showing constructive overlap | Two unrelated traces with no addition relationship; a standing-wave shape |
| 7.6 Standing Waves | A fixed–fixed second harmonic with boundaries, nodes, and antinodes in their valid positions | A progressive-wave profile; nodes placed away from zero displacement; invalid boundary behavior |
| 7.7 Doppler Effect | A source moving toward a stationary observer, with compressed wavefront spacing ahead and expanded spacing behind | Concentric wavefronts centered on the source's current position; showing both source and observer moving |
| Planned | Neutral dashed placeholder or construction frame | A fake physical waveform that suggests a topic has already been selected |

## 5. Phased Delivery

### Phase 0 — Establish the Physics and Visual Baseline

**Status:** Complete — see [Phase 0 baseline and checked diagram contract](landing_svg_phase_0_baseline.md).

**Goal:** Agree on what every SVG must teach before drawing paths.

**Tasks:**

- Review each simulation's theory strip, renderer, and relevant row in `instructions/physics.md`.
- Confirm the exact physical system represented by each card, including direction conventions and simplifications.
- Capture the current hero and cards at 1440, 800, 480, 460, and 320 px as baseline references.
- Record the current SVG bounding boxes, effective stroke widths, and card-visual heights.
- Decide which details are essential, supporting, or intentionally omitted for each topic.
- Confirm that card SVGs remain decorative because the adjacent title and description provide the accessible name and explanation.

**Deliverable:** A checked diagram contract for all eight completed topics plus the planned state.

**Exit criteria:**

- Every required visual element has a physics justification.
- No unresolved choice remains about direction, boundary conditions, or represented mode.
- The baseline screenshots and viewport list are available for comparison.

### Phase 1 — Define a Small SVG Visual Grammar

**Status:** Complete — see [Phase 1 SVG visual grammar and responsive evidence](landing_svg_phase_1_visual_grammar.md).

**Goal:** Make the diagrams consistent without forcing them into the same generic waveform.

**Tasks:**

- Retain the current `viewBox="0 0 120 74"` initially to minimize layout churn.
- Define reusable local primitives for axes, arrowheads, dashed guides, particles, equilibrium lines, brackets, nodes, antinodes, and boundaries.
- Use semantic SVG classes such as `.diagram-primary`, `.diagram-secondary`, `.diagram-guide`, `.diagram-particle`, `.diagram-axis`, and `.diagram-resultant`.
- Assign color by meaning rather than topic:
  - `--ink` or another compliant dark token for essential axes and geometry;
  - `--orange-dark` for a primary physical quantity on the light card surface;
  - `--muted` for secondary guides;
  - brighter orange/teal only for nonessential decoration or when contrast is corrected by stroke treatment.
- Add non-color distinctions: solid versus dashed strokes, arrow direction, marker shape, and stroke weight.
- Give generated card SVGs explicit intrinsic `width` and `height` attributes while allowing CSS to scale them responsively.
- Keep arrowhead markers scoped or uniquely identified so repeated cards do not create duplicate-ID conflicts.

**Deliverable:** One documented set of SVG classes and primitives implemented locally in the landing page.

**Exit criteria:**

- Essential diagram elements meet at least 3:1 contrast against the card background.
- The primitives render cleanly at desktop and narrow-mobile card sizes.
- No new raw hex colors are introduced.
- No landing-specific SVG code is added to `shared/`.

### Phase 2 — Pilot Two Scientifically Distinct Cards

**Status:** Complete — see [Phase 2 pilot results and responsive evidence](landing_svg_phase_2_pilots.md).

**Goal:** Validate the visual grammar before replacing every thumbnail.

**Pilot cards:**

1. **2.3 Projectile Motion** — geometry, axes, components, and a trajectory.
2. **7.7 Doppler Effect** — source/observer relationship and nonuniform wavefront spacing.

These topics are deliberately different: one tests vector/trajectory notation; the other tests repeated wavefront geometry and relative-motion clarity.

**Tasks:**

- Replace only the two pilot SVG templates.
- Verify that the projectile path, vector placement, and axes are internally consistent.
- Verify that Doppler wavefronts are compressed ahead and expanded behind the moving source, with the source visibly displaced from older wavefront centers.
- Check whether small text is necessary. Prefer geometry; use at most one or two short symbols where they materially improve comprehension.
- Compare both cards with their corresponding simulation first frames.
- Review at 1440, 800, 480, 460, and 320 px.

**Deliverable:** Two approved card diagrams that establish the fidelity and density standard for the remaining cards.

**Exit criteria:**

- A viewer can identify both topics without the visible `visual-type` label.
- Physics arrows and wavefront spacing pass review.
- Neither SVG clips, overflows, or becomes illegible at the target widths.
- The cards remain visually balanced with the existing text content.

### Phase 3 — Replace Motion and SHM Thumbnails

**Status:** Complete — see [Phase 3 motion and SHM results](landing_svg_phase_3_motion_shm.md).

**Goal:** Complete the mechanically related diagrams using the approved grammar.

**Topics:**

- 5 Circular Motion
- 7.1 Kinematics of SHM
- 7.2 SHM Graphs Analysis

**Tasks:**

- Draw tangential velocity and inward centripetal acceleration from the same orbiting particle for Topic 5.
- Use a reference-circle projection or clear oscillator/equilibrium construction for Topic 7.1 so it cannot be mistaken for a travelling wave.
- Use compact separated graph lanes for Topic 7.2, with phase relationships checked against `x`, `v`, and `a` equations.
- Give each topic a distinct silhouette at thumbnail scale.
- Remove or revise the `visual-type` text if it becomes redundant after the diagrams are recognizable.

**Deliverable:** Approved Topic 5, 7.1, and 7.2 card diagrams.

**Exit criteria:**

- Circular-motion vectors have correct directions.
- The SHM diagram shows equilibrium/displacement rather than propagation.
- The graph diagram encodes correct relative phase.
- All three remain distinguishable in grayscale and at 320 px.

### Phase 4 — Replace Wave-Behavior Thumbnails

**Status:** Complete — see [Phase 4 wave-behavior results](landing_svg_phase_4_wave_behaviors.md).

**Goal:** Make Topics 7.4–7.6 distinguishable by physical behavior rather than by small curve variations.

**Topics:**

- 7.4 Progressive Waves
- 7.5 Superposition of Waves
- 7.6 Application of Standing Waves

**Tasks:**

- For Topic 7.4, separate wave-pattern travel from particle motion using orthogonal arrows and a wavelength interval.
- For Topic 7.5, use two input lanes and one resultant lane, or another composition that makes addition explicit.
- For Topic 7.6, show a valid harmonic with visible nodes/antinodes and correct boundaries.
- Check that no thumbnail accidentally implies a different wave type.
- Replace the planned zigzag with a neutral construction/placeholder graphic.

**Deliverable:** Approved Topic 7.4, 7.5, 7.6, and planned-state diagrams.

**Exit criteria:**

- Progressive, superposition, and standing-wave cards are visually distinguishable without captions.
- Particle motion is not confused with propagation.
- Node, antinode, and boundary positions are physically valid.
- The planned state does not resemble a completed physics model.

### Phase 5 — Redesign the Hero Illustration

**Status:** Complete — see [Phase 5 hero illustration results](landing_svg_phase_5_hero.md).

**Goal:** Preserve the strong scientific identity while removing the implication that unrelated quantities share one physical system.

**Preferred direction:** Divide the hero into three visually connected but spatially distinct fields:

1. projectile trajectory and launch vector;
2. circular motion with tangential and inward vectors;
3. progressive wave with propagation and particle-motion cues.

**Tasks:**

- Give each field its own local reference frame or clear separation.
- Remove ambiguous labels that currently overlap unrelated systems.
- Keep the hero expressive rather than turning it into a dense textbook plate.
- Update the hero's accessible label so it accurately describes the final composition.
- Preserve the current hero dimensions initially, then apply the responsive height correction identified in `RESP-002`.

**Deliverable:** One coherent, topic-accurate hero illustration.

**Exit criteria:**

- No vector or symbol can reasonably be interpreted as belonging to the wrong system.
- The hero remains subordinate to the heading and primary CTA.
- The illustration does not push simulation discovery disproportionately far down the page at 800 px.
- The `role="img"` accessible label matches the visible systems.

### Phase 6 — Responsive, Accessibility, and Interaction Integration

**Status:** Complete — see [Phase 6 responsive and accessibility integration results](landing_svg_phase_6_integration.md).

**Goal:** Ensure that improved scientific detail does not create new usability problems.

**Tasks:**

- Cap SVG dimensions so diagrams do not grow taller at intermediate widths than at desktop.
- Recheck the one-column card breakpoint around 480 px while assessing the new thumbnails.
- Verify 3:1 contrast for essential non-text diagram elements against their immediate background.
- Verify that color is not the only means of distinguishing primary, secondary, resultant, node, or direction states.
- Keep card SVGs `aria-hidden="true"` if all educational meaning remains duplicated in adjacent card text.
- If any diagram introduces meaning not present in card text, add an appropriate text alternative rather than exposing raw SVG paths to assistive technology.
- Align hover behavior with the actual clickable area so improved artwork does not strengthen the existing false whole-card affordance.
- Confirm that reduced-motion behavior remains unchanged because the new diagrams are static.

**Deliverable:** Responsive and accessible SVG integration across the landing page.

**Exit criteria:**

- No horizontal overflow or clipping at 320, 375, 460, 480, 800, 1024, or 1440 px.
- Essential lines and markers remain visible on bright displays.
- Diagram size supports scanning rather than dominating card content.
- Keyboard and pointer interaction behavior remains clear.

### Phase 7 — Final Physics and Regression QA

**Status:** Complete — see [Phase 7 final physics and regression QA](landing_svg_phase_7_final_qa.md).

**Goal:** Confirm educational correctness and prevent landing-page regressions.

**Tasks:**

- Review every diagram against `instructions/physics.md`, its simulation theory strip, and the corresponding first simulation frame.
- Verify projectile coordinates, circular-vector directions, SHM phase relationships, wave travel direction, superposition addition, standing-wave boundaries, and Doppler spacing.
- Run JavaScript syntax checking and link-target checks.
- Exercise search and chapter/status filters after SVG replacement.
- Compare before/after screenshots at all target widths.
- Test with browser zoom at 200% and inspect card readability.
- Confirm that no new console errors, duplicate SVG IDs, layout shifts, or unused visual classes remain.
- Update the landing audit or mark related findings resolved only after verification.

**Deliverable:** QA record and approved landing-page visual set.

**Exit criteria:**

- All diagrams pass physics, responsive, contrast, and regression checks.
- All eight completed simulation links still resolve.
- Search/filter behavior is unchanged.
- `git diff --check` passes and no unrelated files are modified.

## 6. Expected File Scope

Primary implementation files:

- `landing/app.js` — topic-specific SVG templates and small local SVG helpers.
- `landing/style.css` — semantic diagram classes, contrast-safe strokes, and responsive size caps.
- `landing/index.html` — hero SVG composition and accessible label only.

Reference-only files:

- `instructions/physics.md`
- simulation HTML theory strips and renderers under `animations/`
- `shared/sim-style.css` for canonical tokens
- `shared/sim-utils.js` for palette naming reference

Documentation files updated only if needed:

- this active plan
- `docs/audits/2026-09-01_landing_page_ui_ux_audit.md` when findings are verified as resolved

No new framework, build tooling, image assets, or shared runtime module is expected.

## 7. QA Matrix

| Check | Desktop | Tablet | Mobile | Physics review |
| --- | --- | --- | --- | --- |
| Hero composition | 1440, 1024 | 800 | 460, 320 | Systems remain independent and labels are unambiguous |
| Card recognition | 1440 | 800, 480 | 460, 375, 320 | Topic identifiable without `visual-type` text |
| Stroke/marker clarity | Yes | Yes | Yes | Essential geometry has correct direction/position |
| Contrast | 3:1 essential graphics | 3:1 essential graphics | 3:1 essential graphics | Meaning does not depend on low-contrast color |
| Layout stability | No shift/clip | No shift/clip | No overflow/clip | Not applicable |
| Interaction regression | Search, filter, launch | Search, filter, launch | Search, filter, launch | Not applicable |

## 8. Completion Definition

This plan is complete when:

- all eight completed topics have distinct, physically defensible card diagrams;
- the planned card uses a neutral placeholder;
- the hero no longer combines unrelated notation ambiguously;
- diagrams remain legible and proportionate across the target viewports;
- essential graphics meet contrast and non-color differentiation requirements;
- the landing page retains its current information architecture and behavior unless a separately approved remediation item changes them;
- final screenshots and physics review show that each visual supports, rather than competes with or misrepresents, the educational content.
