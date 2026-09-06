/* =========================================================================
   THERMAL-EXPANSION-RENDERER.JS — SP015 8.4(a–b).
   Stateless drawing functions receiving an explicit p5 context and snapshot.
   ========================================================================= */

const CONTAINER_CAPACITY_RANGE = Object.freeze({
  min: LIMITS.containerCapacityLitres.min * PHYSICS.litresToCubicMetres,
  max: LIMITS.containerCapacityLitres.max * PHYSICS.litresToCubicMetres,
});

function clampDisplayScale(geometryRatio) {
  return Math.min(
    DISPLAY.maximumDisplayScale,
    Math.max(DISPLAY.minimumDisplayScale, 1 + (geometryRatio - 1) * DISPLAY.exaggeration),
  );
}

function normalizedDimension(value, config) {
  return (value - config.min) / (config.max - config.min);
}

function drawThermalExpansionScene(ctx, snapshot, canvasWidth, canvasHeight) {
  ctx.background(PALETTE.panel);
  const compact = canvasWidth < DISPLAY.compactWidth;
  const padding = compact ? 16 : DISPLAY.padding;
  const magnifierHeight = compact ? 86 : canvasHeight - padding * 2;
  const apparatus = compact
    ? { x: padding, y: 42, width: canvasWidth - padding * 2, height: canvasHeight - magnifierHeight - 64 }
    : { x: padding, y: 42, width: canvasWidth * DISPLAY.wideApparatusRatio - padding, height: canvasHeight - 66 };
  const magnifier = compact
    ? { x: padding, y: canvasHeight - magnifierHeight - 10, width: canvasWidth - padding * 2, height: magnifierHeight }
    : { x: apparatus.x + apparatus.width + DISPLAY.panelGap, y: padding, width: canvasWidth - apparatus.width - DISPLAY.panelGap - padding * 2, height: magnifierHeight };

  if (snapshot.mode === 'linear') drawLinearMode(ctx, snapshot, apparatus);
  else if (snapshot.mode === 'area') drawAreaMode(ctx, snapshot, apparatus);
  else if (snapshot.mode === 'volume') drawVolumeMode(ctx, snapshot, apparatus);
  else drawLiquidMode(ctx, snapshot, apparatus, compact);
  drawMagnifier(ctx, snapshot, magnifier, compact);
}

function drawLinearMode(ctx, snapshot, box) {
  const centerY = box.y + box.height * 0.52;
  const startX = box.x + box.width * 0.12;
  const initialScale = 0.48 + 0.28 * normalizedDimension(snapshot.initial, LIMITS.linearLength);
  const originalWidth = box.width * initialScale;
  const finalWidth = originalWidth * clampDisplayScale(snapshot.geometryRatio);
  drawFixedSupport(ctx, startX, centerY);
  drawDashedGuide(ctx, startX, centerY - 15, startX + originalWidth, centerY - 15, PALETTE.teal, 2, [6, 5]);
  ctx.push();
  ctx.noStroke();
  ctx.fill(PALETTE.orange);
  ctx.rect(startX, centerY - 10, finalWidth, 20);
  ctx.pop();
  drawDimension(ctx, startX, startX + originalWidth, centerY + 42, 'L₀', PALETTE.teal);
  drawDimension(ctx, startX, startX + finalWidth, centerY + 70, 'L', PALETTE.orange);
  drawLabel(ctx, snapshot.direction.toUpperCase(), startX + originalWidth / 2, centerY - 44, { fill: PALETTE.inkRGB, size: 10 });
}

function drawAreaMode(ctx, snapshot, box) {
  const initialScale = 0.72 + 0.28 * normalizedDimension(snapshot.initial, LIMITS.area);
  const originalW = Math.min(box.width * 0.56 * initialScale, 250);
  const originalH = Math.min(box.height * 0.52 * initialScale, 138);
  const scale = clampDisplayScale(snapshot.geometryRatio);
  const cx = box.x + box.width * 0.49;
  const cy = box.y + box.height * 0.48;
  drawDashedRect(ctx, cx - originalW / 2, cy - originalH / 2, originalW, originalH, PALETTE.teal);
  ctx.push();
  ctx.noFill();
  ctx.stroke(PALETTE.orange);
  ctx.strokeWeight(3);
  ctx.rect(cx - originalW * scale / 2, cy - originalH * scale / 2, originalW * scale, originalH * scale);
  ctx.pop();
  drawDimension(ctx, cx - originalW * scale / 2, cx + originalW * scale / 2, cy + originalH * scale / 2 + 30, 'both axes change', PALETTE.orange);
}

function drawVolumeMode(ctx, snapshot, box) {
  const scale = clampDisplayScale(snapshot.geometryRatio);
  const cx = box.x + box.width * 0.48;
  const cy = box.y + box.height * 0.53;
  const initialScale = 0.72 + 0.28 * normalizedDimension(snapshot.initial, LIMITS.volume);
  const baseW = Math.min(box.width * 0.48 * initialScale, 210);
  const baseH = Math.min(box.height * 0.38 * initialScale, 105);
  drawIsometricBox(ctx, cx, cy, baseW, baseH, PALETTE.teal, true);
  drawIsometricBox(ctx, cx, cy, baseW * scale, baseH * scale, PALETTE.orange, false);
  drawLabel(ctx, 'length × width × height', cx, cy + baseH * Math.max(1, scale) / 2 + 52, { fill: PALETTE.inkRGB, size: 10 });
}

function drawLiquidMode(ctx, snapshot, box, compact) {
  const capacityScale = 0.78 + 0.22 * normalizedDimension(
    snapshot.containerCapacityM3,
    CONTAINER_CAPACITY_RANGE,
  );
  const vesselWidth = Math.min((compact ? box.width * 0.25 : box.width * 0.24) * capacityScale, 96);
  const vesselHeight = Math.min(box.height * 0.64 * capacityScale, 180);
  const leftCx = box.x + box.width * 0.28;
  const rightCx = box.x + box.width * 0.72;
  const baseY = box.y + box.height * 0.78;
  drawVessel(ctx, leftCx, baseY, vesselWidth, vesselHeight, snapshot.fillFraction, false, false, compact);
  const containerRatio = Math.cbrt(snapshot.finalContainerCapacityM3 / snapshot.containerCapacityM3);
  const finalScale = clampDisplayScale(containerRatio);
  const displayedFill = Math.min(1, snapshot.finalLiquidVolumeM3 / snapshot.finalContainerCapacityM3);
  drawVessel(ctx, rightCx, baseY, vesselWidth * finalScale, vesselHeight * finalScale, displayedFill, true, snapshot.overflowM3 > 0, compact);
  drawLabel(ctx, 'INITIAL', leftCx, baseY + 27, { fill: PALETTE.mutedRGB, size: 9 });
  drawLabel(ctx, snapshot.deltaT === 0 ? 'REFERENCE' : 'APPLIED', rightCx, baseY + 27, { fill: PALETTE.mutedRGB, size: 9 });
  drawArrowCtx(ctx, leftCx + vesselWidth * 0.72, baseY - vesselHeight * 0.52, rightCx - vesselWidth * 0.72, baseY - vesselHeight * 0.52, snapshot.deltaT < 0 ? PALETTE.teal : PALETTE.orange, 2, 7);
}

function drawVessel(ctx, cx, baseY, width, height, fillFraction, applied, overflowing, compact = false) {
  const left = cx - width / 2;
  const top = baseY - height;
  const wallColor = applied ? PALETTE.orange : PALETTE.ink;
  const innerPad = Math.max(5, width * 0.08);
  const liquidHeight = (height - innerPad * 2) * Math.min(1, Math.max(0, fillFraction));
  ctx.push();
  ctx.noStroke();
  ctx.fill(PALETTE.teal);
  ctx.rect(left + innerPad, baseY - innerPad - liquidHeight, width - innerPad * 2, liquidHeight);
  ctx.noFill();
  ctx.stroke(wallColor);
  ctx.strokeWeight(3);
  ctx.line(left, top, left, baseY);
  ctx.line(left, baseY, left + width, baseY);
  ctx.line(left + width, baseY, left + width, top);
  ctx.stroke(PALETTE.path);
  ctx.strokeWeight(1);
  ctx.line(left - 5, top, left + width + 5, top);
  ctx.pop();
  drawLabel(ctx, 'capacity', left + width + 7, top, { fill: PALETTE.mutedRGB, size: 8, align: ['LEFT', 'CENTER'] });
  if (overflowing) {
    drawOverflowSpill(ctx, { left, top, width, height, baseY, compact });
  }
}

function drawOverflowSpill(ctx, { left, top, width, height, baseY, compact = false }) {
  const rimX = left + width * 0.72;
  const streamWidth = Math.min(7, Math.max(4, width * 0.075));
  const outsideX = left + width + Math.min(18, width * 0.18);
  const streamBottomY = top + Math.min(height * 0.42, 76);
  const streamStartY = top + 2;

  // A filled ribbon reads as liquid spilling over the rim, unlike the former bent stroke.
  ctx.push();
  ctx.noStroke();
  ctx.fill(PALETTE.teal);
  ctx.beginShape();
  ctx.vertex(rimX - streamWidth / 2, streamStartY);
  ctx.bezierVertex(rimX + 4, streamStartY + 1, outsideX - 2, top + 7, outsideX, top + 16);
  ctx.bezierVertex(outsideX + 2, top + 30, outsideX - 2, streamBottomY - 10, outsideX - streamWidth * 0.35, streamBottomY);
  ctx.vertex(outsideX - streamWidth * 1.15, streamBottomY);
  ctx.bezierVertex(outsideX - streamWidth * 0.4, streamBottomY - 11, outsideX - streamWidth * 0.8, top + 31, outsideX - streamWidth * 1.05, top + 18);
  ctx.bezierVertex(outsideX - streamWidth * 1.25, top + 10, rimX - streamWidth / 2, streamStartY + 6, rimX - streamWidth / 2, streamStartY);
  ctx.endShape(ctx.CLOSE);
  ctx.circle(outsideX - streamWidth * 0.75, streamBottomY + 9, streamWidth * 0.85);
  ctx.circle(outsideX - streamWidth * 0.15, streamBottomY + 22, streamWidth * 0.58);
  ctx.pop();

  const calloutX = compact ? left + width * 0.5 : outsideX + 25;
  const calloutY = compact ? Math.min(baseY + 40, top + height - 8) : top + 47;
  ctx.push();
  ctx.stroke(PALETTE.path);
  ctx.strokeWeight(1);
  ctx.line(outsideX, top + 22, calloutX, calloutY - 7);
  ctx.pop();
  drawLabel(ctx, 'overflow', calloutX, calloutY, {
    fill: PALETTE.inkRGB,
    size: 8,
    align: compact ? ['CENTER', 'CENTER'] : ['LEFT', 'CENTER'],
  });
}

function drawMagnifier(ctx, snapshot, box, compact) {
  ctx.push();
  ctx.noFill();
  ctx.stroke(PALETTE.line);
  ctx.strokeWeight(1);
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.pop();
  const titleY = box.y + (compact ? 15 : 28);
  drawLabel(ctx, 'MEASURED CHANGE', box.x + 12, titleY, { fill: PALETTE.mutedRGB, size: 9, align: ['LEFT', 'CENTER'] });
  drawLabel(ctx, formatSnapshotChange(snapshot), box.x + box.width / 2, box.y + box.height * (compact ? 0.52 : 0.43), {
    fill: PALETTE.inkRGB,
    size: compact ? 15 : 18,
    weight: 'BOLD',
  });
  drawLabel(ctx, `${signedFixed(snapshot.deltaT, 1)} K`, box.x + box.width / 2, box.y + box.height * (compact ? 0.76 : 0.58), { fill: PALETTE.orangeRGB, size: 12, weight: 'BOLD' });
  if (!compact) {
    drawDashedGuide(ctx, box.x + 14, box.y + box.height * 0.68, box.x + box.width - 14, box.y + box.height * 0.68, PALETTE.line, 1, [4, 4]);
    drawLabel(ctx, 'drawing exaggerated', box.x + box.width / 2, box.y + box.height * 0.78, { fill: PALETTE.mutedRGB, size: 9 });
    drawLabel(ctx, 'number calculated', box.x + box.width / 2, box.y + box.height * 0.86, { fill: PALETTE.mutedRGB, size: 9 });
  }
}

function formatSnapshotChange(snapshot) {
  if (snapshot.mode === 'linear') return `${signedFixed(snapshot.change * 1e3, 3)} mm`;
  if (snapshot.mode === 'area') return `${signedFixed(snapshot.change * 1e4, 3)} cm²`;
  if (snapshot.mode === 'volume') return `${signedFixed(snapshot.change * PHYSICS.cubicMetresToLitres, 3)} L`;
  return `${signedFixed((snapshot.finalLiquidVolumeM3 - snapshot.initialLiquidVolumeM3) * PHYSICS.cubicMetresToMillilitres, 2)} mL`;
}

function drawFixedSupport(ctx, x, centerY) {
  ctx.push();
  ctx.stroke(PALETTE.ink);
  ctx.strokeWeight(3);
  ctx.line(x, centerY - 30, x, centerY + 30);
  for (let offset = -28; offset <= 24; offset += 10) ctx.line(x - 10, centerY + offset + 7, x, centerY + offset);
  ctx.pop();
}

function drawDimension(ctx, x0, x1, y, label, colorValue) {
  drawArrowCtx(ctx, (x0 + x1) / 2 - 3, y, x0, y, colorValue, 1.5, 5);
  drawArrowCtx(ctx, (x0 + x1) / 2 + 3, y, x1, y, colorValue, 1.5, 5);
  drawLabel(ctx, label, (x0 + x1) / 2, y - 10, { fill: colorValue === PALETTE.orange ? PALETTE.orangeRGB : PALETTE.tealRGB, size: 9 });
}

function drawDashedRect(ctx, x, y, width, height, colorValue) {
  ctx.push();
  ctx.noFill();
  ctx.stroke(colorValue);
  ctx.strokeWeight(2);
  ctx.drawingContext.setLineDash([7, 5]);
  ctx.rect(x, y, width, height);
  ctx.drawingContext.setLineDash([]);
  ctx.pop();
}

function drawIsometricBox(ctx, cx, cy, width, height, colorValue, dashed) {
  const depth = width * 0.22;
  const left = cx - width / 2;
  const right = cx + width / 2;
  const top = cy - height / 2;
  const bottom = cy + height / 2;
  ctx.push();
  ctx.noFill();
  ctx.stroke(colorValue);
  ctx.strokeWeight(dashed ? 2 : 3);
  ctx.drawingContext.setLineDash(dashed ? [7, 5] : []);
  ctx.rect(left, top, width, height);
  ctx.line(left, top, left + depth, top - depth * 0.55);
  ctx.line(right, top, right + depth, top - depth * 0.55);
  ctx.line(right, bottom, right + depth, bottom - depth * 0.55);
  ctx.line(left + depth, top - depth * 0.55, right + depth, top - depth * 0.55);
  ctx.line(right + depth, top - depth * 0.55, right + depth, bottom - depth * 0.55);
  ctx.line(right, bottom, right + depth, bottom - depth * 0.55);
  ctx.drawingContext.setLineDash([]);
  ctx.pop();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampDisplayScale, normalizedDimension, formatSnapshotChange, drawOverflowSpill, drawThermalExpansionScene };
}
