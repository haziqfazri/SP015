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
    this._resetWavefrontHistory();

    this.audioTone = new AudioTone();
    this.audioEnabled = false;

    this.ui = new UIManager({
      onModeChange: (mode) => this._onModeChange(mode),
      onFrequencyChange: (v) => this._onFrequencyChange(v),
      onSpeedChange: (v) => this._onSpeedChange(v),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),
      onStep: () => this._onStep(),
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
    this._resetWavefrontHistory();
    this.ui.setTimeLabel(this.t);
    this.ui.setMode(mode);

    this._refreshReadouts();
    this.ui.announce(mode === 'movingSource' ? 'Moving source mode selected.' : 'Moving observer mode selected.');
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
    this.doppler.setMoverSpeed(v, this.t);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  // ----- playback -----

  // GLOBAL p5 mode: this controller doesn't own a p5 instance (sketch.js
  // does), so play/pause must drive the global loop()/noLoop() directly —
  // template-controller.js leaves this as a stub comment for exactly this
  // reason; it's filled in here rather than left out.
  _onPlayToggle(isPlaying = !this.isPlaying) {
    this.isPlaying = isPlaying;
    this.ui.setPlayButtonLabel(this.isPlaying);

    if (this.isPlaying) {
      loop();
      if (this.audioEnabled) this._startAudio();
      this.ui.announce('Simulation playing.');
    } else {
      noLoop();
      redraw();
      this._stopAudio();
      this.ui.announce('Simulation paused.');
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
    this._configureBodiesForMode(this.mode);
    this.t = LIMITS.timeMin;
    this._resetWavefrontHistory();
    this.ui.setTimeLabel(this.t);
    this._refreshReadouts();
    this.ui.announce('Simulation reset to the initial position.');
    this._requestRedrawIfPaused();
  }

  _onStep() {
    this._forcePause();
    const didLoop = this._advance(LIMITS.timeStep);
    this.ui.announce(didLoop ? 'Step completed. A new cycle started.' : `Stepped forward ${LIMITS.timeStep.toFixed(2)} seconds.`);
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

    const didLoop = this._advance(dt * UI.playbackRate);
    if (didLoop) this.ui.announce('Moving body reached the boundary. A new cycle started.');

    if (this.audioEnabled && this.isPlaying) {
      this.audioTone.updateFrequency(this.doppler.apparentFrequency(this.t));
    }
  }

  _advance(dt) {
    this.t += dt;

    const shouldLoop = this.doppler.moverSpeed() > 0
      && this.doppler.moverPositionAt(this.t) >= DOMAIN.xMax;

    if (shouldLoop) {
      this._configureBodiesForMode(this.mode);
      this.t = LIMITS.timeMin;
      this._resetWavefrontHistory();
    } else {
      this._recordWavefrontsThrough(this.t);
      this._pruneWavefrontHistory();
    }

    this.ui.setTimeLabel(this.t);
    this._refreshReadouts();
    return shouldLoop;
  }

  // Each emitted ring keeps the source position from its emission instant.
  // This history belongs in the controller so a later speed change cannot
  // retroactively move wavefronts that are already travelling through the
  // medium. The buffer is trimmed to the renderer's visible lookback window.
  _resetWavefrontHistory() {
    this.wavefrontHistory = [{
      emitTime: LIMITS.timeMin,
      emitX: this.doppler.sourcePositionAt(LIMITS.timeMin),
    }];
    this.nextWavefrontIndex = 1;
  }

  _recordWavefrontsThrough(targetTime) {
    const period = 1 / PHYSICS.wavefrontPulseRate;
    const epsilon = 1e-12;

    while (this.nextWavefrontIndex * period <= targetTime + epsilon) {
      const emitTime = this.nextWavefrontIndex * period;
      this.wavefrontHistory.push({
        emitTime,
        emitX: this.doppler.sourcePositionAt(emitTime),
      });
      this.nextWavefrontIndex += 1;
    }
  }

  _pruneWavefrontHistory() {
    const earliestRelevant = Math.max(LIMITS.timeMin, this.t - PHYSICS.wavefrontLookbackTime);
    while (this.wavefrontHistory.length > 0 && this.wavefrontHistory[0].emitTime < earliestRelevant) {
      this.wavefrontHistory.shift();
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
      frequencyShiftText: this._frequencyShiftText(fPrime),
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

  _frequencyShiftText(apparentFrequency) {
    const difference = apparentFrequency - this.doppler.sourceFrequency;
    if (Math.abs(difference) < 1e-9) return '= No shift';
    return difference > 0 ? '↑ Higher' : '↓ Lower';
  }
}
