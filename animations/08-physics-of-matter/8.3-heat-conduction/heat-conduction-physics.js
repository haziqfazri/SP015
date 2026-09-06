/* =========================================================================
   HEAT-CONDUCTION-PHYSICS.JS — SP015 8.3(a–c).
   Pure steady-state conduction models; no DOM or canvas work.
   ========================================================================= */

const PHYSICS = Object.freeze({
  celsiusZeroKelvin: 273.15,
  squareCentimetresToSquareMetres: 1e-4,
});

const LIMITS = Object.freeze({
  hotTemperature: Object.freeze({ min: 20, max: 150, step: 1, default: 100 }),
  coldTemperature: Object.freeze({ min: 0, max: 100, step: 1, default: 20 }),
  rodLength: Object.freeze({ min: 0.20, max: 1.00, step: 0.05, default: 0.50 }),
  area: Object.freeze({ min: 1, max: 10, step: 0.5, default: 4 }),
  conductivityA: Object.freeze({ min: 10, max: 400, step: 10, default: 200 }),
  conductivityB: Object.freeze({ min: 10, max: 400, step: 10, default: 50 }),
  rodCount: Object.freeze({ min: 1, max: 2 }),
  tracer: Object.freeze({ speed: 0.28, stepIncrement: 0.08 }),
});

const DISPLAY = Object.freeze({
  compactWidth: 560,
  apparatusHeightRatio: 0.45,
  reservoirWidth: 48,
  compactReservoirWidth: 36,
  rodHeight: 42,
  graphPadding: Object.freeze({ left: 48, right: 18, top: 28, bottom: 34 }),
  tracerCount: 6,
  escapingTracerCount: 3,
  tracerDiameter: 7,
  graphSamples: 80,
  labelSize: 10,
  compactLabelSize: 9,
});

const EXPOSURE_PATTERNS = Object.freeze(['bothExposed', 'aInsulated', 'bInsulated']);
const QUALITATIVE_PROFILE = Object.freeze({ exponentAtLowConductivity: 1.80, exponentAtHighConductivity: 1.05 });

function celsiusToKelvin(valueCelsius) {
  return valueCelsius + PHYSICS.celsiusZeroKelvin;
}

function kelvinToCelsius(valueKelvin) {
  return valueKelvin - PHYSICS.celsiusZeroKelvin;
}

function assertFiniteInRange(name, value, min, max) {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(min), Math.abs(max));
  if (!Number.isFinite(value) || value < min - tolerance || value > max + tolerance) {
    throw new RangeError(`${name} must be finite and between ${min} and ${max}`);
  }
}

class ConductionRod {
  constructor({
    lengthM = LIMITS.rodLength.default,
    areaM2 = LIMITS.area.default * PHYSICS.squareCentimetresToSquareMetres,
    conductivity = LIMITS.conductivityA.default,
  } = {}) {
    this.setLength(lengthM);
    this.setArea(areaM2);
    this.setConductivity(conductivity);
  }

  setLength(valueM) {
    assertFiniteInRange('lengthM', valueM, LIMITS.rodLength.min, LIMITS.rodLength.max);
    this.lengthM = valueM;
  }

  setArea(valueM2) {
    assertFiniteInRange(
      'areaM2',
      valueM2,
      LIMITS.area.min * PHYSICS.squareCentimetresToSquareMetres,
      LIMITS.area.max * PHYSICS.squareCentimetresToSquareMetres,
    );
    this.areaM2 = valueM2;
  }

  setConductivity(value) {
    assertFiniteInRange('conductivity', value, LIMITS.conductivityA.min, LIMITS.conductivityA.max);
    this.conductivity = value;
  }

  get thermalResistance() {
    // R = L/(kA) — SP015 8.3(b), steady one-dimensional conduction.
    return this.lengthM / (this.conductivity * this.areaM2);
  }
}

class SeriesConductionSystem {
  constructor({
    rods = [new ConductionRod()],
    hotTemperatureK = celsiusToKelvin(LIMITS.hotTemperature.default),
    coldTemperatureK = celsiusToKelvin(LIMITS.coldTemperature.default),
  } = {}) {
    this.setRods(rods);
    this.setBoundaryTemperatures(hotTemperatureK, coldTemperatureK);
  }

  setRods(rods) {
    if (!Array.isArray(rods) || rods.length < LIMITS.rodCount.min || rods.length > LIMITS.rodCount.max) {
      throw new RangeError('rods must contain one or two ConductionRod instances');
    }
    if (!rods.every((rod) => rod instanceof ConductionRod)) {
      throw new TypeError('Every rod must be a ConductionRod');
    }
    this.rods = rods.slice();
  }

  setBoundaryTemperatures(hotTemperatureK, coldTemperatureK) {
    assertFiniteInRange(
      'hotTemperatureK',
      hotTemperatureK,
      celsiusToKelvin(LIMITS.hotTemperature.min),
      celsiusToKelvin(LIMITS.hotTemperature.max),
    );
    assertFiniteInRange(
      'coldTemperatureK',
      coldTemperatureK,
      celsiusToKelvin(LIMITS.coldTemperature.min),
      celsiusToKelvin(LIMITS.coldTemperature.max),
    );
    if (hotTemperatureK <= coldTemperatureK) {
      throw new RangeError('Hot temperature must be greater than cold temperature');
    }
    this.hotTemperatureK = hotTemperatureK;
    this.coldTemperatureK = coldTemperatureK;
  }

  get totalLength() {
    return this.rods.reduce((sum, rod) => sum + rod.lengthM, 0);
  }

  get totalResistance() {
    return this.rods.reduce((sum, rod) => sum + rod.thermalResistance, 0);
  }

  get temperatureDifference() {
    return this.hotTemperatureK - this.coldTemperatureK;
  }

  get heatRate() {
    // Qdot = (Thot - Tcold)/sum(R) — SP015 8.3(b).
    return this.temperatureDifference / this.totalResistance;
  }

  get interfaceTemperature() {
    if (this.rods.length !== 2) return null;
    return this.hotTemperatureK - this.heatRate * this.rods[0].thermalResistance;
  }

  get temperatureGradients() {
    // +x runs hot to cold, so Fourier-law gradients are negative.
    return this.rods.map((rod) => -this.heatRate / (rod.conductivity * rod.areaM2));
  }

  temperatureAt(positionM) {
    const tolerance = Number.EPSILON * Math.max(1, this.totalLength);
    if (!Number.isFinite(positionM) || positionM < -tolerance || positionM > this.totalLength + tolerance) {
      throw new RangeError(`positionM must be between 0 and ${this.totalLength}`);
    }
    const x = Math.min(this.totalLength, Math.max(0, positionM));
    let startX = 0;
    let startTemperature = this.hotTemperatureK;
    for (let index = 0; index < this.rods.length; index += 1) {
      const rod = this.rods[index];
      const endX = startX + rod.lengthM;
      if (x <= endX + tolerance) {
        return startTemperature + this.temperatureGradients[index] * (x - startX);
      }
      startTemperature -= this.heatRate * rod.thermalResistance;
      startX = endX;
    }
    return this.coldTemperatureK;
  }
}

class QualitativeHeatLossProfile {
  valueAt(normalizedPosition, conductivity = LIMITS.conductivityA.default) {
    assertFiniteInRange('normalizedPosition', normalizedPosition, 0, 1);
    // Schematic only: conductivity changes bounded bowing, not a fin/convection solution.
    return Math.pow(1 - normalizedPosition, this._exponentForConductivity(conductivity));
  }

  points(sampleCount = DISPLAY.graphSamples, conductivity = LIMITS.conductivityA.default) {
    if (!Number.isInteger(sampleCount) || sampleCount < 2) {
      throw new RangeError('sampleCount must be an integer of at least 2');
    }
    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const position = index / sampleCount;
      return Object.freeze({ position, temperature: this.valueAt(position, conductivity) });
    });
  }

  compositePoints({ interfacePosition, exposurePattern, conductivityA = LIMITS.conductivityA.default, conductivityB = LIMITS.conductivityB.default, sampleCount = DISPLAY.graphSamples } = {}) {
    if (!Number.isFinite(interfacePosition) || interfacePosition <= 0 || interfacePosition >= 1) {
      throw new RangeError('interfacePosition must be finite and strictly between 0 and 1');
    }
    if (!EXPOSURE_PATTERNS.includes(exposurePattern)) {
      throw new RangeError('Unknown two-rod exposure pattern');
    }
    if (!Number.isInteger(sampleCount) || sampleCount < 4) {
      throw new RangeError('sampleCount must be an integer of at least 4');
    }

    const interfaceTemperature = 1 - interfacePosition;
    const countA = Math.max(2, Math.min(sampleCount - 2, Math.round(sampleCount * interfacePosition)));
    const countB = sampleCount - countA;
    const insulation = {
      A: exposurePattern === 'aInsulated',
      B: exposurePattern === 'bInsulated',
    };
    const pointsA = this._segmentPoints({
      segment: 'A',
      startPosition: 0,
      endPosition: interfacePosition,
      startTemperature: 1,
      endTemperature: interfaceTemperature,
      insulated: insulation.A,
      conductivity: conductivityA,
      sampleCount: countA,
    });
    const pointsB = this._segmentPoints({
      segment: 'B',
      startPosition: interfacePosition,
      endPosition: 1,
      startTemperature: interfaceTemperature,
      endTemperature: 0,
      insulated: insulation.B,
      conductivity: conductivityB,
      sampleCount: countB,
    });
    return pointsA.concat(pointsB.slice(1));
  }

  _segmentPoints({
    segment,
    startPosition,
    endPosition,
    startTemperature,
    endTemperature,
    insulated,
    conductivity,
    sampleCount,
  }) {
    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const localPosition = index / sampleCount;
      const position = startPosition + (endPosition - startPosition) * localPosition;
      const temperature = insulated
        ? startTemperature + (endTemperature - startTemperature) * localPosition
        : endTemperature + (startTemperature - endTemperature) * Math.pow(1 - localPosition, this._exponentForConductivity(conductivity));
      return Object.freeze({ position, temperature, segment, insulated });
    });
  }

  _exponentForConductivity(conductivity) {
    assertFiniteInRange('conductivity', conductivity, LIMITS.conductivityA.min, LIMITS.conductivityA.max);
    const fraction = (conductivity - LIMITS.conductivityA.min) / (LIMITS.conductivityA.max - LIMITS.conductivityA.min);
    return QUALITATIVE_PROFILE.exponentAtLowConductivity
      + fraction * (QUALITATIVE_PROFILE.exponentAtHighConductivity - QUALITATIVE_PROFILE.exponentAtLowConductivity);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PHYSICS,
    LIMITS,
    DISPLAY,
    EXPOSURE_PATTERNS,
    QUALITATIVE_PROFILE,
    ConductionRod,
    SeriesConductionSystem,
    QualitativeHeatLossProfile,
    celsiusToKelvin,
    kelvinToCelsius,
  };
}
