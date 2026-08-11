/* =========================================================================
   SHM-GRAPHS-RENDERER.JS — Topic 7.2, SP015.
   Free drawing functions only — no physics calculation beyond unit→pixel
   mapping, no held state. Each takes an explicit p5 instance context plus
   already-computed state from the controller.
   Load after physics.js, before controller.js.
   ========================================================================= */

/**
 * Draws the oscillating particle on a horizontal track, plus a dashed
 * guide from centre to particle so |x| reads visually. Reads
 * oscillator.x only — no calculation performed here.
 */
function drawOscillator(p, controller) {
  const { oscillator } = controller;
  const w = p.width;
  const h = p.height;
  const trackY = h * DISPLAY.oscillatorTrackY;
  const centreX = w / 2;

  p.push();
  p.stroke(PALETTE.line);
  p.strokeWeight(2);
  p.line(20, trackY, w - 20, trackY);
  p.pop();

  p.push();
  p.stroke(PALETTE.muted);
  p.strokeWeight(1);
  p.line(centreX, trackY - 8, centreX, trackY + 8);
  p.pop();

  const particleX = centreX + oscillator.x * DISPLAY.pxPerMetreOscillator;

  drawDashedGuide(p, centreX, trackY, particleX, trackY, PALETTE.muted, 1, [4, 4]);

  p.push();
  p.noStroke();
  p.fill(PALETTE.orange);
  p.circle(particleX, trackY, 16);
  p.pop();
}

/**
 * Draws one time-series graph (x-t, v-t, or a-t) from the controller's
 * rolling history buffer, scrolling left as time advances. `field`
 * selects which quantity ('x'|'v'|'a') to plot.
 */
function drawTimeSeriesGraph(p, controller, field, colorVal, axisLabel) {
  const { history, oscillator } = controller;
  const pad = DISPLAY.graphPadding;
  const plotW = p.width - pad.left - pad.right;
  const plotH = p.height - pad.top - pad.bottom;

  const A = oscillator.amplitude;
  const omega = oscillator.omega;
  const maxAbs = field === 'x' ? A
    : field === 'v' ? A * omega
      : A * omega * omega; // 'a'

  const tNow = oscillator.t;
  const tMin = tNow - DISPLAY.graphTimeWindow;

  const toXY = (sample) => {
    const px = pad.left + ((sample.t - tMin) / DISPLAY.graphTimeWindow) * plotW;
    const py = pad.top + plotH / 2 - (sample[field] / maxAbs) * (plotH / 2);
    return { x: px, y: py };
  };

  p.push();
  p.stroke(PALETTE.line);
  p.strokeWeight(1);
  p.line(pad.left, pad.top, pad.left, pad.top + plotH);
  p.line(pad.left, pad.top + plotH / 2, pad.left + plotW, pad.top + plotH / 2);
  p.pop();

  p.push();
  p.noStroke();
  p.fill(PALETTE.muted);
  p.textSize(10);
  p.textAlign(p.LEFT, p.BOTTOM);
  p.text(axisLabel, pad.left, pad.top - 2);
  p.textAlign(p.RIGHT, p.TOP);
  p.text('t (s)', p.width - pad.right, pad.top + plotH + 4);
  p.pop();

  if (history.length >= 2) {
    p.push();
    p.stroke(colorVal);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    for (const sample of history) {
      const { x, y } = toXY(sample);
      p.vertex(x, y);
    }
    p.endShape();
    p.pop();
  }

  if (history.length > 0) {
    const latest = history[history.length - 1];
    const { x, y } = toXY(latest);
    p.push();
    p.noStroke();
    p.fill(colorVal);
    p.circle(x, y, 7);
    p.pop();
  }
}

/**
 * Draws EK, EP, and/or Etotal against displacement x (not time), per
 * SP015 7.2(a.iv). Curves are swept from the closed-form equations
 * across [-A, A] for display — this is derived shape geometry, not
 * simulation state, so it stays in the renderer rather than
 * SHMOscillator.
 */
function drawEnergyDisplacementGraph(p, controller) {
  const { oscillator, curveVisibility } = controller;
  const A = oscillator.amplitude;
  const omega = oscillator.omega;
  const mass = oscillator.mass;
  const pad = DISPLAY.graphPadding;
  const plotW = p.width - pad.left - pad.right;
  const plotH = p.height - pad.top - pad.bottom;

  const totalEnergyMax = 0.5 * mass * omega * omega * A * A;

  const toXY = (xVal, eVal) => {
    const px = pad.left + ((xVal + A) / (2 * A)) * plotW;
    const py = pad.top + plotH - (eVal / totalEnergyMax) * plotH;
    return { x: px, y: py };
  };

  p.push();
  p.stroke(PALETTE.line);
  p.strokeWeight(1);
  p.line(pad.left, pad.top, pad.left, pad.top + plotH);
  p.line(pad.left, pad.top + plotH, pad.left + plotW, pad.top + plotH);
  p.pop();

  p.push();
  p.noStroke();
  p.fill(PALETTE.muted);
  p.textSize(10);
  p.textAlign(p.LEFT, p.BOTTOM);
  p.text('E (J)', pad.left, pad.top - 2);
  p.textAlign(p.RIGHT, p.TOP);
  p.text('x (m)', p.width - pad.right, pad.top + plotH + 4);
  p.pop();

  const sweepSteps = 60;
  const plotCurve = (colorVal, energyFn) => {
    p.push();
    p.stroke(colorVal);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    for (let i = 0; i <= sweepSteps; i++) {
      const xVal = -A + (2 * A * i) / sweepSteps;
      const { x, y } = toXY(xVal, energyFn(xVal));
      p.vertex(x, y);
    }
    p.endShape();
    p.pop();
  };

  // EK = ½mω²(A² − x²) — SP015 7.1(c.iii)
  if (curveVisibility.EK) {
    plotCurve(PALETTE.orange, (xVal) => 0.5 * mass * omega * omega * (A * A - xVal * xVal));
  }
  // EP = ½mω²x² — SP015 7.1(c.iv)
  if (curveVisibility.EP) {
    plotCurve(PALETTE.teal, (xVal) => 0.5 * mass * omega * omega * xVal * xVal);
  }
  // E = constant — SP015 7.1(d)
  if (curveVisibility.Etotal) {
    plotCurve(PALETTE.ink, () => totalEnergyMax);
  }

  const currentX = oscillator.x;
  if (curveVisibility.EK) {
    const { x, y } = toXY(currentX, oscillator.kineticEnergy);
    p.push(); p.noStroke(); p.fill(PALETTE.orange); p.circle(x, y, 7); p.pop();
  }
  if (curveVisibility.EP) {
    const { x, y } = toXY(currentX, oscillator.potentialEnergy);
    p.push(); p.noStroke(); p.fill(PALETTE.teal); p.circle(x, y, 7); p.pop();
  }
  if (curveVisibility.Etotal) {
    const { x, y } = toXY(currentX, oscillator.totalEnergy);
    p.push(); p.noStroke(); p.fill(PALETTE.ink); p.circle(x, y, 7); p.pop();
  }
}

/**
 * Draws the isolated Phase Shift mode graph: a single static x = A sin(ωt
 * + φ) curve swept across [-2T, 2T] — SP015 7.2. Static because A and ω
 * are fixed in this mode (see PHASE_SHIFT constants); only φ (passed via
 * controller.phase) changes the shape, so this is a closed-form sweep
 * like drawEnergyDisplacementGraph, not a history-buffer plot.
 */
function drawPhaseShiftGraph(p, controller) {
  const { phase } = controller;
  const { amplitude: A, omega, cyclesEachSide } = PHASE_SHIFT;
  const T = (2 * Math.PI) / omega;
  const tMax = cyclesEachSide * T;
  const tMin = -tMax;

  const pad = DISPLAY.graphPadding;
  const plotW = p.width - pad.left - pad.right;
  const plotH = p.height - pad.top - pad.bottom;

  const toXY = (tVal, xVal) => {
    const px = pad.left + ((tVal - tMin) / (tMax - tMin)) * plotW;
    const py = pad.top + plotH / 2 - (xVal / A) * (plotH / 2);
    return { x: px, y: py };
  };

  // Axes: t-axis through x=0, x-axis (vertical) at t=0.
  p.push();
  p.stroke(PALETTE.line);
  p.strokeWeight(1);
  const zeroTX = toXY(0, 0).x;
  p.line(zeroTX, pad.top, zeroTX, pad.top + plotH);
  p.line(pad.left, pad.top + plotH / 2, pad.left + plotW, pad.top + plotH / 2);
  p.pop();

  p.push();
  p.noStroke();
  p.fill(PALETTE.muted);
  p.textSize(10);
  p.textAlign(p.LEFT, p.BOTTOM);
  p.text('Displacement, x (m)', pad.left, pad.top - 2);
  p.textAlign(p.RIGHT, p.TOP);
  p.text('Time, t (s)', p.width - pad.right, pad.top + plotH + 4);
  p.pop();

  // Curve: x = A sin(ωt + φ) — SP015 7.2, general phase form of 7.1(b).
  const sweepSteps = 240;
  p.push();
  p.stroke(PALETTE.orange);
  p.strokeWeight(2);
  p.noFill();
  p.beginShape();
  for (let i = 0; i <= sweepSteps; i++) {
    const tVal = tMin + ((tMax - tMin) * i) / sweepSteps;
    const xVal = A * Math.sin(omega * tVal + phase);
    const { x, y } = toXY(tVal, xVal);
    p.vertex(x, y);
  }
  p.endShape();
  p.pop();
}
