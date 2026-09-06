/* =========================================================================
   THERMAL-EXPANSION-PHYSICS.JS — SP015 8.4(a–b).
   Pure first-order thermal-expansion state; no DOM or canvas work.
   ========================================================================= */

const EXPANSION_MODES = Object.freeze(['linear', 'area', 'volume', 'liquid-container']);

const PHYSICS = Object.freeze({
  litresToCubicMetres: 1e-3,
  cubicMetresToLitres: 1e3,
  cubicMetresToMillilitres: 1e6,
  microCoefficient: 1e-6,
  milliCoefficient: 1e-3,
});

const LIMITS = Object.freeze({
  targetDeltaT: Object.freeze({ min: -50, max: 150, step: 1, default: 50 }),
  linearLength: Object.freeze({ min: 0.50, max: 5.00, step: 0.05, default: 1.00 }),
  area: Object.freeze({ min: 0.25, max: 4.00, step: 0.05, default: 1.00 }),
  volume: Object.freeze({ min: 0.10, max: 2.00, step: 0.05, default: 1.00 }),
  alphaMicro: Object.freeze({ min: 5, max: 30, step: 1, default: 12 }),
  containerCapacityLitres: Object.freeze({ min: 0.50, max: 2.00, step: 0.05, default: 1.00 }),
  fillPercent: Object.freeze({ min: 50, max: 100, step: 1, default: 100 }),
  liquidGammaMilli: Object.freeze({ min: 0.20, max: 1.20, step: 0.05, default: 0.80 }),
  progress: Object.freeze({ min: 0, max: 1, default: 0, stepIncrement: 0.10 }),
  playbackRate: 0.25,
});

const DISPLAY = Object.freeze({
  compactWidth: 560,
  wideApparatusRatio: 0.72,
  padding: 24,
  panelGap: 18,
  exaggeration: 12,
  minimumDisplayScale: 0.78,
  maximumDisplayScale: 1.24,
  labelSize: 11,
  compactLabelSize: 9,
});

function assertFiniteInRange(name, value, min, max) {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(min), Math.abs(max));
  if (!Number.isFinite(value) || value < min - tolerance || value > max + tolerance) {
    throw new RangeError(`${name} must be finite and between ${min} and ${max}`);
  }
}

class ThermalExpansionState {
  constructor({
    mode = 'linear',
    linearLengthM = LIMITS.linearLength.default,
    areaM2 = LIMITS.area.default,
    volumeM3 = LIMITS.volume.default,
    alphaPerK = LIMITS.alphaMicro.default * PHYSICS.microCoefficient,
    deltaTK = 0,
    containerCapacityM3 = LIMITS.containerCapacityLitres.default * PHYSICS.litresToCubicMetres,
    fillFraction = LIMITS.fillPercent.default / 100,
    liquidGammaPerK = LIMITS.liquidGammaMilli.default * PHYSICS.milliCoefficient,
  } = {}) {
    this.setMode(mode);
    this.setLinearLength(linearLengthM);
    this.setArea(areaM2);
    this.setVolume(volumeM3);
    this.setAlpha(alphaPerK);
    this.setContainerCapacity(containerCapacityM3);
    this.setFillFraction(fillFraction);
    this.setLiquidGamma(liquidGammaPerK);
    this.setDeltaT(deltaTK);
  }

  setMode(mode) {
    if (!EXPANSION_MODES.includes(mode)) throw new RangeError('Unknown thermal-expansion mode');
    this.mode = mode;
  }

  setLinearLength(valueM) {
    assertFiniteInRange('linearLengthM', valueM, LIMITS.linearLength.min, LIMITS.linearLength.max);
    this.linearLengthM = valueM;
  }

  setArea(valueM2) {
    assertFiniteInRange('areaM2', valueM2, LIMITS.area.min, LIMITS.area.max);
    this.areaM2 = valueM2;
  }

  setVolume(valueM3) {
    assertFiniteInRange('volumeM3', valueM3, LIMITS.volume.min, LIMITS.volume.max);
    this.volumeM3 = valueM3;
  }

  setAlpha(valuePerK) {
    assertFiniteInRange(
      'alphaPerK',
      valuePerK,
      LIMITS.alphaMicro.min * PHYSICS.microCoefficient,
      LIMITS.alphaMicro.max * PHYSICS.microCoefficient,
    );
    this.alphaPerK = valuePerK;
  }

  setDeltaT(valueK) {
    assertFiniteInRange('deltaTK', valueK, LIMITS.targetDeltaT.min, LIMITS.targetDeltaT.max);
    this.deltaTK = Object.is(valueK, -0) ? 0 : valueK;
    if (this.finalLengthM <= 0 || this.finalAreaM2 <= 0 || this.finalVolumeM3 <= 0
      || this.finalContainerCapacityM3 <= 0 || this.finalLiquidVolumeM3 <= 0) {
      throw new RangeError('Temperature change produces a non-positive final dimension');
    }
  }

  setContainerCapacity(valueM3) {
    assertFiniteInRange(
      'containerCapacityM3',
      valueM3,
      LIMITS.containerCapacityLitres.min * PHYSICS.litresToCubicMetres,
      LIMITS.containerCapacityLitres.max * PHYSICS.litresToCubicMetres,
    );
    this.containerCapacityM3 = valueM3;
  }

  setFillFraction(value) {
    assertFiniteInRange('fillFraction', value, LIMITS.fillPercent.min / 100, LIMITS.fillPercent.max / 100);
    this.fillFraction = value;
  }

  setLiquidGamma(valuePerK) {
    assertFiniteInRange(
      'liquidGammaPerK',
      valuePerK,
      LIMITS.liquidGammaMilli.min * PHYSICS.milliCoefficient,
      LIMITS.liquidGammaMilli.max * PHYSICS.milliCoefficient,
    );
    this.liquidGammaPerK = valuePerK;
  }

  get betaPerK() {
    // β = 2α — SP015 8.4(a–b), first-order isotropic expansion.
    return 2 * this.alphaPerK;
  }

  get gammaPerK() {
    // γ = 3α — SP015 8.4(a–b), first-order isotropic expansion.
    return 3 * this.alphaPerK;
  }

  get deltaLengthM() {
    // ΔL = αL₀ΔT — SP015 8.4(b).
    return this.alphaPerK * this.linearLengthM * this.deltaTK;
  }

  get finalLengthM() {
    return this.linearLengthM + this.deltaLengthM;
  }

  get deltaAreaM2() {
    // ΔA = βA₀ΔT — SP015 8.4(b).
    return this.betaPerK * this.areaM2 * this.deltaTK;
  }

  get finalAreaM2() {
    return this.areaM2 + this.deltaAreaM2;
  }

  get deltaVolumeM3() {
    // ΔV = γV₀ΔT — SP015 8.4(b).
    return this.gammaPerK * this.volumeM3 * this.deltaTK;
  }

  get finalVolumeM3() {
    return this.volumeM3 + this.deltaVolumeM3;
  }

  get initialLiquidVolumeM3() {
    return this.containerCapacityM3 * this.fillFraction;
  }

  get deltaContainerCapacityM3() {
    return this.gammaPerK * this.containerCapacityM3 * this.deltaTK;
  }

  get finalContainerCapacityM3() {
    return this.containerCapacityM3 + this.deltaContainerCapacityM3;
  }

  get deltaLiquidVolumeM3() {
    return this.liquidGammaPerK * this.initialLiquidVolumeM3 * this.deltaTK;
  }

  get finalLiquidVolumeM3() {
    return this.initialLiquidVolumeM3 + this.deltaLiquidVolumeM3;
  }

  get apparentGammaPerK() {
    return this.liquidGammaPerK - this.gammaPerK;
  }

  get apparentExpansionM3() {
    // ΔV_app = Vₗ₀(γ_liquid − γ_container)ΔT — SP015 8.4(b).
    return this.initialLiquidVolumeM3 * this.apparentGammaPerK * this.deltaTK;
  }

  get overflowM3() {
    return Math.max(0, this.finalLiquidVolumeM3 - this.finalContainerCapacityM3);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EXPANSION_MODES, PHYSICS, LIMITS, DISPLAY, ThermalExpansionState };
}
