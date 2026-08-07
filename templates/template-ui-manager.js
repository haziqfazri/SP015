/* =========================================================================
   TEMPLATE-UI-MANAGER.JS — <Topic Name> (SP0XX Topic X.X)

   DOM access and event binding only. Reads slider/checkbox/button input
   and forwards it to the controller via callbacks; writes readout values
   back to the DOM. Never touches physics state directly, never draws.

   Event flow: User -> UIManager -> SimulationController -> Physics -> Renderer
   ========================================================================= */

class UIManager {
  constructor() {
    // Cache every DOM element once at construction — never re-query
    // inside loops or per-frame calls.
    this.el = {
      exampleSlider: document.getElementById('example-slider'),
      exampleValue: document.getElementById('example-value'),

      btnPlayPause: document.getElementById('btn-play-pause'),
      btnStep: document.getElementById('btn-step'),
      btnReset: document.getElementById('btn-reset'),

      timeReadout: document.getElementById('time-readout'),
      readoutExample: document.getElementById('readout-example'),
    };

    // Diffing store for updateReadout() from sim-utils.js — avoids
    // rewriting unchanged DOM text every frame.
    this._lastReadout = {};

    // Callbacks the controller registers into. UIManager never calls
    // controller methods directly by name — keeps the dependency
    // direction one-way (UI -> controller) and the class swappable.
    this.callbacks = {
      onExampleChange: null,
      onPlayToggle: null,
      onStep: null,
      onReset: null,
    };

    this._applyLimits();
    this._bindSliders();
    this._bindButtons();
  }

  // Registers controller callbacks in one call so wiring stays in one
  // place (the controller's constructor) rather than scattered assignments.
  on(callbacksMap) {
    Object.assign(this.callbacks, callbacksMap);
  }

  _applyLimits() {
    this.el.exampleSlider.min = LIMITS.exampleParamMin;
    this.el.exampleSlider.max = LIMITS.exampleParamMax;
    this.el.exampleSlider.value = LIMITS.exampleParamDefault;
    this.el.exampleValue.textContent = `${LIMITS.exampleParamDefault}`;
  }

  _bindSliders() {
    this.el.exampleSlider.addEventListener('input', () => {
      const value = parseFloat(this.el.exampleSlider.value);
      this.el.exampleValue.textContent = `${value}`;
      if (this.callbacks.onExampleChange) this.callbacks.onExampleChange(value);
    });
  }

  _bindButtons() {
    this.el.btnPlayPause.addEventListener('click', () => {
      if (this.callbacks.onPlayToggle) this.callbacks.onPlayToggle();
    });

    this.el.btnStep.addEventListener('click', () => {
      if (this.callbacks.onStep) this.callbacks.onStep();
    });

    this.el.btnReset.addEventListener('click', () => {
      if (this.callbacks.onReset) this.callbacks.onReset();
    });
  }

  setPlayPauseLabel(isPlaying) {
    this.el.btnPlayPause.textContent = isPlaying ? 'Pause' : 'Play';
  }

  // Every value arrives pre-formatted (string) from the controller, which
  // owns unit/decimal-place decisions — UIManager only decides *whether*
  // to touch the DOM (via the shared updateReadout diffing helper).
  updateReadouts(values) {
    updateReadout(this._lastReadout, 'time', this.el.timeReadout, values.timeText);
    updateReadout(this._lastReadout, 'example', this.el.readoutExample, values.exampleText);
  }
}
