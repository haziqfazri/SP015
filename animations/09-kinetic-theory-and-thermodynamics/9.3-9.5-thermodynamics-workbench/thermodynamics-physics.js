/* =========================================================================
   THERMODYNAMICS-PHYSICS.JS — SP015 9.3–9.5.
   Pure First Law and P–V-process state; no DOM or canvas access.
   ========================================================================= */

const PHYSICS = Object.freeze({
  gasConstant: 8.31446261815324, // J mol⁻¹ K⁻¹
  joulesToKilojoules: 1e-3,
  pascalsPerKilopascal: 1000,
  cubicMetresPerLitre: 1e-3,
});

const LIMITS = Object.freeze({
  heatJ: Object.freeze({ min: -1500, max: 1500, step: 50, default: 600 }),
  workJ: Object.freeze({ min: -1500, max: 1500, step: 50, default: 200 }),
  initialTemperatureK: Object.freeze({ min: 200, max: 600, step: 10, default: 300 }),
  amountMol: Object.freeze({ min: 0.5, max: 2, step: 0.05, default: 1 }),
  degreesOfFreedom: Object.freeze({ values: Object.freeze([3, 5, 6]), default: 5 }),
  initialPressureKPa: Object.freeze({ min: 50, max: 300, step: 10, default: 100 }),
  initialVolumeL: Object.freeze({ min: 5, max: 30, step: 0.5, default: 10 }),
  finalVolumeL: Object.freeze({ min: 5, max: 30, step: 0.5, default: 20, minimumDifference: 0.5 }),
  finalPressureKPa: Object.freeze({ min: 50, max: 300, step: 10, default: 150, minimumDifference: 10 }),
  processMolecules: Object.freeze({
    count: 26,
    seed: 93521,
    radius: 0.017,
    referenceTemperatureK: 300,
    speedAtReference: 0.34,
    maxSubsteps: 8,
    collisionPasses: 12,
  }),
  playback: Object.freeze({ maxDt: 0.03, durationSeconds: 3, stepFraction: 0.1 }),
});

const PROCESS_TYPES = Object.freeze(['isothermal', 'isobaric', 'isochoric', 'adiabatic']);

const MOLECULAR_CATEGORIES = Object.freeze({
  monatomic: Object.freeze({ label: 'Monatomic', degreesOfFreedom: 3 }),
  diatomic: Object.freeze({ label: 'Diatomic', degreesOfFreedom: 5 }),
  polyatomic: Object.freeze({ label: 'Generic polyatomic', degreesOfFreedom: 6 }),
});

const SCENARIOS = Object.freeze({
  heating: Object.freeze({ label: 'Heating', heatJ: 600, workJ: 0 }),
  expansion: Object.freeze({ label: 'Expansion', heatJ: 0, workJ: 600 }),
  compression: Object.freeze({ label: 'Compression', heatJ: 0, workJ: -600 }),
  cooling: Object.freeze({ label: 'Cooling', heatJ: -600, workJ: 0 }),
});

function assertFiniteInRange(name, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be finite and between ${min} and ${max}`);
  }
}

function assertDegreesOfFreedom(value) {
  if (!Number.isInteger(value) || !LIMITS.degreesOfFreedom.values.includes(value)) {
    throw new RangeError('degreesOfFreedom must be one of 3, 5, or 6');
  }
}

function categoryForDegreesOfFreedom(degreesOfFreedom) {
  const entry = Object.entries(MOLECULAR_CATEGORIES)
    .find(([, category]) => category.degreesOfFreedom === degreesOfFreedom);
  if (!entry) throw new RangeError('Unknown degrees-of-freedom category');
  return entry[0];
}

class FirstLawState {
  constructor({
    initialTemperatureK = LIMITS.initialTemperatureK.default,
    amountMol = LIMITS.amountMol.default,
    degreesOfFreedom = LIMITS.degreesOfFreedom.default,
    targetHeatJ = LIMITS.heatJ.default,
    targetWorkJ = LIMITS.workJ.default,
  } = {}) {
    this.initialTemperatureK = LIMITS.initialTemperatureK.default;
    this.amountMol = LIMITS.amountMol.default;
    this.degreesOfFreedom = LIMITS.degreesOfFreedom.default;
    this.targetHeatJ = 0;
    this.targetWorkJ = 0;

    this.setInitialTemperature(initialTemperatureK);
    this.setAmount(amountMol);
    this.setDegreesOfFreedom(degreesOfFreedom);
    this.setTransfers({ heatJ: targetHeatJ, workJ: targetWorkJ });
  }

  get initialInternalEnergyJ() {
    // U₁ = (f/2)nRT₁ — ideal-gas energy relation used by SP015 9.3(b).
    return (this.degreesOfFreedom / 2) * this.amountMol
      * PHYSICS.gasConstant * this.initialTemperatureK;
  }

  get targetDeltaInternalEnergyJ() {
    // ΔU = Q − W — SP015 9.3(a); W is positive when done by the gas.
    return this.targetHeatJ - this.targetWorkJ;
  }

  get targetFinalInternalEnergyJ() {
    // U₂ = U₁ + ΔU — SP015 9.3(a).
    return this.initialInternalEnergyJ + this.targetDeltaInternalEnergyJ;
  }

  get targetFinalTemperatureK() {
    // T₂ = 2U₂/(fnR) — rearranged ideal-gas internal-energy relation, SP015 9.3(b).
    return (2 * this.targetFinalInternalEnergyJ)
      / (this.degreesOfFreedom * this.amountMol * PHYSICS.gasConstant);
  }

  setInitialTemperature(valueK) {
    this._validateCandidate({ initialTemperatureK: valueK });
    this.initialTemperatureK = valueK;
  }

  setAmount(valueMol) {
    this._validateCandidate({ amountMol: valueMol });
    this.amountMol = valueMol;
  }

  setDegreesOfFreedom(value) {
    this._validateCandidate({ degreesOfFreedom: value });
    this.degreesOfFreedom = value;
  }

  setHeat(valueJ) {
    this._validateCandidate({ targetHeatJ: valueJ });
    this.targetHeatJ = valueJ;
  }

  setWork(valueJ) {
    this._validateCandidate({ targetWorkJ: valueJ });
    this.targetWorkJ = valueJ;
  }

  setTransfers({ heatJ, workJ }) {
    this._validateCandidate({ targetHeatJ: heatJ, targetWorkJ: workJ });
    this.targetHeatJ = heatJ;
    this.targetWorkJ = workJ;
  }

  snapshotAt(progress) {
    assertFiniteInRange('progress', progress, 0, 1);
    const appliedHeatJ = progress * this.targetHeatJ;
    const appliedWorkJ = progress * this.targetWorkJ;
    // ΔU(s) = Q(s) − W(s) — SP015 9.3(a), with both transfers applied linearly.
    const appliedDeltaInternalEnergyJ = appliedHeatJ - appliedWorkJ;
    const currentInternalEnergyJ = this.initialInternalEnergyJ + appliedDeltaInternalEnergyJ;
    // T(s) = 2U(s)/(fnR) — SP015 9.3(b), applied to the animated state.
    const currentTemperatureK = (2 * currentInternalEnergyJ)
      / (this.degreesOfFreedom * this.amountMol * PHYSICS.gasConstant);

    return Object.freeze({
      progress,
      initialTemperatureK: this.initialTemperatureK,
      currentTemperatureK,
      targetFinalTemperatureK: this.targetFinalTemperatureK,
      amountMol: this.amountMol,
      degreesOfFreedom: this.degreesOfFreedom,
      initialInternalEnergyJ: this.initialInternalEnergyJ,
      currentInternalEnergyJ,
      targetFinalInternalEnergyJ: this.targetFinalInternalEnergyJ,
      targetHeatJ: this.targetHeatJ,
      targetWorkJ: this.targetWorkJ,
      appliedHeatJ,
      appliedWorkJ,
      appliedDeltaInternalEnergyJ,
      targetDeltaInternalEnergyJ: this.targetDeltaInternalEnergyJ,
    });
  }

  _validateCandidate(overrides) {
    const candidate = {
      initialTemperatureK: this.initialTemperatureK,
      amountMol: this.amountMol,
      degreesOfFreedom: this.degreesOfFreedom,
      targetHeatJ: this.targetHeatJ,
      targetWorkJ: this.targetWorkJ,
      ...overrides,
    };
    assertFiniteInRange(
      'initialTemperatureK',
      candidate.initialTemperatureK,
      LIMITS.initialTemperatureK.min,
      LIMITS.initialTemperatureK.max,
    );
    assertFiniteInRange('amountMol', candidate.amountMol, LIMITS.amountMol.min, LIMITS.amountMol.max);
    assertDegreesOfFreedom(candidate.degreesOfFreedom);
    assertFiniteInRange('targetHeatJ', candidate.targetHeatJ, LIMITS.heatJ.min, LIMITS.heatJ.max);
    assertFiniteInRange('targetWorkJ', candidate.targetWorkJ, LIMITS.workJ.min, LIMITS.workJ.max);

    const initialInternalEnergyJ = (candidate.degreesOfFreedom / 2) * candidate.amountMol
      * PHYSICS.gasConstant * candidate.initialTemperatureK;
    // U₂ = U₁ + Q − W — SP015 9.3(a); the final state must retain positive energy.
    const finalInternalEnergyJ = initialInternalEnergyJ + candidate.targetHeatJ - candidate.targetWorkJ;
    if (!(finalInternalEnergyJ > 0)) {
      throw new RangeError('Selected transfers would produce a non-positive final temperature');
    }
  }
}

class ThermodynamicProcessState {
  constructor({
    amountMol = LIMITS.amountMol.default,
    initialPressurePa = LIMITS.initialPressureKPa.default * PHYSICS.pascalsPerKilopascal,
    initialVolumeM3 = LIMITS.initialVolumeL.default * PHYSICS.cubicMetresPerLitre,
    processType = 'isothermal',
    targetVolumeM3 = LIMITS.finalVolumeL.default * PHYSICS.cubicMetresPerLitre,
    targetPressurePa = LIMITS.finalPressureKPa.default * PHYSICS.pascalsPerKilopascal,
    degreesOfFreedom = LIMITS.degreesOfFreedom.default,
  } = {}) {
    this.amountMol = LIMITS.amountMol.default;
    this.initialPressurePa = LIMITS.initialPressureKPa.default * PHYSICS.pascalsPerKilopascal;
    this.initialVolumeM3 = LIMITS.initialVolumeL.default * PHYSICS.cubicMetresPerLitre;
    this.processType = 'isothermal';
    this.targetVolumeM3 = LIMITS.finalVolumeL.default * PHYSICS.cubicMetresPerLitre;
    this.targetPressurePa = LIMITS.finalPressureKPa.default * PHYSICS.pascalsPerKilopascal;
    this.degreesOfFreedom = LIMITS.degreesOfFreedom.default;

    this._validateCandidate({
      amountMol,
      initialPressurePa,
      initialVolumeM3,
      processType,
      targetVolumeM3,
      targetPressurePa,
      degreesOfFreedom,
    });
    Object.assign(this, {
      amountMol,
      initialPressurePa,
      initialVolumeM3,
      processType,
      targetVolumeM3,
      targetPressurePa,
      degreesOfFreedom,
    });
  }

  get initialTemperatureK() {
    // T₁ = P₁V₁/(nR) — ideal-gas state relation supporting SP015 9.4.
    return this.initialPressurePa * this.initialVolumeM3 / (this.amountMol * PHYSICS.gasConstant);
  }

  get gamma() {
    // γ = (f + 2)/f — supporting ideal-gas comparison for SP015 9.4(iv).
    return (this.degreesOfFreedom + 2) / this.degreesOfFreedom;
  }

  get targetParameter() {
    return this.processType === 'isochoric' ? this.targetPressurePa : this.targetVolumeM3;
  }

  get targetSnapshot() {
    return this.snapshotAt(1);
  }

  setAmount(valueMol) { this._assignValidated({ amountMol: valueMol }); }
  setInitialPressure(valuePa) { this._assignValidated({ initialPressurePa: valuePa }); }
  setInitialVolume(valueM3) { this._assignValidated({ initialVolumeM3: valueM3 }); }
  setDegreesOfFreedom(value) { this._assignValidated({ degreesOfFreedom: value }); }

  setProcessType(value) {
    if (!PROCESS_TYPES.includes(value)) throw new RangeError('Unknown thermodynamic process');
    this._assignValidated({ processType: value });
  }

  setTargetVolume(valueM3) {
    if (this.processType === 'isochoric') {
      throw new Error('Isochoric processes use a final pressure target, not a volume target');
    }
    this._assignValidated({ targetVolumeM3: valueM3 });
  }

  setTargetPressure(valuePa) {
    if (this.processType !== 'isochoric') {
      throw new Error('Only isochoric processes use a final pressure target');
    }
    this._assignValidated({ targetPressurePa: valuePa });
  }

  snapshotAt(progress) {
    assertFiniteInRange('progress', progress, 0, 1);
    const volumeM3 = this.processType === 'isochoric'
      ? this.initialVolumeM3
      : interpolate(this.initialVolumeM3, this.targetVolumeM3, progress);
    const pressurePa = this._pressureFor(volumeM3, progress);
    const temperatureK = pressurePa * volumeM3 / (this.amountMol * PHYSICS.gasConstant);
    const currentWorkJ = this._workFor(volumeM3);

    return Object.freeze({
      progress,
      processType: this.processType,
      amountMol: this.amountMol,
      degreesOfFreedom: this.degreesOfFreedom,
      gamma: this.gamma,
      initialPressurePa: this.initialPressurePa,
      initialVolumeM3: this.initialVolumeM3,
      initialTemperatureK: this.initialTemperatureK,
      pressurePa,
      volumeM3,
      temperatureK,
      currentWorkJ,
      workRequiredBySP015: this.processType !== 'adiabatic',
      invariantLabel: processInvariantLabel(this.processType),
    });
  }

  pathSamples(progress = 1, count = 64) {
    assertFiniteInRange('progress', progress, 0, 1);
    if (!Number.isInteger(count) || count < 2) throw new RangeError('path sample count must be an integer of at least 2');
    return Object.freeze(Array.from({ length: count }, (_, index) => this.snapshotAt(progress * index / (count - 1))));
  }

  isothermalComparisonSamples(count = 64) {
    if (this.processType !== 'adiabatic') return Object.freeze([]);
    if (!Number.isInteger(count) || count < 2) throw new RangeError('comparison sample count must be an integer of at least 2');
    return Object.freeze(Array.from({ length: count }, (_, index) => {
      const progress = index / (count - 1);
      const volumeM3 = interpolate(this.initialVolumeM3, this.targetVolumeM3, progress);
      return Object.freeze({
        progress,
        volumeM3,
        pressurePa: this.initialPressurePa * this.initialVolumeM3 / volumeM3,
      });
    }));
  }

  _pressureFor(volumeM3, progress) {
    switch (this.processType) {
      case 'isothermal':
        // PV = constant — defining constraint for SP015 9.4(i).
        return this.initialPressurePa * this.initialVolumeM3 / volumeM3;
      case 'isobaric':
        return this.initialPressurePa;
      case 'isochoric':
        return interpolate(this.initialPressurePa, this.targetPressurePa, progress);
      case 'adiabatic':
        // PV^γ = constant — supporting ideal-gas construction for SP015 9.4(iv).
        return this.initialPressurePa * (this.initialVolumeM3 / volumeM3) ** this.gamma;
      default:
        throw new RangeError('Unknown thermodynamic process');
    }
  }

  _workFor(volumeM3) {
    switch (this.processType) {
      case 'isothermal':
        // W = nRT ln(V/V₁) = P₁V₁ ln(V/V₁) — SP015 9.5(b)(i).
        return this.initialPressurePa * this.initialVolumeM3 * Math.log(volumeM3 / this.initialVolumeM3);
      case 'isobaric':
        // W = P(V − V₁) — SP015 9.5(b)(ii).
        return this.initialPressurePa * (volumeM3 - this.initialVolumeM3);
      case 'isochoric':
        // W = ∫P dV = 0 because ΔV = 0 — SP015 9.5(b)(iii).
        return 0;
      case 'adiabatic':
        return null;
      default:
        throw new RangeError('Unknown thermodynamic process');
    }
  }

  _assignValidated(overrides) {
    this._validateCandidate(overrides);
    Object.assign(this, overrides);
  }

  _validateCandidate(overrides) {
    const candidate = {
      amountMol: this.amountMol,
      initialPressurePa: this.initialPressurePa,
      initialVolumeM3: this.initialVolumeM3,
      processType: this.processType,
      targetVolumeM3: this.targetVolumeM3,
      targetPressurePa: this.targetPressurePa,
      degreesOfFreedom: this.degreesOfFreedom,
      ...overrides,
    };
    assertFiniteInRange('amountMol', candidate.amountMol, LIMITS.amountMol.min, LIMITS.amountMol.max);
    assertFiniteInRange(
      'initialPressurePa',
      candidate.initialPressurePa,
      LIMITS.initialPressureKPa.min * PHYSICS.pascalsPerKilopascal,
      LIMITS.initialPressureKPa.max * PHYSICS.pascalsPerKilopascal,
    );
    assertFiniteInRange(
      'initialVolumeM3',
      candidate.initialVolumeM3,
      LIMITS.initialVolumeL.min * PHYSICS.cubicMetresPerLitre,
      LIMITS.initialVolumeL.max * PHYSICS.cubicMetresPerLitre,
    );
    assertFiniteInRange(
      'targetVolumeM3',
      candidate.targetVolumeM3,
      LIMITS.finalVolumeL.min * PHYSICS.cubicMetresPerLitre,
      LIMITS.finalVolumeL.max * PHYSICS.cubicMetresPerLitre,
    );
    assertFiniteInRange(
      'targetPressurePa',
      candidate.targetPressurePa,
      LIMITS.finalPressureKPa.min * PHYSICS.pascalsPerKilopascal,
      LIMITS.finalPressureKPa.max * PHYSICS.pascalsPerKilopascal,
    );
    assertDegreesOfFreedom(candidate.degreesOfFreedom);
    if (!PROCESS_TYPES.includes(candidate.processType)) throw new RangeError('Unknown thermodynamic process');

    const minimumVolumeDifference = LIMITS.finalVolumeL.minimumDifference * PHYSICS.cubicMetresPerLitre;
    const minimumPressureDifference = LIMITS.finalPressureKPa.minimumDifference * PHYSICS.pascalsPerKilopascal;
    if (candidate.processType === 'isochoric') {
      if (Math.abs(candidate.targetPressurePa - candidate.initialPressurePa) < minimumPressureDifference) {
        throw new RangeError('Final pressure must differ enough from the initial pressure to show a process');
      }
    } else if (Math.abs(candidate.targetVolumeM3 - candidate.initialVolumeM3) < minimumVolumeDifference) {
      throw new RangeError('Final volume must differ enough from the initial volume to show a process');
    }
  }
}

class ProcessMoleculeRandom {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
}

class ProcessMoleculeEnsemble {
  constructor({
    count = LIMITS.processMolecules.count,
    seed = LIMITS.processMolecules.seed,
    containerWidth = 1,
    temperatureK = LIMITS.processMolecules.referenceTemperatureK,
  } = {}) {
    if (!Number.isInteger(count) || count < 1 || count > 60) {
      throw new RangeError('process molecule count must be an integer from 1 to 60');
    }
    this.count = count;
    this.seed = seed >>> 0;
    this.radius = LIMITS.processMolecules.radius;
    this.containerWidth = 1;
    this.temperatureK = LIMITS.processMolecules.referenceTemperatureK;
    this.reset({ containerWidth, temperatureK });
  }

  get visualRmsSpeed() {
    if (this.particles.length === 0) return 0;
    const meanSquaredSpeed = this.particles.reduce(
      (sum, particle) => sum + particle.vx ** 2 + particle.vy ** 2,
      0,
    ) / this.particles.length;
    return Math.sqrt(meanSquaredSpeed);
  }

  reset({ containerWidth = this.containerWidth, temperatureK = this.temperatureK } = {}) {
    this._validateContainer(containerWidth);
    this._validateTemperature(temperatureK);
    this.containerWidth = containerWidth;
    this.temperatureK = temperatureK;
    const random = new ProcessMoleculeRandom(this.seed);
    this.particles = [];
    for (let index = 0; index < this.count; index += 1) {
      const position = this._randomNonOverlappingPosition(random);
      const direction = random.next() * Math.PI * 2;
      const speedFactor = 0.65 + random.next() * 0.7;
      this.particles.push({
        ...position,
        vx: Math.cos(direction) * speedFactor,
        vy: Math.sin(direction) * speedFactor,
        angle: random.next() * Math.PI * 2,
        angularVelocity: (random.next() < 0.5 ? -1 : 1) * (1.4 + random.next() * 1.8),
      });
    }
    this._scaleVelocitiesToTemperature(temperatureK);
  }

  reconcile({ containerWidth, temperatureK }) {
    this._validateContainer(containerWidth);
    this._validateTemperature(temperatureK);
    const widthScale = containerWidth / this.containerWidth;
    this.particles.forEach((particle) => {
      particle.x *= widthScale;
    });
    this.containerWidth = containerWidth;
    this.temperatureK = temperatureK;
    this._scaleVelocitiesToTemperature(temperatureK);
    this.particles.forEach((particle) => this._clampParticle(particle, containerWidth));
    for (let pass = 0; pass < LIMITS.processMolecules.collisionPasses * 2; pass += 1) {
      this._resolvePairs(containerWidth);
    }
  }

  advance(dt, { containerWidth, temperatureK }) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('dt must be finite and non-negative');
    this._validateContainer(containerWidth);
    this._validateTemperature(temperatureK);
    if (dt === 0) {
      this.reconcile({ containerWidth, temperatureK });
      return;
    }

    const previousWidth = this.containerWidth;
    const pistonVelocity = (containerWidth - previousWidth) / dt;
    this._scaleVelocitiesToTemperature(temperatureK);
    const maximumSpeed = Math.max(...this.particles.map((particle) => Math.hypot(particle.vx, particle.vy)));
    const maximumTravel = (maximumSpeed + Math.abs(pistonVelocity)) * dt;
    const substeps = Math.min(
      LIMITS.processMolecules.maxSubsteps,
      Math.max(1, Math.ceil(maximumTravel / (this.radius * 0.7))),
    );
    const stepDt = dt / substeps;

    for (let step = 1; step <= substeps; step += 1) {
      const stepWidth = previousWidth + (containerWidth - previousWidth) * step / substeps;
      this.particles.forEach((particle) => {
        particle.x += particle.vx * stepDt;
        particle.y += particle.vy * stepDt;
        particle.angle += particle.angularVelocity * stepDt;
        this._resolveWalls(particle, stepWidth, pistonVelocity);
      });
      for (let pass = 0; pass < LIMITS.processMolecules.collisionPasses; pass += 1) {
        this._resolvePairs(stepWidth);
      }
    }

    this.containerWidth = containerWidth;
    this.temperatureK = temperatureK;
    this._scaleVelocitiesToTemperature(temperatureK);
    this.particles.forEach((particle) => this._clampParticle(particle, containerWidth));
  }

  snapshot() {
    return Object.freeze({
      containerWidth: this.containerWidth,
      radius: this.radius,
      temperatureK: this.temperatureK,
      visualRmsSpeed: this.visualRmsSpeed,
      particles: Object.freeze(this.particles.map((particle) => Object.freeze({ ...particle }))),
    });
  }

  _randomNonOverlappingPosition(random) {
    for (let attempt = 0; attempt < 6000; attempt += 1) {
      const candidate = {
        x: this.radius + random.next() * (this.containerWidth - 2 * this.radius),
        y: this.radius + random.next() * (1 - 2 * this.radius),
      };
      const separated = this.particles.every((particle) => (
        Math.hypot(candidate.x - particle.x, candidate.y - particle.y) >= this.radius * 2.15
      ));
      if (separated) return candidate;
    }
    throw new Error('Unable to place process molecules without overlap');
  }

  _scaleVelocitiesToTemperature(temperatureK) {
    const targetRmsSpeed = LIMITS.processMolecules.speedAtReference
      * Math.sqrt(temperatureK / LIMITS.processMolecules.referenceTemperatureK);
    const currentRmsSpeed = this.visualRmsSpeed;
    if (!(currentRmsSpeed > 0)) return;
    const scale = targetRmsSpeed / currentRmsSpeed;
    this.particles.forEach((particle) => {
      particle.vx *= scale;
      particle.vy *= scale;
    });
  }

  _resolveWalls(particle, containerWidth, pistonVelocity) {
    if (particle.x < this.radius) {
      particle.x = this.radius;
      particle.vx = Math.abs(particle.vx);
    } else if (particle.x > containerWidth - this.radius) {
      particle.x = containerWidth - this.radius;
      // Elastic reflection in the moving piston's reference frame.
      particle.vx = 2 * pistonVelocity - particle.vx;
      if (particle.vx >= pistonVelocity) particle.vx = pistonVelocity - Math.abs(particle.vx - pistonVelocity);
    }
    if (particle.y < this.radius) {
      particle.y = this.radius;
      particle.vy = Math.abs(particle.vy);
    } else if (particle.y > 1 - this.radius) {
      particle.y = 1 - this.radius;
      particle.vy = -Math.abs(particle.vy);
    }
  }

  _resolvePairs(containerWidth) {
    const diameter = this.radius * 2;
    for (let firstIndex = 0; firstIndex < this.particles.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < this.particles.length; secondIndex += 1) {
        const first = this.particles[firstIndex];
        const second = this.particles[secondIndex];
        let dx = second.x - first.x;
        let dy = second.y - first.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= diameter) continue;
        const coincident = distance <= 1e-12;
        const nx = coincident ? 1 : dx / distance;
        const ny = coincident ? 0 : dy / distance;
        if (coincident) distance = 0;
        const overlap = diameter - distance;
        first.x -= nx * overlap / 2;
        first.y -= ny * overlap / 2;
        second.x += nx * overlap / 2;
        second.y += ny * overlap / 2;
        const relativeNormalVelocity = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
        if (relativeNormalVelocity < 0) {
          first.vx += relativeNormalVelocity * nx;
          first.vy += relativeNormalVelocity * ny;
          second.vx -= relativeNormalVelocity * nx;
          second.vy -= relativeNormalVelocity * ny;
        }
        this._clampParticle(first, containerWidth);
        this._clampParticle(second, containerWidth);
      }
    }
  }

  _clampParticle(particle, containerWidth) {
    particle.x = Math.min(containerWidth - this.radius, Math.max(this.radius, particle.x));
    particle.y = Math.min(1 - this.radius, Math.max(this.radius, particle.y));
  }

  _validateContainer(containerWidth) {
    if (!Number.isFinite(containerWidth) || containerWidth <= this.radius * 2) {
      throw new RangeError('process molecule container width must be finite and positive');
    }
  }

  _validateTemperature(temperatureK) {
    if (!Number.isFinite(temperatureK) || temperatureK <= 0) {
      throw new RangeError('process molecule temperature must be finite and positive');
    }
  }
}

function interpolate(start, end, progress) {
  return start + (end - start) * progress;
}

function processInvariantLabel(processType) {
  const labels = {
    isothermal: 'T CONSTANT',
    isobaric: 'P CONSTANT',
    isochoric: 'V CONSTANT',
    adiabatic: 'Q = 0',
  };
  if (!labels[processType]) throw new RangeError('Unknown thermodynamic process');
  return labels[processType];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PHYSICS,
    LIMITS,
    MOLECULAR_CATEGORIES,
    SCENARIOS,
    PROCESS_TYPES,
    FirstLawState,
    ThermodynamicProcessState,
    ProcessMoleculeEnsemble,
    categoryForDegreesOfFreedom,
    interpolate,
    processInvariantLabel,
  };
}
