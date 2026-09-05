/* =========================================================================
   MATERIALS-TESTING-PHYSICS.JS — SP015 8.1(a–d), 8.2(a–c).
   Pure material state and idealized teaching curves; no DOM or canvas work.
   ========================================================================= */

const PHYSICS = Object.freeze({
  centimetresToMetres: 1e-2,
  squareMillimetresToSquareMetres: 1e-6,
  gigapascalsToPascals: 1e9,
});

const LIMITS = Object.freeze({
  originalLength: Object.freeze({ min: 0.50, max: 2.00, step: 0.05, default: 1.00 }),
  area: Object.freeze({ min: 25, max: 200, step: 5, default: 100 }),
  youngModulus: Object.freeze({ min: 20, max: 250, step: 5, default: 200 }),
  targetDeltaL: Object.freeze({ min: 0.10, max: 1.25, step: 0.05, default: 0.75 }), // cm
  progress: Object.freeze({ min: 0, max: 1, step: 0.01, default: 0, stepIncrement: 0.05 }),
  playbackRate: 0.25,
  maxElasticStrain: 0.025,
});

const DISPLAY = Object.freeze({
  compactWidth: 560,
  machineWidthRatio: 0.38,
  panelGap: 12,
  graphPadding: Object.freeze({ left: 42, right: 14, top: 28, bottom: 30 }),
  compactGraphPadding: Object.freeze({ left: 36, right: 10, top: 23, bottom: 24 }),
  markerDiameter: 9,
  specimenLength: Object.freeze({ min: 108, max: 180 }),
  specimenWidth: Object.freeze({ min: 12, max: 28 }),
  maxDisplayDeformation: 24,
  labelSize: 10,
  compactLabelSize: 9,
  graphSamples: 100,
});

function assertFiniteInRange(name, value, min, max) {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(min), Math.abs(max));
  if (!Number.isFinite(value) || value < min - tolerance || value > max + tolerance) {
    throw new RangeError(`${name} must be finite and between ${min} and ${max}`);
  }
}

class ElasticSpecimen {
  constructor({
    loadingType = 'tension',
    originalLengthM = LIMITS.originalLength.default,
    areaM2 = LIMITS.area.default * PHYSICS.squareMillimetresToSquareMetres,
    youngModulusPa = LIMITS.youngModulus.default * PHYSICS.gigapascalsToPascals,
    deformationMagnitudeM = 0,
  } = {}) {
    this.setLoadingType(loadingType);
    this.setOriginalLength(originalLengthM);
    this.setArea(areaM2);
    this.setYoungModulus(youngModulusPa);
    this.setDeformationMagnitude(deformationMagnitudeM);
  }

  setLoadingType(type) {
    if (type !== 'tension' && type !== 'compression') {
      throw new RangeError('loadingType must be "tension" or "compression"');
    }
    this.loadingType = type;
  }

  setOriginalLength(valueM) {
    assertFiniteInRange('originalLengthM', valueM, LIMITS.originalLength.min, LIMITS.originalLength.max);
    this.originalLengthM = valueM;
  }

  setArea(valueM2) {
    assertFiniteInRange('areaM2', valueM2, LIMITS.area.min * PHYSICS.squareMillimetresToSquareMetres, LIMITS.area.max * PHYSICS.squareMillimetresToSquareMetres);
    this.areaM2 = valueM2;
  }

  setYoungModulus(valuePa) {
    assertFiniteInRange('youngModulusPa', valuePa, LIMITS.youngModulus.min * PHYSICS.gigapascalsToPascals, LIMITS.youngModulus.max * PHYSICS.gigapascalsToPascals);
    this.youngModulusPa = valuePa;
  }

  setDeformationMagnitude(valueM) {
    const configuredMaxM = LIMITS.targetDeltaL.max * PHYSICS.centimetresToMetres;
    assertFiniteInRange('deformationMagnitudeM', valueM, 0, configuredMaxM);
    if (valueM / this.originalLengthM > LIMITS.maxElasticStrain + Number.EPSILON) {
      throw new RangeError(`deformationMagnitudeM must keep strain at or below ${LIMITS.maxElasticStrain}`);
    }
    this.deformationMagnitudeM = valueM;
  }

  reset() {
    this.deformationMagnitudeM = 0;
  }

  get loadingSign() {
    return this.loadingType === 'tension' ? 1 : -1;
  }

  get deltaL() {
    return this.loadingSign * this.deformationMagnitudeM;
  }

  get strain() {
    return this.deltaL / this.originalLengthM; // ε = ΔL/L₀ — SP015 8.1(a)
  }

  get stress() {
    return this.youngModulusPa * this.strain; // Y = σ/ε — SP015 8.2(a)
  }

  get force() {
    return this.stress * this.areaM2; // σ = F/A — SP015 8.1(a)
  }

  get strainEnergy() {
    return 0.5 * Math.abs(this.force * this.deltaL); // U = ½FΔL — SP015 8.2(b)
  }

  get energyDensity() {
    return 0.5 * Math.abs(this.stress * this.strain); // u = ½σε — SP015 8.2(c)
  }

  sampleAtMagnitude(valueM) {
    const sample = new ElasticSpecimen({
      loadingType: this.loadingType,
      originalLengthM: this.originalLengthM,
      areaM2: this.areaM2,
      youngModulusPa: this.youngModulusPa,
      deformationMagnitudeM: valueM,
    });
    return Object.freeze({
      deltaL: sample.deltaL,
      strain: sample.strain,
      stress: sample.stress,
      force: sample.force,
      strainEnergy: sample.strainEnergy,
      energyDensity: sample.energyDensity,
    });
  }
}

const MATERIAL_CURVES = Object.freeze({
  ductile: Object.freeze([
    Object.freeze({ progress: 0.00, strain: 0.00, stress: 0.00, elongation: 0.00, force: 0.00, state: 'Unloaded' }),
    Object.freeze({ progress: 0.18, strain: 0.12, stress: 0.42, elongation: 0.12, force: 0.42, state: 'Elastic' }),
    Object.freeze({ progress: 0.26, strain: 0.22, stress: 0.46, elongation: 0.22, force: 0.46, state: 'Elastic' }),
    Object.freeze({ progress: 0.34, strain: 0.32, stress: 0.46, elongation: 0.32, force: 0.46, state: 'Yielding' }),
    Object.freeze({ progress: 0.64, strain: 0.66, stress: 0.78, elongation: 0.66, force: 0.78, state: 'Plastic' }),
    Object.freeze({ progress: 0.78, strain: 0.80, stress: 1.00, elongation: 0.80, force: 1.00, state: 'Plastic' }),
    Object.freeze({ progress: 0.94, strain: 0.95, stress: 0.72, elongation: 0.95, force: 0.72, state: 'Necking' }),
    Object.freeze({ progress: 1.00, strain: 1.00, stress: 0.56, elongation: 1.00, force: 0.56, state: 'Fractured' }),
  ]),
  brittle: Object.freeze([
    Object.freeze({ progress: 0.00, strain: 0.000, stress: 0.00, elongation: 0.000, force: 0.00, state: 'Unloaded' }),
    Object.freeze({ progress: 0.92, strain: 0.165, stress: 0.94, elongation: 0.165, force: 0.94, state: 'Elastic' }),
    Object.freeze({ progress: 1.00, strain: 0.180, stress: 0.88, elongation: 0.180, force: 0.88, state: 'Fractured' }),
  ]),
});

const CHARACTERISTIC_POINTS = Object.freeze([
  Object.freeze({ key: 'A', pointIndex: 1, meaning: 'Proportionality limit' }),
  Object.freeze({ key: 'B', pointIndex: 2, meaning: 'Elastic limit' }),
  Object.freeze({ key: 'C', pointIndex: 3, meaning: 'Yield point' }),
  Object.freeze({ key: 'D', pointIndex: 5, meaning: 'Breaking force / maximum force' }),
  Object.freeze({ key: 'E', pointIndex: 7, meaning: 'Fracture point' }),
]);

class IdealizedMaterialCurve {
  constructor(preset = 'ductile') {
    this.setPreset(preset);
  }

  setPreset(preset) {
    if (!Object.prototype.hasOwnProperty.call(MATERIAL_CURVES, preset)) {
      throw new RangeError('preset must be "ductile" or "brittle"');
    }
    this.preset = preset;
  }

  get points() {
    return MATERIAL_CURVES[this.preset];
  }

  sample(progress) {
    assertFiniteInRange('progress', progress, LIMITS.progress.min, LIMITS.progress.max);
    const points = this.points;
    if (progress === 0) return this._result(points[0]);
    if (progress === 1) return this._result(points[points.length - 1]);

    const endIndex = points.findIndex((point) => point.progress >= progress);
    const start = points[Math.max(0, endIndex - 1)];
    const end = points[endIndex];
    const amount = (progress - start.progress) / (end.progress - start.progress);
    const state = this._stateAt(progress);
    return Object.freeze({
      progress,
      strain: start.strain + (end.strain - start.strain) * amount,
      stress: start.stress + (end.stress - start.stress) * amount,
      elongation: start.strain + (end.strain - start.strain) * amount,
      force: start.stress + (end.stress - start.stress) * amount,
      state,
    });
  }

  _result(point) {
    return Object.freeze({
      progress: point.progress,
      strain: point.strain,
      stress: point.stress,
      elongation: point.strain,
      force: point.stress,
      state: point.state,
    });
  }

  _stateAt(progress) {
    if (progress === 0) return 'Unloaded';
    if (progress === 1) return 'Fractured';
    if (this.preset === 'brittle') return 'Elastic';
    if (progress <= 0.26) return 'Elastic';
    if (progress <= 0.34) return 'Yielding';
    if (progress <= 0.78) return 'Plastic';
    return 'Necking';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PHYSICS, LIMITS, DISPLAY, ElasticSpecimen, IdealizedMaterialCurve, MATERIAL_CURVES, CHARACTERISTIC_POINTS };
}
