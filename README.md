# Animation Projects

A growing library of interactive [p5.js](https://p5js.org/) simulations for teaching **Physics 1 (SP015)** at pre-university level, with **SP025** to follow later. Each simulation is a standalone teaching tool built against the official curriculum specification — sliders map to real physical quantities, readouts use correct units and notation, and theory text matches the cited learning outcomes (LOs).

> New here? Read [`docs/architecture.md`](docs/architecture.md) before adding or modifying a simulation. It describes the patterns actually in use across the repo — folder layout, data flow, and file responsibilities.

---

## Folder overview

```
Animation-Projects/
  docs/
    architecture.md      <- structure, data flow, conventions (read this first)
  instructions/           <- coding/physics conventions + QA checklist (see below)
  shared/
    sim-style.css          shared visual language (topbar, controls, readouts, buttons, theory strip)
    sim-utils.js            shared p5 drawing/formatting helpers
  circular-motion/
  simple-harmonic-motion/  ("Oscillation Laboratory": spring–mass, pendulum, reference circle)
  shm-graphs-analysis/     (Topic 7.2: x–t / v–t / a–t / E–x graphs)
  shm-progressive-wave/    (Topic 7.4: Properties of Waves)
  shm-superposition/       (Topic 7.5: Superposition of Waves)
  <next-topic>/
  templates/
    simulation-template/   starting point for new simulations
```

Each simulation is **one folder, self-contained** — its own `index.html` (or `<topic>.html`), CSS, and JS. Nothing sim-specific lives outside its folder; nothing shared lives inside a sim's folder. If a helper turns up in two sims, it belongs in `shared/`.

---

## Running a simulation

These are static pages — no build step, no bundler. Open a simulation's `index.html` (or `<topic>.html`) directly in a browser, or serve the repo root with any static file server (e.g. VS Code's Live Server extension) if you want relative asset paths to resolve identically to production.

---

## Adding a new simulation

1. Copy `templates/simulation-template/` into a new topic-named folder (not `SP015-topic-7.x` — the topic number belongs in a comment/kicker, not the folder name).
2. Follow the simulation lifecycle in `docs/architecture.md` §3: lock the LO → define `PHYSICS`/`LIMITS`/`DISPLAY` constants → physics class(es) → `UIManager` → renderer → `SimulationController` → sketch entry point → theory strip/readouts.
3. Reuse `shared/sim-style.css` and `shared/sim-utils.js` untouched; add only topic-specific CSS/JS on top.
4. Before calling it done, check for duplication against existing sims and fold anything reusable into `shared/`. Run through `instructions/checklist.md`.

---

## Curriculum coverage

| Topic | Simulation | Status |
|---|---|---|
| 7.1 – 7.2 | Oscillation Laboratory / SHM Graphs Analysis | ✅ Done |
| 7.4 | Properties of Waves | ✅ Done |
| 7.5 | Superposition of Waves | 🔶 In progress — pulse superposition + interference done, standing waves pending |
| Circular Motion | Uniform Circular Motion | ✅ Done |
| — | *(next SP015 topic)* | ⬜ Planned |

Curriculum specs: [`Curriculum_Specifications_CS_Physics_SP015.pdf`](Curriculum_Specifications_CS_Physics_SP015.pdf), [`Curriculum_Specifications_CS_Physics_SP025.pdf`](Curriculum_Specifications_CS_Physics_SP025.pdf).

---

## Project conventions

Short-form guidance lives in `instructions/`:

- `system.md` — project goals, SP015/SP025 alignment, teaching philosophy, AI-prompting notes
- `coding.md` — naming conventions, file responsibilities, ES6 conventions, UI standards
- `physics.md` — units, coordinate conventions, vector conventions, simplifications
- `checklist.md` — QA checklist to run before calling a sim "done"

For the full architectural picture (data flow, controller/physics/renderer split, shared-code duplication notes), see [`docs/architecture.md`](docs/architecture.md).

---

## Maintenance note

This repo is maintained solo, with heavy use of AI coding assistants. Predictable structure matters more than any single simulation's cleverness — `docs/architecture.md` is the source of truth for conventions and should be updated whenever the architecture actually changes shape, not just planned to change.
