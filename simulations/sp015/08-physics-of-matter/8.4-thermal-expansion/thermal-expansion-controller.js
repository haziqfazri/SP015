/* =========================================================================
   THERMAL-EXPANSION-CONTROLLER.JS — SP015 8.4(a–b).
   Owns physics, UI callbacks, playback, formatting, and render snapshots.
   ========================================================================= */

class SimulationController {
  constructor() {
    this.targetDeltaT = LIMITS.targetDeltaT.default;
    this.progress = LIMITS.progress.default;
    this.isPlaying = false;
    this.state = new ThermalExpansionState();
    this.ui = new UIManager();
    this.ui.on({
      onModeChange: (mode) => this._onModeChange(mode),
      onLinearLengthChange: (valueM) => this._onLinearLengthChange(valueM),
      onAreaChange: (valueM2) => this._onAreaChange(valueM2),
      onVolumeChange: (valueM3) => this._onVolumeChange(valueM3),
      onAlphaChange: (valueMicro) => this._onAlphaChange(valueMicro),
      onTargetDeltaTChange: (valueK) => this._onTargetDeltaTChange(valueK),
      onContainerCapacityChange: (valueLitres) => this._onContainerCapacityChange(valueLitres),
      onFillPercentChange: (valuePercent) => this._onFillPercentChange(valuePercent),
      onLiquidGammaChange: (valueMilli) => this._onLiquidGammaChange(valueMilli),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),
      onStep: () => this._onStep(),
      onReset: () => this._onReset(),
    });
    this._applyProgress();
    this.ui.setMode(this.state.mode);
    this._refreshReadouts();
  }

  _onModeChange(mode) {
    this.state.setMode(mode);
    this.ui.setMode(mode);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onLinearLengthChange(valueM) {
    this.state.setLinearLength(valueM);
    this._refreshAfterParameterChange();
  }

  _onAreaChange(valueM2) {
    this.state.setArea(valueM2);
    this._refreshAfterParameterChange();
  }

  _onVolumeChange(valueM3) {
    this.state.setVolume(valueM3);
    this._refreshAfterParameterChange();
  }

  _onAlphaChange(valueMicro) {
    this.state.setAlpha(valueMicro * PHYSICS.microCoefficient);
    this._refreshAfterParameterChange();
  }

  _onTargetDeltaTChange(valueK) {
    if (!Number.isFinite(valueK) || valueK < LIMITS.targetDeltaT.min || valueK > LIMITS.targetDeltaT.max) {
      throw new RangeError('Target temperature change is outside the configured limits');
    }
    this.targetDeltaT = valueK;
    this._applyProgress();
    this._refreshAfterParameterChange();
  }

  _onContainerCapacityChange(valueLitres) {
    this.state.setContainerCapacity(valueLitres * PHYSICS.litresToCubicMetres);
    this._refreshAfterParameterChange();
  }

  _onFillPercentChange(valuePercent) {
    this.state.setFillFraction(valuePercent / 100);
    this._refreshAfterParameterChange();
  }

  _onLiquidGammaChange(valueMilli) {
    this.state.setLiquidGamma(valueMilli * PHYSICS.milliCoefficient);
    this._refreshAfterParameterChange();
  }

  _refreshAfterParameterChange() {
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _applyProgress() {
    this.state.setDeltaT(this.targetDeltaT * this.progress);
  }

  _onPlayToggle(isPlaying) {
    if (isPlaying && this.progress >= LIMITS.progress.max) {
      this.progress = LIMITS.progress.min;
      this._applyProgress();
      this._refreshReadouts();
    }
    this.isPlaying = isPlaying;
    this.ui.setPlaying(isPlaying);
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
    this.progress = Math.min(LIMITS.progress.max, this.progress + LIMITS.progress.stepIncrement);
    this._applyProgress();
    this._refreshReadouts();
    redraw();
  }

  _onReset() {
    this._pause();
    this.progress = LIMITS.progress.min;
    this._applyProgress();
    this._refreshReadouts();
    redraw();
  }

  update(dt) {
    if (!this.isPlaying) return;
    this.progress = Math.min(LIMITS.progress.max, this.progress + Math.min(dt, 0.03) * LIMITS.playbackRate);
    this._applyProgress();
    this._refreshReadouts();
    if (this.progress >= LIMITS.progress.max) this._pause();
  }

  render(ctx, canvasWidth, canvasHeight) {
    drawThermalExpansionScene(ctx, this.frameSnapshot(), canvasWidth, canvasHeight);
  }

  frameSnapshot() {
    const initialByMode = {
      linear: this.state.linearLengthM,
      area: this.state.areaM2,
      volume: this.state.volumeM3,
      'liquid-container': this.state.initialLiquidVolumeM3,
    };
    const finalByMode = {
      linear: this.state.finalLengthM,
      area: this.state.finalAreaM2,
      volume: this.state.finalVolumeM3,
      'liquid-container': this.state.finalLiquidVolumeM3,
    };
    const initial = initialByMode[this.state.mode];
    const final = finalByMode[this.state.mode];
    const geometryRatio = this.state.mode === 'area'
      ? Math.sqrt(final / initial)
      : this.state.mode === 'volume'
        ? Math.cbrt(final / initial)
        : final / initial;
    return Object.freeze({
      mode: this.state.mode,
      progress: this.progress,
      targetDeltaT: this.targetDeltaT,
      deltaT: this.state.deltaTK,
      direction: this.state.deltaTK > 0 ? 'heating' : this.state.deltaTK < 0 ? 'cooling' : 'unchanged',
      initial,
      final,
      change: final - initial,
      geometryRatio,
      alphaPerK: this.state.alphaPerK,
      betaPerK: this.state.betaPerK,
      gammaPerK: this.state.gammaPerK,
      containerCapacityM3: this.state.containerCapacityM3,
      finalContainerCapacityM3: this.state.finalContainerCapacityM3,
      fillFraction: this.state.fillFraction,
      initialLiquidVolumeM3: this.state.initialLiquidVolumeM3,
      finalLiquidVolumeM3: this.state.finalLiquidVolumeM3,
      liquidGammaPerK: this.state.liquidGammaPerK,
      apparentExpansionM3: this.state.apparentExpansionM3,
      overflowM3: this.state.overflowM3,
    });
  }

  _requestRedrawIfPaused() {
    if (!this.isPlaying) redraw();
  }

  _refreshReadouts() {
    const mode = this.state.mode;
    const initial = mode === 'linear' ? `${this.state.linearLengthM.toFixed(3)} m`
      : mode === 'area' ? `${this.state.areaM2.toFixed(3)} m²`
        : mode === 'volume' ? `${this.state.volumeM3.toFixed(3)} m³`
          : `${(this.state.initialLiquidVolumeM3 * PHYSICS.cubicMetresToLitres).toFixed(3)} L`;
    const final = mode === 'linear' ? `${this.state.finalLengthM.toFixed(6)} m`
      : mode === 'area' ? `${this.state.finalAreaM2.toFixed(6)} m²`
        : mode === 'volume' ? `${this.state.finalVolumeM3.toFixed(6)} m³`
          : `${(this.state.finalLiquidVolumeM3 * PHYSICS.cubicMetresToLitres).toFixed(3)} L`;
    const change = mode === 'linear' ? `${signedFixed(this.state.deltaLengthM * 1e3, 3)} mm`
      : mode === 'area' ? `${signedFixed(this.state.deltaAreaM2 * 1e4, 3)} cm²`
        : mode === 'volume' ? `${signedFixed(this.state.deltaVolumeM3 * PHYSICS.cubicMetresToLitres, 3)} L`
          : `${signedFixed(this.state.deltaLiquidVolumeM3 * PHYSICS.cubicMetresToMillilitres, 2)} mL`;
    const derivedCoefficient = mode === 'volume'
      ? `${(this.state.gammaPerK / PHYSICS.microCoefficient).toFixed(0)} × 10⁻⁶ K⁻¹`
      : mode === 'liquid-container'
        ? `${(this.state.gammaPerK / PHYSICS.microCoefficient).toFixed(0)} × 10⁻⁶ K⁻¹`
        : `${(this.state.betaPerK / PHYSICS.microCoefficient).toFixed(0)} × 10⁻⁶ K⁻¹`;
    const apparent = mode === 'liquid-container'
      ? `${signedFixed(this.state.apparentExpansionM3 * PHYSICS.cubicMetresToMillilitres, 2)} mL`
      : 'Not applicable';
    const overflow = mode === 'liquid-container'
      ? `${(this.state.overflowM3 * PHYSICS.cubicMetresToMillilitres).toFixed(2)} mL`
      : 'Not applicable';
    const modeName = this._modeName();
    const direction = this.state.deltaTK > 0 ? 'Heating' : this.state.deltaTK < 0 ? 'Cooling' : 'Reference state';
    this.ui.updateReadouts({
      initial,
      final,
      change,
      deltaT: `${signedFixed(this.state.deltaTK, 1)} K`,
      alpha: `${(this.state.alphaPerK / PHYSICS.microCoefficient).toFixed(0)} × 10⁻⁶ K⁻¹`,
      derivedCoefficient,
      apparent,
      overflow,
      stageStatus: `${modeName} · ${direction} · ${Math.round(this.progress * 100)}%`,
      canvasSummary: this._canvasSummary(),
    });
  }

  _modeName() {
    return {
      linear: 'Linear',
      area: 'Area',
      volume: 'Volume',
      'liquid-container': 'Liquid + container',
    }[this.state.mode];
  }

  _canvasSummary() {
    const snapshot = this.frameSnapshot();
    if (snapshot.mode === 'liquid-container') {
      return 'Container and liquid outlines are exaggerated; overflow is calculated against the expanded capacity.';
    }
    return 'Geometry is exaggerated; numerical readouts use the first-order expansion model.';
  }
}
