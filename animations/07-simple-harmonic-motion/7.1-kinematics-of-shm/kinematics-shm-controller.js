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

    this._refLogCounter = 0; // used to throttle the reference phase logging to once per frame
  }

  init() {
    const holder = document.getElementById('canvas-holder');
    const cnv = createCanvas(holder.clientWidth, holder.clientHeight);
    cnv.parent('canvas-holder');

    this.displacementVectorArrow = new VectorArrow(color(255, 107, 53), 3);
    this.velocityVectorArrow = new VectorArrow(color(191, 90, 0), 3);
    this.accelVectorArrow = new VectorArrow(color(0, 0, 0), 3);

    pixelDensity(1);
    frameRate(60);

    // Wire UIManager's hooks back into the controller. UIManager never
    // touches the oscillators or the p5 canvas directly — it only reports
    // that something changed, and the controller decides what to do.
    this.ui.onSystemChange = () => { 
      this.resize();
      this._resetActive(); 
      this._requestRedrawIfPaused(); 
    };
    this.ui.onParamsChange = () => { this._resetActive(); this._requestRedrawIfPaused(); };
    this.ui.onReset = () => { this._resetActive(); this._requestRedrawIfPaused(); };
    this.ui.onDisplayChange = () => this._requestRedrawIfPaused();
    this.ui.onStep = (dt) => { this._stepActive(dt); this._requestRedrawIfPaused(); };
    this.ui.onPlayToggle = (isPlaying) => {
      if (isPlaying) {
        loop();
      } else {
        noLoop();
        redraw(); // catch the final frame so the canvas doesn't freeze mid-frame
      }
    };

    this.ui.configureControlRanges();
    this.ui.updateLabels();
    this.ui.updateReferenceControlOutputs();
    this._resetActive();

    noLoop();  // sim starts paused; draw() only runs on explicit redraw() until Play is pressed
    redraw();  // render one initial frame so the canvas isn't blank on load
  }

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

    // Throttled sanity-check log — remove once step 2 is verified.
    this._refLogCounter++;
  }

  _requestRedrawIfPaused() {
    const isPlaying = this.ui.playbackState?.isPlaying ?? this.ui.isPlaying;
    if (!isPlaying) redraw();
  }

  update() {
    const isPlaying = this.ui.playbackState?.isPlaying ?? this.ui.isPlaying;
    if (!isPlaying) return;
    const dt = Math.min(deltaTime / 1000, 0.03); // clamp so tab-switch stalls don't blow up the integration
    this._stepActive(dt);
  }

  render() {
    background(248, 250, 246); // --panel

    if (this.ui.system === 'spring') {
      drawSpringSystem(window, this.springOscillator, this.ui.physicsParams(), width, height, {
        showDisplacement: this.ui.showDisplacementVector,
        showVelocity: this.ui.showVelocityVector,
        showAccel: this.ui.showAccelerationVector,
        displacementArrow: this.displacementVectorArrow,
        velocityArrow: this.velocityVectorArrow,
        accelArrow: this.accelVectorArrow,
      });
    } else if (this.ui.system === 'pendulum') {
      drawPendulumSystem(window, this.pendulumOscillator, this.ui.physicsParams(), width, height);
    } else {
      const { A } = this.ui.referenceParams();
      drawReferenceScene(window, this.referencePhase, A, this.signalHistory, width, height);
    }
  }
}