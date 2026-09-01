/* SP015 landing page: one metadata source drives every simulation card. */
const SIMULATIONS = [
  { chapter: '2', chapterName: 'Kinematics of Linear Motion', topic: '2.3', title: 'Projectile Motion', description: 'Resolve launch conditions into horizontal and vertical motion, then follow the trajectory.', outcome: 'Launch parameters, trajectory, range, flight time, and maximum height.', status: 'completed', href: '../animations/02-kinematics-of-linear-motion/2.3-projectile-motion/index.html', visual: 'trajectory' },
  { chapter: '5', chapterName: 'Circular Motion', topic: '5', title: 'Uniform Circular Motion', description: 'Track angular position and connect the orbit to centripetal acceleration and force.', outcome: 'Angular motion, centripetal acceleration, force, and period.', status: 'completed', href: '../animations/05-circular-motion/circular-motion.html', visual: 'orbit' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.1', title: 'Kinematics of SHM', description: 'Compare spring, pendulum, and reference-circle motion in one oscillation laboratory.', outcome: 'Defining SHM, circular-motion connection, restoring force, and torque.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.1-kinematics-of-shm/index.html', visual: 'oscillation' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.2', title: 'SHM Graphs Analysis', description: 'Read displacement, velocity, acceleration, and energy as synced graph traces.', outcome: 'The shape and phase relationship of x–t, v–t, a–t, and E–x graphs.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.2-graphs-shm/index.html', visual: 'graph' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.4', title: 'Progressive Waves', description: 'See a wave pattern travel while each particle performs its own vertical SHM.', outcome: 'The y(x,t) equation, particle versus wave velocity, and λ = v/f.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.4-progressive-wave-shm/index.html', visual: 'wave' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.5', title: 'Superposition of Waves', description: 'Send pulses together and compare their individual shapes with the resultant.', outcome: 'Superposition, constructive interference, destructive interference, and pulses.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.5-superposition-shm/wave-superposition.html', visual: 'superposition' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.6', title: 'Application of Standing Waves', description: 'Tune strings and air columns to reveal nodes, antinodes, and allowed harmonics.', outcome: 'Standing waves on strings and in open or closed air columns.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.6-application-of-standing-waves/standing-waves.html', visual: 'standing' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.7', title: 'Doppler Effect', description: 'Move the source or observer and watch wavefront spacing change the observed frequency.', outcome: 'Apparent frequency for one moving source or one moving observer.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.7-doppler-effect/doppler-effect.html', visual: 'doppler' },
  { chapter: 'next', chapterName: 'The next chapter', topic: '—', title: 'Next SP015 topic', description: 'A new interactive lab will take shape here as the curriculum grows.', outcome: 'Planned curriculum coverage.', status: 'planned', href: null, visual: 'planned' }
];

const state = { chapter: 'all', status: 'all', query: '' };
const groups = document.querySelector('#simulation-groups');
const emptyState = document.querySelector('#empty-state');
const resultsLine = document.querySelector('#results-line');

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function visualSvg(type) {
  const paths = {
    trajectory: '<path d="M8 46 C30 8 62 8 92 46"/><circle cx="8" cy="46" r="3"/><path class="vector" d="M8 46 L28 27"/>',
    orbit: '<circle cx="50" cy="37" r="27"/><circle class="dot" cx="70" cy="19" r="4"/><path class="vector" d="M70 19 L86 29"/>',
    oscillation: '<path d="M6 37 C18 16 30 16 42 37 S66 58 78 37 S102 16 114 37"/><path class="vector" d="M60 37 L60 15"/>',
    graph: '<path d="M7 37 C19 15 31 15 43 37 S67 59 79 37 S103 15 115 37"/><path class="graph-line" d="M7 49 C19 27 31 27 43 49 S67 71 79 49 S103 27 115 49"/>',
    wave: '<path d="M5 37 C17 14 29 14 41 37 S65 60 77 37 S101 14 113 37"/><path class="guide" d="M5 37 H113"/>',
    superposition: '<path d="M5 37 C20 9 31 9 46 37 S72 65 87 37 S98 9 113 37"/><path class="guide" d="M5 48 C20 20 31 20 46 48 S72 76 87 48 S98 20 113 48"/>',
    standing: '<path d="M5 37 C20 9 32 9 47 37 S74 65 89 37 S100 9 115 37"/><path class="guide" d="M5 10 V64 M115 10 V64"/>',
    doppler: '<circle cx="61" cy="37" r="6"/><path class="wave-ring" d="M61 37 m-19 0 a19 19 0 1 0 38 0 a19 19 0 1 0-38 0 M61 37 m-33 0 a33 33 0 1 0 66 0 a33 33 0 1 0-66 0"/>',
    planned: '<path class="guide" d="M8 37 H112"/><path d="M22 37 L42 17 L62 37 L82 17 L102 37"/>'
  };
  return `<svg viewBox="0 0 120 74" aria-hidden="true" focusable="false">${paths[type] || paths.planned}</svg>`;
}

function cardTemplate(sim) {
  const statusLabel = sim.status === 'completed' ? 'Completed' : 'Planned';
  const action = sim.href ? `<a class="card-launch" href="${sim.href}">Launch lab <span aria-hidden="true">↗</span></a>` : '<span class="card-launch is-disabled">Coming next <span aria-hidden="true">→</span></span>';
  return `<article class="sim-card sim-card--${sim.visual} ${sim.status === 'planned' ? 'is-planned' : ''}">
    <div class="card-top"><span class="topic-number">${escapeHtml(sim.topic)}</span><span class="status status-${sim.status}"><span class="status-dot" aria-hidden="true"></span>${statusLabel}</span></div>
    <div class="card-visual">${visualSvg(sim.visual)}<span class="visual-type">${escapeHtml(sim.visual)}</span></div>
    <div class="card-content"><h4>${escapeHtml(sim.title)}</h4><p>${escapeHtml(sim.description)}</p><div class="card-outcome"><span>Learning outcome</span><b>${escapeHtml(sim.outcome)}</b></div></div>
    <div class="card-footer">${action}<span class="card-chapter">Chapter ${escapeHtml(sim.chapter === 'next' ? '—' : sim.chapter)}</span></div>
  </article>`;
}

function filteredSims() {
  const query = state.query.trim().toLowerCase();
  return SIMULATIONS.filter((sim) => {
    const matchesChapter = state.chapter === 'all' || sim.chapter === state.chapter;
    const matchesStatus = state.status === 'all' || sim.status === state.status;
    const searchable = `${sim.topic} ${sim.title} ${sim.description} ${sim.outcome} ${sim.chapterName} ${sim.status}`.toLowerCase();
    return matchesChapter && matchesStatus && (!query || searchable.includes(query));
  });
}

function render() {
  const visible = filteredSims();
  const grouped = visible.reduce((result, sim) => {
    const key = sim.chapterName;
    (result[key] ||= []).push(sim);
    return result;
  }, {});
  groups.innerHTML = Object.entries(grouped).map(([chapterName, sims]) => `<section class="chapter-group" aria-labelledby="chapter-${sims[0].chapter}"><div class="chapter-heading"><h3 id="chapter-${sims[0].chapter}">${escapeHtml(chapterName)}</h3><span>${String(sims.length).padStart(2, '0')} lab${sims.length === 1 ? '' : 's'}</span></div><div class="card-grid">${sims.map(cardTemplate).join('')}</div></section>`).join('');
  emptyState.hidden = visible.length > 0;
  resultsLine.textContent = `${visible.length} of ${SIMULATIONS.length} labs shown`;
}

document.querySelector('#simulation-search').addEventListener('input', (event) => { state.query = event.target.value; render(); });
document.querySelectorAll('[data-chapter]').forEach((button) => button.addEventListener('click', () => {
  state.chapter = button.dataset.chapter;
  document.querySelectorAll('[data-chapter]').forEach((item) => { const active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-pressed', String(active)); });
  render();
}));
document.querySelectorAll('[data-status]').forEach((button) => button.addEventListener('click', () => {
  state.status = button.dataset.status;
  document.querySelectorAll('[data-status]').forEach((item) => { const active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-pressed', String(active)); });
  render();
}));

render();
