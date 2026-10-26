# SP015 + SP025 library migration plan

**Status:** Preparation only; no folder moves or semester tabs implemented.
**Baseline:** `5732a0f` on `main`; working tree clean at preparation start.
**Superposition:** restored and committed; `index.html` blob is
`b941d62415d825f8941a2da86dd3b578fc1f183b`.

## Approved decisions

- One repository, named SP015 on GitHub until separately approved otherwise.
- Canonical target: `simulations/<sp015|sp025>/<chapter>/<combined-lo-folder>/`.
- Preserve combined learning outcomes, complete simulation folders, public APIs,
  physics behavior, shared styles, vendor assets, and local runtime dependencies.
- One landing page with SP015/SP025 tabs; preserve the existing visual design.
- SP015 is selected initially. Each semester owns independent search, chapter,
  and status filter state and restores it when revisited.
- Existing public URLs have not been shared. Do not create an old `animations/`
  compatibility tree. Retain existing redirect files inside destination topic
  folders as mapped below; do not delete them during migration.
- Thermodynamics Workbench remains unpublished until its Chapter 9 release
  criteria pass. Migrating its source does not approve publishing its card.

## Current disk layout versus planned layout

All 13 simulation implementations still live under `animations/`. There are 12
published landing entries and five redirect files. No SP025 simulations or
`simulations/` directory exist at preparation time. SP025 chapter names and LOs
must be checked against an authoritative specification, currently missing.

```text
# CURRENT
animations/<chapter>/<combined-lo-folder>/
landing/                      # current SP015-only catalogue

# APPROVED TARGET — pending implementation
simulations/
  sp015/<chapter>/<combined-lo-folder>/
  sp025/<chapter>/<combined-lo-folder>/
landing/                      # one page with semester tabs
shared/                       # same root location, used by both semesters
vendor/                       # same pinned local assets
templates/                    # starter prepared for target depth
```

Existing pages are three levels deep and use `../../../shared/` and
`../../../vendor/`. Target pages are four levels deep and require
`../../../../shared/` and `../../../../vendor/`. Local sibling references stay
unchanged. The current template has been prepared for the four-level target;
it is copy-only and not a runnable page from `templates/`. The link checker
validates it at a virtual target location and maps sibling files to templates/.

## Complete simulation and catalogue map

The machine-readable source of this table is
[physics-library-migration-map.json](physics-library-migration-map.json).
Every row moves the whole folder, including existing tests, CSS, and JS.
Canonical entry points remain `index.html`.

| Current folder | Target folder | Catalogue |
|---|---|---|
| `animations/02-kinematics-of-linear-motion/2.3-projectile-motion/` | `simulations/sp015/02-kinematics-of-linear-motion/2.3-projectile-motion/` | Published: update href |
| `animations/05-circular-motion/5-uniform-circular-motion/` | `simulations/sp015/05-circular-motion/5-uniform-circular-motion/` | Published: update href |
| `animations/07-simple-harmonic-motion/7.1-kinematics-of-shm/` | `simulations/sp015/07-simple-harmonic-motion/7.1-kinematics-of-shm/` | Published: update href |
| `animations/07-simple-harmonic-motion/7.2-graphs-shm/` | `simulations/sp015/07-simple-harmonic-motion/7.2-graphs-shm/` | Published: update href |
| `animations/07-simple-harmonic-motion/7.4-progressive-wave-shm/` | `simulations/sp015/07-simple-harmonic-motion/7.4-progressive-wave-shm/` | Published: update href |
| `animations/07-simple-harmonic-motion/7.5-superposition-shm/` | `simulations/sp015/07-simple-harmonic-motion/7.5-superposition-shm/` | Published: update href |
| `animations/07-simple-harmonic-motion/7.6-application-of-standing-waves/` | `simulations/sp015/07-simple-harmonic-motion/7.6-application-of-standing-waves/` | Published: update href |
| `animations/07-simple-harmonic-motion/7.7-doppler-effect/` | `simulations/sp015/07-simple-harmonic-motion/7.7-doppler-effect/` | Published: update href |
| `animations/08-physics-of-matter/8.1-8.2-materials-testing/` | `simulations/sp015/08-physics-of-matter/8.1-8.2-materials-testing/` | Published: update href |
| `animations/08-physics-of-matter/8.3-heat-conduction/` | `simulations/sp015/08-physics-of-matter/8.3-heat-conduction/` | Published: update href |
| `animations/08-physics-of-matter/8.4-thermal-expansion/` | `simulations/sp015/08-physics-of-matter/8.4-thermal-expansion/` | Published: update href |
| `animations/09-kinetic-theory-and-thermodynamics/9.1-9.2-molecular-gas-lab/` | `simulations/sp015/09-kinetic-theory-and-thermodynamics/9.1-9.2-molecular-gas-lab/` | Published: update href |
| `animations/09-kinetic-theory-and-thermodynamics/9.3-9.5-thermodynamics-workbench/` | `simulations/sp015/09-kinetic-theory-and-thermodynamics/9.3-9.5-thermodynamics-workbench/` | Unpublished: no card or href |

For each published row, the exact current catalogue href is
`../<currentFolder>/index.html` and the exact future href is
`../<targetFolder>/index.html`; both expanded values are recorded in the JSON.
The Workbench has a mapped canonical page but both catalogue href fields are
`null`. Its existing source, tests, and active release plan are retained.

## Complete alias map (proposed placement for migration review)

| Current redirect file | Target redirect file | Future destination |
|---|---|---|
| `animations/05-circular-motion/circular-motion.html` | `simulations/sp015/05-circular-motion/5-uniform-circular-motion/circular-motion.html` | `index.html` in that topic folder |
| `animations/07-simple-harmonic-motion/7.5-superposition-shm/wave-superposition.html` | `simulations/sp015/07-simple-harmonic-motion/7.5-superposition-shm/wave-superposition.html` | `index.html` in that topic folder |
| `animations/07-simple-harmonic-motion/7.6-application-of-standing-waves/standing-waves.html` | `simulations/sp015/07-simple-harmonic-motion/7.6-application-of-standing-waves/standing-waves.html` | `index.html` in that topic folder |
| `animations/07-simple-harmonic-motion/7.7-doppler-effect/doppler-effect.html` | `simulations/sp015/07-simple-harmonic-motion/7.7-doppler-effect/doppler-effect.html` | `index.html` in that topic folder |
| `animations/08-physics-of-matters/8.1-8.2-materials-testing/index.html` | `simulations/sp015/08-physics-of-matter/8.1-8.2-materials-testing/materials-testing.html` | `index.html` in that topic folder |

All five redirect files survive. Three already point to a sibling index and
need only their enclosing folder move. Circular Motion moves from the chapter
root into its canonical topic and changes its destination to `index.html`.
The misspelled materials chapter alias moves into the canonical materials topic
as `materials-testing.html`, also pointing to `index.html`. Update meta-refresh,
canonical link, and fallback anchor together for these two aliases. This is a
file-preservation proposal, not preservation of their former URLs. No moves or
redirect changes happen in preparation.

## Catalogue contract and acceptance criteria

Continue to use one literal `SIMULATIONS` metadata array in `landing/app.js`.
Add `semester: 'sp015' | 'sp025'` to records during the later catalogue phase.
Do not compute hrefs or fetch a manifest at runtime: literal relative URLs
remain statically checkable and do not require a build or external dependency.

- Group by `${semester}:${chapter}`, never by chapter number or name alone.
- Use `chapter-${semester}-${chapter}` heading IDs. Explicit record IDs, if
  present, begin with the semester. Tab/panel/card IDs also include semester;
  SVG marker IDs must be unique across all coexisting markup, including hidden
  panels. Unique IDs cannot be established merely by separate data arrays.
- Use separate `{ query, chapter, status }` objects keyed by semester. Switching
  tabs changes the active key and restores that semester's controls and results.
- Maintain existing card/SVG design, typography, palette, search, and filters.
- Use accessible tab semantics, matching tab/panel IDs, `aria-selected`,
  `aria-controls`, roving focus, and expected arrow/Home/End keyboard behavior.
- Rebuild chapter options for the active semester; a chapter selected for one
  semester must not silently overwrite the other semester's selection.
- SP025 initially has an honest empty state if no content exists. Do not invent
  chapter names or simulations. Planned records are inert; Workbench stays absent.

Required browser scenarios after tabs exist:

1. Fresh load selects SP015 and lists the current published SP015 entries.
2. In SP015, set search A, chapter A, and status A. Switch to SP025 and set
   different search B/chapter B/status B when its data supports them. Return to
   SP015: A values and matching results remain. Return to SP025: B values remain.
3. Repeat starting from SP025; cover no-result queries and clearing a query.
   Until SP025 has chapter content, cover its All/empty state and retain the
   two-semester overlapping-chapter fixture scenario in validator tests.
4. Use identical chapter numbers/names in both semesters in test data. Verify
   groups never merge and no duplicate runtime DOM/SVG IDs appear after repeated
   tab switches, filtering, or rendering both panels hidden/visible.
5. Verify keyboard focus, selected tab, panel visibility, search value, chapter
   options, count text, and empty state agree with the active semester.
6. Check desktop, 800, 460, and 320 CSS px plus 200% zoom; compare the landing
   visual design with the pre-migration baseline. Check console/network errors.

Static `--require-semesters` checks metadata and paths only. It does not prove
runtime grouping, rendered IDs, keyboard behavior, or state retention.

## Incremental implementation sequence (requires review first)

1. Review this preparation diff and the alias placement proposal. Record an
   approved migration baseline without altering historical audits or evidence.
2. Pilot only Projectile Motion: move its whole folder to the exact mapped
   destination, add one `../` to its seven shared asset references, and change
   only its landing href. Preserve all sibling files and script order. The
   catalogue may temporarily contain current and target URLs; no tabs yet.
3. Run focused checks, the complete link scan under both hosting bases, map
   coverage tests, and browser acceptance. Review before moving another chapter.
4. Migrate remaining chapters in reviewable batches. Carry tests and aliases
   with each batch. Preserve Superposition's restored HTML. Migrate the Workbench
   source as unpublished work; do not promote its catalogue status.
5. Implement semester metadata, tabs, and per-semester state as a separate
   reviewed change. Enable the strict semester gate and browser scenarios above.
6. When mapped files have all moved, update current-layout descriptions to the
   implemented target. Empty obsolete folders may disappear through moves; no
   historical documentation, tests, redirects, or assets are deleted. Remove no
   source file merely because it is not published.

## First pilot: Projectile Motion

- Source: `animations/02-kinematics-of-linear-motion/2.3-projectile-motion/`.
- Destination: `simulations/sp015/02-kinematics-of-linear-motion/2.3-projectile-motion/`.
- Expected edits: whole-folder move, seven asset path adjustments in its HTML,
  one landing catalogue href. No physics, JS behavior, or CSS changes.
- Verify landing launch, paused first frame, controls, Play/Pause/Reset/Step,
  readouts, resize, and local assets at desktop/800/460/320 px.
- Test `/landing/` and `/SP015/landing/` hosting plus direct-file simulation
  loading. A root-only local HTTP server does not test a repository prefix.
- If validation fails, stop the pilot and review its focused diff; do not
  continue with other chapters or automatically revert unrelated work.

## Verification commands

Run from the repository root:

```sh
node --check .kilo/scripts/check-links.mjs
node --test .kilo/scripts/check-links.test.mjs
node .kilo/scripts/check-links.mjs --skip-external
node .kilo/scripts/check-links.mjs --skip-external --base-path=/SP015/
node .kilo/scripts/check-links.mjs --html-only --skip-external
find animations -type f -name '*.test.js' -exec node --test {} +
node .kilo/scripts/check-dt.mjs animations
node .kilo/scripts/check-shared-usage.mjs animations
git diff --check
```

During mixed migration, run syntax/tests and convention checks for both existing
roots using `find animations simulations ...` or scope to each existing root;
do not pass a nonexistent root to a scanner. The new map test accepts either
source or destination for each mapped file/folder and rejects duplicates or
missing locations. It verifies all catalogue URLs and all redirect files remain
accounted for. At final target layout, run these checks against `simulations/`.

After catalogue metadata conversion (expected to fail before that phase):

```sh
node .kilo/scripts/check-links.mjs --skip-external --require-semesters
node .kilo/scripts/check-links.mjs --skip-external --base-path=/SP015/ --require-semesters
```

The enhanced validator checks actual JavaScript catalogue destinations without
executing application code, HTML script/link/src/srcset/poster paths, meta-refresh
destinations, inline/standalone CSS URL references and imports, Markdown links,
static duplicate IDs, exact filename case, and prefix escapes. It resolves from
the owning file and never silently clamps excessive parent traversal. Markdown
directory links are valid; HTML navigation directories require index pages.
Computed catalogue metadata fails explicitly. Generic ignored scratch/.codex
data and test modules are excluded from production link scanning. Dynamic URLs,
runtime IDs, reference-style Markdown, and unusual CSS escapes need review.

## Baseline findings, risks, and preparation evidence

- Before preparation, old full link checking failed with six false findings:
  five existing directory links and a literal `${sim.href}` template expression.
  It did not read actual catalogue hrefs or CSS assets. Its HTML-only mode passed.
- Old full link checking also emitted 40 fragment warnings. These include
  Markdown headings and historical GitHub source-line anchors. Historical reports
  are retained; advisory warnings do not establish a broken runtime asset.
- Shared-usage baseline: five violations in test fixtures (thermal expansion
  renderer test line 25; Workbench renderer test lines 64, 67, 72, 75). Do not
  edit or delete those tests as part of migration preparation. Compare future
  findings with this baseline and inspect production source separately.
- Timestep baseline: 25 controller/sketch files, zero findings; its filename
  filter omits the compact `uniform-circular-motion-sim.js`. Check that clock
  manually during the Circular Motion batch; a checker pass is not full coverage.
- Existing runtime is offline and shared. Keep `SP015Runtime` and public APIs
  unchanged during path migration; renaming globals is a separate change.
- The SP025 PDF is missing; taxonomy and new content require a verified source.
- Three ignored scratch tests reference already obsolete misspelled chapter
  paths. They are not production entry dependencies and need separate review.
- The project-local `.codex/skills/sp015-simulation-builder/SKILL.md` is updated
  locally but remains ignored by Git. Do not stage or change ignore policy in
  preparation; decide how to distribute it when reviewing the preparation diff.
- External URLs and deployment settings are not evidence of local path safety.
  Keep the GitHub name/remote unchanged and run real prefixed-host browser QA.

Preparation validation completed:

| Check | Result |
|---|---|
| New validator and migration-map tests | 22 passed, zero failures |
| Existing simulation tests | 15 passed, zero failures |
| Link/asset validation at `/` | 146 files, 435 references, 12 catalogue entries, zero failures |
| Link/asset validation at `/SP015/` | Same coverage and zero failures |
| HTML-only validation | 20 files, 208 references, zero failures or warnings |
| Static JS syntax (validator, tests, landing) | Passed |
| Timestep checker | 25 files, zero findings; coverage limitation noted above |
| Shared-usage checker | Same five pre-existing fixture findings; no regression |
| Strict future semester gate | Expected rejection: 24 findings (12 absent semester fields, 12 current-layout URLs) |
| Full-scan advisory fragments | 15 historical source-line-anchor warnings remain; no runtime asset failures |
| Whitespace and scope checks | Passed; simulation/runtime files unchanged |

No external URL or browser/runtime tab validation was performed in preparation.
The hosting-prefix checks are static URL-resolution tests, not evidence of a
live deployment. Semester behavior remains future acceptance work. The six old
false link failures are resolved by checking real directories and catalogue
metadata; the 25 old Markdown-heading warnings are now recognized as valid.
No new current-layout validation failures remain.

## Stop condition

Stop for review after preparation and verification. No commits, pushes, folder
moves, runtime landing changes, simulation behavior changes, or semester tabs
are authorized by this preparation task.
