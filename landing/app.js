/* SP015 landing page: one metadata source drives every simulation card. */
const SIMULATIONS = [
  { chapter: '2', chapterName: 'Kinematics of Linear Motion', topic: '2.3', title: 'Projectile Motion', description: 'Resolve launch conditions into horizontal and vertical motion, then follow the trajectory.', outcome: 'Launch parameters, trajectory, range, flight time, and maximum height.', status: 'completed', href: '../animations/02-kinematics-of-linear-motion/2.3-projectile-motion/index.html', visual: 'trajectory' },
  { chapter: '5', chapterName: 'Circular Motion', topic: '5', title: 'Uniform Circular Motion', description: 'Track angular position and connect the orbit to centripetal acceleration and force.', outcome: 'Angular motion, centripetal acceleration, force, and period.', status: 'completed', href: '../animations/05-circular-motion/5-uniform-circular-motion/index.html', visual: 'orbit' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.1', title: 'Kinematics of SHM', description: 'Compare spring, pendulum, and reference-circle motion in one oscillation laboratory.', outcome: 'Defining SHM, circular-motion connection, restoring force, and torque.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.1-kinematics-of-shm/index.html', visual: 'oscillation' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.2', title: 'SHM Graphs Analysis', description: 'Read displacement, velocity, acceleration, and energy as synced graph traces.', outcome: 'The shape and phase relationship of x–t, v–t, a–t, and E–x graphs.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.2-graphs-shm/index.html', visual: 'graph' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.4', title: 'Progressive Waves', description: 'See a wave pattern travel while each particle performs its own vertical SHM.', outcome: 'The y(x,t) equation, particle versus wave velocity, and λ = v/f.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.4-progressive-wave-shm/index.html', visual: 'wave' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.5', title: 'Superposition of Waves', description: 'Send pulses together and compare their individual shapes with the resultant.', outcome: 'Superposition, constructive interference, destructive interference, and pulses.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.5-superposition-shm/index.html', visual: 'superposition' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.6', title: 'Application of Standing Waves', description: 'Tune strings and air columns to reveal nodes, antinodes, and allowed harmonics.', outcome: 'Standing waves on strings and in open or closed air columns.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.6-application-of-standing-waves/index.html', visual: 'standing' },
  { chapter: '7', chapterName: 'Simple Harmonic Motion', topic: '7.7', title: 'Doppler Effect', description: 'Move the source or observer and watch wavefront spacing change the observed frequency.', outcome: 'Apparent frequency for one moving source or one moving observer.', status: 'completed', href: '../animations/07-simple-harmonic-motion/7.7-doppler-effect/index.html', visual: 'doppler' },
  { chapter: '8', chapterName: 'Physics of Matter', topic: '8.1–8.2', title: 'Materials Testing', description: 'Load a specimen to explore stress, strain, Young\'s modulus, and ductile versus brittle behavior.', outcome: 'Stress, strain, Hooke\'s law, Young\'s modulus, and elastic strain energy.', status: 'completed', href: '../animations/08-physics-of-matter/8.1-8.2-materials-testing/index.html', visual: 'materials' },
  { chapter: '8', chapterName: 'Physics of Matter', topic: '8.3', title: 'Heat Conduction', description: 'Model steady-state 1D heat transfer through series conductors and inspect temperature gradients.', outcome: 'Rate of heat transfer, series thermal resistance, and insulated versus non-insulated profiles.', status: 'completed', href: '../animations/08-physics-of-matter/8.3-heat-conduction/index.html', visual: 'conduction' },
  { chapter: '8', chapterName: 'Physics of Matter', topic: '8.4', title: 'Thermal Expansion', description: 'Track linear, area, and volume expansion alongside liquid-in-container overflow.', outcome: 'Expansion coefficients α, β = 2α, γ = 3α, and container overflow.', status: 'planned', href: null, visual: 'expansion' }
];

const state = { chapter: 'all', status: 'all', query: '' };
const groups = document.querySelector('#simulation-groups');
const emptyState = document.querySelector('#empty-state');
const resultsLine = document.querySelector('#results-line');

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

const CARD_DIAGRAM = Object.freeze({ width: 120, height: 74 });
let diagramSequence = 0;

// Landing-local SVG grammar. Topic diagrams compose these primitives; simulation
// canvas helpers remain in shared/sim-utils.js.
const DIAGRAM = Object.freeze({
  path: (d, role = 'primary') => `<path class="diagram-shape diagram-${role}" d="${d}"/>`,
  circle: (cx, cy, radius, role = 'primary') => `<circle class="diagram-shape diagram-${role}" cx="${cx}" cy="${cy}" r="${radius}"/>`,
  line: (x1, y1, x2, y2, role = 'primary') => `<line class="diagram-shape diagram-${role}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`,
  axis: (x1, y1, x2, y2, markers) => `<line class="diagram-shape diagram-axis" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#${markers.axis})"/>`,
  arrow: (x1, y1, x2, y2, role, markers) => `<line class="diagram-shape diagram-${role}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#${markers[role] || markers.primary})"/>`,
  guide: (x1, y1, x2, y2) => `<line class="diagram-shape diagram-guide" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`,
  equilibrium: (x1, y1, x2, y2) => `<line class="diagram-shape diagram-equilibrium" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`,
  bracket: (x1, x2, y) => `<path class="diagram-shape diagram-bracket" d="M${x1} ${y - 3} V${y + 3} M${x1} ${y} H${x2} M${x2} ${y - 3} V${y + 3}"/>`,
  particle: (cx, cy, radius = 3) => `<circle class="diagram-shape diagram-particle" cx="${cx}" cy="${cy}" r="${radius}"/>`,
  body: (x, y, width, height) => `<rect class="diagram-shape diagram-body" x="${x}" y="${y}" width="${width}" height="${height}"/>`,
  observer: (cx, cy, radius = 3.5) => `<path class="diagram-shape diagram-observer" d="M${cx} ${cy - radius} L${cx + radius} ${cy} L${cx} ${cy + radius} L${cx - radius} ${cy} Z"/>`,
  node: (cx, cy, radius = 2.25) => `<circle class="diagram-shape diagram-node" cx="${cx}" cy="${cy}" r="${radius}"/>`,
  antinode: (cx, cy, radius = 3) => `<path class="diagram-shape diagram-antinode" d="M${cx} ${cy - radius} L${cx + radius} ${cy} L${cx} ${cy + radius} L${cx - radius} ${cy} Z"/>`,
  boundary: (x, y1, y2) => `<line class="diagram-shape diagram-boundary" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>`,
  label: (text, x, y, anchor = 'middle') => `<text class="diagram-label" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`
});

function markerDefinitions(markers) {
  return `<defs>
    <marker id="${markers.primary}" viewBox="0 0 5 5" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto"><path class="diagram-arrowhead diagram-arrowhead-primary" d="M0 0 L5 2.5 L0 5 Z"/></marker>
    <marker id="${markers.secondary}" viewBox="0 0 5 5" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto"><path class="diagram-arrowhead diagram-arrowhead-secondary" d="M0 0 L5 2.5 L0 5 Z"/></marker>
    <marker id="${markers.axis}" viewBox="0 0 5 5" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto"><path class="diagram-arrowhead diagram-arrowhead-axis" d="M0 0 L5 2.5 L0 5 Z"/></marker>
  </defs>`;
}

function visualSvg(type) {
  const prefix = `card-diagram-${type}-${diagramSequence += 1}`;
  const markers = {
    primary: `${prefix}-arrow-primary`,
    secondary: `${prefix}-arrow-secondary`,
    axis: `${prefix}-arrow-axis`
  };
  const diagrams = {
    trajectory: `${DIAGRAM.axis(15, 59, 112, 59, markers)}${DIAGRAM.axis(15, 61, 15, 7, markers)}${DIAGRAM.guide(15, 29, 35, 29)}${DIAGRAM.guide(35, 29, 35, 59)}${DIAGRAM.path('M15 59 C34 30 43 18 64 18 C84 18 96 35 108 59')}${DIAGRAM.arrow(15, 59, 35, 59, 'secondary', markers)}${DIAGRAM.arrow(15, 59, 15, 29, 'secondary', markers)}${DIAGRAM.arrow(15, 59, 35, 29, 'primary', markers)}${DIAGRAM.particle(15, 59, 2.75)}${DIAGRAM.label('x', 108, 55)}${DIAGRAM.label('y', 20, 11)}`,
    orbit: `${DIAGRAM.circle(56, 39, 24, 'secondary')}${DIAGRAM.guide(56, 39, 73, 22)}${DIAGRAM.node(56, 39, 2)}${DIAGRAM.arrow(73, 22, 59, 8, 'secondary', markers)}${DIAGRAM.arrow(73, 22, 60, 35, 'primary', markers)}${DIAGRAM.particle(73, 22, 3.5)}${DIAGRAM.label('v', 55, 10)}${DIAGRAM.label('a', 61, 29)}`,
    oscillation: `${DIAGRAM.boundary(12, 18, 56)}${DIAGRAM.equilibrium(61, 10, 61, 65)}${DIAGRAM.path('M12 37 H20 L24 29 L30 45 L36 29 L42 45 L48 29 L54 45 L60 29 L66 45 L72 37 H79', 'secondary')}${DIAGRAM.arrow(61, 61, 86, 61, 'primary', markers)}${DIAGRAM.arrow(86, 24, 64, 24, 'secondary', markers)}${DIAGRAM.body(79, 29, 14, 16)}${DIAGRAM.label('x', 74, 70)}${DIAGRAM.label('F', 75, 19)}`,
    graph: `${DIAGRAM.equilibrium(17, 16, 114, 16)}${DIAGRAM.equilibrium(17, 37, 114, 37)}${DIAGRAM.equilibrium(17, 58, 114, 58)}${DIAGRAM.path('M20 16 C35 6 51 6 66 16 C81 26 97 26 112 16')}${DIAGRAM.path('M20 31 C43 31 43 43 66 43 C89 43 89 31 112 31', 'secondary')}${DIAGRAM.path('M20 58 C35 68 51 68 66 58 C81 48 97 48 112 58', 'tertiary')}${DIAGRAM.label('x', 9, 18)}${DIAGRAM.label('v', 9, 39)}${DIAGRAM.label('a', 9, 60)}`,
    wave: `${DIAGRAM.equilibrium(8, 38, 112, 38)}${DIAGRAM.path('M8 38 C14 26 20 20 28 20 C36 20 42 26 48 38 C54 50 60 56 68 56 C76 56 82 50 88 38 C94 26 100 20 108 20')}${DIAGRAM.arrow(77, 10, 108, 10, 'primary', markers)}${DIAGRAM.arrow(48, 38, 48, 24, 'secondary', markers)}${DIAGRAM.particle(48, 38, 3)}${DIAGRAM.bracket(28, 108, 65)}${DIAGRAM.label('λ', 68, 72)}`,
    superposition: `${DIAGRAM.label('A', 9, 19)}${DIAGRAM.label('B', 9, 41)}${DIAGRAM.label('R', 9, 67)}${DIAGRAM.path('M18 18 H26 C30 18 31 8 38 8 C45 8 46 18 50 18 H112')}${DIAGRAM.arrow(52, 12, 65, 12, 'primary', markers)}${DIAGRAM.path('M18 40 H72 C76 40 77 30 84 30 C91 30 92 40 96 40 H112', 'secondary')}${DIAGRAM.arrow(70, 34, 57, 34, 'secondary', markers)}${DIAGRAM.path('M18 66 H48 C52 66 53 46 60 46 C67 46 68 66 72 66 H112', 'resultant')}`,
    standing: `${DIAGRAM.boundary(10, 10, 64)}${DIAGRAM.boundary(110, 10, 64)}${DIAGRAM.equilibrium(10, 37, 110, 37)}${DIAGRAM.path('M10 37 C18 54 27 56 35 56 C43 56 52 54 60 37 C68 20 77 18 85 18 C93 18 102 20 110 37', 'tertiary')}${DIAGRAM.path('M10 37 C18 20 27 18 35 18 C43 18 52 20 60 37 C68 54 77 56 85 56 C93 56 102 54 110 37')}${DIAGRAM.node(10, 37)}${DIAGRAM.node(60, 37)}${DIAGRAM.node(110, 37)}${DIAGRAM.antinode(35, 18)}${DIAGRAM.antinode(85, 56)}`,
    doppler: `${DIAGRAM.guide(6, 37, 114, 37)}${DIAGRAM.circle(53, 37, 10, 'secondary')}${DIAGRAM.circle(48, 37, 20, 'secondary')}${DIAGRAM.circle(43, 37, 30, 'secondary')}${DIAGRAM.circle(38, 37, 40, 'secondary')}${DIAGRAM.arrow(58, 37, 78, 37, 'primary', markers)}${DIAGRAM.particle(58, 37, 3.5)}${DIAGRAM.observer(106, 37)}${DIAGRAM.label('S', 58, 25)}${DIAGRAM.label('O', 106, 28)}`,
    materials: `${DIAGRAM.axis(48, 62, 110, 62, markers)}${DIAGRAM.axis(48, 62, 48, 12, markers)}${DIAGRAM.path('M48 62 L74 34 Q86 22 104 28', 'secondary')}${DIAGRAM.node(74, 34)}${DIAGRAM.body(12, 22, 16, 30)}${DIAGRAM.arrow(20, 18, 20, 8, 'primary', markers)}${DIAGRAM.arrow(20, 56, 20, 66, 'primary', markers)}${DIAGRAM.label('σ', 42, 16)}${DIAGRAM.label('ε', 108, 68)}`,
    conduction: `${DIAGRAM.body(10, 24, 16, 30)}${DIAGRAM.body(94, 24, 16, 30)}${DIAGRAM.body(26, 28, 34, 22)}${DIAGRAM.body(60, 28, 34, 22)}${DIAGRAM.arrow(36, 16, 84, 16, 'primary', markers)}${DIAGRAM.path('M18 20 L60 40 L102 58', 'secondary')}${DIAGRAM.label('TH', 18, 64)}${DIAGRAM.label('TC', 102, 64)}`,
    expansion: `${DIAGRAM.body(32, 22, 48, 34)}${DIAGRAM.path('M22 14 H90 V64 H22 Z', 'secondary')}${DIAGRAM.arrow(80, 22, 90, 14, 'primary', markers)}${DIAGRAM.arrow(80, 56, 90, 64, 'primary', markers)}${DIAGRAM.arrow(32, 22, 22, 14, 'primary', markers)}${DIAGRAM.label('ΔL', 56, 42)}`,
    planned: `${DIAGRAM.path('M25 18 H95 V56 H25 Z', 'guide')}${DIAGRAM.guide(60, 25, 60, 49)}${DIAGRAM.guide(48, 37, 72, 37)}${DIAGRAM.path('M25 28 V18 H35 M85 18 H95 V28 M95 46 V56 H85 M35 56 H25 V46', 'secondary')}`
  };
  return `<svg class="card-diagram" width="${CARD_DIAGRAM.width}" height="${CARD_DIAGRAM.height}" viewBox="0 0 ${CARD_DIAGRAM.width} ${CARD_DIAGRAM.height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${markerDefinitions(markers)}${diagrams[type] || diagrams.planned}</svg>`;
}

function cardTemplate(sim) {
  const statusLabel = sim.status === 'completed' ? 'Completed' : 'Planned';
  const action = sim.href ? `<a class="card-launch" href="${sim.href}" aria-label="Launch ${escapeHtml(sim.title)} simulation">Launch lab <span aria-hidden="true">↗</span></a>` : '<span class="card-launch is-disabled">Coming next <span aria-hidden="true">→</span></span>';
  const hasStandaloneDiagram = ['trajectory', 'orbit', 'oscillation', 'graph', 'wave', 'superposition', 'standing', 'doppler', 'materials', 'conduction', 'expansion', 'planned'].includes(sim.visual);
  const visualType = hasStandaloneDiagram ? '' : `<span class="visual-type">${escapeHtml(sim.visual)}</span>`;
  return `<article class="sim-card sim-card--${sim.visual} ${sim.href ? 'sim-card--linked' : ''} ${sim.status === 'planned' ? 'is-planned' : ''}">
    <div class="card-top"><span class="topic-number">${escapeHtml(sim.topic)}</span><span class="status status-${sim.status}"><span class="status-dot" aria-hidden="true"></span>${statusLabel}</span></div>
    <div class="card-visual">${visualSvg(sim.visual)}${visualType}</div>
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
