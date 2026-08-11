/* =========================================================================
   STANDING-WAVES-CONTROLLER.JS — Topic 7.6, SP015.
   SimulationController only: owns the three physics objects, mode state,
   and playback state. No physics derivations, no drawing code. p5 GLOBAL
   mode — setup()/draw()/windowResized() live in sketch.js and call into
   this controller's update()/render(), rather than this file owning a p5
   instance itself (contrast with 7.2's and 7.5's instance-mode controllers).
   Load after physics.js and renderer.js, before ui.js and sketch.js.
   ========================================================================= */

class SimulationController {
  constructor() {
    this.string = new StretchedString(
      STRING_LIMITS.tensionDefault, STRING_LIMITS.muDefault, STRING_LIMITS.lengthDefault, STRING_LIMITS.harmonicDefault
    );
    this.openColumn = new AirColumn(OPEN_LIMITS.lengthDefault, OPEN_LIMITS.harmonicDefault, false);
    this.closedColumn = new AirColumn(CLOSED_LIMITS.lengthDefault, CLOSED_LIMITS.harmonicDefault, true);

    this.mode = 'string'; // 'string' | 'open' | 'closed'
    this.t = 0;
    this.isPlaying = false;

    this.ui = new UIManager({
      onModeChange: (mode) => this._onModeChange(mode),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),

      onTensionChange: (v) => this._mutate(() => this.string.setTension(v)),
      onLinearDensityChange: (v) => this._mutate(() => this.string.setLinearDensity(v)),
      onStringLengthChange: (v) => this._mutate(() => this.string.setLength(v)),
      onStringHarmonicChange: (n) => this._mutate(() => this.string.setHarmonic(n)),

      onOpenLengthChange: (v) => this._mutate(() => this.openColumn.setLength(v)),
      onOpenHarmonicChange: (n) => this._mutate(() => this.openColumn.setHarmonic(n)),

      onClosedLengthChange: (v) => this._mutate(() => this.closedColumn.setLength(v)),
      onClosedHarmonicChange: (n) => this._mutate(() => this.closedColumn.setHarmonic(n)),
    });

    this.ui.setMode(this.mode);
    this.ui.updateReadouts(this.activeObject(), this.mode);
  }

  // Returns whichever physics instance the active mode uses — the single
  // place render()/update() ask "what am I currently animating."
  activeObject() {
    if (this.mode === 'string') return this.string;
    if (this.mode === 'open') return this.openColumn;
    return this.closedColumn;
  }

  _mutate(applyFn) {
    applyFn();
    this.ui.updateReadouts(this.activeObject(), this.mode);
    if (!this.isPlaying) redraw();
  }

  _onModeChange(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.ui.setMode(mode);
    this.ui.updateReadouts(this.activeObject(), this.mode);
    if (!this.isPlaying) redraw();
  }

  _onPlayToggle(isPlaying = !this.isPlaying) {
    this.isPlaying = isPlaying;
    this.ui.setPlayButtonLabel(this.isPlaying);
    if (this.isPlaying) {
      loop();
    } else {
      noLoop();
      redraw(); // one final frame so extrema markers disappear immediately on pause
    }
  }

  // dt is clamped by the caller (sketch.js) before reaching here —
  // coding.md §3's "dt always clamped" convention.
  update(dt) {
    if (!this.isPlaying) return;
    this.t += dt * TIME_LIMITS.playbackRate;
  }

  render() {
    drawStandingWaveScene(this);
  }
}
