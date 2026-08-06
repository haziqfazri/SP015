# System — Project Goals & Philosophy

## 1. What this repo is

A growing library of standalone, interactive p5.js simulations teaching
**Physics 1 (SP015)** at pre-university level (SP025 to follow). Built and
maintained solo, with heavy use of AI coding assistants.

**Audience:** SP015/SP025 students and their teachers, using each sim as a
classroom or self-study visual aid alongside the official curriculum spec.

## 2. Educational objectives

Every simulation should:

- Map directly to a specific SP015/SP025 **learning outcome (LO)**, cited in
  code comments (e.g. `SP015 7.1(c.iii)`).
- Let a student **change one variable and see the physical consequence**
  immediately (slider → motion/graph response), not just watch a fixed
  animation.
- Use **correct units, signs, and notation** matching the curriculum spec —
  a wrong sign convention teaches a wrong physics habit.
- Show live **readouts** (position, velocity, energy, etc.) so the visual
  and the numbers reinforce each other.
- Be honest about simplifications (e.g. "exact sine term, not small-angle,"
  "λ is derived, never a slider") via a code comment or on-screen note,
  rather than silently faking a relationship.

## 3. Maintainability & animation philosophy

- **Consistency over cleverness.** A new sim should look and feel like the
  existing ones (same layout shell, same button/readout conventions) so
  students and future-you aren't relearning the UI each time.
- **Reuse before rewrite.** `shared/sim-style.css` and `shared/sim-utils.js`
  exist so no sim reinvents dashed guides, arrows, or readout diffing.
  Duplication gets folded into `shared/` as soon as a second sim needs it —
  not deferred indefinitely.
- **Cheap to build the next one.** Each sim should cost less effort than
  the last, because more of the plumbing (constants blocks, controller
  shape, file split) is now a known pattern, not a fresh decision.
- **State-driven animation, not scripted animation.** Motion always comes
  from physics state advancing (`integrate()`/`step()`/`advance()`) and
  being redrawn — never hardcoded keyframes or timers standing in for
  physics.

## 4. AI development notes

When an AI assistant (or future you) works in this repo:

1. **Read `docs/architecture.md` first**, every time, before touching
   anything. It documents the real data flow and file split in use.
2. **Modify only the files actually affected.** Don't touch a sim's HTML
   when only its physics changed, and vice versa.
3. **Preserve existing public APIs** (class/method names like
   `integrate()`, `energy()`, `period()`, `reset()`, UIManager's
   `callbacks` object shape) unless the task explicitly requires changing
   them — other files depend on these signatures.
4. **Reuse shared components** (`shared/sim-style.css`,
   `shared/sim-utils.js`) rather than re-implementing arrows, dashed
   guides, trail dots, or readout diffing locally.
5. **Avoid unnecessary rewrites.** Prefer the smallest diff that correctly
   satisfies the request; don't restyle, rename, or restructure code that
   wasn't asked about.
6. **Follow the LO-first workflow** from `architecture.md` §3 when adding
   a new sim: pick the LO → constants → physics class → UIManager →
   renderer → controller → sketch → theory strip.
7. **Fold new duplication into `shared/`** before considering a task done,
   per `architecture.md` §5/§6 — don't leave a third copy of a helper.
