# Landing Page UI/UX Audit

## Executive Summary

The landing page is a polished, coherent educational index that clearly belongs to the same product as the simulations. Its strongest qualities are its distinctive physics-focused visual language, clear primary CTA, useful chapter/search filters, well-structured simulation metadata, and restrained use of decoration.

No critical issues or major redesign needs were found. The principal weaknesses are accessibility-related: the global focus ring becomes nearly invisible on light backgrounds, several small accent labels fail text-contrast requirements, and important mobile links have undersized targets. Simulation discovery also suffers from a misleading whole-card hover effect and cramped cards immediately above the 460 px breakpoint.

The audit inspected the implementation, repository conventions, shared styles, representative simulation pages, and rendered layouts at 1440, 1024, 800, 480, 460, and 320 px. All eight completed simulation links resolve. No files were modified during the audit.

The `ui-ux-pro-max` skill informed the accessibility, interaction, typography, and responsive checks; its generic commercial landing-page recommendations were intentionally filtered through this project’s educational purpose.

### Post-audit verification — 2026-09-02

The original findings below are retained as the audit snapshot. The targeted landing SVG remediation was subsequently completed and verified in [Phase 7 final QA](../plan/active/landing_svg_phase_7_final_qa.md). The following findings are now resolved:

| Finding | Status | Verification |
| --- | --- | --- |
| A11Y-001 | Resolved | Light surfaces use an ink focus outline; dark header, hero, and footer surfaces use acid. Completed-card keyboard focus outlines the full clickable card. |
| A11Y-002 | Resolved | Small light-surface curriculum and status labels use `--ink`; essential diagram geometry meets the 3:1 graphical-object threshold. |
| A11Y-003 | Resolved | Navigation, filters, search, launch actions, and footer links have at least 44 px target height. |
| INT-001 | Resolved | Completed cards use one semantic stretched launch link across the full card and retain whole-card hover feedback; the planned card remains static and unlinked. |
| RESP-001 | Resolved | The card grid changes to one column at 600 px, covering the previously cramped 480 px state. |
| RESP-002 | Resolved | Card diagrams are capped at 264 × 163 px and the hero is capped at 446 × 345 px at tablet widths. |

IA-001, CONTENT-001, IMP-001, IMP-002, and EDU-001 remain outside the SVG remediation scope.

## UI/UX Health

| Area | Rating | Summary |
| --- | --- | --- |
| Visual hierarchy | Excellent | Strong first impression, immediate subject identification, and clear primary CTA. |
| Layout & spacing | Good | Balanced desktop composition; a breakpoint cliff produces cramped cards around 480 px. |
| Typography | Good | Strong type pairing and hierarchy; important microtext is sometimes too small. |
| Color & visual system | Needs Attention | Visually coherent, but focus and small accent-text contrast fail on light surfaces. |
| Navigation | Good | Simple and understandable; mobile targets need enlargement. |
| Simulation discovery | Needs Attention | Excellent card content, but card affordance and Chapter 7 naming create friction. |
| Interaction design | Needs Attention | Native controls are sound; whole-card hover suggests a larger clickable area than exists. |
| Responsive design | Needs Attention | No target-width overflow, but intermediate-width density and SVG scaling need attention. |
| Accessibility | Needs Attention | Good semantics and reduced-motion support, offset by focus, contrast, and target-size issues. |
| Content clarity | Good | Purpose and simulation descriptions are clear; planned-item counting is misleading. |
| Implementation quality | Good | Compact vanilla implementation with safe escaping; some token and metadata duplication. |
| Repository consistency | Good | Strong visual continuity with simulation pages; duplicated palette declarations risk drift. |

## Findings Summary

| ID | Severity | Area | Summary |
| --- | --- | --- | --- |
| A11Y-001 | High | Keyboard accessibility | Acid focus outline has only 1.08–1.17:1 contrast on light sections. |
| A11Y-002 | Medium | Color contrast | Small orange and orange-dark labels fail 4.5:1 contrast. |
| A11Y-003 | Medium | Touch/readability | Several navigation, filter, and card actions have small text and undersized targets. |
| INT-001 | Medium | Interaction | Cards animate like fully clickable objects, but only a small footer link works. |
| RESP-001 | Medium | Responsive layout | The two-column card grid remains active at 480 px and becomes cramped. |
| IA-001 | Medium | Information architecture | Wave simulations are grouped under “Simple Harmonic Motion.” |
| CONTENT-001 | Medium | Content clarity | The planned placeholder is counted and announced as a lab. |
| IMP-001 | Medium | Maintainability | Landing CSS duplicates shared tokens/base rules and introduces raw color values. |
| RESP-002 | Low | Responsive density | Uncapped SVG scaling makes tablet/mobile visual panels disproportionately tall. |
| IMP-002 | Low | Maintainability | Project counts and coverage information are hard-coded in multiple places. |
| EDU-001 | Enhancement | Educational discovery | Cards summarize outcomes but omit exact LO identifiers. |

## High-Priority Findings

### A11Y-001

**Severity:** High  
**Confidence:** High  
**Location:** [`landing/style.css:22`](../../landing/style.css#L22), inherited equivalent in [`shared/sim-style.css:36`](../../shared/sim-style.css#L36)

**Finding:** The global keyboard focus indicator uses `var(--acid)` on every surface.

**Evidence:** `#dff34b` has contrast ratios of approximately 1.10:1 against `--paper`, 1.17:1 against `--panel`, and 1.08:1 against the purpose-section background. These are the backgrounds containing the search field, filter buttons, cards, and footer links.

**Impact:** Keyboard users can lose track of focus across most of the page. This directly impairs navigation and interaction with the simulation index.

**Recommended direction:** Use a dark or two-layer focus indicator on light surfaces while retaining the acid outline where it contrasts with the dark header and hero.

## Medium-Priority Findings

### A11Y-002

**Severity:** Medium  
**Confidence:** High  
**Location:** [`landing/style.css:41`](../../landing/style.css#L41), lines 100–103 and 117; affected elements include `.eyebrow`, `.topic-number`, `.status-completed`, and `.card-outcome span`

**Finding:** Important small labels use accent colors that do not meet normal-text contrast.

**Evidence:**

- `--orange` on `--paper`: approximately 2.53:1.
- `--orange` on the purpose background: approximately 2.13:1.
- `--orange-dark` on `--paper`: approximately 4.00:1.
- `--orange-dark` on `--panel`: approximately 4.27:1.

These colors are used at 9–12 px for section eyebrows, topic numbers, status labels, learning-outcome labels, and coverage topic identifiers.

**Impact:** Small curriculum and status metadata becomes harder to read in bright classrooms, on projectors, and for users with low vision.

**Recommended direction:** Use a darker existing color for textual metadata. Keep the brighter orange for decorative graphics or sufficiently large text.

### A11Y-003

**Severity:** Medium  
**Confidence:** High  
**Location:** [`landing/style.css:34`](../../landing/style.css#L34), lines 54, 86, 120, 157, and 190–194

**Finding:** Several essential actions have very small text-level hit areas.

**Evidence:** Header navigation uses 11 px text and drops to 9 px at 460 px. Filter buttons are only 34 px high. `.text-link`, `.card-launch`, and footer links have no minimum target height and are effectively one text line tall.

**Impact:** The chapter filters and “Launch lab” links are harder to tap accurately, particularly on phones or classroom touch displays. Small mono text also weakens action discoverability.

**Recommended direction:** Expand the clickable box around these existing controls to approximately 44 px without enlarging every visible label or changing the layout’s visual character.

### INT-001

**Severity:** Medium  
**Confidence:** High  
**Location:** [`landing/style.css:95`](../../landing/style.css#L95), [`landing/app.js:38`](../../landing/app.js#L38)

**Finding:** Every card lifts and gains a heavy shadow on hover, although only the small “Launch lab” footer link is interactive.

**Evidence:** `.sim-card:hover` applies to completed and planned cards. Clicking the illustration, title, description, or learning outcome does nothing. The planned card also moves despite having no link.

**Impact:** The strongest interaction feedback is attached to a noninteractive container, creating false affordance and avoidable discovery friction.

**Recommended direction:** Either make the completed card’s full surface the link, or restrict interactive styling to the actual link. Planned cards should not exhibit launch-like hover behavior.

### RESP-001

**Severity:** Medium  
**Confidence:** High  
**Location:** [`landing/style.css:94`](../../landing/style.css#L94), lines 161–169 and 190–205

**Finding:** The card grid stays at two columns until the viewport reaches 460 px.

**Evidence:** At the rendered 480 px test, cards are roughly 210 px wide. Titles, descriptions, outcomes, and footer metadata wrap into narrow columns, while one-card chapters occupy only half the available row. At 460 px the page abruptly changes to a comfortable full-width card.

**Impact:** Common intermediate mobile widths receive the densest and least balanced card treatment.

**Recommended direction:** Move the single-column transition to the width where card content first becomes cramped, rather than tying it to the general 460 px breakpoint.

### IA-001

**Severity:** Medium  
**Confidence:** High  
**Location:** [`landing/app.js:5`](../../landing/app.js#L5), lines 5–10

**Finding:** Topics 7.4–7.7 are grouped under “Simple Harmonic Motion,” despite covering progressive waves, superposition, standing waves, and the Doppler effect.

**Evidence:** The chapter filter says “07 SHM & waves,” and the coverage table separately identifies “Waves and applications,” but all six Chapter 7 cards use `chapterName: 'Simple Harmonic Motion'`.

**Impact:** The grouping understates the scope of Chapter 7 and makes wave simulations less predictable to locate using curriculum terminology.

**Recommended direction:** Rename the group to reflect both SHM and waves, or divide it into curriculum-aligned subgroups while keeping Chapter 7 filtering intact.

### CONTENT-001

**Severity:** Medium  
**Confidence:** High  
**Location:** [`landing/app.js:64`](../../landing/app.js#L64), lines 64–66

**Finding:** The planned placeholder is counted as an available lab.

**Evidence:** The initial live result reads “9 of 9 labs shown,” and the planned group reports “01 lab,” while the hero correctly states that only eight labs are completed.

**Impact:** Users may infer that nine simulations can be launched, creating avoidable ambiguity about current availability.

**Recommended direction:** Use neutral wording such as “entries,” or explicitly report available and planned totals separately.

### IMP-001

**Severity:** Medium  
**Confidence:** High  
**Location:** [`landing/index.html:11`](../../landing/index.html#L11), [`landing/style.css:1`](../../landing/style.css#L1)

**Finding:** The landing page loads the shared stylesheet and then repeats its canonical palette, base box-sizing, body, font, control, and focus declarations.

**Evidence:** `--ink`, `--paper`, `--panel`, `--line`, `--acid`, `--orange`, `--teal`, `--muted`, `--mono`, and `--display` are redeclared locally. Several additional surface and text colors are raw hex values, and `--shadow` is defined but unused.

**Impact:** The current page looks consistent, but future changes to the shared visual system can silently diverge from the landing page.

**Recommended direction:** Consume canonical tokens and base rules from `shared/sim-style.css`; retain only genuinely landing-specific tokens and selectors locally.

## Low-Priority Findings

### RESP-002

**Severity:** Low  
**Confidence:** High  
**Location:** [`landing/style.css:58`](../../landing/style.css#L58), lines 105–106 and 170–176

**Finding:** Responsive SVGs scale only from container width and have no practical height cap.

**Evidence:** At 800 px, the hero illustration grows from the 345 px desktop treatment to more than 550 px tall. At 460 px, card illustrations also become taller than at narrower 320 px widths because `.card-visual svg` remains `width: 88%`.

**Impact:** Decorative visuals consume disproportionate vertical space at intermediate widths, extending the distance to the simulation list and the number of cards visible per scroll.

**Recommended direction:** Cap the responsive SVG height or width at tablet/mobile breakpoints while preserving the illustration.

### IMP-002

**Severity:** Low  
**Confidence:** High  
**Location:** [`landing/index.html:40`](../../landing/index.html#L40), lines 47, 129–142; [`landing/app.js:2`](../../landing/app.js#L2)

**Finding:** Simulation totals and coverage information are maintained separately from the card metadata.

**Evidence:** “08” appears in the project status, visual stamp, and coverage graphic; curriculum coverage is repeated manually in the table; the actual entries live in `SIMULATIONS`.

**Impact:** Adding or reclassifying a simulation requires several synchronized edits and can produce stale public counts.

**Recommended direction:** Derive counts and coverage summaries from the existing metadata where practical, or centralize the remaining manually maintained values.

## Enhancements

### EDU-001

**Severity:** Enhancement  
**Confidence:** Medium  
**Location:** [`landing/app.js:3`](../../landing/app.js#L3), `SIMULATIONS[].outcome`

**Finding:** Cards provide useful outcome summaries but not exact SP015 LO identifiers or subparts.

**Evidence:** The card says “Learning outcome” followed by a paraphrased topic summary; only the broader topic number appears at the top.

**Impact:** Students can choose simulations successfully, but teachers matching activities to exact curriculum outcomes must open the simulation or consult the specification.

**Recommended direction:** Add concise LO identifiers alongside the existing summary when exact mapping is available. Preserve the readable prose.

## What Is Already Working Well

- The page immediately identifies itself as an interactive SP015 Physics resource; the primary “Explore simulations” action is visible at every tested width.
- The hero graphic is subject-specific and reinforces trajectories, waves, vectors, and measurement without relying on generic promotional imagery.
- Heading structure is logical: one `h1`, section `h2`s, chapter `h3`s, and card `h4`s.
- Semantic landmarks, a skip link, native buttons, a labelled search input, `aria-pressed`, `aria-live`, and decorative SVG treatment are implemented well.
- Search and chapter/status filters are understandable and use one escaped metadata source for card rendering.
- Cards expose the information students need: curriculum topic, status, title, explanation, outcome, and launch action.
- No horizontal overflow or broken table/grid layout was observed at 1440, 1024, 800, 460, or 320 px.
- `prefers-reduced-motion` is respected.
- Typography, palette, linework, square controls, technical graphics, and instructional tone match the simulation pages closely.
- Decorative effects are restrained; there are no unnecessary gradients, animation sequences, carousels, or SaaS-style conversion elements.
- JavaScript syntax is valid, generated text is escaped, and all completed simulation targets exist.

## Recommended Priorities

1. Correct the light-surface focus indicator.
2. Fix contrast for small orange curriculum/status text.
3. Align card hover behavior with the actual clickable area.
4. Enlarge important mobile navigation, filter, and launch targets.
5. Move the one-column card breakpoint above the cramped 480 px state.
6. Correct Chapter 7 grouping and planned-item counting.
7. Consolidate shared tokens and duplicated project metadata.
