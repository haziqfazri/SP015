/* =========================================================================
   PROJECTILE-RENDERER.JS — Drawing only. Receives already-computed state.
   ========================================================================= */

const DISPLAY = {
  plotPadding: { left: 48, right: 28, top: 30, bottom: 42 },
  minWorldWidth: 20,
  minWorldHeight: 12,
  viewportHeadroom: 0.12,
  trajectorySamples: 160,
  trailMax: 90,
  projectileRadius: 9,
  vectorMinLength: 34,
  vectorMaxLength: 92,
  colors: {
    ink: '#102126',
    panel: '#f8faf6',
    line: '#c9d2c7',
    orange: '#ff6b35',
    teal: '#35b9ad',
    muted: '#617075',
  },
};

function sceneViewport(trajectory) {
  const maxX = Math.max(DISPLAY.minWorldWidth, ...trajectory.map((point) => point.x));
  const maxY = Math.max(DISPLAY.minWorldHeight, ...trajectory.map((point) => point.y));
  const xMargin = maxX * DISPLAY.viewportHeadroom;
  const yMargin = maxY * DISPLAY.viewportHeadroom;

  return {
    xMin: -xMargin,
    xMax: maxX + xMargin,
    yMin: PHYSICS.groundY,
    yMax: maxY + yMargin,
  };
}

function worldProjector(viewport, plot) {
  const scaleX = plot.w / (viewport.xMax - viewport.xMin);
  const scaleY = plot.h / (viewport.yMax - viewport.yMin);

  return (point) => ({
    x: plot.x + (point.x - viewport.xMin) * scaleX,
    y: plot.y + plot.h - (point.y - viewport.yMin) * scaleY,
  });
}

function drawAxes(p, viewport, plot, project) {
  const origin = project({ x: 0, y: PHYSICS.groundY });
  p.push();
  p.stroke(DISPLAY.colors.line);
  p.strokeWeight(1);
  p.line(plot.x, origin.y, plot.x + plot.w, origin.y);
  p.line(origin.x, plot.y, origin.x, origin.y);
  p.noStroke();
  p.fill(DISPLAY.colors.muted);
  p.textFont('Space Mono');
  p.textSize(10);
  p.textAlign(p.CENTER, p.TOP);

  const xStep = niceStep((viewport.xMax - viewport.xMin) / 5);
  for (let x = 0; x <= viewport.xMax; x += xStep) {
    const pos = project({ x, y: 0 });
    p.stroke(DISPLAY.colors.line);
    p.line(pos.x, origin.y - 4, pos.x, origin.y + 4);
    p.noStroke();
    p.text(`${x.toFixed(xStep < 1 ? 1 : 0)}`, pos.x, origin.y + 8);
  }

  p.textAlign(p.RIGHT, p.CENTER);
  const yStep = niceStep((viewport.yMax - viewport.yMin) / 4);
  for (let y = 0; y <= viewport.yMax; y += yStep) {
    const pos = project({ x: 0, y });
    p.stroke(DISPLAY.colors.line);
    p.line(origin.x - 4, pos.y, origin.x + 4, pos.y);
    p.noStroke();
    if (y > 0) p.text(`${y.toFixed(yStep < 1 ? 1 : 0)}`, origin.x - 8, pos.y);
  }

  p.textAlign(p.RIGHT, p.TOP);
  p.text('x (m)', plot.x + plot.w, origin.y + 22);
  p.textAlign(p.LEFT, p.TOP);
  p.text('y (m)', origin.x + 10, plot.y);
  p.pop();
}

function niceStep(rawStep) {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function drawTrajectory(p, trajectory, project) {
  p.push();
  p.noFill();
  p.stroke(DISPLAY.colors.orange);
  p.strokeWeight(2.5);
  p.beginShape();
  trajectory.forEach((point) => {
    const pos = project(point);
    p.vertex(pos.x, pos.y);
  });
  p.endShape();
  p.pop();
}

function drawVelocityVectors(p, state, projectilePos) {
  const speedLength = normalizedArrowLength(
    state.speed, LIMITS.launchSpeedMin, LIMITS.launchSpeedMax * 1.45,
    DISPLAY.vectorMinLength, DISPLAY.vectorMaxLength
  );
  const ux = state.speed > 0 ? state.vx / state.speed : 0;
  const uy = state.speed > 0 ? -state.vy / state.speed : 0;
  drawArrowCtx(p, projectilePos.x, projectilePos.y, projectilePos.x + ux * speedLength, projectilePos.y + uy * speedLength, DISPLAY.colors.orange, 2.5, 7);

  const accelerationLength = normalizedArrowLength(PHYSICS.g, PHYSICS.g, PHYSICS.g + 1, 42, 42);
  drawArrowCtx(p, projectilePos.x, projectilePos.y, projectilePos.x, projectilePos.y + accelerationLength, DISPLAY.colors.teal, 2.5, 7);

  p.push();
  p.noStroke();
  p.textFont('Space Mono');
  p.textSize(11);
  p.fill(DISPLAY.colors.orange);
  p.text('v', projectilePos.x + ux * speedLength + 7, projectilePos.y + uy * speedLength - 4);
  p.fill(DISPLAY.colors.teal);
  p.text('a = g', projectilePos.x + 8, projectilePos.y + accelerationLength + 4);
  p.pop();
}

function drawProjectileScene(p, model) {
  const { trajectory, state, trail, showTrail, showVectors } = model;
  const pad = DISPLAY.plotPadding;
  const plot = { x: pad.left, y: pad.top, w: p.width - pad.left - pad.right, h: p.height - pad.top - pad.bottom };
  const viewport = sceneViewport(trajectory);
  const project = worldProjector(viewport, plot);
  const projectilePos = project(state);

  p.background(DISPLAY.colors.panel);
  drawAxes(p, viewport, plot, project);
  drawTrajectory(p, trajectory, project);

  if (showTrail) drawTrailDots(p, trail, project, 255, 107, 53, 0.34);

  if (showVectors) drawVelocityVectors(p, state, projectilePos);

  p.push();
  p.stroke(DISPLAY.colors.ink);
  p.strokeWeight(2);
  p.fill(DISPLAY.colors.orange);
  p.circle(projectilePos.x, projectilePos.y, DISPLAY.projectileRadius * 2);
  p.pop();

  p.push();
  p.noStroke();
  p.fill(DISPLAY.colors.muted);
  p.textFont('Space Mono');
  p.textSize(10);
  p.textAlign(p.LEFT, p.TOP);
  p.text('Air resistance neglected', plot.x, p.height - 19);
  p.pop();
}
