/* =========================================================================
   WAVE-CONTROLLER.JS — Properties of Waves (SP015 Topic 7.4)

   Orchestration only: owns the WaveState instance, wires UIManager
   callbacks to state changes, drives play/pause/step/reset, and formats
   values into display strings for the UI manager to write. No direct DOM
   access, no canvas drawing — those stay in UIManager and the renderer.
   ========================================================================= */

const DISPLAY = {
  pxPerMetreX: 150,   // horizontal scale for the y-x panel
  pxPerMetreY: 220,   // vertical scale (displacement -> pixels) for both panels
  visibleWidthM: 6.0  // metres of x shown across the canvas width
};

class SimulationController {
  constructor(uiManager) {
    this.ui = uiManager;

    // Defaults chosen to sit mid-range on every slider so the initial
    // frame already shows a clear, moderate wave. waveSpeed=0.75, freq=0.5
    // -> derived wavelength = 1.5 m, comfortably within visibleWidthM.
    this.state = new WaveState(
      /* amplitude  */ 0.2,
      /* waveSpeed  */ 0.75,
      /* frequency  */ 0.5,
      /* direction  */ DIRECTION.POSITIVE
    );

    this.isPlaying = false;
    this.showParticles = false;
    this.showVyArrow = false;
    this.showGuides = false;
    this.particleCount = 7;

    // Reference particle's y-t history, consumed by the renderer for the
    // bottom panel. Controller owns this because it's simulation state
    // (what has happened over time), not a drawing concern.
    this.yHistory = [];
    this.yHistoryMaxLength = 300; // ~5s of trail at 60fps

    this._wireUI();
    this.ui.configureSliders({
      amplitude: { min: LIMITS.amplitudeMin, max: LIMITS.amplitudeMax, value: this.state.amplitude },
      waveSpeed: { min: LIMITS.waveSpeedMin, max: LIMITS.waveSpeedMax, value: this.state.waveSpeed },
      frequency: { min: LIMITS.frequencyMin, max: LIMITS.frequencyMax, value: this.state.frequency },
      particleCount: { min: LIMITS.particleCountMin, max: LIMITS.particleCountMax, value: this.particleCount }
    });

    this.ui.updatePlayPauseLabel(this.isPlaying);
    this._refreshReadouts();
    this._refreshEquations();
  }

  _wireUI() {
    this.ui.on({
      onAmplitudeChange: (value) => {
        this.state.amplitude = value;
        this._refreshReadouts();
      },
      onWaveSpeedChange: (value) => {
        this.state.waveSpeed = value;
        this._refreshReadouts();
      },
      onFrequencyChange: (value) => {
        this.state.frequency = value;
        this._refreshReadouts();
      },
      onParticleCountChange: (value) => {
        this.particleCount = value;
        this._refreshReadouts();
      },
      onParticlesToggle: (checked) => {
        this.showParticles = checked;
      },
      onVyArrowToggle: (checked) => {
        this.showVyArrow = checked;
      },
      onGuidesToggle: (checked) => {
        this.showGuides = checked;
      },
      onDirectionChange: (direction) => {
        this.state.direction = direction;
        this._refreshReadouts();
        this._refreshEquations();
      },
      onPlayPause: () => {
        this.isPlaying = !this.isPlaying;
        this.ui.updatePlayPauseLabel(this.isPlaying);
      },
      onStep: () => {
        // Single fixed step regardless of play state — lets students
        // advance frame-by-frame while paused to inspect phase changes.
        this._advance(1 / 60);
      },
      onReset: () => {
        this.state.reset();
        this.yHistory = [];
        this.isPlaying = false;
        this.ui.updatePlayPauseLabel(this.isPlaying);
        this._refreshReadouts();
      }
    });
  }

  // Called once per animation frame by the sketch. dt in seconds.
  update(dt) {
    if (this.isPlaying) {
      this._advance(dt);
    }
  }

  _advance(dt) {
    this.state.advance(dt);
    this._recordHistory();
    this._refreshReadouts();
  }

  // Reference particle sits at the centre of the visible x-range,
  // independent of particleCount/spacing, so its y-t trace doesn't jump
  // when the student changes how many particles are shown.
  get referenceX() {
    return DISPLAY.visibleWidthM / 2;
  }

  _recordHistory() {
    const y = this.state.displacementAt(this.referenceX);
    this.yHistory.push({ t: this.state.time, y });
    if (this.yHistory.length > this.yHistoryMaxLength) {
      this.yHistory.shift();
    }
  }

  // Evenly spaced particle x-positions for the current slider value,
  // recomputed on demand — cheap, and always must match the live count.
  get particlePositions() {
    return evenlySpacedPositions(this.particleCount, DISPLAY.visibleWidthM);
  }

  get referenceParticleIdx() {
    return referenceParticleIndex(this.particleCount);
  }

  // Resolves the theory strip's ± sign to the concrete sign matching the
  // current propagation direction — same convention as WaveState.phase():
  // +x travel uses (ωt − kx), −x travel uses (ωt + kx). Both y(x,t) and
  // vy show the same resolved sign, since vy = dy/dt shares the identical
  // phase argument (no calculus shown to students — this is presented as
  // a given equation, matching the theory strip's existing style).
  // Strings are TeX source — UIManager renders them through renderMath().
  _refreshEquations() {
    const sign = this.state.direction === DIRECTION.POSITIVE ? '-' : '+';

    this.ui.updateEquations({
      yxtText: `y(x,t) = A\\sin(\\omega t ${sign} kx)`,
      vyText: `v_y = A\\omega\\cos(\\omega t ${sign} kx)`
    });
  }

  _refreshReadouts() {
    const s = this.state;
    const y = s.displacementAt(this.referenceX);
    const vy = s.particleVelocityAt(this.referenceX);

    this.ui.updateReadouts({
      amplitudeText: `${s.amplitude.toFixed(2)} m`,
      waveSpeedText: `${s.waveSpeed.toFixed(2)} m/s`,
      frequencyText: `${s.frequency.toFixed(2)} Hz`,
      particleCountText: `${this.particleCount}`,

      timeText: `t = ${s.time.toFixed(2)} s`,
      lambdaText: `${s.wavelength.toFixed(2)} m (derived)`,
      fText: `${s.frequency.toFixed(2)} Hz`,
      TText: `${s.period.toFixed(2)} s`,
      vText: `${s.waveSpeed.toFixed(2)} m/s`,
      kText: `${s.waveNumber.toFixed(2)} rad/m`,
      omegaText: `${s.angularFrequency.toFixed(2)} rad/s`,
      yText: `${signedFixed(y, 3)} m`,
      vyText: `${signedFixed(vy, 3)} m/s`
    });
  }
}