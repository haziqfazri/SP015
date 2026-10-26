/* =========================================================================
   PROJECTILE-PHYSICS.JS — SP015 Topic 2.3 Projectile Motions.
   Pure projectile state and analytic kinematics. No DOM or p5 access.
   ========================================================================= */

// SP015 2.3(a)–(b): air resistance is neglected, so acceleration is
// constant: a = (0, -g). The launch angle is stored in radians internally.
const PHYSICS = {
  g: 9.81,       // m s^-2
  groundY: 0,    // m
};

// Single source of truth for all interactive ranges and playback increments.
const LIMITS = {
  launchSpeedMin: 5,
  launchSpeedMax: 45,
  launchSpeedDefault: 25,

  launchAngleMin: 0,
  launchAngleMax: 90,
  launchAngleDefault: 45,

  launchHeightMin: 0,
  launchHeightMax: 20,
  launchHeightDefault: 0,
  horizontalPresetHeight: 5,

  timeStep: 0.02,
  maxDt: 0.03,
  playbackRate: 1,
};

class Projectile {
  constructor({ launchSpeed, launchAngleRad, launchHeight }) {
    this.setLaunchParams({ launchSpeed, launchAngleRad, launchHeight });
  }

  setLaunchParams({ launchSpeed, launchAngleRad, launchHeight }) {
    this.launchSpeed = launchSpeed;
    this.launchAngleRad = launchAngleRad;
    this.launchHeight = launchHeight;
  }

  setLaunchSpeed(speed) {
    this.launchSpeed = speed;
  }

  setLaunchAngleRadians(angleRad) {
    this.launchAngleRad = angleRad;
  }

  setLaunchHeight(height) {
    this.launchHeight = height;
  }

  get initialVelocityX() {
    return this.launchSpeed * Math.cos(this.launchAngleRad);
  }

  get initialVelocityY() {
    return this.launchSpeed * Math.sin(this.launchAngleRad);
  }

  get timeToApex() {
    return this.initialVelocityY / PHYSICS.g;
  }

  get maximumHeight() {
    return this.launchHeight + (this.initialVelocityY ** 2) / (2 * PHYSICS.g);
  }

  // Positive root of y = y0 + u_y t - 1/2 g t^2 at y = groundY.
  get flightTime() {
    const verticalDrop = this.launchHeight - PHYSICS.groundY;
    return (this.initialVelocityY + Math.sqrt(this.initialVelocityY ** 2 + 2 * PHYSICS.g * verticalDrop)) / PHYSICS.g;
  }

  get range() {
    return this.initialVelocityX * this.flightTime;
  }

  stateAt(t) {
    const clampedTime = Math.min(Math.max(t, 0), this.flightTime);
    const vx = this.initialVelocityX;
    const vy = this.initialVelocityY - PHYSICS.g * clampedTime;

    // SP015 2.3(a): horizontal and vertical motions share t but are
    // independent: x = u_x t, y = y0 + u_y t - 1/2 gt^2.
    return {
      t: clampedTime,
      x: vx * clampedTime,
      y: this.launchHeight + this.initialVelocityY * clampedTime - 0.5 * PHYSICS.g * clampedTime ** 2,
      vx,
      vy,
      ax: 0,
      ay: -PHYSICS.g,
      speed: Math.hypot(vx, vy),
    };
  }

  get impactState() {
    return this.stateAt(this.flightTime);
  }

  trajectory(sampleCount) {
    const count = Math.max(2, Math.floor(sampleCount));
    return Array.from({ length: count }, (_, index) => this.stateAt((this.flightTime * index) / (count - 1)));
  }
}
