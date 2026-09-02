# SP015 Physics Simulation Landing Page

This folder contains the static landing page for the SP015 Physics Simulation Project. It indexes every current simulation by chapter and topic, with searchable metadata-driven cards and curriculum coverage.

## Run locally

Serve the repository root with Python's built-in static server:

```bash
python3 -m http.server 8000
```

Then open:

<http://localhost:8000/landing/>

Serving from the repository root is required so the relative links to `animations/`, `shared/`, and the curriculum PDF resolve correctly. Do not open the page directly with `file://`.

## Files

- `index.html` — semantic page structure and inline SVG lab visual.
- `style.css` — responsive SP015 visual system and accessibility states.
- `app.js` — single simulation metadata array, card rendering, search, and filters.

## Interaction and visual contract

Card metadata, filtering, and launch destinations are driven from the single
`SIMULATIONS` array in `app.js`. Completed cards use one semantic launch anchor
stretched across the card, so the whole-card hover and keyboard focus states
describe a real action. Planned entries are intentionally unlinked and static.

The inline SVGs are compact recognition diagrams. They use the repository
palette and must be checked against the linked simulation's theory and first
frame before changing their geometry. Final evidence and the archived phased
plan are in [`../docs/plan/completed/`](../docs/plan/completed/).
