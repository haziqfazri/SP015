// =========================================================================
// UIManager — connects HTML controls to the simulation state.
// Sole DOM accessor; SimulationController reacts via the hook callbacks.
// ========================================================================= 
class UIManager {
  constructor() {
    this.system = 'spring'; // 'spring' | 'pendulum'
    this.isPlaying = false;
    this.showDisplacementVector = false;
    this.showVelocityVector = false;
    this.showAccelerationVector = false;
    this.playbackState = null;

    // Assigned by SimulationController after construction.
    this.onSystemChange = null;   // (system) => {}
    this.onParamsChange = null;   // () => {}  (slider moved; caller should reset)
    this.onPlayToggle = null;     // (isPlaying) => {}
    this.onReset = null;          // () => {}
    this.onStep = null;           // (dt) => {}
    this.onDisplayChange = null;

    this._lastReadout = {};
    this._cacheEls();
    this._bindControls();
  }

  _cacheEls() {
    this.els = {
      springButton: document.getElementById('springSystemButton'),
      pendulumButton: document.getElementById('pendulumSystemButton'),
      referenceButton: document.getElementById('referenceSystemButton'),

      simGrid: document.getElementById('simGrid'),
      springPendulumControls: document.getElementById('springPendulumControls'),
      referenceControls: document.getElementById('referenceControls'),

      unitHint: document.getElementById('unitHint'),
      canvasLabel: document.getElementById('canvasLabel'),

      ampControl: document.getElementById('ampControl'),
      ampOutput: document.getElementById('ampOutput'),
      refPeriodControl: document.getElementById('refPeriodControl'),
      refPeriodOutput: document.getElementById('refPeriodOutput'),

      massControl: document.getElementById('massControl'),
      massOutput: document.getElementById('massOutput'),

      parameterControl: document.getElementById('parameterControl'),
      parameterOutput: document.getElementById('parameterOutput'),
      parameterLabel: document.getElementById('parameterLabel'),
      parameterNote: document.getElementById('parameterNote'),

      displacementControl: document.getElementById('displacementControl'),
      displacementOutput: document.getElementById('displacementOutput'),
      displacementLabel: document.getElementById('displacementLabel'),
      displacementNote: document.getElementById('displacementNote'),

      positionLabel: document.getElementById('positionLabel'),
      velocityLabel: document.getElementById('velocityLabel'),
      accelerationLabel: document.getElementById('accelerationLabel'),
      forceLabel: document.getElementById('forceLabel'),

      vectorToggleGroup: document.getElementById('vectorToggleGroup'),
      displacementVectorToggle: document.getElementById('toggleDisplacementVector'),
      velocityVectorToggle: document.getElementById('toggleVelocityVector'),
      accelerationVectorToggle: document.getElementById('toggleAccelerationVector'),

      timeValue: document.getElementById('timeValue'),
      positionValue: document.getElementById('positionValue'),
      velocityValue: document.getElementById('velocityValue'),
      accelerationValue: document.getElementById('accelerationValue'),
      forceValue: document.getElementById('forceValue'),
      forceReadout: document.getElementById('forceReadout'),
      periodValue: document.getElementById('periodValue'),
      periodNote: document.getElementById('periodNote'),

      springTheory: document.getElementById('springTheory'),
      pendulumTheory: document.getElementById('pendulumTheory'),
      periodTheoryContent: document.getElementById('periodTheoryContent'),
      readoutsPanel: document.getElementById('readoutsPanel'),

      playPauseButton: document.getElementById('playPauseButton'),
      playPauseLabel: document.getElementById('playPauseLabel'),
      resetButton: document.getElementById('resetButton'),
      stepButton: document.getElementById('stepButton'),
    };
  }

  // Returns a plain params object. Key names are generic (`parameter`)
  // rather than `k`/`L` so this method stays oscillator-agnostic; the
  // caller (SimulationController) maps `parameter` onto `k` or `L`
  // depending on which system is active before handing it to the
  // oscillator's integrate/energy/period methods.
  params() {
    return {
      m: Number(this.els.massControl.value),
      parameter: Number(this.els.parameterControl.value),
      initial: Number(this.els.displacementControl.value)
    };
  }

  // Builds the {m, k, c} or {m, L, c} shape a given oscillator expects.
  physicsParams() {
    const p = this.params();
    return this.system === 'spring'
      ? { m: p.m, k: p.parameter }
      : { m: p.m, L: p.parameter };
  }

  // Returns the {A, omega} shape the Reference Circle tab's phase clock
  // expects, independent of the spring/pendulum params() above.
  referenceParams() {
    const A = Number(this.els.ampControl.value);
    const T = Number(this.els.refPeriodControl.value);
    return { A, omega: TWO_PI / T };
  }

  _bindControls() {
    this._bindSystemToggle();
    this._bindSliders();
    this._bindReferenceSliders();
    this._bindPlaybackButtons();
    this._bindVectorToggles();
  }

  _bindSystemToggle() {
    const setSystem = (system) => {
      this.system = system;

      this.els.springButton.classList.toggle('is-active', system === 'spring');
      this.els.pendulumButton.classList.toggle('is-active', system === 'pendulum');
      this.els.referenceButton.classList.toggle('is-active', system === 'reference');
      this.els.vectorToggleGroup.classList.toggle('hidden', system !== 'spring');
      this.els.springButton.setAttribute('aria-pressed', String(system === 'spring'));
      this.els.pendulumButton.setAttribute('aria-pressed', String(system === 'pendulum'));
      this.els.referenceButton.setAttribute('aria-pressed', String(system === 'reference'));

      const isReference = system === 'reference';
      this.els.simGrid.classList.toggle('stacked-layout', isReference);
      this.els.springPendulumControls.classList.toggle('hidden', isReference);
      this.els.referenceControls.classList.toggle('hidden', !isReference);
      this.els.readoutsPanel.classList.toggle('hidden', isReference);

      if (isReference) {
        this.els.springTheory.style.display = 'none';
        this.els.pendulumTheory.style.display = 'none';
        this.els.periodTheoryContent.style.display = 'none'; // footer bar itself stays, just emptied
        this.els.canvasLabel.style.display = 'none'; // canvas draws its own column titles now
      } else {
        this.els.periodTheoryContent.style.display = 'block';
        this.els.canvasLabel.style.display = 'block';
        this.configureControlRanges();
        this.updateLabels();
      }

      if (this.onSystemChange) this.onSystemChange(system);
    };

    this.els.springButton.addEventListener('click', () => setSystem('spring'));
    this.els.pendulumButton.addEventListener('click', () => setSystem('pendulum'));
    this.els.referenceButton.addEventListener('click', () => setSystem('reference'));
  }

  _bindReferenceSliders() {
    const controls = [this.els.ampControl, this.els.refPeriodControl];
    controls.forEach((control) => {
      control.addEventListener('input', () => {
        this.updateReferenceControlOutputs();
        if (this.onParamsChange) this.onParamsChange();
      });
    });
  }

  updateReferenceControlOutputs() {
    const { A } = this.referenceParams();
    const T = Number(this.els.refPeriodControl.value);
    this.els.ampOutput.textContent = A.toFixed(2) + ' m';
    this.els.refPeriodOutput.textContent = T.toFixed(2) + ' s';
  }

  _bindVectorToggles() {
    this.els.displacementVectorToggle.addEventListener('change', () => {
      this.showDisplacementVector = this.els.displacementVectorToggle.checked;
      if (this.onDisplayChange) this.onDisplayChange();
    });
    this.els.velocityVectorToggle.addEventListener('change', () => {
      this.showVelocityVector = this.els.velocityVectorToggle.checked;
      if (this.onDisplayChange) this.onDisplayChange();
    });
    this.els.accelerationVectorToggle.addEventListener('change', () => {
      this.showAccelerationVector = this.els.accelerationVectorToggle.checked;
      if (this.onDisplayChange) this.onDisplayChange();
    });
  }

  _bindSliders() {
    const controls = [
      this.els.massControl,
      this.els.parameterControl,
      this.els.displacementControl
    ];
    controls.forEach((control) => {
      control.addEventListener('input', () => {
        if (this.onParamsChange) this.onParamsChange();
      });
    });
  }

  _bindPlaybackButtons() {
    this.playbackState = new PlaybackState({
      buttonEl: this.els.playPauseButton,
      playLabel: '▶ Play',
      pauseLabel: '⏸ Pause',
      onPlay: () => {
        this.isPlaying = true;
        if (this.onPlayToggle) this.onPlayToggle(true);
      },
      onPause: () => {
        this.isPlaying = false;
        if (this.onPlayToggle) this.onPlayToggle(false);
      }
    });

    this.els.playPauseButton.addEventListener('click', () => {
      this.playbackState.toggle();
    });

    this.els.resetButton.addEventListener('click', () => {
      this.playbackState.pause();
      if (this.onReset) this.onReset();
    });

    this.els.stepButton.addEventListener('click', () => {
      this.playbackState.pause();
      if (this.onStep) this.onStep(0.05);
    });
  }

  setPlayLabel(isPlaying) {
    this.els.playPauseLabel.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
  }

  // Swaps slider min/max/step/default when the system toggles, matching
  // the vanilla version's configureControlRanges().
  configureControlRanges() {
    if (this.system === 'spring') {
      this.els.parameterControl.min = '2';
      this.els.parameterControl.max = '80';
      this.els.parameterControl.step = '1';
      this.els.parameterControl.value = '20';

      this.els.displacementControl.min = '-0.7';
      this.els.displacementControl.max = '0.7';
      this.els.displacementControl.step = '0.05';
      this.els.displacementControl.value = '0.35';
    } else {
      this.els.parameterControl.min = '0.3';
      this.els.parameterControl.max = '4';
      this.els.parameterControl.step = '0.1';
      this.els.parameterControl.value = '3.5';

      this.els.displacementControl.min = '-0.9';
      this.els.displacementControl.max = '0.9';
      this.els.displacementControl.step = '0.05';
      this.els.displacementControl.value = '0.45';
    }
  }

  // Swaps static label/copy text between the two systems.
  updateLabels() {
    const spring = this.system === 'spring';

    this.els.canvasLabel.textContent = spring
      ? 'horizontal mass-spring system'
      : 'simple pendulum';

    this.els.parameterLabel.textContent = spring ? 'Spring constant, k' : 'String length, L';
    this.els.parameterNote.textContent = spring
      ? 'A stiffer spring pulls the mass back harder, shortening the period.'
      : 'A longer string means a larger arc for the same angle, lengthening the period.';

    this.els.displacementLabel.textContent = spring ? 'Initial displacement' : 'Initial angle';
    this.els.displacementNote.textContent = spring
      ? 'Starting distance from equilibrium — sets the amplitude.'
      : 'Starting angle from vertical — large angles deviate from ideal SHM.';

    this.els.positionLabel.textContent = spring ? 'Position' : 'Angle';
    this.els.velocityLabel.textContent = spring ? 'Velocity' : 'Angular velocity';
    this.els.accelerationLabel.textContent = spring ? 'Acceleration' : 'Angular acceleration';
    this.els.forceReadout.classList.toggle('hidden', !spring); // restoring force: spring-only for now

    this.els.periodNote.textContent = spring
      ? 'T = 2π√(m/k) — independent of amplitude for an ideal spring.'
      : 'T = 2π√(L/g) — exact only for small angles; large swings run slightly slower than this.';

    this.els.springTheory.style.display = spring ? 'block' : 'none';
    this.els.pendulumTheory.style.display = spring ? 'none' : 'block';
  }

  // Updates slider live-value spans and the ideal-period readout.
  updateControlOutputs(oscillator) {
    const p = this.params();
    const physics = this.physicsParams();

    this.els.massOutput.textContent = p.m.toFixed(1) + ' kg';

    if (this.system === 'spring') {
      this.els.parameterOutput.textContent = p.parameter.toFixed(0) + ' N/m';
      this.els.displacementOutput.textContent = p.initial.toFixed(2) + ' m';
      this.els.unitHint.textContent = 'x(t) / metres';
    } else {
      this.els.parameterOutput.textContent = p.parameter.toFixed(1) + ' m';
      this.els.displacementOutput.textContent = (p.initial * 180 / Math.PI).toFixed(0) + '°';
      this.els.unitHint.textContent = 'θ(t) / degrees';
    }

    this.els.periodValue.textContent = oscillator.period(physics).toFixed(2) + ' s';
  }

  // Updates the live readouts (time, position/angle, velocity, acceleration,
  // and — spring only — restoring force) with diffing against the
  // last-written value, same optimization as the UCM sim's updateReadout().
  updateReadout(oscillator) {
    const physics = this.physicsParams();
    const last = this._lastReadout;

    const time = oscillator.t.toFixed(2) + ' s';
    let position, velocity, acceleration;
    const isSpring = this.system === 'spring';

    if (isSpring) {
      position = signedFixed(oscillator.x, 3) + ' m';
      velocity = signedFixed(oscillator.v, 3) + ' m/s';
      acceleration = signedFixed(oscillator.acceleration(physics), 3) + ' m/s\u00b2';
    } else {
      position = signedFixed(oscillator.x * 180 / Math.PI, 1) + '°';
      velocity = signedFixed(oscillator.v * 180 / Math.PI, 1) + '°/s';
      acceleration = signedFixed(oscillator.acceleration(physics) * 180 / Math.PI, 1) + '°/s\u00b2';
    }

    if (last.time !== time) { this.els.timeValue.textContent = time; last.time = time; }
    if (last.position !== position) { this.els.positionValue.textContent = position; last.position = position; }
    if (last.velocity !== velocity) { this.els.velocityValue.textContent = velocity; last.velocity = velocity; }
    if (last.acceleration !== acceleration) { this.els.accelerationValue.textContent = acceleration; last.acceleration = acceleration; }

    if (isSpring) {
      const force = signedFixed(oscillator.restoringForce(physics), 3) + ' N';
      if (last.force !== force) { this.els.forceValue.textContent = force; last.force = force; }
    }
  }
}
