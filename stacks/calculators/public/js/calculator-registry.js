// Calculator Registry — all calculators defined as structured configs
// Each calculator has: fields[], calculate() function, result template
// Load conversion data files lazily

const calculatorRegistry = {
  _catalog: {},

  // Register a single calculator
  register(category, slug, config) {
    if (!this._catalog[category]) this._catalog[category] = {};
    this._catalog[category][slug] = config;
  },

  // Get a calculator config
  get(category, slug) {
    return this._catalog[category]?.[slug];
  },

  // Get all calculators in a category
  getCategory(category) {
    return this._catalog[category] || {};
  },

  // Get all categories
  getCategories() {
    return Object.keys(this._catalog).sort();
  },

  // Search across all calculators
  search(query) {
    const q = query.toLowerCase();
    const results = [];
    for (const [cat, calcs] of Object.entries(this._catalog)) {
      for (const [slug, cfg] of Object.entries(calcs)) {
        if (cfg.title.toLowerCase().includes(q) || (cfg.tags && cfg.tags.some(t => t.toLowerCase().includes(q)))) {
          results.push({ category: cat, slug, title: cfg.title });
        }
      }
    }
    return results;
  },

  // Total count
  count() {
    let n = 0;
    for (const calcs of Object.values(this._catalog)) n += Object.keys(calcs).length;
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
