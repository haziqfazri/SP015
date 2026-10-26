import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateTree, parseCatalogue, htmlReferences, resolveReference } from './check-links.mjs';

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'sp015-link-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), content);
  }
  return root;
}
const catalogue = (entries) => `const SIMULATIONS = ${entries};\nconst card = '<a href="' + sim.href + '">';`;

for (const basePath of ['/', '/SP015/']) {
  test(`relative HTML, CSS fonts, redirects, and catalogue URLs at ${basePath}`, async (t) => {
    const root = fixture(t, {
      'landing/index.html': '<link href="../shared/style.css" rel="stylesheet"><script src="app.js"></script>',
      'landing/app.js': catalogue("[{ chapter: '7', chapterName: 'Waves', status: 'completed', href: '../simulations/sp015/07-waves/7.5-wave/index.html', },]"),
      'shared/style.css': '/* url(missing-comment.png) */ @font-face { src: url("../vendor/font.woff2?v=1#font"); }',
      'vendor/font.woff2': 'font',
      'simulations/sp015/07-waves/7.5-wave/index.html': '<h1 id="wave">Wave</h1><script src="model.js"></script>',
      'simulations/sp015/07-waves/7.5-wave/model.js': 'const model = 1;',
      'simulations/sp015/07-waves/7.5-wave/old.html': '<meta content="0; URL=\'index.html#wave\'" http-equiv="refresh">'
    });
    const result = await validateTree({ root, basePath });
    assert.equal(result.failures, 0, JSON.stringify(result.issues));
    assert.equal(result.catalogueEntries, 1);
    assert.deepEqual(result.issues, []);
  });
}

test('actual missing catalogue URL is reported; dynamic card markup is not a filename', async (t) => {
  const root = fixture(t, { 'landing/app.js': catalogue("[{title: 'Missing', status: 'completed', href: '../missing.html'}]") });
  const result = await validateTree({ root });
  assert.equal(result.failures, 1);
  assert.equal(result.issues[0].target, '../missing.html');
  assert.ok(!JSON.stringify(result.issues).includes('${sim.href}'));
});

test('metadata parser supports escaped strings, quoted keys, comments, nested values, and trailing commas', () => {
  const entries = parseCatalogue(`const SIMULATIONS = [/* note */ { 'title': 'Young\\'s modulus', "href": "../a\\u0020b.html", other: [true, null, -1.2], },];\nthrow new Error('must not execute');`);
  assert.equal(entries[0].title, "Young's modulus");
  assert.equal(entries[0].href, '../a b.html');
  assert.deepEqual(entries[0].other, [true, null, -1.2]);
});

test('computed metadata fails explicitly and is never executed', () => {
  assert.throws(() => parseCatalogue('const SIMULATIONS = buildCatalogue();'), /static literal/);
  assert.throws(() => parseCatalogue('const SIMULATIONS = [{ href: `${root}/index.html` }];'), /static literal/);
});

test('missing script, stylesheet, CSS URL, and refresh targets all fail', async (t) => {
  const root = fixture(t, {
    'index.html': '<script src="bad.js"></script><link href="bad.css"><meta http-equiv="refresh" content="0; url=bad.html">',
    'style.css': 'body { background: url(bad.png); }'
  });
  const result = await validateTree({ root });
  assert.deepEqual(result.issues.filter((i) => i.kind === 'missing').map((i) => i.target).sort(), ['bad.css', 'bad.html', 'bad.js', 'bad.png']);
});

test('scoped checks resolve against repository root, not working directory or scan scope', async (t) => {
  const repoRoot = fixture(t, { 'shared/a.js': '', 'animations/ch/topic/index.html': '<script src="../../../shared/a.js"></script>' });
  assert.equal((await validateTree({ root: join(repoRoot, 'animations/ch/topic'), repoRoot, basePath: '/SP015/' })).failures, 0);
});

test('root-absolute assets that escape the hosting prefix fail', async (t) => {
  const root = fixture(t, { 'shared/a.css': '', 'index.html': '<link href="/shared/a.css">' });
  assert.equal((await validateTree({ root })).failures, 0);
  const result = await validateTree({ root, basePath: '/SP015/' });
  assert.equal(result.failures, 1);
  assert.match(result.issues[0].detail, /Escapes hosting base/);
});

test('explicit repository-prefixed absolute paths resolve beneath that prefix', async (t) => {
  const root = fixture(t, { 'shared/a.css': '', 'index.html': '<link href="/SP015/shared/a.css">' });
  assert.equal((await validateTree({ root, basePath: '/SP015/' })).failures, 0);
});

test('excess parent traversal is not silently clamped even at the site root', async (t) => {
  const root = fixture(t, { 'shared/a.css': '', 'index.html': '<link href="../../shared/a.css">' });
  assert.match((await validateTree({ root })).issues[0].detail, /above repository root/);
});

test('navigation may use directory indexes, but script assets must be files', async (t) => {
  const root = fixture(t, { 'index.html': '<a href="page/">page</a><script src="page/"></script>', 'page/index.html': '' });
  const result = await validateTree({ root });
  assert.equal(result.failures, 1);
  assert.equal(result.issues[0].target, 'page/');
});

test('prepared templates resolve root assets at future depth and sibling assets in templates', async (t) => {
  const root = fixture(t, { 'templates/index.html': '<link href="../../../../shared/a.css"><script src="template.js"></script>', 'templates/template.js': '', 'shared/a.css': '' });
  assert.equal((await validateTree({ root, basePath: '/SP015/' })).failures, 0);
});

test('filename case mismatches fail on any development filesystem', async (t) => {
  const root = fixture(t, { 'index.html': '<script src="model.js"></script>', 'Model.js': '' });
  assert.equal((await validateTree({ root })).failures, 1);
});

test('spaces, parentheses, query strings, entities, base href, inline styles, and srcset', async (t) => {
  const root = fixture(t, {
    'index.html': '<base href="assets/"><script src="a.js?v=1&amp;v2=2"></script><img srcset="a.png 1x, b.png 2x" style="background:url(\'a.png\')"><style>body { background:url("b.png"); }</style><a href="file%20(1).html">file</a>',
    'assets/a.js': '', 'assets/a.png': '', 'assets/b.png': '', 'assets/file (1).html': ''
  });
  assert.equal((await validateTree({ root, basePath: '/SP015/' })).failures, 0);
});

test('CSS imports resolve locally; data URLs and fragment-only SVG references are valid', async (t) => {
  const root = fixture(t, { 'style.css': '@import "other.css"; .x { fill:url(#mark); background:url(data:image/png;base64,AAAA); }', 'other.css': '' });
  const result = await validateTree({ root });
  assert.equal(result.failures, 0);
});

test('Markdown directories/angle URLs and heading anchors work; code samples are ignored', async (t) => {
  const root = fixture(t, { 'README.md': '# A heading\n[dir](docs/)\n[file](<file (1).html>)\n[heading](#a-heading)\n`[example](missing)`\n```html\n[example](missing)\n```', 'docs/a.md': '', 'file (1).html': '' });
  assert.deepEqual((await validateTree({ root })).issues, []);
});

test('duplicate static IDs fail without treating script/template strings as DOM IDs', async (t) => {
  const root = fixture(t, { 'index.html': '<div id="same"></div><div id="same"></div><script>const s = `<div id="same">`;</script>' });
  const result = await validateTree({ root });
  assert.equal(result.failures, 1);
  assert.equal(result.issues[0].detail, 'Duplicate HTML id');
});

test('strict semester gate allows shared chapter numbers/names across semesters', async (t) => {
  const root = fixture(t, {
    'landing/app.js': catalogue("[{semester:'sp015', id:'sp015-wave',chapter:'1',chapterName:'Shared',status:'completed',href:'../simulations/sp015/01/a/index.html'},{semester:'sp025',id:'sp025-wave',chapter:'1',chapterName:'Shared',status:'completed',href:'../simulations/sp025/01/a/index.html'}]"),
    'simulations/sp015/01/a/index.html': '', 'simulations/sp025/01/a/index.html': ''
  });
  assert.equal((await validateTree({ root, requireSemesters: true })).failures, 0);
});

test('strict semester gate rejects missing semester and cross-semester destinations', async (t) => {
  const root = fixture(t, {
    'app.js': catalogue("[{chapter:'1',status:'completed',href:'simulations/sp015/01/a/index.html'},{semester:'sp025',chapter:'1',status:'completed',href:'simulations/sp015/01/a/index.html'}]"),
    'simulations/sp015/01/a/index.html': ''
  });
  const result = await validateTree({ root, requireSemesters: true });
  assert.ok(result.issues.some((i) => i.detail.includes('Explicit semester')));
  assert.ok(result.issues.some((i) => i.detail.includes('does not match semester')));
  assert.ok(result.issues.some((i) => i.detail.includes('Duplicate catalogue destination')));
});

test('planned launch URLs, duplicate catalogue IDs, and conflicting group labels fail', async (t) => {
  const root = fixture(t, { 'app.js': catalogue("[{semester:'sp015',id:'sp015-x',chapter:'1',chapterName:'A',status:'planned',href:'simulations/sp015/01/a/index.html'},{semester:'sp015',id:'sp015-x',chapter:'1',chapterName:'B',status:'planned'}]"), 'simulations/sp015/01/a/index.html': '' });
  const result = await validateTree({ root, requireSemesters: true });
  assert.equal(result.failures, 3);
});

test('malformed URL encoding and missing scan scopes fail clearly', async (t) => {
  const root = fixture(t, { 'index.html': '<script src="bad%zz.js"></script>' });
  assert.equal((await validateTree({ root })).issues[0].kind, 'invalid');
  await assert.rejects(validateTree({ root: join(root, 'missing') }), /does not exist/);
});

test('migration map covers every simulation, catalogue destination, and retained alias in current or mixed layouts', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const map = JSON.parse(readFileSync(join(root, 'docs/plan/active/physics-library-migration-map.json'), 'utf8'));
  const entries = parseCatalogue(readFileSync(join(root, 'landing/app.js'), 'utf8'));
  const currentFolders = new Set(); const targets = new Set();
  const locate = (from, to) => {
    assert.notEqual(existsSync(join(root, from)), existsSync(join(root, to)), `Exactly one location must exist: ${from}, ${to}`);
    return existsSync(join(root, from)) ? from : to;
  };
  const expectedHrefs = [];
  for (const item of map.simulations) {
    assert.equal(item.semester, 'sp015');
    assert.ok(item.targetFolder.startsWith('simulations/sp015/'));
    assert.ok(!targets.has(item.targetFolder)); targets.add(item.targetFolder);
    const folder = locate(item.currentFolder, item.targetFolder);
    assert.ok(!currentFolders.has(folder)); currentFolders.add(folder);
    assert.ok(existsSync(join(root, folder, item.entrypoint)));
    if (item.published) expectedHrefs.push(folder === item.currentFolder ? item.currentCatalogueHref : item.targetCatalogueHref);
    else {
      assert.equal(item.currentCatalogueHref, null); assert.equal(item.targetCatalogueHref, null);
      assert.ok(!entries.some((entry) => entry.href?.includes('thermodynamics-workbench')));
    }
  }
  const discovered = [];
  const walk = (directory) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('-sketch.js')) discovered.push(relative(root, dirname(path)).split('\\').join('/'));
    }
  };
  walk(join(root, 'animations')); walk(join(root, 'simulations'));
  assert.deepEqual([...currentFolders].sort(), discovered.sort());
  assert.deepEqual(entries.map((entry) => entry.href).filter(Boolean).sort(), expectedHrefs.sort());
  const aliases = new Set();
  for (const item of map.aliases) {
    const actual = locate(item.currentPath, item.targetPath);
    assert.ok(!aliases.has(actual)); aliases.add(actual);
    assert.ok(!targets.has(item.targetPath)); targets.add(item.targetPath);
    const source = readFileSync(join(root, actual), 'utf8');
    assert.match(source, /http-equiv=["']refresh["']/i);
    const owner = map.simulations.find((simulation) => `${simulation.targetFolder}/${simulation.entrypoint}` === item.targetCanonicalPath);
    assert.ok(owner, `Alias must map to a known canonical simulation: ${item.targetCanonicalPath}`);
    const canonical = resolve(root, locate(owner.currentFolder, owner.targetFolder), owner.entrypoint);
    for (const ref of htmlReferences(source).refs) {
      const target = resolveReference(root, join(root, actual), ref.target).path;
      assert.ok(existsSync(target), `Alias target missing: ${actual} -> ${ref.target}`);
      assert.equal(target, canonical);
    }
    assert.equal(item.plannedRedirectHref, 'index.html');
    assert.equal(dirname(item.targetPath), dirname(item.targetCanonicalPath));
  }
  const discoveredAliases = [];
  const findAliases = (directory) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) findAliases(path);
      else if (entry.name.endsWith('.html') && /http-equiv=["']refresh["']/i.test(readFileSync(path, 'utf8'))) discoveredAliases.push(relative(root, path).split('\\').join('/'));
    }
  };
  findAliases(join(root, 'animations')); findAliases(join(root, 'simulations'));
  assert.deepEqual([...aliases].sort(), discoveredAliases.sort());
});
