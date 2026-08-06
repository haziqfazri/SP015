# Repository Refactoring & AI Optimization Roadmap

## Purpose

This roadmap outlines the implementation plan for improving the repository architecture, documentation, AI workflow, and long-term maintainability.

The objective is to build a repository that is:

* Easy for humans to navigate
* Easy for AI coding assistants to understand
* Highly reusable
* Scalable as more simulations are added
* Optimized for reduced context usage and token consumption

---

# Phase 1 — Freeze the Architecture

**Priority:** Critical

**Estimated Time:** 30–60 minutes

## Objective

Establish a stable architecture before reorganizing files or adding new features.

## Tasks

### 1. Create a `docs/` directory

```text
docs/
    architecture.md
    workflow.md
    checklist.md
```

Move existing documentation into this folder:

```text
workflow-guide.md  → docs/workflow.md

sim-checklist.md   → docs/checklist.md
```

Do not modify the content yet. This phase focuses only on organizing documentation.

---

### 2. Create `architecture.md`

This document becomes the primary reference for both developers and AI assistants.

Include:

* Project philosophy
* High-level architecture
* Folder responsibilities
* Simulation lifecycle
* Data flow
* Shared components
* Future expansion strategy

Example data flow:

```text
User

↓

UI

↓

Controller

↓

Physics Engine

↓

Simulation State

↓

Renderer

↓

Canvas
```

---

# Phase 2 — Build an Instructions System

**Priority:** Critical

**Estimated Time:** 1–2 hours

## Objective

Separate project knowledge into focused instruction files.

## Create

```text
instructions/

    README.md

    system.md

    coding.md

    physics.md

    ui.md

    workflow.md

    checklist.md

    prompting.md
```

---

## README.md

Acts as an index.

Example:

```text
Need project architecture?

→ docs/architecture.md

Need coding conventions?

→ coding.md

Need physics assumptions?

→ physics.md

Need workflow?

→ workflow.md

Need quality assurance?

→ checklist.md
```

---

## system.md

Contains project-wide philosophy.

Suggested contents:

* Project goals
* Target audience
* Educational objectives
* SP015 curriculum alignment
* Maintainability philosophy
* Animation philosophy

---

## coding.md

Contains coding standards only.

Suggested contents:

* Naming conventions
* Folder organization
* File responsibilities
* ES6 conventions
* Constants
* Comments
* Error handling
* Performance guidelines
* Refactoring principles

---

## physics.md

Contains physics-specific guidance.

Suggested contents:

* Units
* Coordinate system
* Vector conventions
* Numerical assumptions
* Simplifications
* Learning outcomes
* Required equations

---

## ui.md

Contains UI standards.

Suggested contents:

* Layout
* Button placement
* Slider placement
* Fonts
* Colors
* Spacing
* Accessibility
* Responsive design

---

## prompting.md

Contains AI development guidelines.

Suggested contents:

* Read architecture first
* Modify only affected files
* Preserve existing APIs
* Reuse shared components
* Avoid unnecessary rewrites
* Complete checklist before finishing

---

# Phase 3 — Reorganize the Repository

**Priority:** High

**Estimated Time:** 1–2 hours

## Objective

Create a scalable project structure.

Recommended layout:

```text
Animation-Projects/

docs/

instructions/

shared/

animations/

templates/

assets/

tools/

README.md
```

Move all simulations into:

```text
animations/

    circular-motion/

    projectile/

    torque/

    shm/

    waves/
```

This keeps the repository organized as the number of simulations grows.

---

# Phase 4 — Refactor Shared Code

**Priority:** High

**Estimated Time:** 2–4 hours

## Objective

Organize reusable code into logical modules.

Recommended structure:

```text
shared/

    physics/

    rendering/

    ui/

    utilities/

    styles/
```

---

## physics/

Move:

* Vector utilities
* Constants
* Units
* Motion equations
* Numerical helpers

---

## rendering/

Move:

* Graph rendering
* Axes
* Grid
* Labels
* Arrows
* Canvas helpers

---

## ui/

Move:

* Sliders
* Playback controls
* Buttons
* Dropdowns
* Tooltips

---

## utilities/

Move:

* Formatting
* Math helpers
* Validation
* Generic utility functions

---

# Phase 5 — Build a Simulation Template

**Priority:** High

**Estimated Time:** 30 minutes

## Objective

Standardize new simulations.

Create:

```text
templates/

    simulation-template/

        index.html

        sketch.js

        controller.js

        physics.js

        renderer.js

        ui.js

        styles.css
```

Every new simulation should begin from this template.

---

# Phase 6 — Define File Responsibilities

**Priority:** High

**Estimated Time:** 1 hour

Document the responsibility of each major file.

---

## controller.js

Responsible for:

* Playback
* Time stepping
* Connecting UI
* Calling physics
* Calling renderer

Must **not**:

* Draw graphics
* Calculate equations
* Store UI state

---

## physics.js

Responsible for:

* Equations
* Numerical calculations
* Simulation state
* Physics logic

Must **not**:

* Draw graphics
* Access HTML
* Handle buttons

---

## renderer.js

Responsible for:

* Drawing
* Labels
* Graphs
* Animation
* Canvas rendering

Must **not**:

* Perform physics calculations
* Manage UI
* Handle playback

---

# Phase 7 — Expand the README

**Priority:** Medium

**Estimated Time:** 1 hour

The README should allow a new contributor to understand the project without reading additional documentation.

Suggested sections:

* Project Overview
* Features
* Folder Structure
* Architecture Overview
* Shared Modules
* How to Add a Simulation
* Development Workflow
* Coding Standards
* Quality Checklist
* Roadmap

---

# Phase 8 — Add Architecture Diagrams

**Priority:** Medium

**Estimated Time:** 30 minutes

Replace long textual explanations with simple diagrams.

Example:

```text
User

↓

Slider

↓

Controller

↓

Physics

↓

State

↓

Renderer

↓

Canvas
```

Another example:

```text
Simulation

↓

Shared Physics

↓

Shared Renderer

↓

Shared UI

↓

Shared Utilities
```

Diagrams improve readability for both developers and AI assistants.

---

# Phase 9 — Create Prompt Templates

**Priority:** Medium

**Estimated Time:** 1–2 hours

Create:

```text
prompts/

    new-simulation.md

    add-feature.md

    bug-fix.md

    optimize.md

    refactor.md
```

Each template should define:

* Goal
* Requirements
* Scope
* Files affected
* Files excluded
* Expected output
* Completion checklist

---

# Phase 10 — Prepare for Graph-Based Knowledge Retrieval

**Priority:** Low

**Estimated Time:** 2–3 hours

Do **not** graph the entire codebase.

Instead, graph relationships.

Example nodes:

* Simulation
* Learning Outcome
* Physics Concept
* Formula
* Renderer
* Shared Module
* UI Control

Example relationships:

```text
Projectile Motion

uses

Shared Graph Renderer
```

```text
SHM

uses

Playback Controller
```

```text
Torque

requires

Vector Utility
```

Graph retrieval becomes valuable once the project contains many simulations and shared modules.

---

# Phase 11 — Build a Shared Component Library

**Priority:** Ongoing

As the repository grows, extract reusable components.

Examples:

```text
PlaybackController

TimeController

AxisRenderer

GraphRenderer

GridRenderer

LabelRenderer

VectorRenderer

SpringRenderer

WaveRenderer

SliderPanel

ControlPanel
```

Avoid duplicating code across simulations.

---

# Phase 12 — Continuous Refactoring

**Priority:** Ongoing

After completing each simulation:

1. Review duplicated code.
2. Extract reusable logic into `shared/`.
3. Update `architecture.md` if the architecture changes.
4. Update `checklist.md` with new best practices.
5. Improve templates when patterns emerge.

Continuous maintenance prevents long-term technical debt.

---

# Recommended Implementation Order

| Phase                                              | Priority | Estimated Effort |
| -------------------------------------------------- | -------- | ---------------- |
| Phase 1 — Freeze the Architecture                  | Critical | 30–60 min        |
| Phase 2 — Build an Instructions System             | Critical | 1–2 h            |
| Phase 3 — Reorganize the Repository                | High     | 1–2 h            |
| Phase 4 — Refactor Shared Code                     | High     | 2–4 h            |
| Phase 5 — Build a Simulation Template              | High     | 30 min           |
| Phase 6 — Define File Responsibilities             | High     | 1 h              |
| Phase 7 — Expand the README                        | Medium   | 1 h              |
| Phase 8 — Add Architecture Diagrams                | Medium   | 30 min           |
| Phase 9 — Create Prompt Templates                  | Medium   | 1–2 h            |
| Phase 10 — Prepare Graph-Based Knowledge Retrieval | Low      | 2–3 h            |
| Phase 11 — Build a Shared Component Library        | Ongoing  | Incremental      |
| Phase 12 — Continuous Refactoring                  | Ongoing  | Continuous       |

---

# Success Criteria

The refactoring effort is complete when:

* Repository structure is consistent and scalable.
* Documentation is modular and easy to navigate.
* AI assistants can locate relevant instructions without loading unnecessary context.
* Shared functionality is centralized.
* New simulations can be created from a standard template.
* Architectural decisions are documented.
* Reusable components replace duplicated code.
* Continuous refactoring becomes part of the normal development workflow.
