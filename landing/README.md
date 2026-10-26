# SP015 Physics Simulation Landing Page

This folder contains the static landing page for the SP015 Physics Simulation Project. It indexes the published SP015 simulations by chapter and topic, with searchable metadata-driven cards and curriculum coverage.

## Run locally

Serve the repository root with Python's built-in static server:

```bash
python3 -m http.server 8000
```

Then open:

<http://localhost:8000/landing/>

Serving from the repository root is required so the relative links to `animations/`, `shared/`, and the curriculum PDF resolve correctly. Do not open the page directly with `file://`.

The page loads its typography from `shared/fonts.css`, so the landing page does
not need an internet connection after the repository has been cloned.

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

## Approved unified catalogue (not implemented yet)

Keep this single page and its existing visual design. Add SP015/SP025 semester
tabs with SP015 selected initially. Catalogue records will declare `semester`
explicitly; their target URLs use `../simulations/<semester>/<chapter>/<lo-group>/index.html`.
Use semester + chapter grouping and semester-qualified generated IDs. Keep
separate `{ query, chapter, status }` state for each semester and restore form
values/options when switching tabs. The SP025 empty state must remain usable
before its first simulation exists. Thermodynamics Workbench stays unlisted
until its existing release criteria pass.

The current JavaScript still uses the SP015-only metadata and one state object.
See the [migration plan](../docs/plan/active/physics-library-migration-plan.md)
for acceptance scenarios. The validator reads actual literal catalogue URLs,
HTML assets/redirects, CSS URLs, and duplicate static IDs. Run it from the repo
root with `--skip-external`, then with `--base-path=/SP015/`. After catalogue
conversion, also enable `--require-semesters`; runtime grouping, generated IDs,
and state retention still require browser checks.
