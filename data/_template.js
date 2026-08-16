/* Data file template — copy to data/<slug>.js and fill in.
 *
 * This file is the ONLY thing that changes between maps. The rendering shell
 * (assets/map.js) reads what's registered at the bottom and handles everything
 * else: forces, zoom, hover highlighting, the detail panel, legend and search.
 *
 * Conventions worth keeping, since they're what make the maps feel consistent:
 *   cat   — 8-15 clusters that reflect real structural divisions in the topic,
 *           each with a distinct hex colour, muted enough to sit on near-black.
 *   imp   — 1-4 importance tier. 4 = foundational/central (largest node),
 *           1 = niche. Drives node radius and label prominence.
 *   desc  — 2-4 sentences of plain technical prose: what it is, why it matters,
 *           how it relates to its neighbours. Teach, don't sell.
 *   links — at least one per node, {t, u} where t is Docs | Repo | Guide | Tool |
 *           Video | Paper. URLs must be real and verified, never guessed. For
 *           Video, a YouTube search URL via yt() ages better than a single video.
 *   LINKS — real relationships only: "built on", "alternative to", "commonly
 *           paired with", "wraps". Cross-cluster edges are expected and good.
 *
 * Run `node scripts/validate.mjs` before committing — it catches dangling edges,
 * unknown clusters, missing links and orphaned nodes.
 */
(function () {
  'use strict';
  const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

  const CATS = {
    foundations: { name: 'Foundations', color: '#a78bfa' },
    tooling:     { name: 'Tooling',     color: '#34d399' }
    // …8-15 clusters total
  };

  const NODES = [
    // ---------- FOUNDATIONS ----------
    {id:'example-root', label:'Example Root', cat:'foundations', imp:4,
     desc:`The central concept of this map — the thing everything else hangs off. Two to four sentences explaining what it actually is and does, why it matters, and how it relates to its neighbours.`,
     links:[{t:'Docs',u:'https://example.com/docs'},{t:'Video',u:yt('example root explained')}]},

    // ---------- TOOLING ----------
    {id:'example-tool', label:'Example Tool', cat:'tooling', imp:2,
     desc:`A tool in the ecosystem: what it does, what it replaces or complements, and when you'd reach for it over the alternatives.`,
     links:[{t:'Repo',u:'https://github.com/example/example'}]}
  ];

  const LINKS = [
    ['example-root', 'example-tool']
  ];

  window.EcosystemMaps = window.EcosystemMaps || {};
  window.EcosystemMaps['__SLUG__'] = {
    slug: '__SLUG__',
    title: '__TITLE__',
    subtitle: 'One line describing the scope of this map',
    accent: '#a78bfa',        // highlight colour for edges/focus on this map
    root: 'example-root',     // the hub node — gets a little extra link distance
    forces: { linkDistance: 64, linkStrength: 0.42, charge: -300, gravity: 0.028 },
    cats: CATS,
    nodes: NODES,
    links: LINKS
  };
})();
