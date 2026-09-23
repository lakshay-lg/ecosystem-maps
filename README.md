# Ecosystem Maps

Interactive, Obsidian-style knowledge graphs of technical fields, hosted as a
static site on GitHub Pages. Every node is a concept or tool, every edge a real
relationship, and every node opens a written explanation with links out to the
primary docs.

Three maps ship today — **Machine Learning**, **Deep Learning** and **Three.js** —
and the repository is set up so adding a fourth is a data file, not a rewrite.

```
Homepage  →  index.html          card grid + search across every map's nodes
Maps      →  maps/<slug>.html    one page per map, all sharing one engine
Data      →  data/<slug>.js      the only file that changes between maps
```

## Live site

Once GitHub Pages is enabled (see below):

- Homepage — `https://lakshay-lg.github.io/ecosystem-maps/`
- A map — `https://lakshay-lg.github.io/ecosystem-maps/maps/deep-learning.html`
- A single node — `.../maps/deep-learning.html#transformer`

That last form is a real deep link: it opens the detail panel and pans the view
to that node, so individual concepts can be linked from notes or chat.

### Enabling Pages

There is no build step — the repository root *is* the site — so a branch deploy
is all it takes:

1. Merge this branch into `main`.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch →
   `main` / `/ (root)`.**
3. It publishes within a minute or two.

Optionally, `ci/pages-workflow.yml` deploys via GitHub Actions instead and runs
`scripts/validate.mjs` first, so a malformed graph fails the deploy rather than
shipping. See `ci/README.md` for the two commands that enable it.

## Repository layout

```
index.html                 homepage: map cards + cross-map node search
404.html                   styled not-found page
maps/
  _template.html           copy this for a new map
  machine-learning.html    each page is ~40 lines: it only names its data file
  deep-learning.html
  threejs.html
data/
  manifest.js              the map registry — homepage grid, search, switcher
  _template.js             copy this for a new map's graph data
  machine-learning.js      clusters + nodes + edges
  deep-learning.js
  threejs.js
assets/
  map.css / map.js         the shared shell: forces, panel, legend, search, zoom
  site.css / home.js       homepage
  fonts/                   self-hosted Inter + Space Grotesk (SIL OFL 1.1)
  vendor/d3.v7.min.js      vendored D3 7.9.0
scripts/
  new-map.mjs              scaffold a new map
  validate.mjs             graph integrity check
  publish.sh               validate → commit one map → push → wait for Pages
  fetch-fonts.sh           regenerate the self-hosted fonts
ci/
  pages-workflow.yml       optional Actions deploy + validation gate
prompts/
  ecosystem-map-builder.md system prompt for generating a new map's data file
skills/
  ecosystem-map/SKILL.md   Claude Code skill: topic in, live map out
```

**No external runtime dependencies.** D3 and both fonts are committed to the
repository, so the site renders identically offline, behind a network that
blocks public CDNs, or dropped into an Obsidian vault.

## Adding a map

### With Claude Code (one step)

`skills/ecosystem-map/` is a Claude Code skill that runs the whole pipeline —
research, write the data file, validate, commit, push, confirm the deploy. Link it
into your user skills once so it works from any directory:

```bash
ln -sfn "$PWD/skills/ecosystem-map" ~/.claude/skills/ecosystem-map
```

Then just ask, from anywhere: *"make an ecosystem map of Rust async"* or
*"extend my Three.js map with WebGPU"*. The skill follows
`prompts/ecosystem-map-builder.md` for content and ships via `scripts/publish.sh`.

### By hand

```bash
node scripts/new-map.mjs rust "Rust Ecosystem Map"
```

That creates `data/rust.js` and `maps/rust.html` and registers the map in
`data/manifest.js`. Then:

1. **Write the graph** in `data/rust.js` — clusters, nodes, edges. The template
   documents the conventions; `prompts/ecosystem-map-builder.md` is the system
   prompt for having a model research and draft it.
2. **Finish the manifest entry** in `data/manifest.js` — subtitle, blurb, accent
   colour and tags for the homepage card.
3. **Check it**: `node scripts/validate.mjs`
4. **Preview it**: `python3 -m http.server 8000` → <http://localhost:8000>
5. **Ship it**: `scripts/publish.sh rust "Add Rust ecosystem map"` — validates,
   commits only that map's files, pushes to `main` and waits for Pages.

Node and cluster counts on the homepage are read from the data files at runtime,
so they never need updating by hand.

Nothing else needs touching. In particular, don't fork `assets/map.js` per map —
if a map needs different behaviour, that behaviour belongs in the shared shell
behind a flag in the data file, so every map keeps working the same way.

## Data format

```js
const CATS = {
  foundations: { name: 'Foundations', color: '#a78bfa' }   // 8-15 clusters
};

const NODES = [
  {id:'backprop', label:'Backpropagation', cat:'foundations', imp:4,
   desc:`2-4 sentences: what it is, why it matters, how it relates to neighbours.`,
   links:[{t:'Paper',u:'https://arxiv.org/abs/...'}]}
];

const LINKS = [ ['backprop', 'sgd-adam'] ];
```

| Field | Notes |
| --- | --- |
| `id` | kebab-case, unique within the map; it's also the deep-link anchor |
| `cat` | a key in `CATS` — the validator rejects anything else |
| `imp` | 1-4 importance tier; drives node radius and label prominence (4 = foundational) |
| `desc` | plain technical prose that teaches, not marketing copy |
| `links` | at least one; `t` is `Docs`/`Repo`/`Guide`/`Tool`/`Video`/`Paper`, `u` a verified URL |

Per-map tuning lives alongside the data: `accent` (highlight colour), `root`
(the hub node, which gets extra link distance) and `forces` (link distance and
strength, charge, gravity) if a graph settles too tight or too loose.

`scripts/validate.mjs` catches dangling edges, unknown clusters, duplicate ids,
out-of-range `imp`, nodes with no links, non-http URLs, orphaned nodes, and
manifest entries missing a data file or page.

## Interactions

Every map behaves the same way, because every map runs the same engine:

| | |
| --- | --- |
| Drag a node | pins it while dragging, releases on drop |
| Scroll / pinch | zoom and pan |
| Hover a node | glow it and its direct neighbours, dim the rest |
| Click a node | open the detail panel and lock the highlight |
| Panel chips | traverse to any connected node without touching the canvas |
| Click a legend colour | isolate that cluster |
| Type in search, or `/` | dim every node whose label doesn't match |
| `Esc` | close the panel or clear the search |
| `← All maps`, switcher | jump home or straight to another map |

## Licence

Site code is yours to do as you like with. The bundled fonts are SIL OFL 1.1
(see `assets/fonts/`) and D3 is ISC-licensed.
