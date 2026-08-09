# Animation Projects

A growing library of interactive [p5.js](https://p5js.org/) simulations for teaching **Physics 1 (SP015)** at pre-university level, with **SP025** to follow later. Each simulation is a standalone teaching tool built against the official curriculum specification — sliders map to real physical quantities, readouts use correct units and notation, and theory text matches the cited learning outcomes (LOs).

> New here? Read [`docs/architecture.md`](docs/architecture.md) before adding or modifying a simulation. It is the source of truth for the repository structure and simulation data flow.

---

## Folder overview

```text
SP015/
  animations/
    05-circular-motion/
      circular-motion-sim.js
      circular-motion-sketch.js
      circular-motion.css
      circular-motion.html
    07-simple-harmonic-motion/
      7.1-kinematics-of-shm/
      7.2-graphs-shm/
      7.4-progressive-wave-shm/
      7.5-superposition-shm/
      7.6-application-of-standing-waves/
  docs/
    architecture.md      <- repository structure and simulation architecture
  instructions/
    system.md             <- project goals and AI development guidance
    coding.md             <- coding and UI conventions
    physics.md            <- physics conventions
    checklist.md          <- pre-release QA checklist
  shared/
    sim-style.css         <- shared visual language
    sim-utils.js          <- shared p5 drawing/formatting helpers
  templates/              <- starting point for new simulations
```

Each simulation is **self-contained inside its topic folder**. It owns its HTML, CSS, and JavaScript files. Shared code lives in `shared/`; simulation-specific code should not be placed there.

The exact file split depends on the simulation. Small simulations may combine related code into fewer files; more involved simulations may use separate physics, UI, controller, renderer, and sketch files. See [`docs/architecture.md`](docs/architecture.md) for the current patterns.

---

## Running a simulation

These are static pages — no build step and no bundler. Open a simulation's HTML file directly in a browser, or serve the repository root with any static file server (for example, VS Code's Live Server extension) if you want relative asset paths to resolve identically to production.

---

## Adding a new simulation

1. Start from the files in `templates/` and copy only the structure you actually need into the appropriate topic folder under `animations/`.
2. Follow the simulation lifecycle and data flow described in [`docs/architecture.md`](docs/architecture.md).
3. Reuse `shared/sim-style.css` and `shared/sim-utils.js` where they fit; add only topic-specific CSS/JS to the simulation folder.
4. Before calling it done, check for duplication against existing sims and run through `instructions/checklist.md`.

Use the **simplest architecture that keeps the simulation clear**. Do not split a small simulation into multiple files merely to match the structure of a more complex simulation.

---

## Curriculum coverage

| Topic | Simulation | Status |
|---|---|---|
| 7.1 – 7.2 | Oscillation Laboratory / SHM Graphs Analysis | ✅ Done |
| 7.4 | Properties of Waves | ✅ Done |
| 7.5 | Superposition of Waves | 🔶 In progress — pulse superposition + interference done, standing waves pending |
| Circular Motion | Uniform Circular Motion | ✅ Done |
| — | *(next SP015 topic)* | ⬜ Planned |

Curriculum specs: [`Curriculum Specifications (CS) Physics SP015.pdf`](Curriculum%20Specifications%20(CS)%20Physics%20SP015.pdf), [`Curriculum Specifications (CS) Physics SP025.pdf`](Curriculum%20Specifications%20(CS)%20Physics%20SP025.pdf).

---

## Project guidance

- [`docs/architecture.md`](docs/architecture.md) — repository structure, simulation lifecycle, data flow, file responsibilities, and shared-code boundaries.
- [`instructions/system.md`](instructions/system.md) — project goals, educational objectives, and AI development guidance.
- [`instructions/coding.md`](instructions/coding.md) — naming, JavaScript, file, and UI conventions.
- [`instructions/physics.md`](instructions/physics.md) — units, coordinate conventions, vector conventions, and physics assumptions.
- [`instructions/checklist.md`](instructions/checklist.md) — QA checklist before calling a simulation done.

**Source of truth:** `docs/architecture.md` is authoritative for repository structure and architectural/data-flow decisions. The files in `instructions/` provide supporting day-to-day conventions and QA guidance. If an instruction conflicts with the actual architecture, update the relevant documentation rather than maintaining two competing descriptions.

---

## Maintenance note

This repo is maintained solo, with heavy use of AI coding assistants. Predictable structure matters more than cleverness. Prefer small, targeted changes and keep documentation aligned with the structure that actually exists in the repository.
