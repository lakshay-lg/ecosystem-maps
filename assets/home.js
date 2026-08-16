/* Homepage: renders the map grid from data/manifest.js, then lazily pulls in each
 * map's data file to fill in live counts, cluster swatches and cross-map search.
 *
 * Cards render immediately from the manifest; the data files load in the
 * background, so nothing here blocks first paint and nothing shows a hand-typed
 * count that can drift away from the real graph.
 */
(function () {
  'use strict';

  const MAPS = window.EcosystemMapManifest || [];
  const grid = document.getElementById('grid');
  const input = document.getElementById('q');
  const results = document.getElementById('results');
  const loaded = Object.create(null); // slug -> map data, once its file has arrived

  document.getElementById('map-count').textContent =
    MAPS.length + (MAPS.length === 1 ? ' map' : ' maps');

  /* ---------- cards ---------- */
  MAPS.forEach((m) => {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = 'maps/' + m.slug + '.html';
    a.style.setProperty('--card-accent', m.accent);
    a.innerHTML =
      '<h3></h3>' +
      '<p class="sub"></p>' +
      '<p class="blurb"></p>' +
      '<div class="swatches" aria-hidden="true"></div>' +
      '<div class="tags"></div>' +
      '<div class="foot"><span class="stat">Loading…</span><span class="go">Open map →</span></div>';

    a.querySelector('h3').textContent = m.title.replace(/ Ecosystem Map$/, '');
    a.querySelector('.sub').textContent = m.subtitle;
    a.querySelector('.blurb').textContent = m.blurb;
    (m.tags || []).forEach((t) => {
      const s = document.createElement('span');
      s.textContent = t;
      a.querySelector('.tags').appendChild(s);
    });

    m._card = a;
    grid.appendChild(a);
  });

  /* ---------- lazy data load ---------- */
  function loadMapData(m) {
    return new Promise((resolve) => {
      if (loaded[m.slug]) return resolve(loaded[m.slug]);
      const s = document.createElement('script');
      s.src = 'data/' + m.slug + '.js';
      s.onload = () => {
        const data = (window.EcosystemMaps || {})[m.slug];
        if (data) loaded[m.slug] = data;
        resolve(data);
      };
      s.onerror = () => resolve(null); // e.g. opened over file:// — cards still work
      document.head.appendChild(s);
    });
  }

  function decorateCard(m, data) {
    const card = m._card;
    if (!card) return;
    if (!data) {
      card.querySelector('.stat').textContent = 'Open to explore';
      return;
    }
    const clusters = Object.values(data.cats);
    card.querySelector('.stat').textContent =
      data.nodes.length + ' nodes · ' + clusters.length + ' clusters';
    const sw = card.querySelector('.swatches');
    clusters.forEach((c) => {
      const i = document.createElement('i');
      i.style.background = c.color;
      i.title = c.name;
      sw.appendChild(i);
    });
  }

  const ready = Promise.all(
    MAPS.map((m) => loadMapData(m).then((data) => { decorateCard(m, data); return data; }))
  );

  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  idle(() => { /* data load already kicked off above; this just yields first paint */ });

  /* ---------- cross-map search ---------- */
  let items = [];   // flattened searchable index, built once data arrives
  let active = -1;

  ready.then(() => {
    MAPS.forEach((m) => {
      const data = loaded[m.slug];
      if (!data) return;
      data.nodes.forEach((n) => {
        items.push({
          label: n.label,
          desc: n.desc || '',
          cat: (data.cats[n.cat] || {}).name || n.cat,
          color: (data.cats[n.cat] || {}).color || m.accent,
          mapName: m.name,
          href: 'maps/' + m.slug + '.html#' + encodeURIComponent(n.id)
        });
      });
    });
    if (input.value.trim()) render(input.value);
  });

  function score(item, q) {
    const label = item.label.toLowerCase();
    if (label === q) return 0;
    if (label.startsWith(q)) return 1;
    if (label.includes(q)) return 2;
    if (item.cat.toLowerCase().includes(q)) return 3;
    if (item.desc.toLowerCase().includes(q)) return 4;
    return Infinity;
  }

  function render(raw) {
    const q = raw.trim().toLowerCase();
    active = -1;
    if (!q) return hide();

    const hits = items
      .map((item) => ({ item: item, s: score(item, q) }))
      .filter((r) => r.s !== Infinity)
      .sort((a, b) => a.s - b.s || a.item.label.length - b.item.label.length)
      .slice(0, 12);

    results.innerHTML = '';
    if (!hits.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = items.length
        ? 'No node matches “' + raw.trim() + '”.'
        : 'Search index still loading…';
      results.appendChild(p);
    } else {
      hits.forEach((r) => {
        const a = document.createElement('a');
        a.href = r.item.href;
        a.setAttribute('role', 'option');
        const dot = document.createElement('span');
        dot.className = 'r-dot';
        dot.style.background = r.item.color;
        const label = document.createElement('span');
        label.className = 'r-label';
        label.textContent = r.item.label;
        const meta = document.createElement('span');
        meta.className = 'r-meta';
        meta.textContent = r.item.mapName + ' · ' + r.item.cat;
        a.append(dot, label, meta);
        results.appendChild(a);
      });
    }
    show();
  }

  function show() { results.hidden = false; input.setAttribute('aria-expanded', 'true'); }
  function hide() { results.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }

  function move(delta) {
    const links = Array.from(results.querySelectorAll('a'));
    if (!links.length) return;
    links.forEach((l) => l.classList.remove('active'));
    active = (active + delta + links.length) % links.length;
    links[active].classList.add('active');
    links[active].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', (e) => render(e.target.value));
  input.addEventListener('focus', () => { if (input.value.trim()) render(input.value); });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      const links = results.querySelectorAll('a');
      if (links.length) { e.preventDefault(); (links[active] || links[0]).click(); }
    } else if (e.key === 'Escape') { input.value = ''; hide(); input.blur(); }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-block')) hide();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); }
  });
})();
