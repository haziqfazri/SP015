# 7.5 Wave-Direction Choice Plan

**Status:** Complete

**Created:** 2026-09-02

**Completed:** 2026-09-02

**Scope:** Direction selection for the continuous-wave Interference mode in Topic 7.5

## 1. Summary

Add a two-option direction relationship control to the existing Interference mode:

- Same direction: Wave A `+x`, Wave B `+x`.
- Opposite directions: Wave A `+x`, Wave B `−x`.

Pulse Superposition remains unchanged because its opposing pulses intentionally demonstrate collision and overlap.

## 2. Implementation Changes

### `wave-superposition.html`

- Add a labelled two-button `system-switch` inside Interference controls.
- Use `aria-pressed` and active-state styling consistent with the existing 7.4 direction controls.
- Add dynamic direction labels to the Wave A and Wave B canvas panels.
- Replace the fixed interference equation, phase note, and microcopy with elements that update when the relationship changes.
- Make the explanatory text physically correct for both cases:
  - same direction → travelling-wave interference;
  - opposite direction → standing-wave behaviour for matched waves.

### `wave-superposition-physics.js`

- Add direction constants using `+1` and `−1`.
- Add `ProgressiveWave.setDirection(direction)` that rejects values other than `+1` and `−1`.
- Preserve the repository wave convention:
  - `+x`: `y = A sin(ωt − kx + phase)`;
  - `−x`: `y = A sin(ωt + kx + phase)`.
- Keep Wave A fixed at `+x`; only Wave B changes direction.
- Leave `PulseWave` direction behavior untouched.

### `wave-superposition-controller.js`

- Add an interference relationship state defaulting to `same`.
- Wire `onInterferenceDirectionChange` from the UI.
- Set Wave B’s direction to `+1` or `−1` from the selected relationship.
- Preserve current time, amplitude, wavelength, angular frequency, and phase when switching direction.
- Keep the selected relationship across reset; reset continues to reset time only.
- Recompute displayed equations and direction summaries immediately.
- Redraw all interference canvases whether playing or paused.

### `wave-superposition-ui.js`

- Cache the direction buttons, Wave A/B direction labels, dynamic equation elements, and direction explanation.
- Bind relationship buttons through the existing callback pattern.
- Synchronize active classes and `aria-pressed`.
- Update the Wave A, Wave B, resultant, and phase-note equations through `renderMath()` rather than raw math markup.
- Update accessible labels and text so the relationship is understandable without relying on color or canvas visuals.

### `wave-superposition.css`

- Add only the minimum layout rules needed for the relationship control and responsive wrapping.
- Reuse `.system-switch`, `.system-option`, `.control-row`, and shared spacing tokens.
- Keep both options usable at the repository’s narrow breakpoints.

No renderer change is required: direction is communicated by the relationship control and the existing HTML canvas labels, while the three canvases continue to render the physics state they receive.

## 3. Equation and Microcopy Rules

Same direction:

```text
y_A = A sin(ωt − kx)
y_B = A sin(ωt − kx + Δφ)
```

For this relationship, retain the existing interpretation:

- `Δφ = 0` → fully constructive;
- `Δφ = π` → fully destructive.

Show the same-direction resultant relationship:

```text
y_R = 2A cos(Δφ/2) sin(ωt − kx + Δφ/2)
```

Opposite directions:

```text
y_A = A sin(ωt − kx)
y_B = A sin(ωt + kx + Δφ)
```

Show the equivalent resultant relationship in the theory area:

```text
y_R = 2A sin(ωt + Δφ/2) cos(kx + Δφ/2)
```

Explain that opposite-direction waves form a standing pattern for matched frequency and wavelength, and that changing `Δφ` shifts the spatial positions of nodes and antinodes rather than causing uniform cancellation everywhere.

## 4. Test Plan

### Physics

- Default relationship creates Wave A `+1` and Wave B `+1`.
- Opposite selection changes only Wave B to `−1`.
- Wave A remains `+1`.
- Resultant values follow the selected signed wave equations.
- Pulse-mode directions and collision timing remain unchanged.

### UI

- Direction buttons update active state and `aria-pressed`.
- Wave B’s canvas label changes between `+x` and `−x`.
- Equations and explanatory text update after selection.
- Switching direction while paused redraws immediately.
- Switching while playing does not stop playback or reset time.
- Reset returns time to zero while preserving the selected relationship.

### Regression and quality

- Run `node --check` for every modified JavaScript file.
- Run `git diff --check`.
- Keep DOM access out of the physics module.
- Check for duplicate SVG/canvas IDs and stale selectors.
- Confirm the same-direction-only constructive/destructive note is replaced when opposite directions are selected.
- Check for console errors on initial load, mode switch, direction switch, reset, and play.

### Responsive and accessibility

- Inspect Interference mode at approximately 1440, 800, 460, and 320 px.
- Confirm the relationship control, direction labels, equations, and canvas panels do not overflow or become ambiguous.
- Verify keyboard operation and visible focus states.

## 5. Assumptions

- The feature applies to Interference mode only.
- Wave A is the fixed `+x` reference; students choose the relationship for Wave B.
- The default remains Same direction to preserve current behavior.
- Direction changes preserve time and all other parameters.
- No new framework, shared utility, or renderer architecture is required.
- Move this plan to `docs/plan/completed/` only after implementation and QA pass.

## 6. Completion Record

Implemented the scoped relationship selector for Interference mode. Wave A
remains the `+x` reference; Wave B now switches between `+x` and `−x` while
preserving time, playback, amplitude, wavelength, angular frequency, and phase.
The canvas labels, phase guidance, explanatory copy, accessible labels, and
KaTeX equations update with the selected relationship. Pulse Superposition and
the renderer remain unchanged.

QA completed:

- JavaScript syntax checks passed for all four simulation modules.
- Numerical tests passed for both resultant identities, same-direction
  cancellation at `Δφ = π`, invalid direction rejection, and the original
  pulse collision timing.
- Controller tests passed for direction changes, state preservation, reset
  persistence, and invalid relationship rejection.
- UI tests passed for active state, `aria-pressed`, labels, explanations, and
  dynamic inline/display KaTeX rendering.
- HTML checks passed for required and duplicate IDs.
- Firefox localhost checks passed at desktop, 460 px, and 320 px with all
  assets loading and the opposite-direction state rendering correctly. The
  320 px pass exposed equation clipping; the resultant was split into aligned
  factors and narrow display math was scaled down, then rechecked without
  overflow.
- `git diff --check` passed.
