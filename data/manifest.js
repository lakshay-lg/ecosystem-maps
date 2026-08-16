/* The map registry.
 *
 * This is the single place a new map gets announced to the site: the homepage
 * grid, the global search, and the switcher dropdown inside every map all read
 * from here. Order in this array is the order shown on the homepage.
 *
 * Counts (nodes/clusters) are deliberately NOT stored here — the homepage reads
 * them from the actual data files so they can never drift out of date.
 */
window.EcosystemMapManifest = [
  {
    slug: 'machine-learning',
    name: 'Machine Learning',
    title: 'Machine Learning Ecosystem Map',
    subtitle: 'Supervised & unsupervised ML · algorithms, concepts & tooling',
    blurb: 'Classical ML end to end: the algorithm families, the workflow around them, and the Python tooling they run on. Deep learning appears only where it touches the classical stack.',
    accent: '#60a5fa',
    tags: ['scikit-learn', 'Ensembles', 'Clustering', 'MLOps']
  },
  {
    slug: 'deep-learning',
    name: 'Deep Learning',
    title: 'Deep Learning Ecosystem Map',
    subtitle: 'Architectures, training, generative models & tooling',
    blurb: 'From backprop up through transformers, LLMs, diffusion and multimodal models, plus the training infrastructure and efficiency techniques that make them runnable.',
    accent: '#f472b6',
    tags: ['Transformers', 'LLMs', 'Diffusion', 'PyTorch']
  },
  {
    slug: 'threejs',
    name: 'Three.js',
    title: 'Three.js Ecosystem Map',
    subtitle: 'Vanilla Three.js · physics, compression, performance & more',
    blurb: 'The vanilla Three.js stack and the addon ecosystem around it: loaders and asset compression, physics engines, post-processing, and the performance work real scenes need.',
    accent: '#34d399',
    tags: ['WebGL', 'glTF', 'Physics', 'Performance']
  }
];
