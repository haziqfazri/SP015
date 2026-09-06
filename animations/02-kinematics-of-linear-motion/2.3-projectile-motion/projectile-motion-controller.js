/* =========================================================================
   PROJECTILE-CONTROLLER.JS — Coordinates UI, analytic physics, and canvas.
   ========================================================================= */

class SimulationController {
  constructor() {
    this.projectile = new Projectile({
      launchSpeed: LIMITS.launchSpeedDefault,
      launchAngleRad: (LIMITS.launchAngleDefault * Math.PI) / 180,
      launchHeight: LIMITS.launchHeightDefault,
    });
    this.t = 0;
    this.isPlaying = false;
    this.trail = [];
    this.showTrail = true;
    this.showVectors = true;

    this.ui = new UIManager({
      onPreset: (preset) => this._onPreset(preset),
      onParametersChange: (params) => this._onParametersChange(params),
      onDisplayChange: (name, enabled) => this._onDisplayChange(name, enabled),
      onPlayToggle: (isPlaying) => this._onPlayToggle(isPlaying),
      onReset: () => this._onReset(),
      onStep: () => this._onStep(),
    });
    this._refreshUI();
  }

  _onPreset(preset) {
    const presets = {
      angled: { launchSpeed: LIMITS.launchSpeedDefault, launchAngleDeg: LIMITS.launchAngleDefault, launchHeight: LIMITS.launchHeightDefault },
      horizontal: { launchSpeed: LIMITS.launchSpeedDefault, launchAngleDeg: 0, launchHeight: LIMITS.horizontalPresetHeight },
      vertical: { launchSpeed: LIMITS.launchSpeedDefault, launchAngleDeg: 90, launchHeight: LIMITS.launchHeightDefault },
    };
    this.ui.setParameters(presets[preset]);
    this._onParametersChange(presets[preset], preset);
  }

  _onParametersChange({ launchSpeed, launchAngleDeg, launchHeight }, activePreset = '') {
    this._forcePause();
    this.projectile.setLaunchParams({ launchSpeed, launchAngleRad: (launchAngleDeg * Math.PI) / 180, launchHeight });
    this._resetTime();
    this.ui.setPresetActive(activePreset);
    this._refreshUI();
    this._requestRedraw();
  }

  _onDisplayChange(name, enabled) {
    this[name] = enabled;
    this._requestRedraw();
  }

  _onPlayToggle(isPlaying) {
    if (isPlaying && this.t >= this.projectile.flightTime) this._resetTime();
    this.isPlaying = isPlaying;
    if (isPlaying) {
      loop();
    } else {
      noLoop();
      redraw();
    }
  }

  _forcePause() {
    this.isPlaying = false;
    this.ui.playbackState.pause();
    noLoop();
  }

  _onReset() {
    this._forcePause();
    this._resetTime();
    this._refreshUI();
    this._requestRedraw();
  }

  _onStep() {
    this._forcePause();
    this.t = Math.min(this.t + LIMITS.timeStep, this.projectile.flightTime);
    this._appendTrail();
    this._refreshUI();
    this._requestRedraw();
  }

  _resetTime() {
    this.t = 0;
    this.trail = [this.projectile.stateAt(this.t)];
  }

  update(dt) {
    if (!this.isPlaying) return;
    this.t = Math.min(this.t + dt * LIMITS.playbackRate, this.projectile.flightTime);
    this._appendTrail();
    this._refreshUI();
    if (this.t >= this.projectile.flightTime) this._forcePause();
  }

  _appendTrail() {
    this.trail.push(this.projectile.stateAt(this.t));
    if (this.trail.length > DISPLAY.trailMax) this.trail.shift();
  }

  _refreshUI() {
    const state = this.projectile.stateAt(this.t);
    this.ui.setTimeLabel(this.t);
    this.ui.updateReadouts({ ...state, flightTime: this.projectile.flightTime, range: this.projectile.range, maximumHeight: this.projectile.maximumHeight });
  }

  _requestRedraw() {
    if (!this.isPlaying) redraw();
  }

  render(ctx) {
    drawProjectileScene(ctx, {
      trajectory: this.projectile.trajectory(DISPLAY.trajectorySamples),
      state: this.projectile.stateAt(this.t),
      trail: this.trail,
      showTrail: this.showTrail,
      showVectors: this.showVectors,
    });
  }
}
