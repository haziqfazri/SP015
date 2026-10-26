# SP015 + SP025 Physics Simulation Library

A growing library of interactive [p5.js](https://p5js.org/) simulations for teaching **Physics 1 (SP015)** and **Physics 2 (SP025)** at pre-university level. Current implemented simulations are SP015; SP025 content is pending its verified curriculum specification. Each simulation is a standalone teaching tool built against the official curriculum specification — sliders map to real physical quantities, readouts use correct units and notation, and theory text matches the cited learning outcomes (LOs).

> New here? Read [`docs/architecture.md`](docs/architecture.md) before adding or modifying a simulation. It is the source of truth for the repository structure and simulation data flow.

---

## Simulation layout and pending semester interface

All 13 SP015 simulation folders now use `simulations/sp015/`, including the
unpublished Thermodynamics Workbench. The catalogue still has 12 entries.
`landing/` remains SP015-only, without semester metadata or tabs. The approved
semester structure and future interface are:

```text
simulations/
  sp015/<chapter>/<combined-learning-outcome-folder>/
  sp025/<chapter>/<combined-learning-outcome-folder>/
landing/       # one page, with SP015 and SP025 tabs; SP015 initially selected
shared/        # common styles, helpers, fonts, and startup guard
vendor/        # common pinned browser dependencies
templates/     # starter prepared for the future four-level topic depth
```

Semester tabs will preserve the current visual design and remember each
semester's search and chapter/status filters independently. Grouping keys and
HTML IDs must include the semester. Thermodynamics Workbench remains absent
from the published catalogue. The GitHub repository name is unchanged, and no
old-URL compatibility tree is planned. Existing redirects will be preserved as
files within the new simulation folders.

See the [active migration plan](docs/plan/active/physics-library-migration-plan.md)
and [complete migration map](docs/plan/active/physics-library-migration-map.json).
Further structural changes and semester UI work require separate approval.

## Current on-disk folder overview

```text
SP015/
  simulations/sp015/     <- all SP015 simulations, including unpublished Workbench
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

Each simulation is **self-contained inside its numbered topic folder**. Every
simulation launches from `index.html`, and topic-specific CSS/JavaScript files
use the topic slug as their prefix. Shared code lives in `shared/`; simulation-
specific code should not be placed there. A few former HTML entry paths remain
as redirect stubs for bookmarked URLs.

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

Then open <http://localhost:8000/landing/>. Serving the root preserves the landing page's relative paths to `simulations/`, `shared/`, and the curriculum PDF. Ignored local `.DS_Store` files may leave an `animations/` directory on disk; no simulation depends on it.

### Browser smoke tests (development only)

Chromium smoke tests cover the landing page and migrated Projectile/Circular
Motion pages at both `/` and `/SP015/`, across desktop, 800, 460, and 320 px.
The test server starts automatically; simulation pages still need no build step.

```sh
npm ci
npm run test:browser:install
npm run test:browser
```

See [browser testing](docs/browser-testing.md) for prerequisites, filtered runs,
failure screenshots/traces, sandbox restrictions, and coverage limits. Existing
Node tests and migration validators remain separate and unchanged.

### Codex development loop

Before a change, inspect `git status`, read `AGENTS.md` and
`docs/architecture.md`, and identify the smallest affected file set. Keep
unrelated user changes intact. After implementation, run the focused syntax
checks and tests, `git diff --check`, and browser/responsive QA for any visual
or interaction change. Report assumptions, changed files, verification, and
any remaining limitations in the handoff.

---

## Adding a new simulation

Start from [`templates/`](templates/README.md), which has the full build order and setup steps. Copy only the structure you need into the approved semester destination described in the template guide, follow the lifecycle in [`docs/architecture.md`](docs/architecture.md), reuse `shared/` where it fits, and check `instructions/checklist.md` before calling it done.

---

## Curriculum coverage

| Topic | Simulation | Status |
|---|---|---|
| 2.3 | Projectile Motion | ✅ Done |
| 5 | Uniform Circular Motion | ✅ Done |
| 7.1 | Kinematics of Simple Harmonic Motion | ✅ Done |
| 7.2 | SHM Graphs Analysis | ✅ Done |
| 7.4 | Progressive Waves | ✅ Done |
| 7.5 | Superposition of Waves | ✅ Done — pulse superposition + interference |
| 7.6 | Application of Standing Waves | ✅ Done |
| 7.7 | Doppler Effect | ✅ Done |
| 8.1, 8.2 | Materials Testing Laboratory | ✅ Done |
| 8.3 | Heat Conduction Laboratory | ✅ Done |
| 8.4 | Thermal Expansion Laboratory | ✅ Done |
| 9.1, 9.2 | Molecular Gas Laboratory | ✅ Done |
| 9.3–9.5 | Thermodynamics Workbench | Unpublished; release criteria pending |

Curriculum spec: [`Curriculum Specifications (CS) Physics SP015.pdf`](<Curriculum Specifications (CS) Physics SP015.pdf>). *(The SP025 specification is absent from the current checkout; verify its authoritative version before adding SP025 content.)*

---

## Project guidance

- [`docs/architecture.md`](docs/architecture.md) — repository structure, simulation lifecycle, data flow, file responsibilities, and shared-code boundaries.
- [`instructions/system.md`](instructions/system.md) — project goals, educational objectives, and AI development guidance.
- [`instructions/coding.md`](instructions/coding.md) — naming, JavaScript, file, and UI conventions.
- [`instructions/physics.md`](instructions/physics.md) — units, coordinate conventions, vector conventions, and physics assumptions.
- [`instructions/checklist.md`](instructions/checklist.md) — QA checklist before calling a simulation done.
- [`landing/README.md`](landing/README.md) — landing-page behavior, local serving, and file responsibilities.
- [`docs/plan/completed/`](docs/plan/completed/) — completed implementation plans and evidence; keep unfinished work in [`docs/plan/active/`](docs/plan/active/).

The files in `instructions/` provide supporting day-to-day conventions and QA guidance underneath `docs/architecture.md` (see the callout at the top of this file). `AGENTS.md` contains the repository's Codex execution contract. If an instruction ever conflicts with the actual architecture, update the relevant documentation rather than maintaining two competing descriptions. Dated audits and plans record historical or in-progress status; they do not replace the current architecture.

---

## Maintenance note

This repo is maintained solo, with heavy use of AI coding assistants. Predictable structure matters more than cleverness. Prefer small, targeted changes and keep documentation aligned with the structure that actually exists in the repository.
