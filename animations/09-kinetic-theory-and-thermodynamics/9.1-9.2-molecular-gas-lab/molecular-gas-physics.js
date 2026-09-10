/* =========================================================================
   MOLECULAR-GAS-PHYSICS.JS — SP015 9.1(a–d), 9.2(a–f).
   Pure ideal-gas state and deterministic projected particle ensemble.
   No DOM or p5 access.
   ========================================================================= */

const MOLECULAR_GAS_MODES = Object.freeze(['motion', 'energy']);

const MOLECULE_CATEGORIES = Object.freeze({
  monatomic: Object.freeze({ label: 'Monatomic', degreesOfFreedom: 3 }),
  diatomic: Object.freeze({ label: 'Diatomic', degreesOfFreedom: 5 }),
  polyatomic: Object.freeze({ label: 'Polyatomic', degreesOfFreedom: 6 }),
});

const DEGREE_FOCUS_OPTIONS = Object.freeze({
  all: Object.freeze({ label: 'All active', kind: 'all' }),
  'translate-x': Object.freeze({ label: 'x translation', kind: 'translation' }),
  'translate-y': Object.freeze({ label: 'y translation', kind: 'translation' }),
  'translate-z': Object.freeze({ label: 'z translation', kind: 'translation' }),
  'rotate-r1': Object.freeze({ label: 'R₁ rotation', kind: 'rotation' }),
  'rotate-r2': Object.freeze({ label: 'R₂ rotation', kind: 'rotation' }),
  'rotate-r3': Object.freeze({ label: 'R₃ rotation', kind: 'rotation' }),
});

const CATEGORY_DEGREE_FOCUSES = Object.freeze({
  monatomic: Object.freeze(['all', 'translate-x', 'translate-y', 'translate-z']),
  diatomic: Object.freeze(['all', 'translate-x', 'translate-y', 'translate-z', 'rotate-r1', 'rotate-r2']),
  polyatomic: Object.freeze(Object.keys(DEGREE_FOCUS_OPTIONS)),
});

const PHYSICS = Object.freeze({
  gasConstant: 8.31446261815324,
  boltzmannConstant: 1.380649e-23,
  avogadroConstant: 6.02214076e23,
  litresToCubicMetres: 1e-3,
  gramsToKilograms: 1e-3,
});

const LIMITS = Object.freeze({
  temperature: Object.freeze({ min: 100, max: 1000, step: 10, default: 300 }),
  amount: Object.freeze({ min: 0.25, max: 2.00, step: 0.05, default: 1.00 }),
  volumeLitres: Object.freeze({ min: 5, max: 50, step: 1, default: 24 }),
  molarMassGrams: Object.freeze({ min: 2, max: 60, step: 1, default: 28 }),
  ensemble: Object.freeze({ count: 36, seed: 91512, maxCount: 100 }),
  playback: Object.freeze({ maxDt: 0.03, stepSeconds: 1 / 30 }),
  collisionFlashes: Object.freeze({ max: 16, lifetimeSeconds: 0.12 }),
});

const DISPLAY = Object.freeze({
  compactWidth: 560,
  wideMotionRatio: 0.62,
  panelPadding: 18,
  panelGap: 14,
  worldHeight: 0.62,
  worldWidthMin: 0.72,
  worldWidthMax: 1.00,
  particleRadius: 0.018,
  visualSpeedMin: 0.18,
  visualSpeedMax: 0.62,
  labelSize: 10,
  compactLabelSize: 9,
});

function assertFiniteInRange(name, value, config) {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(config.min), Math.abs(config.max));
  if (!Number.isFinite(value) || value < config.min - tolerance || value > config.max + tolerance) {
    throw new RangeError(`${name} must be finite and between ${config.min} and ${config.max}`);
  }
}

function categoryForDegrees(degreesOfFreedom) {
  const entry = Object.entries(MOLECULE_CATEGORIES)
    .find(([, config]) => config.degreesOfFreedom === degreesOfFreedom);
  if (!entry) throw new RangeError('Unsupported molecular degrees of freedom');
  return entry[0];
}

function degreeFocusesForCategory(category) {
  const focuses = CATEGORY_DEGREE_FOCUSES[category];
  if (!focuses) throw new RangeError('Unsupported molecular category');
  return focuses;
}

function isDegreeFocusSupported(category, focus) {
  if (!DEGREE_FOCUS_OPTIONS[focus]) throw new RangeError('Unsupported degree-of-freedom focus');
  return degreeFocusesForCategory(category).includes(focus);
}

function containerWidthForVolume(volumeM3) {
  const volumeLitres = volumeM3 / PHYSICS.litresToCubicMetres;
  assertFiniteInRange('volumeLitres', volumeLitres, LIMITS.volumeLitres);
  const fraction = (volumeLitres - LIMITS.volumeLitres.min)
    / (LIMITS.volumeLitres.max - LIMITS.volumeLitres.min);
  return DISPLAY.worldWidthMin + fraction * (DISPLAY.worldWidthMax - DISPLAY.worldWidthMin);
}

class IdealGasState {
  constructor({
    temperatureK = LIMITS.temperature.default,
    amountMol = LIMITS.amount.default,
    volumeM3 = LIMITS.volumeLitres.default * PHYSICS.litresToCubicMetres,
    molarMassKgPerMol = LIMITS.molarMassGrams.default * PHYSICS.gramsToKilograms,
    degreesOfFreedom = MOLECULE_CATEGORIES.diatomic.degreesOfFreedom,
  } = {}) {
    this.setTemperature(temperatureK);
    this.setAmount(amountMol);
    this.setVolume(volumeM3);
    this.setMolarMass(molarMassKgPerMol);
    this.setDegreesOfFreedom(degreesOfFreedom);
  }

  setTemperature(valueK) {
    assertFiniteInRange('temperatureK', valueK, LIMITS.temperature);
    this.temperatureK = valueK;
  }

  setAmount(valueMol) {
    assertFiniteInRange('amountMol', valueMol, LIMITS.amount);
    this.amountMol = valueMol;
  }

  setVolume(valueM3) {
    const config = {
      min: LIMITS.volumeLitres.min * PHYSICS.litresToCubicMetres,
      max: LIMITS.volumeLitres.max * PHYSICS.litresToCubicMetres,
    };
    assertFiniteInRange('volumeM3', valueM3, config);
    this.volumeM3 = valueM3;
  }

  setMolarMass(valueKgPerMol) {
    const config = {
      min: LIMITS.molarMassGrams.min * PHYSICS.gramsToKilograms,
      max: LIMITS.molarMassGrams.max * PHYSICS.gramsToKilograms,
    };
    assertFiniteInRange('molarMassKgPerMol', valueKgPerMol, config);
    this.molarMassKgPerMol = valueKgPerMol;
  }

  setDegreesOfFreedom(value) {
    categoryForDegrees(value);
    this.degreesOfFreedom = value;
  }

  get category() {
    return categoryForDegrees(this.degreesOfFreedom);
  }

  get moleculeCount() {
    return this.amountMol * PHYSICS.avogadroConstant;
  }

  get moleculeMass() {
    return this.molarMassKgPerMol / PHYSICS.avogadroConstant;
  }

  get density() {
    return this.amountMol * this.molarMassKgPerMol / this.volumeM3;
  }

  get meanSquaredSpeed() {
    // <v²> = 3RT/M — SP015 9.1(b–c), three-dimensional ideal gas.
    return 3 * PHYSICS.gasConstant * this.temperatureK / this.molarMassKgPerMol;
  }

  get rmsSpeed() {
    // v_rms = sqrt(<v²>) = sqrt(3kT/m) = sqrt(3RT/M) — SP015 9.1(b–c).
    return Math.sqrt(this.meanSquaredSpeed);
  }

  get rmsSpeedFromMoleculeMass() {
    return Math.sqrt(3 * PHYSICS.boltzmannConstant * this.temperatureK / this.moleculeMass);
  }

  get pressure() {
    return this.amountMol * PHYSICS.gasConstant * this.temperatureK / this.volumeM3;
  }

  get kineticPressure() {
    // P = (1/3)ρv_rms² — SP015 9.1(d).
    return this.density * this.meanSquaredSpeed / 3;
  }

  get molecularPressureVolume() {
    // PV = (1/3)Nmv_rms² — SP015 9.1(d).
    return this.moleculeCount * this.moleculeMass * this.meanSquaredSpeed / 3;
  }

  get meanEnergyPerDegree() {
    // Each quadratic degree contributes (1/2)kT — SP015 9.2(b–d).
    return 0.5 * PHYSICS.boltzmannConstant * this.temperatureK;
  }

  get meanTranslationalEnergy() {
    // <K_tr> = (1/2)m<v²> = (3/2)kT — SP015 9.2(a).
    return 1.5 * PHYSICS.boltzmannConstant * this.temperatureK;
  }

  get totalTranslationalEnergy() {
    return 1.5 * this.amountMol * PHYSICS.gasConstant * this.temperatureK;
  }

  get internalEnergy() {
    // U = (f/2)NkT = (f/2)nRT — SP015 9.2(e–f).
    return 0.5 * this.degreesOfFreedom * this.amountMol
      * PHYSICS.gasConstant * this.temperatureK;
  }
}

class SeededRandom {
  constructor(seed) {
    this.state = seed >>> 0;
  }

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
}

class MolecularEnsemble {
  constructor({
    count = LIMITS.ensemble.count,
    seed = LIMITS.ensemble.seed,
    containerWidth = DISPLAY.worldWidthMax,
  } = {}) {
    if (!Number.isInteger(count) || count < 1 || count > LIMITS.ensemble.maxCount) {
      throw new RangeError(`count must be an integer from 1 to ${LIMITS.ensemble.maxCount}`);
    }
    this.count = count;
    this.seed = seed >>> 0;
    this.containerWidth = containerWidth;
    this.containerHeight = DISPLAY.worldHeight;
    this.radius = DISPLAY.particleRadius;
    this.reset(containerWidth);
  }

  reset(containerWidth = this.containerWidth) {
    this._validateContainerWidth(containerWidth);
    this.containerWidth = containerWidth;
    const random = new SeededRandom(this.seed);
    const columns = Math.ceil(Math.sqrt(this.count * this.containerWidth / this.containerHeight));
    const rows = Math.ceil(this.count / columns);
    const cellWidth = (this.containerWidth - 2 * this.radius) / columns;
    const cellHeight = (this.containerHeight - 2 * this.radius) / rows;
    this.particles = Array.from({ length: this.count }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const jitterX = (random.next() - 0.5) * cellWidth * 0.22;
      const jitterY = (random.next() - 0.5) * cellHeight * 0.22;
      const angle = random.next() * Math.PI * 2;
      const speed = 0.68 + random.next() * 0.64;
      return {
        x: this.radius + cellWidth * (column + 0.5) + jitterX,
        y: this.radius + cellHeight * (row + 0.5) + jitterY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
    this._removeDriftAndNormalize();
  }

  _validateContainerWidth(width) {
    if (!Number.isFinite(width) || width < DISPLAY.worldWidthMin || width > DISPLAY.worldWidthMax) {
      throw new RangeError('containerWidth is outside the configured display range');
    }
  }

  _removeDriftAndNormalize() {
    if (this.count > 1) {
      const meanVx = this.particles.reduce((sum, particle) => sum + particle.vx, 0) / this.count;
      const meanVy = this.particles.reduce((sum, particle) => sum + particle.vy, 0) / this.count;
      this.particles.forEach((particle) => {
        particle.vx -= meanVx;
        particle.vy -= meanVy;
      });
    }
    const rms = Math.sqrt(this.sampleMeanSquaredSpeed);
    if (!(rms > 0)) throw new Error('Cannot normalize a stationary molecular ensemble');
    this.particles.forEach((particle) => {
      particle.vx /= rms;
      particle.vy /= rms;
    });
  }

  setContainerWidth(width) {
    this._validateContainerWidth(width);
    this.containerWidth = width;
    this.particles.forEach((particle) => {
      particle.x = Math.min(width - this.radius, Math.max(this.radius, particle.x));
    });
    for (let pass = 0; pass < 4; pass += 1) this._resolvePairs([]);
  }

  get sampleMeanSquaredSpeed() {
    return this.particles.reduce(
      (sum, particle) => sum + particle.vx ** 2 + particle.vy ** 2,
      0,
    ) / this.count;
  }

  get momentum() {
    return this.particles.reduce(
      (result, particle) => ({ x: result.x + particle.vx, y: result.y + particle.vy }),
      { x: 0, y: 0 },
    );
  }

  get kineticEnergy() {
    return 0.5 * this.particles.reduce(
      (sum, particle) => sum + particle.vx ** 2 + particle.vy ** 2,
      0,
    );
  }

  advance(dt, visualSpeed) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('dt must be finite and non-negative');
    if (!Number.isFinite(visualSpeed) || visualSpeed < 0) {
      throw new RangeError('visualSpeed must be finite and non-negative');
    }
    if (dt === 0 || visualSpeed === 0) return [];
    const maximumFactor = Math.max(...this.particles.map((particle) => Math.hypot(particle.vx, particle.vy)));
    const required = Math.ceil(maximumFactor * visualSpeed * dt / (this.radius * 0.75));
    const substeps = Math.min(4, Math.max(1, required));
    const stepDt = dt / substeps;
    const events = [];
    for (let step = 0; step < substeps; step += 1) {
      this.particles.forEach((particle) => {
        particle.x += particle.vx * visualSpeed * stepDt;
        particle.y += particle.vy * visualSpeed * stepDt;
        this._resolveWalls(particle, events);
      });
      this._resolvePairs(events);
    }
    return events.slice(0, LIMITS.collisionFlashes.max * 2);
  }

  _resolveWalls(particle, events) {
    let collided = false;
    if (particle.x < this.radius) {
      particle.x = this.radius;
      particle.vx = Math.abs(particle.vx);
      collided = true;
    } else if (particle.x > this.containerWidth - this.radius) {
      particle.x = this.containerWidth - this.radius;
      particle.vx = -Math.abs(particle.vx);
      collided = true;
    }
    if (particle.y < this.radius) {
      particle.y = this.radius;
      particle.vy = Math.abs(particle.vy);
      collided = true;
    } else if (particle.y > this.containerHeight - this.radius) {
      particle.y = this.containerHeight - this.radius;
      particle.vy = -Math.abs(particle.vy);
      collided = true;
    }
    if (collided) events.push({ type: 'wall', x: particle.x, y: particle.y });
  }

  _resolvePairs(events) {
    const diameter = this.radius * 2;
    const diameterSquared = diameter ** 2;
    for (let firstIndex = 0; firstIndex < this.particles.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < this.particles.length; secondIndex += 1) {
        const first = this.particles[firstIndex];
        const second = this.particles[secondIndex];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distanceSquared = dx ** 2 + dy ** 2;
        if (distanceSquared >= diameterSquared) continue;
        const distance = Math.sqrt(distanceSquared);
        const nx = distance > 1e-12 ? dx / distance : 1;
        const ny = distance > 1e-12 ? dy / distance : 0;
        const overlap = diameter - distance;
        first.x -= nx * overlap * 0.5;
        first.y -= ny * overlap * 0.5;
        second.x += nx * overlap * 0.5;
        second.y += ny * overlap * 0.5;
        this._clampParticle(first);
        this._clampParticle(second);

        const relativeNormalVelocity = (second.vx - first.vx) * nx
          + (second.vy - first.vy) * ny;
        if (relativeNormalVelocity < 0) {
          // Equal-mass elastic discs exchange their normal velocity components.
          first.vx += relativeNormalVelocity * nx;
          first.vy += relativeNormalVelocity * ny;
          second.vx -= relativeNormalVelocity * nx;
          second.vy -= relativeNormalVelocity * ny;
          events.push({
            type: 'pair',
            x: (first.x + second.x) / 2,
            y: (first.y + second.y) / 2,
          });
        }
      }
    }
  }

  _clampParticle(particle) {
    particle.x = Math.min(this.containerWidth - this.radius, Math.max(this.radius, particle.x));
    particle.y = Math.min(this.containerHeight - this.radius, Math.max(this.radius, particle.y));
  }

  snapshot() {
    return Object.freeze({
      containerWidth: this.containerWidth,
      containerHeight: this.containerHeight,
      radius: this.radius,
      particles: Object.freeze(this.particles.map((particle) => Object.freeze({ ...particle }))),
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MOLECULAR_GAS_MODES,
    MOLECULE_CATEGORIES,
    DEGREE_FOCUS_OPTIONS,
    CATEGORY_DEGREE_FOCUSES,
    PHYSICS,
    LIMITS,
    DISPLAY,
    IdealGasState,
    MolecularEnsemble,
    categoryForDegrees,
    degreeFocusesForCategory,
    isDegreeFocusSupported,
    containerWidthForVolume,
  };
}
