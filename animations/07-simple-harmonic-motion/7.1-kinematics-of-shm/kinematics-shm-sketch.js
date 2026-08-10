let simulation;

// =========================================================================
// p5.js lifecycle
// =========================================================================
function setup() {
  simulation = new SimulationController();
  simulation.init();
}

function windowResized() {
  simulation.resize();
  const isPlaying = simulation.ui.playbackState?.isPlaying ?? simulation.ui.isPlaying;
  if (!isPlaying) redraw();
}

function draw() {
  simulation.update();
  simulation.render();
}
