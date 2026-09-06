/* =========================================================================
   WAVE-SUPERPOSITION-CONTROLLER.JS — Topic 7.5, SP015.
   SimulationController only: owns physics objects, playback state, p5
   instances. No physics derivations, no drawing code. Load after
   physics.js and renderer.js, before sketch.js.
   ========================================================================= */

const UI = {
  playbackRate: 1.0, // simulation seconds per real second while playing
};

class SimulationController {
  constructor() {
    const waveA = new PulseWave(PHYSICS.waveAStartX, +1, LIMITS.ampDefault, PHYSICS.pulseSpeed, PHYSICS.pulseWidth);
    const waveB = new PulseWave(PHYSICS.waveBStartX, -1, LIMITS.ampDefault, PHYSICS.pulseSpeed, PHYSICS.pulseWidth);
    this.superposition = new PulseSuperposition(waveA, waveB);

    this.t = LIMITS.timeMin;
    this.isPlaying = false;
    this.instance = null; // assigned by init()

    const interferenceWaveA = new ProgressiveWave(
      INTERFERENCE_LIMITS.ampDefault,
      INTERFERENCE_LIMITS.omegaDefault,
      INTERFERENCE_LIMITS.wavelengthDefault,
      0,
      WAVE_DIRECTION.POSITIVE_X
    );
    const interferenceWaveB = new ProgressiveWave(
      INTERFERENCE_LIMITS.ampDefault,
      INTERFERENCE_LIMITS.omegaDefault,
      INTERFERENCE_LIMITS.wavelengthDefault,
      INTERFERENCE_LIMITS.phaseDiffDefault,
      WAVE_DIRECTION.POSITIVE_X
    );
    this.interference = new InterferenceSystem(interferenceWaveA, interferenceWaveB);
    this.interferenceRelationship = INTERFERENCE_RELATIONSHIP.SAME;

    this.mode = 'pulse'; // 'pulse' | 'interference'
    this.interferenceT = 0;
    this.interferenceIsPlaying = false;
    this.interferenceInstances = null; // created lazily on first switch

    this.ui = new UIManager({
      onAmplitudeAChange: (v) => this._onAmplitudeChange(waveA, v),
      onAmplitudeBChange: (v) => this._onAmplitudeChange(waveB, v),
      onToggleCurve: () => this._requestRedrawIfPaused(),
      onScrub: (t) => this._onScrub(t),
      onPlayToggle: () => this._onPlayToggle(),
      onReset: () => this._onReset(),

      onModeChange: (mode) => this._onModeChange(mode),
      onInterferenceAmpChange: (v) => this._onInterferenceAmpChange(v),
      onInterferenceDirectionChange: (relationship) => this._onInterferenceDirectionChange(relationship),
      onWavelengthChange: (v) => this._onInterferenceWavelengthChange(v),
      onOmegaChangeInterference: (v) => this._onInterferenceOmegaChange(v),
      onPhaseDiffChange: (v) => this._onPhaseDiffChange(v),
      onInterferencePlayToggle: () => this._onInterferencePlayToggle(),
      onInterferenceReset: () => this._onInterferenceReset(),
      onInterferenceStep: () => this._onInterferenceStep(),
    });

    this._refreshInterferenceDirectionPresentation();
  }

  init() {
    this.instance = new p5((p) => {
      p.setup = () => {
        this.instance = p; // set here — p.setup fires before the outer assignment lands

        const holder = document.getElementById('canvas-holder');
        const cnv = p.createCanvas(holder.clientWidth, holder.clientHeight);
        cnv.parent('canvas-holder');
        p.pixelDensity(1);
        p.frameRate(60);
        p.noLoop();

        this._renderAll();
        p.redraw();
      };

      p.draw = () => {
        const dt = Math.min(p.deltaTime / 1000, 0.05);
        this.update(dt);
        this.render(p);
      };

      p.windowResized = () => {
        this.resize();
        if (!this.isPlaying) p.redraw();
      };
    });

    // Interference's 3 canvases share one clock via a single ticker
    // (rather than 3 independent draw() loops) so they stay in lockstep.
    this._interferenceLoopBound = this._interferenceLoop.bind(this);
    requestAnimationFrame(this._interferenceLoopBound);
  }

  resize() {
    const holder = document.getElementById('canvas-holder');
    this.instance.resizeCanvas(holder.clientWidth, holder.clientHeight);
  }

  // ----- Pulse mode callbacks -----

  _onAmplitudeChange(wave, value) {
    wave.setAmplitude(value);
    this._renderAll();
  }

  _onScrub(t) {
    this.t = t;
    this.isPlaying = false;
    this.ui.setPlayButtonLabel(false);
    this.instance.noLoop();
    this._renderAll();
  }

  _onPlayToggle() {
    if (this.t >= LIMITS.timeMax) this.t = LIMITS.timeMin; // restart from 0 at end of timeline

    this.isPlaying = !this.isPlaying;
    this.ui.setPlayButtonLabel(this.isPlaying);

    if (this.isPlaying) {
      this.instance.loop();
    } else {
      this.instance.noLoop();
      this.instance.redraw();
    }
  }

  _onReset() {
    this.t = LIMITS.timeMin;
    this.isPlaying = false;
    this.ui.setPlayButtonLabel(false);
    this.ui.setTimeScrubberValue(this.t);
    this.instance.noLoop();
    this._renderAll();
  }

  _requestRedrawIfPaused() {
    if (!this.isPlaying) this.instance.redraw();
  }

  _renderAll() {
    this.ui.updateReadouts(this.t, this.superposition.waveA.amplitude, this.superposition.waveB.amplitude, this.superposition);
    this._requestRedrawIfPaused();
  }

  update(dt) {
    if (!this.isPlaying) return;

    this.t += dt * UI.playbackRate;

    if (this.t >= LIMITS.timeMax) {
      this.t = LIMITS.timeMax;
      this.isPlaying = false;
      this.ui.setPlayButtonLabel(false);
      this.instance.noLoop();
    }

    this.ui.setTimeScrubberValue(this.t);
    this.ui.updateReadouts(this.t, this.superposition.waveA.amplitude, this.superposition.waveB.amplitude, this.superposition);
  }

  render(p) {
    p.background(PALETTE.panel);
    drawPulseScene(p, this);
  }

  // ----- Mode switching -----

  _onModeChange(mode) {
    if (mode === this.mode) return;

    // Pause whichever mode is being left.
    if (this.mode === 'pulse') {
      this.isPlaying = false;
      this.ui.setPlayButtonLabel(false);
      this.instance.noLoop();
    } else {
      this.interferenceIsPlaying = false;
      this.ui.setInterferencePlayButtonLabel(false);
    }

    this.mode = mode;
    this.ui.setMode(mode);

    if (mode === 'interference' && !this.interferenceInstances) {
      this._createInterferenceInstances(); // lazy — first switch only
    } else if (mode === 'interference') {
      this._renderInterferenceAll();
    }
  }

  _createInterferenceInstances() {
    const makeInstance = (holderId, drawFn) => new p5((p) => {
      p.setup = () => {
        const holder = document.getElementById(holderId);
        const cnv = p.createCanvas(holder.clientWidth, holder.clientHeight);
        cnv.parent(holderId);
        p.pixelDensity(1);
        p.noLoop(); // ticker drives every redraw manually
      };
      p.draw = () => drawFn(p, this);
      p.windowResized = () => {
        const holder = document.getElementById(holderId);
        p.resizeCanvas(holder.clientWidth, holder.clientHeight);
        p.redraw();
      };
    });

    this.interferenceInstances = {
      waveA: makeInstance('canvas-holder-wave-a', drawInterferenceWaveA),
      waveB: makeInstance('canvas-holder-wave-b', drawInterferenceWaveB),
      resultant: makeInstance('canvas-holder-resultant', drawInterferenceResultant),
    };

    this._renderInterferenceAll();
  }

  // Fixed per-frame timestep, not measured real elapsed time.
  _interferenceLoop() {
    if (this.mode === 'interference' && this.interferenceIsPlaying) {
      this.interferenceT += (1 / 60) * UI.playbackRate;
      this._renderInterferenceAll();
    }
    requestAnimationFrame(this._interferenceLoopBound);
  }

  _renderInterferenceAll() {
    this.ui.updateInterferenceReadouts(this.interferenceT, this.interference);
    if (this.interferenceInstances) {
      this.interferenceInstances.waveA.redraw();
      this.interferenceInstances.waveB.redraw();
      this.interferenceInstances.resultant.redraw();
    }
  }

  // ----- Interference callbacks -----
  // Amplitude/wavelength/omega apply to both waves; only phase is
  // asymmetric (Wave A fixed at 0; Wave B's phase is the Δφ slider).

  _onInterferenceDirectionChange(relationship) {
    if (!Object.values(INTERFERENCE_RELATIONSHIP).includes(relationship)) {
      throw new Error(`Unknown interference direction relationship: ${relationship}`);
    }

    this.interferenceRelationship = relationship;
    this.interference.waveA.setDirection(WAVE_DIRECTION.POSITIVE_X);
    this.interference.waveB.setDirection(
      relationship === INTERFERENCE_RELATIONSHIP.OPPOSITE
        ? WAVE_DIRECTION.NEGATIVE_X
        : WAVE_DIRECTION.POSITIVE_X
    );
    this._refreshInterferenceDirectionPresentation();
    this._renderInterferenceAll();
  }

  _refreshInterferenceDirectionPresentation() {
    const isOpposite = this.interferenceRelationship === INTERFERENCE_RELATIONSHIP.OPPOSITE;

    this.ui.updateInterferenceDirection({
      relationship: this.interferenceRelationship,
      waveALabel: 'WAVE A · +x',
      waveBLabel: isOpposite ? 'WAVE B · −x' : 'WAVE B · +x',
      directionNote: isOpposite
        ? 'Wave A travels in +x and Wave B in −x; their overlap forms a standing pattern.'
        : 'Both waves travel in +x; phase controls their amplitude relationship.',
      explanation: isOpposite
        ? 'With equal waves travelling in opposite directions, the resultant is a standing wave. Changing Δφ shifts the nodes and antinodes instead of producing uniform cancellation.'
        : 'With both waves travelling in +x, the resultant remains a travelling wave. Δφ = 0 doubles the amplitude and Δφ = π cancels it everywhere.',
      waveATex: 'y_A = A\\sin(\\omega t - kx)',
      waveAAria: 'Wave A travels in positive x: y sub A equals A sine of omega t minus k x.',
      waveBTex: isOpposite
        ? 'y_B = A\\sin(\\omega t + kx + \\Delta\\phi)'
        : 'y_B = A\\sin(\\omega t - kx + \\Delta\\phi)',
      waveBAria: isOpposite
        ? 'Wave B travels in negative x: y sub B equals A sine of omega t plus k x plus delta phi.'
        : 'Wave B travels in positive x: y sub B equals A sine of omega t minus k x plus delta phi.',
      resultantTex: isOpposite
        ? '\\begin{aligned} y_R &= 2A\\sin\\left(\\omega t + \\frac{\\Delta\\phi}{2}\\right) \\\\ &\\quad {}\\times\\cos\\left(kx + \\frac{\\Delta\\phi}{2}\\right) \\end{aligned}'
        : '\\begin{aligned} y_R &= 2A\\cos\\left(\\frac{\\Delta\\phi}{2}\\right) \\\\ &\\quad {}\\times\\sin\\left(\\omega t-kx+\\frac{\\Delta\\phi}{2}\\right) \\end{aligned}',
      resultantAria: isOpposite
        ? 'Opposite-direction resultant: a standing wave whose nodes and antinodes depend on delta phi.'
        : 'Same-direction resultant: a travelling wave whose amplitude depends on delta phi.',
      phaseNoteTex: isOpposite
        ? '\\Delta\\phi\\colon \\text{shifts node and antinode positions}'
        : '\\Delta\\phi = 0\\colon \\text{fully constructive} \\quad \\Delta\\phi = \\pi\\colon \\text{fully destructive}',
      phaseNoteAria: isOpposite
        ? 'Phase difference shifts node and antinode positions.'
        : 'Delta phi equals zero is fully constructive; delta phi equals pi is fully destructive.',
    });
  }

  _onInterferenceAmpChange(v) {
    this.interference.waveA.setAmplitude(v);
    this.interference.waveB.setAmplitude(v);
    this._renderInterferenceAll();
  }

  _onInterferenceWavelengthChange(v) {
    this.interference.waveA.setWavelength(v);
    this.interference.waveB.setWavelength(v);
    this._renderInterferenceAll();
  }

  _onInterferenceOmegaChange(v) {
    this.interference.waveA.setOmega(v);
    this.interference.waveB.setOmega(v);
    this._renderInterferenceAll();
  }

  _onPhaseDiffChange(v) {
    this.interference.waveB.setPhase(v);
    this._renderInterferenceAll();
  }

  _onInterferencePlayToggle() {
    this.interferenceIsPlaying = !this.interferenceIsPlaying;
    this.ui.setInterferencePlayButtonLabel(this.interferenceIsPlaying);
  }

  _onInterferenceReset() {
    this.interferenceIsPlaying = false;
    this.ui.setInterferencePlayButtonLabel(false);
    this.interferenceT = 0;
    this._renderInterferenceAll();
  }

  _onInterferenceStep() {
    this.interferenceIsPlaying = false;
    this.ui.setInterferencePlayButtonLabel(false);
    this.interferenceT += 0.05;
    this._renderInterferenceAll();
  }
}
