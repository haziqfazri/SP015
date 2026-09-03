# Animation Projects

A growing library of interactive [p5.js](https://p5js.org/) simulations for teaching **Physics 1 (SP015)** at pre-university level, with **SP025** to follow later. Each simulation is a standalone teaching tool built against the official curriculum specification — sliders map to real physical quantities, readouts use correct units and notation, and theory text matches the cited learning outcomes (LOs).

> New here? Read [`docs/architecture.md`](docs/architecture.md) before adding or modifying a simulation. It is the source of truth for the repository structure and simulation data flow.

---

## Folder overview

```text
SP015/
  animations/            <- simulations, grouped by chapter (see docs/architecture.md for the current per-topic list)
  docs/
    architecture.md      <- repository structure and simulation architecture
    audits/               <- evidence-based repository and landing-page reviews
    plan/active/          <- plans currently being worked on
    plan/completed/       <- finished plans and their evidence
  instructions/
    system.md             <- project goals and AI development guidance
    coding.md             <- coding and UI conventions
    physics.md            <- physics conventions
    checklist.md          <- pre-release QA checklist
  shared/
    sim-style.css         <- shared visual language
    sim-utils.js          <- shared p5 drawing/formatting helpers
    fonts.css             <- local DM Sans and Space Mono font faces
    offline-runtime.js    <- dependency guard and readable startup errors
  vendor/                 <- pinned local p5.js, KaTeX, and font assets
  templates/              <- starting point for new simulations
```

Each simulation is **self-contained inside its topic folder**. It owns its HTML, CSS, and JavaScript files. Shared code lives in `shared/`; simulation-specific code should not be placed there.

The [`landing/`](landing/) page is the static, metadata-driven index for the simulations. It is a product entry point rather than a simulation: its card metadata, search/filter behavior, topic SVG thumbnails, and responsive visual system live together in that folder.

The exact file split depends on the simulation. Small simulations may combine related code into fewer files; more involved simulations may use separate physics, UI, controller, renderer, and sketch files. See [`docs/architecture.md`](docs/architecture.md) for the current patterns.

---

## Running a simulation

These are static pages — no build step and no bundler. Open a simulation's HTML file directly in a browser, or serve the repository root with any static file server (for example, VS Code's Live Server extension) if you want relative asset paths to resolve identically to production.

Runtime libraries and project fonts are vendored under [`vendor/`](vendor/), so
the landing page and simulations continue to work when the browser is offline.
If a required local runtime file is missing, the page shows an accessible
dependency error instead of failing silently with a blank canvas.

To run the landing page locally from the repository root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/landing/>. Serving the root preserves the landing page's relative paths to `animations/`, `shared/`, and the curriculum PDF.

---

## Adding a new simulation

Start from [`templates/`](templates/README.md), which has the full build order and setup steps. In short: copy only the structure you need into the right topic folder under `animations/`, follow the lifecycle in [`docs/architecture.md`](docs/architecture.md), reuse `shared/` where it fits, and check `instructions/checklist.md` before calling it done.

---

## Curriculum coverage

| Topic | Simulation | Status |
|---|---|---|
| 2.3 | Projectile Motion | ✅ Done |
| 7.1 | Kinematics of Simple Harmonic Motion | ✅ Done |
| 7.2 | SHM Graphs Analysis | ✅ Done |
| 7.4 | Progressive Waves | ✅ Done |
| 7.5 | Superposition of Waves | ✅ Done — pulse superposition + interference |
| 7.6 | Application of Standing Waves | ✅ Done |
| 7.7 | Doppler Effect | ✅ Done |
| 5 | Uniform Circular Motion | ✅ Done |
| — | *(next SP015 topic)* | ⬜ Planned |

Curriculum spec: [`Curriculum Specifications (CS) Physics SP015.pdf`](<Curriculum Specifications (CS) Physics SP015.pdf>). *(The SP025 spec is available as a PDF; it is not yet converted to markdown.)*

---

## Project guidance

- [`docs/architecture.md`](docs/architecture.md) — repository structure, simulation lifecycle, data flow, file responsibilities, and shared-code boundaries.
- [`instructions/system.md`](instructions/system.md) — project goals, educational objectives, and AI development guidance.
- [`instructions/coding.md`](instructions/coding.md) — naming, JavaScript, file, and UI conventions.
- [`instructions/physics.md`](instructions/physics.md) — units, coordinate conventions, vector conventions, and physics assumptions.
- [`instructions/checklist.md`](instructions/checklist.md) — QA checklist before calling a simulation done.
- [`landing/README.md`](landing/README.md) — landing-page behavior, local serving, and file responsibilities.
- [`docs/plan/completed/`](docs/plan/completed/) — completed implementation plans and evidence; keep unfinished work in [`docs/plan/active/`](docs/plan/active/).

The files in `instructions/` provide supporting day-to-day conventions and QA guidance underneath `docs/architecture.md` (see the callout at the top of this file). If an instruction ever conflicts with the actual architecture, update the relevant documentation rather than maintaining two competing descriptions.

---

## Maintenance note

This repo is maintained solo, with heavy use of AI coding assistants. Predictable structure matters more than cleverness. Prefer small, targeted changes and keep documentation aligned with the structure that actually exists in the repository.
