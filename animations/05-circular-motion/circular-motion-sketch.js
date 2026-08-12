/* =========================================================================
   UNIFORM CIRCULAR MOTION SIMULATOR — PHASE 1
   Main sketch/controller entry point.
   The simulation classes and shared helpers live in simulation.js.
   ========================================================================= */

// Main simulation controller
let simulation;

// Colors (assigned in setup once p5 color() is available)
let COLORS;

class SimulationController {
  constructor() {
    this.orbit = null;
    this.particle = null;
    this.posVectorArrow = null;
    this.angleIndicator = null;
    this.velocityArrow = null;
    this.accelArrow = null;
    this.forceArrow = null;
    this.ui = null;

    this.staticLayer = null;   // offscreen buffer: grid + orbit path
    this.staticDirty = true;   // true = needs a rebuild before next use
    this.trailLayer = null;
  }

  init() {
    const holder = document.getElementById('canvas-holder');
    const cnv = createCanvas(holder.clientWidth, holder.clientHeight);
    cnv.parent('canvas-holder');
    pixelDensity(1);
    angleMode(RADIANS);

    textFont('Space Grotesk');
    textStyle(BOLD);
    textSize(16);

    COLORS = {
        bg: color(PALETTE.panel),        // matches --panel
        grid: color(PALETTE.line),      // matches --line
        orbitPath: color(PALETTE.path),
        orbitPathB: color(PALETTE.path), // distinguished by particle color, not path color
        ball: color(PALETTE.orange),       // --orange, Particle A
        ballB: color(PALETTE.teal),      // --teal, Particle B
        vector: color(PALETTE.ink),       // --ink
        arc: color(PALETTE.orange),        // --orange
        ink: color(PALETTE.ink),
        velocity: color(PALETTE.teal),   // --teal
        accel: color(PALETTE.accent),        // darker accent standing in for --acid (better contrast than raw acid on --panel)
        force: color(PALETTE.ink)
    };

    const cx = width / 2;
    const cy = height / 2;

    // Clamp starting radii so both orbits comfortably fit the canvas-shell
    // even on a narrow viewport, leaving margin for the particle body + arrows.
    const maxFitRadius = Math.max(30, Math.min(width, height) / 2 - 40);

    this.orbit = new Orbit(cx, cy, Math.min(130, maxFitRadius));
    this.particle = new Particle(this.orbit, (2 * Math.PI / 5), 'A', 'ball');

    this.orbitB = new Orbit(cx, cy, Math.min(90, maxFitRadius));
    this.particleB = new Particle(this.orbitB, (2 * Math.PI / 3), 'B', 'ballB');

    this.posVectorArrow = new VectorArrow(COLORS.vector, 3);
    this.angleIndicator = new AngleIndicator(COLORS.arc);
    this.velocityArrow = new VectorArrow(COLORS.velocity, 3);
    this.accelArrow = new VectorArrow(COLORS.accel, 3);
    this.forceArrow = new VectorArrow(COLORS.force, 3);

    this.ui = new UIManager(this.orbit, this.particle, this.orbitB, this.particleB);

    // Let the UI mark the static layer dirty whenever radius changes.
    this.ui.onRadiusChange = () => { this.staticDirty = true; };
    this.ui.onCompareModeChange = () => { 
        this.resize();
    };

    this.staticLayer = createGraphics(width, height);
    this.trailLayer = createGraphics(width, height);
    this.trailLayer.clear();
    this._rebuildStaticLayer();

    frameRate(60);
    noLoop(); // sim starts paused (isPlaying = false), no need to render every frame
    redraw(); // draw one initial frame so the canvas isn't blank before the user clicks "Play"
  }

    resize() {
        const holder = document.getElementById('canvas-holder');
        resizeCanvas(holder.clientWidth, holder.clientHeight);
        this.orbit.setCenter(width / 2, height / 2);
        this.orbitB.setCenter(width / 2, height / 2);

        this.staticLayer = createGraphics(width, height);
        this.staticDirty = true;

        this.trailLayer = createGraphics(width, height);
        this.trailLayer.clear();
    }

    _rebuildStaticLayer() {
        const g = this.staticLayer;
        g.background(COLORS.bg);

        g.push();
        g.stroke(COLORS.grid);
        g.strokeWeight(1);
        const spacing = 32;
        for (let x = 0; x < g.width; x += spacing) g.line(x, 0, x, g.height);
        for (let y = 0; y < g.height; y += spacing) g.line(0, y, g.width, y);
        g.pop();

        g.push();
        g.noFill();
        g.stroke(COLORS.orbitPath);
        g.strokeWeight(2);
        g.circle(this.orbit.cx, this.orbit.cy, this.orbit.radius * 2);
        g.pop();

        if (this.ui.compareMode) {
            g.push();
            g.noFill();
            g.stroke(COLORS.ballB); // tint Particle B's orbit path in its own color
            g.strokeWeight(2);
            g.circle(this.orbitB.cx, this.orbitB.cy, this.orbitB.radius * 2);
            g.pop();
        }

        g.push();
        g.noStroke();
        g.fill(COLORS.ink);
        g.circle(this.orbit.cx, this.orbit.cy, 7); // shared center point
        g.pop();

        this.staticDirty = false;
    }

    update() {
        const dt = Math.min(deltaTime / 1000, 0.1);

        if (this.ui.isPlaying) {
            this.ui.activeParticles().forEach(p => {
                const revsBefore = p.completedRevolutions();
                const unwrappedBefore = p.unwrappedTheta;
                p.update(dt);
                const revsAfter = p.completedRevolutions();

                if (this.ui.stopAfterOneRev && revsAfter > revsBefore) {
                    const sign = p.angularVelocity >= 0 ? 1 : -1;
                    const targetUnwrapped = sign * (revsBefore + 1) * TWO_PI;
                    const exactDt = (targetUnwrapped - unwrappedBefore) / p.angularVelocity;
                    const overshoot = dt - exactDt;
                    p.elapsedTime -= overshoot;

                    p.snapToRevolutionBoundary();
                }
            });

            // Only auto-pause once ALL active particles have completed a revolution,
            // otherwise a shorter-period particle would stop playback early and
            // strand the longer-period one mid-revolution.
            if (this.ui.stopAfterOneRev) {
                const allSnapped = this.ui.activeParticles().every(
                    p => p.theta === 0 && p.unwrappedTheta !== 0
                );

                if (allSnapped) this.ui.stopPlayback();
            }
        }
        this._updateTrail();
    }

   _updateTrail() {
        if (!this.ui.showTrail || !this.trailLayer) return;

        const g = this.trailLayer;

        // Fade the whole layer slightly — erase with low-alpha background
        g.push();
        g.noStroke();
        g.fill(red(COLORS.bg), green(COLORS.bg), blue(COLORS.bg), 18); // tune alpha for fade speed
        g.rect(0, 0, g.width, g.height);
        g.pop();

        // Stamp the current position
        const p = this.particle.position();
        g.push();
        g.noStroke();
        g.fill(COLORS.ball);
        g.circle(p.x, p.y, 6);
        g.pop();
    }

  render() {
    if (this.staticDirty) this._rebuildStaticLayer();
    image(this.staticLayer, 0, 0);

    if (this.ui.showTrail) image(this.trailLayer, 0, 0);

    this.ui.activeParticles().forEach(p => p.drawBody());

    const p = this.particle.position();
    let tangentDir, centripetalDir;

    if (this.ui.showVector) {
        this.posVectorArrow.draw(window, this.orbit.cx, this.orbit.cy, p.x, p.y, 'r', true);
        this.angleIndicator.draw(this.orbit, this.particle, true);
    }

    if (this.ui.showVelocity) {
        tangentDir = tangentDir || this.particle.tangentDirection();
        const len = normalizedArrowLength(this.particle.speed(), SPEED_MIN, SPEED_MAX);
        const startX = p.x + tangentDir.x * PARTICLE_BODY_RADIUS;
        const startY = p.y + tangentDir.y * PARTICLE_BODY_RADIUS;
        this.velocityArrow.draw(window, startX, startY, startX + tangentDir.x * len, startY + tangentDir.y * len, 'v', true);
    }

    if (this.ui.showAccel) {
        centripetalDir = centripetalDir || this.particle.centripetalDirection();
        const len = normalizedArrowLength(this.particle.centripetalAcceleration(), ACCEL_MIN, ACCEL_MAX);
        const startX = p.x + centripetalDir.x * PARTICLE_BODY_RADIUS;
        const startY = p.y + centripetalDir.y * PARTICLE_BODY_RADIUS;
        this.accelArrow.draw(window, startX, startY, startX + centripetalDir.x * len, startY + centripetalDir.y * len, 'ac', true);
    }

    if (this.ui.showForce) {
        centripetalDir = centripetalDir || this.particle.centripetalDirection();
        const len = normalizedArrowLength(this.particle.centripetalForce(), FORCE_MIN, FORCE_MAX);
        const startX = p.x + centripetalDir.x * PARTICLE_BODY_RADIUS;
        const startY = p.y + centripetalDir.y * PARTICLE_BODY_RADIUS;
        this.forceArrow.draw(window, startX, startY, startX + centripetalDir.x * len, startY + centripetalDir.y * len, 'Fc', true);
    }

    this.ui.updateReadout();
  }
}

// =========================================================================
// p5.js lifecycle
// =========================================================================
function setup() {
  // One-time KaTeX pass over static [data-latex] elements (theory-strip
  // formulas, readout/control label notation). Runs before init so the
  // page's math is rendered on first paint.
  document.querySelectorAll('[data-latex]').forEach((el) => {
    renderMath(el, el.dataset.latex, el.classList.contains('formula'));
  });

  simulation = new SimulationController();
  simulation.init();
}

function windowResized() {
  simulation.resize();
  if (!simulation.ui.isPlaying) redraw();
}

function draw() {
  simulation.update();
  simulation.render();
}
