/* =========================================================================
   MATERIALS-TESTING-RENDERER.JS — SP015 8.1–8.2.
   Stateless canvas rendering from a controller-supplied read-only snapshot.
   ========================================================================= */

function drawMaterialsTestingScene(ctx, frame, canvasWidth, canvasHeight) {
  ctx.background(PALETTE.panel);
  const compact = canvasWidth < DISPLAY.compactWidth;
  if (compact) {
    drawCompactScene(ctx, frame, canvasWidth, canvasHeight);
  } else {
    drawWideScene(ctx, frame, canvasWidth, canvasHeight);
  }
}

function drawWideScene(ctx, frame, canvasWidth, canvasHeight) {
  const machineWidth = canvasWidth * DISPLAY.machineWidthRatio;
  ctx.stroke(PALETTE.line);
  ctx.strokeWeight(1);
  ctx.line(machineWidth, 0, machineWidth, canvasHeight);
  drawVerticalMachine(ctx, frame, 0, 0, machineWidth, canvasHeight);

  const graphX = machineWidth + DISPLAY.panelGap;
  const graphWidth = canvasWidth - graphX - DISPLAY.panelGap;
  if (frame.mode === 'elastic') {
    const graphHeight = (canvasHeight - DISPLAY.panelGap * 3) / 2;
    drawGraph(ctx, frame, 'stress', graphX, DISPLAY.panelGap, graphWidth, graphHeight, false);
    drawGraph(ctx, frame, 'force', graphX, graphHeight + DISPLAY.panelGap * 2, graphWidth, graphHeight, false);
  } else {
    drawGraph(ctx, frame, 'force', graphX, DISPLAY.panelGap, graphWidth, canvasHeight - DISPLAY.panelGap * 2, false);
  }
}

function drawCompactScene(ctx, frame, canvasWidth, canvasHeight) {
  const margin = 8;
  const machineHeight = Math.max(92, canvasHeight * 0.27);
  drawHorizontalMachine(ctx, frame, margin, margin, canvasWidth - margin * 2, machineHeight);
  const graphY = machineHeight + margin * 2;
  if (frame.mode === 'elastic') {
    const graphHeight = (canvasHeight - graphY - margin * 2) / 2;
    drawGraph(ctx, frame, 'stress', margin, graphY, canvasWidth - margin * 2, graphHeight, true);
    drawGraph(ctx, frame, 'force', margin, graphY + graphHeight + margin, canvasWidth - margin * 2, graphHeight, true);
  } else {
    drawGraph(ctx, frame, 'force', margin, graphY, canvasWidth - margin * 2, canvasHeight - graphY - margin, true);
  }
}

function machineVisual(frame) {
  if (frame.mode === 'elastic') {
    const sign = frame.elastic.loadingType === 'tension' ? 1 : -1;
    return { amount: sign * frame.progress, fractured: false, type: frame.elastic.loadingType };
  }
  return {
    amount: frame.comparison.selected.elongation,
    fractured: frame.comparison.selected.state === 'Fractured',
    type: 'tension',
  };
}

function mapDisplayValue(value, limits, minimum, maximum) {
  const amount = (value - limits.min) / (limits.max - limits.min);
  return minimum + Math.max(0, Math.min(1, amount)) * (maximum - minimum);
}

function specimenDisplayGeometry(frame, maximumLength) {
  if (frame.mode !== 'elastic') {
    return {
      referenceLength: maximumLength,
      deformation: mapDisplayValue(frame.progress, LIMITS.progress, 0, DISPLAY.maxDisplayDeformation),
      shoulder: (DISPLAY.specimenWidth.min + DISPLAY.specimenWidth.max) / 2,
    };
  }
  return {
    // Display geometry is intentionally bounded; physical L₀, A, and ΔL remain in the model.
    referenceLength: mapDisplayValue(frame.elastic.originalLengthM, LIMITS.originalLength, DISPLAY.specimenLength.min, maximumLength),
    deformation: mapDisplayValue(Math.abs(frame.elastic.deltaL), { min: 0, max: LIMITS.targetDeltaL.max * PHYSICS.centimetresToMetres }, 0, DISPLAY.maxDisplayDeformation),
    shoulder: mapDisplayValue(frame.elastic.areaM2 / PHYSICS.squareMillimetresToSquareMetres, LIMITS.area, DISPLAY.specimenWidth.min, DISPLAY.specimenWidth.max),
  };
}

function drawVerticalMachine(ctx, frame, x, y, w, h) {
  const visual = machineVisual(frame);
  const centerX = x + w * 0.5;
  const safeTop = y + 77;
  const safeBottom = y + h - 65;
  const geometry = specimenDisplayGeometry(frame, Math.min(DISPLAY.specimenLength.max, safeBottom - safeTop - DISPLAY.maxDisplayDeformation));
  const referenceMiddle = (safeTop + safeBottom) / 2;
  const top = referenceMiddle - geometry.referenceLength / 2;
  const bottom = referenceMiddle + geometry.referenceLength / 2;
  const deformationSign = frame.mode === 'elastic' ? (frame.elastic.loadingType === 'tension' ? 1 : -1) : visual.amount >= 0 ? 1 : -1;
  const halfChange = deformationSign * geometry.deformation * 0.5;
  const currentTop = top - halfChange;
  const currentBottom = bottom + halfChange;
  const columnLeft = x + 28;
  const columnRight = x + w - 28;

  ctx.noStroke();
  ctx.fill(PALETTE.ink);
  ctx.rect(columnLeft, y + 42, 12, h - 72);
  ctx.rect(columnRight - 12, y + 42, 12, h - 72);
  ctx.rect(columnLeft, y + 42, columnRight - columnLeft, 13);
  ctx.rect(columnLeft, h - 43, columnRight - columnLeft, 13);

  const gripWidth = Math.min(66, geometry.shoulder + 32);
  drawGrip(ctx, centerX, currentTop - 11, gripWidth, 22);
  drawGrip(ctx, centerX, currentBottom + 11, gripWidth, 22);
  drawSpecimenVertical(ctx, centerX, currentTop, currentBottom, visual.fractured, geometry.shoulder);

  drawDashedGuide(ctx, centerX - 45, top, centerX + 45, top, PALETTE.teal, 1, [4, 4]);
  drawDashedGuide(ctx, centerX - 45, bottom, centerX + 45, bottom, PALETTE.teal, 1, [4, 4]);
  drawDashedGuide(ctx, centerX - 34, currentTop, centerX + 34, currentTop, PALETTE.orange, 1, [2, 3]);
  drawDashedGuide(ctx, centerX - 34, currentBottom, centerX + 34, currentBottom, PALETTE.orange, 1, [2, 3]);
  drawLabel(ctx, 'original gauge', centerX, top - 15, { fill: PALETTE.muted, size: DISPLAY.labelSize, font: 'Space Mono' });
  drawLabel(ctx, 'current', centerX + 50, (currentTop + currentBottom) / 2, { fill: PALETTE.orange, size: DISPLAY.labelSize, font: 'Space Mono', align: ['LEFT', 'CENTER'] });

  drawVerticalForceArrows(ctx, centerX, currentTop, currentBottom, visual.type);
  // Keep the state below the lower crossbar so it never masks the moving specimen or grip.
  drawStateBadge(ctx, frame.state, centerX, y + h - 15, Math.min(118, w - 46));
}

function drawHorizontalMachine(ctx, frame, x, y, w, h) {
  const visual = machineVisual(frame);
  const centerY = y + h * 0.53;
  const safeLeft = x + 40;
  const safeRight = x + w - 40;
  const geometry = specimenDisplayGeometry(frame, Math.min(DISPLAY.specimenLength.max, safeRight - safeLeft - DISPLAY.maxDisplayDeformation));
  const referenceMiddle = (safeLeft + safeRight) / 2;
  const left = referenceMiddle - geometry.referenceLength / 2;
  const right = referenceMiddle + geometry.referenceLength / 2;
  const deformationSign = frame.mode === 'elastic' ? (frame.elastic.loadingType === 'tension' ? 1 : -1) : visual.amount >= 0 ? 1 : -1;
  const halfChange = deformationSign * geometry.deformation * 0.5;
  const currentLeft = left - halfChange;
  const currentRight = right + halfChange;

  ctx.noStroke();
  ctx.fill(PALETTE.ink);
  ctx.rect(x + 8, y + 20, 12, h - 29);
  ctx.rect(x + w - 20, y + 20, 12, h - 29);
  ctx.rect(x + 8, y + h - 21, w - 16, 12);
  const gripHeight = Math.min(45, geometry.shoulder + 20);
  drawGrip(ctx, currentLeft - 10, centerY, 20, gripHeight);
  drawGrip(ctx, currentRight + 10, centerY, 20, gripHeight);
  drawSpecimenHorizontal(ctx, currentLeft, currentRight, centerY, visual.fractured, geometry.shoulder);

  drawDashedGuide(ctx, left, centerY - 28, left, centerY + 28, PALETTE.teal, 1, [3, 3]);
  drawDashedGuide(ctx, right, centerY - 28, right, centerY + 28, PALETTE.teal, 1, [3, 3]);
  drawDashedGuide(ctx, currentLeft, centerY - 20, currentLeft, centerY + 20, PALETTE.orange, 1, [2, 3]);
  drawDashedGuide(ctx, currentRight, centerY - 20, currentRight, centerY + 20, PALETTE.orange, 1, [2, 3]);
  drawHorizontalForceArrows(ctx, currentLeft, currentRight, centerY, visual.type);
  const badgeWidth = Math.min(112, w * 0.35);
  drawStateBadge(ctx, frame.state, x + w - badgeWidth / 2 - 8, y + 13, badgeWidth);
}

function drawGrip(ctx, centerX, centerY, gripWidth, gripHeight) {
  ctx.push();
  ctx.rectMode(ctx.CENTER);
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(1);
  ctx.fill(PALETTE.line);
  ctx.rect(centerX, centerY, gripWidth, gripHeight);
  ctx.stroke(PALETTE.muted);
  for (let offset = -gripWidth / 2 + 8; offset < gripWidth / 2; offset += 9) {
    ctx.line(centerX + offset, centerY - gripHeight / 2, centerX + offset + 6, centerY + gripHeight / 2);
  }
  ctx.pop();
}

function drawSpecimenVertical(ctx, centerX, top, bottom, fractured, shoulder) {
  ctx.noStroke();
  ctx.fill(PALETTE.orange);
  const narrow = shoulder * 0.55;
  const middle = (top + bottom) / 2;
  const gap = fractured ? 12 : 0;
  drawDogBoneHalf(ctx, centerX, top, middle - gap / 2, shoulder, narrow, true);
  drawDogBoneHalf(ctx, centerX, middle + gap / 2, bottom, shoulder, narrow, false);
  if (fractured) drawFractureMark(ctx, centerX, middle, false);
}

function drawDogBoneHalf(ctx, centerX, start, end, shoulder, narrow, fromTop) {
  const taper = Math.min(18, Math.abs(end - start) * 0.35);
  ctx.beginShape();
  if (fromTop) {
    ctx.vertex(centerX - shoulder / 2, start);
    ctx.vertex(centerX + shoulder / 2, start);
    ctx.vertex(centerX + narrow / 2, start + taper);
    ctx.vertex(centerX + narrow / 2, end);
    ctx.vertex(centerX - narrow / 2, end);
    ctx.vertex(centerX - narrow / 2, start + taper);
  } else {
    ctx.vertex(centerX - narrow / 2, start);
    ctx.vertex(centerX + narrow / 2, start);
    ctx.vertex(centerX + narrow / 2, end - taper);
    ctx.vertex(centerX + shoulder / 2, end);
    ctx.vertex(centerX - shoulder / 2, end);
    ctx.vertex(centerX - narrow / 2, end - taper);
  }
  ctx.endShape(ctx.CLOSE);
}

function drawSpecimenHorizontal(ctx, left, right, centerY, fractured, thickness) {
  const gap = fractured ? 12 : 0;
  const middle = (left + right) / 2;
  ctx.noStroke();
  ctx.fill(PALETTE.orange);
  ctx.rect(left, centerY - thickness / 2, Math.max(0, middle - gap / 2 - left), thickness);
  ctx.rect(middle + gap / 2, centerY - thickness / 2, Math.max(0, right - middle - gap / 2), thickness);
  if (fractured) drawFractureMark(ctx, middle, centerY, true);
}

function drawFractureMark(ctx, x, y, horizontal) {
  ctx.push();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(2);
  if (horizontal) {
    ctx.line(x - 4, y - 10, x + 3, y - 3);
    ctx.line(x + 3, y - 3, x - 2, y + 4);
    ctx.line(x - 2, y + 4, x + 4, y + 10);
    drawLabel(ctx, 'fracture', x + 10, y - 13, { fill: PALETTE.ink, size: 9, align: ['LEFT', 'CENTER'] });
  } else {
    ctx.line(x - 10, y - 4, x - 3, y + 3);
    ctx.line(x - 3, y + 3, x + 4, y - 2);
    ctx.line(x + 4, y - 2, x + 10, y + 4);
    drawLabel(ctx, 'fracture', x, y + 19, { fill: PALETTE.ink, size: 9 });
  }
  ctx.pop();
}

function drawVerticalForceArrows(ctx, centerX, top, bottom, type) {
  if (type === 'tension') {
    drawArrowCtx(ctx, centerX, top - 18, centerX, top - 51, PALETTE.teal, 3, 8);
    drawArrowCtx(ctx, centerX, bottom + 18, centerX, bottom + 51, PALETTE.teal, 3, 8);
  } else {
    drawArrowCtx(ctx, centerX, top - 51, centerX, top - 18, PALETTE.teal, 3, 8);
    drawArrowCtx(ctx, centerX, bottom + 51, centerX, bottom + 18, PALETTE.teal, 3, 8);
  }
}

function drawHorizontalForceArrows(ctx, left, right, centerY, type) {
  if (type === 'tension') {
    drawArrowCtx(ctx, left - 12, centerY, left - 48, centerY, PALETTE.teal, 3, 8);
    drawArrowCtx(ctx, right + 12, centerY, right + 48, centerY, PALETTE.teal, 3, 8);
  } else {
    drawArrowCtx(ctx, left - 48, centerY, left - 12, centerY, PALETTE.teal, 3, 8);
    drawArrowCtx(ctx, right + 48, centerY, right + 12, centerY, PALETTE.teal, 3, 8);
  }
}

function drawStateBadge(ctx, state, centerX, centerY, badgeWidth) {
  ctx.push();
  ctx.rectMode(ctx.CENTER);
  ctx.stroke(PALETTE.ink);
  ctx.fill(state === 'Fractured' ? PALETTE.orange : PALETTE.acid);
  ctx.rect(centerX, centerY, badgeWidth, 24);
  ctx.pop();
  drawLabel(ctx, state.toUpperCase(), centerX, centerY, { fill: PALETTE.ink, size: 9, weight: 'BOLD', font: 'Space Mono' });
}

function drawGraph(ctx, frame, kind, x, y, w, h, compact) {
  ctx.push();
  ctx.stroke(PALETTE.line);
  ctx.fill(PALETTE.white);
  ctx.rect(x, y, w, h);
  ctx.pop();
  if (frame.mode === 'elastic') {
    drawElasticGraph(ctx, frame, kind, x, y, w, h, compact);
  } else {
    drawComparisonGraph(ctx, frame, x, y, w, h, compact);
  }
}

function drawElasticGraph(ctx, frame, kind, x, y, w, h, compact) {
  const pad = compact ? DISPLAY.compactGraphPadding : DISPLAY.graphPadding;
  const left = x + pad.left;
  const right = x + w - pad.right;
  const top = y + pad.top;
  const bottom = y + h - pad.bottom;
  const originX = (left + right) / 2;
  const originY = (top + bottom) / 2;
  const currentXValue = kind === 'stress' ? frame.elastic.strain : frame.elastic.deltaL;
  const currentYValue = kind === 'stress' ? frame.elastic.stress : frame.elastic.force;
  const targetXValue = kind === 'stress' ? frame.elastic.reference.strain : frame.elastic.reference.deltaL;
  const targetYValue = kind === 'stress' ? frame.elastic.reference.stress : frame.elastic.reference.force;
  const mapX = (value) => originX + (value / Math.abs(targetXValue || 1)) * (right - originX) * 0.84;
  const mapY = (value) => originY - (value / Math.abs(targetYValue || 1)) * (originY - top) * 0.84;
  const markerX = mapX(currentXValue);
  const markerY = mapY(currentYValue);
  const targetX = mapX(targetXValue);
  const targetY = mapY(targetYValue);

  ctx.noStroke();
  ctx.fill(...PALETTE.acidRGB, 105);
  ctx.triangle(originX, originY, markerX, originY, markerX, markerY);
  drawDashedGuide(ctx, originX, originY, targetX, targetY, PALETTE.teal, 2, [5, 4]);
  ctx.stroke(PALETTE.orange);
  ctx.strokeWeight(3);
  ctx.line(originX, originY, markerX, markerY);
  drawCenteredAxes(ctx, left, right, top, bottom, originX, originY, compact);
  drawMarker(ctx, markerX, markerY, PALETTE.orange);
  if (kind === 'stress') {
    const stateOffset = frame.elastic.loadingType === 'tension' ? 11 : -11;
    drawLabel(ctx, 'ELASTIC', markerX + 7, markerY + stateOffset, { fill: PALETTE.orange, size: compact ? 7 : 8, weight: 'BOLD', font: 'Space Mono', align: ['LEFT', 'CENTER'] });
  }

  const title = kind === 'stress' ? 'STRESS–STRAIN' : 'FORCE–ELONGATION';
  const xLabel = kind === 'stress' ? 'ε' : 'ΔL (cm)';
  const yLabel = kind === 'stress' ? 'σ (MPa)' : 'F (kN)';
  drawLabel(ctx, title, left, y + 13, { fill: PALETTE.ink, size: compact ? 9 : 10, weight: 'BOLD', font: 'Space Mono', align: ['LEFT', 'CENTER'] });
  drawLabel(ctx, xLabel, right, originY + 14, { fill: PALETTE.muted, size: compact ? 8 : 9, font: 'Space Mono', align: ['RIGHT', 'CENTER'] });
  drawLabel(ctx, yLabel, originX + 6, top, { fill: PALETTE.muted, size: compact ? 8 : 9, font: 'Space Mono', align: ['LEFT', 'TOP'] });
  const energyText = kind === 'stress'
    ? `u = ${formatCanvasEnergy(frame.elastic.energyDensity, true)}`
    : `U = ${formatCanvasEnergy(frame.elastic.strainEnergy, false)}`;
  drawEnergyAnnotation(ctx, energyText, originX, originY, markerX, markerY, left, right, top, bottom, compact);
}

function drawEnergyAnnotation(ctx, text, originX, originY, markerX, markerY, left, right, top, bottom, compact) {
  const dx = markerX - originX;
  const dy = markerY - originY;
  const tension = dx >= 0;
  const size = compact ? 8 : 9;
  const hasRoomInsideTriangle = Math.abs(dx) > 72 && Math.abs(dy) > 28;
  const x = hasRoomInsideTriangle
    ? originX + dx * 0.78
    : tension ? right - 4 : left + 4;
  const y = hasRoomInsideTriangle
    ? originY + dy * 0.30
    : tension ? top + 15 : bottom - 15;
  // The main placement sits between the sloped boundary and its axis, in open shaded space.
  drawLabel(ctx, text, x, y, {
    fill: PALETTE.accent,
    size,
    font: 'Space Mono',
    align: [tension ? 'RIGHT' : 'LEFT', 'CENTER'],
  });
}

function drawCenteredAxes(ctx, left, right, top, bottom, originX, originY, compact) {
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(1);
  ctx.line(left, originY, right, originY);
  ctx.line(originX, top, originX, bottom);
  const ticks = compact ? 1 : 2;
  for (let i = 1; i <= ticks; i += 1) {
    const dx = ((right - originX) * i) / (ticks + 1);
    const dy = ((originY - top) * i) / (ticks + 1);
    ctx.line(originX - dx, originY - 3, originX - dx, originY + 3);
    ctx.line(originX + dx, originY - 3, originX + dx, originY + 3);
    ctx.line(originX - 3, originY - dy, originX + 3, originY - dy);
    ctx.line(originX - 3, originY + dy, originX + 3, originY + dy);
  }
  drawLabel(ctx, '0', originX - 5, originY + 9, { fill: PALETTE.muted, size: 8, align: ['RIGHT', 'TOP'] });
}

function formatCanvasEnergy(value, density) {
  if (density) return value >= 1000 ? `${(value / 1000).toFixed(1)} kJ m⁻³ ≥ 0` : `${value.toFixed(1)} J m⁻³ ≥ 0`;
  return `${value.toFixed(2)} J ≥ 0`;
}

function drawComparisonGraph(ctx, frame, x, y, w, h, compact) {
  const pad = compact ? DISPLAY.compactGraphPadding : DISPLAY.graphPadding;
  const left = x + pad.left;
  const right = x + w - pad.right;
  const top = y + pad.top;
  const bottom = y + h - pad.bottom;
  const mapPoint = (point) => ({
    x: left + point.elongation * (right - left) * 0.94,
    y: bottom - point.force * (bottom - top) * 0.90,
  });

  drawStandardAxes(ctx, left, right, top, bottom, compact);
  const title = 'NORMALIZED FORCE–ELONGATION';
  drawLabel(ctx, title, left, y + 13, { fill: PALETTE.ink, size: compact ? 8 : 10, weight: 'BOLD', font: 'Space Mono', align: ['LEFT', 'CENTER'] });
  drawLabel(ctx, 'SCHEMATIC · NORMALIZED', right, y + 13, { fill: PALETTE.muted, size: compact ? 7 : 8, font: 'Space Mono', align: ['RIGHT', 'CENTER'] });

  drawCurvePolyline(ctx, frame.comparison.ductilePoints, mapPoint, PALETTE.orange, frame.preset === 'ductile' ? 3 : 2, false);
  drawCurvePolyline(ctx, frame.comparison.brittlePoints, mapPoint, PALETTE.teal, frame.preset === 'brittle' ? 3 : 2, true);
  drawLabel(ctx, 'solid — ductile', left + 4, top + 8, { fill: PALETTE.orange, size: compact ? 7 : 8, font: 'Space Mono', align: ['LEFT', 'CENTER'] });
  drawLabel(ctx, 'dashed — brittle', left + 4, top + 19, { fill: PALETTE.teal, size: compact ? 7 : 8, font: 'Space Mono', align: ['LEFT', 'CENTER'] });
  drawCharacteristicPoints(ctx, frame.comparison.ductilePoints, mapPoint, compact);

  const marker = mapPoint(frame.comparison.selected);
  drawMarker(ctx, marker.x, marker.y, frame.preset === 'ductile' ? PALETTE.orange : PALETTE.teal);
  if (frame.comparison.selected.state === 'Fractured') {
    drawDashedGuide(ctx, marker.x, marker.y, marker.x, bottom, PALETTE.ink, 1, [3, 3]);
  }
}

function drawCharacteristicPoints(ctx, ductilePoints, mapPoint, compact) {
  const labelOffsets = {
    A: { x: 9, y: 13, align: 'LEFT' },
    B: { x: 9, y: -13, align: 'LEFT' },
    C: { x: 9, y: -13, align: 'LEFT' },
    D: { x: 0, y: -15, align: 'CENTER' },
    E: { x: -10, y: -2, align: 'RIGHT' },
  };
  CHARACTERISTIC_POINTS.forEach(({ key, pointIndex }) => {
    const marker = mapPoint(ductilePoints[pointIndex]);
    const offset = labelOffsets[key];
    drawMarker(ctx, marker.x, marker.y, PALETTE.orange, compact ? 6 : 7);
    drawLabel(ctx, key, marker.x + offset.x, marker.y + offset.y, {
      fill: PALETTE.ink,
      size: compact ? 9 : 10,
      weight: 'BOLD',
      font: 'Space Mono',
      align: [offset.align, 'CENTER'],
    });
  });
}

function drawStandardAxes(ctx, left, right, top, bottom, compact) {
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(1);
  ctx.line(left, top, left, bottom);
  ctx.line(left, bottom, right, bottom);
  const ticks = compact ? 2 : 4;
  for (let i = 1; i <= ticks; i += 1) {
    const px = left + ((right - left) * i) / ticks;
    const py = bottom - ((bottom - top) * i) / ticks;
    ctx.line(px, bottom - 3, px, bottom + 3);
    ctx.line(left - 3, py, left + 3, py);
  }
  drawLabel(ctx, '0', left - 4, bottom + 6, { fill: PALETTE.muted, size: 8, align: ['RIGHT', 'TOP'] });
  drawLabel(ctx, '1', right, bottom + 6, { fill: PALETTE.muted, size: 8, align: ['CENTER', 'TOP'] });
}

function drawCurvePolyline(ctx, points, mapPoint, colorValue, weight, dashed) {
  ctx.push();
  ctx.noFill();
  ctx.stroke(colorValue);
  ctx.strokeWeight(weight);
  if (dashed) {
    drawDashedCurve(ctx, (index) => {
      const scaled = (index / DISPLAY.graphSamples) * (points.length - 1);
      const startIndex = Math.min(points.length - 2, Math.floor(scaled));
      const amount = scaled - startIndex;
      const start = mapPoint(points[startIndex]);
      const end = mapPoint(points[startIndex + 1]);
      return { x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount };
    }, DISPLAY.graphSamples, [5, 4]);
  } else {
    ctx.beginShape();
    points.forEach((point) => {
      const mapped = mapPoint(point);
      ctx.vertex(mapped.x, mapped.y);
    });
    ctx.endShape();
  }
  ctx.pop();
}

function drawMarker(ctx, x, y, colorValue, diameter = DISPLAY.markerDiameter) {
  ctx.push();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(2);
  ctx.fill(colorValue);
  ctx.circle(x, y, diameter);
  ctx.pop();
}
