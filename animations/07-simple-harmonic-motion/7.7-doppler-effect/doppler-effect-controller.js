/* =========================================================================
   DOPPLER-EFFECT-CONTROLLER.JS — Topic 7.7, SP015.
   SimulationController only: owns the DopplerSystem, playback state, and
   the shared AudioTone. No physics derivations, no drawing code. Single
   canvas -> GLOBAL p5 mode (see architecture.md §3/§4: canvas-mode choice
   is about cross-canvas sync, not complexity — this sim only ever draws
   one canvas, so global mode is correct even though it's fully split).
   Load after physics.js and renderer.js, before ui.js and sketch.js.
   ========================================================================= */

const UI = {
  playbackRate: 1.0, // simulation seconds per real second while playing
};

class SimulationController {
  constructor() {
    this.mode = 'movingSource'; // 'movingSource' | 'movingObserver'

    // Both bodies always exist; whichever one is NOT the mover in the
    // current mode is pinned at x = 0 with velocity 0 by
    // _configureBodiesForMode(). Constructed directly here for the
    // initial 'movingSource' state so the constructor doesn't depend on
    // UIManager existing yet.
    this.sourceBody = new DopplerBody(DOMAIN.xMin, LIMITS.moverSpeedDefault);
    this.observerBody = new DopplerBody(0, 0);
    this.doppler = new DopplerSystem(
      this.mode, LIMITS.sourceFreqDefault, PHYSICS.waveSpeed, this.sourceBody, this.observerBody
    );

    this.t = LIMITS.timeMin;
    this.isPlaying = false;
    this.statusText = '—';

    this.audioTone = new AudioTone();
    this.audioEnabled = false;

    this.ui = new UIManager({
      onModeChange: (mode) => this._onModeChange(mode),
      onFrequencyChange: (v) => this._onFrequencyChange(v),
      onSpeedChange: (v) => this._onSpeedChange(v),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),
      onReset: () => this._onReset(),
      onAudioToggle: (enabled) => this._onAudioToggle(enabled),
    });

    this._refreshReadouts(); // DOM writes only — safe pre-canvas; no redraw() here (see sketch.js)
  }

  // ----- mode switching -----

  _onModeChange(mode) {
    if (mode === this.mode) return;

    this._forcePause();
    this.mode = mode;
    this.doppler.mode = mode;
    this._configureBodiesForMode(mode);

    this.t = LIMITS.timeMin;
    this.ui.setTimeLabel(this.t);
    this.ui.setMode(mode);

    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  // Re-pins startX/velocity on both bodies for the new mode, preserving
  // whatever speed the slider is currently set to (mode switch changes
  // WHO moves, not the chosen speed/frequency values).
  _configureBodiesForMode(mode) {
    const speed = this.ui.getSpeedValue();

    if (mode === 'movingSource') {
      this.sourceBody.startX = DOMAIN.xMin;
      this.sourceBody.velocity = speed;
      this.observerBody.startX = 0;
      this.observerBody.velocity = 0;
    } else {
      this.observerBody.startX = DOMAIN.xMin;
      this.observerBody.velocity = speed;
      this.sourceBody.startX = 0;
      this.sourceBody.velocity = 0;
    }
  }

  // ----- parameter callbacks -----

  _onFrequencyChange(v) {
    this.doppler.setSourceFrequency(v);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onSpeedChange(v) {
    this.doppler.setMoverSpeed(v);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  // ----- playback -----

  // GLOBAL p5 mode: this controller doesn't own a p5 instance (sketch.js
  // does), so play/pause must drive the global loop()/noLoop() directly —
  // template-controller.js leaves this as a stub comment for exactly this
  // reason; it's filled in here rather than left out.
  _onPlayToggle(isPlaying = !this.isPlaying) {
    if (this.t >= LIMITS.timeMax && isPlaying) this.t = LIMITS.timeMin; // restart from 0 at end of timeline

    this.isPlaying = isPlaying;
    this.ui.setPlayButtonLabel(this.isPlaying);

    if (this.isPlaying) {
      loop();
      if (this.audioEnabled) this._startAudio();
    } else {
      noLoop();
      redraw();
      this._stopAudio();
    }
  }

  // Used by mode-switch and reset — forces pause without toggling from a
  // possibly-already-paused state (same rationale as PlaybackState.pause()).
  _forcePause() {
    this.isPlaying = false;
    this.ui.playbackState.pause();
    this.ui.setPlayButtonLabel(false);
    this._stopAudio();
    noLoop();
  }

  _onReset() {
    this._forcePause();
    this.t = LIMITS.timeMin;
    this.ui.setTimeLabel(this.t);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  // ----- audio (opt-in checkbox, same policy in both modes) -----

  _onAudioToggle(enabled) {
    this.audioEnabled = enabled;
    if (enabled && this.isPlaying) {
      this._startAudio();
    } else if (!enabled) {
      this._stopAudio();
    }
  }

  _startAudio() {
    this.audioTone.start(this.doppler.apparentFrequency(this.t));
  }

  _stopAudio() {
    this.audioTone.stop();
  }

  // ----- per-frame update (t genuinely drives f' and position here, so
  // calling _refreshReadouts() every frame is the legitimate time-
  // dependent case per architecture.md §4, not the 7.6-style bug) -----

  update(dt) {
    if (!this.isPlaying) return;

    this.t += dt * UI.playbackRate;

    if (this.t >= LIMITS.timeMax) {
      this.t = LIMITS.timeMax;
      this._forcePause();
    }

    this.ui.setTimeLabel(this.t);
    this._refreshReadouts();

    if (this.audioEnabled && this.isPlaying) {
      this.audioTone.updateFrequency(this.doppler.apparentFrequency(this.t));
    }
  }

  render(ctx, width, height) {
    drawDopplerScene(ctx, this);
  }

  _requestRedrawIfPaused() {
    if (!this.isPlaying) redraw();
  }

  // ----- readouts -----

  _refreshReadouts() {
    const t = this.t;
    const fPrime = this.doppler.apparentFrequency(t);
    this.statusText = this._approachStatus(t); // read by the renderer for the on-canvas label

    this.ui.updateReadouts({
      apparentFreqText: `${fPrime.toFixed(1)} Hz`,
      sourceFreqText: `${this.doppler.sourceFrequency.toFixed(0)} Hz`,
      speedText: `${this.doppler.moverSpeed().toFixed(0)} m/s`,
      separationText: `${Math.abs(this.doppler.separationAt(t)).toFixed(1)} m`,
    });
  }

  _approachStatus(t) {
    if (this.doppler.moverSpeed() === 0) return '—';
    if (Math.abs(this.doppler.separationAt(t)) < 0.5) return 'Passing';
    return this.doppler.isApproaching(t) ? 'Approaching' : 'Receding';
  }
}
