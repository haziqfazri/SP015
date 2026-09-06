/* =========================================================================
   HEAT-CONDUCTION-RENDERER.JS — SP015 8.3(a–c).
   Stateless apparatus and graph rendering from controller snapshots.
   ========================================================================= */

function drawHeatConductionScene(ctx, frame, canvasWidth, canvasHeight) {
  ctx.background(PALETTE.panel);
  const compact = canvasWidth < DISPLAY.compactWidth;
  const apparatusHeight = canvasHeight * DISPLAY.apparatusHeightRatio;
  ctx.stroke(PALETTE.line);
  ctx.strokeWeight(1);
  ctx.line(0, apparatusHeight, canvasWidth, apparatusHeight);

  const layout = conductionLayout(canvasWidth, canvasHeight, apparatusHeight, compact);
  drawRodApparatus(ctx, frame, layout, compact);
  drawTemperatureGraph(ctx, frame, layout, compact);
}

function conductionLayout(canvasWidth, canvasHeight, apparatusHeight, compact) {
  const margin = compact ? 9 : 16;
  const reservoirWidth = compact ? DISPLAY.compactReservoirWidth : DISPLAY.reservoirWidth;
  return Object.freeze({
    margin,
    reservoirWidth,
    rodStart: margin + reservoirWidth,
    rodEnd: canvasWidth - margin - reservoirWidth,
    rodCenterY: apparatusHeight * 0.57,
    apparatusHeight,
    graphTop: apparatusHeight + DISPLAY.graphPadding.top,
    graphBottom: canvasHeight - DISPLAY.graphPadding.bottom,
    graphLeft: margin + reservoirWidth,
    graphRight: canvasWidth - margin - reservoirWidth,
  });
}

function drawRodApparatus(ctx, frame, layout, compact) {
  const maximumRodThickness = Math.max(...frame.rods.map((rod) => rodDisplayThickness(rod.areaM2)));
  const reservoirHeight = Math.max(64, maximumRodThickness + 24);
  const reservoirTop = layout.rodCenterY - reservoirHeight / 2;

  ctx.push();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(1.5);
  ctx.fill(PALETTE.orange);
  ctx.rect(layout.margin, reservoirTop, layout.reservoirWidth, reservoirHeight);
  ctx.fill(PALETTE.teal);
  ctx.rect(layout.rodEnd, reservoirTop, layout.reservoirWidth, reservoirHeight);
  ctx.pop();

  const hotLabel = compact ? 'Hot' : `${frame.hotTemperatureC.toFixed(0)} °C`;
  const coldLabel = compact ? 'Cold' : `${frame.coldTemperatureC.toFixed(0)} °C`;
  drawLabel(ctx, hotLabel, layout.margin + layout.reservoirWidth / 2, layout.rodCenterY, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    weight: 'BOLD',
  });
  drawLabel(ctx, coldLabel, layout.rodEnd + layout.reservoirWidth / 2, layout.rodCenterY, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    weight: 'BOLD',
  });

  let segmentStart = layout.rodStart;
  const totalLength = frame.rods.reduce((sum, rod) => sum + rod.lengthM, 0);
  const segmentGeometries = [];
  frame.rods.forEach((rod, index) => {
    const segmentWidth = (rod.lengthM / totalLength) * (layout.rodEnd - layout.rodStart);
    const thickness = rodDisplayThickness(rod.areaM2);
    const geometry = Object.freeze({ start: segmentStart, end: segmentStart + segmentWidth, width: segmentWidth, thickness, rod });
    segmentGeometries.push(geometry);
    drawRodSegment(ctx, segmentStart, layout.rodCenterY, segmentWidth, thickness, index, frame.rods.length);
    drawLabel(ctx, `Rod ${rod.key}`, segmentStart + segmentWidth / 2, layout.rodCenterY + thickness / 2 + 15, {
      fill: PALETTE.mutedRGB,
      size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
      weight: 'BOLD',
    });
    segmentStart += segmentWidth;
  });

  segmentGeometries.forEach((segment) => {
    if (segment.rod.insulated) {
      drawInsulationJacket(ctx, segment, layout.rodCenterY);
    } else {
      drawSideLossArrows(ctx, segment, layout.rodCenterY);
    }
  });

  if (segmentGeometries.some((segment) => !segment.rod.insulated)) {
    drawLabel(ctx, compact ? 'Side loss' : 'ENERGY LOST TO SURROUNDINGS', compact ? (layout.rodStart + layout.rodEnd) / 2 : layout.rodEnd, 18, {
      fill: PALETTE.accentRGB,
      size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
      weight: 'BOLD',
      align: compact ? ['CENTER', 'CENTER'] : ['RIGHT', 'CENTER'],
    });
  }

  drawArrowCtx(ctx, layout.rodStart + 12, layout.rodCenterY - maximumRodThickness / 2 - 18, layout.rodEnd - 12, layout.rodCenterY - maximumRodThickness / 2 - 18, PALETTE.ink, 2, 7);
  if (!compact) {
    drawLabel(ctx, 'heat flow', (layout.rodStart + layout.rodEnd) / 2, layout.rodCenterY - maximumRodThickness / 2 - 31, {
      fill: PALETTE.inkRGB,
      size: DISPLAY.labelSize,
      weight: 'BOLD',
    });
  }
  drawHeatTracers(ctx, frame, layout);
  drawEscapingTracers(ctx, frame, segmentGeometries, layout.rodCenterY);

  if (frame.interfacePosition !== null) {
    const interfaceX = mapNormalizedX(frame.interfacePosition, layout);
    ctx.stroke(PALETTE.ink);
    ctx.strokeWeight(2);
    ctx.line(interfaceX, layout.rodCenterY - maximumRodThickness / 2 - 7, interfaceX, layout.rodCenterY + maximumRodThickness / 2 + 7);
  }
}

function rodDisplayThickness(areaM2) {
  const areaCm2 = areaM2 / PHYSICS.squareCentimetresToSquareMetres;
  const fraction = (areaCm2 - LIMITS.area.min) / (LIMITS.area.max - LIMITS.area.min);
  return 26 + fraction * 22;
}

function drawRodSegment(ctx, x, centerY, width, height, index, count) {
  const stripeCount = Math.max(8, Math.ceil(width / 7));
  for (let stripe = 0; stripe < stripeCount; stripe += 1) {
    const localStart = stripe / stripeCount;
    const globalFraction = (index + localStart) / count;
    ctx.noStroke();
    ctx.fill(ctx.lerpColor(ctx.color(PALETTE.orange), ctx.color(PALETTE.teal), globalFraction));
    ctx.rect(x + localStart * width, centerY - height / 2, width / stripeCount + 1, height);
  }
  ctx.noFill();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(1.5);
  ctx.rect(x, centerY - height / 2, width, height);
}

function drawInsulationJacket(ctx, segment, centerY) {
  ctx.push();
  ctx.noFill();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(1);
  ctx.drawingContext.setLineDash([5, 4]);
  ctx.rect(segment.start - 3, centerY - segment.thickness / 2 - 7, segment.width + 6, segment.thickness + 14);
  ctx.drawingContext.setLineDash([]);
  ctx.pop();
}

function drawSideLossArrows(ctx, segment, centerY) {
  const arrowCount = segment.width < 100 ? 2 : 3;
  for (let index = 1; index <= arrowCount; index += 1) {
    const x = segment.start + (index / (arrowCount + 1)) * segment.width;
    drawArrowCtx(ctx, x, centerY - segment.thickness / 2 - 2, x, centerY - segment.thickness / 2 - 23, PALETTE.orange, 2, 6);
    drawArrowCtx(ctx, x, centerY + segment.thickness / 2 + 2, x, centerY + segment.thickness / 2 + 23, PALETTE.orange, 2, 6);
  }
}

function drawHeatTracers(ctx, frame, layout) {
  for (let index = 0; index < DISPLAY.tracerCount; index += 1) {
    const progress = (frame.tracerPhase + index / DISPLAY.tracerCount) % 1;
    const x = mapNormalizedX(progress, layout);
    ctx.noStroke();
    ctx.fill(PALETTE.acid);
    ctx.circle(x, layout.rodCenterY, DISPLAY.tracerDiameter);
    ctx.noFill();
    ctx.stroke(PALETTE.ink);
    ctx.strokeWeight(1);
    ctx.circle(x, layout.rodCenterY, DISPLAY.tracerDiameter);
  }
}

function drawEscapingTracers(ctx, frame, segments, centerY) {
  segments.filter((segment) => !segment.rod.insulated).forEach((segment, segmentIndex) => {
    for (let tracerIndex = 0; tracerIndex < DISPLAY.escapingTracerCount; tracerIndex += 1) {
      const progress = (frame.tracerPhase * 1.8 + tracerIndex / DISPLAY.escapingTracerCount + segmentIndex * 0.37) % 1;
      const direction = tracerIndex % 2 === 0 ? -1 : 1;
      const x = segment.start + segment.width * (0.34 + tracerIndex * 0.16);
      const y = centerY + direction * (segment.thickness / 2 + 4 + progress * 22);
      ctx.noStroke();
      ctx.fill(PALETTE.acid);
      ctx.circle(x, y, DISPLAY.tracerDiameter);
      ctx.noFill();
      ctx.stroke(PALETTE.ink);
      ctx.strokeWeight(1);
      ctx.circle(x, y, DISPLAY.tracerDiameter);
    }
  });
}

function drawTemperatureGraph(ctx, frame, layout, compact) {
  const left = layout.graphLeft;
  const right = layout.graphRight;
  const top = layout.graphTop;
  const bottom = layout.graphBottom;

  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(1.5);
  ctx.line(left, top, left, bottom);
  ctx.line(left, bottom, right, bottom);
  drawLabel(ctx, 'T', left - 17, top - 3, { fill: PALETTE.inkRGB, size: 11, weight: 'BOLD' });
  drawLabel(ctx, compact ? 'x' : 'distance, x', right, bottom + 22, {
    fill: PALETTE.inkRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    weight: 'BOLD',
    align: ['RIGHT', 'CENTER'],
  });
  drawDistanceTicks(ctx, frame, layout, bottom, compact);

  [0.25, 0.5, 0.75].forEach((level) => {
    drawDashedGuide(ctx, left, mapNormalizedTemperature(level, top, bottom), right, mapNormalizedTemperature(level, top, bottom), PALETTE.line, 1, [3, 5]);
  });

  drawLabel(ctx, `${frame.hotTemperatureC.toFixed(0)} °C`, left - 5, top, {
    fill: PALETTE.accentRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    align: ['RIGHT', 'CENTER'],
  });
  drawLabel(ctx, `${frame.coldTemperatureC.toFixed(0)} °C`, left - 5, bottom, {
    fill: PALETTE.tealRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    align: ['RIGHT', 'CENTER'],
  });

  if (frame.mode === 'nonInsulated') {
    ctx.stroke(referenceGraphColor());
    ctx.strokeWeight(2);
    drawDashedCurve(ctx, (index) => {
      const point = frame.referenceGraphPoints[index];
      return {
        x: mapNormalizedX(point.position, layout),
        y: mapNormalizedTemperature(point.temperature, top, bottom),
      };
    }, frame.referenceGraphPoints.length - 1, [6, 5]);
  }

  drawSelectedGraph(ctx, frame, layout, top, bottom);

  drawGraphLegend(ctx, frame, left, right, top, compact);

  if (frame.interfacePosition !== null) {
    const interfaceX = mapNormalizedX(frame.interfacePosition, layout);
    const interfacePoint = frame.graphPoints.reduce((closest, point) => (
      Math.abs(point.position - frame.interfacePosition) < Math.abs(closest.position - frame.interfacePosition) ? point : closest
    ));
    const interfaceY = mapNormalizedTemperature(interfacePoint.temperature, top, bottom);
    drawDashedGuide(ctx, interfaceX, layout.rodCenterY + DISPLAY.rodHeight, interfaceX, bottom, PALETTE.muted, 1, [4, 4]);
    ctx.noStroke();
    ctx.fill(PALETTE.acid);
    ctx.circle(interfaceX, interfaceY, 9);
    ctx.noFill();
    ctx.stroke(PALETTE.ink);
    ctx.circle(interfaceX, interfaceY, 9);
    const interfaceLabel = frame.mode === 'insulated'
      ? `${frame.interfaceTemperatureC.toFixed(1)} °C`
      : 'Tᵢ · schematic';
    drawLabel(ctx, interfaceLabel, interfaceX, interfaceY - 14, {
      fill: PALETTE.inkRGB,
      size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
      weight: 'BOLD',
    });
  }
}

function drawDistanceTicks(ctx, frame, layout, bottom, compact) {
  distanceTickLabels(frame).forEach(({ position, label }) => {
    const x = mapNormalizedX(position, layout);
    ctx.stroke(PALETTE.ink);
    ctx.strokeWeight(1);
    ctx.line(x, bottom, x, bottom + 5);
    drawLabel(ctx, label, x, bottom + 11, {
      fill: PALETTE.mutedRGB,
      size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
      align: ['CENTER', 'CENTER'],
    });
  });
}

function distanceTickLabels(frame) {
  const ticks = [
    { position: 0, label: '0 m' },
    { position: 1, label: `${frame.totalLengthM.toFixed(2)} m` },
  ];
  if (frame.rods.length === 2) {
    ticks.splice(1, 0, {
      position: frame.interfacePosition,
      label: `${(frame.interfacePosition * frame.totalLengthM).toFixed(2)} m`,
    });
  }
  return ticks;
}

function drawSelectedGraph(ctx, frame, layout, top, bottom) {
  const segments = frame.rods.length === 2
    ? [
      frame.graphPoints.filter((point) => point.position <= frame.interfacePosition),
      frame.graphPoints.filter((point) => point.position >= frame.interfacePosition),
    ]
    : [frame.graphPoints];

  segments.forEach((points, segmentIndex) => {
    if (points.length < 2) return;
    ctx.push();
    ctx.noFill();
    ctx.stroke(graphSegmentColor(frame, segmentIndex));
    ctx.strokeWeight(3);
    ctx.beginShape();
    points.forEach((point) => {
      ctx.vertex(mapNormalizedX(point.position, layout), mapNormalizedTemperature(point.temperature, top, bottom));
    });
    ctx.endShape();
    ctx.pop();
  });
}

function graphSegmentColor(frame, segmentIndex) {
  if (frame.rods.length !== 2) return PALETTE.orange;
  return segmentIndex === 0 ? PALETTE.orange : PALETTE.teal;
}

function referenceGraphColor() {
  return PALETTE.path;
}

function drawGraphLegend(ctx, frame, left, right, top, compact) {
  if (frame.mode === 'insulated') {
    drawLabel(ctx, frame.rods.length === 2 ? 'piecewise linear · steady' : 'linear · steady', right, top - 14, {
      fill: PALETTE.mutedRGB,
      size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
      align: ['RIGHT', 'CENTER'],
    });
    return;
  }
  drawLabel(ctx, compact ? 'solid: loss · dashed: insulated' : 'solid: side loss · dashed: insulated', right, top - 14, {
    fill: PALETTE.mutedRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    align: ['RIGHT', 'CENTER'],
  });
  drawLabel(ctx, 'SCHEMATIC', left + 4, top - 14, {
    fill: PALETTE.accentRGB,
    size: compact ? DISPLAY.compactLabelSize : DISPLAY.labelSize,
    weight: 'BOLD',
    align: ['LEFT', 'CENTER'],
  });
}

function mapNormalizedX(value, layout) {
  return layout.graphLeft + value * (layout.graphRight - layout.graphLeft);
}

function mapNormalizedTemperature(value, top, bottom) {
  return bottom - value * (bottom - top);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { graphSegmentColor, referenceGraphColor, distanceTickLabels };
}
