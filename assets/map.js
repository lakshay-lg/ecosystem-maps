/* Shared force-graph engine for every ecosystem map.
 *
 * A map page loads, in order:
 *   1. d3 v7 (CDN)
 *   2. data/manifest.js   — the map registry (powers the switcher dropdown)
 *   3. data/<slug>.js     — this map's CATS / NODES / LINKS
 *   4. assets/map.js      — this file
 *
 * The page identifies itself with <body data-map="<slug>">.
 * Nothing here knows anything topic-specific: add a new map by adding a data
 * file and a copy of the map page, never by editing this file.
 */
(function () {
  'use strict';

  const slug = document.body.dataset.map;
  const registry = window.EcosystemMaps || {};
  const MAP = registry[slug] || registry[Object.keys(registry)[0]];

  if (!MAP) {
    document.body.innerHTML =
      '<p style="font-family:Inter,sans-serif;padding:40px;color:#e8e8ee">' +
      'No graph data found for <code>' + (slug || '(no data-map attribute)') + '</code>. ' +
      'Check that the matching <code>data/*.js</code> file is loaded before <code>assets/map.js</code>.</p>';
    return;
  }

  const CATS = MAP.cats;
  const NODES = MAP.nodes;
  const LINKS = MAP.links.map((d) => (Array.isArray(d) ? { source: d[0], target: d[1] } : d));
  const FORCES = Object.assign(
    { linkDistance: 64, linkStrength: 0.42, charge: -300, gravity: 0.028 },
    MAP.forces || {}
  );

  /* ---------- integrity check (dangling edges are silent killers) ---------- */
  const nodeById = new Map(NODES.map((n) => [n.id, n]));
  const dangling = LINKS.filter((l) => !nodeById.has(l.source) || !nodeById.has(l.target));
  if (dangling.length) {
    console.error('[' + MAP.slug + '] links reference unknown node ids:', dangling);
  }

  const adj = new Map(NODES.map((n) => [n.id, new Set()]));
  LINKS.forEach((l) => {
    if (adj.has(l.source) && adj.has(l.target)) {
      adj.get(l.source).add(l.target);
      adj.get(l.target).add(l.source);
    }
  });

  /* ---------- chrome ---------- */
  document.title = MAP.title;
  document.getElementById('map-title').textContent = MAP.title;
  document.getElementById('map-subtitle').textContent = MAP.subtitle;
  if (MAP.accent) document.documentElement.style.setProperty('--core', MAP.accent);

  const switcher = document.getElementById('map-switcher');
  (window.EcosystemMapManifest || []).forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.slug + '.html';
    opt.textContent = m.name;
    if (m.slug === MAP.slug) opt.selected = true;
    switcher.appendChild(opt);
  });
  if (switcher.options.length < 2) switcher.style.display = 'none';
  switcher.addEventListener('change', (e) => { window.location.href = e.target.value; });

  function tagColor(t) {
    return {
      Docs: '#a78bfa', Repo: '#34d399', Video: '#fb7185',
      Guide: '#fbbf24', Tool: '#2dd4bf', Paper: '#f97316'
    }[t] || '#94a3b8';
  }

  /* ---------- graph ---------- */
  let W = window.innerWidth, H = window.innerHeight;
  const svg = d3.select('#graph').attr('viewBox', [0, 0, W, H]);
  const root = svg.append('g');

  const defs = svg.append('defs');
  const glow = defs.append('filter').attr('id', 'glow')
    .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
  glow.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'b');
  const fm = glow.append('feMerge');
  fm.append('feMergeNode').attr('in', 'b');
  fm.append('feMergeNode').attr('in', 'SourceGraphic');

  function radius(d) { return d.imp === 4 ? 17 : d.imp === 3 ? 11 : d.imp === 2 ? 7.5 : 5.5; }
  function color(d) { return (CATS[d.cat] || {}).color || '#94a3b8'; }

  const sim = d3.forceSimulation(NODES)
    .force('link', d3.forceLink(LINKS).id((d) => d.id).distance((l) => {
      const isRoot = l.source.id === MAP.root || l.target.id === MAP.root;
      return FORCES.linkDistance + (isRoot ? 30 : 0);
    }).strength(FORCES.linkStrength))
    .force('charge', d3.forceManyBody().strength(FORCES.charge))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collide', d3.forceCollide((d) => radius(d) + 22))
    .force('x', d3.forceX(W / 2).strength(FORCES.gravity))
    .force('y', d3.forceY(H / 2).strength(FORCES.gravity));

  const link = root.append('g').attr('stroke-linecap', 'round')
    .selectAll('line').data(LINKS).join('line')
    .attr('stroke', 'var(--link)').attr('stroke-width', 1);

  const node = root.append('g').selectAll('g').data(NODES).join('g')
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e, d) => {
        if (!e.active) sim.alphaTarget(0.25).restart();
        d.fx = d.x; d.fy = d.y; svg.classed('dragging', true);
      })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null; svg.classed('dragging', false);
      }));

  node.append('circle')
    .attr('r', radius)
    .attr('fill', color)
    .attr('fill-opacity', (d) => (d.imp >= 3 ? 1 : 0.85))
    .attr('stroke', 'rgba(255,255,255,0.25)')
    .attr('stroke-width', 1);

  node.append('text')
    .text((d) => d.label)
    .attr('x', (d) => radius(d) + 6)
    .attr('y', 4)
    .attr('font-size', (d) => (d.imp === 4 ? '13px' : d.imp === 3 ? '11.5px' : '10.5px'))
    .attr('font-weight', (d) => (d.imp >= 3 ? 600 : 500))
    .attr('fill', 'var(--text)')
    .attr('opacity', (d) => (d.imp >= 3 ? 1 : 0.8));

  let selected = null;

  function clearHover() {
    node.select('circle').attr('opacity', 1).attr('filter', null);
    node.select('text').attr('opacity', (d) => (d.imp >= 3 ? 1 : 0.8));
    link.attr('stroke', 'var(--link)').attr('stroke-opacity', 0.5);
  }

  function hoverNode(d) {
    const neighbors = adj.get(d.id);
    node.select('circle')
      .attr('opacity', (n) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0.12))
      .attr('filter', (n) => (n.id === d.id ? 'url(#glow)' : null));
    node.select('text').attr('opacity', (n) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0.08));
    link
      .attr('stroke', (l) => (l.source.id === d.id || l.target.id === d.id ? 'var(--core)' : 'var(--link)'))
      .attr('stroke-opacity', (l) => (l.source.id === d.id || l.target.id === d.id ? 0.7 : 0.1));
  }

  node.on('mouseenter', (e, d) => { if (!selected) hoverNode(d); })
    .on('mouseleave', () => { if (!selected) clearHover(); });

  /* ---------- side panel ---------- */
  const panel = document.getElementById('panel');
  const pCat = document.getElementById('p-cat-name');
  const pDot = document.getElementById('p-dot');
  const pTitle = document.getElementById('p-title');
  const pDesc = document.getElementById('p-desc');
  const pLinks = document.getElementById('p-links');
  const pConn = document.getElementById('p-conn');

  function openPanel(d) {
    selected = d;
    hoverNode(d);
    pCat.textContent = (CATS[d.cat] || {}).name || d.cat;
    pDot.style.background = color(d);
    pTitle.textContent = d.label;
    pDesc.textContent = d.desc;

    pLinks.innerHTML = '';
    (d.links || []).forEach((l) => {
      const a = document.createElement('a');
      a.href = l.u; a.target = '_blank'; a.rel = 'noopener';
      const tag = document.createElement('span');
      tag.className = 'tag'; tag.textContent = l.t;
      tag.style.background = tagColor(l.t) + '22';
      tag.style.color = tagColor(l.t);
      const span = document.createElement('span');
      span.textContent = l.t === 'Video' ? 'Search on YouTube' : new URL(l.u).hostname.replace('www.', '');
      a.appendChild(tag); a.appendChild(span);
      pLinks.appendChild(a);
    });

    pConn.innerHTML = '';
    Array.from(adj.get(d.id)).forEach((id) => {
      const n = nodeById.get(id);
      const btn = document.createElement('button');
      btn.textContent = n.label;
      btn.onclick = () => openPanel(n);
      pConn.appendChild(btn);
    });

    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    history.replaceState(null, '', '#' + d.id);
  }

  function closePanel() {
    selected = null;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    clearHover();
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  node.on('click', (e, d) => { e.stopPropagation(); openPanel(d); });
  document.getElementById('close').onclick = closePanel;
  svg.on('click', () => { if (selected) closePanel(); });

  const zoom = d3.zoom().scaleExtent([0.25, 3.5]).on('zoom', (e) => root.attr('transform', e.transform));
  svg.call(zoom);

  sim.on('tick', () => {
    link.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
    node.attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')');
  });

  /* ---------- search ---------- */
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { selected ? hoverNode(selected) : clearHover(); return; }
    const hit = (n) => n.label.toLowerCase().includes(q);
    node.select('circle')
      .attr('opacity', (n) => (hit(n) ? 1 : 0.08))
      .attr('filter', (n) => (hit(n) ? 'url(#glow)' : null));
    node.select('text').attr('opacity', (n) => (hit(n) ? 1 : 0.07));
    link.attr('stroke', 'var(--link)').attr('stroke-opacity', 0.15);
  });

  /* ---------- legend ---------- */
  const legendEl = document.getElementById('legend-list');
  let activeCat = null;
  Object.entries(CATS).forEach(([key, v]) => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot'; dot.style.background = v.color;
    const tx = document.createElement('span');
    tx.textContent = v.name;
    li.appendChild(dot); li.appendChild(tx);
    li.onclick = () => {
      if (activeCat === key) {
        activeCat = null; li.classList.remove('active');
        if (!selected) clearHover();
        return;
      }
      legendEl.querySelectorAll('li').forEach((x) => x.classList.remove('active'));
      li.classList.add('active');
      activeCat = key;
      if (selected) closePanel();
      node.select('circle')
        .attr('opacity', (n) => (n.cat === key ? 1 : 0.12))
        .attr('filter', (n) => (n.cat === key ? 'url(#glow)' : null));
      node.select('text').attr('opacity', (n) => (n.cat === key ? (n.imp >= 3 ? 1 : 0.8) : 0.07));
      link.attr('stroke', 'var(--link)').attr('stroke-opacity', 0.12);
    };
    legendEl.appendChild(li);
  });

  /* ---------- resize ---------- */
  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    svg.attr('viewBox', [0, 0, W, H]);
    sim.force('center', d3.forceCenter(W / 2, H / 2));
    sim.force('x', d3.forceX(W / 2).strength(FORCES.gravity));
    sim.force('y', d3.forceY(H / 2).strength(FORCES.gravity));
    sim.alpha(0.3).restart();
  });

  /* ---------- keyboard ---------- */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.activeElement === searchInput) { searchInput.value = ''; searchInput.blur(); clearHover(); }
      else if (selected) closePanel();
    } else if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault(); searchInput.focus();
    }
  });

  /* ---------- deep links: maps/<slug>.html#<node-id> ---------- */
  function focusFromHash() {
    const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    const target = nodeById.get(id);
    if (!target) return;
    openPanel(target);
    // Pan to the node once the layout has settled enough for its position to mean something.
    let done = false;
    const centre = () => {
      if (done || target.x == null) return;
      done = true;
      const k = 1.1;
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(W / 2 - target.x * k, H / 2 - target.y * k).scale(k)
      );
    };
    sim.on('end', centre);
    setTimeout(centre, 1800);
  }

  sim.alpha(0.9).restart();
  focusFromHash();
  window.addEventListener('hashchange', focusFromHash);
})();
