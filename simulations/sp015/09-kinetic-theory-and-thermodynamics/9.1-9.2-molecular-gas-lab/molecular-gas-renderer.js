/* =========================================================================
   MOLECULAR-GAS-RENDERER.JS — SP015 9.1(a–d), 9.2(a–f).
   Stateless drawing functions receiving an explicit p5 context and snapshot.
   ========================================================================= */

function computeMolecularPanels(canvasWidth, canvasHeight) {
  const compact = canvasWidth < DISPLAY.compactWidth;
  const padding = compact ? 14 : DISPLAY.panelPadding;
  const top = 38;
  const availableHeight = canvasHeight - top - padding;
  if (compact) {
    const gap = 12;
    const firstHeight = (availableHeight - gap) * 0.52;
    return Object.freeze({
      compact,
      primary: Object.freeze({ x: padding, y: top, width: canvasWidth - 2 * padding, height: firstHeight }),
      secondary: Object.freeze({ x: padding, y: top + firstHeight + gap, width: canvasWidth - 2 * padding, height: availableHeight - firstHeight - gap }),
    });
  }
  const gap = DISPLAY.panelGap;
  const availableWidth = canvasWidth - 2 * padding - gap;
  const primaryWidth = availableWidth * DISPLAY.wideMotionRatio;
  return Object.freeze({
    compact,
    primary: Object.freeze({ x: padding, y: top, width: primaryWidth, height: availableHeight }),
    secondary: Object.freeze({ x: padding + primaryWidth + gap, y: top, width: availableWidth - primaryWidth, height: availableHeight }),
  });
}

function computeEnergyPanel(canvasWidth, canvasHeight) {
  const compact = canvasWidth < DISPLAY.compactWidth;
  const padding = compact ? 14 : DISPLAY.panelPadding;
  const top = 38;
  return Object.freeze({
    compact,
    x: padding,
    y: top,
    width: canvasWidth - 2 * padding,
    height: canvasHeight - top - padding,
  });
}

function drawMolecularGasScene(ctx, snapshot, canvasWidth, canvasHeight) {
  ctx.background(PALETTE.panel);
  if (snapshot.mode === 'motion') {
    drawMotionMode(ctx, snapshot, computeMolecularPanels(canvasWidth, canvasHeight));
  } else {
    drawEnergyMode(ctx, snapshot, computeEnergyPanel(canvasWidth, canvasHeight));
  }
}

function drawPanelFrame(ctx, box, title, subtitle) {
  const narrow = box.width < 280;
  ctx.push();
  ctx.noFill();
  ctx.stroke(PALETTE.line);
  ctx.strokeWeight(1);
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.pop();
  drawLabel(ctx, title.toUpperCase(), box.x + 12, box.y + (narrow ? 10 : 16), {
    fill: PALETTE.inkRGB,
    size: narrow ? 7 : 9,
    weight: 'BOLD',
    align: ['LEFT', 'CENTER'],
  });
  if (subtitle) {
    drawLabel(ctx, subtitle, narrow ? box.x + 12 : box.x + box.width - 12, box.y + (narrow ? 22 : 16), {
      fill: PALETTE.mutedRGB,
      size: narrow ? 6 : 8,
      align: narrow ? ['LEFT', 'CENTER'] : ['RIGHT', 'CENTER'],
    });
  }
}

function drawMotionMode(ctx, snapshot, panels) {
  drawPanelFrame(ctx, panels.primary, 'Molecular chamber', 'REPRESENTATIVE 2D PROJECTION');
  drawPanelFrame(ctx, panels.secondary, 'RMS instrument', 'ANALYTIC 3D RESULT');
  const chamber = computeChamberRect(snapshot.ensemble, panels.primary);
  drawChamber(ctx, snapshot, chamber, panels.compact);
  drawRmsInstrument(ctx, snapshot, panels.secondary, panels.compact);
}

function computeChamberRect(ensemble, panel) {
  const margin = 18;
  const header = 30;
  const availableWidth = panel.width - 2 * margin;
  const availableHeight = panel.height - header - margin;
  const scale = Math.min(
    availableWidth / DISPLAY.worldWidthMax,
    availableHeight / ensemble.containerHeight,
  );
  const width = ensemble.containerWidth * scale;
  const height = ensemble.containerHeight * scale;
  return Object.freeze({
    x: panel.x + margin + (availableWidth - width) / 2,
    y: panel.y + header + (availableHeight - height) / 2,
    width,
    height,
    scale,
  });
}

function projectWorldPoint(chamber, x, y) {
  return Object.freeze({ x: chamber.x + x * chamber.scale, y: chamber.y + y * chamber.scale });
}

function drawChamber(ctx, snapshot, chamber, compact) {
  ctx.push();
  ctx.fill(PALETTE.paper);
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(2);
  ctx.rect(chamber.x, chamber.y, chamber.width, chamber.height);
  ctx.pop();

  const particles = snapshot.ensemble.particles;
  particles.forEach((particle, index) => {
    const point = projectWorldPoint(chamber, particle.x, particle.y);
    const radius = Math.max(2.5, snapshot.ensemble.radius * chamber.scale);
    const speed = Math.hypot(particle.vx, particle.vy);
    if (index % 3 === 0 && speed > 1e-9) {
      const arrowLength = Math.min(compact ? 14 : 19, 7 + speed * 7);
      drawArrowCtx(
        ctx,
        point.x,
        point.y,
        point.x + particle.vx / speed * arrowLength,
        point.y + particle.vy / speed * arrowLength,
        PALETTE.teal,
        1,
        4,
      );
    }
    ctx.push();
    ctx.noStroke();
    ctx.fill(index % 3 === 0 ? PALETTE.orange : PALETTE.ink);
    ctx.circle(point.x, point.y, radius * 2);
    ctx.pop();
  });

  snapshot.collisionFlashes.forEach((flash) => {
    const point = projectWorldPoint(chamber, flash.x, flash.y);
    const fraction = 1 - flash.age / LIMITS.collisionFlashes.lifetimeSeconds;
    ctx.push();
    ctx.noFill();
    ctx.stroke(flash.type === 'wall' ? PALETTE.orange : PALETTE.teal);
    ctx.strokeWeight(1.5);
    ctx.circle(point.x, point.y, 5 + 13 * fraction);
    ctx.pop();
  });

  const volumeLitres = snapshot.volumeM3 / PHYSICS.litresToCubicMetres;
  drawLabel(ctx, `${volumeLitres.toFixed(0)} L`, chamber.x + chamber.width - 6, chamber.y + chamber.height - 9, {
    fill: PALETTE.mutedRGB,
    size: 9,
    weight: 'BOLD',
    align: ['RIGHT', 'CENTER'],
  });
  drawLabel(ctx, 'visual speed scaled', chamber.x + 7, chamber.y + chamber.height - 9, {
    fill: PALETTE.mutedRGB,
    size: 8,
    align: ['LEFT', 'CENTER'],
  });
}

function drawRmsInstrument(ctx, snapshot, box, compact) {
  const innerX = box.x + 13;
  const innerWidth = box.width - 26;
  const top = box.y + 34;
  const maximumSample = Math.max(...snapshot.sampleSpeeds, snapshot.rmsSpeed);
  if (compact) {
    const sampleWidth = innerWidth * 0.48;
    snapshot.sampleSpeeds.forEach((speed, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const segmentWidth = sampleWidth / 2;
      const x = innerX + column * segmentWidth;
      const y = top + row * 17;
      ctx.push();
      ctx.noStroke();
      ctx.fill(PALETTE.path);
      ctx.rect(x, y, Math.max(2, (segmentWidth - 10) * speed / maximumSample), 4);
      ctx.pop();
      drawLabel(ctx, `v${index + 1}`, x, y + 10, { fill: PALETTE.mutedRGB, size: 6, align: ['LEFT', 'CENTER'] });
    });
    const resultX = innerX + innerWidth * 0.76;
    drawLabel(ctx, '√⟨v²⟩', resultX, top + 8, { fill: PALETTE.mutedRGB, size: 8, weight: 'BOLD' });
    drawLabel(ctx, `${snapshot.sampleRmsSpeed.toFixed(0)} m s⁻¹`, resultX, top + 28, {
      fill: PALETTE.inkRGB,
      size: 12,
      weight: 'BOLD',
    });
    drawLabel(ctx, 'square → mean → root', resultX, top + 45, { fill: PALETTE.orangeRGB, size: 6 });
    const pressureY = box.y + box.height - 38;
    drawPressureCell(ctx, innerX, pressureY, innerWidth * 0.47, 'IDEAL GAS', snapshot.pressure, true);
    drawPressureCell(ctx, innerX + innerWidth * 0.53, pressureY, innerWidth * 0.47, 'KINETIC', snapshot.kineticPressure, true);
    return;
  }
  const barAreaHeight = 112;
  snapshot.sampleSpeeds.forEach((speed, index) => {
    const row = index;
    const column = 0;
    const rowHeight = 17;
    const segmentWidth = innerWidth;
    const x = innerX + column * segmentWidth;
    const y = top + row * rowHeight;
    const available = segmentWidth - 34;
    ctx.push();
    ctx.noStroke();
    ctx.fill(PALETTE.path);
    ctx.rect(x, y, Math.max(2, available * speed / maximumSample), 5);
    ctx.pop();
    drawLabel(ctx, `v${index + 1}`, x, y + 12, { fill: PALETTE.mutedRGB, size: 7, align: ['LEFT', 'CENTER'] });
  });

  const flowY = top + barAreaHeight + 8;
  drawFormulaStep(ctx, innerX, flowY, innerWidth * 0.28, 'square', 'v²');
  drawFormulaStep(ctx, innerX + innerWidth * 0.36, flowY, innerWidth * 0.28, 'mean', '⟨v²⟩');
  drawFormulaStep(ctx, innerX + innerWidth * 0.72, flowY, innerWidth * 0.28, 'root', 'vᵣₘₛ');
  drawArrowCtx(ctx, innerX + innerWidth * 0.29, flowY + 14, innerX + innerWidth * 0.35, flowY + 14, PALETTE.orange, 1, 4);
  drawArrowCtx(ctx, innerX + innerWidth * 0.65, flowY + 14, innerX + innerWidth * 0.71, flowY + 14, PALETTE.orange, 1, 4);

  const resultY = flowY + 50;
  drawLabel(ctx, `${snapshot.sampleRmsSpeed.toFixed(0)} m s⁻¹`, box.x + box.width / 2, resultY, {
    fill: PALETTE.inkRGB,
    size: 17,
    weight: 'BOLD',
  });
  drawLabel(ctx, 'normalized sample = analytic result', box.x + box.width / 2, resultY + 17, {
    fill: PALETTE.mutedRGB,
    size: 8,
  });

  const pressureY = box.y + box.height - 67;
  drawPressureCell(ctx, innerX, pressureY, innerWidth * 0.47, 'IDEAL GAS', snapshot.pressure);
  drawPressureCell(ctx, innerX + innerWidth * 0.53, pressureY, innerWidth * 0.47, 'KINETIC', snapshot.kineticPressure);
}

function drawFormulaStep(ctx, x, y, width, label, symbol) {
  ctx.push();
  ctx.noFill();
  ctx.stroke(PALETTE.line);
  ctx.rect(x, y, width, 28);
  ctx.pop();
  drawLabel(ctx, label.toUpperCase(), x + 5, y + 8, { fill: PALETTE.mutedRGB, size: 6, align: ['LEFT', 'CENTER'] });
  drawLabel(ctx, symbol, x + width / 2, y + 18, { fill: PALETTE.inkRGB, size: 10, weight: 'BOLD' });
}

function drawPressureCell(ctx, x, y, width, title, pressurePa, compact = false) {
  const height = compact ? 34 : 42;
  ctx.push();
  ctx.fill(PALETTE.paper);
  ctx.stroke(PALETTE.line);
  ctx.rect(x, y, width, height);
  ctx.pop();
  drawLabel(ctx, title, x + width / 2, y + (compact ? 9 : 11), { fill: PALETTE.mutedRGB, size: compact ? 6 : 7, weight: 'BOLD' });
  drawLabel(ctx, `${(pressurePa / 1000).toFixed(1)} kPa`, x + width / 2, y + (compact ? 23 : 28), { fill: PALETTE.inkRGB, size: compact ? 8 : 10, weight: 'BOLD' });
}

function drawEnergyMode(ctx, snapshot, panel) {
  drawPanelFrame(
    ctx,
    panel,
    'Degree-of-freedom model',
    `${snapshot.categoryLabel.toUpperCase()} · f = ${snapshot.degreesOfFreedom}`,
  );
  const compact = panel.width < 420;
  drawLabel(ctx, `FOCUS: ${snapshot.degreeFocusLabel.toUpperCase()}`, panel.x + panel.width / 2, panel.y + (compact ? 38 : 42), {
    fill: PALETTE.orangeRGB,
    size: compact ? 7 : 9,
    weight: 'BOLD',
  });

  const chamber = computePerspectiveChamber(panel);
  const motion = computeEnergyMotion(snapshot);
  const rotationGuide = computeRotationGuide(chamber, snapshot.degreeFocus, motion.position);
  drawPerspectiveChamberBack(ctx, chamber);
  drawRotationGuideLayer(ctx, rotationGuide, 'back');
  drawMoleculeInChamber(ctx, snapshot, chamber, motion);
  drawRotationGuideLayer(ctx, rotationGuide, 'front');
  drawPerspectiveChamberFront(ctx, chamber);
  drawEnergyAxes(ctx, snapshot.degreeFocus, chamber);
  drawRotationGuideAnnotation(ctx, rotationGuide, chamber);

  drawLabel(ctx, 'SCHEMATIC 2D PROJECTION OF 3D MOTION', panel.x + panel.width / 2, panel.y + panel.height - 13, {
    fill: PALETTE.mutedRGB,
    size: compact ? 6 : 8,
    weight: 'BOLD',
  });
}

function computePerspectiveChamber(panel) {
  const compact = panel.width < 420;
  const sideMargin = compact ? 14 : 24;
  const header = compact ? 58 : 64;
  const footer = compact ? 27 : 32;
  const front = Object.freeze({
    x: panel.x + sideMargin,
    y: panel.y + header + (compact ? 28 : 36),
    width: panel.width - 2 * sideMargin - (compact ? 32 : 54),
    height: panel.height - header - footer - (compact ? 28 : 44),
  });

  const frontCorners = Object.freeze([
    Object.freeze({ x: front.x, y: front.y }),
    Object.freeze({ x: front.x + front.width, y: front.y }),
    Object.freeze({ x: front.x + front.width, y: front.y + front.height }),
    Object.freeze({ x: front.x, y: front.y + front.height }),
  ]);

  // All depth edges converge toward one point, preventing the chamber from
  // looking skewed when the back face is smaller than the front face.
  const vanishingPoint = Object.freeze({
    x: front.x + front.width * (compact ? 0.72 : 0.78),
    y: front.y - front.height * (compact ? 0.55 : 0.62),
  });
  const depthFraction = compact ? 0.17 : 0.19;
  const backCorners = Object.freeze(frontCorners.map((corner) => Object.freeze({
    x: corner.x + (vanishingPoint.x - corner.x) * depthFraction,
    y: corner.y + (vanishingPoint.y - corner.y) * depthFraction,
  })));
  const backX = Math.min(...backCorners.map((corner) => corner.x));
  const backY = Math.min(...backCorners.map((corner) => corner.y));
  const backRight = Math.max(...backCorners.map((corner) => corner.x));
  const backBottom = Math.max(...backCorners.map((corner) => corner.y));
  const back = Object.freeze({
    x: backX,
    y: backY,
    width: backRight - backX,
    height: backBottom - backY,
  });
  return Object.freeze({ front, back, frontCorners, backCorners, vanishingPoint });
}

function projectEnergyPoint(chamber, point) {
  const depth = Math.max(0, Math.min(1, (point.z + 1) / 2));
  const faceCorners = chamber.frontCorners.map((frontCorner, index) => ({
    x: frontCorner.x + (chamber.backCorners[index].x - frontCorner.x) * depth,
    y: frontCorner.y + (chamber.backCorners[index].y - frontCorner.y) * depth,
  }));
  const u = 0.5 + point.x * 0.36;
  const v = 0.5 - point.y * 0.34;
  const topX = faceCorners[0].x + (faceCorners[1].x - faceCorners[0].x) * u;
  const topY = faceCorners[0].y + (faceCorners[1].y - faceCorners[0].y) * u;
  const bottomX = faceCorners[3].x + (faceCorners[2].x - faceCorners[3].x) * u;
  const bottomY = faceCorners[3].y + (faceCorners[2].y - faceCorners[3].y) * u;
  return Object.freeze({
    x: topX + (bottomX - topX) * v,
    y: topY + (bottomY - topY) * v,
    scale: 1 - depth * 0.22,
    alpha: 255 - depth * 80,
    depth,
  });
}

function computeEnergyMotion(snapshot) {
  const t = snapshot.animationTime;
  const focus = snapshot.degreeFocus;
  const supported = snapshot.supportedDegreeFocuses || degreeFocusesForCategory(snapshot.category);
  const all = focus === 'all';
  const position = {
    x: all ? 0.38 * Math.sin(t * 1.10) : focus === 'translate-x' ? 0.56 * Math.sin(t * 1.10) : 0,
    y: all ? 0.32 * Math.sin(t * 1.37 + 0.7) : focus === 'translate-y' ? 0.50 * Math.sin(t * 1.37) : 0,
    z: all ? 0.52 * Math.sin(t * 0.83 + 1.2) : focus === 'translate-z' ? 0.68 * Math.sin(t * 0.83) : 0,
  };
  const rotations = {
    // Constant angular phase shows rotation; a sine here would depict torsional oscillation.
    r1: ((all && supported.includes('rotate-r1')) || focus === 'rotate-r1')
      ? t * DISPLAY.rotationAngularSpeeds.r1 : 0,
    r2: ((all && supported.includes('rotate-r2')) || focus === 'rotate-r2')
      ? t * DISPLAY.rotationAngularSpeeds.r2 : 0,
    r3: ((all && supported.includes('rotate-r3')) || focus === 'rotate-r3')
      ? t * DISPLAY.rotationAngularSpeeds.r3 : 0,
  };
  return Object.freeze({ position: Object.freeze(position), rotations: Object.freeze(rotations) });
}

function rotatePoint3D(point, rotations) {
  // R1 and R2 are perpendicular to the initial diatomic bond (the local x axis).
  let { x, y, z } = point;
  const cosX = Math.cos(rotations.r3);
  const sinX = Math.sin(rotations.r3);
  [y, z] = [y * cosX - z * sinX, y * sinX + z * cosX];
  const cosY = Math.cos(rotations.r1);
  const sinY = Math.sin(rotations.r1);
  [x, z] = [x * cosY + z * sinY, -x * sinY + z * cosY];
  const cosZ = Math.cos(rotations.r2);
  const sinZ = Math.sin(rotations.r2);
  [x, y] = [x * cosZ - y * sinZ, x * sinZ + y * cosZ];
  return Object.freeze({ x, y, z });
}

function moleculeGeometryForCategory(category) {
  if (category === 'monatomic') {
    return Object.freeze({
      atoms: Object.freeze([{ x: 0, y: 0, z: 0, radius: 0.25, color: 'orange' }]),
      bonds: Object.freeze([]),
    });
  }
  if (category === 'diatomic') {
    return Object.freeze({
      atoms: Object.freeze([
        { x: -0.62, y: 0, z: 0, radius: 0.23, color: 'orange' },
        { x: 0.62, y: 0, z: 0, radius: 0.23, color: 'teal' },
      ]),
      bonds: Object.freeze([[0, 1]]),
    });
  }
  if (category === 'polyatomic') {
    return Object.freeze({
      atoms: Object.freeze([
        { x: 0, y: 0, z: 0, radius: 0.22, color: 'ink' },
        { x: 0.70, y: 0, z: 0, radius: 0.18, color: 'orange' },
        { x: -0.35, y: 0.57, z: 0.32, radius: 0.18, color: 'orange' },
        { x: -0.35, y: -0.57, z: 0.32, radius: 0.18, color: 'teal' },
      ]),
      bonds: Object.freeze([[0, 1], [0, 2], [0, 3]]),
    });
  }
  throw new RangeError('Unsupported molecular category');
}

function drawPerspectiveChamberBack(ctx, chamber) {
  const { frontCorners, backCorners } = chamber;
  ctx.push();
  ctx.fill(PALETTE.paper);
  ctx.stroke(PALETTE.line);
  ctx.strokeWeight(1);
  ctx.quad(
    backCorners[0].x, backCorners[0].y,
    backCorners[1].x, backCorners[1].y,
    backCorners[2].x, backCorners[2].y,
    backCorners[3].x, backCorners[3].y,
  );
  frontCorners.forEach((frontCorner, index) => {
    ctx.line(frontCorner.x, frontCorner.y, backCorners[index].x, backCorners[index].y);
  });
  ctx.pop();
}

function drawPerspectiveChamberFront(ctx, chamber) {
  ctx.push();
  ctx.noFill();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(2);
  ctx.rect(chamber.front.x, chamber.front.y, chamber.front.width, chamber.front.height);
  ctx.pop();
}

function drawMoleculeInChamber(ctx, snapshot, chamber, motion = computeEnergyMotion(snapshot)) {
  const geometry = moleculeGeometryForCategory(snapshot.category);
  const atomScale = 0.57;
  const atoms = geometry.atoms.map((atom, index) => {
    const rotated = rotatePoint3D(atom, motion.rotations);
    const world = {
      x: motion.position.x + rotated.x * atomScale,
      y: motion.position.y + rotated.y * atomScale,
      z: motion.position.z + rotated.z * atomScale,
    };
    return Object.freeze({ ...atom, index, world, projected: projectEnergyPoint(chamber, world) });
  });

  const baseRadius = Math.min(chamber.front.width, chamber.front.height) * 0.36;
  geometry.bonds.forEach(([first, second]) => {
    const a = atoms[first].projected;
    const b = atoms[second].projected;
    ctx.push();
    ctx.drawingContext.globalAlpha = Math.min(a.alpha, b.alpha) / 255;
    drawBond(ctx, a.x, a.y, b.x, b.y, Math.max(3, baseRadius * 0.055));
    ctx.pop();
  });

  atoms.slice().sort((a, b) => {
    const depthDifference = b.world.z - a.world.z;
    return Math.abs(depthDifference) < 1e-9 ? a.index - b.index : depthDifference;
  }).forEach((atom) => {
    const radius = baseRadius * atom.radius * atom.projected.scale;
    ctx.push();
    ctx.drawingContext.globalAlpha = atom.projected.alpha / 255;
    ctx.fill(PALETTE[atom.color]);
    ctx.stroke(PALETTE.ink);
    ctx.strokeWeight(Math.max(1.5, radius * 0.07));
    ctx.circle(atom.projected.x, atom.projected.y, radius * 2);
    ctx.noStroke();
    ctx.drawingContext.globalAlpha = atom.projected.alpha / 650;
    ctx.fill(PALETTE.paper);
    ctx.circle(atom.projected.x - radius * 0.28, atom.projected.y - radius * 0.28, radius * 0.42);
    ctx.pop();
  });
  return Object.freeze({ atoms, motion });
}

function drawBond(ctx, x0, y0, x1, y1, weight) {
  const length = Math.hypot(x1 - x0, y1 - y0) || 1;
  const offsetX = -(y1 - y0) / length * Math.max(1.5, weight * 0.28);
  const offsetY = (x1 - x0) / length * Math.max(1.5, weight * 0.28);
  ctx.push();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(weight);
  ctx.line(x0 + offsetX, y0 + offsetY, x1 + offsetX, y1 + offsetY);
  ctx.stroke(PALETTE.teal);
  ctx.strokeWeight(Math.max(1, weight * 0.38));
  ctx.line(x0 - offsetX, y0 - offsetY, x1 - offsetX, y1 - offsetY);
  ctx.pop();
}

function drawEnergyAxes(ctx, focus, chamber) {
  const origin = {
    x: chamber.front.x + Math.min(42, chamber.front.width * 0.15),
    y: chamber.front.y + chamber.front.height - Math.min(34, chamber.front.height * 0.16),
  };
  const length = Math.min(42, chamber.front.width * 0.15, chamber.front.height * 0.22);
  const axes = [
    { key: 'translate-x', label: 'x', x: origin.x + length, y: origin.y },
    { key: 'translate-y', label: 'y', x: origin.x, y: origin.y - length },
    { key: 'translate-z', label: 'z', x: origin.x + length * 0.58, y: origin.y - length * 0.48 },
  ];
  axes.forEach((axis) => {
    const selected = focus === axis.key;
    const activeTogether = focus === 'all';
    const color = selected ? PALETTE.orange : activeTogether ? PALETTE.teal : PALETTE.muted;
    drawArrowCtx(ctx, origin.x, origin.y, axis.x, axis.y, color, selected ? 2.5 : 1.4, 5);
    drawLabel(ctx, selected ? `[${axis.label}]` : axis.label, axis.x + (axis.key === 'translate-y' ? 0 : 7), axis.y + (axis.key === 'translate-y' ? -7 : 2), {
      fill: selected ? PALETTE.orangeRGB : activeTogether ? PALETTE.tealRGB : PALETTE.mutedRGB,
      size: selected ? 10 : 8,
      weight: selected ? 'BOLD' : 'NORMAL',
    });
  });
}

const ROTATION_GUIDE_CONFIG = Object.freeze({
  'rotate-r1': Object.freeze({ axis: 'y', label: 'R₁ · about y' }),
  'rotate-r2': Object.freeze({ axis: 'z', label: 'R₂ · about z' }),
  'rotate-r3': Object.freeze({ axis: 'x', label: 'R₃ · about x' }),
});

function rotationGuidePoint3D(focus, center, angle, radius = DISPLAY.rotationGuideRadius) {
  const cosine = Math.cos(angle) * radius;
  const sine = Math.sin(angle) * radius;
  if (focus === 'rotate-r1') return Object.freeze({ x: center.x + cosine, y: center.y, z: center.z + sine });
  if (focus === 'rotate-r2') return Object.freeze({ x: center.x + cosine, y: center.y + sine, z: center.z });
  if (focus === 'rotate-r3') return Object.freeze({ x: center.x, y: center.y + cosine, z: center.z + sine });
  throw new RangeError('Unsupported rotation focus');
}

function computeRotationGuide(chamber, focus, center) {
  const config = ROTATION_GUIDE_CONFIG[focus];
  if (!config) return null;
  const points = Array.from({ length: DISPLAY.rotationGuideSamples + 1 }, (_, index) => {
    const angle = index / DISPLAY.rotationGuideSamples * Math.PI * 2;
    const world = rotationGuidePoint3D(focus, center, angle);
    return Object.freeze({ angle, world, projected: projectEnergyPoint(chamber, world) });
  });
  const segments = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    const depthOffset = (point.world.z + next.world.z) / 2 - center.z;
    const middleAngle = (point.angle + next.angle) / 2;
    const layer = Math.abs(depthOffset) < 1e-9
      ? (Math.sin(middleAngle) >= 0 ? 'back' : 'front')
      : (depthOffset > 0 ? 'back' : 'front');
    return Object.freeze({ start: point.projected, end: next.projected, layer });
  });
  const projectedPoints = points.map((point) => point.projected);
  const bounds = Object.freeze({
    minX: Math.min(...projectedPoints.map((point) => point.x)),
    maxX: Math.max(...projectedPoints.map((point) => point.x)),
    minY: Math.min(...projectedPoints.map((point) => point.y)),
    maxY: Math.max(...projectedPoints.map((point) => point.y)),
  });
  const frontSegments = segments.filter((segment) => segment.layer === 'front');
  const arrowSegment = frontSegments.reduce(
    (selected, segment) => (!selected || segment.end.x > selected.end.x ? segment : selected),
    null,
  );
  return Object.freeze({
    focus,
    config,
    center: projectEnergyPoint(chamber, center),
    points: Object.freeze(points),
    segments: Object.freeze(segments),
    bounds,
    arrowSegment,
  });
}

function drawRotationGuideLayer(ctx, guide, layer) {
  if (!guide) return;
  ctx.push();
  ctx.noFill();
  ctx.stroke(PALETTE.orange);
  ctx.strokeWeight(layer === 'front' ? 2 : 1.25);
  ctx.drawingContext.globalAlpha = layer === 'front' ? 0.95 : 0.28;
  guide.segments.filter((segment) => segment.layer === layer).forEach((segment) => {
    ctx.line(segment.start.x, segment.start.y, segment.end.x, segment.end.y);
  });
  ctx.pop();
}

function drawRotationGuideAnnotation(ctx, guide, chamber) {
  if (!guide) return;
  const arrow = guide.arrowSegment;
  if (arrow) {
    const dx = arrow.end.x - arrow.start.x;
    const dy = arrow.end.y - arrow.start.y;
    const length = Math.hypot(dx, dy) || 1;
    drawArrowCtx(
      ctx,
      arrow.end.x - dx / length * 12,
      arrow.end.y - dy / length * 12,
      arrow.end.x,
      arrow.end.y,
      PALETTE.orange,
      2,
      6,
    );
  }
  const fontSize = chamber.front.width < 300 ? 7 : 9;
  const label = `${guide.config.label} SELECTED`;
  const estimatedWidth = label.length * fontSize * 0.62;
  const labelClearance = Math.min(chamber.front.width, chamber.front.height) * 0.10 + fontSize;
  const labelX = Math.min(
    chamber.front.x + chamber.front.width - estimatedWidth / 2 - 6,
    Math.max(chamber.front.x + estimatedWidth / 2 + 6, (guide.bounds.minX + guide.bounds.maxX) / 2),
  );
  const labelY = Math.min(
    chamber.front.y + chamber.front.height - 8,
    Math.max(chamber.front.y + fontSize + 6, guide.bounds.minY - labelClearance),
  );
  drawLabel(ctx, label, labelX, labelY, {
    fill: PALETTE.orangeRGB,
    size: fontSize,
    weight: 'BOLD',
    align: ['CENTER', 'BOTTOM'],
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeMolecularPanels,
    computeEnergyPanel,
    computeChamberRect,
    projectWorldPoint,
    computePerspectiveChamber,
    projectEnergyPoint,
    computeEnergyMotion,
    rotatePoint3D,
    moleculeGeometryForCategory,
    rotationGuidePoint3D,
    computeRotationGuide,
  };
}
