// Calculator Registry — all calculators defined as structured configs
// Each calculator has: fields[], calculate() function, result template
// Load conversion data files lazily

const calculatorRegistry = {
  _catalog: {},
  _aliases: {},

  // Register a single calculator; a repeat of an existing (normalized) title
  // becomes an alias of the first calculator registered with that title.
  register(category, slug, config) {
    // Guard: never store an unusable config. A single undefined entry used to
    // break rendering of the whole category page.
    if (!config || typeof config !== 'object' || !config.title) {
      if (typeof console !== 'undefined') {
        console.warn(`[registry] ignoring invalid calculator registration: ${category}/${slug}`);
      }
      return;
    }
    if (!this._catalog[category]) this._catalog[category] = {};
    const catalog = this._catalog[category];
    const norm = String(config.title).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(calculator|converter|counter|generator|checker|solver|estimator|matrix|table)$/g, '');
    for (const existingSlug of Object.keys(catalog)) {
      const existingNorm = String(catalog[existingSlug].title || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(calculator|converter|counter|generator|checker|solver|estimator|matrix|table)$/g, '');
      if (existingNorm === norm) {
        this.registerAlias(category, slug, existingSlug);
        return;
      }
    }
    catalog[slug] = config;
  },

  // Register a duplicate slug as an alias of a canonical calculator
  registerAlias(category, from, to) {
    this._aliases[`${category}/${from}`] = to;
  },

  isAlias(category, slug) {
    return Boolean(this._aliases[`${category}/${slug}`]);
  },

  // Resolve a slug through alias chains to its canonical key
  resolve(category, slug) {
    let current = slug;
    for (let i = 0; i < 10; i++) {
      const next = this._aliases[`${category}/${current}`];
      if (!next || next === current) break;
      current = next;
    }
    return current;
  },

  // Get a calculator config (aliases resolve to the canonical calculator)
  get(category, slug) {
    const key = this.resolve(category, slug);
    return this._catalog[category]?.[key];
  },

  // Get all calculators in a category (aliases are not listed separately)
  getCategory(category) {
    const calcs = this._catalog[category] || {};
    const out = {};
    for (const [slug, cfg] of Object.entries(calcs)) {
      const key = this.resolve(category, slug);
      if (key !== slug) continue;
      out[key] = cfg;
    }
    return out;
  },

  // Get all categories
  getCategories() {
    return Object.keys(this._catalog).sort();
  },

  // Search across all calculators (aliases are not listed separately)
  search(query) {
    const q = query.toLowerCase();
    const results = [];
    for (const category of Object.keys(this._catalog)) {
      const calcs = this.getCategory(category);
      for (const [slug, cfg] of Object.entries(calcs)) {
        if (cfg.title.toLowerCase().includes(q) || (cfg.tags && cfg.tags.some(t => t.toLowerCase().includes(q)))) {
          results.push({ category, slug, title: cfg.title });
        }
      }
    }
    return results;
  },

  // Total count (aliases are not counted as separate calculators)
  count() {
    let n = 0;
    for (const category of Object.keys(this._catalog)) {
      n += Object.keys(this.getCategory(category)).length;
    }
    return n;
  },

  // Category metadata
  categoryInfo: {
    algebra: { icon: "🔤", label: "Algebra", desc: "Equations, exponents, roots, logarithms" },
    construction: { icon: "🏗️", label: "Construction", desc: "Concrete, paint, mulch, cubic measurements" },
    conversions: { icon: "📏", label: "Conversions", desc: "Distance, weight, temperature, area, volume, cooking" },
    discretemathematics: { icon: "🔢", label: "Discrete Math", desc: "Permutations, combinations, factorials" },
    financial: { icon: "💰", label: "Financial", desc: "Loans, interest, depreciation, investment" },
    "geometry-plane": { icon: "⭕", label: "Plane Geometry", desc: "Circle, triangle, rectangle, polygon" },
    "geometry-solids": { icon: "🔷", label: "Solid Geometry", desc: "Cylinder, cone, sphere, cube, prism" },
    health: { icon: "❤️", label: "Health", desc: "BMI, pregnancy, body metrics" },
    math: { icon: "🧮", label: "Math", desc: "Percentages, fractions, GCF, LCM, basic math" },
    physics: { icon: "⚡", label: "Physics", desc: "Velocity, acceleration, force, energy, density" },
    statistics: { icon: "📊", label: "Statistics", desc: "Mean, median, mode, descriptive stats" },
    technology: { icon: "💻", label: "Technology", desc: "Aspect ratio, PPI, image resize" },
    time: { icon: "🕐", label: "Time & Date", desc: "Age, date difference, countdown, day of week" },
    tools: { icon: "🔧", label: "Tools", desc: "Character counter, random number generator" },
    trigonometry: { icon: "📐", label: "Trigonometry", desc: "Sin, cos, tan, triangle solving" },
  },
};
