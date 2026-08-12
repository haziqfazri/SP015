---
name: physics-accuracy-checker
description: Verify the physics correctness of a simulation against the curriculum spec and repo physics conventions. Use when asked to check a sim's equations, units, sign conventions, LOs, or physical realism, or to verify physics before release.
---

# Physics Accuracy Checker

Ground truth is the curriculum spec at the repo root
(`SP015-curriculum-spec.md` for SP015; the SP025 spec is not yet converted)
plus `instructions/physics.md` (units, coordinates, vector/sign conventions,
simplifications). Never trust memory of formulas — read the spec file or a
citable reference. Report as an in-chat pass/fail checklist with `file:line`
evidence per item. A wrong answer on any of these is a physics bug, not a
style issue.

## 1. Equations match the spec

- For each equation in the sim's physics file, confirm it matches the spec
  exactly: symbols, units, sign conventions, and the scope of the LO.
  Cite the spec section in your finding.
- Check derived quantities are computed correctly from stored independents:
  e.g. `λ = v/f`, `ω = 2πf`, `T = 1/f`, `a = -ω²x` for SHM.

## 2. LO citations

- Every non-obvious equation has an inline comment citing the LO
  (`SP015 7.1(c.iii)`).
- The theory strip matches the LO wording and the cited formulas.
- Flag any LO cited in a comment that the sim does not actually demonstrate.

## 3. Independent vs. derived separation (physics.md §2)

- Derived values are getters, never a second stored/cacheable field that
  could drift from the slider values (`v`/`f` stored, `λ = v/f` derived).
- Sliders map to independent physical quantities; readouts of derived
  quantities update live from them.

## 4. Sign conventions (physics.md §2)

- Screen y grows downward; physics y grows upward — renderer maps with
  `centerY - value * scale`, never mixing the two without an explicit flip.
- Angles measured counterclockwise from +x axis = 0; stored/integrated in
  radians, converted to degrees only at the UI display layer.
- Wave propagation: `+x` travel uses `(ωt − kx)`, `−x` uses `(ωt + kx)`;
  direction stored as `direction: +1 | -1`, never a boolean.
- Forcing/restoring quantities match direction conventions (F = −kx points
  toward equilibrium; acceleration and force agree in sign).

## 5. Simplifications stated (physics.md §3)

- Ideal period `T = 2π√(L/g)` labeled exact only for small angles; pendulum
  integrates exact `sin(θ)`, not small-angle.
- Undamped/ideal oscillators by default — no silent damping or energy loss.
- Kinematic-only models (wave particle motion, pulse shapes) stated as
  descriptive, not derived from dynamics.
- Any numeric assumption (e.g. `assumedMass: 1.00 kg`) is stated in a UI
  note, not hidden.

## 6. Integration and numerics

- Run `node .kilo/scripts/check-dt.mjs` on the sim's folder; confirm every
  clock-derived dt is clamped (`Math.min(deltaTime / 1000, 0.03)`).
- Semi-implicit Euler used where closed forms don't exist; analytic closed
  form preferred when one does (`x = A sin(ωt)`).
- Check for drift/stability at the sim's max slider settings (large
  amplitude, large dt): integration must not blow up.

## 7. Numeric sanity spot-checks

- Pick 2–3 known parameter sets and verify readouts against the closed-form
  prediction at a specific t (e.g. `x = A sin(ωt)`, range/height for
  projectile motion, `λ = v/f`).
- Verify unit conversions in the UI (Hz, rad/s, N, J) are correct and
  labeled.
- Verify vector magnitudes/directions at key instants: equilibrium (F = 0),
  amplitude (v = 0, a max), t = T/4, etc.

## Output

Per item: PASS/FAIL + `file:line` + a one-line justification (the spec
reference — `SP015-curriculum-spec.md` section — or equation check). Any FAIL
is a hard blocker — state it as NO-GO with the list.
