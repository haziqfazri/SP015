/* =========================================================================
   TEMPLATE-CONTROLLER.JS — <Topic Name> (SP0XX Topic X.X)

   Orchestration only: owns the physics state instance, wires UIManager
   callbacks to state changes, drives play/pause/step/reset, and formats
   values into display strings for the UI manager to write. No direct DOM
   access, no canvas drawing — those stay in UIManager and the renderer.

   Two shapes exist elsewhere in the repo, both fine:
     - GLOBAL MODE (single shared p5 canvas): use loop()/noLoop()/redraw()
       tied to this.ui.isPlaying, driven by the sketch's draw().
     - INSTANCE MODE (multiple synced canvases): drive every canvas from
       one requestAnimationFrame ticker so they never fall out of lockstep
       (see wave-superposition-controller.js's _interferenceLoop()).
   Delete whichever comment block below doesn't apply once you know which
   mode this sim needs.
   ========================================================================= */

class SimulationController {
  constructor() {
    this.state = new TemplateState(LIMITS.exampleParamDefault);
    this.isPlaying = false;

    this.ui = new UIManager();
    this.ui.on({
      onExampleChange: (value) => this._onExampleChange(value),
      onPlayToggle: () => this._onPlayToggle(),
      onStep: () => this._onStep(),
      onReset: () => this._onReset(),
    });

    this._refreshReadouts();
  }

  // ----- callback handlers (UI -> physics) -----

  _onExampleChange(value) {
    this.state.setExampleParam(value);
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  _onPlayToggle() {
    this.isPlaying = !this.isPlaying;
    this.ui.setPlayPauseLabel(this.isPlaying);

    // GLOBAL MODE:
    // if (this.isPlaying) { loop(); } else { noLoop(); redraw(); }
  }

  _onStep() {
    this.isPlaying = false;
    this.ui.setPlayPauseLabel(false);
    this._advance(1 / 60); // one fixed frame's worth of time
    this._requestRedrawIfPaused();
  }

  _onReset() {
    this.isPlaying = false;
    this.ui.setPlayPauseLabel(false);
    this.state.reset();
    this._refreshReadouts();
    this._requestRedrawIfPaused();
  }

  // ----- per-frame update, called by the sketch -----

  update(dt) {
    if (!this.isPlaying) return;
    this._advance(dt);
  }

  _advance(dt) {
    this.state.advance(dt);
    this._refreshReadouts();
  }

  _requestRedrawIfPaused() {
    // GLOBAL MODE: if (!this.isPlaying) redraw();
    // INSTANCE MODE: call each p5 instance's own .redraw() here instead.
  }

  render(ctx, width, height) {
    drawScene(ctx, this, width, height);
  }

  // ----- internal -----

  _refreshReadouts() {
    const s = this.state;
    this.ui.updateReadouts({
      timeText: `t = ${s.t.toFixed(2)} s`,
      exampleText: `${s.derivedQuantity.toFixed(2)}`,
    });
  }
}
