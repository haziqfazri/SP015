# Vendored browser dependencies

These files keep the static SP015 simulations usable without an internet
connection. They are intentionally committed as runtime assets; there is no
build step or package manager required to run a simulation.

## Pinned sources

- `p5/p5.min.js`: p5.js 1.9.4 from cdnjs
- `katex/katex.min.js`, `katex/katex.min.css`, and `katex/fonts/`: KaTeX 0.18.2 from jsDelivr
- `fonts/`: DM Sans (400, 500, 600, 700) and Space Mono (400, 700), matching the existing Google Fonts declaration

License notices: p5.js is LGPL-2.1-or-later, KaTeX is MIT, and the Google
Fonts files are licensed under the SIL Open Font License. The upstream package
notices remain available from their pinned sources.

The KaTeX stylesheet references every file in its `fonts/` directory, so the
complete directory is retained rather than copying only the currently visible
glyph subset. `shared/fonts.css` provides the project font-face declarations
with system fallbacks supplied by the existing CSS variables.

When refreshing an asset, update the version/source here and regenerate
[`SHA256SUMS`](SHA256SUMS). Pages should continue to reference local files
under `vendor/`; external CDN URLs are not runtime dependencies.
