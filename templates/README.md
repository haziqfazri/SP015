# Simulation Template

Starting point for every new SP015/SP025 sim. See `docs/architecture.md` for
the full rationale — this is just the condensed checklist.

## Setup

1. Copy this folder to `<new-topic-name>/` at the repo root (flat layout,
   named after the topic, not "SP015-topic-7.x").
2. Find-and-replace `Template` → `YourSimName` (classes) and `template-` →
   `your-sim-name-` (filenames) across all files.
3. Rename the files themselves to match.

## Build order (matches architecture.md §3)

- [ ] **Pick the LO.** Identify the SP015/SP025 topic + learning outcome(s).
      Cite it directly in file-header comments (e.g. `SP015 7.5(a)`).
- [ ] **Fill in `PHYSICS` / `LIMITS` / `DISPLAY`** in `*-physics.js` first —
      these are the single source of truth for slider ranges/scaling, not
      the HTML's `min`/`max`/`value` attributes.
- [ ] **Write the physics class(es).** Pure state + derivation. No DOM, no
      canvas. Derive quantities on demand from stored independent fields
      rather than caching them.
- [ ] **Write UIManager.** Cache DOM elements once, bind events, expose a
      `callbacks` object. Never calls physics or renderer directly.
- [ ] **Write the renderer.** Free functions taking an explicit context
      (`window` for global mode, a p5 instance/`p5.Graphics` for instance
      mode) plus already-computed state.
- [ ] **Write SimulationController.** Owns physics + UI, wires callbacks,
      drives play/pause/step/reset, decides when to redraw.
- [ ] **Write the sketch entry point.** Pick global mode (one canvas) or
      instance mode (2+ synced canvases) in `template-sketch.js` — delete
      the variant you don't use.
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
