/* =========================================================================
   STANDING-WAVES-UI.JS — Topic 7.6, SP015.
   UIManager only: DOM access, event binding, readout updates. Load after
   physics.js, renderer.js, controller.js, before sketch.js.
   ========================================================================= */

class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this._lastReadout = {};
    this._cacheElements();
    this._renderStaticMath();
    this._initPlaybackState();
    this._bindEvents();
  }

  // One-time pass over every element carrying a data-latex attribute
  // (theory-strip formulas, static readout/control label notation).
  // .formula elements render in displayMode; .katex-inline renders inline.
  // All three modes' theory content is authored with data-latex, so the
  // single pass covers the hidden-by-default variants too.
  _renderStaticMath() {
    document.querySelectorAll('[data-latex]').forEach((el) => {
      renderMath(el, el.dataset.latex, el.classList.contains('formula'));
    });
  }

  _cacheElements() {
    this.el = {
      modeButtons: {
        string: document.getElementById('stringModeButton'),
        open: document.getElementById('openModeButton'),
        closed: document.getElementById('closedModeButton'),
      },
      controlPanels: {
        string: document.getElementById('stringControls'),
        open: document.getElementById('openControls'),
        closed: document.getElementById('closedControls'),
      },
      theoryContent: {
        string: document.getElementById('stringTheoryContent'),
        open: document.getElementById('openTheoryContent'),
        closed: document.getElementById('closedTheoryContent'),
      },
      theoryContent2: {
        string: document.getElementById('stringTheoryContent2'),
        open: document.getElementById('openTheoryContent2'),
        closed: document.getElementById('closedTheoryContent2'),
      },

      // Stretched string controls
      tensionSlider: document.getElementById('tension-slider'),
      tensionLive: document.getElementById('tension-live'),
      muSlider: document.getElementById('mu-slider'),
      muLive: document.getElementById('mu-live'),
      stringLengthSlider: document.getElementById('string-length-slider'),
      stringLengthLive: document.getElementById('string-length-live'),
      stringHarmonicGroup: document.getElementById('string-harmonic-group'),

      // Open column controls
      openLengthSlider: document.getElementById('open-length-slider'),
      openLengthLive: document.getElementById('open-length-live'),
      openHarmonicGroup: document.getElementById('open-harmonic-group'),

      // Closed column controls
      closedLengthSlider: document.getElementById('closed-length-slider'),
      closedLengthLive: document.getElementById('closed-length-live'),
      closedHarmonicGroup: document.getElementById('closed-harmonic-group'),

      // Playback
      btnPlay: document.getElementById('btn-play'),

      // Readouts (shared across all 3 modes — content swapped, not the elements)
      valHarmonicLabel: document.getElementById('val-harmonic-label'),
      valFrequency: document.getElementById('val-frequency'),
      valWavelength: document.getElementById('val-wavelength'),
      valWaveSpeed: document.getElementById('val-wave-speed'),
      waveSpeedReadout: document.getElementById('wave-speed-readout'), // whole .readout block, hidden for air columns
    };

    this.el.tensionSlider.min = STRING_LIMITS.tensionMin;
    this.el.tensionSlider.max = STRING_LIMITS.tensionMax;
    this.el.tensionSlider.value = STRING_LIMITS.tensionDefault;

    this.el.muSlider.min = STRING_LIMITS.muMin;
    this.el.muSlider.max = STRING_LIMITS.muMax;
    this.el.muSlider.step = 0.0005;
    this.el.muSlider.value = STRING_LIMITS.muDefault;

    this.el.stringLengthSlider.min = STRING_LIMITS.lengthMin;
    this.el.stringLengthSlider.max = STRING_LIMITS.lengthMax;
    this.el.stringLengthSlider.value = STRING_LIMITS.lengthDefault;

    this.el.openLengthSlider.min = OPEN_LIMITS.lengthMin;
    this.el.openLengthSlider.max = OPEN_LIMITS.lengthMax;
    this.el.openLengthSlider.value = OPEN_LIMITS.lengthDefault;

    this.el.closedLengthSlider.min = CLOSED_LIMITS.lengthMin;
    this.el.closedLengthSlider.max = CLOSED_LIMITS.lengthMax;
    this.el.closedLengthSlider.value = CLOSED_LIMITS.lengthDefault;

    this._buildHarmonicGroup(this.el.stringHarmonicGroup, STRING_LIMITS.harmonics, STRING_LIMITS.harmonicDefault);
    this._buildHarmonicGroup(this.el.openHarmonicGroup, OPEN_LIMITS.harmonics, OPEN_LIMITS.harmonicDefault);
    this._buildHarmonicGroup(this.el.closedHarmonicGroup, CLOSED_LIMITS.harmonics, CLOSED_LIMITS.harmonicDefault);
  }

  // Harmonic-number stepper buttons — n is discrete, so this reuses the
  // .system-switch.compact button-group pattern (7.5's amp-step-group)
  // rather than a continuous range slider. Built from LIMITS.harmonics so
  // the closed-column's odd-only set never needs a separate code path.
  _buildHarmonicGroup(groupEl, harmonics, defaultValue) {
    groupEl.innerHTML = '';
    harmonics.forEach((n) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'system-option' + (n === defaultValue ? ' is-active' : '');
      btn.dataset.value = n;
      btn.setAttribute('aria-pressed', String(n === defaultValue));
      btn.textContent = n;
      groupEl.appendChild(btn);
    });
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
    this.el.modeButtons.string.addEventListener('click', () => this.callbacks.onModeChange('string'));
    this.el.modeButtons.open.addEventListener('click', () => this.callbacks.onModeChange('open'));
    this.el.modeButtons.closed.addEventListener('click', () => this.callbacks.onModeChange('closed'));

    this.el.tensionSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.tensionLive.textContent = `${v.toFixed(1)} N`;
      this.callbacks.onTensionChange(v);
    });

    this.el.muSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.muLive.textContent = `${(v * 1000).toFixed(2)} g/m`;
      this.callbacks.onLinearDensityChange(v);
    });

    this.el.stringLengthSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.stringLengthLive.textContent = `${v.toFixed(2)} m`;
      this.callbacks.onStringLengthChange(v);
    });

    this.el.openLengthSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.openLengthLive.textContent = `${v.toFixed(2)} m`;
      this.callbacks.onOpenLengthChange(v);
    });

    this.el.closedLengthSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      this.el.closedLengthLive.textContent = `${v.toFixed(2)} m`;
      this.callbacks.onClosedLengthChange(v);
    });

    this._bindHarmonicGroup(this.el.stringHarmonicGroup, (n) => this.callbacks.onStringHarmonicChange(n));
    this._bindHarmonicGroup(this.el.openHarmonicGroup, (n) => this.callbacks.onOpenHarmonicChange(n));
    this._bindHarmonicGroup(this.el.closedHarmonicGroup, (n) => this.callbacks.onClosedHarmonicChange(n));

    this.el.btnPlay.addEventListener('click', () => this.playbackState.toggle());
  }

  _bindHarmonicGroup(groupEl, onChange) {
    const buttons = Array.from(groupEl.querySelectorAll('.system-option'));
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => {
          b.classList.toggle('is-active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        onChange(parseInt(btn.dataset.value, 10));
      });
    });
  }

  setPlayButtonLabel(isPlaying) {
    this.el.btnPlay.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
  }

  // Swaps which mode's controls/theory are visible. All three panels are
  // permanent DOM siblings — only .hidden/display flip here, same pattern
  // as 7.5's UIManager.setMode().
  setMode(mode) {
    Object.keys(this.el.modeButtons).forEach((key) => {
      const isActive = key === mode;
      this.el.modeButtons[key].classList.toggle('is-active', isActive);
      this.el.modeButtons[key].setAttribute('aria-pressed', String(isActive));
      this.el.controlPanels[key].classList.toggle('hidden', !isActive);
      this.el.theoryContent[key].style.display = isActive ? 'block' : 'none';
      this.el.theoryContent2[key].style.display = isActive ? 'block' : 'none';
    });

    // Wave speed readout only applies to the string (v = sqrt(T/mu) is
    // computed there; air columns use the fixed SPEED_OF_SOUND constant,
    // shown inline in the theory strip instead of as a live readout).
    this.el.waveSpeedReadout.classList.toggle('hidden', mode !== 'string');
  }

  // object: the currently-active physics instance (StretchedString or
  // AirColumn) — its getters already carry the correct boundary-condition
  // math, so this method just formats and diffs them into the DOM.
  updateReadouts(object, mode) {
    const store = this._lastReadout;

    const harmonicText = object.overtoneLabel
      ? `${object.harmonicLabel} (${object.overtoneLabel})`
      : object.harmonicLabel;

    updateReadout(store, 'harmonic', this.el.valHarmonicLabel, harmonicText);
    updateReadout(store, 'freq', this.el.valFrequency, `${object.frequency.toFixed(1)} Hz`);
    updateReadout(store, 'wavelength', this.el.valWavelength, `${object.wavelength.toFixed(2)} m`);

    if (mode === 'string') {
      updateReadout(store, 'speed', this.el.valWaveSpeed, `${object.waveSpeed.toFixed(1)} m/s`);
    }
  }
}
