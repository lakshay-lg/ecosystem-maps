#!/usr/bin/env node
/* Integrity check for every map in the site.
 *
 *   node scripts/validate.mjs
 *
 * Catches the failure modes that are invisible in a browser until you happen to
 * click the wrong node: edges pointing at ids that don't exist, nodes in a
 * cluster the legend never defines, missing links or descriptions, duplicate
 * ids, and manifest entries with no data file or map page behind them.
 *
 * Exits non-zero on any error, so it can gate a commit or CI run.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Evaluate a browser data file in a sandbox and hand back its `window`. */
function loadBrowserScript(sandboxWindow, relPath) {
  const sandbox = { window: sandboxWindow, console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(join(repo, relPath), 'utf8'), sandbox, { filename: relPath });
  return sandboxWindow;
}

const errors = [];
const warnings = [];
const fail = (slug, msg) => errors.push(`  ✗ [${slug}] ${msg}`);
const warn = (slug, msg) => warnings.push(`  ! [${slug}] ${msg}`);

const win = loadBrowserScript({}, 'data/manifest.js');
const manifest = win.EcosystemMapManifest || [];
if (!manifest.length) {
  console.error('No maps found in data/manifest.js');
  process.exit(1);
}

const seenSlugs = new Set();
let totalNodes = 0;
let totalLinks = 0;

for (const entry of manifest) {
  const slug = entry.slug;

  if (seenSlugs.has(slug)) fail(slug, 'duplicate slug in manifest');
  seenSlugs.add(slug);

  for (const field of ['slug', 'name', 'title', 'subtitle', 'blurb', 'accent']) {
    if (!entry[field]) fail(slug, `manifest entry is missing "${field}"`);
  }

  const dataPath = `data/${slug}.js`;
  const pagePath = `maps/${slug}.html`;
  if (!existsSync(join(repo, dataPath))) { fail(slug, `missing ${dataPath}`); continue; }
  if (!existsSync(join(repo, pagePath))) fail(slug, `missing ${pagePath}`);
  else {
    const page = readFileSync(join(repo, pagePath), 'utf8');
    if (!page.includes(`data-map="${slug}"`)) fail(slug, `${pagePath} has no matching data-map="${slug}"`);
    if (!page.includes(`../data/${slug}.js`)) fail(slug, `${pagePath} does not load ${dataPath}`);
  }

  loadBrowserScript(win, dataPath);
  const map = (win.EcosystemMaps || {})[slug];
  if (!map) { fail(slug, `${dataPath} did not register window.EcosystemMaps['${slug}']`); continue; }

  const ids = new Set();
  for (const n of map.nodes) {
    if (ids.has(n.id)) fail(slug, `duplicate node id "${n.id}"`);
    ids.add(n.id);
    if (!map.cats[n.cat]) fail(slug, `node "${n.id}" has unknown cluster "${n.cat}"`);
    if (!(n.imp >= 1 && n.imp <= 4)) fail(slug, `node "${n.id}" has imp=${n.imp} (expected 1-4)`);
    if (!n.desc || n.desc.trim().length < 40) warn(slug, `node "${n.id}" has a very short description`);
    if (!n.links || !n.links.length) fail(slug, `node "${n.id}" has no links`);
    for (const l of n.links || []) {
      if (!/^https?:\/\//.test(l.u)) fail(slug, `node "${n.id}" has a non-http link: ${l.u}`);
    }
  }

  for (const [a, b] of map.links) {
    if (!ids.has(a)) fail(slug, `link source "${a}" does not exist (→ "${b}")`);
    if (!ids.has(b)) fail(slug, `link target "${b}" does not exist (← "${a}")`);
    if (a === b) fail(slug, `self-link on "${a}"`);
  }

  if (map.root && !ids.has(map.root)) fail(slug, `root "${map.root}" is not a node id`);

  const connected = new Set(map.links.flat());
  for (const id of ids) if (!connected.has(id)) warn(slug, `node "${id}" is orphaned (no edges)`);

  totalNodes += map.nodes.length;
  totalLinks += map.links.length;
  const clusters = Object.keys(map.cats).length;
  console.log(
    `  ✓ ${slug.padEnd(18)} ${String(map.nodes.length).padStart(3)} nodes · ` +
    `${String(map.links.length).padStart(3)} edges · ${clusters} clusters`
  );
}

console.log(`\n${manifest.length} maps · ${totalNodes} nodes · ${totalLinks} edges`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => console.log(w));
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.error(e));
  process.exit(1);
}
console.log('\nAll maps valid.');
