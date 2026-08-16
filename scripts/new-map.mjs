#!/usr/bin/env node
/* Scaffold a new map.
 *
 *   node scripts/new-map.mjs <slug> "<Display Title>"
 *   node scripts/new-map.mjs rust "Rust Ecosystem Map"
 *
 * Creates data/<slug>.js and maps/<slug>.html from the templates and registers
 * the map in data/manifest.js. After that, the only work left is filling in the
 * clusters, nodes and edges in the data file.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const [slug, title] = process.argv.slice(2);

if (!slug || !title) {
  console.error('Usage: node scripts/new-map.mjs <slug> "<Display Title>"');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`Slug "${slug}" must be lowercase kebab-case (letters, digits, hyphens).`);
  process.exit(1);
}

const dataPath = join(repo, 'data', `${slug}.js`);
const pagePath = join(repo, 'maps', `${slug}.html`);
const manifestPath = join(repo, 'data', 'manifest.js');

for (const [label, p] of [['data file', dataPath], ['map page', pagePath]]) {
  if (existsSync(p)) { console.error(`Refusing to overwrite existing ${label}: ${p}`); process.exit(1); }
}

/* data file */
writeFileSync(
  dataPath,
  readFileSync(join(repo, 'data', '_template.js'), 'utf8')
    .replace(/__SLUG__/g, slug)
    .replace(/__TITLE__/g, title)
);

/* map page — strip the template-only comment block */
writeFileSync(
  pagePath,
  readFileSync(join(repo, 'maps', '_template.html'), 'utf8')
    .replace(/<!--\n {2}Map page template\.[\s\S]*?-->\n/, '')
    .replace(/__SLUG__/g, slug)
    .replace(/__TITLE__/g, title)
);

/* manifest entry */
const manifest = readFileSync(manifestPath, 'utf8');
if (manifest.includes(`slug: '${slug}'`)) {
  console.log(`data/manifest.js already lists "${slug}" — left untouched.`);
} else {
  const entry =
    `  {\n` +
    `    slug: '${slug}',\n` +
    `    name: '${title.replace(/ Ecosystem Map$/, '')}',\n` +
    `    title: '${title}',\n` +
    `    subtitle: 'One line describing the scope of this map',\n` +
    `    blurb: 'Two sentences for the homepage card: what this map covers, and what it deliberately leaves out.',\n` +
    `    accent: '#a78bfa',\n` +
    `    tags: ['Tag', 'Tag', 'Tag']\n` +
    `  }\n];\n`;
  const idx = manifest.lastIndexOf('\n];');
  writeFileSync(manifestPath, manifest.slice(0, idx) + ',\n' + entry);
}

console.log(`
Created:
  data/${slug}.js       ← write the clusters, nodes and edges here
  maps/${slug}.html
  data/manifest.js      ← updated; fill in subtitle, blurb, accent and tags

Then:
  node scripts/validate.mjs        check the graph holds together
  python3 -m http.server 8000      preview at localhost:8000
`);
