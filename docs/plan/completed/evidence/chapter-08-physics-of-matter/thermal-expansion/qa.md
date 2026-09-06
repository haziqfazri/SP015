# Thermal Expansion Laboratory QA — 2026-09-06

## Deterministic and static checks

- All Chapter 8 JavaScript files passed `node --check`.
- Materials Testing, Heat Conduction, and Thermal Expansion controller, physics, and renderer test files passed.
- Chapter 8 HTML files passed duplicate-ID and local-asset checks.
- The 8.4 renderer contains no inline color literals; its HTML contains no raw math entities.
- `git diff --check` passed.

## Browser checks

- Exercised Linear, Area, Volume, and Liquid + container modes; exactly one mode retained `aria-pressed="true"` after each switch.
- Verified keyboard activation, positive and negative target temperature changes, liquid overflow and no-overflow states, Play/Pause, Step, Reset, and replay behavior.
- Checked responsive layouts at 1440, 800, 460, and 320 CSS pixels. Canvas resizing, 44 px mode targets, control visibility, and single-column readouts remained usable without horizontal overflow.
- Browser console warning/error checks were empty after load and interaction.
- Removed a duplicated canvas heading found during the 800 px visual pass, then reloaded and repeated the relevant checks.

The browser harness did not expose persistent screenshot export, so this record preserves the reproducible viewport measurements and observations rather than image files.
