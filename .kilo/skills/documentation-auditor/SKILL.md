---
name: documentation-auditor
description: Audit the repo's documentation for staleness and consistency with the actual code. Use when asked to check, verify, or update the docs, find stale claims in README/architecture/instructions, or confirm docs match reality.
---

# Documentation Auditor

`docs/architecture.md` is the source of truth and must describe what is
TRUE in the repo, not what was once planned. `instructions/` support it;
`README.md` is the front door. This skill checks that all of them still
match reality. Report findings in chat as an in-chat list with `file:line`
and a concrete fix suggestion per item. Do not edit files unless asked.

## 1. Folder tree vs. reality

- Compare the folder tree in `docs/architecture.md` §2 and README against
  `ls animations/` (plus any topic subfolders).
- Every existing sim must appear; flag missing additions and stale entries.
- New sims must be reflected in `instructions/physics.md` §4's LO table and
  README's curriculum-coverage table.

## 2. Shared-component list (architecture.md §6)

- Read `shared/sim-utils.js` and `shared/sim-style.css`. Every exported
  helper/class/constant in `shared/` must be listed in architecture.md §6.
- Flag any helper used by 2+ sims that is still local (duplication the docs
  don't record) as a note, not a doc error — the docs should record
  duplication known to be unreconciled (the §6 "duplication observed" list).

## 3. Data-flow claims

- Verify architecture.md §5's claims against actual code:
  - UIManager is the sole DOM accessor, never calls physics/renderer.
  - Controller is the only class talking to both UI and physics.
  - Readout-update rule: param-only readouts updated from `on*Change`,
    never from the per-frame loop; t-dependent readouts per-frame is
    legitimate (7.5).
  - Canvas-mode examples named in §5 match reality (global: 2.3, 05, 7.1,
    7.4, 7.6, 7.7; instance: 7.2, 7.5).
- Grep for violations (physics files referencing `document`/`window`, UIManager
  touching physics, renderers computing physics) and flag the doc if the
  claims don't match.

## 4. Instructions consistency

- `instructions/checklist.md` must stay the canonical QA list — cross-check
  that the `simulation-qa` skill still mirrors it.
- `instructions/coding.md` §4's palette list must match the `:root` block in
  `shared/sim-style.css` and `PALETTE` in `shared/sim-utils.js`.
- KaTeX convention: `instructions/coding.md` must point to the canonical
  KaTeX `<link>`/`<script>` tags (version + SRI hashes) in
  `shared/sim-style.css`'s KaTeX comment block as the single source of truth.
  Verify the version/hashes are actually there and consistent across sims.

## 5. Broken references

- Run `node .kilo/scripts/check-links.mjs` from the repo root and report
  every broken/missing target.
- Grep `.md` files for links to files that don't exist
  (`[label](path)`, relative references in README/AGENTS.md).
- Check that the curriculum spec referenced by README and
  `docs/architecture.md` §1 exists at the repo root
  (`SP015-curriculum-spec.md`).

## 6. Staleness rules

- If architecture.md contradicts the code, the DOC is what must change —
  flag it explicitly.
- If an instruction file contradicts architecture.md, flag the instruction.
- If README duplicates a list that lives elsewhere (curriculum coverage,
  folder tree), it must match the source of truth; drift is a finding.

## Output format

Per finding: `file:line` — what is stale/wrong — what to change. End with a
summary of hard (factual) vs. soft (style/preference) findings.
