/* =========================================================================
   MATERIALS-TESTING-CONTROLLER.JS — SP015 8.1–8.2.
   Owns playback, physics objects, UI wiring, and immutable render snapshots.
   ========================================================================= */

class SimulationController {
  constructor() {
    this.mode = 'elastic';
    this.preset = 'ductile';
    this.progress = LIMITS.progress.default;
    this.targetDeltaLM = LIMITS.targetDeltaL.default * PHYSICS.centimetresToMetres;
    this.isPlaying = false;
    this.elasticSpecimen = new ElasticSpecimen();
    this.materialCurve = new IdealizedMaterialCurve(this.preset);
    this.ui = new UIManager();
    this.ui.on({
      onModeChange: (mode) => this._onModeChange(mode),
      onLoadingTypeChange: (type) => this._onLoadingTypeChange(type),
      onOriginalLengthChange: (valueM) => this._onOriginalLengthChange(valueM),
      onAreaChange: (valueMm2) => this._onAreaChange(valueMm2),
      onYoungModulusChange: (valueGPa) => this._onYoungModulusChange(valueGPa),
      onTargetDeformationChange: (valueCm) => this._onTargetDeformationChange(valueCm),
      onPresetChange: (preset) => this._onPresetChange(preset),
      onProgressChange: (progress) => this._onProgressChange(progress),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),
      onStep: () => this._onStep(),
      onReset: () => this._onReset(),
    });
    this._applyProgress();
    this._refreshReadouts();
  }

  _onModeChange(mode) {
    if (mode !== 'elastic' && mode !== 'comparison') throw new RangeError('Unknown simulation mode');
    this.mode = mode;
    this.ui.setMode(mode);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onLoadingTypeChange(type) {
    this.elasticSpecimen.setLoadingType(type);
    this.ui.setLoadingType(type);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onOriginalLengthChange(valueM) {
    this.elasticSpecimen.setOriginalLength(valueM);
    this._applyProgress();
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onAreaChange(valueMm2) {
    this.elasticSpecimen.setArea(valueMm2 * PHYSICS.squareMillimetresToSquareMetres);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onYoungModulusChange(valueGPa) {
    this.elasticSpecimen.setYoungModulus(valueGPa * PHYSICS.gigapascalsToPascals);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onTargetDeformationChange(valueCm) {
    if (!Number.isFinite(valueCm) || valueCm < LIMITS.targetDeltaL.min || valueCm > LIMITS.targetDeltaL.max) {
      throw new RangeError('Target deformation is outside the configured limits');
    }
    this.targetDeltaLM = valueCm * PHYSICS.centimetresToMetres;
    this._applyProgress();
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onPresetChange(preset) {
    this.materialCurve.setPreset(preset);
    this.preset = preset;
    this.ui.setPreset(preset);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onProgressChange(progress) {
    if (!Number.isFinite(progress) || progress < LIMITS.progress.min || progress > LIMITS.progress.max) {
      throw new RangeError('Progress is outside the configured limits');
    }
    this.progress = progress;
    this._applyProgress();
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onPlayToggle(isPlaying) {
    if (isPlaying && this.progress >= LIMITS.progress.max) {
      this.progress = LIMITS.progress.min;
      this._applyProgress();
      this.ui.setProgress(this.progress);
      this._refreshReadouts();
    }
    this.isPlaying = isPlaying;
    this.ui.setPlaying(isPlaying);
    if (isPlaying) {
      loop();
    } else {
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
    this.progress = Math.min(LIMITS.progress.max, this.progress + LIMITS.progress.stepIncrement);
    this._applyProgress();
    this.ui.setProgress(this.progress);
    this._refreshReadouts();
    redraw();
  }

  _onReset() {
    this._pause();
    this.progress = LIMITS.progress.min;
    this.elasticSpecimen.reset();
    this.ui.setProgress(this.progress);
    this._refreshReadouts();
    redraw();
  }

  _applyProgress() {
    this.elasticSpecimen.setDeformationMagnitude(this.targetDeltaLM * this.progress);
  }

  update(dt) {
    if (!this.isPlaying) return;
    const nextProgress = Math.min(LIMITS.progress.max, this.progress + Math.min(dt, 0.03) * LIMITS.playbackRate);
    const pauseProgress = this._nextComparisonPause(this.progress, nextProgress);
    this.progress = pauseProgress ?? nextProgress;
    this._applyProgress();
    this.ui.setProgress(this.progress);
    this._refreshReadouts();
    if (pauseProgress !== null || this.progress >= LIMITS.progress.max) this._pause();
  }

  _nextComparisonPause(startProgress, endProgress) {
    if (this.mode !== 'comparison' || this.preset !== 'ductile') return null;
    const nextPoint = CHARACTERISTIC_POINTS.find(({ pointIndex }) => {
      const threshold = MATERIAL_CURVES.ductile[pointIndex].progress;
      return threshold > startProgress && threshold <= endProgress;
    });
    return nextPoint === undefined ? null : MATERIAL_CURVES.ductile[nextPoint.pointIndex].progress;
  }

  render(ctx, canvasWidth, canvasHeight) {
    drawMaterialsTestingScene(ctx, this.frameSnapshot(), canvasWidth, canvasHeight);
  }

  frameSnapshot() {
    const elastic = Object.freeze({
      loadingType: this.elasticSpecimen.loadingType,
      originalLengthM: this.elasticSpecimen.originalLengthM,
      areaM2: this.elasticSpecimen.areaM2,
      deltaL: this.elasticSpecimen.deltaL,
      strain: this.elasticSpecimen.strain,
      stress: this.elasticSpecimen.stress,
      force: this.elasticSpecimen.force,
      strainEnergy: this.elasticSpecimen.strainEnergy,
      energyDensity: this.elasticSpecimen.energyDensity,
      reference: this.elasticSpecimen.sampleAtMagnitude(this.targetDeltaLM),
    });
    const comparison = Object.freeze({
      selected: this.materialCurve.sample(this.progress),
      ductilePoints: MATERIAL_CURVES.ductile,
      brittlePoints: MATERIAL_CURVES.brittle,
    });
    return Object.freeze({
      mode: this.mode,
      preset: this.preset,
      progress: this.progress,
      state: this.mode === 'elastic' ? (this.progress === 0 ? 'Unloaded' : 'Elastic') : comparison.selected.state,
      elastic,
      comparison,
    });
  }

  _requestRedrawIfPaused() {
    if (!this.isPlaying) redraw();
  }

  _refreshReadouts() {
    const state = this.mode === 'elastic'
      ? (this.progress === 0 ? 'Unloaded' : 'Elastic')
      : this.materialCurve.sample(this.progress).state;
    const stageStatus = this.mode === 'elastic'
      ? `${state} · ${Math.round(this.progress * 100)}%`
      : `${this.preset[0].toUpperCase()}${this.preset.slice(1)} · ${state}`;
    if (this.mode === 'elastic') {
      const specimen = this.elasticSpecimen;
      this.ui.updateReadouts({
        strain: signedFixed(specimen.strain, 6),
        stress: `${signedFixed(specimen.stress / 1e6, 2)} MPa`,
        force: this._formatForce(specimen.force),
        deltaL: `${signedFixed(specimen.deltaL / PHYSICS.centimetresToMetres, 3)} cm`,
        modulus: `${(specimen.youngModulusPa / PHYSICS.gigapascalsToPascals).toFixed(0)} GPa`,
        energy: `${specimen.strainEnergy.toFixed(3)} J`,
        density: this._formatDensity(specimen.energyDensity),
        state,
        stageStatus,
      });
    } else {
      this.ui.updateReadouts({ stageStatus });
    }
    this.ui.setActiveCharacteristic(this._activeCharacteristicPoint());
  }

  _formatForce(forceN) {
    return Math.abs(forceN) >= 1000
      ? `${signedFixed(forceN / 1000, 2)} kN`
      : `${signedFixed(forceN, 2)} N`;
  }

  _formatDensity(value) {
    return value >= 1000 ? `${(value / 1000).toFixed(2)} kJ m⁻³` : `${value.toFixed(2)} J m⁻³`;
  }

  _activeCharacteristicPoint() {
    if (this.mode !== 'comparison' || this.preset !== 'ductile') return null;
    const reached = CHARACTERISTIC_POINTS.filter(({ pointIndex }) => (
      this.progress >= MATERIAL_CURVES.ductile[pointIndex].progress
    ));
    return reached.length > 0 ? reached[reached.length - 1].key : null;
  }
}
