/* =========================================================================
   Simulation classes and shared physics/rendering helpers.
   Loaded by index.html before sketch.js so the main sketch can stay focused
   on setup, lifecycle, and scene orchestration.
   ========================================================================= */

const PX_PER_METER = 100; // 100px = 1m

// Physical bounds derived from the slider ranges in index.html.
// Used to normalize v, a, F onto a shared 0–1 range so their arrows
// grow/shrink in sync regardless of how differently each quantity scales.
const OMEGA_MIN = (Math.PI * 2) / 5;   // period slider max = 5s
const OMEGA_MAX = (Math.PI * 2) / 1;   // period slider min = 1s
const RADIUS_M_MIN = 50 / PX_PER_METER;   // radius slider min = 50px
const RADIUS_M_MAX = 250 / PX_PER_METER;  // radius slider max = 250px
const MASS_MIN = 0.1;
const MASS_MAX = 5;

const PARTICLE_BODY_DIAMETER = 18;
const PARTICLE_BODY_RADIUS = PARTICLE_BODY_DIAMETER / 2;

const SPEED_MIN = OMEGA_MIN * RADIUS_M_MIN;
const SPEED_MAX = OMEGA_MAX * RADIUS_M_MAX;

const ACCEL_MIN = OMEGA_MIN * OMEGA_MIN * RADIUS_M_MIN;
const ACCEL_MAX = OMEGA_MAX * OMEGA_MAX * RADIUS_M_MAX;

const FORCE_MIN = MASS_MIN * ACCEL_MIN;
const FORCE_MAX = MASS_MAX * ACCEL_MAX;

// drawArrowCtx() and normalizedArrowLength() now live in
// ../shared/sim-utils.js (loaded before this file in index.html).
// normalizedArrowLength() is called below with just (magnitude, min, max) —
// its optional minLen/maxLen params default to 40/160, matching the values
// this sim originally hardcoded.

function degrees_(rad) {
  return (rad * 180) / Math.PI;
}

// =========================================================================
// Orbit — pure geometry. Knows nothing about time or motion.
// =========================================================================
class Orbit {
  constructor(cx, cy, radius) {
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;
  }

  setCenter(x, y) {
    this.cx = x;
    this.cy = y;
  }

  pointAt(theta) {
    return {
      x: this.cx + this.radius * cos(theta),
      y: this.cy + this.radius * sin(theta)
    };
  }

  drawPath() {
    push();
    noFill();
    stroke(COLORS.orbitPath);
    strokeWeight(2);
    circle(this.cx, this.cy, this.radius * 2);
    pop();
  }

  drawCenterPoint() {
    push();
    noStroke();
    fill(COLORS.ink);
    circle(this.cx, this.cy, PARTICLE_BODY_DIAMETER / 2); // shared center point
    pop();
  }
}

// =========================================================================
// Particle — the physics body. Holds angular state and integrates motion.
// =========================================================================
class Particle {
  constructor(orbit, angularVelocity, label = 'A', colorKey = 'ball') {
    this.orbit = orbit;
    this.theta = 0;
    this.unwrappedTheta = 0;
    this.angularVelocity = angularVelocity;
    this.direction = angularVelocity >= 0 ? 1 : -1;
    this.elapsedTime = 0;
    this.mass = 1.0;
    this.label = label;       // new — 'A' or 'B'
    this.colorKey = colorKey; // new — key into COLORS, e.g. 'ball' or 'ballB'

    this.released = false;
    this.freePos = null;
    this.freeVel = null;
    this.freeDir = null;
   }

  update(dt) {
    this.elapsedTime += dt;

    if (this.released) {
      this.freePos.x += this.freeVel.x * dt;
      this.freePos.y += this.freeVel.y * dt;
      return;
    }

    const delta = this.angularVelocity * dt;
    this.theta += delta;
    this.unwrappedTheta += delta;
    this.theta = ((this.theta % TWO_PI) + TWO_PI) % TWO_PI;
  }

  release() {
    if (this.released) return;
    const p = this.position();
    const dir = this.tangentDirection();
    const speedPxPerSec = Math.abs(this.angularVelocity) * this.orbit.radius; // rad/s * px(radius) = px/s

    this.released = true;
    this.freePos = { x: p.x, y: p.y };
    this.freeDir = dir;
    this.freeVel = { x: dir.x * speedPxPerSec, y: dir.y * speedPxPerSec };
  }

  reset() {
    this.theta = 0;
    this.unwrappedTheta = 0;
    this.elapsedTime = 0;
    this.released = false;
    this.freePos = null;
    this.freeVel = null;
    this.freeDir = null;
  }

  snapToRevolutionBoundary() {
    const sign = this.angularVelocity >= 0 ? 1 : -1;
    const targetRevolutions = 1;

    // Snap to the first completed revolution boundary so the readout
    // resolves to exactly one revolution.
    this.unwrappedTheta = sign * targetRevolutions * TWO_PI;
    this.theta = 0;
  }

  position() {
    return this.released ? this.freePos : this.orbit.pointAt(this.theta);
  }

  tangentDirection() {
    if (this.released) return this.freeDir;
    const sign = this.angularVelocity >= 0 ? 1 : -1;
    const tx = -sin(this.theta) * sign;
    const ty = cos(this.theta) * sign;
    return { x: tx, y: ty };
  }

  radiusMeters() {
    return this.orbit.radius / PX_PER_METER;
  }

  speed() {
    if (this.released) {
      return Math.hypot(this.freeVel.x, this.freeVel.y) / PX_PER_METER;
    }
    return Math.abs(this.angularVelocity) * this.radiusMeters();
  }

  centripetalAcceleration() {
    // No centripetal force once flying freely in a straight line
    if (this.released) return 0;
    return this.angularVelocity * this.angularVelocity * this.radiusMeters();
  }

  centripetalForce() {
    return this.mass * this.centripetalAcceleration();
  }

  centripetalDirection() {
    if (this.released) return { x: 0, y: 0 };
    return { x: -cos(this.theta), y: -sin(this.theta) };
  }

  completedRevolutions() {
    return Math.floor(Math.abs(this.unwrappedTheta) / TWO_PI);
  }

  drawBody() {
    const p = this.position();
    const dir = this.tangentDirection();
    const arrowLen = 26;
    const bodyColor = COLORS[this.colorKey];

    push();
    stroke(COLORS.ink);
    strokeWeight(2);
    fill(COLORS.ink);
    const tipX = p.x + dir.x * arrowLen;
    const tipY = p.y + dir.y * arrowLen;
    drawArrowCtx(window, p.x, p.y, tipX, tipY, bodyColor, 2, 6);
    pop();

    push();
    noStroke();
    fill(bodyColor);
    circle(p.x, p.y, PARTICLE_BODY_DIAMETER);
    stroke(PALETTE.white + 'a0'); // white ring at 160 alpha (particle outline)
    strokeWeight(2);
    noFill();
    circle(p.x, p.y, PARTICLE_BODY_DIAMETER - 4);
    pop();
   }
}

// VectorArrow now lives in ../shared/sim-utils.js.

// =========================================================================
// AngleIndicator — draws the theta arc from the +x axis and numeric labels.
// =========================================================================
class AngleIndicator {
  constructor(colorVal) {
    this.colorVal = colorVal;
    this.arcRadius = 42;
  }

  draw(orbit, particle, showLabels) {
    const cx = orbit.cx, cy = orbit.cy;
    const theta = particle.theta;

    push();
    drawingContext.setLineDash([4, 4]);
    stroke(PALETTE.path);
    strokeWeight(1.3);
    line(cx, cy, cx + orbit.radius, cy);
    drawingContext.setLineDash([]);
    pop();

    push();
    noFill();
    stroke(this.colorVal);
    strokeWeight(2.5);
    arc(cx, cy, this.arcRadius * 2, this.arcRadius * 2, 0, theta === 0 ? 0.0001 : theta);
    pop();

    if (showLabels) {
        const labelAngle = theta / 2;
        const lx = cx + (this.arcRadius + 20) * cos(labelAngle);
        const ly = cy + (this.arcRadius + 20) * sin(labelAngle);
        push();
        noStroke();
        fill(this.colorVal);
        textFont('IBM Plex Mono');
        textStyle(BOLD);
        textSize(15);
        textAlign(CENTER, CENTER);
        text('θ', lx, ly);
        pop();
    }
  }
}

// =========================================================================
// UIManager — connects HTML controls to the simulation state.
// =========================================================================
class UIManager {
  constructor(orbitA, particleA, orbitB, particleB) {
    this.orbit = orbitA;       // kept for back-compat with existing code (radius readout etc.)
    this.particle = particleA;
    this.orbitB = orbitB;
    this.particleB = particleB;
    this.compareMode = false;

    this.isPlaying = false;
    this.stopAfterOneRev = false;
    this.playbackState = null;

    this.showVector = false;
    this.showVelocity = false;
    this.showAccel = false;
    this.showForce = false;
    this.showTrail = false;

    this.readoutEls = {
        radius: document.getElementById('val-radius'),
        rad: document.getElementById('val-rad'),
        omega: document.getElementById('val-omega'),
        rev: document.getElementById('val-rev'),
        time: document.getElementById('val-time'),
        speed: document.getElementById('val-speed'),
        accel: document.getElementById('val-accel'),
        force: document.getElementById('val-force'),
    };

    this._lastReadout = {};
    this._bindControls();
    }

    _requestRedrawIfPaused() {
        if (!this.isPlaying) redraw();
    }

    // Returns the active particle set — used by render/update loops.
    activeParticles() {
        return this.compareMode ? [this.particle, this.particleB] : [this.particle];
    }

    _currentOmegaMagnitude() {
        return Math.abs(this.particle.angularVelocity);
    }
  
    _bindControls() {
        this._bindRadiusControls(this.particle, this.orbit, 'a');
        this._bindPeriodFrequencyControls(this.particle, 'a');
        this._bindPhysicsControls(this.particle, 'a');
        this._bindDirectionControl(this.particle, 'a');

        this._bindRadiusControls(this.particleB, this.orbitB, 'b');
        this._bindPeriodFrequencyControls(this.particleB, 'b');
        this._bindPhysicsControls(this.particleB, 'b');
        this._bindDirectionControl(this.particleB, 'b');

        this._bindCompareToggle();

        this._bindPlaybackControls();
        this._bindDisplayControls();
        this._bindReleaseControl();
    }

    _bindCompareToggle() {
        const btnSingle = document.getElementById('singleModeButton');
        const btnCompare = document.getElementById('compareModeButton');
        const sectionB = document.getElementById('particle-b-section');
        const readoutsPanel = document.getElementById('readoutsPanel');
        const controlChecks = document.getElementById('controlChecks');
        const canvasShell = document.getElementById('canvasShell');

        const setMode = (compare) => {
            this.compareMode = compare;
            sectionB.classList.toggle('hidden', !compare);
            readoutsPanel.classList.toggle('hidden', compare);
            canvasShell.classList.toggle('compare-tall', compare);
            controlChecks.classList.toggle('hidden', compare);
            btnSingle.classList.toggle('is-active', !compare);
            btnCompare.classList.toggle('is-active', compare);
            btnSingle.setAttribute('aria-pressed', String(!compare));
            btnCompare.setAttribute('aria-pressed', String(compare));
            if (this.onCompareModeChange) this.onCompareModeChange(compare);
            this._requestRedrawIfPaused();
        };

        btnSingle.addEventListener('click', () => setMode(false));
        btnCompare.addEventListener('click', () => setMode(true));
    }

    _bindReleaseControl() {
        const btnRelease = document.getElementById('btn-release');
        btnRelease.addEventListener('click', () => {
            this.activeParticles().forEach(p => p.release());
            this._requestRedrawIfPaused();
        });
    }

    _bindRadiusControls(particle, orbit, idPrefix) {
        const radiusSlider = document.getElementById(`${idPrefix}-radius-slider`);
        const radiusLive = document.getElementById(`${idPrefix}-radius-live`);

        radiusSlider.addEventListener('input', () => {
            const val = Number(radiusSlider.value);
            orbit.radius = val;
            radiusLive.textContent = `${val.toFixed(0)} px`;
            if (this.onRadiusChange) this.onRadiusChange(val);
            this._requestRedrawIfPaused();
        });
    }

    _bindPeriodFrequencyControls(particle, idPrefix) {
        const periodSlider = document.getElementById(`${idPrefix}-period-slider`);
        const periodLive = document.getElementById(`${idPrefix}-period-live`);
        const freqSlider = document.getElementById(`${idPrefix}-freq-slider`);
        const freqLive = document.getElementById(`${idPrefix}-freq-live`);
        const omegaSlider = document.getElementById(`${idPrefix}-omega-slider`);
        const omegaLive = document.getElementById(`${idPrefix}-omega-live`);

        // Single source of truth for bounds, avoids hardcoded HTML min/max drift.
        omegaSlider.min = OMEGA_MIN;
        omegaSlider.max = OMEGA_MAX;

        const applyOmega = (omega) => {
            // particle.direction lives on the particle itself once Particle B exists,
            // since direction is now per-particle rather than shared via this.direction.
            particle.angularVelocity = particle.direction * omega;
        };

        periodSlider.addEventListener('input', () => {
            const T = Number(periodSlider.value);
            const f = 1 / T;
            const omega = TWO_PI / T;
            applyOmega(omega);
            periodLive.textContent = `${T.toFixed(2)} s`;
            freqLive.textContent = `${f.toFixed(3)} Hz`;
            freqSlider.value = f;
            omegaLive.textContent = `${omega.toFixed(3)} rad/s`;
            omegaSlider.value = omega;
            this._requestRedrawIfPaused();
        });

        freqSlider.addEventListener('input', () => {
            const f = Number(freqSlider.value);
            const T = 1 / f;
            const omega = TWO_PI * f;
            applyOmega(omega);
            freqLive.textContent = `${f.toFixed(3)} Hz`;
            periodLive.textContent = `${T.toFixed(2)} s`;
            periodSlider.value = T;
            omegaLive.textContent = `${omega.toFixed(3)} rad/s`;
            omegaSlider.value = omega;
            this._requestRedrawIfPaused();
        });

        omegaSlider.addEventListener('input', () => {
            const omega = Number(omegaSlider.value);
            const T = TWO_PI / omega;
            const f = 1 / T;
            applyOmega(omega);
            omegaLive.textContent = `${omega.toFixed(3)} rad/s`;
            periodLive.textContent = `${T.toFixed(2)} s`;
            periodSlider.value = T;
            freqLive.textContent = `${f.toFixed(3)} Hz`;
            freqSlider.value = f;
            this._requestRedrawIfPaused();
        });
    }

    _bindDirectionControl(particle, idPrefix) {
        const btnCW = document.getElementById(`${idPrefix}-dir-cw`);
        const btnCCW = document.getElementById(`${idPrefix}-dir-ccw`);

        const setDirection = (dir) => {
            particle.direction = dir; // now stored per-particle, see Particle class change below
            const magnitude = Math.abs(particle.angularVelocity);
            particle.angularVelocity = dir * magnitude;

            const isCW = dir === 1;
            btnCW.classList.toggle('is-active', isCW);
            btnCCW.classList.toggle('is-active', !isCW);
            btnCW.setAttribute('aria-pressed', isCW);
            btnCCW.setAttribute('aria-pressed', !isCW);
        };

        btnCW.addEventListener('click', () => { setDirection(1); this._requestRedrawIfPaused(); });
        btnCCW.addEventListener('click', () => { setDirection(-1); this._requestRedrawIfPaused(); });
    }

    _bindPlaybackControls() {
        const btnPlay = document.getElementById('btn-play');
        const btnReset = document.getElementById('btn-reset');
        this.btnPlayEl = btnPlay;

        this.playbackState = new PlaybackState({
            buttonEl: btnPlay,
            onPlay: () => {
                this.isPlaying = true;
                loop();
                redraw();
            },
            onPause: () => {
                this.isPlaying = false;
                noLoop();
                redraw(); // catch any final frame after pausing so the canvas doesn't freeze mid-frame
            }
        });

        btnPlay.addEventListener('click', () => {
            this.playbackState.toggle();
        });

        btnReset.addEventListener('click', () => {
            this.activeParticles().forEach(p => p.reset());
            this.playbackState.pause();
            redraw();
        });
    }

    stopPlayback() {
        this.playbackState?.pause();
        noLoop();
    }

    _bindPhysicsControls(particle, idPrefix) {
        const massSlider = document.getElementById(`${idPrefix}-mass-slider`);
        const massLive = document.getElementById(`${idPrefix}-mass-live`);

        massSlider.addEventListener('input', () => {
            const val = Number(massSlider.value);
            particle.mass = val;
            massLive.textContent = `${val.toFixed(2)} kg`;
            this._requestRedrawIfPaused();
        });
    }

    _bindDisplayControls() {
        document.getElementById('chk-vector').addEventListener('change', (e) => {
            this.showVector = e.target.checked;
            this._requestRedrawIfPaused();
        });
        document.getElementById('chk-velocity').addEventListener('change', (e) => {
            this.showVelocity = e.target.checked;
            this._requestRedrawIfPaused();
        });
        document.getElementById('chk-accel').addEventListener('change', (e) => {
            this.showAccel = e.target.checked;
            this._requestRedrawIfPaused();
        });
        document.getElementById('chk-force').addEventListener('change', (e) => {
            this.showForce = e.target.checked;
            this._requestRedrawIfPaused();
        });
        document.getElementById('chk-stop-one-rev').addEventListener('change', (e) => {
            this.stopAfterOneRev = e.target.checked;
            this._requestRedrawIfPaused();
        });
        document.getElementById('chk-trail').addEventListener('change', (e) => {
            this.showTrail = e.target.checked;
            this._requestRedrawIfPaused();
        });
    }

    updateReadout() {
        const p = this.particle;
        const els = this.readoutEls;
        const last = this._lastReadout;

        const radius = this.orbit.radius.toFixed(1);
        const rad = p.theta.toFixed(3);
        const period = (TWO_PI / Math.abs(p.angularVelocity)).toFixed(2);
        const omega = p.angularVelocity.toFixed(2);
        const rev = p.completedRevolutions();
        const time = p.elapsedTime.toFixed(2);
        const speed = p.speed().toFixed(2);
        const accel = p.centripetalAcceleration().toFixed(2);
        const force = p.centripetalForce().toFixed(2);

        if (last.radius !== radius) {
            els.radius.textContent = radius;
            last.radius = radius;
        }
        if (last.rad !== rad) {
            els.rad.textContent = rad;
            last.rad = rad;
        }
        if (last.omega !== omega) {
            els.omega.textContent = omega;
            last.omega = omega;
        }
        if (last.rev !== rev) {
            els.rev.textContent = rev;
            last.rev = rev;
        }
        if (last.time !== time) {
            els.time.textContent = time;
            last.time = time;
        }
        if (last.speed !== speed) {
            els.speed.textContent = speed;
            last.speed = speed;
        }
        if (last.accel !== accel) {
            els.accel.textContent = accel;
            last.accel = accel;
        }
        if (last.force !== force) {
            els.force.textContent = force;
            last.force = force;
        }
        if (last.period !== period) {
            const periodEl = document.getElementById('periodValue');
            if (periodEl) periodEl.textContent = `${period} s`;
            last.period = period;
        }
     }
}