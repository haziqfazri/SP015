/* =========================================================================
   KINEMATICS-SHM-CONTROLLER.JS — Topic 7.1, SP015.
   SimulationController only: owns the physics objects, mode state, and
   playback state. No physics derivations, no drawing code. p5 GLOBAL
   mode — setup()/draw()/windowResized() live in sketch.js and call into
   this controller's update()/render(), rather than this file owning p5
   lifecycle calls itself (contrast with 7.2's/7.5's instance-mode
   controllers). Load after physics.js and renderer.js, before ui.js and
   sketch.js.
   ========================================================================= */

class SimulationController {
  constructor() {
    // Both oscillators are kept alive at all times (not recreated on
    // toggle) so switching systems back and forth never loses precision
    // or requires re-deriving state — only the active one is stepped/drawn.
    this.springOscillator = new SpringOscillator();
    this.pendulumOscillator = new PendulumOscillator();
    this.referencePhase = new ReferencePhase();
    this.signalHistory = new SignalHistory();
    this.ui = new UIManager();

    this.displacementVectorArrow = null;
    this.velocityVectorArrow = null;
    this.accelVectorArrow = null;
    this.forceVectorArrow = null;
  }

  init() {
    this.displacementVectorArrow = new VectorArrow(color(PALETTE.orange), 3);
    this.velocityVectorArrow = new VectorArrow(color(PALETTE.accent), 3);
    this.accelVectorArrow = new VectorArrow(color(PALETTE.ink), 3);
    this.forceVectorArrow = new VectorArrow(color(PALETTE.ink), 3);

    // Wire UIManager's callbacks back into the controller. UIManager never
    // touches the oscillators or the p5 canvas directly — it only reports
    // that something changed, and the controller decides what to do.
    Object.assign(this.ui.callbacks, {
      onSystemChange: () => {
        this.resize();
        this._resetActive();
        this._requestRedrawIfPaused();
      },
      onParamsChange: () => { this._resetActive(); this._requestRedrawIfPaused(); },
      onReset: () => { this._resetActive(); this._requestRedrawIfPaused(); },
      onDisplayChange: () => this._requestRedrawIfPaused(),
      onStep: (dt) => { this._stepActive(dt); this._requestRedrawIfPaused(); },
      onPlayToggle: (isPlaying) => {
        if (isPlaying) {
          loop();
        } else {
          noLoop();
          redraw(); // catch the final frame so the canvas doesn't freeze mid-frame
        }
      },
    });

    this.ui.configureControlRanges();
    this.ui.updateLabels();
    this.ui.updateReferenceControlOutputs();
    this._resetActive();
  }

  // Single resize path shared by windowResized() (sketch.js) and the
  // system toggle — the Reference tab swaps the canvas-shell to a taller
  // stacked layout, so a mode switch can change canvas size (unlike 7.6,
  // whose modes all share one canvas height).
  resize() {
    const holder = document.getElementById('canvas-holder');
    resizeCanvas(holder.clientWidth, holder.clientHeight);
  }

  activeOscillator() {
    if (this.ui.system === 'spring') return this.springOscillator;
    if (this.ui.system === 'pendulum') return this.pendulumOscillator;
    return null; // 'reference' tab has no Oscillator — its own phase clock arrives in a later step
  }

  _resetActive() {
    if (this.ui.system === 'reference') {
      this._resetReference();
      return;
    }

    const oscillator = this.activeOscillator();
    if (!oscillator) return; // reference tab: nothing to reset yet
    const p = this.ui.params();
    oscillator.reset(p.initial);
    this.ui.updateControlOutputs(oscillator);
    this.ui.updateReadout(oscillator);
  }

  _resetReference() {
    this.referencePhase.reset();
    this.signalHistory.clear();
    this._syncReferenceHistoryWindow();
    this.signalHistory.push(this.referencePhase.t, this.referencePhase.y(this.ui.referenceParams().A)); // seed t=0 at equilibrium so the trace never starts mid-jump
    this.ui.updateReferenceReadout(this.referencePhase, this.ui.referenceParams());
  }

  _syncReferenceHistoryWindow() {
    const { omega } = this.ui.referenceParams();
    const period = TWO_PI / omega;
    this.signalHistory.setWindow(period * 3); // keep ~3 cycles visible
  }

  _stepActive(dt) {
    if (this.ui.system === 'reference') {
      this._stepReference(dt);
      return;
    }
    const oscillator = this.activeOscillator();
    if (!oscillator) return;
    oscillator.integrate(dt, this.ui.physicsParams());
    this.ui.updateReadout(oscillator);
  }

  _stepReference(dt) {
    const { A, omega } = this.ui.referenceParams();
    this.referencePhase.advance(dt, omega);
    const y = this.referencePhase.y(A);
    this.signalHistory.push(this.referencePhase.t, y);
    this.ui.updateReferenceReadout(this.referencePhase, { A, omega });
  }

  _requestRedrawIfPaused() {
    const isPlaying = this.ui.playbackState?.isPlaying ?? this.ui.isPlaying;
    if (!isPlaying) redraw();
  }

  // dt is clamped by the caller (sketch.js) before reaching here —
  // coding.md §3's "dt always clamped" convention.
  update(dt) {
    const isPlaying = this.ui.playbackState?.isPlaying ?? this.ui.isPlaying;
    if (!isPlaying) return;
    this._stepActive(dt);
  }

  render() {
    background(PALETTE.panel); // --panel

    if (this.ui.system === 'spring') {
      const physics = this.ui.physicsParams();
      drawSpringSystem(window, this.springOscillator, physics, width, height, {
        showDisplacement: this.ui.showDisplacementVector,
        showVelocity: this.ui.showVelocityVector,
        showAccel: this.ui.showAccelerationVector,
        showForce: this.ui.showForceVector,
        displacementArrow: this.displacementVectorArrow,
        velocityArrow: this.velocityVectorArrow,
        accelArrow: this.accelVectorArrow,
        forceArrow: this.forceVectorArrow,
        // Renderer is unit→pixel only — derive the physical quantities here.
        acceleration: this.springOscillator.acceleration(physics),
        force: this.springOscillator.restoringForce(physics),
      });
    } else if (this.ui.system === 'pendulum') {
      drawPendulumSystem(window, this.pendulumOscillator, this.ui.physicsParams(), width, height);
    } else {
      const { A, omega } = this.ui.referenceParams();
      drawReferenceScene(window, this.referencePhase, A, omega, this.signalHistory, width, height, {
        showVelocity: this.ui.showVelocityVector,
        showAcceleration: this.ui.showAccelerationVector,
        velocityArrow: this.velocityVectorArrow,
        accelArrow: this.accelVectorArrow,
      });
    }
  }
}