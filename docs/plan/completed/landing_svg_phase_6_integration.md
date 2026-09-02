# Landing SVG Phase 6 Responsive and Accessibility Integration Results

**Status:** Complete

**Completed:** 2026-09-02

**Parent plan:** [Landing Page SVG Improvement Plan](landing_svg_improvement_plan.md)

**Scope:** Landing-page SVG sizing, card breakpoint behavior, contrast, focus visibility, touch targets, card affordance, and reduced-motion compatibility

## 1. Outcome

The improved diagrams are now integrated without creating disproportionate panels, cramped mobile cards, ambiguous card interaction, or inaccessible focus and metadata treatments. This phase changes only landing-page card-template semantics and CSS behavior; diagram geometry, simulation code, card content, filtering logic, and information architecture remain unchanged.

The UI/UX skill's applicable accessibility and responsive guidance was used for focus visibility, 44 px targets, stable hover behavior, and SVG size containment. Its generic video, palette, typography, and commercial landing-pattern recommendations were not applied because they conflict with the established educational product and repository conventions.

## 2. Responsive Sizing

### Card diagrams

Card diagrams now use:

```css
width: min(88%, 264px);
height: auto;
max-height: 163px;
```

The `264 x 163 px` cap matches the established four-column desktop treatment. Diagrams can shrink below that size but no longer grow taller at 800, 480, or 460 px simply because the card becomes wider.

### Card grid breakpoint

A focused `max-width: 600px` breakpoint changes the card grid to one column and removes the fixed minimum card height. This makes 480, 460, 375, and 320 px layouts full-width without changing the broader 460 px page-layout breakpoint.

At 800 and 1024 px the existing two-column organization remains appropriate. At 1440 px the four-column chapter grid remains unchanged.

### Hero diagram

The Phase 5 hero cap remains in place: at 800 px and below, it uses `width: min(100%, 446px)` and `max-height: 345px`. Card integration introduced no regression to that treatment.

## 3. Contrast and Non-Color Differentiation

Measured contrast ratios for essential diagram and focus roles are:

| Foreground / background | Ratio | Use |
| --- | ---: | --- |
| `--orange-dark` / card visual | 3.70:1 | Primary diagram geometry and filled markers |
| `--muted` / card visual | 4.24:1 | Guides, equilibria, brackets, and secondary construction |
| `--ink` / `--paper` | 14.76:1 | Light-surface focus and metadata text |
| `--ink` / `--panel` | 15.78:1 | Card labels and controls |
| `--acid` / `--ink` | 13.46:1 | Dark-surface focus and active states |
| `--orange` / `--ink` | 5.84:1 | Hero trajectory and primary vectors |
| `--teal` / `--ink` | 6.86:1 | Hero orbit and secondary vectors |

Essential non-text geometry exceeds the 3:1 graphical-object threshold. Small light-surface metadata that previously used orange or orange-dark now uses `--ink`, including section eyebrows, topic numbers, completed-status text, learning-outcome labels, method numbers, and coverage table topic labels. Orange remains available in dots, curves, and decoration rather than carrying small text by itself.

Meaning still does not depend on color:

- arrows encode direction;
- solid and dashed lines distinguish quantities and guides;
- circles, diamonds, rectangles, and boundaries distinguish marker roles;
- lane position and stroke weight identify graph and resultant roles;
- every completed/planned status includes text as well as a dot treatment.

## 4. Focus Visibility

The global focus indicator now uses a 3 px `--ink` outline with a 4 px offset on light surfaces. Header, hero, and footer descendants switch the outline to `--acid` against `--ink`.

This produces approximately 14.8:1 contrast on the paper surface and 13.5:1 on dark surfaces. The offset also separates the outline from active dark buttons and the acid primary CTA, so the indicator remains visible without relying on the control's fill color.

## 5. Touch Targets and Action Clarity

The following interactive elements now have a minimum 44 px target height:

- brand/home link;
- primary navigation and repository links;
- hero learning-model text link;
- simulation search field;
- chapter and status filter buttons;
- completed-card launch links;
- footer links.

Card footers use a 52 px minimum height so the 44 px launch target fits without crowding chapter metadata.

Completed cards use the existing `Launch lab` anchor as a stretched link across the whole card. Their lift and shadow now correspond to that full clickable area, and keyboard focus draws a high-contrast outline around the same area. The visible launch label retains its persistent underline. The planned card's disabled `Coming next` text remains unlinked, un-underlined, and static, so it does not imitate a launch action.

## 6. SVG Accessibility and Motion

All nine generated card SVGs retain:

- explicit `width="120"` and `height="74"` attributes;
- `aria-hidden="true"`;
- `focusable="false"`.

The adjacent title, description, learning outcome, status, and launch text provide the accessible equivalent for every card. No diagram introduces required instructional meaning that is absent from that text, so exposing individual SVG paths would add noise rather than useful navigation.

All diagrams remain static. The existing `prefers-reduced-motion: reduce` rule remains unchanged and suppresses smooth scrolling and the completed-card transition for users requesting reduced motion.

## 7. Responsive Evidence

| Viewport | Evidence | Result |
| ---: | --- | --- |
| 1440 px | [integration-1440.png](evidence/landing-svg-phase-6/integration-1440.png) | Four-column card sizing and desktop diagram density remain stable |
| 1024 px | [integration-1024.png](evidence/landing-svg-phase-6/integration-1024.png) | Two-column cards remain balanced with capped diagrams |
| 800 px | [integration-800.png](evidence/landing-svg-phase-6/integration-800.png) | Two-column layout remains readable; diagrams no longer grow with card width |
| 480 px | [integration-480.png](evidence/landing-svg-phase-6/integration-480.png) | Cards switch to a comfortable full-width column before content becomes cramped |
| 460 px | [integration-460.png](evidence/landing-svg-phase-6/integration-460.png) | Full-width cards retain stable diagram and footer proportions |
| 375 px | [integration-375.png](evidence/landing-svg-phase-6/integration-375.png) | Filters, metadata, diagrams, and launch targets remain contained |
| 320 px | [integration-320.png](evidence/landing-svg-phase-6/integration-320.png) | Minimum-width layout has no horizontal clipping or target collision |

## 8. Phase 6 Exit Check

- [x] Card and hero SVG dimensions are capped without distorting aspect ratios.
- [x] The 480 px layout uses one full-width card column.
- [x] No horizontal overflow or clipping appears at 320, 375, 460, 480, 800, 1024, or 1440 px.
- [x] Essential diagram strokes and markers exceed 3:1 contrast.
- [x] Small light-surface metadata uses contrast-safe text colors.
- [x] Diagram meaning does not depend on color alone.
- [x] Card SVGs remain hidden from assistive technology and out of the focus order.
- [x] Focus indicators are high-contrast on light and dark surfaces.
- [x] Essential links, controls, and filters have at least 44 px target height.
- [x] Completed-card hover feedback corresponds to a whole-card clickable link target.
- [x] Planned cards do not exhibit launch-like hover, motion, or link styling.
- [x] Reduced-motion behavior remains intact and diagrams remain static.
- [x] No simulation, shared utility, card content, or filtering behavior changed.
