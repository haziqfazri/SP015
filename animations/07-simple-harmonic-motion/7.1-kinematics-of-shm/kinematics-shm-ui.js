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
    this.showForceVector = false;
    this.playbackState = null;

    // Filled in by SimulationController via Object.assign (coding.md §2).
    this.callbacks = {};

    this._lastReadout = {};
    this._cacheEls();
    this._renderStaticMath();
    this._bindControls();
  }

  // One-time pass over every element carrying a data-latex attribute
  // (theory-strip formulas, static readout/control label notation).
  // .formula elements render in displayMode; .katex-inline renders inline.
  _renderStaticMath() {
    document.querySelectorAll('[data-latex]').forEach((el) => {
      renderMath(el, el.dataset.latex, el.classList.contains('formula'));
    });
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
      parameterWord: document.getElementById('parameterWord'),
      parameterSymbol: document.getElementById('parameterSymbol'),
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
      forceVectorToggle: document.getElementById('toggleForceVector'),

      timeValue: document.getElementById('timeValue'),
      positionValue: document.getElementById('positionValue'),
      velocityValue: document.getElementById('velocityValue'),
      accelerationValue: document.getElementById('accelerationValue'),
      forceValue: document.getElementById('forceValue'),
      forceReadout: document.getElementById('forceReadout'),
      periodValue: document.getElementById('periodValue'),
      springTheory: document.getElementById('springTheory'),
      pendulumTheory: document.getElementById('pendulumTheory'),
      periodTheoryContent: document.getElementById('periodTheoryContent'),
      periodFormula: document.getElementById('periodFormula'),
      periodNoteWord: document.getElementById('periodNoteWord'),
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
      this.els.springButton.setAttribute('aria-pressed', String(system === 'spring'));
      this.els.pendulumButton.setAttribute('aria-pressed', String(system === 'pendulum'));
      this.els.referenceButton.setAttribute('aria-pressed', String(system === 'reference'));

      const isReference = system === 'reference';
      const isPendulum = system === 'pendulum';
      this.els.simGrid.classList.toggle('stacked-layout', isReference);
      this.els.springPendulumControls.classList.toggle('hidden', isReference);
      this.els.referenceControls.classList.toggle('hidden', !isReference);

      // Vector toggle group: show on spring & reference, hide on pendulum.
      this.els.vectorToggleGroup.classList.toggle('hidden', isPendulum);
      // On the reference tab, position is always drawn and force is
      // undefined — hide those two checkboxes.
      this.els.displacementVectorToggle.parentElement.classList.toggle('hidden', isReference);
      this.els.forceVectorToggle.parentElement.classList.toggle('hidden', isReference);

      if (isReference) {
        this.els.readoutsPanel.classList.toggle('hidden', false);
        this.els.forceReadout.classList.toggle('hidden', true);
        this.els.positionLabel.textContent = 'Displacement y';
        this.els.velocityLabel.textContent = 'Velocity';
        this.els.accelerationLabel.textContent = 'Acceleration';
        this.els.unitHint.textContent = 'y(t) / metres\u00A0\u00A0|\u00A0\u00A0v(t) / m\u00B7s\u207B\u00B9\u00A0\u00A0|\u00A0\u00A0a(t) / m\u00B7s\u207B\u00B2';

        this.els.springTheory.style.display = 'none';
        this.els.pendulumTheory.style.display = 'none';
        this.els.periodTheoryContent.style.display = 'none';
        this.els.canvasLabel.style.display = 'none';
      } else {
        // Restore standard layout labels (spring/pendulum).
        this.els.readoutsPanel.classList.toggle('hidden', false);
        this.els.periodTheoryContent.style.display = 'block';
        this.els.canvasLabel.style.display = 'block';
        this.configureControlRanges();
        this.updateLabels();
        // Unhide the checkboxes that reference mode hides.
        this.els.displacementVectorToggle.parentElement.classList.toggle('hidden', false);
        this.els.forceVectorToggle.parentElement.classList.toggle('hidden', false);
      }

      if (this.callbacks.onSystemChange) this.callbacks.onSystemChange(system);
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
        if (this.callbacks.onParamsChange) this.callbacks.onParamsChange();
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
      if (this.callbacks.onDisplayChange) this.callbacks.onDisplayChange();
    });
    this.els.velocityVectorToggle.addEventListener('change', () => {
      this.showVelocityVector = this.els.velocityVectorToggle.checked;
      if (this.callbacks.onDisplayChange) this.callbacks.onDisplayChange();
    });
    this.els.accelerationVectorToggle.addEventListener('change', () => {
      this.showAccelerationVector = this.els.accelerationVectorToggle.checked;
      if (this.callbacks.onDisplayChange) this.callbacks.onDisplayChange();
    });
    this.els.forceVectorToggle.addEventListener('change', () => {
      this.showForceVector = this.els.forceVectorToggle.checked;
      if (this.callbacks.onDisplayChange) this.callbacks.onDisplayChange();
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
        if (this.callbacks.onParamsChange) this.callbacks.onParamsChange();
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
        if (this.callbacks.onPlayToggle) this.callbacks.onPlayToggle(true);
      },
      onPause: () => {
        this.isPlaying = false;
        if (this.callbacks.onPlayToggle) this.callbacks.onPlayToggle(false);
      }
    });

    this.els.playPauseButton.addEventListener('click', () => {
      this.playbackState.toggle();
    });

    this.els.resetButton.addEventListener('click', () => {
      this.playbackState.pause();
      if (this.callbacks.onReset) this.callbacks.onReset();
    });

    this.els.stepButton.addEventListener('click', () => {
      this.playbackState.pause();
      if (this.callbacks.onStep) this.callbacks.onStep(LIMITS.ui.stepDt);
    });
  }

  // Swaps slider min/max/step/default when the system toggles, reading the
  // ranges from the LIMITS constant block (single source of truth).
  configureControlRanges() {
    const isSpring = this.system === 'spring';
    const L = isSpring ? LIMITS.spring : LIMITS.pendulum;

    const param = isSpring
      ? { min: L.kMin, max: L.kMax, step: L.kStep, value: L.kDefault }
      : { min: L.lengthMin, max: L.lengthMax, step: L.lengthStep, value: L.lengthDefault };

    this.els.parameterControl.min = String(param.min);
    this.els.parameterControl.max = String(param.max);
    this.els.parameterControl.step = String(param.step);
    this.els.parameterControl.value = String(param.value);

    this.els.displacementControl.min = String(L.initialMin);
    this.els.displacementControl.max = String(L.initialMax);
    this.els.displacementControl.step = String(L.initialStep);
    this.els.displacementControl.value = String(L.initialDefault);
  }

  // Swaps static label/copy text between the two systems.
  updateLabels() {
    const spring = this.system === 'spring';

    this.els.canvasLabel.textContent = spring
      ? 'horizontal mass-spring system'
      : 'simple pendulum';

    this.els.parameterWord.textContent = spring ? 'Spring constant' : 'String length';
    renderMath(this.els.parameterSymbol, spring ? 'k' : 'L');
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

    renderMath(this.els.periodFormula, spring
      ? 'T = 2\\pi\\sqrt{m/k}'
      : 'T = 2\\pi\\sqrt{L/g}');
    this.els.periodNoteWord.textContent = spring
      ? ' — independent of amplitude for an ideal spring.'
      : ' — exact only for small angles; large swings run slightly slower than this.';

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
  // and — spring only — restoring force) using the shared diffing helper.
  updateReadout(oscillator) {
    const physics = this.physicsParams();
    const store = this._lastReadout;
    const isSpring = this.system === 'spring';

    const time = oscillator.t.toFixed(2) + ' s';

    if (isSpring) {
      updateReadout(store, 'time', this.els.timeValue, time);
      updateReadout(store, 'position', this.els.positionValue, signedFixed(oscillator.x, 3) + ' m');
      updateReadout(store, 'velocity', this.els.velocityValue, signedFixed(oscillator.v, 3) + ' m/s');
      updateReadout(store, 'acceleration', this.els.accelerationValue, signedFixed(oscillator.acceleration(physics), 3) + ' m/s\u00b2');
      updateReadout(store, 'force', this.els.forceValue, signedFixed(oscillator.restoringForce(physics), 3) + ' N');
    } else {
      updateReadout(store, 'time', this.els.timeValue, time);
      updateReadout(store, 'position', this.els.positionValue, signedFixed(oscillator.x * 180 / Math.PI, 1) + '°');
      updateReadout(store, 'velocity', this.els.velocityValue, signedFixed(oscillator.v * 180 / Math.PI, 1) + '°/s');
      updateReadout(store, 'acceleration', this.els.accelerationValue, signedFixed(oscillator.acceleration(physics) * 180 / Math.PI, 1) + '°/s\u00b2');
    }
  }

  // Reference-tab live readouts — t-dependent, called per-frame by
  // SimulationController._stepReference (the legitimate per-frame case
  // per architecture.md §5) and once on reset.
  updateReferenceReadout(phase, { A, omega }) {
    const store = this._lastReadout;
    const time = phase.t.toFixed(2) + ' s';

    updateReadout(store, 'time', this.els.timeValue, time);
    updateReadout(store, 'position', this.els.positionValue, signedFixed(phase.y(A), 3) + ' m');
    updateReadout(store, 'velocity', this.els.velocityValue, signedFixed(phase.vY(A, omega), 3) + ' m/s');
    updateReadout(store, 'acceleration', this.els.accelerationValue, signedFixed(phase.aY(A, omega), 3) + ' m/s\u00b2');
  }
}
