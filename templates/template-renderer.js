/* =========================================================================
   TEMPLATE-RENDERER.JS — <Topic Name> (SP0XX Topic X.X)

   Drawing only. Every function takes an explicit rendering context `ctx`
   (either the global p5 instance — pass `window` in global-mode sims — or
   a p5.Graphics buffer / instance-mode `p` for multi-canvas sims) plus
   plain numbers/state already computed elsewhere. No physics maths beyond
   unit->pixel mapping, no DOM access.

   NOTE on arrows: shared/sim-utils.js's drawArrowCtx and VectorArrow both
   take an explicit rendering context, so they work in global-mode and
   instance-mode/Graphics-buffer sims alike. No fork needed — they are the
   canon ctx-explicit helpers.
   ========================================================================= */

const DISPLAY = {
  graphPadding: { left: 40, right: 20, top: 34, bottom: 30 }, // px
};

// -------------------------------------------------------------------------
// Coordinate mapping — replace with real physical-unit -> pixel scale.
// -------------------------------------------------------------------------
function valueToPx(value, centerY, pxPerUnit) {
  return centerY - value * pxPerUnit;
}

// -------------------------------------------------------------------------
// drawScene — one example renderer function. Copy this shape for each
// panel/canvas the sim needs. Takes the context, the controller (for
// read-only state access), and canvas dimensions; draws one frame.
// -------------------------------------------------------------------------
function drawScene(ctx, controller, width, height) {
  const pad = DISPLAY.graphPadding;
  const plotX = pad.left;
  const plotY = pad.top;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const centerY = plotY + plotH / 2;

  ctx.background(248, 250, 246); // --panel

  // Equilibrium / reference guide
  ctx.push();
  ctx.stroke('#c9d2c7'); // --line
  ctx.strokeWeight(1);
  ctx.line(plotX, centerY, plotX + plotW, centerY);
  ctx.pop();

  // Example: draw the current state as a single point. Replace with the
  // real per-sim drawing (curve sweep, oscillating body, vectors, etc).
  const { state } = controller;
  const px = plotX + plotW / 2;
  const py = valueToPx(state.derivedQuantity, centerY, 20);

  ctx.push();
  ctx.noStroke();
  ctx.fill('#ff6b35'); // --orange
  ctx.circle(px, py, 14);
  ctx.pop();
}
