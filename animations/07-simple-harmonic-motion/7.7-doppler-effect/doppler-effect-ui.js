/* =========================================================================
   DOPPLER-EFFECT-UI.JS — Topic 7.7, SP015.
   UIManager only: DOM access, event binding, readout updates. Load after
   physics.js, renderer.js, controller.js, before sketch.js.
   ========================================================================= */

// -------------------------------------------------------------------------
// KaTeX rendering — renderMath() is promoted to shared/sim-utils.js; its
// CSS lives in shared/sim-style.css. One function handles both the
// one-time static pass (theory-strip formulas, static label notation)
// and the runtime re-render the mode-swapped speed-subscript needs, so
// there's a single code path for "put math on the page" rather than an
// auto-render mechanism for static content plus a separate manual API
// for dynamic content.
// -------------------------------------------------------------------------

class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this._lastReadout = {};
    this._cacheElements();
    this._renderStaticMath();
    this._initPlaybackState();
    this._bindEvents();
  }

  // One-time pass over every element authored with a data-latex attribute
  // (theory-strip formulas, static readout/control label notation).
  // .formula elements render in KaTeX displayMode (centered, full-size);
  // everything else (.katex-inline labels) renders inline. The
  // mode-dependent speed-subscript span also carries a data-latex
  // default ("v_S", matching the sim's initial mode) so it's correct on
  // first paint — setMode() takes over re-rendering it after that.
  _renderStaticMath() {
    document.querySelectorAll('[data-latex]').forEach((el) => {
      renderMath(el, el.dataset.latex, el.classList.contains('formula'));
    });
  }

  _cacheElements() {
    this.el = {
      modeButtons: {
        movingSource: document.getElementById('sourceModeButton'),
        movingObserver: document.getElementById('observerModeButton'),
      },

      freqSlider: document.getElementById('freq-slider'),
      freqLive: document.getElementById('freq-live'),

      speedSlider: document.getElementById('speed-slider'),
      speedLive: document.getElementById('speed-live'),
      speedMoverWord: document.getElementById('speed-mover-word'),
      speedSubscript: document.getElementById('speed-subscript'),

      chkPlaySound: document.getElementById('chk-play-sound'),

      btnPlay: document.getElementById('btn-play'),
      btnReset: document.getElementById('btn-reset'),

      timeLabel: document.getElementById('time-label'),
      valApparentFreq: document.getElementById('val-apparent-freq'),
      valSourceFreq: document.getElementById('val-source-freq'),
      valSpeed: document.getElementById('val-speed'),
      valSeparation: document.getElementById('val-separation'),
    };

    this.el.freqSlider.min = LIMITS.sourceFreqMin;
    this.el.freqSlider.max = LIMITS.sourceFreqMax;
    this.el.freqSlider.value = LIMITS.sourceFreqDefault;
    this.el.freqLive.textContent = `${LIMITS.sourceFreqDefault} Hz`;

    this.el.speedSlider.min = LIMITS.moverSpeedMin;
    this.el.speedSlider.max = LIMITS.moverSpeedMax;
    this.el.speedSlider.value = LIMITS.moverSpeedDefault;
    this.el.speedLive.textContent = `${LIMITS.moverSpeedDefault} m/s`;
  }

  _initPlaybackState() {
    this.playbackState = new PlaybackState({
      buttonEl: this.el.btnPlay,
      playLabel: '▶ Play',
      pauseLabel: '⏸ Pause',
      onPlay: () => this.callbacks.onPlayToggle(true),
      onPause: () => this.callbacks.onPlayToggle(false),
    });
  }

  _bindEvents() {
    this.el.modeButtons.movingSource.addEventListener('click', () => this.callbacks.onModeChange('movingSource'));
    this.el.modeButtons.movingObserver.addEventListener('click', () => this.callbacks.onModeChange('movingObserver'));

    this.el.freqSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.freqLive.textContent = `${v.toFixed(0)} Hz`;
      this.callbacks.onFrequencyChange(v);
    });

    this.el.speedSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.speedLive.textContent = `${v.toFixed(0)} m/s`;
      this.callbacks.onSpeedChange(v);
    });

    this.el.chkPlaySound.addEventListener('change', (e) => this.callbacks.onAudioToggle(e.target.checked));

    this.el.btnPlay.addEventListener('click', () => this.playbackState.toggle());
    this.el.btnReset.addEventListener('click', () => {
      this.playbackState.pause();
      this.callbacks.onReset();
    });
  }

  getSpeedValue() {
    return parseFloat(this.el.speedSlider.value);
  }

  setPlayButtonLabel(isPlaying) {
    this.el.btnPlay.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
  }

  setTimeLabel(t) {
    this.el.timeLabel.textContent = `t = ${t.toFixed(2)} s`;
  }

  // Swaps mode-button active state and relabels the speed slider so it
  // always names whichever body the slider is currently driving.
  setMode(mode) {
    const isObserver = mode === 'movingObserver';

    this.el.modeButtons.movingSource.classList.toggle('is-active', !isObserver);
    this.el.modeButtons.movingObserver.classList.toggle('is-active', isObserver);
    this.el.modeButtons.movingSource.setAttribute('aria-pressed', String(!isObserver));
    this.el.modeButtons.movingObserver.setAttribute('aria-pressed', String(isObserver));

    this.el.speedMoverWord.textContent = isObserver ? 'Observer' : 'Source';
    renderMath(this.el.speedSubscript, isObserver ? 'v_O' : 'v_S');
  }

  updateReadouts(values) {
    const store = this._lastReadout;
    updateReadout(store, 'apparentFreq', this.el.valApparentFreq, values.apparentFreqText);
    updateReadout(store, 'sourceFreq', this.el.valSourceFreq, values.sourceFreqText);
    updateReadout(store, 'speed', this.el.valSpeed, values.speedText);
    updateReadout(store, 'separation', this.el.valSeparation, values.separationText);
  }
}