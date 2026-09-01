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
