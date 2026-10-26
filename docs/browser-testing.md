# Chromium browser smoke tests

The library remains static: no build step, runtime npm dependency, or change to
simulation code is required. Playwright is development-only. `package.json`
intentionally has no `type` setting, preserving the existing CommonJS Node tests;
Playwright configuration, server, and smoke tests use `.mjs`.

## Install from a fresh checkout

Use Node.js 20 or newer and npm. From the repository root:

```sh
npm ci
npm run test:browser:install
npm run test:browser
```

The lockfile pins `@playwright/test` and its dependencies. The browser install
command installs Chromium and its matching headless runtime into Playwright's
normal browser cache outside Git. Browser downloads are separate from `npm ci`.
On Linux hosts missing browser system libraries, use Playwright's documented
`npx playwright install --with-deps chromium` instead; that may require system
package installation privileges. Do not install unrelated browser engines.

Existing Node tests and `.kilo` validators keep their original commands:

```sh
node --test .kilo/scripts/check-links.test.mjs
find animations simulations -type f -name '*.test.js' -exec node --test {} +
node .kilo/scripts/check-links.mjs --skip-external
node .kilo/scripts/check-links.mjs --skip-external --base-path=/SP015/
git diff --check
```

During the migration, only pass roots that actually exist. Browser smoke tests
complement these checks; they do not replace or weaken migration gates.

Run static link scans after Playwright has exited. During recording, temporary
trace resources contain copied HTML/CSS with their original relative URLs;
scanning those snapshots concurrently produces misleading missing-path errors.
Successful runs remove the temporary snapshots. Keep the actual application
link checks unchanged and rerun them against the settled checkout.

## Run and debug

```sh
# List the matrix without opening a browser or starting a server.
npm run test:browser:list

# Run all 24 Chromium cases headlessly.
npm run test:browser

# Run just desktop checks for both hosting mounts.
npm run test:browser -- --project=chromium-root-1440 --project=chromium-sp015-1440

# Run only the Projectile Motion cases.
npm run test:browser -- --grep 'Projectile Motion initial'

# Optional local visual debugging.
npm run test:browser -- --project=chromium-root-1440 --headed
```

The configuration starts and stops its own Node HTTP server on
`127.0.0.1:4173`. It refuses to reuse an unknown existing server. If the port is
occupied, choose another port for the command:

```sh
PLAYWRIGHT_PORT=4174 npm run test:browser
```

The same checkout is exposed at both `/` and `/SP015/`, without copying assets
or creating a compatibility tree. Examples:

- `http://127.0.0.1:4173/landing/`
- `http://127.0.0.1:4173/SP015/landing/`

Each project uses a prefix-preserving base URL. Page navigations in tests must
be relative (`landing/`, not `/landing/`). Requests escaping the selected
prefix fail even though the test server exposes both mounts; this catches
root-absolute paths that would break on repository-prefixed hosting.

The server is only a development fixture. It serves files and directory index
pages from the repository, has no directory listings, and blocks hidden paths
and files resolving outside the repository. It does not model production CDN,
cache, compression, or redirect rules. Production serving remains independent.

## Coverage and failure artifacts

Three smoke tests run at both hosting prefixes, each at 1440, 800, 460, and
320 CSS pixels (eight projects, 24 cases):

- Landing: document/assets/fonts, initial content, search, chapter filtering,
  empty results, both migrated hrefs, and launch through the Projectile card.
- Projectile: first canvas frame, horizontal preset, launch-speed input, Step,
  Play/Pause/Reset, and a vector toggle that must redraw the paused canvas.
- Circular: first canvas frame, radius input, direction-button state, compare
  mode, and Play/Pause/Reset. This simulation has Release rather than Step;
  Release is outside this initial smoke suite.

Every case checks uncaught page errors, console errors, failed requests and
HTTP errors, loaded script/stylesheet MIME types, local font responses, unique
rendered IDs, and horizontal page overflow. Canvas checks read pixels to catch
blank startup scenes, without storing platform-dependent visual baselines.

Retries are disabled so failures remain visible. On failure, Playwright retains
a full-page screenshot and trace under `test-results/browser/`. Browser-health
errors are attached as JSON when present. The output directory is Git-ignored;
optional HTML reports under `playwright-report/` are also ignored.

Open the trace path printed by a failed test:

```sh
npx playwright show-trace test-results/browser/<failed-case-directory>/trace.zip
```

Do not commit node_modules, browser caches, screenshots, traces, or reports.
Playwright may clear its output directory on the next run; copy evidence you
need to retain before rerunning. A browser-launch/server failure can happen
before a page exists, so a screenshot is not guaranteed for infrastructure
failures. Re-running `npm ci` and browser installation reproduces the pinned
runner/browser pairing.

## Codex CLI environment restrictions

Some sessions restrict network access, localhost listening, subprocess launch,
or browser cache writes. Report the command and exact error; never count a
listed, skipped, blocked, or merely installed test as a pass. Where the session
supports approval, request only the access needed for the already authorized
install/test commands. Do not change application code or disable assertions to
work around an environment restriction.

In this environment the default sandbox rejected npm DNS resolution
(`ENOTFOUND registry.npmjs.org`) and localhost listening
(`listen EPERM ... 127.0.0.1:4173`). Installation and testing can be retried with
the session's approved network/process permissions. This is distinct from the
computer-use browser connector: the user explicitly requested Playwright CLI
execution, so an unavailable connector does not establish that Chromium itself
cannot run.

## Remaining acceptance work

These smoke tests do not establish full physics/curriculum correctness, visual
pixel equivalence, accessibility conformance, 200% zoom behavior, every slider
extreme, long-running stability, Firefox/WebKit support, or other simulations.
Semester tabs/state retention remain unimplemented and outside this suite.

The Circular Motion alias relocation is now approved: its retained redirect
lives beside the migrated canonical page and targets `index.html`. The existing
map and static link checks remain required; canonical-page smoke tests alone
do not validate every legacy alias.

References: [browser installation](https://playwright.dev/docs/browsers),
[webServer](https://playwright.dev/docs/test-webserver), and
[failure screenshot/trace options](https://playwright.dev/docs/test-use-options).

## Validation record

Validated on 2026-10-26 with Node.js 26.7.0, npm 11.19.0, Playwright 1.64.1,
and its Chromium 156.0.8078.4 runtime. After approved network/process access,
all 24 browser cases passed in 1.4 minutes. The default-sandbox server attempt
failed before browser tests with the EPERM error described above; it was not
counted as a browser result. Application files were unchanged by this setup.
