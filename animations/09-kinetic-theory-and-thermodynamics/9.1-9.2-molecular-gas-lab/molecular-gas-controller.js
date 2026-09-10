/* =========================================================================
   MOLECULAR-GAS-CONTROLLER.JS — SP015 9.1(a–d), 9.2(a–f).
   Owns gas state, projected ensemble, UI callbacks, and playback.
   ========================================================================= */

function superscriptInteger(value) {
  const glyphs = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return String(value).split('').map((character) => glyphs[character]).join('');
}

function scientificText(value, decimals, unit = '') {
  if (value === 0) return `0${unit ? ` ${unit}` : ''}`;
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const coefficient = value / 10 ** exponent;
  return `${coefficient.toFixed(decimals)} × 10${superscriptInteger(exponent)}${unit ? ` ${unit}` : ''}`;
}

function visualSpeedForRms(rmsSpeed) {
  const minimumRms = Math.sqrt(
    3 * PHYSICS.gasConstant * LIMITS.temperature.min
    / (LIMITS.molarMassGrams.max * PHYSICS.gramsToKilograms),
  );
  const maximumRms = Math.sqrt(
    3 * PHYSICS.gasConstant * LIMITS.temperature.max
    / (LIMITS.molarMassGrams.min * PHYSICS.gramsToKilograms),
  );
  const fraction = (Math.log(rmsSpeed) - Math.log(minimumRms))
    / (Math.log(maximumRms) - Math.log(minimumRms));
  const bounded = Math.min(1, Math.max(0, fraction));
  return DISPLAY.visualSpeedMin + bounded * (DISPLAY.visualSpeedMax - DISPLAY.visualSpeedMin);
}

class SimulationController {
  constructor() {
    this.mode = 'motion';
    this.degreeFocus = 'all';
    this.state = new IdealGasState();
    this.ensemble = new MolecularEnsemble({
      containerWidth: containerWidthForVolume(this.state.volumeM3),
    });
    this.isPlaying = false;
    this.animationTime = 0;
    this.collisionFlashes = [];
    this.ui = new UIManager();
    this.ui.on({
      onModeChange: (mode) => this._onModeChange(mode),
      onTemperatureChange: (valueK) => this._onTemperatureChange(valueK),
      onAmountChange: (valueMol) => this._onAmountChange(valueMol),
      onVolumeChange: (valueLitres) => this._onVolumeChange(valueLitres),
      onMolarMassChange: (valueGrams) => this._onMolarMassChange(valueGrams),
      onCategoryChange: (category) => this._onCategoryChange(category),
      onDegreeFocusChange: (focus) => this._onDegreeFocusChange(focus),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),
      onStep: () => this._onStep(),
      onReset: () => this._onReset(),
    });
    this.ui.setMode(this.mode);
    this.ui.setCategory(this.state.category);
    this.ui.setDegreeAvailability(this.state.category);
    this.ui.setDegreeFocus(this.degreeFocus);
    this._refreshUI();
  }

  _onModeChange(mode) {
    if (!MOLECULAR_GAS_MODES.includes(mode)) throw new RangeError('Unknown molecular-gas mode');
    this.mode = mode;
    this.ui.setMode(mode);
    this._refreshUI();
    this._requestRedrawIfPaused();
  }

  _onTemperatureChange(valueK) {
    this.state.setTemperature(valueK);
    this._refreshAfterParameterChange();
  }

  _onAmountChange(valueMol) {
    this.state.setAmount(valueMol);
    this._refreshAfterParameterChange();
  }

  _onVolumeChange(valueLitres) {
    this.state.setVolume(valueLitres * PHYSICS.litresToCubicMetres);
    this.ensemble.setContainerWidth(containerWidthForVolume(this.state.volumeM3));
    this._refreshAfterParameterChange();
  }

  _onMolarMassChange(valueGrams) {
    this.state.setMolarMass(valueGrams * PHYSICS.gramsToKilograms);
    this._refreshAfterParameterChange();
  }

  _onCategoryChange(category) {
    const config = MOLECULE_CATEGORIES[category];
    if (!config) throw new RangeError('Unknown molecule category');
    this.state.setDegreesOfFreedom(config.degreesOfFreedom);
    if (!isDegreeFocusSupported(category, this.degreeFocus)) this.degreeFocus = 'all';
    this.ui.setCategory(category);
    this.ui.setDegreeAvailability(category);
    this.ui.setDegreeFocus(this.degreeFocus);
    this._refreshAfterParameterChange();
  }

  _onDegreeFocusChange(focus) {
    if (!DEGREE_FOCUS_OPTIONS[focus]) throw new RangeError('Unknown degree-of-freedom focus');
    if (!isDegreeFocusSupported(this.state.category, focus)) {
      throw new RangeError(`${DEGREE_FOCUS_OPTIONS[focus].label} is unavailable for ${this.state.category}`);
    }
    this.degreeFocus = focus;
    this.ui.setDegreeFocus(focus);
    this._refreshSummary();
    this._requestRedrawIfPaused();
  }

  _refreshAfterParameterChange() {
    this._refreshUI();
    this._requestRedrawIfPaused();
  }

  _onPlayToggle(isPlaying) {
    this.isPlaying = isPlaying;
    this.ui.setPlaying(isPlaying);
    this._refreshSummary();
    if (isPlaying) loop();
    else {
      noLoop();
      redraw();
    }
  }

  _pause() {
    this.isPlaying = false;
    this.ui.setPlaying(false);
    noLoop();
  }

  _onStep() {
    this._pause();
    this._advanceVisual(LIMITS.playback.stepSeconds);
    this._refreshSummary();
    redraw();
  }

  _onReset() {
    this._pause();
    this.animationTime = 0;
    this.collisionFlashes = [];
    this.ensemble.reset(containerWidthForVolume(this.state.volumeM3));
    this._refreshUI();
    redraw();
  }

  update(dt) {
    if (!this.isPlaying) return;
    this._advanceVisual(Math.min(dt, LIMITS.playback.maxDt));
  }

  _advanceVisual(dt) {
    this.animationTime += dt;
    this.collisionFlashes = this.collisionFlashes
      .map((flash) => ({ ...flash, age: flash.age + dt }))
      .filter((flash) => flash.age < LIMITS.collisionFlashes.lifetimeSeconds);
    if (this.mode === 'motion') {
      const events = this.ensemble.advance(dt, visualSpeedForRms(this.state.rmsSpeed));
      events.forEach((event) => this.collisionFlashes.push({ ...event, age: 0 }));
      if (this.collisionFlashes.length > LIMITS.collisionFlashes.max) {
        this.collisionFlashes.splice(0, this.collisionFlashes.length - LIMITS.collisionFlashes.max);
      }
    }
  }

  render(ctx, canvasWidth, canvasHeight) {
    drawMolecularGasScene(ctx, this.frameSnapshot(), canvasWidth, canvasHeight);
  }

  frameSnapshot() {
    const ensemble = this.ensemble.snapshot();
    const sampleSpeeds = ensemble.particles.slice(0, 6).map(
      (particle) => Math.hypot(particle.vx, particle.vy) * this.state.rmsSpeed,
    );
    return Object.freeze({
      mode: this.mode,
      isPlaying: this.isPlaying,
      animationTime: this.animationTime,
      degreeFocus: this.degreeFocus,
      degreeFocusLabel: DEGREE_FOCUS_OPTIONS[this.degreeFocus].label,
      supportedDegreeFocuses: Object.freeze([...degreeFocusesForCategory(this.state.category)]),
      category: this.state.category,
      categoryLabel: MOLECULE_CATEGORIES[this.state.category].label,
      degreesOfFreedom: this.state.degreesOfFreedom,
      temperatureK: this.state.temperatureK,
      amountMol: this.state.amountMol,
      volumeM3: this.state.volumeM3,
      molarMassKgPerMol: this.state.molarMassKgPerMol,
      moleculeCount: this.state.moleculeCount,
      moleculeMass: this.state.moleculeMass,
      density: this.state.density,
      meanSquaredSpeed: this.state.meanSquaredSpeed,
      rmsSpeed: this.state.rmsSpeed,
      sampleMeanSquaredSpeed: this.ensemble.sampleMeanSquaredSpeed * this.state.meanSquaredSpeed,
      sampleRmsSpeed: Math.sqrt(this.ensemble.sampleMeanSquaredSpeed * this.state.meanSquaredSpeed),
      pressure: this.state.pressure,
      kineticPressure: this.state.kineticPressure,
      meanEnergyPerDegree: this.state.meanEnergyPerDegree,
      meanTranslationalEnergy: this.state.meanTranslationalEnergy,
      totalTranslationalEnergy: this.state.totalTranslationalEnergy,
      internalEnergy: this.state.internalEnergy,
      sampleSpeeds: Object.freeze(sampleSpeeds),
      ensemble,
      collisionFlashes: Object.freeze(this.collisionFlashes.map((flash) => Object.freeze({ ...flash }))),
    });
  }

  _refreshUI() {
    const categoryLabel = MOLECULE_CATEGORIES[this.state.category].label;
    if (this.mode === 'motion') {
      this.ui.updateReadouts({
        labels: [
          'Temperature, T', 'Molar mass, M', 'Molecule mass, m', 'Molecules, N',
          'Density, ρ', 'RMS speed', 'P = nRT/V', 'P = ⅓ρv²ᵣₘₛ',
        ],
        values: [
          `${this.state.temperatureK.toFixed(0)} K`,
          `${(this.state.molarMassKgPerMol / PHYSICS.gramsToKilograms).toFixed(1)} g mol⁻¹`,
          scientificText(this.state.moleculeMass, 2, 'kg'),
          scientificText(this.state.moleculeCount, 2),
          `${this.state.density.toFixed(3)} kg m⁻³`,
          `${this.state.rmsSpeed.toFixed(0)} m s⁻¹`,
          `${(this.state.pressure / 1000).toFixed(1)} kPa`,
          `${(this.state.kineticPressure / 1000).toFixed(1)} kPa`,
        ],
      });
    } else {
      this.ui.updateReadouts({
        labels: [
          'Temperature, T', 'Degrees of freedom, f', 'Energy per degree', 'Mean translational K',
          'Total translational K', 'Internal energy, U', 'Molecules, N', 'Molecular category',
        ],
        values: [
          `${this.state.temperatureK.toFixed(0)} K`,
          `${this.state.degreesOfFreedom}`,
          scientificText(this.state.meanEnergyPerDegree, 2, 'J molecule⁻¹'),
          scientificText(this.state.meanTranslationalEnergy, 2, 'J molecule⁻¹'),
          `${(this.state.totalTranslationalEnergy / 1000).toFixed(2)} kJ`,
          `${(this.state.internalEnergy / 1000).toFixed(2)} kJ`,
          scientificText(this.state.moleculeCount, 2),
          categoryLabel,
        ],
      });
    }
    this._refreshSummary();
  }

  _refreshSummary() {
    const modeLabel = this.mode === 'motion' ? 'Molecular motion' : 'Energy and degrees of freedom';
    const playbackLabel = this.isPlaying ? 'Running' : 'Paused';
    const canvasSummary = this.mode === 'motion'
      ? `Representative 2D projection of 36 ideal-gas molecules. Analytic 3D rms speed is ${this.state.rmsSpeed.toFixed(0)} metres per second and both pressure equations give ${(this.state.pressure / 1000).toFixed(1)} kilopascals.`
      : `${MOLECULE_CATEGORIES[this.state.category].label} model with ${this.state.degreesOfFreedom} degrees of freedom. Visual focus: ${DEGREE_FOCUS_OPTIONS[this.degreeFocus].label}. Internal energy is ${(this.state.internalEnergy / 1000).toFixed(2)} kilojoules.`;
    this.ui.updateSummary({
      stageStatus: `${modeLabel} · ${playbackLabel}`,
      canvasSummary,
    });
  }

  _requestRedrawIfPaused() {
    if (!this.isPlaying) redraw();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SimulationController, scientificText, visualSpeedForRms };
}
