/* =========================================================================
   SHM-GRAPHS-CONTROLLER.JS — Topic 7.2, SP015.
   SimulationController only: owns SHMOscillator, the history buffer for
   the time-series graphs, playback state, and the p5 canvas instances.
   No physics derivations, no drawing code. Load after physics.js and
   renderer.js, before ui-manager.js and sketch.js.
   ========================================================================= */

class SimulationController {
  constructor() {
    this.oscillator = new SHMOscillator(LIMITS.amplitudeDefault, LIMITS.omegaDefault);
    this.history = []; // { t, x, v, a } samples for the last graphTimeWindow seconds
    this.isPlaying = false;
    this.curveVisibility = { EK: true, EP: true, Etotal: true };

    this.system = 'standard'; // 'standard' | 'phaseShift'
    this.phase = 0;           // rad — Phase Shift mode only, reset on mode entry

    this.ui = new UIManager({
      onAmplitudeChange: (v) => this._onAmplitudeChange(v),
      onOmegaChange: (v) => this._onOmegaChange(v),
      onToggleCurve: (key, visible) => this._onToggleCurve(key, visible),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),
      onReset: () => this._onReset(),
      onStep: () => this._onStep(),
      onSystemChange: (system) => this._onSystemChange(system),
      onPhaseStep: (direction) => this._onPhaseStep(direction),
    });

    this._recordSample(); // seed history with t=0 point before first paint
    this._createCanvases();
    this._renderAll();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ----- callback handlers (UI -> physics) -----

  _onAmplitudeChange(value) {
    this.oscillator.setAmplitude(value);
    this._recordSample(); // reflect new A immediately, even while paused
    this._renderAll();
  }

  _onOmegaChange(value) {
    this.oscillator.setOmega(value);
    this._recordSample();
    this._renderAll();
  }

  _onToggleCurve(key, visible) {
    this.curveVisibility[key] = visible;
    this._renderAll();
  }

  _onPlayToggle(isPlaying) {
    this.isPlaying = isPlaying;
  }

  _onReset() {
    this.isPlaying = false;
    this.oscillator.reset();
    this.history = [];
    this._recordSample();
    this._renderAll();
  }

  _onStep() {
    this.oscillator.step(UI.stepDt);
    this._recordSample();
    this._renderAll();
  }

  // Standard Graphs mode keeps running underneath (its own instance loop
  // is untouched); Phase Shift mode has no clock, so entering it just
  // resets φ to 0 (per spec) and repaints its own canvas once. The phase
  // canvas is lazily created on first switch so the holder isn't
  // `display:none` (0×0) during the initial constructor pass.
  _onSystemChange(system) {
    this.system = system;
    this.ui.setSystem(system);

    if (system === 'phaseShift') {
      this.phase = 0;
      this.ui.updatePhaseReadout(this.phase);
      if (!this.phaseInstance) {
        this.phaseInstance = this._makeInstance('phase-holder', drawPhaseShiftGraph);
      }
      this._resizePhaseCanvas();
      this.phaseInstance.redraw();
    }
  }

  _onPhaseStep(direction) {
    this.phase = wrapPhase(this.phase + direction * PHASE_SHIFT.phaseStep);
    this.ui.updatePhaseReadout(this.phase);
    this.phaseInstance.redraw();
  }

  _resizePhaseCanvas() {
    const holder = document.getElementById('phase-holder');
    this.phaseInstance.resizeCanvas(holder.clientWidth, holder.clientHeight);
  }

  // ----- internal -----

  _recordSample() {
    const { t, x, v, a } = this.oscillator;
    this.history.push({ t, x, v, a });

    const cutoff = t - DISPLAY.graphTimeWindow;
    while (this.history.length && this.history[0].t < cutoff) {
      this.history.shift();
    }
    if (this.history.length > DISPLAY.historyMaxPoints) {
      this.history.shift();
    }
  }

  _renderAll() {
    this.ui.updateReadouts(this.oscillator);
    this.instances.forEach((instance) => instance.redraw());
  }

  _loop(timestampMs) {
    if (this._lastTimestamp !== undefined && this.isPlaying) {
      const rawDt = (timestampMs - this._lastTimestamp) / 1000;
      const dt = Math.min(rawDt, UI.maxDt);
      this.oscillator.step(dt);
      this._recordSample();
      this._renderAll();
    }
    this._lastTimestamp = timestampMs;
    requestAnimationFrame(this._loop);
  }

  _createCanvases() {
    this.instances = [
      this._makeInstance('oscillator-holder', drawOscillator),
      this._makeInstance('xt-holder', (p, c) => drawTimeSeriesGraph(p, c, 'x', PALETTE.orange, 'x (m)')),
      this._makeInstance('vt-holder', (p, c) => drawTimeSeriesGraph(p, c, 'v', PALETTE.teal, 'v (m/s)')),
      this._makeInstance('at-holder', (p, c) => drawTimeSeriesGraph(p, c, 'a', PALETTE.acid, 'a (m/s\u00B2)')),
      this._makeInstance('ex-holder', drawEnergyDisplacementGraph),
    ];
  }

  _makeInstance(holderId, drawFn) {
    return new p5((p) => {
      p.setup = () => {
        const holder = document.getElementById(holderId);
        const canvas = p.createCanvas(holder.clientWidth, holder.clientHeight);
        canvas.parent(holderId);
        p.noLoop(); // controller decides when to repaint, via .redraw()
      };
      p.draw = () => {
        p.clear();
        drawFn(p, this);
      };
      p.windowResized = () => {
        const holder = document.getElementById(holderId);
        if (holder.clientWidth === 0 || holder.clientHeight === 0) return;
        p.resizeCanvas(holder.clientWidth, holder.clientHeight);
      };
    });
  }
}
