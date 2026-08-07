/* =========================================================================
   TEMPLATE-PHYSICS.JS — <Topic Name> (SP0XX Topic X.X)

   Physics only: state and equations. No DOM access, no canvas/p5 calls —
   those belong to the UI manager and renderer.

   Equations (SP0XX notation):
     <write the governing equation(s) here, matching curriculum notation>

   Load order: shared/sim-utils.js, THEN this file, THEN
   template-renderer.js, THEN template-controller.js, THEN
   template-ui-manager.js, THEN template-sketch.js.
   ========================================================================= */

// -------------------------------------------------------------------------
// PHYSICS — fixed physical constants this sim needs (g, fixed masses,
// etc). Leave as an empty object if the topic is purely kinematic, for
// structural consistency with other sims' PHYSICS blocks.
// -------------------------------------------------------------------------
const PHYSICS = {
  // exampleConstant: 9.81,
};

// -------------------------------------------------------------------------
// LIMITS — single source of truth for slider ranges/defaults. index.html's
// static min/max/value attributes are a cosmetic fallback only for viewing
// the markup alone — do not edit those to change behavior, edit LIMITS.
// -------------------------------------------------------------------------
const LIMITS = {
  exampleParamMin: 0,
  exampleParamMax: 10,
  exampleParamDefault: 5,
};

// -------------------------------------------------------------------------
// TemplateState — pure physics state for this topic. All quantities either
// stored (independent, slider-driven) or derived on demand via getters
// (never cached) so they can never drift out of sync with the sliders —
// same convention as WaveState.wavelength / SHMOscillator's derived
// energy fields.
// -------------------------------------------------------------------------
class TemplateState {
  constructor(exampleParam) {
    this.exampleParam = exampleParam; // independent, slider-driven
    this.t = 0;                        // elapsed time, s
  }

  // Derived quantity example — recompute from stored fields, don't cache.
  get derivedQuantity() {
    return this.exampleParam * 2; // replace with the real relationship
  }

  // Advances simulation time by dt seconds. The controller decides when
  // and how much (e.g. skip while paused, fixed step on "Step").
  advance(dt) {
    this.t += dt;
  }

  reset() {
    this.t = 0;
  }

  setExampleParam(value) {
    this.exampleParam = value;
  }
}
