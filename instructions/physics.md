# Physics — Units, Conventions & Simplifications

## 1. Units

- SI throughout: metres (m), seconds (s), kilograms (kg), radians (rad),
  Hz for frequency, N for force, J for energy.
- Angles are stored and integrated in **radians** internally; converted to
  degrees only at the UI display layer (e.g. pendulum's
  `(x * 180 / Math.PI).toFixed(0) + '°'`).
- Readouts always show units in the formatted string, not just the label
  (e.g. `'+0.35 m'`, `'20 N/m'`, `'4.0 rad/s'`).
- Mass defaults to an explicit assumed value when not a slider (e.g.
  `assumedMass: 1.00` kg in `shm-graphs-analysis`), stated in a UI note so
  students know it's fixed, not derived.

## 2. Coordinate system & vector conventions

- Screen y grows **downward**; physics y (displacement, amplitude) grows
  **upward** — every renderer negates or subtracts when mapping physics→
  pixels (`centerY - value * scale`). Never mix the two without an
  explicit sign flip at the mapping function.
- Horizontal motion (spring, wave x-axis) maps physics x directly to pixel
  x via a fixed `pxPerMetre`-style scale constant, always named to make
  the unit conversion explicit (`pxPerMetreX`, `PX_PER_METER`).
- Angles measured **counterclockwise from +x axis = 0**, standard math
  convention (circular motion's `θ`, reference-circle's `theta`).
- Wave propagation sign convention (SP015 7.4): `+x` travel uses
  `(ωt − kx)`; `−x` travel uses `(ωt + kx)` — sign is opposite the
  direction of travel. Stored as `direction: +1 | -1`, never a separate
  boolean.
- Vectors (velocity, acceleration, force arrows) are drawn from a fixed
  anchor point outward, length **normalized** via
  `normalizedArrowLength(magnitude, min, max)` so quantities of very
  different physical scale still read as comparable arrow lengths on
  screen — never drawn at literal-pixel-per-unit scale.
- Independent vs. derived quantities are never both stored: e.g. wave
  speed `v` and frequency `f` are independent stored fields; wavelength
  `λ = v/f` is always a computed getter, never cached — this is what keeps
  the f-vs-λ inverse relationship correct when v is held fixed.

## 3. Numerical assumptions & simplifications

- **Integration:** simple semi-implicit Euler (`v += a*dt; x += v*dt`) for
  spring/pendulum — adequate at the amplitudes/timescales used, not
  intended for long-run energy conservation. Reference-circle and SHM
  graphs sims instead use **analytic** closed-form position (`x = A sin(ωt)`
  computed directly from elapsed time), which never drifts — prefer this
  approach whenever a closed form exists.
- **`dt` clamping:** every controller clamps `dt` per frame (typically to
  `0.03`–`0.1` s) so a tab-switch stall or slow frame never causes an
  integration blow-up.
- **Pendulum:** uses the **exact** `sin(θ)` restoring term, not the
  small-angle approximation — the sim explicitly shows large-angle
  deviation from ideal SHM rather than hiding it. The stated ideal period
  formula (`T = 2π√(L/g)`) is labeled as exact only for small angles.
- **Wave particle model:** particles undergo pure vertical SHM at fixed x;
  no medium/particle mass or restoring-force model is simulated — this is
  kinematic only, matching SP015 7.4's scope (no dynamics required).
- **Pulse superposition:** pulses are a fixed-shape traveling Gaussian
  (descriptive, not derived from a wave equation) — sufficient because the
  LO only requires demonstrating the superposition principle, not deriving
  pulse shape.
- **Damping:** none of the current sims model damping/energy loss unless
  explicitly noted — oscillators are ideal/undamped by default.
- State that can be derived analytically from stored fields is always a
  getter, never a second stored value that could drift (see §2).

## 4. SP015 learning outcomes by sim type (high level)

| Sim type | Topic | LO focus |
| --- | --- | --- |
| Projectile Motion | 2.3 | Angled, horizontal, and vertical launch cases; resolved kinematics and range/time/maximum-height problems |
| Circular motion | 6.x | Angular position/velocity, centripetal accel/force, period, uniform circular motion |
| Oscillation Laboratory (spring, pendulum, reference circle) | 7.1 | Defining SHM, connection between circular motion and SHM, restoring force/torque |
| SHM Graphs Analysis | 7.2 | Shape and relationship of x-t, v-t, a-t, and E-x graphs at a given instant |
| Progressive Waves | 7.4 | y(x,t) equation, particle vs. wave-pattern velocity, λ derived from v and f |
| Superposition of Waves | 7.5 | Superposition principle, constructive/destructive interference, pulse vs. continuous-wave interference |
| Application of Standing Waves | 7.6 | Standing waves on stretched strings and in open/closed air columns, allowed harmonics, node/antinode positions |
| Doppler Effect | 7.7 | Apparent frequency for a stationary observer + moving source, or vice versa (SP015 7.7(b) scope — never both moving at once) |

New sims should add a row here (and cite the specific sub-LO, e.g.
`7.1(c.iii)`, in code comments) as soon as their topic is decided.
