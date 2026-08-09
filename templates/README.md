# Simulation Template

Starting point for every new SP015/SP025 sim. See `docs/architecture.md` for
the full rationale — this is just the condensed checklist.

## Setup

1. Copy the files you need into the appropriate topic folder under
   `animations/`. Keep the simulation self-contained inside that topic folder.
2. Find-and-replace `Template` → `YourSimName` (classes) and `template-` →
   `your-sim-name-` (filenames) across all files.
3. Rename the files themselves to match.

## Choose the smallest architecture first

Do not copy every template file automatically. Start with the smallest
structure that fits the simulation, then add separation only when complexity
justifies it. See `docs/architecture.md` for the three architecture levels.

- **Level 1:** `sim.js` + `sketch.js` + CSS/HTML.
- **Level 2:** add `physics.js` and/or `controller.js` when the separation
  materially improves clarity.
- **Level 3:** use separate physics, controller, renderer, UI, and sketch files
  only for genuinely complex simulations.

## Build order

- [ ] **Pick the LO.** Identify the SP015/SP025 topic + learning outcome(s).
      Cite it directly in file-header comments (e.g. `SP015 7.5(a)`).
- [ ] **Fill in `PHYSICS` / `LIMITS` / `DISPLAY`** in `*-physics.js` first —
      these are the single source of truth for slider ranges/scaling, not
      the HTML's `min`/`max`/`value` attributes.
- [ ] **Write the physics logic/class(es).** Keep physics independent of DOM
      and canvas when the chosen architecture calls for that separation.
      Derive quantities on demand from stored independent fields rather than
      caching them when appropriate.
- [ ] **Write UI handling.** For a larger simulation, use a `UIManager` to
      cache DOM elements, bind events, and expose callbacks. A small simulation
      may keep simple UI handling with its controller/sketch instead of creating
      an extra class.
- [ ] **Write rendering code.** Keep drawing separate from physics when that
      improves clarity; small simulations may keep closely related drawing code
      together.
- [ ] **Write a controller when useful.** It should own orchestration between
      UI, physics, and rendering. Small simulations do not need a controller
      class if the simpler structure remains clear.
- [ ] **Write the sketch entry point.** Pick global mode (one canvas) or
      instance mode (2+ synced canvases) when needed. Do not introduce a
      second canvas or instance-mode architecture without a concrete reason.
- [ ] **Wire the theory strip / readouts** to the LO text and correct
      units, cross-checked against the curriculum spec PDF.
- [ ] **Check for duplication** against existing sims before calling it
      done — fold any second copy of a helper into `shared/` now, not later.

## Reminders

- Only sim-specific CSS goes in the topic `.css` file — everything generic
  is already in `shared/sim-style.css`.
- If this sim needs vector arrows and isn't global mode, don't re-fork a
  third arrow implementation — reuse `wave-renderer.js`'s `drawArrowCtx`
  pattern or promote one to `shared/`.
- Script load order matters: `sim-utils.js` → physics → renderer →
  controller → ui-manager → sketch.

## AI editing reminders

- When changing an existing simulation, preserve the existing architecture if
  it is working well.
- Return focused code snippets for changed sections rather than rewriting the
  entire existing file, unless a full file was explicitly requested or is
  genuinely necessary.
- Avoid adding comments that simply describe obvious code. Explain physics,
  assumptions, non-obvious reasoning, and important constraints instead.
