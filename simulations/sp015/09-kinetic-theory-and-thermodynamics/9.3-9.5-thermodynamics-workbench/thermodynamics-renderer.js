/* =========================================================================
   THERMODYNAMICS-RENDERER.JS — SP015 9.3(a–b).
   Stateless global-mode drawing; receives an explicit p5 context and a
   controller-produced frame snapshot. No DOM access or physics derivation.
   ========================================================================= */

const DISPLAY = Object.freeze({
  compactWidth: 560,
  outerPadding: 28,
  panelGap: 16,
  arrowWeight: 4,
  labelSize: 11,
  compactLabelSize: 10,
  ledgerRowHeight: 34,
  ledgerColumnGap: 20,
  minTransferArrowLength: 18,
  pistonTravel: 40,
  objectInset: 4,
  transferGap: 10,
  pistonWidth: 8,
  energyStoreInset: 5,
  processPistonHeadWidth: 12,
  processPistonRodWidth: 4,
  processRodOverhang: 22,
  processMoleculeRadius: 3.2,
  processMoleculeInset: 5,
});

function drawThermodynamicsEnergyScene(ctx, frame, canvasWidth, canvasHeight) {
  ctx.background(PALETTE.panel);
  const compact = canvasWidth < DISPLAY.compactWidth;
  const layout = compact
    ? compactLayout(canvasWidth, canvasHeight)
    : wideLayout(canvasWidth, canvasHeight);

  drawHeatReservoir(ctx, frame, layout.heat);
  drawGasEnergyStore(ctx, frame, layout.gas);
  drawPistonLoad(ctx, frame, layout.work);
  drawLedger(ctx, frame, layout.gas);
}

function wideLayout(width, height) {
  const y = height * 0.44;
  const usableWidth = width - DISPLAY.outerPadding * 2;
  const zoneWidth = (usableWidth - DISPLAY.panelGap * 2) / 3;
  const x0 = DISPLAY.outerPadding;
  return {
    heat: { x: x0, y, width: zoneWidth },
    gas: { x: x0 + zoneWidth + DISPLAY.panelGap, y, width: zoneWidth },
    work: { x: x0 + (zoneWidth + DISPLAY.panelGap) * 2, y, width: zoneWidth },
    compact: false,
    bottom: height - 26,
  };
}

function compactLayout(width, height) {
  const zoneHeight = 70;
  return {
    heat: { x: DISPLAY.outerPadding, y: height * 0.14, width: width - DISPLAY.outerPadding * 2, height: zoneHeight },
    gas: { x: DISPLAY.outerPadding, y: height * 0.37, width: width - DISPLAY.outerPadding * 2, height: 170 },
    work: { x: DISPLAY.outerPadding, y: height * 0.8, width: width - DISPLAY.outerPadding * 2, height: zoneHeight },
    compact: true,
    bottom: height - 20,
  };
}

function drawHeatReservoir(ctx, frame, zone) {
  const geometry = reservoirGeometry(zone);
  const { x, y, width: boxWidth, height: boxHeight, compact } = geometry;

  ctx.push();
  ctx.rectMode(ctx.CENTER);
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(2);
  ctx.fill(PALETTE.orange);
  ctx.rect(x, y, boxWidth, boxHeight, 3);
  ctx.pop();
  drawLabel(ctx, 'HEAT RESERVOIR', x, y - boxHeight * 0.73, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });

  drawTransferArrow(
    ctx,
    frame.targetHeatJ,
    frame.appliedHeatJ,
    geometry.arrowStart,
    y,
    geometry.arrowEnd,
    y,
    PALETTE.orange,
    frame.transferMagnitudeLimitJ,
  );
  drawLabel(ctx, frame.heatDirectionLabel, x, y + boxHeight * 0.9, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });
  drawLabel(ctx, `Q target ${signedFixed(frame.targetHeatJ, 0)} J`, x, y + boxHeight * (compact ? 1.1 : 1.28), {
    fill: PALETTE.mutedRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });
}

function drawGasEnergyStore(ctx, frame, zone) {
  const geometry = gasStoreGeometry(zone);
  const { x, y, width: boxWidth, height: boxHeight, compact } = geometry;
  const energyScale = Math.max(frame.initialInternalEnergyJ, frame.targetFinalInternalEnergyJ, 1);
  const energyFraction = energyScale > 0
    ? Math.min(1, Math.max(0, frame.currentInternalEnergyJ / energyScale))
    : 0;
  const fillGeometry = energyFillGeometry(geometry, energyFraction);

  ctx.push();
  ctx.rectMode(ctx.CENTER);
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(2);
  ctx.fill(PALETTE.paper);
  ctx.rect(x, y, boxWidth, boxHeight, 4);
  ctx.noStroke();
  ctx.fill(PALETTE.acid);
  ctx.rect(fillGeometry.x, fillGeometry.y, fillGeometry.width, fillGeometry.height);
  ctx.pop();
  drawLabel(ctx, 'GAS ENERGY STORE · CURRENT U', x, y - boxHeight * 0.72, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });
  drawLabel(ctx, `U₁  ${(frame.initialInternalEnergyJ * PHYSICS.joulesToKilojoules).toFixed(2)} kJ`, x, y - 6, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });
  drawLabel(ctx, `U₂  ${(frame.targetFinalInternalEnergyJ * PHYSICS.joulesToKilojoules).toFixed(2)} kJ`, x, y + 14, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });
}

function drawPistonLoad(ctx, frame, zone) {
  const geometry = pistonGeometry(zone, frame.targetWorkJ, frame.appliedWorkJ);
  const {
    x,
    y,
    width: chamberWidth,
    height: chamberHeight,
    compact,
    pistonX,
  } = geometry;

  ctx.push();
  ctx.rectMode(ctx.CENTER);
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(2);
  ctx.noFill();
  ctx.rect(x, y, chamberWidth, chamberHeight, 3);
  ctx.fill(PALETTE.teal);
  ctx.rect(pistonX, y, DISPLAY.pistonWidth, chamberHeight + 12);
  ctx.pop();
  drawLabel(ctx, 'PISTON / LOAD', x, y - chamberHeight * 0.73, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });

  drawTransferArrow(
    ctx,
    frame.targetWorkJ,
    frame.appliedWorkJ,
    geometry.arrowStart,
    y,
    geometry.arrowEnd,
    y,
    PALETTE.teal,
    frame.transferMagnitudeLimitJ,
  );
  drawLabel(ctx, frame.workDirectionLabel, x, y + chamberHeight * 0.9, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });
  drawLabel(ctx, `W target ${signedFixed(frame.targetWorkJ, 0)} J`, x, y + chamberHeight * 1.28, {
    fill: PALETTE.mutedRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });
}

function reservoirGeometry(zone) {
  const compact = zone.height !== undefined;
  const width = compact ? Math.min(150, zone.width * 0.52) : Math.min(150, zone.width * 0.72);
  const height = compact ? 46 : 62;
  const x = zone.x + DISPLAY.objectInset + width / 2;
  return Object.freeze({
    x,
    y: zone.y,
    width,
    height,
    compact,
    left: x - width / 2,
    right: x + width / 2,
    arrowStart: x + width / 2 + DISPLAY.transferGap,
    arrowEnd: zone.x + zone.width - DISPLAY.objectInset,
  });
}

function gasStoreGeometry(zone) {
  const compact = zone.height !== undefined;
  const width = compact ? Math.min(220, zone.width * 0.78) : Math.min(220, zone.width * 0.86);
  const height = compact ? 50 : 72;
  const x = zone.x + zone.width / 2;
  return Object.freeze({
    x,
    y: zone.y,
    width,
    height,
    compact,
    left: x - width / 2,
    right: x + width / 2,
    top: zone.y - height / 2,
    bottom: zone.y + height / 2,
  });
}

function energyFillGeometry(store, energyFraction) {
  const fraction = Math.min(1, Math.max(0, energyFraction));
  const width = Math.max(0, store.width - DISPLAY.energyStoreInset * 2);
  const cavityHeight = Math.max(0, store.height - DISPLAY.energyStoreInset * 2);
  const height = cavityHeight * fraction;
  const cavityBottom = store.y + store.height / 2 - DISPLAY.energyStoreInset;
  return Object.freeze({
    x: store.x,
    y: cavityBottom - height / 2,
    width,
    height,
    left: store.x - width / 2,
    right: store.x + width / 2,
    top: cavityBottom - height,
    bottom: cavityBottom,
  });
}

function pistonGeometry(zone, targetWorkJ, appliedWorkJ) {
  const compact = zone.height !== undefined;
  const width = compact ? Math.min(150, zone.width * 0.52) : Math.min(150, zone.width * 0.72);
  const height = compact ? 46 : 62;
  const x = zone.x + zone.width - DISPLAY.objectInset - width / 2;
  const availableTravel = Math.max(0, width / 2 - DISPLAY.pistonWidth / 2 - DISPLAY.objectInset);
  const pistonTravel = Math.min(DISPLAY.pistonTravel, availableTravel);
  return Object.freeze({
    x,
    y: zone.y,
    width,
    height,
    compact,
    left: x - width / 2,
    right: x + width / 2,
    pistonX: x + pistonOffsetFor(targetWorkJ, appliedWorkJ, pistonTravel),
    arrowStart: zone.x + DISPLAY.objectInset,
    arrowEnd: x - width / 2 - DISPLAY.transferGap,
  });
}

function pistonOffsetFor(targetWorkJ, appliedWorkJ, maxTravel = DISPLAY.pistonTravel) {
  if (Math.abs(targetWorkJ) <= 1e-9) return 0;
  const fraction = Math.min(1, Math.max(0, Math.abs(appliedWorkJ / targetWorkJ)));
  return Math.sign(targetWorkJ) * maxTravel * fraction;
}

function drawTransferArrow(ctx, targetValue, appliedValue, x0, y0, x1, y1, color, maxMagnitude) {
  const direction = Math.sign(targetValue);
  if (direction === 0 || Math.abs(appliedValue) <= 1e-9) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const availableLength = Math.hypot(dx, dy);
  if (availableLength <= 1e-9) return;
  const unitX = direction * dx / availableLength;
  const unitY = direction * dy / availableLength;
  const startX = direction > 0 ? x0 : x1;
  const startY = direction > 0 ? y0 : y1;
  const minimumLength = Math.min(DISPLAY.minTransferArrowLength, availableLength);
  const appliedLength = normalizedArrowLength(
    Math.abs(appliedValue),
    0,
    maxMagnitude,
    minimumLength,
    availableLength,
  );
  drawArrowCtx(
    ctx,
    startX,
    startY,
    startX + unitX * appliedLength,
    startY + unitY * appliedLength,
    color,
    DISPLAY.arrowWeight,
    10,
  );
}

function drawLedger(ctx, frame, zone) {
  const x = gasStoreGeometry(zone).x;
  const compact = zone.height !== undefined;
  const y = zone.y + (compact ? 82 : 92);
  const rowHeight = compact ? 26 : DISPLAY.ledgerRowHeight;
  const ledgerWidth = zone.width * (compact ? 0.85 : 0.92);
  const rows = [
    ['Q', signedFixed(frame.appliedHeatJ, 0) + ' J'],
    ['W', signedFixed(frame.appliedWorkJ, 0) + ' J'],
    ['ΔU', signedFixed(frame.appliedDeltaInternalEnergyJ, 0) + ' J'],
  ];
  drawLabel(ctx, 'LIVE LEDGER', x, y - 15, {
    fill: PALETTE.mutedRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    font: 'Space Mono',
  });
  ctx.push();
  ctx.rectMode(ctx.CENTER);
  ctx.stroke(PALETTE.line);
  ctx.strokeWeight(1);
  ctx.fill(PALETTE.paper);
  ctx.rect(x, y + rowHeight, ledgerWidth, rowHeight * 3 + 12, 3);
  ctx.pop();
  rows.forEach(([label, value], index) => {
    const rowY = y + rowHeight + (index - 1) * rowHeight;
    drawCenteredLedgerRow(ctx, label, value, x, rowY, compact);
  });
}

function drawCenteredLedgerRow(ctx, label, value, centerX, y, compact) {
  const size = compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize;
  const gap = compact ? DISPLAY.ledgerColumnGap * 0.8 : DISPLAY.ledgerColumnGap;
  ctx.push();
  ctx.textFont('Space Mono');
  ctx.textSize(size);
  const labelWidth = ctx.textWidth(label);
  const valueWidth = ctx.textWidth(value);
  ctx.pop();

  const totalWidth = labelWidth + gap + valueWidth;
  const labelX = centerX - totalWidth / 2 + labelWidth / 2;
  const valueX = centerX + totalWidth / 2 - valueWidth / 2;
  const options = {
    fill: PALETTE.inkRGB,
    size,
    font: 'Space Mono',
    align: ['CENTER', 'CENTER'],
  };
  drawLabel(ctx, label, labelX, y, options);
  drawLabel(ctx, value, valueX, y, options);
}

function drawThermodynamicsProcessScene(ctx, frame, canvasWidth, canvasHeight) {
  ctx.background(PALETTE.panel);
  const layout = processLayout(canvasWidth, canvasHeight);
  drawProcessCylinder(ctx, frame, layout.cylinder);
  drawPVGraph(ctx, frame, layout.graph);
}

function processLayout(width, height) {
  const compact = width < DISPLAY.compactWidth;
  const padding = DISPLAY.outerPadding;
  if (compact) {
    return {
      compact,
      cylinder: { x: padding, y: 26, width: width - padding * 2, height: 150 },
      graph: { x: padding, y: 210, width: width - padding * 2, height: height - 236 },
    };
  }
  const gap = 28;
  const cylinderWidth = (width - padding * 2 - gap) * 0.41;
  return {
    compact,
    cylinder: { x: padding, y: 32, width: cylinderWidth, height: height - 68 },
    graph: { x: padding + cylinderWidth + gap, y: 32, width: width - padding - (padding + cylinderWidth + gap), height: height - 68 },
  };
}

function drawProcessCylinder(ctx, frame, zone) {
  const titleSize = zone.width < 340 ? 10 : 11;
  const chamber = processChamberGeometry(zone, frame);
  drawLabel(ctx, 'PISTON–CYLINDER', zone.x + zone.width / 2, zone.y + 8, {
    fill: PALETTE.inkRGB, size: titleSize, font: 'Space Mono', align: ['CENTER', 'TOP'],
  });
  drawLabel(ctx, frame.invariantLabel, zone.x + zone.width / 2, zone.y + 28, {
    fill: PALETTE.mutedRGB, size: titleSize, font: 'Space Mono', align: ['CENTER', 'TOP'],
  });
  if (frame.processType === 'adiabatic') {
    drawLabel(ctx, 'NO HEAT TRANSFER', zone.x + zone.width / 2, zone.y + 44, {
      fill: PALETTE.orangeRGB, size: titleSize - 1, font: 'Space Mono', align: ['CENTER', 'TOP'],
    });
  }

  drawProcessCylinderBody(ctx, chamber);
  drawProcessMolecules(ctx, chamber, frame.moleculeEnsemble, frame.molecularCategory);
  drawProcessPiston(ctx, chamber);

  const direction = processDirection(frame);
  if (direction !== 0) {
    const arrowStart = chamber.pistonX - direction * 30;
    const arrowEnd = chamber.pistonX + direction * 30;
    drawArrowCtx(ctx, arrowStart, chamber.y + chamber.height + 14, arrowEnd, chamber.y + chamber.height + 14, PALETTE.teal, 3, 8);
  }
  const motionLabel = frame.processType === 'isochoric'
    ? 'FIXED VOLUME'
    : direction === 0 ? 'STATE 1'
      : direction > 0 ? 'EXPANSION →' : '← COMPRESSION';
  drawLabel(ctx, motionLabel, zone.x + zone.width / 2, chamber.y + chamber.height + 28, {
    fill: PALETTE.inkRGB, size: titleSize, font: 'Space Mono', align: ['CENTER', 'TOP'],
  });
  drawLabel(ctx, `P ${(frame.pressurePa / PHYSICS.pascalsPerKilopascal).toFixed(0)} kPa  ·  V ${(frame.volumeM3 / PHYSICS.cubicMetresPerLitre).toFixed(1)} L  ·  T ${frame.temperatureK.toFixed(1)} K`, zone.x + zone.width / 2, chamber.y + chamber.height + 45, {
    fill: PALETTE.mutedRGB, size: titleSize, font: 'Space Mono', align: ['CENTER', 'TOP'],
  });
}

function processChamberGeometry(zone, frame) {
  const width = Math.min(zone.width * 0.72, 210);
  const height = Math.min(zone.height * 0.36, 108);
  const x = zone.x + (zone.width - width) / 2;
  const y = zone.y + Math.max(60, zone.height * 0.24);
  const initialFraction = 0.52;
  const volumeFraction = frame.processType === 'isochoric'
    ? initialFraction
    : Math.min(0.84, Math.max(0.16, initialFraction * frame.volumeM3 / frame.initialVolumeM3));
  const pistonHeadHalfWidth = DISPLAY.processPistonHeadWidth / 2;
  const wallInset = DISPLAY.processMoleculeInset;
  const pistonX = x + width * volumeFraction;
  return Object.freeze({
    x, y, width, height,
    right: x + width,
    centerY: y + height / 2,
    pistonX,
    pistonHeadHalfWidth,
    gasLeft: x + wallInset,
    gasRight: pistonX - pistonHeadHalfWidth - wallInset,
    gasTop: y + wallInset,
    gasBottom: y + height - wallInset,
  });
}

function drawProcessCylinderBody(ctx, chamber) {
  ctx.push();
  ctx.rectMode(ctx.CORNER);
  ctx.fill(PALETTE.paper);
  ctx.noStroke();
  ctx.rect(chamber.x, chamber.y, chamber.width, chamber.height);
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(2);
  ctx.line(chamber.x, chamber.y, chamber.right, chamber.y);
  ctx.line(chamber.x, chamber.y + chamber.height, chamber.right, chamber.y + chamber.height);
  ctx.line(chamber.x, chamber.y, chamber.x, chamber.y + chamber.height);
  ctx.pop();
}

function drawProcessPiston(ctx, chamber) {
  const headX = chamber.pistonX - chamber.pistonHeadHalfWidth;
  const headWidth = DISPLAY.processPistonHeadWidth;
  const headY = chamber.y + 3;
  const headHeight = chamber.height - 6;
  ctx.push();
  ctx.rectMode(ctx.CORNER);
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(1.5);
  ctx.fill(PALETTE.teal);
  ctx.rect(headX, headY, headWidth, headHeight, 1);
  ctx.strokeWeight(DISPLAY.processPistonRodWidth);
  ctx.line(
    chamber.pistonX + chamber.pistonHeadHalfWidth,
    chamber.centerY,
    chamber.right + DISPLAY.processRodOverhang,
    chamber.centerY,
  );
  ctx.pop();
}

function mapProcessMolecule(chamber, ensemble, particle) {
  const gasWidth = Math.max(0, chamber.gasRight - chamber.gasLeft);
  const gasHeight = Math.max(0, chamber.gasBottom - chamber.gasTop);
  const xScale = gasWidth / ensemble.containerWidth;
  const yScale = gasHeight;
  return Object.freeze({
    x: chamber.gasLeft + particle.x * xScale,
    y: chamber.gasTop + particle.y * yScale,
    radius: Math.min(DISPLAY.processMoleculeRadius, ensemble.radius * xScale, ensemble.radius * yScale),
    angle: particle.angle,
  });
}

function processMoleculeDrawables(chamber, ensemble) {
  if (!ensemble || !(ensemble.containerWidth > 0)) return Object.freeze([]);
  return Object.freeze(ensemble.particles.map((particle) => mapProcessMolecule(chamber, ensemble, particle)));
}

function drawProcessMoleculeGlyph(ctx, molecule, category) {
  if (!(molecule.radius > 0)) return;
  const angle = molecule.angle || 0;
  ctx.push();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(0.8);
  ctx.fill(PALETTE.orange);
  if (category === 'diatomic') {
    const offset = molecule.radius * 0.46;
    const atomRadius = molecule.radius * 0.44;
    const dx = Math.cos(angle) * offset;
    const dy = Math.sin(angle) * offset;
    ctx.line(molecule.x - dx, molecule.y - dy, molecule.x + dx, molecule.y + dy);
    ctx.circle(molecule.x - dx, molecule.y - dy, atomRadius * 2);
    ctx.circle(molecule.x + dx, molecule.y + dy, atomRadius * 2);
  } else if (category === 'polyatomic') {
    const offset = molecule.radius * 0.38;
    const atomRadius = molecule.radius * 0.42;
    for (let index = 0; index < 3; index += 1) {
      const atomAngle = angle + index * Math.PI * 2 / 3;
      ctx.circle(
        molecule.x + Math.cos(atomAngle) * offset,
        molecule.y + Math.sin(atomAngle) * offset,
        atomRadius * 2,
      );
    }
  } else {
    ctx.circle(molecule.x, molecule.y, molecule.radius * 2);
  }
  ctx.pop();
}

function drawProcessMolecules(ctx, chamber, ensemble, category) {
  processMoleculeDrawables(chamber, ensemble)
    .forEach((molecule) => drawProcessMoleculeGlyph(ctx, molecule, category));
}

function drawPVGraph(ctx, frame, zone) {
  const graph = graphGeometry(zone, frame);
  const labelSize = zone.width < 340 ? 9 : 10;
  drawLabel(ctx, 'P–V GRAPH · ACTIVE PATH', zone.x + zone.width / 2, zone.y + 8, {
    fill: PALETTE.inkRGB, size: labelSize + 1, font: 'Space Mono', align: ['CENTER', 'TOP'],
  });
  ctx.push();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(1.5);
  ctx.line(graph.left, graph.top, graph.left, graph.bottom);
  ctx.line(graph.left, graph.bottom, graph.right, graph.bottom);
  ctx.pop();
  drawLabel(ctx, 'P / kPa', graph.left, graph.top - 5, { fill: PALETTE.mutedRGB, size: labelSize, font: 'Space Mono', align: ['LEFT', 'BOTTOM'] });
  drawLabel(ctx, 'V / L', graph.right, graph.bottom + 18, { fill: PALETTE.mutedRGB, size: labelSize, font: 'Space Mono', align: ['RIGHT', 'TOP'] });
  drawGraphTicks(ctx, graph, labelSize);
  if (frame.workRequiredBySP015) drawWorkArea(ctx, frame.appliedPathSamples, graph);
  if (frame.processType === 'adiabatic') drawComparisonPath(ctx, frame.isothermalComparisonSamples, graph, labelSize);
  drawPath(ctx, frame.pathSamples, graph, PALETTE.orange, 3);
  drawStateMarkers(ctx, frame, graph, labelSize);
  drawPathDirection(ctx, frame.appliedPathSamples, graph);
  const workText = frame.workRequiredBySP015
    ? `W = ${signedFixed(frame.currentWorkJ, 0)} J`
    : 'W: not required by SP015 9.5';
  drawLabel(ctx, workText, graph.left + 4, graph.top + 8, { fill: PALETTE.inkRGB, size: labelSize, font: 'Space Mono', align: ['LEFT', 'TOP'] });
  if (frame.processType === 'isochoric') {
    drawLabel(ctx, 'ZERO WIDTH → W = 0', graph.left + 4, graph.top + 24, { fill: PALETTE.mutedRGB, size: labelSize, font: 'Space Mono', align: ['LEFT', 'TOP'] });
  }
}

function graphGeometry(zone, frame) {
  const allPoints = [...frame.pathSamples, ...frame.isothermalComparisonSamples];
  const volumes = allPoints.map((point) => point.volumeM3 / PHYSICS.cubicMetresPerLitre);
  const pressures = allPoints.map((point) => point.pressurePa / PHYSICS.pascalsPerKilopascal);
  const minV = Math.min(...volumes);
  const maxV = Math.max(...volumes);
  const maxP = Math.max(...pressures);
  const volumePad = Math.max(1, (maxV - minV) * 0.18);
  const pressureMax = Math.max(10, maxP * 1.18);
  const left = zone.x + 42;
  const right = zone.x + zone.width - 14;
  const top = zone.y + 48;
  const bottom = zone.y + zone.height - 38;
  return Object.freeze({
    left, right, top, bottom,
    minV: Math.max(0, minV - volumePad), maxV: maxV + volumePad,
    maxP: pressureMax,
  });
}

function mapGraphPoint(graph, point) {
  const volumeL = point.volumeM3 / PHYSICS.cubicMetresPerLitre;
  const pressureKPa = point.pressurePa / PHYSICS.pascalsPerKilopascal;
  return Object.freeze({
    x: graph.left + (volumeL - graph.minV) / (graph.maxV - graph.minV) * (graph.right - graph.left),
    y: graph.bottom - pressureKPa / graph.maxP * (graph.bottom - graph.top),
  });
}

function drawGraphTicks(ctx, graph, labelSize) {
  const volumeTick = (graph.minV + graph.maxV) / 2;
  const pressureTick = graph.maxP / 2;
  const x = graph.left + (volumeTick - graph.minV) / (graph.maxV - graph.minV) * (graph.right - graph.left);
  const y = graph.bottom - pressureTick / graph.maxP * (graph.bottom - graph.top);
  ctx.push();
  ctx.stroke(PALETTE.line);
  ctx.strokeWeight(1);
  ctx.line(x, graph.top, x, graph.bottom);
  ctx.line(graph.left, y, graph.right, y);
  ctx.pop();
  drawLabel(ctx, `${volumeTick.toFixed(0)}`, x, graph.bottom + 4, { fill: PALETTE.mutedRGB, size: labelSize, font: 'Space Mono', align: ['CENTER', 'TOP'] });
  drawLabel(ctx, `${pressureTick.toFixed(0)}`, graph.left - 5, y, { fill: PALETTE.mutedRGB, size: labelSize, font: 'Space Mono', align: ['RIGHT', 'CENTER'] });
}

function drawWorkArea(ctx, samples, graph) {
  if (samples.length < 2) return;
  ctx.push();
  ctx.noStroke();
  ctx.fill(PALETTE.acid);
  ctx.beginShape();
  const first = mapGraphPoint(graph, samples[0]);
  ctx.vertex(first.x, graph.bottom);
  samples.forEach((point) => {
    const mapped = mapGraphPoint(graph, point);
    ctx.vertex(mapped.x, mapped.y);
  });
  const last = mapGraphPoint(graph, samples[samples.length - 1]);
  ctx.vertex(last.x, graph.bottom);
  ctx.endShape(ctx.CLOSE);
  ctx.pop();
}

function drawPath(ctx, samples, graph, color, weight) {
  if (samples.length < 2) return;
  ctx.push();
  ctx.noFill();
  ctx.stroke(color);
  ctx.strokeWeight(weight);
  ctx.beginShape();
  samples.forEach((point) => {
    const mapped = mapGraphPoint(graph, point);
    ctx.vertex(mapped.x, mapped.y);
  });
  ctx.endShape();
  ctx.pop();
}

function drawComparisonPath(ctx, samples, graph, labelSize) {
  if (samples.length < 2) return;
  ctx.push();
  ctx.drawingContext.setLineDash([5, 4]);
  ctx.noFill();
  ctx.stroke(PALETTE.teal);
  ctx.strokeWeight(2);
  ctx.beginShape();
  samples.forEach((point) => {
    const mapped = mapGraphPoint(graph, point);
    ctx.vertex(mapped.x, mapped.y);
  });
  ctx.endShape();
  ctx.drawingContext.setLineDash([]);
  ctx.pop();
  const labelPoint = mapGraphPoint(graph, samples[Math.floor(samples.length * 0.68)]);
  drawLabel(ctx, 'isothermal comparison', labelPoint.x, labelPoint.y - 10, { fill: PALETTE.tealRGB, size: labelSize, font: 'Space Mono', align: ['CENTER', 'BOTTOM'] });
}

function drawStateMarkers(ctx, frame, graph, labelSize) {
  const start = mapGraphPoint(graph, { volumeM3: frame.initialVolumeM3, pressurePa: frame.initialPressurePa });
  const current = mapGraphPoint(graph, frame);
  const target = mapGraphPoint(graph, frame.target);
  ctx.push();
  ctx.stroke(PALETTE.ink); ctx.strokeWeight(1.5); ctx.fill(PALETTE.panel);
  ctx.circle(start.x, start.y, 9);
  ctx.fill(PALETTE.orange); ctx.circle(target.x, target.y, 9);
  ctx.fill(PALETTE.ink); ctx.circle(current.x, current.y, 10);
  ctx.pop();
  drawLabel(ctx, '1', start.x, start.y - 10, { fill: PALETTE.inkRGB, size: labelSize, font: 'Space Mono', align: ['CENTER', 'BOTTOM'] });
  drawLabel(ctx, '2', target.x, target.y - 10, { fill: PALETTE.orangeRGB, size: labelSize, font: 'Space Mono', align: ['CENTER', 'BOTTOM'] });
  drawLabel(ctx, 'NOW', current.x, current.y + 12, { fill: PALETTE.inkRGB, size: labelSize, font: 'Space Mono', align: ['CENTER', 'TOP'] });
}

function drawPathDirection(ctx, samples, graph) {
  if (samples.length < 3) return;
  const end = mapGraphPoint(graph, samples[samples.length - 1]);
  const start = mapGraphPoint(graph, samples[Math.max(0, samples.length - 5)]);
  drawArrowCtx(ctx, start.x, start.y, end.x, end.y, PALETTE.orange, 2, 7);
}

function processDirection(frame) {
  if (frame.processType === 'isochoric') return 0;
  return Math.sign(frame.volumeM3 - frame.initialVolumeM3);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DISPLAY,
    drawThermodynamicsEnergyScene,
    wideLayout,
    compactLayout,
    drawTransferArrow,
    pistonOffsetFor,
    reservoirGeometry,
    gasStoreGeometry,
    energyFillGeometry,
    pistonGeometry,
    processLayout,
    processChamberGeometry,
    mapProcessMolecule,
    processMoleculeDrawables,
    graphGeometry,
    mapGraphPoint,
    processDirection,
    drawThermodynamicsProcessScene,
  };
}
