# Checklist — Before Calling a Simulation "Done"

## Functionality
- [ ] Play/Pause/Reset/Step all work and update button labels correctly
- [ ] Sliders update state live (`input` event) and their `<output>` value
      matches what's actually applied to the physics
- [ ] Mode/system toggles (if any) correctly swap stage, controls, theory
      text, and `aria-pressed` state
- [ ] Resize (`windowResized`) keeps canvas(es) filling their holder(s)
      without distortion
- [ ] Sim starts in a sensible paused first frame (`noLoop(); redraw();`),
      never blank on load

## Physics accuracy
- [ ] Equations match the SP015/SP025 spec exactly (check against
      `SP015-curriculum-spec.md`, not memory) — units, symbols, and sign
      conventions all correct
- [ ] Every equation/simplification has a comment citing the LO
      (e.g. `SP015 7.1(c.iii)`)
- [ ] Independent vs. derived quantities are correctly separated (derived
      values are getters, never a second stored/cacheable field)
- [ ] `dt` is clamped in the update loop
- [ ] Simplifications (small-angle, undamped, kinematic-only, etc.) are
      explicitly stated in a comment or on-screen note, not silently assumed

## UI consistency
- [ ] Uses `shared/sim-style.css` unmodified; topic CSS only adds
      sim-specific rules, doesn't redeclare shared ones
- [ ] Colors reference `PALETTE` from `shared/sim-utils.js` — no inline
      hex, `rgb()`, or opaque-number literals in canvas code
- [ ] Fonts, colors, spacing match the established palette (§4 of
      `coding.md`) — no new ad hoc hex colors or spacing values
- [ ] Readouts show correct units and consistent decimal formatting
      (`signedFixed` for signed quantities)
- [ ] Math notation uses KaTeX (`data-latex` + shared `renderMath`), not
      raw HTML entities or `<sub>`/`<sup>` markup; live numeric readouts
      stay plain DOM text
- [ ] Button/slider placement matches the standard `.button-grid` /
      `.control-row` layout
- [ ] Theory strip text matches the LO wording and cites correct formulas

## Code cleanliness
- [ ] Architecture is no more complex than the simulation requires; no file,
      class, or abstraction was added merely to match a template
- [ ] Comments explain physics, assumptions, or non-obvious reasoning rather
      than restating obvious code
- [ ] File responsibilities respected: physics has no DOM/canvas access,
      UIManager has no physics math, renderer has no held state or physics
      derivation beyond unit→pixel mapping
- [ ] `PHYSICS`/`LIMITS`/`DISPLAY` constants are the single source of
      truth; HTML `min`/`max`/`value` attributes are cosmetic only
- [ ] No duplicated helper that already exists in `shared/sim-utils.js`
      (arrows, dashed guides, trail dots, `signedFixed`, `updateReadout`)
- [ ] Any newly-duplicated logic (found in 2+ sims) has been moved into
      `shared/`
- [ ] Class/method names follow convention (`UIManager`,
      `SimulationController`, `integrate()`/`energy()`/`period()`/`reset()`)
- [ ] Rolling buffers (trail/history) are capped and trimmed, never
      unbounded

## Performance
- [ ] Readout DOM writes are diffed (`updateReadout`), not unconditional
      per frame
- [ ] `update(dt)`/the per-frame loop only calls `ui.updateReadouts(...)`
      if the readouts depend on `t`/`dt`/integrated state — readouts
      driven purely by slider/param values are updated from that
      param's `on*Change` callback instead, not the per-frame loop
      (see `docs/architecture.md` §5)
- [ ] Multi-canvas sims share one clock/ticker rather than independent
      free-running loops
- [ ] No console errors/warnings on load, slider drag, or mode switch

## Final pass
- [ ] `docs/architecture.md` updated if this sim introduced a new pattern,
      shared module, or file-split convention
- [ ] Sim tested at both desktop width and the `800px`/`460px` responsive
      breakpoints
