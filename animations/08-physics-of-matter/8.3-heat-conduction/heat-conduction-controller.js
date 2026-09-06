/* =========================================================================
   HEAT-CONDUCTION-CONTROLLER.JS — SP015 8.3(a–c).
   Owns physics, UI callbacks, tracer playback, and display formatting.
   ========================================================================= */

class SimulationController {
  constructor() {
    this.mode = 'insulated';
    this.arrangement = 'one';
    this.selectedRod = 'A';
    this.exposurePattern = 'singleExposed';
    this.twoRodExposurePattern = 'bothExposed';
    this.isPlaying = false;
    this.tracerPhase = 0;
    this.rodA = new ConductionRod();
    this.rodB = new ConductionRod({
      conductivity: LIMITS.conductivityB.default,
    });
    this.system = new SeriesConductionSystem({ rods: [this.rodA] });
    this.heatLossProfile = new QualitativeHeatLossProfile();
    this.ui = new UIManager();
    this.ui.on({
      onModeChange: (mode) => this._onModeChange(mode),
      onArrangementChange: (arrangement) => this._onArrangementChange(arrangement),
      onExposurePatternChange: (exposurePattern) => this._onExposurePatternChange(exposurePattern),
      onRodSelectionChange: (rodKey) => this._onRodSelectionChange(rodKey),
      onHotTemperatureChange: (valueCelsius) => this._onBoundaryTemperatureChange('hot', valueCelsius),
      onColdTemperatureChange: (valueCelsius) => this._onBoundaryTemperatureChange('cold', valueCelsius),
      onRodLengthChange: (rodKey, valueM) => this._onRodLengthChange(rodKey, valueM),
      onRodAreaChange: (rodKey, valueCm2) => this._onRodAreaChange(rodKey, valueCm2),
      onRodConductivityChange: (rodKey, value) => this._onRodConductivityChange(rodKey, value),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),
      onStep: () => this._onStep(),
      onReset: () => this._onReset(),
    });
    this.ui.setBoundaryTemperatures(this.hotTemperatureC, this.coldTemperatureC);
    this._refreshReadouts();
  }

  get hotTemperatureC() {
    return kelvinToCelsius(this.system.hotTemperatureK);
  }

  get coldTemperatureC() {
    return kelvinToCelsius(this.system.coldTemperatureK);
  }

  _onModeChange(mode) {
    if (mode !== 'insulated' && mode !== 'nonInsulated') throw new RangeError('Unknown simulation mode');
    this.mode = mode;
    this.ui.setMode(mode);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onArrangementChange(arrangement) {
    if (arrangement !== 'one' && arrangement !== 'two') throw new RangeError('Unknown rod arrangement');
    this.arrangement = arrangement;
    if (arrangement === 'one') this.selectedRod = 'A';
    this.system.setRods(arrangement === 'one' ? [this.rodA] : [this.rodA, this.rodB]);
    if (arrangement === 'one') {
      if (EXPOSURE_PATTERNS.includes(this.exposurePattern)) this.twoRodExposurePattern = this.exposurePattern;
      this.exposurePattern = 'singleExposed';
    } else {
      this.exposurePattern = this.twoRodExposurePattern;
    }
    this.ui.setArrangement(arrangement);
    this.ui.setSelectedRod(this.selectedRod);
    this.ui.setExposurePattern(this.twoRodExposurePattern);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onExposurePatternChange(exposurePattern) {
    if (this.mode !== 'nonInsulated' || this.arrangement !== 'two') {
      throw new RangeError('Exposure patterns require two rods in non-insulated mode');
    }
    if (!EXPOSURE_PATTERNS.includes(exposurePattern)) throw new RangeError('Unknown exposure pattern');
    this.exposurePattern = exposurePattern;
    this.twoRodExposurePattern = exposurePattern;
    this.ui.setExposurePattern(exposurePattern);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onRodSelectionChange(rodKey) {
    if (rodKey !== 'A' && rodKey !== 'B') throw new RangeError('Unknown rod selection');
    if (rodKey === 'B' && this.arrangement !== 'two') throw new RangeError('Rod B requires two rods');
    this.selectedRod = rodKey;
    this.ui.setSelectedRod(rodKey);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onBoundaryTemperatureChange(boundary, valueCelsius) {
    const nextHot = boundary === 'hot' ? valueCelsius : this.hotTemperatureC;
    const nextCold = boundary === 'cold' ? valueCelsius : this.coldTemperatureC;
    try {
      this.system.setBoundaryTemperatures(celsiusToKelvin(nextHot), celsiusToKelvin(nextCold));
    } catch (error) {
      this.ui.setBoundaryTemperatures(this.hotTemperatureC, this.coldTemperatureC);
      this.ui.showValidation('Hot temperature must remain greater than cold temperature.');
      return false;
    }
    this.ui.setBoundaryTemperatures(nextHot, nextCold);
    this.ui.showValidation(null);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
    return true;
  }

  _rodForKey(rodKey) {
    if (rodKey === 'A') return this.rodA;
    if (rodKey === 'B') return this.rodB;
    throw new RangeError('Unknown rod key');
  }

  _onRodLengthChange(rodKey, valueM) {
    this._rodForKey(rodKey).setLength(valueM);
    this._refreshAfterParameterChange();
  }

  _onRodAreaChange(rodKey, valueCm2) {
    this._rodForKey(rodKey).setArea(valueCm2 * PHYSICS.squareCentimetresToSquareMetres);
    this._refreshAfterParameterChange();
  }

  _onRodConductivityChange(rodKey, value) {
    this._rodForKey(rodKey).setConductivity(value);
    this._refreshAfterParameterChange();
  }

  _refreshAfterParameterChange() {
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onPlayToggle(isPlaying) {
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
    this.tracerPhase = (this.tracerPhase + LIMITS.tracer.stepIncrement) % 1;
    redraw();
  }

  _onReset() {
    this._pause();
    this.tracerPhase = 0;
    redraw();
  }

  update(dt) {
    if (!this.isPlaying) return;
    this.tracerPhase = (this.tracerPhase + Math.min(dt, 0.03) * LIMITS.tracer.speed) % 1;
  }

  render(ctx, canvasWidth, canvasHeight) {
    drawHeatConductionScene(ctx, this.frameSnapshot(), canvasWidth, canvasHeight);
  }

  frameSnapshot() {
    const interfacePosition = this.system.rods.length === 2
      ? this.system.rods[0].lengthM / this.system.totalLength
      : null;
    const rods = this.system.rods.map((rod, index) => Object.freeze({
      key: index === 0 ? 'A' : 'B',
      lengthM: rod.lengthM,
      areaM2: rod.areaM2,
      conductivity: rod.conductivity,
      resistance: this.mode === 'insulated' ? rod.thermalResistance : null,
      insulated: this._isRodInsulated(index),
    }));
    const insulatedReference = Array.from({ length: DISPLAY.graphSamples + 1 }, (_, index) => {
        const position = index / DISPLAY.graphSamples;
        const temperatureK = this.system.temperatureAt(position * this.system.totalLength);
        return Object.freeze({ position, temperature: (temperatureK - this.system.coldTemperatureK) / this.system.temperatureDifference });
      });
    let graphPoints = insulatedReference;
    if (this.mode === 'nonInsulated') {
      graphPoints = this.arrangement === 'one'
        ? this.heatLossProfile.points(DISPLAY.graphSamples, this.rodA.conductivity)
        : this.heatLossProfile.compositePoints({
          interfacePosition,
          exposurePattern: this.exposurePattern,
          conductivityA: this.rodA.conductivity,
          conductivityB: this.rodB.conductivity,
          sampleCount: DISPLAY.graphSamples,
        });
    }
    return Object.freeze({
      mode: this.mode,
      arrangement: this.arrangement,
      exposurePattern: this.exposurePattern,
      tracerPhase: this.tracerPhase,
      hotTemperatureC: this.hotTemperatureC,
      coldTemperatureC: this.coldTemperatureC,
      totalLengthM: this.system.totalLength,
      rods,
      interfacePosition,
      interfaceTemperatureC: this.mode !== 'insulated' || this.system.interfaceTemperature === null
        ? null
        : kelvinToCelsius(this.system.interfaceTemperature),
      graphPoints,
      referenceGraphPoints: this.mode === 'nonInsulated'
        ? [Object.freeze({ position: 0, temperature: 1 }), Object.freeze({ position: 1, temperature: 0 })]
        : null,
    });
  }

  _isRodInsulated(index) {
    if (this.mode === 'insulated') return true;
    if (this.arrangement === 'one') return false;
    if (this.exposurePattern === 'aInsulated') return index === 0;
    if (this.exposurePattern === 'bInsulated') return index === 1;
    return false;
  }

  _requestRedrawIfPaused() {
    if (!this.isPlaying) redraw();
  }

  _refreshReadouts() {
    this._refreshRodControls();
    const hot = this.hotTemperatureC;
    const cold = this.coldTemperatureC;
    if (this.mode === 'nonInsulated') {
      const twoRods = this.arrangement === 'two';
      const caseLabel = this._exposureCaseLabel();
      this.ui.updateReadouts({
        heatRate: 'Not calculated',
        interfaceTemperature: twoRods ? 'Not calculated — side loss' : 'Not applicable',
        totalResistance: 'Not sufficient',
        temperatureDifference: `${(hot - cold).toFixed(0)} K`,
        resistanceA: 'Not used in schematic',
        resistanceB: twoRods ? 'Not used in schematic' : 'Not applicable',
        arrangement: twoRods ? 'Two rods in series' : 'One schematic rod',
        model: `Schematic — ${caseLabel}`,
        stageStatus: twoRods ? `Side loss · ${caseLabel}` : 'Non-insulated · qualitative',
        canvasSummary: twoRods
          ? `Two rods run from ${hot.toFixed(0)} °C to ${cold.toFixed(0)} °C. ${this._exposureSummary()} The interface temperature and heat rate are not calculated.`
          : `A schematic rod runs from ${hot.toFixed(0)} °C to ${cold.toFixed(0)} °C. Side heat loss bends its steady temperature profile below the insulated comparison.`,
      });
      return;
    }

    const twoRods = this.system.rods.length === 2;
    this.ui.updateReadouts({
      heatRate: this._formatHeatRate(this.system.heatRate),
      interfaceTemperature: twoRods ? `${kelvinToCelsius(this.system.interfaceTemperature).toFixed(1)} °C` : 'Not applicable',
      totalResistance: this._formatResistance(this.system.totalResistance),
      temperatureDifference: `${this.system.temperatureDifference.toFixed(0)} K`,
      resistanceA: this._formatResistance(this.rodA.thermalResistance),
      resistanceB: twoRods ? this._formatResistance(this.rodB.thermalResistance) : 'Not applicable',
      arrangement: twoRods ? 'Two rods in series' : 'One rod',
      model: 'Steady 1D · insulated',
      stageStatus: `Insulated · ${twoRods ? 'two rods' : 'one rod'}`,
      canvasSummary: twoRods
        ? `Heat flows from ${hot.toFixed(0)} °C to ${cold.toFixed(0)} °C through two rods in series. The interface is ${kelvinToCelsius(this.system.interfaceTemperature).toFixed(1)} °C.`
        : `Heat flows from ${hot.toFixed(0)} °C to ${cold.toFixed(0)} °C through one insulated rod.`,
    });
  }

  _refreshRodControls() {
    const rods = [this.rodA, this.rodB].map((rod, index) => ({
      key: index === 0 ? 'A' : 'B',
      lengthM: rod.lengthM,
      areaCm2: rod.areaM2 / PHYSICS.squareCentimetresToSquareMetres,
      conductivity: rod.conductivity,
      status: this._isRodInsulated(index) ? 'insulated' : 'exposed',
    }));
    const active = rods[this.selectedRod === 'A' ? 0 : 1];
    this.ui.setActiveRodParameters({ ...active, rodKey: active.key });
    this.ui.setRodSummaries({ A: rods[0], B: rods[1] });
  }

  _formatHeatRate(valueW) {
    return valueW >= 1000 ? `${(valueW / 1000).toFixed(2)} kW` : `${valueW.toFixed(2)} W`;
  }

  _formatResistance(value) {
    if (value >= 100) return `${value.toFixed(1)} K W⁻¹`;
    if (value >= 10) return `${value.toFixed(2)} K W⁻¹`;
    return `${value.toFixed(3)} K W⁻¹`;
  }

  _exposureCaseLabel() {
    if (this.arrangement === 'one') return 'side loss';
    if (this.exposurePattern === 'aInsulated') return 'A insulated';
    if (this.exposurePattern === 'bInsulated') return 'B insulated';
    return 'both exposed';
  }

  _exposureSummary() {
    if (this.exposurePattern === 'aInsulated') return 'Rod A is insulated and Rod B loses heat from its side.';
    if (this.exposurePattern === 'bInsulated') return 'Rod A loses heat from its side and Rod B is insulated.';
    return 'Both rods lose heat from their sides.';
  }
}
