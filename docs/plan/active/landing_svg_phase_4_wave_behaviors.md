# Landing SVG Phase 4 Wave-Behavior Results

**Status:** Complete

**Completed:** 2026-09-02

**Parent plan:** [Landing Page SVG Improvement Plan](landing_svg_improvement_plan.md)

**Scope:** Progressive Waves, Superposition of Waves, Application of Standing Waves, and the planned-state card diagrams

## 1. Outcome

The three wave-family thumbnails now communicate different physical behaviors instead of using minor variations of the same sinusoidal motif. Progressive Waves separates pattern propagation from transverse particle motion, Superposition uses two input lanes and a dominant resultant lane, and Standing Waves shows a valid fixed–fixed second harmonic with explicit extrema. The planned card now uses a neutral construction frame rather than a fake waveform.

All four replacements use the existing Phase 1 SVG grammar and `120 x 74` viewBox. No simulation code, shared utilities, page layout, interaction behavior, or hero artwork changed in this phase. The redundant `wave`, `superposition`, `standing`, and `planned` visual-type captions were removed; adjacent card copy continues to provide the accessible explanation while the generated SVGs remain `aria-hidden="true"`.

## 2. Progressive Waves

### Represented state

The diagram shows a transverse progressive wave travelling in `+x`. The selected medium particle is at an equilibrium crossing where its instantaneous velocity is upward.

### Included geometry

- One full wavelength between consecutive crests.
- A dashed equilibrium line.
- A horizontal rightward arrow for wave-pattern propagation.
- A marked particle at a fixed horizontal position.
- A vertical velocity arrow originating at that particle.
- A crest-to-crest bracket labelled `lambda`.

### Correctness check

The profile crosses equilibrium at the marked particle while descending in physics coordinates as `x` increases. For the repository convention `y = A sin(omega t - kx)`, this corresponds to positive particle velocity, so the upward vertical arrow is internally consistent with the displayed `+x`-travelling snapshot. The orthogonal arrows distinguish horizontal pattern motion from vertical medium-particle motion; no horizontal particle arrow is present.

The crest coordinates are `x = 28` and `x = 108` in viewBox space, and the wavelength bracket uses those exact endpoints. The implementation was checked against [the Progressive Waves simulation first frame](evidence/landing-svg-phase-4/progressive-wave-simulation-first-frame.png), `WaveState.phase()`, `particleVelocityAt()`, and the renderer's separate propagation and particle-velocity arrows.

## 3. Superposition of Waves

### Represented state

The diagram represents the simulation's default pulse mode: two equal positive pulses approach from opposite directions, with a separate lane showing their complete constructive overlap.

### Included geometry

- Three separated lanes labelled `A`, `B`, and `R`.
- Equal positive input pulses with identical 10-unit displacements from their local baselines.
- Rightward and leftward input-direction arrows.
- A heavier resultant curve with a 20-unit displacement at its peak.

### Correctness check

The input profiles have equal shape and amplitude. The resultant's displacement is exactly twice either input displacement, encoding `y_resultant = y_A + y_B` at complete overlap. Separating the curves into lanes makes the addition relationship legible without creating a standing-wave silhouette.

Three one-character lane labels are retained because the same geometry would otherwise leave input versus resultant roles ambiguous. Stroke weight and lane position also distinguish the resultant, so the relationship does not depend on color. The design was checked against [the Superposition simulation first frame](evidence/landing-svg-phase-4/superposition-simulation-first-frame.png), the equal `LIMITS.ampDefault` values, opposite `PulseWave.direction` values, and `PulseSuperposition.resultantAt()`.

## 4. Application of Standing Waves

### Represented state

The diagram uses the Phase 0 selected state: a string fixed at both ends in the second harmonic, `n = 2`. The full simulation initially opens on the fundamental, but its harmonic selector supports `n = 2`; the second harmonic was deliberately selected for the thumbnail because its center node makes standing-wave behavior distinct from the other wave cards.

### Included geometry

- Fixed boundaries at `x = 10` and `x = 110`.
- Nodes at both boundaries and the midpoint: `x = 10`, `60`, and `110`.
- Antinodes at the quarter points: `x = 35` and `85`.
- Two opposite-sign loops for the instantaneous second-harmonic shape.
- A dashed opposite-phase envelope.
- Circular node markers and diamond antinode markers.

### Correctness check

Every node lies on the equilibrium line, including both fixed ends. The antinodes lie midway between adjacent nodes. The solid and dashed profiles share all three nodes and exchange their positive and negative extrema, representing stationary phase reversal without a propagation arrow.

The positions agree with `lambda_2 = L`, node spacing `lambda/2`, and antinode offset `lambda/4` from `StretchedString.nodePositions()` and `antinodePositions()`. The boundary treatment and envelope were compared with [the Standing Waves simulation first frame](evidence/landing-svg-phase-4/standing-wave-simulation-first-frame.png) and the renderer's fixed-end and static-envelope implementation.

## 5. Planned State

The old zigzag has been replaced with a dashed rectangular construction frame, solid corner marks, and centered dashed registration guides. It contains no trajectory, wave profile, particle, vector, node, or boundary-condition cue. The existing `Planned` status and card text carry the meaning; the graphic only signals an unassigned space.

## 6. Responsive and Non-Color Evidence

| Viewport | Evidence | Result |
| ---: | --- | --- |
| 1440 px | [cards-1440.png](evidence/landing-svg-phase-4/cards-1440.png) | All three wave behaviors and the planned state remain distinct at desktop card width |
| 800 px | [cards-800.png](evidence/landing-svg-phase-4/cards-800.png) | Two-column cards preserve arrow direction, pulse lanes, and extrema markers |
| 480 px | [cards-480.png](evidence/landing-svg-phase-4/cards-480.png) | Compact two-column cards retain the wavelength label and three-lane addition structure |
| 460 px | [cards-460.png](evidence/landing-svg-phase-4/cards-460.png) | One-column enlargement introduces no clipping or unbalanced whitespace |
| 320 px | [cards-320.png](evidence/landing-svg-phase-4/cards-320.png) | Minimum-width cards preserve the particle arrow, lane labels, nodes, antinodes, and placeholder frame |

The diagrams remain distinguishable without color:

- Progressive Waves uses orthogonal arrows, one continuous profile, a particle marker, and a wavelength bracket.
- Superposition uses three stacked lanes, opposed input arrows, and a heavier doubled resultant.
- Standing Waves uses fixed boundaries, circular nodes, diamond antinodes, and a mirrored dashed envelope.
- Planned uses only a neutral construction frame and registration guides.

No new color token or raw color value was introduced. Essential shapes continue to use the contrast-safe semantic roles established in Phase 1.

## 7. Phase 4 Exit Check

- [x] Progressive-wave pattern motion and particle motion are orthogonal and unambiguous.
- [x] The selected particle's velocity direction is consistent with the displayed `+x`-travelling profile.
- [x] The wavelength bracket spans consecutive crests.
- [x] Superposition inputs are equal, positive, and oppositely directed.
- [x] The resultant displacement is exactly double either input displacement.
- [x] Standing-wave boundaries, nodes, antinodes, and phase envelope are physically valid for fixed–fixed `n = 2`.
- [x] The planned graphic does not resemble a completed physical model.
- [x] All four diagrams remain recognizable without visual-type captions or color alone.
- [x] Compared with the simulation sources and captured reference frames.
- [x] Reviewed at 1440, 800, 480, 460, and 320 px.
- [x] No clipping, overflow, or illegibility found.
- [x] JavaScript syntax check passes.
- [x] No simulation, shared utility, hero, layout, or unrelated card implementation changed.
